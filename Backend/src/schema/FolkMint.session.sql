BEGIN;

-- ---------- DROP ----------
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
    view_count INT NOT NULL DEFAULT 0,
    user_id INT NOT NULL UNIQUE,
    CONSTRAINT chk_view_count_nonneg CHECK (view_count >= 0),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- ADDRESS ----------
CREATE TABLE address (
    address_id SERIAL PRIMARY KEY,
    street VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------- PAYMENT METHOD ----------
CREATE TABLE payment_method (
    method_id SERIAL PRIMARY KEY,
    card_last4 CHAR(4),
    type VARCHAR(20) NOT NULL,
    expiry_date DATE,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_type CHECK (
        type IN ('card','bkash','nagad','rocket','cash_on_delivery')
    )
);

-- ---------- PAYMENT ----------
CREATE TABLE payment (
    payment_id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    method_id INT NOT NULL,
    CONSTRAINT chk_payment_amount_nonneg CHECK (amount >= 0),
    FOREIGN KEY (method_id) REFERENCES payment_method(method_id)
);

-- ---------- CATEGORY ----------
CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    parent_category INT,
    CONSTRAINT uq_category_name_parent UNIQUE (name, parent_category),
    FOREIGN KEY (parent_category) REFERENCES category(category_id) ON DELETE SET NULL
);

-- ---------- PREFERENCE_CATEGORY ----------
CREATE TABLE preference_category (
    preference_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (preference_id, category_id),
    FOREIGN KEY (preference_id) REFERENCES user_preferences(preference_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category(category_id) ON DELETE CASCADE
);

-- ---------- PRODUCT ----------
CREATE TABLE product (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    category_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_product_price CHECK (base_price >= 0),
    FOREIGN KEY (category_id) REFERENCES category(category_id)
);

-- ---------- PRODUCT VARIANT ----------
CREATE TABLE product_variant (
    variant_id SERIAL PRIMARY KEY,
    size VARCHAR(20),
    color VARCHAR(20),
    stock_quantity INT NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    product_id INT NOT NULL,
    CONSTRAINT chk_stock CHECK (stock_quantity >= 0),
    CONSTRAINT chk_variant_price CHECK (price >= 0),
    CONSTRAINT uq_variant UNIQUE (product_id, size, color),
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);

-- ---------- PRODUCT IMAGE ----------
CREATE TABLE product_image (
    image_id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
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
    variant_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (cart_id) REFERENCES cart(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id),
    CONSTRAINT uq_cart_variant UNIQUE (cart_id, variant_id)
);

-- ---------- ORDERS ----------
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_date TIMESTAMP NOT NULL DEFAULT NOW(),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    user_id INT NOT NULL,
    address_id INT NOT NULL,
    payment_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_status CHECK (
        status IN ('pending','paid','shipped','delivered','cancelled')
    ),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (address_id) REFERENCES address(address_id),
    FOREIGN KEY (payment_id) REFERENCES payment(payment_id),
    CONSTRAINT uq_orders_payment UNIQUE (payment_id)
);

-- ---------- ORDER ITEM ----------
CREATE TABLE order_item (
    order_item_id SERIAL PRIMARY KEY,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(10,2) NOT NULL CHECK (price_at_purchase >= 0),
    order_id INT NOT NULL,
    variant_id INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variant(variant_id),
    CONSTRAINT uq_order_variant UNIQUE (order_id, variant_id)
);

-- ---------- REVIEW (ENFORCED AFTER PURCHASE) ----------
CREATE TABLE review (
    review_id SERIAL PRIMARY KEY,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    order_item_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_review_user_product UNIQUE (user_id, product_id),
    CONSTRAINT uq_review_order_item UNIQUE (order_item_id),

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (order_item_id) REFERENCES order_item(order_item_id) ON DELETE CASCADE
);
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Catalog
CREATE INDEX idx_category_parent ON category(parent_category);
CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_variant_product ON product_variant(product_id);
CREATE INDEX idx_image_variant ON product_image(variant_id);

-- Cart/Orders
CREATE INDEX idx_cart_user ON cart(user_id);
CREATE INDEX idx_cartitem_cart ON cart_item(cart_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orderitem_order ON order_item(order_id);

-- Reviews & Preferences
CREATE INDEX idx_review_product ON review(product_id);
CREATE INDEX idx_prefcat_category ON preference_category(category_id);

-- Category
CREATE UNIQUE INDEX uq_category_name_root ON category(name) WHERE parent_category IS NULL;

COMMIT;
