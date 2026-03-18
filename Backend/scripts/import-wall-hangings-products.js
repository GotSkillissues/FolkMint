#!/usr/bin/env node
/**
 * import-wall-hangings-products.js
 * Reads aarong_wall_hangings_listing.json and upserts products+variants
 * into the FolkMint DB under Home Decor > Decor > Wall Hangings.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { pool } = require('../src/config/database');

const INPUT_PATH =
  process.argv[2] ||
  path.join(__dirname, 'output', 'aarong_wall_hangings_listing.json');

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
};

const safeSku = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // DB column is varchar(50) — truncate at 50 chars
  return raw.slice(0, 50);
};

const toPrice = (value) => {
  const cleaned = String(value || '').replace(/[^0-9.]/g, '');
  const num = Number(cleaned);
  if (Number.isFinite(num) && num >= 0) return num;
  return 0;
};

// ──────────────────────────────────────────────
// Category helpers
// ──────────────────────────────────────────────

async function ensureCategory(client, name, description, parentId = null) {
  const existing = await client.query(
    `SELECT category_id FROM category
      WHERE LOWER(name) = LOWER($1)
        AND parent_category IS NOT DISTINCT FROM $2
      LIMIT 1`,
    [name, parentId]
  );
  if (existing.rows.length > 0) return existing.rows[0].category_id;

  const inserted = await client.query(
    `INSERT INTO category (name, description, parent_category)
     VALUES ($1, $2, $3) RETURNING category_id`,
    [name, description, parentId]
  );
  return inserted.rows[0].category_id;
}

async function ensureHomeDecorRoot(client) {
  const existing = await client.query(
    `SELECT category_id FROM category
      WHERE parent_category IS NULL
        AND (
          LOWER(name) = LOWER('Home Decor')
          OR LOWER(name) = LOWER('Home Decor / Showpieces')
        )
      ORDER BY CASE WHEN LOWER(name) = LOWER('Home Decor') THEN 0 ELSE 1 END,
               category_id ASC
      LIMIT 1`
  );
  if (existing.rows.length > 0) return existing.rows[0].category_id;

  const created = await client.query(
    `INSERT INTO category (name, description, parent_category)
     VALUES ($1, $2, NULL) RETURNING category_id`,
    ['Home Decor', 'Home decor and decorative accessories']
  );
  return created.rows[0].category_id;
}

// ──────────────────────────────────────────────
// Product upsert
// ──────────────────────────────────────────────

async function upsertProduct(client, categoryId, item) {
  const productName = safeText(item.product_name || item.name);
  const sku = safeSku(item.product_code || item.sku);
  const description = safeText(item.descriptions || item.description || productName);
  const price = toPrice(item.listing_price_bdt || item.price);
  const stockQuantity = 10;

  if (!productName || !sku) return { action: 'skipped' };

  // Check if variant with this SKU already exists
  const existingVariant = await client.query(
    `SELECT pv.variant_id, pv.product_id FROM product_variant pv WHERE pv.sku = $1 LIMIT 1`,
    [sku]
  );

  if (existingVariant.rows.length > 0) {
    const { variant_id: variantId, product_id: productId } = existingVariant.rows[0];

    await client.query(
      `UPDATE product SET name = $1, description = $2, category_id = $3, updated_at = NOW()
       WHERE product_id = $4`,
      [productName, description, categoryId, productId]
    );

    await client.query(
      `UPDATE product_variant
         SET variant_name = $1, price = $2, stock_quantity = $3, updated_at = NOW()
       WHERE variant_id = $4`,
      [productName, price, stockQuantity, variantId]
    );

    return { action: 'updated' };
  }

  // Insert new product
  const created = await client.query(
    `INSERT INTO product (name, description, base_price, stock_quantity, category_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING product_id`,
    [productName, description, price, stockQuantity, categoryId]
  );
  const productId = created.rows[0].product_id;

  await client.query(
    `INSERT INTO product_variant
      (variant_name, sku, size, color, price, price_modifier, stock_quantity, product_id)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
    [productName, sku, 'One Size', 'As listed', price, stockQuantity, productId]
  );

  return { action: 'inserted' };
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function run() {
  const inputFile = path.resolve(INPUT_PATH);

  if (!fs.existsSync(inputFile)) {
    throw new Error(`JSON file not found: ${inputFile}`);
  }

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const items = JSON.parse(raw);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Input JSON must be a non-empty array of wall hangings products.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const homeDecorId = await ensureHomeDecorRoot(client);
    const decorId = await ensureCategory(
      client,
      'Decor',
      'Decorative home accessories',
      homeDecorId
    );
    const wallHangingsId = await ensureCategory(
      client,
      'Wall Hangings',
      'Handcrafted and artisan wall hangings',
      decorId
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const result = await upsertProduct(client, wallHangingsId, item);
      if (result.action === 'inserted') inserted += 1;
      if (result.action === 'updated') updated += 1;
      if (result.action === 'skipped') skipped += 1;
    }

    await client.query('COMMIT');

    // Verification query
    const verify = await client.query(
      `SELECT c.name AS category_name, p.product_id, p.name, pv.sku
         FROM product p
         JOIN category c ON c.category_id = p.category_id
         LEFT JOIN product_variant pv ON pv.product_id = p.product_id
        WHERE c.category_id = $1
        ORDER BY p.product_id DESC
        LIMIT 5`,
      [wallHangingsId]
    );

    console.log('Wall Hangings product import completed.');
    console.log(`Category IDs: Home Decor=${homeDecorId}, Decor=${decorId}, Wall Hangings=${wallHangingsId}`);
    console.log(`Inserted: ${inserted}  Updated: ${updated}  Skipped: ${skipped}`);
    console.log('Sample products:');
    for (const row of verify.rows) {
      console.log(`  [${row.product_id}] ${row.name} (SKU: ${row.sku || 'n/a'})`);
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
  console.error('Wall Hangings import failed:', error.message);
  process.exit(1);
});
