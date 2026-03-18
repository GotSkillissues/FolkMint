const { pool } = require('../src/config/database');

async function run() {
  const perProduct = await pool.query(`
    SELECT
      p.product_id,
      p.name,
      COALESCE(MAX(pv.sku), 'n/a') AS sku,
      COUNT(pi.image_id)::int AS image_count,
      COUNT(DISTINCT pi.image_url)::int AS distinct_urls,
      MIN(pi.image_url) AS sample_url
    FROM product p
    JOIN category c ON c.category_id = p.category_id
    LEFT JOIN product_variant pv ON pv.product_id = p.product_id
    LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
    WHERE LOWER(c.name) = LOWER('Dupatta')
    GROUP BY p.product_id, p.name
    ORDER BY p.product_id
  `);

  const commonUrls = await pool.query(`
    SELECT
      pi.image_url,
      COUNT(DISTINCT p.product_id)::int AS product_count
    FROM product_image pi
    JOIN product_variant pv ON pv.variant_id = pi.variant_id
    JOIN product p ON p.product_id = pv.product_id
    JOIN category c ON c.category_id = p.category_id
    WHERE LOWER(c.name) = LOWER('Dupatta')
    GROUP BY pi.image_url
    HAVING COUNT(DISTINCT p.product_id) > 1
    ORDER BY product_count DESC, pi.image_url
  `);

  console.log('Per-product dupatta image stats:');
  console.log(JSON.stringify(perProduct.rows, null, 2));
  console.log('\nShared image URLs across multiple dupatta products:');
  console.log(JSON.stringify(commonUrls.rows, null, 2));
}

run()
  .catch((error) => {
    console.error('Inspect failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
