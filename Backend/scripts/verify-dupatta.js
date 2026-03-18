const { pool } = require('../src/config/database');

async function run() {
  const categoryResult = await pool.query(
    `SELECT c.category_id, c.name, p.name AS parent_name
       FROM category c
       LEFT JOIN category p ON p.category_id = c.parent_category
      WHERE LOWER(c.name) = LOWER('Dupatta')
      ORDER BY c.category_id DESC
      LIMIT 1`
  );

  const productCountResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM product p
       JOIN category c ON c.category_id = p.category_id
      WHERE LOWER(c.name) = LOWER('Dupatta')`
  );

  console.log('Dupatta category:', categoryResult.rows[0] || null);
  console.log('Dupatta products:', productCountResult.rows[0] || { total: 0 });
}

run()
  .catch((error) => {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
