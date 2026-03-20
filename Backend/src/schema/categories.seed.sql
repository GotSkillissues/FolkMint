-- FolkMint Category Tree Structure (authoritative, ordered)
-- This keeps ONLY the requested category tree active and preserves display order.

BEGIN;

WITH desired_categories AS (
	SELECT *
	FROM (VALUES
		-- Root categories
		(1,   'Men',                        'Men''s fashion and apparel',                            NULL::INT, 0),
		(2,   'Women',                      'Women''s fashion and apparel',                          NULL::INT, 1),
		(4,   'Home Décor / Showpieces',    'Decorative handmade home items and showpieces',        NULL::INT, 2),
		(3,   'Handicrafts',                'Traditional handmade craft collections',                NULL::INT, 3),
		(5,   'Bags & Accessories',         'Handcrafted bags and accessories',                      NULL::INT, 4),
		(6,   'Gift Cards',                 'Gift cards for all occasions',                          NULL::INT, 5),

		-- Men
		(100, 'Panjabi',                    'Traditional Panjabi collection',                        1,         0),
		(8,   'Kurta',                      'Men''s kurta collection',                               1,         1),
		(9,   'Fotua',                      'Men''s Fotua styles',                                   1,         2),
		(101, 'Shirt',                      'Men''s shirt collection',                               1,         3),
		(11,  'Pajama',                     'Comfort and traditional pajama styles',                 1,         4),

		-- Women
		(12,  'Saree',                      'Women''s saree collection',                             2,         0),
		(102, 'Salwar Kameez',              'Women''s salwar kameez collection',                     2,         1),
		(14,  'Kurti',                      'Women''s kurti collection',                             2,         2),
		(111, 'Dupatta',                    'Women''s dupatta collection',                           2,         3),
		(106, 'Shawl',                      'Women''s shawl collection',                             2,         4),

		-- Women > Saree
		(17,  'Jamdani Saree',              'Authentic Jamdani saree collection',                    12,        0),
		(18,  'Cotton Saree',               'Comfortable cotton sarees',                             12,        1),
		(19,  'Silk Saree',                 'Premium silk sarees',                                   12,        2),
		(20,  'Muslin Saree',               'Fine muslin saree collection',                          12,        3),

		-- Women > Salwar Kameez
		(103, 'Cotton',                     'Cotton salwar kameez',                                  102,       0),
		(104, 'Silk',                       'Silk salwar kameez',                                    102,       1),
		(105, 'Muslin',                     'Muslin salwar kameez',                                  102,       2),

		-- Women > Shawl
		(107, 'Viscose',                    'Viscose shawls',                                        106,       0),
		(108, 'Cotton',                     'Cotton shawls',                                         106,       1),
		(109, 'Silk',                       'Silk shawls',                                           106,       2),
		(110, 'Nakshi Kantha',              'Nakshi Kantha shawls',                                  106,       3),

		-- Home Décor / Showpieces
		(28,  'Jute Showpieces',            'Decorative jute showpieces',                            4,         0),
		(71,  'Wall Hanging',               'Wall hanging decorative crafts',                        4,         1),
		(67,  'Decorative Plates',          'Handmade decorative plates',                            4,         2),
		(31,  'Vases',                      'Decorative and artisan vases',                          4,         3),
		(33,  'Wooden Crafts',              'Handmade wooden decorative items',                      4,         4),
		(51,  'Terracotta and Clay Crafts', 'Terracotta and clay craft collection',                  4,         5),
		(35,  'Lanterns / Candle Holder',   'Handcrafted lanterns and candle holders',               4,         6),

		-- Handicrafts
		(21,  'Nakshi Kantha',              'Traditional Nakshi Kantha crafts',                      3,         0),
		(22,  'Jute Products',              'Eco-friendly jute crafted products',                    3,         1),
		(23,  'Bamboo Crafts',              'Handmade bamboo craft items',                           3,         2),
		(24,  'Cane Crafts',                'Traditional cane craft products',                       3,         3),
		(25,  'Handmade Baskets',           'Handwoven handmade baskets',                            3,         4),
		(26,  'Mats',                       'Traditional woven mats',                                3,         5),
		(27,  'Embroidered Crafts',         'Embroidery-based craft products',                       3,         6),

		-- Bags & Accessories
		(36,  'Jute Bag',                   'Handmade jute bags',                                    5,         0),
		(37,  'Tote Bag',                   'Stylish tote bags',                                     5,         1),
		(38,  'Handbag',                    'Traditional and modern handcrafted handbags',            5,         2)
	) AS t(category_id, name, description, parent_category, sort_order)
)
INSERT INTO category (category_id, name, description, parent_category, sort_order, is_active)
SELECT category_id, name, description, parent_category, sort_order, true
FROM desired_categories
ON CONFLICT (category_id) DO UPDATE
SET
	name = EXCLUDED.name,
	description = EXCLUDED.description,
	parent_category = EXCLUDED.parent_category,
	sort_order = EXCLUDED.sort_order,
	is_active = EXCLUDED.is_active;

-- Deactivate categories that are not part of the requested tree.
UPDATE category
SET is_active = false
WHERE category_id NOT IN (
	1,2,3,4,5,6,
	8,9,11,12,14,17,18,19,20,21,22,23,24,25,26,27,28,31,33,35,36,37,38,51,67,71,
	100,101,102,103,104,105,106,107,108,109,110,111
);

-- Move products from legacy category ids into the new canonical tree.
UPDATE product
SET category_id = CASE category_id
	WHEN 50 THEN 102 -- Shalwars -> Salwar Kameez
	WHEN 46 THEN 105 -- Muslin Shalwar Kameez -> Muslin
	WHEN 47 THEN 104 -- Silk Shalwar Kameez -> Silk
	WHEN 48 THEN 103 -- Cotton Blends Shalwar Kameez -> Cotton
	WHEN 40 THEN 106 -- Shawls -> Shawl
	WHEN 41 THEN 107 -- Viscose Shawl -> Viscose
	WHEN 43 THEN 109 -- Silk Shawl -> Silk
	WHEN 44 THEN 108 -- Cotton Shawl -> Cotton
	WHEN 42 THEN 110 -- Nakshi Kantha Shawl -> Nakshi Kantha
	ELSE category_id
END
WHERE category_id IN (40,41,42,43,44,46,47,48,50);

SELECT rebuild_category_tree();

COMMIT;
