BEGIN;

-- ---------- DROP ----------
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS coupon CASCADE;
DROP TABLE IF EXISTS preference_category CASCADE;
DROP TABLE IF EXISTS review CASCADE;
DROP TABLE IF EXISTS order_item CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_item CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS product_image CASCADE;
DROP TABLE IF EXISTS product_variant CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS payment_method CASCADE;
DROP TABLE IF EXISTS address CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------- USERS ----------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_role CHECK (role IN ('customer', 'admin'))
);

-- ---------- USER PREFERENCES ----------
CREATE TABLE user_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- ADDRESS ----------
CREATE TABLE address (
    address_id SERIAL PRIMARY KEY,
    street VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(50) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- PAYMENT METHOD ----------
CREATE TABLE payment_method (
    payment_method_id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    provider VARCHAR(50),
    account_number VARCHAR(50),
    card_last4 CHAR(4),
    expiry_date DATE,
    is_default BOOLEAN NOT NULL DEFAULT false,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_type CHECK (
        type IN ('card', 'bkash', 'nagad', 'rocket', 'cash_on_delivery')
    )
);

-- ---------- CATEGORY ----------
CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    category_slug VARCHAR(80),
    description TEXT,
    parent_category INT,
    depth INT NOT NULL DEFAULT 0,
    full_path TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_category_name_parent UNIQUE (name, parent_category),
    CONSTRAINT chk_category_depth_nonneg CHECK (depth >= 0),
    CONSTRAINT chk_category_self_parent CHECK (parent_category IS NULL OR parent_category <> category_id),
    FOREIGN KEY (parent_category) REFERENCES category(category_id) ON DELETE SET NULL
);

CREATE TABLE category_closure (
    ancestor_category_id INT NOT NULL,
    descendant_category_id INT NOT NULL,
    depth INT NOT NULL,
    PRIMARY KEY (ancestor_category_id, descendant_category_id),
    CONSTRAINT chk_category_closure_depth_nonneg CHECK (depth >= 0),
    FOREIGN KEY (ancestor_category_id) REFERENCES category(category_id) ON DELETE CASCADE,
    FOREIGN KEY (descendant_category_id) REFERENCES category(category_id) ON DELETE CASCADE
);

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

CREATE OR REPLACE FUNCTION rebuild_category_tree_state()
RETURNS VOID AS $$
BEGIN
    -- Refresh derived category fields.
    WITH RECURSIVE tree AS (
        SELECT
            c.category_id,
            c.parent_category,
            0 AS computed_depth,
            normalize_category_slug(c.name) AS computed_slug,
            '/' || normalize_category_slug(c.name) AS computed_path
        FROM category c
        WHERE c.parent_category IS NULL

        UNION ALL

        SELECT
            c.category_id,
            c.parent_category,
            tree.computed_depth + 1,
            normalize_category_slug(c.name) AS computed_slug,
            tree.computed_path || '/' || normalize_category_slug(c.name)
        FROM category c
        JOIN tree ON c.parent_category = tree.category_id
    )
    UPDATE category c
    SET
        category_slug = tree.computed_slug,
        depth = tree.computed_depth,
        full_path = tree.computed_path
    FROM tree
    WHERE c.category_id = tree.category_id;

    -- Build closure table from adjacency list.
    DELETE FROM category_closure;

    WITH RECURSIVE closure AS (
        SELECT
            c.category_id AS ancestor_category_id,
            c.category_id AS descendant_category_id,
            0 AS depth
        FROM category c

        UNION ALL

        SELECT
            closure.ancestor_category_id,
            c.category_id AS descendant_category_id,
            closure.depth + 1
        FROM closure
        JOIN category c ON c.parent_category = closure.descendant_category_id
    )
    INSERT INTO category_closure (ancestor_category_id, descendant_category_id, depth)
    SELECT DISTINCT ancestor_category_id, descendant_category_id, depth
    FROM closure;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_rebuild_category_tree_state()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NULL;
    END IF;

    PERFORM rebuild_category_tree_state();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_tree_state_after_change
AFTER INSERT OR UPDATE OR DELETE ON category
FOR EACH ROW
EXECUTE FUNCTION trg_rebuild_category_tree_state();

-- ---------- PRODUCT ----------
CREATE TABLE product (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    category_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_product_price CHECK (base_price >= 0),
    FOREIGN KEY (category_id) REFERENCES category(category_id)
);

-- ---------- PRODUCT VARIANT ----------
CREATE TABLE product_variant (
    variant_id SERIAL PRIMARY KEY,
    variant_name VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    size VARCHAR(20),
    color VARCHAR(20),
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    stock_quantity INT NOT NULL DEFAULT 0,
    product_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stock CHECK (stock_quantity >= 0),
    CONSTRAINT chk_variant_price CHECK (price >= 0),
    CONSTRAINT uq_variant UNIQUE (product_id, size, color),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

-- ---------- PRODUCT IMAGE ----------
CREATE TABLE product_image (
    image_id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    variant_id INT NOT NULL,
    FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id) ON DELETE CASCADE
);

-- ---------- CART ----------
CREATE TABLE cart (
    cart_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- CART ITEM ----------
CREATE TABLE cart_item (
    cart_item_id SERIAL PRIMARY KEY,
    quantity INT NOT NULL CHECK (quantity > 0),
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (cart_id) REFERENCES cart(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id),
    CONSTRAINT uq_cart_product_variant UNIQUE (cart_id, product_id, variant_id)
);

-- ---------- ORDERS ----------
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    user_id INT NOT NULL,
    address_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_status CHECK (
        status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    ),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (address_id) REFERENCES address(address_id)
);

-- ---------- PAYMENT ----------
CREATE TABLE payment (
    payment_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    payment_method_id INT,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payment_amount_nonneg CHECK (amount >= 0),
    CONSTRAINT chk_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_method(payment_method_id)
);

-- ---------- ORDER ITEM ----------
CREATE TABLE order_item (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_id INT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id),
    CONSTRAINT uq_order_product_variant UNIQUE (order_id, product_id, variant_id)
);

-- ---------- REVIEW ----------
CREATE TABLE review (
    review_id SERIAL PRIMARY KEY,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    verified_purchase BOOLEAN NOT NULL DEFAULT false,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_user_product UNIQUE (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

-- ---------- COUPON ----------
CREATE TABLE coupon (
    coupon_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    usage_limit INT,
    used_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_coupon_type CHECK (type IN ('percentage', 'fixed')),
    CONSTRAINT chk_coupon_value CHECK (value > 0),
    CONSTRAINT chk_coupon_min_order CHECK (min_order_amount >= 0),
    CONSTRAINT chk_coupon_used_count CHECK (used_count >= 0)
);

-- ---------- WISHLIST ----------
CREATE TABLE wishlist (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wishlist_user_product UNIQUE (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

-- ---------- NOTIFICATION ----------
CREATE TABLE notification (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_id INT,
    related_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_type CHECK (
        type IN ('order_placed','order_confirmed','order_shipped','order_delivered','order_cancelled','review_approved','system')
    ),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- INDEXES ----------

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Catalog
CREATE INDEX idx_category_parent ON category(parent_category);
CREATE INDEX idx_category_slug ON category(category_slug);
CREATE INDEX idx_category_depth ON category(depth);
CREATE INDEX idx_category_full_path ON category(full_path);
CREATE INDEX idx_category_closure_ancestor ON category_closure(ancestor_category_id, depth);
CREATE INDEX idx_category_closure_descendant ON category_closure(descendant_category_id, depth);
CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_variant_product ON product_variant(product_id);
CREATE INDEX idx_image_variant ON product_image(variant_id);
CREATE INDEX idx_image_primary ON product_image(variant_id) WHERE is_primary = true;

-- Cart/Orders
CREATE INDEX idx_cart_user ON cart(user_id);
CREATE INDEX idx_cartitem_cart ON cart_item(cart_id);
CREATE INDEX idx_cartitem_product ON cart_item(product_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orderitem_order ON order_item(order_id);
CREATE INDEX idx_orderitem_product ON order_item(product_id);
CREATE INDEX idx_payment_order ON payment(order_id);

-- Reviews & Preferences
CREATE INDEX idx_review_product ON review(product_id);
CREATE INDEX idx_review_user ON review(user_id);

-- Category
CREATE UNIQUE INDEX uq_category_name_root ON category(name) WHERE parent_category IS NULL;
CREATE UNIQUE INDEX uq_category_slug_parent ON category(parent_category, category_slug);

-- Wishlist, Coupon, Notification
CREATE INDEX idx_wishlist_user ON wishlist(user_id);
CREATE INDEX idx_wishlist_product ON wishlist(product_id);
CREATE INDEX idx_coupon_code ON coupon(code);
CREATE INDEX idx_notification_user ON notification(user_id);
CREATE INDEX idx_notification_user_unread ON notification(user_id) WHERE is_read = false;

-- Materialize category closure + derived fields after seed inserts.
SELECT rebuild_category_tree_state();

COMMIT;
