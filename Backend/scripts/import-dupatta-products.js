const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { pool } = require('../src/config/database');

const INPUT_PATH = process.argv[2] || 'C:/Users/Mahi/Downloads/aarong_dupatta.json';

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
};

const toColor = (value) => safeText(value || 'Mixed', 'Mixed').slice(0, 20);

const toPrice = (value) => {
  const num = Number(value);
  if (Number.isFinite(num) && num >= 0) return num;
  return 0;
};

async function ensureCategory(client, name, description, parentId = null) {
  const existing = await client.query(
    'SELECT category_id FROM category WHERE LOWER(name) = LOWER($1) AND parent_category IS NOT DISTINCT FROM $2 LIMIT 1',
    [name, parentId]
  );

  if (existing.rows.length > 0) return existing.rows[0].category_id;

  const inserted = await client.query(
    'INSERT INTO category (name, description, parent_category) VALUES ($1, $2, $3) RETURNING category_id',
    [name, description, parentId]
  );

  return inserted.rows[0].category_id;
}

async function upsertDupattaItem(client, dupattaCategoryId, item) {
  const productName = safeText(item.product_name);
  const sku = safeText(item.product_code);
  const description = safeText(item.descriptions || item.description);
  const specs = item.specifications || {};

  if (!productName || !sku) {
    return { action: 'skipped' };
  }

  const variantBySku = await client.query(
    `SELECT pv.variant_id, pv.product_id
       FROM product_variant pv
      WHERE pv.sku = $1
      LIMIT 1`,
    [sku]
  );

  const color = toColor(specs.colour);
  const price = toPrice(item.price);
  const stockQuantity = Number.isFinite(Number(item.stock_quantity))
    ? Math.max(0, Number(item.stock_quantity))
    : 10;

  if (variantBySku.rows.length > 0) {
    const { variant_id: variantId, product_id: productId } = variantBySku.rows[0];

    await client.query(
      `UPDATE product
          SET name = $1,
              description = $2,
              category_id = $3,
              updated_at = NOW()
        WHERE product_id = $4`,
      [productName, description, dupattaCategoryId, productId]
    );

    await client.query(
      `UPDATE product_variant
          SET variant_name = $1,
              size = COALESCE(size, 'One Size'),
              color = $2,
              price = $3,
              stock_quantity = $4,
              updated_at = NOW()
        WHERE variant_id = $5`,
      [productName, color, price, stockQuantity, variantId]
    );

    return { action: 'updated' };
  }

  const createdProduct = await client.query(
    `INSERT INTO product (name, description, base_price, stock_quantity, category_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING product_id`,
    [productName, description, price, stockQuantity, dupattaCategoryId]
  );

  const productId = createdProduct.rows[0].product_id;

  await client.query(
    `INSERT INTO product_variant (
      variant_name, sku, size, color, price, price_modifier, stock_quantity, product_id
    ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
    [productName, sku, 'One Size', color, price, stockQuantity, productId]
  );

  return { action: 'inserted' };
}

async function run() {
  const inputFile = path.resolve(INPUT_PATH);

  if (!fs.existsSync(inputFile)) {
    throw new Error(`JSON file not found: ${inputFile}`);
  }

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const items = JSON.parse(raw);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Input JSON must be a non-empty array of dupatta products.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const womenCategoryId = await ensureCategory(
      client,
      'Women',
      "Women's fashion and apparel",
      null
    );

    const dupattaCategoryId = await ensureCategory(
      client,
      'Dupatta',
      "Women's dupatta and orna collection",
      womenCategoryId
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const result = await upsertDupattaItem(client, dupattaCategoryId, item);
      if (result.action === 'inserted') inserted += 1;
      if (result.action === 'updated') updated += 1;
      if (result.action === 'skipped') skipped += 1;
    }

    await client.query('COMMIT');

    const verify = await client.query(
      `SELECT c.name AS category_name, p.product_id, p.name, pv.sku
         FROM product p
         JOIN category c ON c.category_id = p.category_id
         LEFT JOIN product_variant pv ON pv.product_id = p.product_id
        WHERE c.category_id = $1
        ORDER BY p.product_id DESC
        LIMIT 5`,
      [dupattaCategoryId]
    );

    console.log('Dupatta import completed.');
    console.log(`Category ID: ${dupattaCategoryId}`);
    console.log(`Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
    console.log('Latest dupatta products:');
    for (const row of verify.rows) {
      console.log(`- [${row.product_id}] ${row.name} (SKU: ${row.sku || 'n/a'})`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Dupatta import failed:', error.message);
  process.exit(1);
});
