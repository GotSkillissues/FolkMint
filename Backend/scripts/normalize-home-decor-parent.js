const { pool } = require('../src/config/database');

async function getCategoryByName(client, name, parentNullOnly = true) {
  const result = await client.query(
    `SELECT category_id, name, parent_category
       FROM category
      WHERE LOWER(name) = LOWER($1)
        ${parentNullOnly ? 'AND parent_category IS NULL' : ''}
      ORDER BY category_id ASC
      LIMIT 1`,
    [name]
  );

  return result.rows[0] || null;
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const canonical =
      (await getCategoryByName(client, 'Home Decor / Showpieces', true)) ||
      (await getCategoryByName(client, 'Home Decor', true));

    if (!canonical) {
      throw new Error('No Home Decor root category found.');
    }

    const alternateName =
      canonical.name.toLowerCase() === 'home decor / showpieces'
        ? 'Home Decor'
        : 'Home Decor / Showpieces';

    const alternate = await getCategoryByName(client, alternateName, true);

    if (alternate) {
      // Move all direct children from alternate root to canonical root.
      await client.query(
        `UPDATE category
            SET parent_category = $1
          WHERE parent_category = $2`,
        [canonical.category_id, alternate.category_id]
      );
    }

    const movedSummary = await client.query(
      `SELECT category_id, name, parent_category
         FROM category
        WHERE LOWER(name) IN (LOWER('Vases'), LOWER('Clay Crafts'), LOWER('Terracotta'))
        ORDER BY category_id`
    );

    await client.query('COMMIT');

    console.log('Home decor parent normalization completed.');
    console.log('Canonical root:', canonical);
    console.log('Alternate root:', alternate || null);
    console.log('Category placement:', movedSummary.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Normalization failed:', error.message);
  process.exit(1);
});
