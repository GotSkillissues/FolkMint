const { pool } = require('../src/config/database');

async function run() {
  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int
          FROM product p
          JOIN category c ON c.category_id = p.category_id
         WHERE LOWER(c.name) = LOWER('Vases')) AS products_total,
       (SELECT COUNT(*)::int
          FROM (
            SELECT p.product_id
              FROM product p
              JOIN category c ON c.category_id = p.category_id
              JOIN product_variant pv ON pv.product_id = p.product_id
              LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
             WHERE LOWER(c.name) = LOWER('Vases')
             GROUP BY p.product_id
            HAVING COUNT(pi.image_id) > 0
          ) x) AS products_with_images,
       (SELECT COUNT(*)::int
          FROM product_image pi
          JOIN product_variant pv ON pv.variant_id = pi.variant_id
          JOIN product p ON p.product_id = pv.product_id
          JOIN category c ON c.category_id = p.category_id
         WHERE LOWER(c.name) = LOWER('Vases')) AS image_rows`
  );

  const missing = await pool.query(
    `SELECT p.product_id, p.name, pv.sku
       FROM product p
       JOIN category c ON c.category_id = p.category_id
       JOIN product_variant pv ON pv.product_id = p.product_id
       LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
      WHERE LOWER(c.name) = LOWER('Vases')
      GROUP BY p.product_id, p.name, pv.sku
     HAVING COUNT(pi.image_id) = 0
      ORDER BY p.product_id`
  );

  console.log('Vases image coverage:', counts.rows[0]);
  console.log('Vases products missing images:', missing.rows.length);
  for (const row of missing.rows) {
    console.log(`- [${row.product_id}] ${row.name} (SKU: ${row.sku})`);
  }
}

run()
  .catch((error) => {
    console.error('Vases image verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
