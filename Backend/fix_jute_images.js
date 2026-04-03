const { pool } = require('./src/config/database');
require('dotenv').config();

async function fixImages() {
  try {
    const query = `
      UPDATE product_image 
      SET image_url = REPLACE(image_url, 'as-cdn.aarong.com', 'mcprod.aarong.com')
      FROM product 
      WHERE product_image.product_id = product.product_id 
      AND product.category_id = 22
    `;
    const res = await pool.query(query);
    console.log(`Updated ${res.rowCount} image URLs for Category 22.`);
  } catch (err) {
    console.error('Failed to fix images:', err.message);
  } finally {
    process.exit(0);
  }
}

fixImages();
