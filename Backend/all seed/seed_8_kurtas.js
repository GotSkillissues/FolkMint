const { Client } = require('pg');
require('dotenv').config();

const IMAGES = [
  'https://mcprod.aarong.com/media/catalog/product/0/1/0140000107157.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/1/0140000107126.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/1/0140000107114.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/1/0140000107077.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/1/0140000106563_1.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/1/0140000107163.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/1/0140000106843.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/1/0140000106819.jpg'
];

const KURTAS = [
  { name: 'Slim Fit Printed Short Kurta', desc: 'Modern slim fit short kurta with delicate prints. Perfect for casual outings.', price: 1450.00 },
  { name: 'Textured Cotton Short Kurta', desc: 'Premium textured cotton fabric in a classic short length. Breathable and stylish.', price: 1650.00 },
  { name: 'Deep Blue Embroidered Kurta', desc: 'Elegant deep blue kurta with subtle embroidery on the placket.', price: 1950.00 },
  { name: 'Maroon Block-Printed Kurta', desc: 'Traditional block-printed short kurta in rich maroon.', price: 1550.00 },
  { name: 'White Linen Blend Short Kurta', desc: 'Lightweight linen blend kurta in pristine white. Ideal for summer.', price: 2100.00 },
  { name: 'Olive Green Slim Fit Kurta', desc: 'Slim-fitting short kurta in trendy olive green.', price: 1750.00 },
  { name: 'Grey Melange Casual Kurta', desc: 'Soft grey melange fabric for a relaxed, modern look.', price: 1350.00 },
  { name: 'Black Minimalist Short Kurta', desc: 'Sleek black kurta with minimalist details and a sharp silhouette.', price: 1800.00 }
];

async function seedKurtas() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log('Connected. Seeding 8 Kurtas...');

    for (let i = 0; i < KURTAS.length; i++) {
        const k = KURTAS[i];
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 8, $4, true) RETURNING product_id',
            [k.name, k.desc, k.price, `FM-K-${Math.floor(Date.now() / 1000)}-${i}`]
        );
        const productId = res.rows[0].product_id;
        
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, IMAGES[i]]
        );
        
        await client.query(
            'INSERT INTO product_variant (product_id, size, stock_quantity) VALUES ($1, $2, 40)',
            [productId, 'M']
        );
        console.log(`Added Kurta: ${k.name}`);
    }

    console.log('8 Kurtas added successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedKurtas();
