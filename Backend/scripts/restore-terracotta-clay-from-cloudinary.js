#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { pool } = require('../src/config/database');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const CLOUDINARY_PREFIX =
  process.env.TERRACOTTA_CLAY_PREFIX ||
  'folkmint/product/bangladesh/home-decor-showpieces/terracotta-clay-crafts';

const OUTPUT_PATH = path.join(__dirname, 'output', 'terracotta-clay-restore-map.json');

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const toTitle = (slug) =>
  String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();

const looksLikeCode = (value) => /^\d{10,}$/.test(String(value || '').trim());

const codeFromBaseKey = (baseKey) => {
  const value = String(baseKey || '').trim();
  const trailing = value.match(/([0-9]{10,})$/);
  if (trailing) return trailing[1];
  if (looksLikeCode(value)) return value;
  return '';
};

const buildSku = (baseKey, code) => {
  if (code) return code;
  const normalized = slugify(baseKey).replace(/-/g, '').slice(0, 40).toUpperCase();
  return `CLAY-${normalized || 'ITEM'}`;
};

const isPrimaryAsset = (publicId) => /\/thumb$/i.test(publicId);

const listResourcesByPrefix = async (prefix) => {
  const resources = [];
  let nextCursor;

  do {
    const response = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 500,
      next_cursor: nextCursor,
    });

    if (Array.isArray(response.resources)) {
      resources.push(...response.resources);
    }

    nextCursor = response.next_cursor;
  } while (nextCursor);

  return resources;
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
    `SELECT category_id
       FROM category
      WHERE parent_category IS NULL
        AND (LOWER(name) = LOWER('Home Decor') OR LOWER(name) = LOWER('Home Decor / Showpieces'))
      ORDER BY CASE WHEN LOWER(name) = LOWER('Home Decor') THEN 0 ELSE 1 END, category_id ASC
      LIMIT 1`
  );

  if (existing.rows.length > 0) return existing.rows[0].category_id;

  const created = await client.query(
    `INSERT INTO category (name, description, parent_category)
     VALUES ($1, $2, NULL)
     RETURNING category_id`,
    ['Home Decor', 'Home decor and decorative accessories']
  );

  return created.rows[0].category_id;
}

async function upsertProductAndVariant(client, item) {
  const variantBySku = await client.query(
    `SELECT pv.variant_id, pv.product_id
       FROM product_variant pv
      WHERE pv.sku = $1
      LIMIT 1`,
    [item.sku]
  );

  if (variantBySku.rows.length > 0) {
    const { variant_id: variantId, product_id: productId } = variantBySku.rows[0];

    await client.query(
      `UPDATE product
          SET name = $1,
              description = $2,
              category_id = $3,
              updated_at = NOW()
        WHERE product_id = $4`,
      [item.productName, item.description, item.categoryId, productId]
    );

    await client.query(
      `UPDATE product_variant
          SET variant_name = $1,
              size = COALESCE(size, 'One Size'),
              color = COALESCE(color, 'Mixed'),
              price = COALESCE(NULLIF(price, 0), 0),
              stock_quantity = GREATEST(stock_quantity, 10),
              updated_at = NOW()
        WHERE variant_id = $2`,
      [item.productName, variantId]
    );

    return { action: 'updated', variantId, productId };
  }

  const createdProduct = await client.query(
    `INSERT INTO product (name, description, base_price, stock_quantity, category_id)
     VALUES ($1, $2, 0, 10, $3)
     RETURNING product_id`,
    [item.productName, item.description, item.categoryId]
  );

  const productId = createdProduct.rows[0].product_id;

  const createdVariant = await client.query(
    `INSERT INTO product_variant (
      variant_name, sku, size, color, price, price_modifier, stock_quantity, product_id
    ) VALUES ($1, $2, 'One Size', 'Mixed', 0, 0, 10, $3)
    RETURNING variant_id`,
    [item.productName, item.sku, productId]
  );

  return { action: 'inserted', variantId: createdVariant.rows[0].variant_id, productId };
}

async function replaceVariantImages(client, variantId, imageUrls) {
  await client.query('DELETE FROM product_image WHERE variant_id = $1', [variantId]);

  for (let index = 0; index < imageUrls.length; index += 1) {
    await client.query(
      `INSERT INTO product_image (image_url, is_primary, variant_id)
       VALUES ($1, $2, $3)`,
      [imageUrls[index], index === 0, variantId]
    );
  }
}

async function run() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Missing Cloudinary credentials in Backend/.env');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const resources = await listResourcesByPrefix(CLOUDINARY_PREFIX);
  if (!resources.length) {
    throw new Error(`No Cloudinary assets found under prefix: ${CLOUDINARY_PREFIX}`);
  }

  const grouped = new Map();

  for (const resource of resources) {
    const publicId = String(resource.public_id || '');
    const secureUrl = String(resource.secure_url || '');
    if (!publicId || !secureUrl) continue;

    const parts = publicId.split('/');
    if (parts.length < 1) continue;

    const leaf = parts[parts.length - 1];
    const baseKey = leaf === 'thumb' || /^\d{2,}$/.test(leaf)
      ? parts[parts.length - 2]
      : leaf;

    if (!baseKey) continue;

    if (!grouped.has(baseKey)) {
      grouped.set(baseKey, []);
    }

    grouped.get(baseKey).push({
      publicId,
      secureUrl,
      isPrimary: isPrimaryAsset(publicId),
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const homeDecorId = await ensureHomeDecorRoot(client);
    const clayCraftsId = await ensureCategory(client, 'Clay Crafts', 'Traditional clay crafted items', homeDecorId);
    const terracottaId = await ensureCategory(client, 'Terracotta', 'Terracotta decor and craft collection', homeDecorId);

    let inserted = 0;
    let updated = 0;
    let linked = 0;
    const output = [];

    for (const [baseKey, assets] of grouped.entries()) {
      const code = codeFromBaseKey(baseKey);
      const sku = buildSku(baseKey, code);
      const productName = toTitle(baseKey).slice(0, 100) || `Clay Craft ${sku}`;
      const isTerracotta = /terracotta/i.test(baseKey) || /terracotta/i.test(productName);
      const categoryId = isTerracotta ? terracottaId : clayCraftsId;

      const description = isTerracotta
        ? 'Terracotta and clay craft item restored from uploaded catalog assets.'
        : 'Clay craft item restored from uploaded catalog assets.';

      const upserted = await upsertProductAndVariant(client, {
        sku,
        productName,
        description,
        categoryId,
      });

      if (upserted.action === 'inserted') inserted += 1;
      if (upserted.action === 'updated') updated += 1;

      const sortedAssets = [...assets].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.publicId.localeCompare(b.publicId);
      });

      const imageUrls = sortedAssets.map((entry) => entry.secureUrl);
      await replaceVariantImages(client, upserted.variantId, imageUrls);
      linked += 1;

      output.push({
        base_key: baseKey,
        sku,
        product_name: productName,
        category: isTerracotta ? 'Terracotta' : 'Clay Crafts',
        image_count: imageUrls.length,
        image_urls: imageUrls,
      });
    }

    await client.query('COMMIT');

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(
      OUTPUT_PATH,
      `${JSON.stringify({
        generated_at: new Date().toISOString(),
        prefix: CLOUDINARY_PREFIX,
        summary: { groups: grouped.size, inserted, updated, linked },
        products: output,
      }, null, 2)}\n`,
      'utf8'
    );

    console.log('Terracotta/Clay restore completed.');
    console.log(`Groups found: ${grouped.size}`);
    console.log(`Inserted: ${inserted}, Updated: ${updated}, Linked images: ${linked}`);
    console.log(`Output map: ${OUTPUT_PATH}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Terracotta/Clay restore failed:', error.message);
  process.exit(1);
});
