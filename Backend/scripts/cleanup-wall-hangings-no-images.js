require('dotenv').config({ path: __dirname + '/../.env' });
const { pool } = require('../src/config/database');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const catRes = await client.query("SELECT category_id FROM category WHERE LOWER(name) = 'wall hangings'");
    if (catRes.rows.length === 0) {
      console.log('Category not found');
      return;
    }
    const catId = catRes.rows[0].category_id;
    
    // Find all products in this category that don't have images
    const deletedProducts = await client.query(`
      DELETE FROM product p 
      WHERE category_id = $1 
      AND NOT EXISTS (
        SELECT 1 FROM product_variant pv 
        JOIN product_image pi ON pi.variant_id = pv.variant_id 
        WHERE pv.product_id = p.product_id
      )
    `, [catId]);
    
    console.log('Deleted ' + deletedProducts.rowCount + ' products without images.');
    
    const countRes = await client.query('SELECT COUNT(*) as count FROM product WHERE category_id = $1', [catId]);
    console.log('Remaining Wall Hangings products: ' + countRes.rows[0].count);
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
