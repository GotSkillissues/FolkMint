const { Client } = require('pg');
require('dotenv').config();

const imgPool = [
  "https://mcprod.aarong.com/pub/media/catalog/product/1/1/1150000000305.jpg",
  "https://mcprod.aarong.com/pub/media/catalog/product/0/8/0890000097646.jpg",
  "https://mcprod.aarong.com/pub/media/catalog/product/0/8/0890000097860.jpg",
  "https://mcprod.aarong.com/pub/media/catalog/product/0/9/0940000096853.jpg",
  "https://mcprod.aarong.com/pub/media/catalog/product/0/9/0940000096852.jpg",
  "https://mcprod.aarong.com/pub/media/catalog/product/0/9/0940000096851.jpg",
  "https://mcprod.aarong.com/pub/media/catalog/product/0/8/0892018996308_2.jpg"
];

const PRODUCTS = [
  { "name": "Terracotta Horse Showpiece", "price": 450.00, "description": "Beautiful terracotta horse for home decor." },
  { "name": "Clay Elephant Statuette", "price": 550.00, "description": "Handcrafted clay elephant." },
  { "name": "Terracotta Flower Vase", "price": 350.00, "description": "Traditional terracotta vase." },
  { "name": "Clay Wind Chime", "price": 600.00, "description": "Soothing clay wind chime." },
  { "name": "Terracotta Owl Idol", "price": 300.00, "description": "Cute terracotta owl." },
  { "name": "Clay Serving Bowl", "price": 400.00, "description": "Food-safe clay serving bowl." },
  { "name": "Terracotta Tea Set", "price": 850.00, "description": "Rustic terracotta tea set." },
  { "name": "Clay Wall Hanging Mask", "price": 750.00, "description": "Artistic clay mask for wall." },
  { "name": "Terracotta Water Pitcher", "price": 650.00, "description": "Cooling terracotta water jug." },
  { "name": "Clay Diya Set (6 pcs)", "price": 200.00, "description": "Traditional clay lamps." },
  { "name": "Terracotta Turtle Decor", "price": 320.00, "description": "Small decorative turtle." },
  { "name": "Clay Pen Stand", "price": 250.00, "description": "Clay pen holder for desk." },
  { "name": "Terracotta Incense Holder", "price": 180.00, "description": "Terracotta incense stick holder." },
  { "name": "Clay Bird Feeder", "price": 500.00, "description": "Hanging clay bird feeder." },
  { "name": "Terracotta Coin Bank", "price": 280.00, "description": "Classic terracotta Matir Bank." },
  { "name": "Clay Decorative Plate", "price": 900.00, "description": "Painted clay wall plate." },
  { "name": "Terracotta Fish Showpiece", "price": 340.00, "description": "Handmade fish figurine." },
  { "name": "Clay Candle Stand", "price": 420.00, "description": "Clay stand for candles." },
  { "name": "Terracotta Garden Planter", "price": 800.00, "description": "Large planter for garden." },
  { "name": "Clay Ashtray", "price": 150.00, "description": "Simple clay ashtray." },
  { "name": "Terracotta Musician Figurine", "price": 600.00, "description": "Baul musician clay doll." },
  { "name": "Clay Jewelry Box", "price": 450.00, "description": "Small clay box with lid." },
  { "name": "Terracotta Wall Tiles Set", "price": 1200.00, "description": "Set of 3 terracotta wall arts." },
  { "name": "Clay Desktop Planter", "price": 380.00, "description": "Small planter for indoor use." }
];

async function seedTerracotta() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(`Connected. Seeding ${PRODUCTS.length} Terracotta & Clay Crafts...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        const img = imgPool[i % imgPool.length];
        
        // Use category_id 51
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 51, $4, true) RETURNING product_id',
            [p.name, p.description, p.price, `FM-TC-${Math.floor(Date.now() / 1000)}-${i}`]
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

    console.log('Terracotta & Clay Crafts seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedTerracotta();
