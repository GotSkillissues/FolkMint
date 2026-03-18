const { pool } = require('../src/config/database');

async function run() {
  const previewResult = await pool.query(`
    SELECT
      p.product_id,
      p.name,
      COALESCE(MAX(pv.sku), 'n/a') AS sku
    FROM product p
    JOIN category c ON c.category_id = p.category_id
    JOIN category d ON d.category_id = c.parent_category
    JOIN category h ON h.category_id = d.parent_category
    LEFT JOIN product_variant pv ON pv.product_id = p.product_id
    LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
    WHERE LOWER(c.name) = LOWER('Plates & Platters')
      AND LOWER(d.name) = LOWER('Dining')
      AND LOWER(h.name) = LOWER('Home Decor')
    GROUP BY p.product_id, p.name
    HAVING COUNT(pi.image_id) = 0
    ORDER BY p.product_id
  `);

  if (previewResult.rows.length === 0) {
    console.log('No plates/platters products without images found. Nothing deleted.');
    return;
  }

  const targetIds = previewResult.rows.map((row) => row.product_id);

  await pool.query('BEGIN');
  try {
    const deleteResult = await pool.query(
      `DELETE FROM product
       WHERE product_id = ANY($1::int[])
       RETURNING product_id, name`,
      [targetIds]
    );

    await pool.query('COMMIT');

    console.log(`Deleted ${deleteResult.rowCount} plates/platters products without images:`);
    for (const row of deleteResult.rows) {
      console.log(`- [${row.product_id}] ${row.name}`);
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

run()
  .catch((error) => {
    console.error('Delete failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
