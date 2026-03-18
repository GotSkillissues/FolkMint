const { pool } = require('../src/config/database');

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure parent category label is Home Decor (keep same ID for frontend links).
    await client.query(
      `UPDATE category
          SET name = 'Home Decor',
              description = 'Decorative handmade home items and showpieces'
        WHERE category_id = 4`
    );

    // Remove any remaining root-level duplicate Home Decor category except ID 4.
    await client.query(
      `DELETE FROM category
        WHERE parent_category IS NULL
          AND LOWER(name) = LOWER('Home Decor')
          AND category_id <> 4`
    );

    await client.query('COMMIT');

    const summary = await client.query(
      `SELECT c.category_id, c.name, c.parent_category, p.name AS parent_name,
              COUNT(pr.product_id)::int AS product_count
         FROM category c
         LEFT JOIN category p ON p.category_id = c.parent_category
         LEFT JOIN product pr ON pr.category_id = c.category_id
        WHERE c.category_id = 4
           OR c.parent_category = 4
           OR LOWER(c.name) = LOWER('Terracotta and Clay Craft')
        GROUP BY c.category_id, c.name, c.parent_category, p.name
        ORDER BY c.category_id`
    );

    console.log('Finalized category structure:');
    console.log(summary.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Finalize failed:', error.message);
  process.exit(1);
});
