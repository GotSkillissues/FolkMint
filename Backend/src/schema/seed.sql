-- FolkMint Database Seed File
-- This file populates the database with sample data for testing and development

BEGIN;

-- Clear existing data (in reverse order of dependencies)
TRUNCATE TABLE notification, wishlist, coupon, review, order_item, orders, cart_item, cart,
               product_image, product_variant, product,
               preference_category, category, payment, payment_method,
               address, user_preferences, users
RESTART IDENTITY CASCADE;

-- ========== USERS ==========
INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES
('admin',    'admin@folkmint.com',      '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Admin',  'User',   'admin'),
('johndoe',  'john.doe@email.com',      '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'John',   'Doe',    'customer'),
('janesmit', 'jane.smith@email.com',    '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Jane',   'Smith',  'customer'),
('mikechen', 'mike.chen@email.com',     '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Mike',   'Chen',   'customer'),
('sarahali', 'sarah.ali@email.com',     '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Sarah',  'Ali',    'customer'),
('rajpatel', 'raj.patel@email.com',     '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Raj',    'Patel',  'customer');

-- ========== USER PREFERENCES ==========
INSERT INTO user_preferences (user_id, view_count) VALUES
(2, 15),
(3, 8),
(4, 22),
(5, 5),
(6, 12);

-- ========== ADDRESS ==========
INSERT INTO address (street, city, postal_code, country, is_default, user_id) VALUES
('123 Dhanmondi Road',  'Dhaka', '1205', 'Bangladesh', true,  2),
('456 Gulshan Avenue',  'Dhaka', '1212', 'Bangladesh', false, 2),
('789 Banani Lane',     'Dhaka', '1213', 'Bangladesh', true,  3),
('321 Uttara Sector 7', 'Dhaka', '1230', 'Bangladesh', true,  4),
('654 Mirpur DOHS',     'Dhaka', '1216', 'Bangladesh', true,  5),
('987 Bailey Road',     'Dhaka', '1000', 'Bangladesh', true,  6);

-- ========== PAYMENT METHOD ==========
INSERT INTO payment_method (type, provider, card_last4, expiry_date, is_default, user_id) VALUES
('card',             'Visa',    '1234', '2027-12-31', true,  2),
('bkash',            'bKash',   NULL,   NULL,         false, 2),
('card',             'Mastercard', '5678', '2028-06-30', true, 3),
('nagad',            'Nagad',   NULL,   NULL,         true,  4),
('rocket',           'Rocket',  NULL,   NULL,         true,  5),
('cash_on_delivery', 'COD',     NULL,   NULL,         true,  6);

-- ========== CATEGORY ==========
INSERT INTO category (name, description, parent_category) VALUES
-- Root categories (catalog)
('Men',                          'Men''s fashion and apparel',                          NULL),
('Women',                        'Women''s fashion and apparel',                        NULL),
('Handicrafts',                  'Traditional handmade craft collections',              NULL),
('Home Decor / Showpieces',      'Decorative handmade home items and showpieces',       NULL),
('Bags & Accessories',           'Handcrafted bags and accessories',                    NULL),
('Gift Cards',                   'Gift cards for all occasions',                        NULL),
-- Men
('Panjabi',                      'Traditional Panjabi collection',                      1),
('Kurta',                        'Men''s kurta collection',                             1),
('Fotua',                        'Men''s Fotua styles',                                 1),
('Pajama',                       'Comfort and traditional pajama styles',               1),
-- Women
('Saree',                        'Women''s saree collection',                           2),
('Salwar Kameez',                'Traditional salwar kameez designs',                   2),
('Kurti',                        'Women''s kurti collection',                           2),
('Shawl',                        'Handcrafted shawls and wraps',                        2),
-- Women > Saree
('Jamdani Saree',                'Authentic Jamdani saree collection',                  12),
('Cotton Saree',                 'Comfortable cotton sarees',                           12),
('Silk Saree',                   'Premium silk sarees',                                 12),
('Muslin Saree',                 'Fine muslin saree collection',                        12),
-- Handicrafts
('Nakshi Kantha',                'Traditional Nakshi Kantha crafts',                    3),
('Jute Products',                'Eco-friendly jute crafted products',                  3),
('Bamboo Crafts',                'Handmade bamboo craft items',                         3),
('Cane Crafts',                  'Traditional cane craft products',                     3),
('Handmade Baskets',             'Handwoven handmade baskets',                          3),
('Mats',                         'Traditional woven mats',                               3),
('Embroidered Crafts',           'Embroidery-based craft products',                     3),
-- Home Decor / Showpieces
('Jute Showpieces',              'Decorative jute showpieces',                          4),
('Wall Hanging',                 'Wall hanging decorative crafts',                       4),
('Decorative Plates',            'Handmade decorative plates',                           4),
('Vases',                        'Decorative and artisan vases',                        4),
('Clay Crafts',                  'Traditional clay crafted items',                       4),
('Wooden Crafts',                'Handmade wooden decorative items',                     4),
('Terracotta',                   'Terracotta decor and craft collection',                4),
('Lanterns / Decorative Lights', 'Handcrafted lanterns and decorative lights',          4),
-- Bags & Accessories
('Jute Bag',                     'Handmade jute bags',                                   5),
('Tote Bag',                     'Stylish tote bags',                                    5),
('Handbag',                      'Traditional and modern handcrafted handbags',           5);

-- ========== PREFERENCE_CATEGORY ==========
INSERT INTO preference_category (preference_id, category_id) VALUES
(1, 1), (1, 5),  -- John likes Men and Bags & Accessories
(2, 4), (2, 3),  -- Jane likes Home Decor / Showpieces and Handicrafts
(3, 2), (3, 5),  -- Mike likes Women and Bags & Accessories
(4, 1), (4, 4),  -- Sarah likes Men and Home Decor / Showpieces
(5, 3), (5, 6);  -- Raj likes Handicrafts and Gift Cards

-- ========== PRODUCT ==========
INSERT INTO product (name, description, base_price, stock_quantity, category_id) VALUES
-- Men
('Traditional Punjabi',         'Handwoven cotton Punjabi with intricate embroidery',        1500.00, 45, 7),
('Khadi Kurta',                 'Premium khadi cotton kurta, perfect for any occasion',      1200.00, 48, 8),
-- Women
('Jamdani Saree',               'Authentic handloom Jamdani saree from Dhaka',               8500.00, 12, 17),
('Block Print Kurti',           'Hand block printed kurti with traditional motifs',           950.00,  53, 14),
('Batik Dress',                 'Beautiful batik print dress, unique design',                1800.00, 32, 13),
-- Bags & Accessories
('Jute Tote Bag',               'Eco-friendly handmade jute bag with leather handles',        450.00,  45, 37),
('Embroidered Clutch',          'Hand-embroidered silk clutch with mirror work',              680.00,  37, 38),
('Silk Scarf',                  'Pure silk scarf with traditional patterns',                  550.00,  33, 16),
-- Home Decor / Showpieces
('Nakshi Kantha Wall Hanging',  'Traditional Nakshi Kantha art piece',                       2200.00, 13, 29),
('Block Print Cushion Cover',   'Set of 2 hand block printed cushion covers',                 580.00,  55, 4),
('Handwoven Rug',               'Cotton handwoven rug with geometric patterns',              3500.00, 10, 4),
-- Handicrafts
('Terracotta Pot Set',          'Set of 3 handmade terracotta pots',                         720.00,  20, 34),
('Wooden Jewelry Box',          'Hand-carved wooden box with brass inlay',                  1350.00,  12, 33),
('Hand-embroidered Table Runner','Beautiful table runner with folk motifs',                   890.00,  15, 27),
-- Additional accessories under current catalog
('Terracotta Necklace',         'Handcrafted terracotta bead necklace',                       450.00,  25, 5),
('Silver Filigree Earrings',    'Traditional silver filigree work earrings',                 1200.00, 18, 5),
('Brass Bangle Set',            'Set of 4 traditional brass bangles',                         380.00,  42, 5);

-- ========== PRODUCT VARIANT ==========
INSERT INTO product_variant (size, color, stock_quantity, price, price_modifier, product_id) VALUES
-- Traditional Punjabi (product 1)
('M',        'White',      15, 1500.00,  0.00, 1),
('L',        'White',      12, 1500.00,  0.00, 1),
('L',        'Blue',        8, 1550.00, 50.00, 1),
('XL',       'White',      10, 1600.00, 100.00, 1),
-- Khadi Kurta (product 2)
('M',        'Beige',      20, 1200.00,  0.00, 2),
('L',        'Beige',      18, 1200.00,  0.00, 2),
('XL',       'Cream',      10, 1250.00, 50.00, 2),
-- Jamdani Saree (product 3)
('One Size', 'Red',         5, 8500.00,  0.00, 3),
('One Size', 'Blue',        3, 8800.00, 300.00, 3),
('One Size', 'Green',       4, 8500.00,  0.00, 3),
-- Block Print Kurti (product 4)
('S',        'Yellow',     15,  950.00,  0.00, 4),
('M',        'Yellow',     18,  950.00,  0.00, 4),
('L',        'Blue',       12,  950.00,  0.00, 4),
('XL',       'Pink',        8,  980.00, 30.00, 4),
-- Batik Dress (product 5)
('S',        'Multicolor', 10, 1800.00,  0.00, 5),
('M',        'Multicolor', 14, 1800.00,  0.00, 5),
('L',        'Multicolor',  8, 1800.00,  0.00, 5),
-- Jute Tote Bag (product 6)
('Medium',   'Natural',    25,  450.00,  0.00, 6),
('Large',    'Natural',    20,  500.00, 50.00, 6),
-- Embroidered Clutch (product 7)
('One Size', 'Red',        12,  680.00,  0.00, 7),
('One Size', 'Gold',       10,  680.00,  0.00, 7),
('One Size', 'Black',      15,  680.00,  0.00, 7),
-- Silk Scarf (product 8)
('One Size', 'Blue',       18,  550.00,  0.00, 8),
('One Size', 'Red',        15,  550.00,  0.00, 8),
-- Nakshi Kantha Wall Hanging (product 9)
('Medium',   'Multicolor',  8, 2200.00,  0.00, 9),
('Large',    'Multicolor',  5, 2800.00, 600.00, 9),
-- Block Print Cushion Cover (product 10)
('16x16',    'Blue',       30,  580.00,  0.00, 10),
('16x16',    'Green',      25,  580.00,  0.00, 10),
-- Handwoven Rug (product 11)
('3x5 ft',   'Beige',       6, 3500.00,  0.00, 11),
('4x6 ft',   'Brown',       4, 4200.00, 700.00, 11),
-- Terracotta Pot Set (product 12)
('Small',    'Terracotta', 20,  720.00,  0.00, 12),
-- Wooden Jewelry Box (product 13)
('Medium',   'Brown',      12, 1350.00,  0.00, 13),
-- Hand-embroidered Table Runner (product 14)
('60 inch',  'Multicolor', 15,  890.00,  0.00, 14),
-- Terracotta Necklace (product 15)
('One Size', 'Natural',    25,  450.00,  0.00, 15),
-- Silver Filigree Earrings (product 16)
('One Size', 'Silver',     18, 1200.00,  0.00, 16),
-- Brass Bangle Set (product 17)
('Medium',   'Gold',       22,  380.00,  0.00, 17),
('Large',    'Gold',       20,  400.00, 20.00, 17);

-- ========== PRODUCT IMAGE ==========
INSERT INTO product_image (image_url, is_primary, variant_id) VALUES
-- Traditional Punjabi
('https://images.folkmint.com/punjabi-white-m-1.jpg',  true,  1),
('https://images.folkmint.com/punjabi-white-m-2.jpg',  false, 1),
('https://images.folkmint.com/punjabi-blue-l-1.jpg',   true,  3),
-- Khadi Kurta
('https://images.folkmint.com/kurta-beige-m-1.jpg',    true,  5),
('https://images.folkmint.com/kurta-beige-l-1.jpg',    true,  6),
-- Jamdani Saree
('https://images.folkmint.com/saree-red-1.jpg',        true,  8),
('https://images.folkmint.com/saree-red-2.jpg',        false, 8),
('https://images.folkmint.com/saree-blue-1.jpg',       true,  9),
('https://images.folkmint.com/saree-green-1.jpg',      true,  10),
-- Block Print Kurti
('https://images.folkmint.com/kurti-yellow-s-1.jpg',   true,  11),
('https://images.folkmint.com/kurti-blue-l-1.jpg',     true,  13),
-- Batik Dress
('https://images.folkmint.com/dress-multi-s-1.jpg',    true,  15),
('https://images.folkmint.com/dress-multi-m-1.jpg',    true,  16),
-- Jute Tote Bag
('https://images.folkmint.com/tote-natural-m-1.jpg',   true,  18),
('https://images.folkmint.com/tote-natural-l-1.jpg',   true,  19),
-- Embroidered Clutch
('https://images.folkmint.com/clutch-red-1.jpg',       true,  20),
('https://images.folkmint.com/clutch-gold-1.jpg',      true,  21),
('https://images.folkmint.com/clutch-black-1.jpg',     true,  22),
-- Silk Scarf
('https://images.folkmint.com/scarf-blue-1.jpg',       true,  23),
('https://images.folkmint.com/scarf-red-1.jpg',        true,  24),
-- Nakshi Kantha
('https://images.folkmint.com/kantha-medium-1.jpg',    true,  25),
('https://images.folkmint.com/kantha-large-1.jpg',     true,  26),
-- Cushion Covers
('https://images.folkmint.com/cushion-blue-1.jpg',     true,  27),
('https://images.folkmint.com/cushion-green-1.jpg',    true,  28),
-- Rug
('https://images.folkmint.com/rug-3x5-1.jpg',          true,  29),
('https://images.folkmint.com/rug-4x6-1.jpg',          true,  30),
-- Terracotta Pots
('https://images.folkmint.com/pots-small-1.jpg',       true,  31),
-- Wooden Box
('https://images.folkmint.com/box-medium-1.jpg',       true,  32),
-- Table Runner
('https://images.folkmint.com/runner-60-1.jpg',        true,  33),
-- Jewelry
('https://images.folkmint.com/necklace-terracotta-1.jpg', true, 34),
('https://images.folkmint.com/earrings-silver-1.jpg',  true,  35),
('https://images.folkmint.com/bangles-gold-m-1.jpg',   true,  36);

-- ========== CART ==========
INSERT INTO cart (user_id) VALUES
(2),
(3),
(4),
(5);

-- ========== CART ITEM ==========
-- product_id is required (matches variant's product)
INSERT INTO cart_item (quantity, cart_id, product_id, variant_id) VALUES
-- John's cart: variant 1 = product 1, variant 18 = product 6
(2, 1, 1, 1),   -- 2x Traditional Punjabi White M
(1, 1, 6, 18),  -- 1x Jute Tote Bag Medium
-- Jane's cart: variant 25 = product 9, variant 27 = product 10
(1, 2, 9, 25),  -- 1x Nakshi Kantha Wall Hanging Medium
(2, 2, 10, 27), -- 2x Block Print Cushion Cover Blue
-- Mike's cart: variant 35 = product 16, variant 36 = product 17
(1, 3, 16, 35), -- 1x Silver Filigree Earrings
(3, 3, 17, 36), -- 3x Brass Bangle Set Medium
-- Sarah's cart: variant 16 = product 5, variant 23 = product 8
(1, 4, 5, 16),  -- 1x Batik Dress M
(1, 4, 8, 23);  -- 1x Silk Scarf Blue

-- ========== ORDERS ==========
-- Note: payment_id removed from orders (payment references orders now)
INSERT INTO orders (total_amount, status, user_id, address_id) VALUES
(2450.00, 'delivered', 2, 1),
(1800.00, 'shipped',   3, 3),
(3200.00, 'confirmed', 4, 4);

-- ========== PAYMENT ==========
-- order_id references the orders inserted above
INSERT INTO payment (order_id, payment_method_id, amount, status) VALUES
(1, 1, 2450.00, 'completed'),
(2, 3, 1800.00, 'completed'),
(3, 4, 3200.00, 'completed');

-- ========== ORDER ITEM ==========
-- product_id added, price column renamed to unit_price
INSERT INTO order_item (order_id, product_id, variant_id, quantity, unit_price) VALUES
-- Order 1 (John's delivered order)
(1, 4,  12, 1,  950.00),  -- 1x Block Print Kurti M Yellow
(1, 1,  1,  1, 1500.00),  -- 1x Traditional Punjabi White M
(1, 7,  20, 1,  680.00),  -- 1x Embroidered Clutch Red
-- Order 2 (Jane's shipped order)
(2, 5,  16, 1, 1800.00),  -- 1x Batik Dress M
-- Order 3 (Mike's confirmed order)
(3, 16, 35, 1, 1200.00),  -- 1x Silver Filigree Earrings
(3, 12, 31, 1, 2000.00);  -- 1x Terracotta Pot Set

-- ========== REVIEW ==========
-- order_item_id removed, verified_purchase added
INSERT INTO review (rating, comment, verified_purchase, user_id, product_id) VALUES
(5, 'Excellent quality! The embroidery work is stunning. Highly recommended.', true,  2, 4),
(4, 'Good quality Punjabi, fits well. Delivery was on time.',                  true,  2, 1),
(5, 'Beautiful clutch! The mirror work is exquisite. Perfect for weddings.',   true,  2, 7);

-- ========== COUPONS ==========
INSERT INTO coupon (code, type, value, min_order_amount, max_discount_amount, usage_limit, is_active, expires_at) VALUES
('WELCOME10',  'percentage', 10.00,  500.00, 200.00, 100, true,  NOW() + INTERVAL '90 days'),
('FOLK20',     'percentage', 20.00, 1000.00, 500.00,  50, true,  NOW() + INTERVAL '30 days'),
('FLAT200',    'fixed',      200.00, 800.00,    NULL,  30, true,  NOW() + INTERVAL '60 days'),
('EIDSPECIAL', 'percentage', 15.00, 1500.00, 400.00,  20, false, NOW() - INTERVAL '10 days');

-- ========== UPDATE TIMESTAMPS ==========
UPDATE users SET created_at = NOW() - INTERVAL '30 days', updated_at = NOW() - INTERVAL '5 days' WHERE user_id > 1;
UPDATE product SET created_at = NOW() - INTERVAL '60 days', updated_at = NOW() - INTERVAL '60 days';
UPDATE cart SET created_at = NOW() - INTERVAL '10 days';
UPDATE orders SET
    created_at = NOW() - INTERVAL '14 days',
    updated_at = NOW() - INTERVAL '2 days'
WHERE order_id = 1;
UPDATE orders SET
    created_at = NOW() - INTERVAL '7 days',
    updated_at = NOW() - INTERVAL '1 day'
WHERE order_id = 2;
UPDATE orders SET
    created_at = NOW() - INTERVAL '3 days',
    updated_at = NOW() - INTERVAL '3 days'
WHERE order_id = 3;

COMMIT;

-- Display summary
SELECT 'Seed data loaded successfully!' as status;
SELECT 'Users: ' || COUNT(*) as count FROM users;
SELECT 'Categories: ' || COUNT(*) as count FROM category;
SELECT 'Products: ' || COUNT(*) as count FROM product;
SELECT 'Product Variants: ' || COUNT(*) as count FROM product_variant;
SELECT 'Orders: ' || COUNT(*) as count FROM orders;
SELECT 'Reviews: ' || COUNT(*) as count FROM review;


