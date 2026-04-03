-- Additional Seeding for Bags and Home Decor
-- Mapped to FolkMint subcategories to ensure they appear in the navigation and landing pages.

BEGIN;

-- 8. Bags & Accessories > Jute Bag (Category 36)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Classic Black Jute Bag', 'Sustainable black jute bag with zippered main compartment, inner zippered pocket, and soft cotton lining.', 'BG-JUT-001', 620.00, 36),
('Ivory Jute Embroidered Bag (Small)', 'Delicate small ivory jute bag featuring traditional floral embroidery. Perfect for light carry.', 'BG-JUT-002', 270.00, 36),
('Ivory Jute Embroidered Bag (Large)', 'Spacious ivory jute bag with elegant floral embroidery, providing style and utility.', 'BG-JUT-003', 420.00, 36);

-- 9. Bags & Accessories > Tote Bag (Category 37)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Olive and Copper Embroidered Mixed Tote', 'Artisan mixed cotton tote bag with intricate green and orange embroidery and a copper leather back.', 'BG-TOT-001', 3618.60, 37);

-- 10. Bags & Accessories > Handbag (Category 38)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Off-White Embossed Leather Handbag', 'Premium genuine leather handbag in off-white, featuring sophisticated embossed patterns and a structured design.', 'BG-HNB-001', 3255.81, 38),
('Vibrant Red Leather Handbag', 'Sleek red genuine leather handbag with multiple compartments and a professional finish.', 'BG-HNB-002', 5348.84, 38);

-- 11. Home Decor > Wall Hanging (Category 71)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Framed Nakshi Kantha Wall Hanging (Small)', 'Traditional Nakshi Kantha hand-embroidery on cotton, elegantly set in a small wooden frame.', 'HD-WLH-001', 1269.77, 71),
('Intricate Nakshi Kantha Tapestry (Medium)', 'Medium-sized wall hanging showcasing detailed traditional Bangladeshi embroidery patterns.', 'HD-WLH-002', 3581.40, 71),
('Grand Nakshi Kantha Wall Art (Large)', 'Large-scale premium Nakshi Kantha piece, perfect as a statement wall art in any traditional home.', 'HD-WLH-003', 5213.95, 71);

-- 12. Home Decor > Jute Showpieces (Category 28)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Decorative Jute Sika (Large)', 'Traditional woven jute sika, historically used for hanging pots, now a beautiful rustic decor element.', 'HD-JUT-001', 254.81, 28),
('Natural & Black Jute Sika (Medium)', 'Intricately hand-woven jute sika with natural and black fibre contrast for wall decoration.', 'HD-JUT-002', 206.73, 28);

-- 13. Home Decor > Wooden Crafts (Category 33)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Brown Printed Wood Jewellery Box', 'Exquisitely handcrafted wooden jewellery box with printed motifs on the lid and a smooth polished finish.', 'HD-WOD-001', 961.90, 33);

-- 14. Home Decor > Terracotta and Clay Crafts (Category 51)
INSERT INTO product (name, description, sku, price, category_id) VALUES
('Traditional Terracotta Elephant Bank', 'Classic orange terracotta coin bank in the shape of an elephant, featuring hand-engraved details.', 'HD-TER-001', 155.00, 51),
('Framed Terracotta Calligraphy Plaque', 'Terracotta calligraphy plaque set in a high-quality beech wood frame. A unique artisanal decor piece.', 'HD-TER-002', 730.23, 51);

-- Update stock for newly added products
UPDATE product_variant SET stock_quantity = 30 WHERE product_id IN (SELECT product_id FROM product WHERE sku LIKE 'BG-%' OR sku LIKE 'HD-%');

-- Images for Bags
INSERT INTO product_image (product_id, image_url, is_primary)
SELECT p.product_id, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=800', true FROM product p WHERE p.category_id IN (36, 37, 38);

-- Images for Home Decor / Showpieces
INSERT INTO product_image (product_id, image_url, is_primary)
SELECT p.product_id, 'https://images.unsplash.com/photo-1612152841440-6242379308d9?q=80&w=800', true FROM product p WHERE p.category_id IN (71, 28, 33, 51);

COMMIT;
