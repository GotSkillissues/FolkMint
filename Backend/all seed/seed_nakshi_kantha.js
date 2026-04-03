const { Client } = require('pg');
require('dotenv').config();

const imgPool = [
  "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097646.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097860.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096853.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096852.jpg",
  "https://mcprod.aarong.com/media/catalog/product/0/8/0892018996308_2.jpg"
];

const PRODUCTS = [
  { "name": "Hand-stitched Nakshi Kantha Set", "price": 4600.00, "description": "Classic Kantha set with detailed stitching." },
  { "name": "Geometric Pattern Nakshi Quilt", "price": 5400.00, "description": "Quilt with abstract geometric stitch design." },
  { "name": "Purple Heritage Nakshi Kantha", "price": 6100.00, "description": "Beautiful purple tones and traditional art." },
  { "name": "Rajshahi Silk Nakshi Kantha", "price": 8600.00, "description": "Gorgeous silk kantha from Rajshahi." },
  { "name": "Nakshi Kantha Wall Tapestry", "price": 2700.00, "description": "Hanging tapestry for home decor." },
  { "name": "Twin Size Nakshi Kantha", "price": 4900.00, "description": "Handcrafted for twin beds." },
  { "name": "Paisley Embroidered Kantha", "price": 5700.00, "description": "Fine Kantha with large paisley figures." },
  { "name": "Light Blue Baby Kantha", "price": 1400.00, "description": "Cozy and soft baby blanket." },
  { "name": "Heavy Winter Nakshi Kantha", "price": 8900.00, "description": "Thickly layered Kantha for cold weather." },
  { "name": "Nakshi Kantha Table Cloth", "price": 3500.00, "description": "Artisan stitched dining table cloth." },
  { "name": "Mango Motif Nakshi Kantha", "price": 5100.00, "description": "Traditional mango motif embroidery." },
  { "name": "King Size Bridal Kantha", "price": 10500.00, "description": "Massive, highly detailed Kantha for weddings." },
  { "name": "Multicolor Patchwork Kantha", "price": 4100.00, "description": "Vibrant colors compiled from various patches." },
  { "name": "Framed Miniature Kantha Art", "price": 2100.00, "description": "Small framed section of intricate stitches." },
  { "name": "Sofa Throw Nakshi Kantha", "price": 4300.00, "description": "Perfect elegant throw for the living room." },
  { "name": "Green Foliage Kantha", "price": 5300.00, "description": "Stitches resembling leaves and vines." },
  { "name": "Village Festival Kantha", "price": 7400.00, "description": "Elaborate scene of a rural festival." },
  { "name": "Bird Motif Kantha Quilt", "price": 6000.00, "description": "Beautiful birds stitched onto the fabric." },
  { "name": "Nakshi Kantha Cushion Pair", "price": 3200.00, "description": "Matching pair of Kantha cushions." },
  { "name": "Indigo Dye Nakshi Kantha", "price": 5800.00, "description": "Deep indigo base with contrasting thread." },
  { "name": "Nakshi Kantha Dining Set", "price": 4500.00, "description": "Includes runner and placemats." },
  { "name": "Water Lily Nakshi Kantha", "price": 5900.00, "description": "Shapla (Water Lily) design embroidery." },
  { "name": "Washed Cotton Vintage Kantha", "price": 7200.00, "description": "Extremely soft vintage fabric Kantha." },
  { "name": "Soft Handloom Kantha", "price": 6600.00, "description": "Woven handloom fabric with kantha stitch." }
];

async function seedNakshiKanthaMore() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(`Connected. Seeding ${PRODUCTS.length} MORE Nakshi Kantha...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        const img = imgPool[i % imgPool.length];
        
        // Use category_id 21 for Handicrafts / Nakshi Kantha
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 21, $4, true) RETURNING product_id',
            [p.name, p.description, p.price, `FM-NAKSHI2-${Math.floor(Date.now() / 1000)}-${i}`]
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
            [productId, 'Universal']
        );
        
        console.log(`Added ${p.name}`);
    }

    console.log('More Nakshi Kantha seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedNakshiKanthaMore();
