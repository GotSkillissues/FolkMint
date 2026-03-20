const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'folkmint',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    const schemaPath = path.join(__dirname, 'FolkMint.schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');

    await client.connect();
    await client.query(schemaSql);

    console.log('Schema applied successfully from FolkMint.schema.sql');
  } catch (error) {
    console.error('Failed to apply schema:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

runSchema();
