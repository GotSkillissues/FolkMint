const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runSeed() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'folkmint',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    const seedPath = path.join(__dirname, 'categories.seed.sql');
    const seedSql = await fs.readFile(seedPath, 'utf8');

    await client.connect();
    await client.query(seedSql);

    console.log('Category seed applied successfully from categories.seed.sql');
  } catch (error) {
    console.error('Failed to apply category seed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

runSeed();
