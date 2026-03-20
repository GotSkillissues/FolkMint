BEGIN;

-- ---------- DROP ----------
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS review CASCADE;
DROP TABLE IF EXISTS order_item CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS payment_method CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS product_image CASCADE;
DROP TABLE IF EXISTS product_variant CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS category_closure CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS address CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------- USERS ----------
CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    role          VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_role CHECK (role IN ('customer', 'admin'))
);

-- ---------- ADDRESS ----------
CREATE TABLE address (
    address_id  SERIAL PRIMARY KEY,
    street      VARCHAR(100) NOT NULL,
    city        VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20),
    country     VARCHAR(50) NOT NULL DEFAULT 'Bangladesh',
    is_default  BOOLEAN NOT NULL DEFAULT false,
    is_deleted  BOOLEAN NOT NULL DEFAULT false,
    user_id     INT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- PAYMENT METHOD ----------
-- type: 'cod' | 'bkash' | 'visa' | 'mastercard' | 'amex'
CREATE TABLE payment_method (
    payment_method_id SERIAL PRIMARY KEY,
    type              VARCHAR(20) NOT NULL,
    is_default        BOOLEAN NOT NULL DEFAULT false,
    user_id           INT NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_type CHECK (
        type IN ('cod', 'bkash', 'visa', 'mastercard', 'amex')
    )
);

-- ---------- CATEGORY ----------
CREATE TABLE category (
    category_id     SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,
    category_slug   VARCHAR(80),
    description     TEXT,
    parent_category INT,
    depth           INT NOT NULL DEFAULT 0,
    full_path       TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_category_name_parent UNIQUE (name, parent_category),
    CONSTRAINT chk_category_depth CHECK (depth >= 0),
    CONSTRAINT chk_category_no_self_parent CHECK (
        parent_category IS NULL OR parent_category <> category_id
    ),
    FOREIGN KEY (parent_category) REFERENCES category(category_id) ON DELETE SET NULL
);

-- ---------- CATEGORY CLOSURE ----------
CREATE TABLE category_closure (
    ancestor_category_id   INT NOT NULL,
    descendant_category_id INT NOT NULL,
    depth                  INT NOT NULL,
    PRIMARY KEY (ancestor_category_id, descendant_category_id),
    CONSTRAINT chk_closure_depth CHECK (depth >= 0),
    FOREIGN KEY (ancestor_category_id)   REFERENCES category(category_id) ON DELETE CASCADE,
    FOREIGN KEY (descendant_category_id) REFERENCES category(category_id) ON DELETE CASCADE
);

-- ---------- CATEGORY FUNCTIONS & TRIGGERS ----------
CREATE OR REPLACE FUNCTION normalize_category_slug(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(lower(trim(COALESCE(input_name, ''))), '&', ' and ', 'g'),
            '[^a-z0-9]+', '-', 'g'
        ),
        '(^-+)|(-+$)', '', 'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION rebuild_category_tree()
RETURNS VOID AS $$
BEGIN
    WITH RECURSIVE tree AS (
        SELECT category_id, parent_category,
               0 AS computed_depth,
               normalize_category_slug(name) AS computed_slug,
               '/' || normalize_category_slug(name) AS computed_path
        FROM category WHERE parent_category IS NULL
        UNION ALL
        SELECT c.category_id, c.parent_category,
               tree.computed_depth + 1,
               normalize_category_slug(c.name),
               tree.computed_path || '/' || normalize_category_slug(c.name)
        FROM category c JOIN tree ON c.parent_category = tree.category_id
    )
    UPDATE category c
    SET category_slug = tree.computed_slug,
        depth         = tree.computed_depth,
        full_path     = tree.computed_path
    FROM tree WHERE c.category_id = tree.category_id;

    DELETE FROM category_closure;

    WITH RECURSIVE closure AS (
        SELECT category_id AS ancestor_category_id,
               category_id AS descendant_category_id,
               0 AS depth
        FROM category
        UNION ALL
        SELECT closure.ancestor_category_id,
               c.category_id,
               closure.depth + 1
        FROM closure JOIN category c ON c.parent_category = closure.descendant_category_id
    )
    INSERT INTO category_closure (ancestor_category_id, descendant_category_id, depth)
    SELECT DISTINCT ancestor_category_id, descendant_category_id, depth FROM closure;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_rebuild_category_tree()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
    PERFORM rebuild_category_tree();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_tree_after_change
AFTER INSERT OR UPDATE OR DELETE ON category
FOR EACH ROW EXECUTE FUNCTION trg_rebuild_category_tree();

-- ---------- PRODUCT ----------
CREATE TABLE product (
    product_id  SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    sku         VARCHAR(50) UNIQUE,
    price       DECIMAL(10,2) NOT NULL DEFAULT 0,
    category_id INT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_product_price CHECK (price >= 0),
    FOREIGN KEY (category_id) REFERENCES category(category_id)
);

-- ---------- PRODUCT VARIANT ----------
-- size is nullable for unsized products (sarees, wall art, pottery etc.)
-- every product gets exactly one default variant (size=NULL) via trigger below
CREATE TABLE product_variant (
    variant_id     SERIAL PRIMARY KEY,
    size           VARCHAR(20),
    stock_quantity INT NOT NULL DEFAULT 0,
    product_id     INT NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stock CHECK (stock_quantity >= 0),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

-- only one NULL-size variant allowed per product
CREATE UNIQUE INDEX uq_product_no_size
ON product_variant(product_id)
WHERE size IS NULL;

-- only one row per product+size combination for sized variants
CREATE UNIQUE INDEX uq_product_size
ON product_variant(product_id, size)
WHERE size IS NOT NULL;

-- auto-create a default variant when a product is inserted
CREATE OR REPLACE FUNCTION create_default_variant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO product_variant (product_id, size, stock_quantity)
    VALUES (NEW.product_id, NULL, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_after_insert
AFTER INSERT ON product
FOR EACH ROW EXECUTE FUNCTION create_default_variant();

-- ---------- PRODUCT IMAGE ----------
-- images belong to the product, not to a specific variant
-- image_url stores the Cloudinary URL
CREATE TABLE product_image (
    image_id   SERIAL PRIMARY KEY,
    image_url  TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    product_id INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

-- ---------- CART ----------
-- one row per variant in a user's cart
-- no product_id stored here — always join through product_variant to reach product
CREATE TABLE cart (
    cart_id    SERIAL PRIMARY KEY,
    user_id    INT NOT NULL,
    variant_id INT NOT NULL,
    quantity   INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cart_quantity CHECK (quantity > 0),
    CONSTRAINT uq_cart_user_variant UNIQUE (user_id, variant_id),
    FOREIGN KEY (user_id)    REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id) ON DELETE CASCADE
);

-- ---------- ORDERS ----------
CREATE TABLE orders (
    order_id     SERIAL PRIMARY KEY,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    user_id      INT NOT NULL,
    address_id   INT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_status CHECK (
        status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    ),
    CONSTRAINT chk_order_total CHECK (total_amount >= 0),
    FOREIGN KEY (user_id)    REFERENCES users(user_id),
    FOREIGN KEY (address_id) REFERENCES address(address_id)
);

-- ---------- ORDER ITEM ----------
-- product_id is the stable anchor — survives even if variant is later deleted
-- variant_id uses ON DELETE SET NULL for this reason
-- unit_price snapshots the price at time of purchase
-- UNIQUE on (order_id, product_id) instead of variant_id
-- because variant_id can be NULL for unsized products and NULL != NULL in postgres
CREATE TABLE order_item (
    order_item_id SERIAL PRIMARY KEY,
    order_id      INT NOT NULL,
    product_id    INT NOT NULL,
    variant_id    INT,
    quantity      INT NOT NULL,
    unit_price    DECIMAL(10,2) NOT NULL,
    CONSTRAINT chk_order_item_qty   CHECK (quantity > 0),
    CONSTRAINT chk_order_item_price CHECK (unit_price >= 0),
    CONSTRAINT uq_order_product     UNIQUE (order_id, product_id),
    FOREIGN KEY (order_id)   REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id) ON DELETE SET NULL
);

-- ---------- PAYMENT ----------
CREATE TABLE payment (
    payment_id        SERIAL PRIMARY KEY,
    order_id          INT NOT NULL UNIQUE,
    payment_method_id INT,
    amount            DECIMAL(10,2) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payment_amount CHECK (amount >= 0),
    CONSTRAINT chk_payment_status CHECK (
        status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    FOREIGN KEY (order_id)          REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_method(payment_method_id) ON DELETE SET NULL
);

-- ---------- REVIEW ----------
-- backend enforces purchase check before allowing insert
-- every review in this table is by definition from a verified buyer
CREATE TABLE review (
    review_id  SERIAL PRIMARY KEY,
    rating     INT NOT NULL,
    comment    TEXT,
    user_id    INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT uq_review_user_product UNIQUE (user_id, product_id),
    FOREIGN KEY (user_id)    REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

-- ---------- WISHLIST ----------
-- stores variant_id so restock notifications know exactly which size
-- only allowed when stock_quantity = 0 (enforced by backend)
-- for unsized products the single NULL-size variant is used automatically
CREATE TABLE wishlist (
    wishlist_id SERIAL PRIMARY KEY,
    user_id     INT NOT NULL,
    variant_id  INT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wishlist_user_variant UNIQUE (user_id, variant_id),
    FOREIGN KEY (user_id)    REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id) ON DELETE CASCADE
);

-- ---------- NOTIFICATION ----------
-- review_approved removed from type list — no approval workflow in this schema
CREATE TABLE notification (
    notification_id SERIAL PRIMARY KEY,
    user_id         INT NOT NULL,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(100) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    related_id      INT,
    related_type    VARCHAR(50),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_type CHECK (
        type IN (
            'order_placed', 'order_confirmed', 'order_shipped',
            'order_delivered', 'order_cancelled',
            'back_in_stock', 'system'
        )
    ),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- INDEXES ----------
CREATE INDEX idx_users_email          ON users(email);

CREATE INDEX idx_address_user         ON address(user_id);

CREATE INDEX idx_category_parent      ON category(parent_category);
CREATE INDEX idx_category_slug        ON category(category_slug);
CREATE INDEX idx_category_depth       ON category(depth);
CREATE INDEX idx_closure_ancestor     ON category_closure(ancestor_category_id, depth);
CREATE INDEX idx_closure_descendant   ON category_closure(descendant_category_id, depth);
CREATE UNIQUE INDEX uq_category_root  ON category(name) WHERE parent_category IS NULL;

CREATE INDEX idx_product_category     ON product(category_id);
CREATE INDEX idx_product_active       ON product(is_active);

CREATE INDEX idx_variant_product      ON product_variant(product_id);

CREATE INDEX idx_image_product        ON product_image(product_id);
CREATE INDEX idx_image_primary        ON product_image(product_id) WHERE is_primary = true;

CREATE INDEX idx_cart_user            ON cart(user_id);
CREATE INDEX idx_cart_variant         ON cart(variant_id);

CREATE INDEX idx_orders_user          ON orders(user_id);
CREATE INDEX idx_orders_status        ON orders(status);

CREATE INDEX idx_order_item_order     ON order_item(order_id);
CREATE INDEX idx_order_item_product   ON order_item(product_id);

CREATE INDEX idx_payment_order        ON payment(order_id);

CREATE INDEX idx_review_product       ON review(product_id);
CREATE INDEX idx_review_user          ON review(user_id);

CREATE INDEX idx_wishlist_user        ON wishlist(user_id);
CREATE INDEX idx_wishlist_variant     ON wishlist(variant_id);

CREATE INDEX idx_notification_user    ON notification(user_id);
CREATE INDEX idx_notification_unread  ON notification(user_id) WHERE is_read = false;

SELECT rebuild_category_tree();

COMMIT;
