const { Client } = require('pg');
require('dotenv').config();

const imgPool = [
  "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096853.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096852.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096851.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0930000095674.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0930000095673.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0932019300137_1.jpg"
];

const PRODUCTS = [
  { "name": "Large Seagrass Storage Basket", "price": 850.00, "description": "Spacious handmade seagrass basket." },
  { "name": "Round Cane Fruit Basket", "price": 450.00, "description": "Small round cane basket for fruits." },
  { "name": "Handwoven Bamboo Laundry Basket", "price": 1200.00, "description": "Tall bamboo laundry basket with lid." },
  { "name": "Decorative Palm Leaf Basket", "price": 550.00, "description": "Colorful palm leaf woven basket." },
  { "name": "Small Jute Organizng Basket", "price": 300.00, "description": "Perfect for small items organization." },
  { "name": "Square Wicker Basket Set", "price": 950.00, "description": "Set of 3 square wicker baskets." },
  { "name": "Rattan Picnic Basket", "price": 1500.00, "description": "Vintage style rattan picnic basket with handles." },
  { "name": "Hanging Cotton Rope Basket", "price": 600.00, "description": "Hanging basket for small plants." },
  { "name": "Water Hyacinth Storage Bin", "price": 750.00, "description": "Eco-friendly water hyacinth rectangular bin." },
  { "name": "Rustic Wire & Jute Basket", "price": 480.00, "description": "Industrial style basket." },
  { "name": "Woven Bread Basket", "price": 250.00, "description": "Oval basket for serving fresh bread." },
  { "name": "Handmade Sabai Grass Basket", "price": 400.00, "description": "Traditional sabai grass woven craft." },
  { "name": "Tall Cane Umbrella Basket", "price": 880.00, "description": "Tall basket for storing umbrellas." },
  { "name": "Macrame Boho Basket", "price": 650.00, "description": "Boho chic macrame basket." },
  { "name": "Miniature Wedding Sweet Basket", "price": 200.00, "description": "Small basket for wedding sweets." },
  { "name": "Colored Hogla Leaf Basket", "price": 350.00, "description": "Vibrant colored handmade basket." },
  { "name": "Bamboo Steamer Basket", "price": 420.00, "description": "Traditional Asian bamboo steamer." },
  { "name": "Tiered Hanging Fruit Basket", "price": 900.00, "description": "Three-tier woven hanging basket." },
  { "name": "Braided Cotton Storage Basket", "price": 700.00, "description": "Soft braided cotton utility basket." },
  { "name": "Decorative Woven Wall Basket", "price": 550.00, "description": "Flat woven basket for wall art." },
  { "name": "Jute & Leather Handle Basket", "price": 1100.00, "description": "Premium jute basket with leather handles." },
  { "name": "Mini Wicker Planter Basket", "price": 320.00, "description": "Small wicker basket for desk plants." },
  { "name": "Nesting Rattan Bowls", "price": 680.00, "description": "Set of nesting rattan patterned bowls." },
  { "name": "Handcrafted Kula (Winnowing Basket)", "price": 280.00, "description": "Traditional hand-painted Kula." }
];

async function seedHandmadeBaskets() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(`Connected. Seeding ${PRODUCTS.length} Handmade Baskets...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        const img = imgPool[i % imgPool.length];
        
        // Use category_id 25 for Handmade Baskets
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 25, $4, true) RETURNING product_id',
            [p.name, p.description, p.price, `FM-HMB-${Math.floor(Date.now() / 1000)}-${i}`]
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

    console.log('Handmade Baskets seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedHandmadeBaskets();
