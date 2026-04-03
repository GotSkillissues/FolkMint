const { Client } = require('pg');
require('dotenv').config();

async function updateOrders() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'folkmint',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log('Connected. Confirming all pending orders and payments...');
    
    // Update all BKASH or COD pending payments to completed
    await client.query("UPDATE payment SET status = 'completed' WHERE status = 'pending'");
    
    // Update all pending orders to confirmed
    await client.query("UPDATE orders SET status = 'confirmed' WHERE status = 'pending'");
    
    console.log('Update complete!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

updateOrders();
