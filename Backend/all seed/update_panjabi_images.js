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
  'https://mcprod.aarong.com/media/catalog/product/0/0/0030000140221.jpg'
];

async function updatePanjabiImages() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log('Connected. Fetching Panjabi products...');
    
    // Category 100 is Panjabi
    const res = await client.query('SELECT product_id FROM product WHERE category_id = 100 ORDER BY product_id');
    const products = res.rows;
    
    console.log(`Found ${products.length} Panjabi products.`);

    for (let i = 0; i < products.length; i++) {
        const productId = products[i].product_id;
        const imageUrl = IMAGES[i % IMAGES.length];
        
        // Remove existing primary images for this product
        await client.query('DELETE FROM product_image WHERE product_id = $1', [productId]);
        
        // Insert new primary image
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, imageUrl]
        );
        console.log(`Updated product ${productId} with image ${imageUrl}`);
    }

    console.log('All Panjabi images updated successfully!');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    await client.end();
  }
}

updatePanjabiImages();
