#!/usr/bin/env node

const { pool } = require('../src/config/database');

async function run() {
  const categoryResult = await pool.query(
    `SELECT category_id
       FROM category
      WHERE LOWER(name) = LOWER($1)
      ORDER BY category_id
      LIMIT 1`,
    ['Terracotta & Clay Crafts']
  );

  if (!categoryResult.rows[0]) {
    console.log('Category not found: Terracotta & Clay Crafts');
    return;
  }

  const categoryId = categoryResult.rows[0].category_id;

  const deleted = await pool.query(
    `DELETE FROM product p
      WHERE p.category_id = $1
        AND NOT EXISTS (
          SELECT 1
            FROM product_variant pv
            JOIN product_image pi ON pi.variant_id = pv.variant_id
           WHERE pv.product_id = p.product_id
             AND pi.image_url ILIKE '%res.cloudinary.com%'
        )
        AND NOT EXISTS (SELECT 1 FROM order_item oi WHERE oi.product_id = p.product_id)
        AND NOT EXISTS (SELECT 1 FROM cart_item ci WHERE ci.product_id = p.product_id)
        AND NOT EXISTS (SELECT 1 FROM wishlist w WHERE w.product_id = p.product_id)
        AND NOT EXISTS (SELECT 1 FROM review r WHERE r.product_id = p.product_id)
      RETURNING p.product_id`,
    [categoryId]
  );

  console.log(`Deleted non-image products: ${deleted.rowCount}`);
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
