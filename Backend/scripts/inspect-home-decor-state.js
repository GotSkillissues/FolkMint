const { pool } = require('../src/config/database');

async function run() {
  const categories = await pool.query(
    `SELECT c.category_id, c.name, c.parent_category, p.name AS parent_name,
            COUNT(pr.product_id)::int AS product_count
       FROM category c
       LEFT JOIN category p ON p.category_id = c.parent_category
       LEFT JOIN product pr ON pr.category_id = c.category_id
      WHERE LOWER(c.name) IN (
        LOWER('Home Decor / Showpieces'),
        LOWER('Home Decor'),
        LOWER('Clay Crafts'),
        LOWER('Terracotta'),
        LOWER('Vases')
      )
      GROUP BY c.category_id, c.name, c.parent_category, p.name
      ORDER BY c.category_id`
  );

  const directProducts = await pool.query(
    `SELECT p.product_id, p.name, c.name AS category_name
       FROM product p
       JOIN category c ON c.category_id = p.category_id
      WHERE LOWER(c.name) IN (LOWER('Home Decor / Showpieces'), LOWER('Home Decor'))
      ORDER BY p.product_id DESC
      LIMIT 50`
  );

  console.log('Category counts:', categories.rows);
  console.log('Products directly under Home Decor roots:', directProducts.rows);
}

run()
  .catch((error) => {
    console.error('Inspect failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
