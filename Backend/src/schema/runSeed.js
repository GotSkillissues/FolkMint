const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const runSeed = async () => {
  try {
    console.log('📂 Reading seed file...');
    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    console.log('🌱 Running seed file...');
    await pool.query(seedSQL);
    
    console.log('✓ Seed data loaded successfully!');
    
    // Display summary
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const categoryCount = await pool.query('SELECT COUNT(*) FROM category');
    const productCount = await pool.query('SELECT COUNT(*) FROM product');
    const variantCount = await pool.query('SELECT COUNT(*) FROM product_variant');
    const orderCount = await pool.query('SELECT COUNT(*) FROM orders');
    const reviewCount = await pool.query('SELECT COUNT(*) FROM review');
    
    console.log('\n📊 Database Summary:');
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Categories: ${categoryCount.rows[0].count}`);
    console.log(`   Products: ${productCount.rows[0].count}`);
    console.log(`   Product Variants: ${variantCount.rows[0].count}`);
    console.log(`   Orders: ${orderCount.rows[0].count}`);
    console.log(`   Reviews: ${reviewCount.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error running seed file:', error.message);
    console.error(error);
    process.exit(1);
  }
};

runSeed();
