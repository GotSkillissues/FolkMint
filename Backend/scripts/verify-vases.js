const { pool } = require('../src/config/database');

async function run() {
  const categoryResult = await pool.query(
    `SELECT
       v.category_id AS vases_category_id,
       v.name AS vases_name,
       h.name AS home_decor_name
     FROM category v
     LEFT JOIN category h ON h.category_id = v.parent_category
     WHERE LOWER(v.name) = LOWER('Vases')
     ORDER BY v.category_id DESC
     LIMIT 1`
  );

  const productCountResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM product p
       JOIN category c ON c.category_id = p.category_id
      WHERE LOWER(c.name) = LOWER('Vases')`
  );

  console.log('Vases category chain:', categoryResult.rows[0] || null);
  console.log('Vases products:', productCountResult.rows[0] || { total: 0 });
}

run()
  .catch((error) => {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
