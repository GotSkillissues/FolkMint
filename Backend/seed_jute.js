const { Client } = require('pg');
require('dotenv').config();

const imgPool = [
  "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097693.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097692.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096853.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096851.jpg"
];

const PRODUCTS = [
  { "name": "Fancy Jute Decor Doll", "price": 460.00, "description": "Beautiful woven jute doll." },
  { "name": "Jute Elephant Set", "price": 750.00, "description": "Set of two miniature jute elephants." },
  { "name": "Handmade Jute Vase", "price": 520.00, "description": "Decorative jute flower vase." },
  { "name": "Jute Peacock Showpiece", "price": 890.00, "description": "Artistic jute peacock design." },
  { "name": "Vintage Jute Hanging Decor", "price": 630.00, "description": "Vintage style wall hanging piece." },
  { "name": "Woven Jute Desk Clock", "price": 950.00, "description": "Showpiece clock surrounded with jute." },
  { "name": "Jute Ship Model", "price": 1200.00, "description": "Intricate boat/ship model made of jute." },
  { "name": "Rural Scenery Jute Tapestry", "price": 1500.00, "description": "Tapestry depicting village life." },
  { "name": "Jute Pot Hanger", "price": 300.00, "description": "Jute hanger for tiny earthen pots." },
  { "name": "Miniature Jute Lantern", "price": 400.00, "description": "Cute jute lantern showpiece." },
  { "name": "Jute Floral Centerpiece", "price": 780.00, "description": "Centerpiece made from colored jute fibers." },
  { "name": "Jute Key Hanger Showpiece", "price": 450.00, "description": "Wall mounted key hanger with jute art." },
  { "name": "Jute Elephant Wall Mask", "price": 600.00, "description": "Decorative wall mask." },
  { "name": "Jute Tree of Life Art", "price": 1400.00, "description": "Tree of life woven in circular frame." },
  { "name": "Jute Cow Cart Figure", "price": 850.00, "description": "Handmade jute Gorur gari model." },
  { "name": "Jute Nested Decor Bowls", "price": 550.00, "description": "Set of 3 showpiece bowls." },
  { "name": "Jute Butterfly Wall Art", "price": 320.00, "description": "Jute butterfly for indoor walls." },
  { "name": "Mini Jute Rickshaw", "price": 990.00, "description": "Detailed jute rickshaw showpiece." },
  { "name": "Jute Elephant Bookends", "price": 1100.00, "description": "Pair of jute reinforced bookends." },
  { "name": "Jute Welcome Sign", "price": 480.00, "description": "Showpiece welcome sign for wall." },
  { "name": "Jute Swan Set", "price": 670.00, "description": "Pair of decorative jute swans." },
  { "name": "Jute Village Woman Doll", "price": 500.00, "description": "Traditional woman carrying pot figurine." },
  { "name": "Modern Jute Geometry Art", "price": 1250.00, "description": "Contemporary jute ring intersection decor." },
  { "name": "Jute Decorative Plate", "price": 560.00, "description": "Painted jute showpiece plate." }
];

async function seedJuteMore() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(`Connected. Seeding ${PRODUCTS.length} MORE Jute Showpieces...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        const img = imgPool[i % imgPool.length];
        
        // Use category_id 28 for Jute Showpieces
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 28, $4, true) RETURNING product_id',
            [p.name, p.description, p.price, `FM-JUTE2-${Math.floor(Date.now() / 1000)}-${i}`]
        );
        const productId = res.rows[0].product_id;
        
        // Add image
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, img]
        );
        
        // Add variant for stock
        await client.query(
            'INSERT INTO product_variant (product_id, size, stock_quantity) VALUES ($1, $2, 20)',
            [productId, 'Standard']
        );
        
        console.log(`Added ${p.name}`);
    }

    console.log('More Jute Showpieces seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedJuteMore();
