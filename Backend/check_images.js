const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'folkmint',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT p.name, pi.image_url, pi.is_primary 
      FROM product p 
      LEFT JOIN product_image pi ON p.product_id = pi.product_id 
      WHERE p.sku LIKE 'MN-PAN-%' 
      LIMIT 1
    `);
    console.log('Product Check:', JSON.stringify(result.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
