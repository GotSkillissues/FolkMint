const { pool } = require('../src/config/database');

async function run() {
  const categories = await pool.query(
    `SELECT c.category_id, c.name, p.name AS parent_name, COUNT(pr.product_id)::int AS product_count
       FROM category c
       LEFT JOIN category p ON p.category_id = c.parent_category
       LEFT JOIN product pr ON pr.category_id = c.category_id
      WHERE LOWER(c.name) IN (LOWER('Terracotta'), LOWER('Clay Crafts'))
      GROUP BY c.category_id, c.name, p.name
      ORDER BY c.category_id`
  );

  const imageCounts = await pool.query(
    `SELECT c.name AS category_name, COUNT(pi.image_id)::int AS image_count
       FROM category c
       LEFT JOIN product pr ON pr.category_id = c.category_id
       LEFT JOIN product_variant pv ON pv.product_id = pr.product_id
       LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
      WHERE LOWER(c.name) IN (LOWER('Terracotta'), LOWER('Clay Crafts'))
      GROUP BY c.name
      ORDER BY c.name`
  );

  const sampleProducts = await pool.query(
    `SELECT c.name AS category_name, pr.product_id, pr.name AS product_name, pv.sku,
            COUNT(pi.image_id)::int AS image_count
       FROM category c
       JOIN product pr ON pr.category_id = c.category_id
       LEFT JOIN product_variant pv ON pv.product_id = pr.product_id
       LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
      WHERE LOWER(c.name) IN (LOWER('Terracotta'), LOWER('Clay Crafts'))
      GROUP BY c.name, pr.product_id, pr.name, pv.sku
      ORDER BY c.name, pr.product_id DESC
      LIMIT 20`
  );

  console.log('Category summary:', categories.rows);
  console.log('Image summary:', imageCounts.rows);
  console.log('Sample products:', sampleProducts.rows);
}

run()
  .catch((error) => {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
