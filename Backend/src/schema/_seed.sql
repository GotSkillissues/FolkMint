-- Seeding Aarong-inspired products into FolkMint
-- Mapped to the canonical FolkMint category tree.

BEGIN;

-- CLEANUP (Optional: Only if you want to start fresh for these specific categories)
-- DELETE FROM product WHERE category_id IN (100, 101, 17, 19, 102, 21, 4);

-- 1. Men > Panjabi (Category 100)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('White Printed Cotton Slim Fit Panjabi', 'Elegant white printed cotton slim fit panjabi with dark green patterns. Traditional yet modern design.', 'MN-PAN-001', 2300.00, 100),
('Red Embroidered Cotton Slim Fit Panjabi', 'Stylish red cotton panjabi with delicate embroidery work, featuring a modern slim fit cut.', 'MN-PAN-002', 3363.64, 100),
('Red Embroidered Cotton Panjabi', 'Classic red cotton panjabi with gold-toned traditional embroidery. Perfect for festive occasions.', 'MN-PAN-003', 2459.09, 100);

-- 2. Men > Shirt (Category 101)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Dark Beige Striped Cotton Fitted Shirt', 'Casual and refined dark beige striped cotton shirt in a fitted style for a sharp look.', 'MN-SHR-001', 722.73, 101),
('Khaki Cotton Fitted Shirt', 'Professional and comfortable khaki cotton shirt, tailored in a fitted style.', 'MN-SHR-002', 1568.18, 101),
('Multicolour Printed Cotton Fitted Shirt', 'Vibrant multicolour printed cotton shirt, offering a unique and artistic festive look.', 'MN-SHR-003', 1004.55, 101);

-- 3. Women > Saree > Jamdani (Category 17)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Sky Blue Half Silk Jamdani Saree', 'Traditional sky blue half silk jamdani saree with intricate handwoven motifs. A masterpiece of Bangladeshi heritage.', 'WM-JAM-001', 9772.73, 17),
('Watermelon Pink Half Silk Jamdani Saree', 'Exquisite watermelon pink half silk jamdani saree with gold-toned motifs, perfect for weddings and celebrations.', 'WM-JAM-002', 18895.45, 17),
('Magenta Half Silk Jamdani Saree', 'Vibrant magenta half silk jamdani saree featuring classic geometric patterns and fine craftsmanship.', 'WM-JAM-003', 9772.73, 17);

-- 4. Women > Saree > Silk (Category 19)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('White Tangail Baluchari Soft Silk Saree', 'Graceful white tangail baluchari soft silk saree with story-telling patterns on the border and pallu.', 'WM-SLK-001', 7886.36, 19),
('Light Pink Tie-Dyed and Printed Silk Saree', 'Contemporary light pink silk saree with artistic tie-dyed patterns and delicate prints.', 'WM-SLK-002', 12831.82, 19),
('Orange Appliqued and Embroidered Endi Silk Saree', 'Luxurious orange endi silk saree with handcrafted applique work and detailed embroidery.', 'WM-SLK-003', 12918.18, 19);

-- 5. Women > Salwar Kameez (Category 102)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Off White Pink Yellow Ornamenta Theme Salwar Kameez', 'Designer salwar kameez set featuring a unique ornamental theme in off-white, pink, and yellow hues.', 'WM-SKM-001', 4904.55, 102),
('Magenta Kantha Theme Cotton Salwar Kameez', 'Traditional cotton salwar kameez set featuring beautiful Kantha-inspired stitch patterns on a magenta background.', 'WM-SKM-002', 5918.18, 102),
('Orange Ornamenta Theme Salwar Kameez', 'Vibrant orange salwar kameez set with artistic ornamental prints and comfortable design.', 'WM-SKM-003', 4368.18, 102);

-- 6. Handicrafts > Nakshi Kantha (Category 21)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Burgundy Printed and Embroidered Nakshi Kantha Saree', 'Elegant burgundy muslin saree featuring traditional Nakshi Kantha hand-embroidery over printed patterns.', 'HC-NK-001', 15654.55, 21),
('Magenta Nakshi Kantha Embroidered Silk Saree', 'Premium silk saree adorned with intricate Nakshi Kantha hand-embroidery. A collector’s piece.', 'HC-NK-002', 27409.09, 21),
('Magenta Brush Painted and Nakshi Kantha Silk Saree', 'Artistic silk saree combining hand brush-painting with detailed Nakshi Kantha stitch work.', 'HC-NK-003', 18309.09, 21);

-- 7. Home Decor / Showpieces (Category 4)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Handcrafted Brass Rickshaw', 'Detailed handcrafted brass rickshaw showpiece, reflecting the iconic street life of Dhaka.', 'HD-SHP-001', 2488.37, 4),
('Golden Brass Rickshaw with Intricate Carvings', 'Premium golden brass rickshaw showpiece featuring elaborate hand-carved details.', 'HD-SHP-002', 3190.70, 4),
('Traditional Brass Van Gari', 'Classic handcrafted brass van gari showpiece, a perfect addition to any traditional home décor.', 'HD-SHP-003', 2288.37, 4);

-- Trigger 'product_after_insert' handles default variant creation.
-- We update stock for all newly added products.
UPDATE product_variant SET stock_quantity = 50 WHERE product_id IN (SELECT product_id FROM product WHERE sku LIKE 'MN-%' OR sku LIKE 'WM-%' OR sku LIKE 'HC-%' OR sku LIKE 'HD-%');

-- Apparel sizes for Panjabi, Shirt, Salwar Kameez
INSERT INTO product_variant (product_id, size, stock_quantity)
SELECT p.product_id, 'M', 20 FROM product p WHERE p.category_id IN (100, 101, 102) AND p.sku LIKE '%-00%';
INSERT INTO product_variant (product_id, size, stock_quantity)
SELECT p.product_id, 'L', 15 FROM product p WHERE p.category_id IN (100, 101, 102) AND p.sku LIKE '%-00%';
INSERT INTO product_variant (product_id, size, stock_quantity)
SELECT p.product_id, 'XL', 10 FROM product p WHERE p.category_id IN (100, 101, 102) AND p.sku LIKE '%-00%';

-- Placeholder images
INSERT INTO product_image (product_id, image_url, is_primary)
SELECT p.product_id, 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800', true FROM product p WHERE p.category_id IN (100, 101);
INSERT INTO product_image (product_id, image_url, is_primary)
SELECT p.product_id, 'https://images.unsplash.com/photo-1610030469668-93510cb2832c?q=80&w=800', true FROM product p WHERE p.category_id IN (17, 19, 21);
INSERT INTO product_image (product_id, image_url, is_primary)
SELECT p.product_id, 'https://images.unsplash.com/photo-1594913217503-68d807662991?q=80&w=800', true FROM product p WHERE p.category_id = 102;
INSERT INTO product_image (product_id, image_url, is_primary)
SELECT p.product_id, 'https://images.unsplash.com/photo-1588666309990-d68f08e3d4a6?q=80&w=800', true FROM product p WHERE p.category_id = 4;

COMMIT;
