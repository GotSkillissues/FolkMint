const { Client } = require('pg');
require('dotenv').config();

const IMAGES = [
  'https://mcprod.aarong.com/media/catalog/product/0/0/0030000141366.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0040000106948.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0030000141087.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0030000141093.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0030000141353.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0040000107134.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0030000138924.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0040000107563.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0030000140221.jpg',
  'https://mcprod.aarong.com/media/catalog/product/0/0/0030000140223.jpg'
];

const MORE_PANJABIS = [
    { name: 'Red Embroidered Cotton Panjabi', desc: 'Vibrant red cotton Panjabi with intricate white embroidery on collar.', price: 2350.00 },
    { name: 'Sky Blue Printed Slim Fit Panjabi', desc: 'Modern slim fit Panjabi with geometric prints and stand collar.', price: 2100.00 },
    { name: 'Classic Black Cotton Panjabi', desc: 'Elegant black cotton Panjabi for everyday wear. Soft and comfortable.', price: 1850.00 },
    { name: 'Olive Green Textured Panjabi', desc: 'Unique textured fabric in olive green. Hand-embroidered buttons.', price: 2600.00 },
    { name: 'White & Blue Block-Printed Panjabi', desc: 'Traditional block-printed motifs in blue over premium white cotton.', price: 2250.00 },
    { name: 'Golden Beige Silk Panjabi', desc: 'Luxurious silk blend Panjabi in golden beige, perfect for evening events.', price: 3800.00 },
    { name: 'Navy Blue Hand-Stitched Panjabi', desc: 'Navy blue cotton fabric with detailed hand-stitching on the chest.', price: 2450.00 }
];

async function seedMorePanjabis() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log('Connected. Seeding 7 more Panjabis...');

    for (let i = 0; i < MORE_PANJABIS.length; i++) {
        const p = MORE_PANJABIS[i];
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 100, $4, true) RETURNING product_id',
            [p.name, p.desc, p.price, `FM-P-${Math.floor(Date.now() / 1000)}-${i}`]
        );
        const productId = res.rows[0].product_id;
        
        // Add image (starting from index 3 to skip the ones I already used for the first 3 products, but let's just cycle)
        const imageUrl = IMAGES[(i + 3) % IMAGES.length];
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, imageUrl]
        );
        
        // Add one default variant for stock
        await client.query(
            'INSERT INTO product_variant (product_id, size, stock_quantity) VALUES ($1, $2, 50)',
            [productId, 'L']
        );
        console.log(`Added ${p.name}`);
    }

    console.log('7 additional Panjabis added successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedMorePanjabis();
