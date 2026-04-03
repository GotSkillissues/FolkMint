const { Client } = require('pg');
require('dotenv').config();

const IMAGES = [
  'https://mcprod.aarong.com/media/catalog/product/0/5/0560000083877.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0560000084273.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0560000082571.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0560000082473.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0560000082511.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0560000080226.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0560000083614.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0560000084065.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0550000176104.jpg?width=600',
  'https://mcprod.aarong.com/media/catalog/product/0/5/0550000168610.jpg?width=600'
];

const SAREES = [
  { name: 'Light Beige Printed Cotton Saree', catId: 18, price: 5450.00 },
  { name: 'Off White Traditional Printed Cotton Saree', catId: 18, price: 4800.00 },
  { name: 'Vibrant Red Printed Cotton Saree', catId: 18, price: 6200.00 },
  { name: 'Deep Blue Hand-Blocked Cotton Saree', catId: 18, price: 5900.00 },
  { name: 'Forest Green Floral Cotton Saree', catId: 18, price: 4500.00 },
  { name: 'Hand-Woven Traditional Cotton Saree', catId: 18, price: 7800.00 },
  { name: 'Zari Embroidered Premium Cotton Saree', catId: 18, price: 8500.00 },
  { name: 'Classic Floral Printed Cotton Saree', catId: 18, price: 5200.00 },
  { name: 'Embellished Pure Muslin Saree', catId: 20, price: 18500.00 },
  { name: 'Red Appliqued Hand-Crafted Muslin Saree', catId: 20, price: 22000.00 }
];

async function seedSarees() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log('Connected. Seeding 10 Sarees...');

    for (let i = 0; i < SAREES.length; i++) {
        const s = SAREES[i];
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING product_id',
            [s.name, `Premium handcrafted saree featuring traditional Bangladeshi artistry. Made from high-quality fabrics, perfect for special occasions.`, s.price, s.catId, `FM-S-${Math.floor(Date.now() / 1000)}-${i}`]
        );
        const productId = res.rows[0].product_id;
        
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, IMAGES[i]]
        );
        
        await client.query(
            'INSERT INTO product_variant (product_id, size, stock_quantity) VALUES ($1, $2, 25)',
            [productId, 'Universal']
        );
        console.log(`Added Saree: ${s.name}`);
    }

    console.log('10 Sarees added successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedSarees();
