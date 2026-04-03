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
-- no stock-status constraint is enforced at schema level
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

-- ---------- ORDER PROCEDURES ----------
-- place_order centralizes the full checkout workflow.
CREATE OR REPLACE PROCEDURE place_order(
    p_user_id           INT,
    p_address_id        INT,
    p_payment_method_id INT,
    OUT p_order_id      INT,
    OUT p_total_amount  NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_cart_count  INT;
    v_active_cart_count INT;
    v_cart_item         RECORD;
    v_seen_products     INT[] := ARRAY[]::INT[];
    v_total_cents       BIGINT := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM address
        WHERE address_id = p_address_id
          AND user_id = p_user_id
          AND is_deleted = false
    ) THEN
        RAISE EXCEPTION 'Invalid shipping address';
    END IF;

    IF p_payment_method_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM payment_method
        WHERE payment_method_id = p_payment_method_id
          AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    SELECT COUNT(*)::INT
    INTO v_total_cart_count
    FROM cart
    WHERE user_id = p_user_id;

    IF v_total_cart_count = 0 THEN
        RAISE EXCEPTION 'Your cart is empty';
    END IF;

    SELECT COUNT(*)::INT
    INTO v_active_cart_count
    FROM cart c
    JOIN product_variant pv ON pv.variant_id = c.variant_id
    JOIN product p ON p.product_id = pv.product_id
    WHERE c.user_id = p_user_id
      AND p.is_active = true;

    IF v_active_cart_count = 0 THEN
        RAISE EXCEPTION 'All items in your cart are currently unavailable. Please review your cart before checking out.';
    END IF;

    IF v_active_cart_count < v_total_cart_count THEN
        RAISE EXCEPTION 'Some items in your cart are no longer available. Please review your cart and remove unavailable items before checking out.';
    END IF;

    PERFORM pv.variant_id
    FROM cart c
    JOIN product_variant pv ON pv.variant_id = c.variant_id
    JOIN product p ON p.product_id = pv.product_id
    WHERE c.user_id = p_user_id
      AND p.is_active = true
    FOR UPDATE OF pv;

    FOR v_cart_item IN
        SELECT
            c.variant_id,
            c.quantity,
            pv.product_id,
            pv.size,
            pv.stock_quantity,
            p.name,
            p.price
        FROM cart c
        JOIN product_variant pv ON pv.variant_id = c.variant_id
        JOIN product p ON p.product_id = pv.product_id
        WHERE c.user_id = p_user_id
          AND p.is_active = true
    LOOP
        IF v_cart_item.product_id = ANY(v_seen_products) THEN
            RAISE EXCEPTION 'Your cart contains multiple variants of the same product. Please keep only one size per product before checkout.';
        END IF;

        v_seen_products := array_append(v_seen_products, v_cart_item.product_id);

        IF v_cart_item.stock_quantity < v_cart_item.quantity THEN
            RAISE EXCEPTION
                'Insufficient stock for %. Available: %, requested: %.',
                v_cart_item.name || COALESCE(' (Size: ' || v_cart_item.size || ')', ''),
                v_cart_item.stock_quantity,
                v_cart_item.quantity;
        END IF;

        v_total_cents := v_total_cents
            + (ROUND(v_cart_item.price * 100)::BIGINT * v_cart_item.quantity);
    END LOOP;

    p_total_amount := (v_total_cents::NUMERIC / 100)::NUMERIC(10, 2);

    INSERT INTO orders (user_id, address_id, status, total_amount)
    VALUES (p_user_id, p_address_id, 'pending', p_total_amount)
    RETURNING order_id INTO p_order_id;

    FOR v_cart_item IN
        SELECT
            c.variant_id,
            c.quantity,
            pv.product_id,
            p.price
        FROM cart c
        JOIN product_variant pv ON pv.variant_id = c.variant_id
        JOIN product p ON p.product_id = pv.product_id
        WHERE c.user_id = p_user_id
          AND p.is_active = true
    LOOP
        INSERT INTO order_item (order_id, product_id, variant_id, quantity, unit_price)
        VALUES (
            p_order_id,
            v_cart_item.product_id,
            v_cart_item.variant_id,
            v_cart_item.quantity,
            v_cart_item.price
        );

        UPDATE product_variant
        SET stock_quantity = stock_quantity - v_cart_item.quantity
        WHERE variant_id = v_cart_item.variant_id;
    END LOOP;

    INSERT INTO payment (order_id, payment_method_id, amount, status)
    VALUES (p_order_id, p_payment_method_id, p_total_amount, 'pending');

    DELETE FROM cart
    WHERE user_id = p_user_id;
END;
$$;

-- cancel_order centralizes customer cancellation with stock/payment rollback.
CREATE OR REPLACE PROCEDURE cancel_order(
    p_order_id INT,
    p_user_id  INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_item  RECORD;
BEGIN
    SELECT order_id, status, user_id
    INTO v_order
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.user_id <> p_user_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    IF v_order.status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending orders can be cancelled. This order is ''%''.', v_order.status;
    END IF;

    FOR v_item IN
        SELECT variant_id, quantity
        FROM order_item
        WHERE order_id = p_order_id
    LOOP
        IF v_item.variant_id IS NOT NULL THEN
            UPDATE product_variant
            SET stock_quantity = stock_quantity + v_item.quantity
            WHERE variant_id = v_item.variant_id;
        END IF;
    END LOOP;

    UPDATE payment
    SET status = 'refunded',
        updated_at = NOW()
    WHERE order_id = p_order_id
      AND status <> 'refunded';

    UPDATE orders
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE order_id = p_order_id;
END;
$$;

-- ---------- REVIEW / WISHLIST DB LOGIC ----------
CREATE OR REPLACE FUNCTION get_product_avg_rating(
    p_product_id INT
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0)
        FROM review
        WHERE product_id = p_product_id
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_product_total_stock(
    p_product_id INT
)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(stock_quantity), 0)::INT
        FROM product_variant
        WHERE product_id = p_product_id
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_product_review_count(
    p_product_id INT
)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INT
        FROM review
        WHERE product_id = p_product_id
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_low_stock_count(
    p_threshold INT DEFAULT 5
)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INT
        FROM product_variant pv
        JOIN product p ON p.product_id = pv.product_id
        WHERE pv.stock_quantity > 0
          AND pv.stock_quantity <= p_threshold
          AND p.is_active = true
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_product_units_sold(
    p_product_id INT
)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(oi.quantity), 0)::INT
        FROM order_item oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE oi.product_id = p_product_id
          AND o.status <> 'cancelled'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_product_revenue(
    p_product_id INT
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
        FROM order_item oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE oi.product_id = p_product_id
          AND o.status <> 'cancelled'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_product_units_sold_in_days(
    p_product_id INT,
    p_days INT
)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(oi.quantity), 0)::INT
        FROM order_item oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE oi.product_id = p_product_id
          AND o.status <> 'cancelled'
          AND o.created_at >= NOW() - (p_days || ' days')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_product_revenue_in_days(
    p_product_id INT,
    p_days INT
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
        FROM order_item oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE oi.product_id = p_product_id
          AND o.status <> 'cancelled'
          AND o.created_at >= NOW() - (p_days || ' days')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION has_purchased_product(
    p_user_id INT,
    p_product_id INT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM order_item oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.user_id = p_user_id
          AND oi.product_id = p_product_id
          AND o.status = 'delivered'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_product_rating_distribution(
    p_product_id INT
)
RETURNS TABLE(
    total_reviews INT,
    avg_rating NUMERIC,
    five_star INT,
    four_star INT,
    three_star INT,
    two_star INT,
    one_star INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT AS total_reviews,
        COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0) AS avg_rating,
        COUNT(*) FILTER (WHERE rating = 5)::INT AS five_star,
        COUNT(*) FILTER (WHERE rating = 4)::INT AS four_star,
        COUNT(*) FILTER (WHERE rating = 3)::INT AS three_star,
        COUNT(*) FILTER (WHERE rating = 2)::INT AS two_star,
        COUNT(*) FILTER (WHERE rating = 1)::INT AS one_star
    FROM review
    WHERE product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_preferred_categories(
    p_user_id INT
)
RETURNS TABLE(category_id INT, name VARCHAR, score INT) AS $$
BEGIN
    RETURN QUERY
    WITH category_signals AS (
        SELECT p.category_id, oi.quantity::INT AS weight
        FROM order_item oi
        JOIN orders o ON o.order_id = oi.order_id
        JOIN product p ON p.product_id = oi.product_id
        WHERE o.user_id = p_user_id
          AND o.status <> 'cancelled'

        UNION ALL

        SELECT p.category_id, 1 AS weight
        FROM wishlist w
        JOIN product_variant pv ON pv.variant_id = w.variant_id
        JOIN product p ON p.product_id = pv.product_id
        WHERE w.user_id = p_user_id

        UNION ALL

        SELECT p.category_id, c.quantity::INT AS weight
        FROM cart c
        JOIN product_variant pv ON pv.variant_id = c.variant_id
        JOIN product p ON p.product_id = pv.product_id
        WHERE c.user_id = p_user_id

        UNION ALL

        SELECT p.category_id, 1 AS weight
        FROM review r
        JOIN product p ON p.product_id = r.product_id
        WHERE r.user_id = p_user_id
    )
    SELECT
        c.category_id,
        c.name,
        SUM(cs.weight)::INT AS score
    FROM category_signals cs
    JOIN category c ON c.category_id = cs.category_id
    GROUP BY c.category_id, c.name
    ORDER BY score DESC, c.name ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE submit_review(
    p_user_id INT,
    p_product_id INT,
    p_rating INT,
    p_comment TEXT,
    OUT p_review_id INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM product
        WHERE product_id = p_product_id
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    IF NOT has_purchased_product(p_user_id, p_product_id) THEN
        RAISE EXCEPTION 'You can only review products you have purchased and received';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM review
        WHERE user_id = p_user_id
          AND product_id = p_product_id
    ) THEN
        RAISE EXCEPTION 'You have already reviewed this product';
    END IF;

    INSERT INTO review (user_id, product_id, rating, comment)
    VALUES (p_user_id, p_product_id, p_rating, p_comment)
    RETURNING review_id INTO p_review_id;
END;
$$;

CREATE OR REPLACE PROCEDURE move_to_cart(
    p_wishlist_id INT,
    p_user_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_wishlist RECORD;
    v_variant RECORD;
    v_cart RECORD;
BEGIN
    SELECT wishlist_id, variant_id
    INTO v_wishlist
    FROM wishlist
    WHERE wishlist_id = p_wishlist_id
      AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wishlist item not found';
    END IF;

    SELECT pv.stock_quantity, pv.size, p.name
    INTO v_variant
    FROM product_variant pv
    JOIN product p ON p.product_id = pv.product_id
    WHERE pv.variant_id = v_wishlist.variant_id
      AND p.is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product variant no longer available';
    END IF;

    IF v_variant.stock_quantity = 0 THEN
        RAISE EXCEPTION 'This item is still out of stock';
    END IF;

    SELECT cart_id, quantity
    INTO v_cart
    FROM cart
    WHERE user_id = p_user_id
      AND variant_id = v_wishlist.variant_id;

    IF FOUND THEN
        IF (v_cart.quantity + 1) > v_variant.stock_quantity THEN
            RAISE EXCEPTION
                'Only % units available. You already have % in your cart.',
                v_variant.stock_quantity,
                v_cart.quantity;
        END IF;

        UPDATE cart
        SET quantity = quantity + 1,
            updated_at = NOW()
        WHERE cart_id = v_cart.cart_id;
    ELSE
        INSERT INTO cart (user_id, variant_id, quantity)
        VALUES (p_user_id, v_wishlist.variant_id, 1);
    END IF;

    DELETE FROM wishlist
    WHERE wishlist_id = p_wishlist_id;
END;
$$;

SELECT rebuild_category_tree();

COMMIT;
