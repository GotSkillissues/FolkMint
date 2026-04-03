const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runSeed() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    const seedPath = path.join(__dirname, 'aarong_bags_decor_seed.sql');
    const seedSql = await fs.readFile(seedPath, 'utf8');

    await client.connect();
    console.log('Connected to database. Applying Aarong product seed...');
    await client.query(seedSql);

    console.log('Aarong product seed applied successfully!');
  } catch (error) {
    console.error('Failed to apply Aarong seed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => { });
  }
}

runSeed();
