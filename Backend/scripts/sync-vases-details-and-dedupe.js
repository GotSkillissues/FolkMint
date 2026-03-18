const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const INPUT_PATH = process.argv[2] || path.join(__dirname, 'output', 'aarong_vases.json');

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const prettyLabel = (key) =>
  String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const buildDescription = (item) => {
  const base = String(item?.descriptions || item?.description || '').trim();
  const specs = item?.specifications && typeof item.specifications === 'object' ? item.specifications : {};
  const sizes = Array.isArray(item?.sizes) ? item.sizes.map((s) => String(s || '').trim()).filter(Boolean) : [];

  const specLines = Object.entries(specs)
    .filter(([, value]) => String(value || '').trim().length > 0)
    .map(([key, value]) => `- ${prettyLabel(key)}: ${String(value).trim()}`);

  const sections = [base];
  if (specLines.length > 0) {
    sections.push(`Specifications:\n${specLines.join('\n')}`);
  }
  if (sizes.length > 0) {
    sections.push(`Sizes: ${sizes.join(', ')}`);
  }

  return sections.filter(Boolean).join('\n\n').trim();
};

async function run() {
  const inputFile = path.resolve(INPUT_PATH);
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input JSON not found: ${inputFile}`);
  }

  const raw = fs.readFileSync(inputFile, 'utf8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Input JSON must be a non-empty array.');
  }

  const bySku = new Map();
  for (const item of items) {
    const sku = String(item?.product_code || '').trim();
    if (!sku) continue;
    bySku.set(sku, item);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const rows = await client.query(
      `SELECT p.product_id, p.name, p.description, pv.variant_id, pv.sku,
              (SELECT COUNT(*)::int FROM product_image pi WHERE pi.variant_id = pv.variant_id) AS image_count
         FROM product p
         JOIN category c ON c.category_id = p.category_id
         JOIN product_variant pv ON pv.product_id = p.product_id
        WHERE LOWER(c.name) = LOWER('Vases')`
    );

    let detailUpdates = 0;

    for (const row of rows.rows) {
      const sku = String(row.sku || '').trim();
      if (!sku || !bySku.has(sku)) continue;

      const item = bySku.get(sku);
      const nextName = String(item.product_name || row.name || '').trim().slice(0, 100);
      const nextDescription = buildDescription(item);
      const specs = item?.specifications && typeof item.specifications === 'object' ? item.specifications : {};
      const nextColor = String(specs.colour || row.color || 'Mixed').trim().slice(0, 20) || 'Mixed';
      const nextSize = Array.isArray(item?.sizes) && item.sizes.length > 0
        ? String(item.sizes[0] || 'One Size').trim().slice(0, 20)
        : 'One Size';

      await client.query(
        `UPDATE product
            SET name = $1,
                description = $2,
                updated_at = NOW()
          WHERE product_id = $3`,
        [nextName, nextDescription, row.product_id]
      );

      await client.query(
        `UPDATE product_variant
            SET variant_name = $1,
                color = $2,
                size = $3,
                updated_at = NOW()
          WHERE variant_id = $4`,
        [nextName, nextColor, nextSize, row.variant_id]
      );

      detailUpdates += 1;
    }

    const dedupeRows = await client.query(
      `SELECT p.product_id, p.name, p.description, pv.sku,
              (SELECT COUNT(*)::int FROM product_image pi WHERE pi.variant_id = pv.variant_id) AS image_count
         FROM product p
         JOIN category c ON c.category_id = p.category_id
         JOIN product_variant pv ON pv.product_id = p.product_id
        WHERE LOWER(c.name) = LOWER('Vases')
        ORDER BY p.product_id DESC`
    );

    const grouped = new Map();
    for (const row of dedupeRows.rows) {
      const key = normalizeName(row.name);
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }

    let deletedProducts = 0;

    for (const [, group] of grouped.entries()) {
      if (group.length <= 1) continue;

      const sorted = [...group].sort((a, b) => {
        const aUnknown = String(a.sku || '').toUpperCase().startsWith('UNKNOWN-') ? 1 : 0;
        const bUnknown = String(b.sku || '').toUpperCase().startsWith('UNKNOWN-') ? 1 : 0;
        if (aUnknown !== bUnknown) return aUnknown - bUnknown;

        const aImages = Number(a.image_count || 0);
        const bImages = Number(b.image_count || 0);
        if (aImages !== bImages) return bImages - aImages;

        const aDescLen = String(a.description || '').length;
        const bDescLen = String(b.description || '').length;
        if (aDescLen !== bDescLen) return bDescLen - aDescLen;

        return Number(a.product_id) - Number(b.product_id);
      });

      const keep = sorted[0];
      const toDelete = sorted.slice(1);

      for (const item of toDelete) {
        const del = await client.query(
          `DELETE FROM product WHERE product_id = $1`,
          [item.product_id]
        );
        deletedProducts += del.rowCount || 0;
      }

      console.log(`Deduped '${keep.name}': kept product_id=${keep.product_id}, deleted=${toDelete.map((x) => x.product_id).join(', ')}`);
    }

    await client.query('COMMIT');

    const final = await client.query(
      `SELECT COUNT(*)::int AS total
         FROM product p
         JOIN category c ON c.category_id = p.category_id
        WHERE LOWER(c.name) = LOWER('Vases')`
    );

    console.log('Vases detail sync and dedupe completed.');
    console.log(`Products updated from JSON: ${detailUpdates}`);
    console.log(`Products deleted as duplicates: ${deletedProducts}`);
    console.log(`Final vases product count: ${final.rows[0].total}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Vases sync/dedupe failed:', error.message);
  process.exit(1);
});
