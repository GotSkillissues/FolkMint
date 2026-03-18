#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OLD_BASE = 'women/saree/jamdani';
const NEW_BASE = 'Bangladesh/Women/Saree/Jamdani Saree';
const NEW_BASE_ENCODED = 'Bangladesh/Women/Saree/Jamdani%20Saree';

const FILES_TO_SYNC = [
  path.join(__dirname, 'output', 'jamdani-cloudinary-upload-map.json'),
  path.join(__dirname, '..', '..', 'Frontend', 'vite-project', 'src', 'data', 'jamdani-sarees.json'),
];

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceInValue = (value) => {
  if (typeof value !== 'string') return value;

  let result = value;
  result = result.replace(new RegExp(escapeRegExp(OLD_BASE), 'g'), NEW_BASE);
  result = result.replace(new RegExp(escapeRegExp(NEW_BASE), 'g'), NEW_BASE);

  if (result.startsWith('http://') || result.startsWith('https://')) {
    result = result.replace(new RegExp(escapeRegExp(NEW_BASE), 'g'), NEW_BASE_ENCODED);
  }

  return result;
};

const walkAndReplace = (node) => {
  if (Array.isArray(node)) {
    return node.map(walkAndReplace);
  }

  if (!node || typeof node !== 'object') {
    return replaceInValue(node);
  }

  const output = {};
  for (const [key, value] of Object.entries(node)) {
    output[key] = walkAndReplace(value);
  }

  return output;
};

const syncJsonFiles = async () => {
  for (const filePath of FILES_TO_SYNC) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const updated = walkAndReplace(parsed);
    await fs.writeFile(filePath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    console.log(`Synced file: ${path.relative(path.join(__dirname, '..', '..'), filePath)}`);
  }
};

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'folkmint',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const syncDatabase = async () => {
  const client = await pool.connect();

  try {
    const columnsResult = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text', 'character varying')
    `);

    const columnsToUpdate = [];
    for (const row of columnsResult.rows) {
      const tableName = row.table_name;
      const columnName = row.column_name;

      const countResult = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${tableName} WHERE ${columnName} ILIKE $1`,
        [`%${OLD_BASE}%`]
      );

      const count = countResult.rows[0]?.count || 0;
      if (count > 0) {
        columnsToUpdate.push({ tableName, columnName, count });
      }
    }

    for (const { tableName, columnName, count } of columnsToUpdate) {
      await client.query(
        `UPDATE ${tableName} SET ${columnName} = REPLACE(${columnName}, $1, $2) WHERE ${columnName} LIKE $3`,
        [OLD_BASE, NEW_BASE_ENCODED, `%${OLD_BASE}%`]
      );

      console.log(`Updated DB: ${tableName}.${columnName} (${count} rows)`);
    }

    if (!columnsToUpdate.length) {
      console.log('No DB rows needed updates.');
    }
  } finally {
    client.release();
  }
};

const run = async () => {
  await syncJsonFiles();
  await syncDatabase();
  await pool.end();
  console.log('Jamdani path sync complete.');
};

run().catch(async (error) => {
  console.error(error?.message || error);
  await pool.end();
  process.exit(1);
});
