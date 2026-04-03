const { pool } = require('./src/config/database');
require('dotenv').config();

async function checkFix() {
  try {
    const query = `
      SELECT COUNT(*) 
      FROM product_image pi 
      JOIN product p ON pi.product_id = p.product_id 
      WHERE p.category_id = 22 
      AND pi.image_url LIKE '%mcprod.aarong.com%'
    `;
    const res = await pool.query(query);
    console.log(`Verified: ${res.rows[0].count} Corrected Jute images.`);
  } catch (err) {
    console.error('Failed to verify fix:', err.message);
  } finally {
    process.exit(0);
  }
}

checkFix();
