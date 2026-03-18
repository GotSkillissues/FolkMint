#!/usr/bin/env node

const { pool } = require('../src/config/database');

async function run() {
  const rows = await pool.query(
    `SELECT c.category_id, c.name, c.parent_category, pc.name AS parent_name, COUNT(p.product_id)::int AS product_count
       FROM category c
       LEFT JOIN category pc ON pc.category_id = c.parent_category
       LEFT JOIN product p ON p.category_id = c.category_id
      WHERE LOWER(c.name) = LOWER($1)
      GROUP BY c.category_id, c.name, c.parent_category, pc.name
      ORDER BY c.category_id`,
    ['Terracotta & Clay Crafts']
  );

  console.log(rows.rows);
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
