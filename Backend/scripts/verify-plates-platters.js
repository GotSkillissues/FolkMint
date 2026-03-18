const { pool } = require('../src/config/database');

async function run() {
  const categoryResult = await pool.query(
    `SELECT
       pp.category_id AS plates_platters_category_id,
       pp.name AS plates_platters_name,
       h.name AS home_decor_name
     FROM category pp
     LEFT JOIN category h ON h.category_id = pp.parent_category
     WHERE LOWER(pp.name) = LOWER('Plates & Platters')
     ORDER BY pp.category_id DESC
     LIMIT 1`
  );

  const productCountResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM product p
       JOIN category c ON c.category_id = p.category_id
       JOIN category h ON h.category_id = c.parent_category
      WHERE LOWER(c.name) = LOWER('Plates & Platters')
        AND LOWER(h.name) = LOWER('Home Decor')`
  );

  console.log('Plates & Platters category chain:', categoryResult.rows[0] || null);
  console.log('Plates & Platters products:', productCountResult.rows[0] || { total: 0 });
}

run()
  .catch((error) => {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
