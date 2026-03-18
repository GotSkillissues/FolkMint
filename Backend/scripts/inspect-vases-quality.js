const { pool } = require('../src/config/database');

async function run() {
  const rows = await pool.query(
    `SELECT p.product_id, p.name, p.description, p.category_id, pv.variant_id, pv.sku, pv.size, pv.color, pv.price,
            (SELECT COUNT(*)::int FROM product_image pi WHERE pi.variant_id = pv.variant_id) AS image_count
       FROM product p
       JOIN category c ON c.category_id = p.category_id
       LEFT JOIN product_variant pv ON pv.product_id = p.product_id
      WHERE LOWER(c.name) = LOWER('Vases')
      ORDER BY pv.sku NULLS LAST, p.product_id`
  );

  const dupSku = await pool.query(
    `SELECT pv.sku, COUNT(*)::int AS variant_count, COUNT(DISTINCT pv.product_id)::int AS product_count
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       JOIN category c ON c.category_id = p.category_id
      WHERE LOWER(c.name) = LOWER('Vases')
        AND pv.sku IS NOT NULL
      GROUP BY pv.sku
     HAVING COUNT(*) > 1
      ORDER BY variant_count DESC, pv.sku`
  );

  const dupName = await pool.query(
    `SELECT LOWER(TRIM(p.name)) AS normalized_name, COUNT(*)::int AS product_count
       FROM product p
       JOIN category c ON c.category_id = p.category_id
      WHERE LOWER(c.name) = LOWER('Vases')
      GROUP BY LOWER(TRIM(p.name))
     HAVING COUNT(*) > 1
      ORDER BY product_count DESC, normalized_name`
  );

  console.log('Vases rows:', rows.rows.length);
  console.log('Duplicate SKUs:', dupSku.rows);
  console.log('Duplicate names:', dupName.rows);
  console.log('Sample products:', rows.rows.slice(0, 30));
}

run()
  .catch((error) => {
    console.error('Inspect failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
