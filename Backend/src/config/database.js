// Database configuration
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'folkmint',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'hqhq',
});

// Test database connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✓ PostgreSQL Database connected successfully');
    console.log(`✓ Connected to database: ${client.database}`);
    client.release();
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { connectDB, pool };
