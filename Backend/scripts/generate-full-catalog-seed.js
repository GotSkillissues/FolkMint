const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const outPath = path.resolve(__dirname, '../../FolkMint.products.seed.sql');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const q = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).replace(/'/g, "''")}'`;
};

async function run() {
  const client = await pool.connect();

  try {
    const categories = (
      await client.query(
        `SELECT category_id, name, description, parent_category
           FROM category
          ORDER BY category_id`
      )
    ).rows;

    const products = (
      await client.query(
        `SELECT product_id, name, description, base_price, stock_quantity, category_id, created_at, updated_at
           FROM product
          ORDER BY product_id`
      )
    ).rows;

    const variants = (
      await client.query(
        `SELECT variant_id, variant_name, sku, size, color, price, price_modifier, stock_quantity, product_id, created_at, updated_at
           FROM product_variant
          ORDER BY variant_id`
      )
    ).rows;

    const images = (
      await client.query(
        `SELECT image_id, image_url, is_primary, variant_id
           FROM product_image
          ORDER BY image_id`
      )
    ).rows;

    const lines = [];
    lines.push('-- FolkMint full catalog seed generated from live DB');
    lines.push(`-- Generated at: ${new Date().toISOString()}`);
    lines.push(
      `-- Counts: categories=${categories.length}, products=${products.length}, variants=${variants.length}, images=${images.length}`
    );
    lines.push('BEGIN;');
    lines.push('');
    lines.push('-- Optional cleanup (uncomment for full reseed)');
    lines.push('-- DELETE FROM product_image;');
    lines.push('-- DELETE FROM product_variant;');
    lines.push('-- DELETE FROM product;');
    lines.push('-- DELETE FROM category WHERE category_id >= 1;');
    lines.push('');

    lines.push('-- Categories');
    for (const c of categories) {
      lines.push(
        `INSERT INTO category (category_id, name, description, parent_category) VALUES (${q(c.category_id)}, ${q(c.name)}, ${q(c.description)}, ${q(c.parent_category)}) ON CONFLICT (category_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_category = EXCLUDED.parent_category;`
      );
    }

    lines.push('');
    lines.push('-- Products');
    for (const p of products) {
      lines.push(
        `INSERT INTO product (product_id, name, description, base_price, stock_quantity, category_id, created_at, updated_at) VALUES (${q(p.product_id)}, ${q(p.name)}, ${q(p.description)}, ${q(p.base_price)}, ${q(p.stock_quantity)}, ${q(p.category_id)}, ${q(p.created_at)}, ${q(p.updated_at)}) ON CONFLICT (product_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, base_price = EXCLUDED.base_price, stock_quantity = EXCLUDED.stock_quantity, category_id = EXCLUDED.category_id, created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at;`
      );
    }

    lines.push('');
    lines.push('-- Product variants');
    for (const v of variants) {
      lines.push(
        `INSERT INTO product_variant (variant_id, variant_name, sku, size, color, price, price_modifier, stock_quantity, product_id, created_at, updated_at) VALUES (${q(v.variant_id)}, ${q(v.variant_name)}, ${q(v.sku)}, ${q(v.size)}, ${q(v.color)}, ${q(v.price)}, ${q(v.price_modifier)}, ${q(v.stock_quantity)}, ${q(v.product_id)}, ${q(v.created_at)}, ${q(v.updated_at)}) ON CONFLICT (variant_id) DO UPDATE SET variant_name = EXCLUDED.variant_name, sku = EXCLUDED.sku, size = EXCLUDED.size, color = EXCLUDED.color, price = EXCLUDED.price, price_modifier = EXCLUDED.price_modifier, stock_quantity = EXCLUDED.stock_quantity, product_id = EXCLUDED.product_id, created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at;`
      );
    }

    lines.push('');
    lines.push('-- Product images');
    for (const i of images) {
      lines.push(
        `INSERT INTO product_image (image_id, image_url, is_primary, variant_id) VALUES (${q(i.image_id)}, ${q(i.image_url)}, ${q(i.is_primary)}, ${q(i.variant_id)}) ON CONFLICT (image_id) DO UPDATE SET image_url = EXCLUDED.image_url, is_primary = EXCLUDED.is_primary, variant_id = EXCLUDED.variant_id;`
      );
    }

    lines.push('');
    lines.push('-- Sequence alignment');
    lines.push("SELECT setval('category_category_id_seq', COALESCE((SELECT MAX(category_id) FROM category), 1), true);");
    lines.push("SELECT setval('product_product_id_seq', COALESCE((SELECT MAX(product_id) FROM product), 1), true);");
    lines.push("SELECT setval('product_variant_variant_id_seq', COALESCE((SELECT MAX(variant_id) FROM product_variant), 1), true);");
    lines.push("SELECT setval('product_image_image_id_seq', COALESCE((SELECT MAX(image_id) FROM product_image), 1), true);");
    lines.push('');
    lines.push('COMMIT;');

    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

    console.log(`Seed file written: ${outPath}`);
    console.log(
      `Counts => categories: ${categories.length}, products: ${products.length}, variants: ${variants.length}, images: ${images.length}`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Seed generation failed:', error.message);
  process.exit(1);
});
