const { pool } = require('../src/config/database');

async function run() {
  const fallbackFromEnv = String(process.env.VASES_FALLBACK_IMAGE_URL || '').trim();

  let fallbackUrl = fallbackFromEnv;
  if (!fallbackUrl) {
    const fallbackResult = await pool.query(
      `SELECT pi.image_url
         FROM product_image pi
         JOIN product_variant pv ON pv.variant_id = pi.variant_id
         JOIN product p ON p.product_id = pv.product_id
         JOIN category c ON c.category_id = p.category_id
        WHERE LOWER(c.name) = LOWER('Vases')
        ORDER BY pi.is_primary DESC, pi.image_id ASC
        LIMIT 1`
    );

    fallbackUrl = String(fallbackResult.rows[0]?.image_url || '').trim();
  }

  if (!fallbackUrl) {
    throw new Error('No fallback image URL available for Vases.');
  }

  const missing = await pool.query(
    `SELECT pv.variant_id, pv.sku
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       JOIN category c ON c.category_id = p.category_id
       LEFT JOIN product_image pi ON pi.variant_id = pv.variant_id
      WHERE LOWER(c.name) = LOWER('Vases')
      GROUP BY pv.variant_id, pv.sku
     HAVING COUNT(pi.image_id) = 0
      ORDER BY pv.variant_id`
  );

  let inserted = 0;
  for (const row of missing.rows) {
    await pool.query(
      `INSERT INTO product_image (image_url, is_primary, variant_id)
       VALUES ($1, true, $2)`,
      [fallbackUrl, row.variant_id]
    );
    inserted += 1;
  }

  console.log('Vases fallback image fill completed.');
  console.log('Fallback URL:', fallbackUrl);
  console.log('Filled variants:', inserted);
}

run()
  .catch((error) => {
    console.error('Vases fallback image fill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
