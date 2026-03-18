const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MAP_PATH = path.join(__dirname, 'output', 'plates-platters-cloudinary-upload-map.json');

async function run() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'folkmint',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const q1 = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM product p
         JOIN category c ON c.category_id = p.category_id
         JOIN category d ON d.category_id = c.parent_category
         JOIN category h ON h.category_id = d.parent_category
        WHERE LOWER(c.name) = LOWER('Plates & Platters')
          AND LOWER(d.name) = LOWER('Dining')
          AND LOWER(h.name) = LOWER('Home Decor')`
    );

    const q2 = await pool.query(
      `SELECT COUNT(DISTINCT pv.variant_id)::int AS variants_with_images,
              COUNT(DISTINCT p.product_id)::int AS products_with_images,
              COUNT(*)::int AS total_images
         FROM product p
         JOIN category c ON c.category_id = p.category_id
         JOIN category d ON d.category_id = c.parent_category
         JOIN category h ON h.category_id = d.parent_category
         JOIN product_variant pv ON pv.product_id = p.product_id
         JOIN product_image pi ON pi.variant_id = pv.variant_id
        WHERE LOWER(c.name) = LOWER('Plates & Platters')
          AND LOWER(d.name) = LOWER('Dining')
          AND LOWER(h.name) = LOWER('Home Decor')`
    );

    const q3 = await pool.query(
      `SELECT p.name, pv.sku, LEFT(COALESCE(p.description, ''), 220) AS description_head
         FROM product p
         JOIN product_variant pv ON pv.product_id = p.product_id
         JOIN category c ON c.category_id = p.category_id
         JOIN category d ON d.category_id = c.parent_category
         JOIN category h ON h.category_id = d.parent_category
        WHERE LOWER(c.name) = LOWER('Plates & Platters')
          AND LOWER(d.name) = LOWER('Dining')
          AND LOWER(h.name) = LOWER('Home Decor')
          AND pv.sku = '0920000004011'
        LIMIT 1`
    );

    let mapRows = null;
    let mapSample = null;
    let mapStatusCounts = null;

    if (fs.existsSync(MAP_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
      mapRows = Array.isArray(parsed) ? parsed.length : null;
      mapSample = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : parsed;

      if (!Array.isArray(parsed) && Array.isArray(parsed?.results)) {
        mapRows = parsed.results.length;
        mapSample = parsed.results[0] || null;
        mapStatusCounts = parsed.results.reduce((acc, row) => {
          const key = String(row?.status || 'unknown');
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
      }
    }

    console.log('total_products', q1.rows[0].total);
    console.log('image_stats', q2.rows[0]);
    console.log('sample_detail', q3.rows[0] || null);
    console.log('upload_map_rows', mapRows);
    console.log('upload_map_status_counts', mapStatusCounts);
    console.log('upload_map_sample', mapSample);
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error('State verification failed:', error.message);
  process.exit(1);
});
