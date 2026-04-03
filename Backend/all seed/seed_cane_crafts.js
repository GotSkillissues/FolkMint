const { Client } = require('pg');
require('dotenv').config();

const PRODUCTS = [
  { "name": "Cane Basket- Small", "price": 223.81, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0930000095674.jpg", "description": "Cane Basket- Small" },
  { "name": "Cane Basket- Big", "price": 366.67, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0930000095673.jpg", "description": "Cane Basket- Big" },
  { "name": "Round Cane Tray", "price": 450.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097860.jpg", "description": "Handcrafted round cane tray for serving and decor." },
  { "name": "Cane Waste Bin", "price": 850.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096853.jpg", "description": "Eco-friendly cane waste bin." },
  { "name": "Cane Laundry Basket", "price": 1200.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096851.jpg", "description": "Spacious cane laundry basket with lid." },
  { "name": "Decorative Cane Bowl", "price": 320.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0892018996308_2.jpg", "description": "Decorative bowl made of natural cane." },
  { "name": "Cane Flower Vase", "price": 500.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/0/0000093190100.jpg", "description": "Cane woven flower vase for living room." },
  { "name": "Square Cane Tray", "price": 480.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/0/0000093191600.jpg", "description": "Square cane tray for serving." },
  { "name": "Small Cane Storage Box", "price": 290.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0932019300137_1.jpg", "description": "Small cane storage box with lid." },
  { "name": "Oval Cane Fruit Basket", "price": 550.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097693.jpg", "description": "Oval shaped cane fruit basket." },
  { "name": "Large Cane Planter", "price": 950.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097692.jpg", "description": "Large cane planter covering for indoor plants." },
  { "name": "Medium Cane Planter", "price": 750.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097691.jpg", "description": "Medium cane planter covering for indoor plants." },
  { "name": "Cane Tissue Box Cover", "price": 350.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097666.jpg", "description": "Cane tissue box cover for a rustic look." },
  { "name": "Cane Pen Holder", "price": 180.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097925.jpg", "description": "Simple cane pen holder for desk organization." },
  { "name": "Cane Magazine Rack", "price": 1100.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096853.jpg", "description": "Cane magazine rack for living room." },
  { "name": "Cane Bread Basket", "price": 260.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/0/0000093190100.jpg", "description": "Round cane bread basket." },
  { "name": "Round Cane Wall Decor", "price": 600.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097693.jpg", "description": "Round cane wall decoration piece." },
  { "name": "Cane Table Mat Set", "price": 850.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096851.jpg", "description": "Set of 6 cane table mats." },
  { "name": "Cane Coaster Set", "price": 250.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097925.jpg", "description": "Set of 6 cane coasters with holder." },
  { "name": "Cane Lampshade - Round", "price": 1500.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0892018996308_2.jpg", "description": "Round cane woven lampshade." },
  { "name": "Cane Lampshade - Tall", "price": 1800.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097666.jpg", "description": "Tall cane woven lampshade." },
  { "name": "Cane Serving Bowl", "price": 420.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/0/0000093191600.jpg", "description": "Cane serving bowl with intricate weaving." },
  { "name": "Cane Spice Organizer", "price": 750.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0932019300137_1.jpg", "description": "Cane tray organizer for spices." },
  { "name": "Cane Multipurpose Tray", "price": 550.00, "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097692.jpg", "description": "Multipurpose woven cane tray." }
];

async function seedCaneCrafts() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
        console.log(`Connected. Seeding ${PRODUCTS.length} Cane Crafts...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        
        // Use category_id 24 for Cane Crafts
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 24, $4, true) RETURNING product_id',
            [p.name, p.description, p.price, `FM-CC-${Math.floor(Date.now() / 1000)}-${i}`]
        );
        const productId = res.rows[0].product_id;
        
        // Add image
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, p.image_url]
        );
        
        // Add variant for stock (Universal size)
        await client.query(
            'INSERT INTO product_variant (product_id, size, stock_quantity) VALUES ($1, $2, 20)',
            [productId, 'Standard']
        );
        
        console.log(`Added ${p.name}`);
    }

    console.log('Cane Crafts seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedCaneCrafts();
