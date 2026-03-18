const { pool } = require('../src/config/database');

const FALLBACK_IMAGE_URL =
  'https://res.cloudinary.com/dn3rwh1x6/image/upload/v1773785788/folkmint/product/bangladesh/women/dupatta/yellowaqua-blue-dual-tone-cotton-dupatta-0450000017297/thumb.jpg';

const OWNER_SKU = '0450000017297';

async function run() {
  const targets = await pool.query(
    `SELECT
       p.product_id,
       p.name,
       pv.sku,
       COUNT(pi.image_id)::int AS image_count,
       COUNT(DISTINCT pi.image_url)::int AS distinct_url_count,
       MIN(pi.image_url) AS only_url
     FROM product p
     JOIN category c ON c.category_id = p.category_id
     JOIN product_variant pv ON pv.product_id = p.product_id
     LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
     WHERE LOWER(c.name) = LOWER('Dupatta')
     GROUP BY p.product_id, p.name, pv.sku
     HAVING COUNT(pi.image_id) >= 1
        AND COUNT(DISTINCT pi.image_url) = 1
        AND MIN(pi.image_url) = $1
        AND COALESCE(MAX(pv.sku), '') <> $2
     ORDER BY p.product_id`,
    [FALLBACK_IMAGE_URL, OWNER_SKU]
  );

  if (targets.rows.length === 0) {
    console.log('No fallback-only dupatta products found. Nothing deleted.');
    return;
  }

  const ids = targets.rows.map((row) => row.product_id);

  await pool.query('BEGIN');
  try {
    const deleted = await pool.query(
      `DELETE FROM product
       WHERE product_id = ANY($1::int[])
       RETURNING product_id, name`,
      [ids]
    );

    await pool.query('COMMIT');

    console.log(`Deleted ${deleted.rowCount} fallback-only dupatta products:`);
    for (const row of deleted.rows) {
      console.log(`- [${row.product_id}] ${row.name}`);
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

run()
  .catch((error) => {
    console.error('Delete fallback products failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
