const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { pool } = require('../src/config/database');

const INPUT_PATH =
  process.argv[2] ||
  path.join(__dirname, 'output', 'aarong_vases.json');

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
};

const toColor = (value) => safeText(value || 'Mixed', 'Mixed').slice(0, 20);

const toSize = (sizes) => {
  if (!Array.isArray(sizes) || sizes.length === 0) return 'One Size';
  return safeText(sizes[0] || 'One Size', 'One Size').slice(0, 20);
};

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

async function ensureHomeDecorRoot(client) {
  const existing = await client.query(
    `SELECT category_id, name
       FROM category
      WHERE parent_category IS NULL
        AND (
          LOWER(name) = LOWER('Home Decor')
          OR LOWER(name) = LOWER('Home Decor / Showpieces')
        )
      ORDER BY CASE
        WHEN LOWER(name) = LOWER('Home Decor') THEN 0
        ELSE 1
      END,
      category_id ASC
      LIMIT 1`
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].category_id;
  }

  const created = await client.query(
    `INSERT INTO category (name, description, parent_category)
     VALUES ($1, $2, NULL)
     RETURNING category_id`,
    ['Home Decor', 'Home decor and decorative accessories']
  );

  return created.rows[0].category_id;
}

async function upsertVaseItem(client, vasesCategoryId, item) {
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
  const size = toSize(item.sizes);
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
      [productName, description, vasesCategoryId, productId]
    );

    await client.query(
      `UPDATE product_variant
          SET variant_name = $1,
              size = $2,
              color = $3,
              price = $4,
              stock_quantity = $5,
              updated_at = NOW()
        WHERE variant_id = $6`,
      [productName, size, color, price, stockQuantity, variantId]
    );

    return { action: 'updated' };
  }

  const createdProduct = await client.query(
    `INSERT INTO product (name, description, base_price, stock_quantity, category_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING product_id`,
    [productName, description, price, stockQuantity, vasesCategoryId]
  );

  const productId = createdProduct.rows[0].product_id;

  await client.query(
    `INSERT INTO product_variant (
      variant_name, sku, size, color, price, price_modifier, stock_quantity, product_id
    ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
    [productName, sku, size, color, price, stockQuantity, productId]
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
    throw new Error('Input JSON must be a non-empty array of vase products.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const homeDecorCategoryId = await ensureHomeDecorRoot(client);

    const vasesCategoryId = await ensureCategory(
      client,
      'Vases',
      'Decorative and artisan vases',
      homeDecorCategoryId
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const result = await upsertVaseItem(client, vasesCategoryId, item);
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
      [vasesCategoryId]
    );

    console.log('Vases import completed.');
    console.log(`Category ID: ${vasesCategoryId}`);
    console.log(`Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
    console.log('Latest vase products:');
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
  console.error('Vases import failed:', error.message);
  process.exit(1);
});
