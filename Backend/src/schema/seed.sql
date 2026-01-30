-- FolkMint Database Seed File
-- This file populates the database with sample data for testing and development

BEGIN;

-- Clear existing data (in reverse order of dependencies)
TRUNCATE TABLE review, order_item, orders, cart_item, cart, 
               product_image, product_variant, product, 
               preference_category, category, payment, payment_method, 
               address, user_preferences, users 
RESTART IDENTITY CASCADE;

-- ========== USERS ==========
INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES
('admin', 'admin@folkmint.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Admin', 'User', 'admin'),
('johndoe', 'john.doe@email.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'John', 'Doe', 'customer'),
('janesmit', 'jane.smith@email.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Jane', 'Smith', 'customer'),
('mikechen', 'mike.chen@email.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Mike', 'Chen', 'customer'),
('sarahali', 'sarah.ali@email.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Sarah', 'Ali', 'customer'),
('rajpatel', 'raj.patel@email.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEF', 'Raj', 'Patel', 'customer');

-- ========== USER PREFERENCES ==========
INSERT INTO user_preferences (user_id, view_count) VALUES
(2, 15),
(3, 8),
(4, 22),
(5, 5),
(6, 12);

-- ========== ADDRESS ==========
INSERT INTO address (street, city, postal_code, country, user_id) VALUES
('123 Dhanmondi Road', 'Dhaka', '1205', 'Bangladesh', 2),
('456 Gulshan Avenue', 'Dhaka', '1212', 'Bangladesh', 2),
('789 Banani Lane', 'Dhaka', '1213', 'Bangladesh', 3),
('321 Uttara Sector 7', 'Dhaka', '1230', 'Bangladesh', 4),
('654 Mirpur DOHS', 'Dhaka', '1216', 'Bangladesh', 5),
('987 Bailey Road', 'Dhaka', '1000', 'Bangladesh', 6);

-- ========== PAYMENT METHOD ==========
INSERT INTO payment_method (card_last4, type, expiry_date, user_id) VALUES
('1234', 'card', '2027-12-31', 2),
(NULL, 'bkash', NULL, 2),
('5678', 'card', '2028-06-30', 3),
(NULL, 'nagad', NULL, 4),
(NULL, 'rocket', NULL, 5),
(NULL, 'cash_on_delivery', NULL, 6);

-- ========== PAYMENT ==========
INSERT INTO payment (amount, method_id) VALUES
(2450.00, 1),
(1800.00, 3),
(3200.00, 4);

-- ========== CATEGORY ==========
INSERT INTO category (name, parent_category) VALUES
-- Root categories
('Clothing', NULL),
('Accessories', NULL),
('Home Decor', NULL),
('Handicrafts', NULL),
('Jewelry', NULL),
-- Subcategories for Clothing
('Men', 1),
('Women', 1),
('Kids', 1),
-- Subcategories for Accessories
('Bags', 2),
('Scarves', 2),
-- Subcategories for Home Decor
('Wall Art', 3),
('Cushions', 3),
('Rugs', 3),
-- Subcategories for Handicrafts
('Pottery', 4),
('Woodwork', 4),
('Textiles', 4),
-- Subcategories for Jewelry
('Necklaces', 5),
('Earrings', 5),
('Bracelets', 5);

-- ========== PREFERENCE_CATEGORY ==========
INSERT INTO preference_category (preference_id, category_id) VALUES
(1, 1), (1, 2),  -- John likes Clothing and Accessories
(2, 3), (2, 4),  -- Jane likes Home Decor and Handicrafts
(3, 5), (3, 2),  -- Mike likes Jewelry and Accessories
(4, 1), (4, 3),  -- Sarah likes Clothing and Home Decor
(5, 4), (5, 5);  -- Raj likes Handicrafts and Jewelry

-- ========== PRODUCT ==========
INSERT INTO product (name, description, base_price, category_id) VALUES
-- Men's Clothing
('Traditional Punjabi', 'Handwoven cotton Punjabi with intricate embroidery', 1500.00, 6),
('Khadi Kurta', 'Premium khadi cotton kurta, perfect for any occasion', 1200.00, 6),
-- Women's Clothing
('Jamdani Saree', 'Authentic handloom Jamdani saree from Dhaka', 8500.00, 7),
('Block Print Kurti', 'Hand block printed kurti with traditional motifs', 950.00, 7),
('Batik Dress', 'Beautiful batik print dress, unique design', 1800.00, 7),
-- Accessories - Bags
('Jute Tote Bag', 'Eco-friendly handmade jute bag with leather handles', 450.00, 9),
('Embroidered Clutch', 'Hand-embroidered silk clutch with mirror work', 680.00, 9),
-- Accessories - Scarves
('Silk Scarf', 'Pure silk scarf with traditional patterns', 550.00, 10),
-- Home Decor
('Nakshi Kantha Wall Hanging', 'Traditional Nakshi Kantha art piece', 2200.00, 11),
('Block Print Cushion Cover', 'Set of 2 hand block printed cushion covers', 580.00, 12),
('Handwoven Rug', 'Cotton handwoven rug with geometric patterns', 3500.00, 13),
-- Handicrafts
('Terracotta Pot Set', 'Set of 3 handmade terracotta pots', 720.00, 14),
('Wooden Jewelry Box', 'Hand-carved wooden box with brass inlay', 1350.00, 15),
('Hand-embroidered Table Runner', 'Beautiful table runner with folk motifs', 890.00, 16),
-- Jewelry
('Terracotta Necklace', 'Handcrafted terracotta bead necklace', 450.00, 17),
('Silver Filigree Earrings', 'Traditional silver filigree work earrings', 1200.00, 18),
('Brass Bangle Set', 'Set of 4 traditional brass bangles', 380.00, 19);

-- ========== PRODUCT VARIANT ==========
INSERT INTO product_variant (size, color, stock_quantity, price, product_id) VALUES
-- Traditional Punjabi (product_id: 1)
('M', 'White', 15, 1500.00, 1),
('L', 'White', 12, 1500.00, 1),
('L', 'Blue', 8, 1550.00, 1),
('XL', 'White', 10, 1600.00, 1),
-- Khadi Kurta (product_id: 2)
('M', 'Beige', 20, 1200.00, 2),
('L', 'Beige', 18, 1200.00, 2),
('XL', 'Cream', 10, 1250.00, 2),
-- Jamdani Saree (product_id: 3)
('One Size', 'Red', 5, 8500.00, 3),
('One Size', 'Blue', 3, 8800.00, 3),
('One Size', 'Green', 4, 8500.00, 3),
-- Block Print Kurti (product_id: 4)
('S', 'Yellow', 15, 950.00, 4),
('M', 'Yellow', 18, 950.00, 4),
('L', 'Blue', 12, 950.00, 4),
('XL', 'Pink', 8, 980.00, 4),
-- Batik Dress (product_id: 5)
('S', 'Multicolor', 10, 1800.00, 5),
('M', 'Multicolor', 14, 1800.00, 5),
('L', 'Multicolor', 8, 1800.00, 5),
-- Jute Tote Bag (product_id: 6)
('Medium', 'Natural', 25, 450.00, 6),
('Large', 'Natural', 20, 500.00, 6),
-- Embroidered Clutch (product_id: 7)
('One Size', 'Red', 12, 680.00, 7),
('One Size', 'Gold', 10, 680.00, 7),
('One Size', 'Black', 15, 680.00, 7),
-- Silk Scarf (product_id: 8)
('One Size', 'Blue', 18, 550.00, 8),
('One Size', 'Red', 15, 550.00, 8),
-- Nakshi Kantha Wall Hanging (product_id: 9)
('Medium', 'Multicolor', 8, 2200.00, 9),
('Large', 'Multicolor', 5, 2800.00, 9),
-- Block Print Cushion Cover (product_id: 10)
('16x16', 'Blue', 30, 580.00, 10),
('16x16', 'Green', 25, 580.00, 10),
-- Handwoven Rug (product_id: 11)
('3x5 ft', 'Beige', 6, 3500.00, 11),
('4x6 ft', 'Brown', 4, 4200.00, 11),
-- Terracotta Pot Set (product_id: 12)
('Small', 'Terracotta', 20, 720.00, 12),
-- Wooden Jewelry Box (product_id: 13)
('Medium', 'Brown', 12, 1350.00, 13),
-- Hand-embroidered Table Runner (product_id: 14)
('60 inch', 'Multicolor', 15, 890.00, 14),
-- Terracotta Necklace (product_id: 15)
('One Size', 'Natural', 25, 450.00, 15),
-- Silver Filigree Earrings (product_id: 16)
('One Size', 'Silver', 18, 1200.00, 16),
-- Brass Bangle Set (product_id: 17)
('Medium', 'Gold', 22, 380.00, 17),
('Large', 'Gold', 20, 400.00, 17);

-- ========== PRODUCT IMAGE ==========
INSERT INTO product_image (image_url, variant_id) VALUES
-- Traditional Punjabi
('https://images.folkmint.com/punjabi-white-m-1.jpg', 1),
('https://images.folkmint.com/punjabi-white-m-2.jpg', 1),
('https://images.folkmint.com/punjabi-blue-l-1.jpg', 3),
-- Khadi Kurta
('https://images.folkmint.com/kurta-beige-m-1.jpg', 5),
('https://images.folkmint.com/kurta-beige-l-1.jpg', 6),
-- Jamdani Saree
('https://images.folkmint.com/saree-red-1.jpg', 8),
('https://images.folkmint.com/saree-red-2.jpg', 8),
('https://images.folkmint.com/saree-blue-1.jpg', 9),
('https://images.folkmint.com/saree-green-1.jpg', 10),
-- Block Print Kurti
('https://images.folkmint.com/kurti-yellow-s-1.jpg', 11),
('https://images.folkmint.com/kurti-blue-l-1.jpg', 13),
-- Batik Dress
('https://images.folkmint.com/dress-multi-s-1.jpg', 15),
('https://images.folkmint.com/dress-multi-m-1.jpg', 16),
-- Jute Tote Bag
('https://images.folkmint.com/tote-natural-m-1.jpg', 18),
('https://images.folkmint.com/tote-natural-l-1.jpg', 19),
-- Embroidered Clutch
('https://images.folkmint.com/clutch-red-1.jpg', 20),
('https://images.folkmint.com/clutch-gold-1.jpg', 21),
('https://images.folkmint.com/clutch-black-1.jpg', 22),
-- Silk Scarf
('https://images.folkmint.com/scarf-blue-1.jpg', 23),
('https://images.folkmint.com/scarf-red-1.jpg', 24),
-- Nakshi Kantha
('https://images.folkmint.com/kantha-medium-1.jpg', 25),
('https://images.folkmint.com/kantha-large-1.jpg', 26),
-- Cushion Covers
('https://images.folkmint.com/cushion-blue-1.jpg', 27),
('https://images.folkmint.com/cushion-green-1.jpg', 28),
-- Rug
('https://images.folkmint.com/rug-3x5-1.jpg', 29),
('https://images.folkmint.com/rug-4x6-1.jpg', 30),
-- Terracotta Pots
('https://images.folkmint.com/pots-small-1.jpg', 31),
-- Wooden Box
('https://images.folkmint.com/box-medium-1.jpg', 32),
-- Table Runner
('https://images.folkmint.com/runner-60-1.jpg', 33),
-- Jewelry
('https://images.folkmint.com/necklace-terracotta-1.jpg', 34),
('https://images.folkmint.com/earrings-silver-1.jpg', 35),
('https://images.folkmint.com/bangles-gold-m-1.jpg', 36);

-- ========== CART ==========
INSERT INTO cart (user_id) VALUES
(2),
(3),
(4),
(5);

-- ========== CART ITEM ==========
INSERT INTO cart_item (quantity, cart_id, variant_id) VALUES
-- John's cart
(2, 1, 1),  -- 2x Traditional Punjabi White M
(1, 1, 18), -- 1x Jute Tote Bag Medium
-- Jane's cart
(1, 2, 25), -- 1x Nakshi Kantha Wall Hanging Medium
(2, 2, 27), -- 2x Block Print Cushion Cover Blue
-- Mike's cart
(1, 3, 35), -- 1x Silver Filigree Earrings
(3, 3, 36), -- 3x Brass Bangle Set Medium
-- Sarah's cart
(1, 4, 16), -- 1x Batik Dress M
(1, 4, 23); -- 1x Silk Scarf Blue

-- ========== ORDERS ==========
INSERT INTO orders (order_date, total_amount, status, user_id, address_id, payment_id) VALUES
('2026-01-15 10:30:00', 2450.00, 'delivered', 2, 1, 1),
('2026-01-20 14:15:00', 1800.00, 'shipped', 3, 3, 2),
('2026-01-25 09:45:00', 3200.00, 'paid', 4, 4, 3);

-- ========== ORDER ITEM ==========
INSERT INTO order_item (quantity, price_at_purchase, order_id, variant_id) VALUES
-- Order 1 (John's delivered order)
(1, 950.00, 1, 12),  -- 1x Block Print Kurti M Yellow
(1, 1500.00, 1, 1),  -- 1x Traditional Punjabi White M
-- Order 2 (Jane's shipped order)
(1, 1800.00, 2, 16), -- 1x Batik Dress M
-- Order 3 (Mike's paid order)
(1, 1200.00, 3, 35), -- 1x Silver Filigree Earrings
(1, 2000.00, 3, 31), -- 1x Terracotta Pot Set (price adjustment for bulk)
-- Additional orders for more review data
(1, 680.00, 1, 20);  -- 1x Embroidered Clutch Red

-- ========== REVIEW ==========
INSERT INTO review (rating, comment, user_id, product_id, order_item_id) VALUES
(5, 'Excellent quality! The embroidery work is stunning. Highly recommended.', 2, 4, 1),
(4, 'Good quality Punjabi, fits well. Delivery was on time.', 2, 1, 2),
(5, 'Beautiful clutch! The mirror work is exquisite. Perfect for weddings.', 2, 7, 5);

-- Update timestamps for realism
UPDATE users SET created_at = NOW() - INTERVAL '30 days', updated_at = NOW() - INTERVAL '5 days' WHERE user_id > 1;
UPDATE product SET created_at = NOW() - INTERVAL '60 days';
UPDATE cart SET created_at = NOW() - INTERVAL '10 days';
UPDATE orders SET 
    created_at = order_date,
    updated_at = order_date + INTERVAL '2 days';

COMMIT;

-- Display summary
SELECT 'Seed data loaded successfully!' as status;
SELECT 'Users: ' || COUNT(*) as count FROM users;
SELECT 'Categories: ' || COUNT(*) as count FROM category;
SELECT 'Products: ' || COUNT(*) as count FROM product;
SELECT 'Product Variants: ' || COUNT(*) as count FROM product_variant;
SELECT 'Orders: ' || COUNT(*) as count FROM orders;
SELECT 'Reviews: ' || COUNT(*) as count FROM review;
