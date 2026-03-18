const { pool } = require('../src/config/database');

async function run() {
  const noImageRows = await pool.query(`
    SELECT p.product_id
    FROM product p
    JOIN category c ON c.category_id = p.category_id
    JOIN category d ON d.category_id = c.parent_category
    JOIN category h ON h.category_id = d.parent_category
    LEFT JOIN product_variant pv ON pv.product_id = p.product_id
    LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
    WHERE LOWER(c.name) = LOWER('Plates & Platters')
      AND LOWER(d.name) = LOWER('Dining')
      AND LOWER(h.name) = LOWER('Home Decor')
    GROUP BY p.product_id
    HAVING COUNT(pi.image_id) = 0
  `);

  const total = await pool.query(`
    SELECT COUNT(*)::int AS total
    FROM product p
    JOIN category c ON c.category_id = p.category_id
    JOIN category d ON d.category_id = c.parent_category
    JOIN category h ON h.category_id = d.parent_category
    WHERE LOWER(c.name) = LOWER('Plates & Platters')
      AND LOWER(d.name) = LOWER('Dining')
      AND LOWER(h.name) = LOWER('Home Decor')
  `);

  console.log('products_without_images:', noImageRows.rowCount);
  console.log('plates_platters_total:', total.rows[0].total);
}

run()
  .catch((error) => {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
