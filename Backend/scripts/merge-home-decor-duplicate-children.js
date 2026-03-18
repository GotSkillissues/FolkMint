const { pool } = require('../src/config/database');

async function getRootByName(client, name) {
  const result = await client.query(
    `SELECT category_id, name
       FROM category
      WHERE parent_category IS NULL
        AND LOWER(name) = LOWER($1)
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

    const canonicalRoot =
      (await getRootByName(client, 'Home Decor / Showpieces')) ||
      (await getRootByName(client, 'Home Decor'));

    if (!canonicalRoot) throw new Error('No home decor root found.');

    const alternateRoot =
      canonicalRoot.name.toLowerCase() === 'home decor / showpieces'
        ? await getRootByName(client, 'Home Decor')
        : await getRootByName(client, 'Home Decor / Showpieces');

    if (!alternateRoot) {
      console.log('No alternate root found. Nothing to merge.');
      await client.query('COMMIT');
      return;
    }

    const duplicates = await client.query(
      `SELECT src.category_id AS source_category_id,
              src.name,
              dst.category_id AS target_category_id
         FROM category src
         JOIN category dst
           ON LOWER(dst.name) = LOWER(src.name)
          AND dst.parent_category = $1
        WHERE src.parent_category = $2`,
      [canonicalRoot.category_id, alternateRoot.category_id]
    );

    let movedProducts = 0;
    let deletedCategories = 0;

    for (const row of duplicates.rows) {
      const move = await client.query(
        `UPDATE product
            SET category_id = $1
          WHERE category_id = $2`,
        [row.target_category_id, row.source_category_id]
      );

      movedProducts += move.rowCount || 0;

      const del = await client.query(
        `DELETE FROM category
          WHERE category_id = $1`,
        [row.source_category_id]
      );

      deletedCategories += del.rowCount || 0;
    }

    // Move remaining non-duplicate children directly under canonical root.
    await client.query(
      `UPDATE category
          SET parent_category = $1
        WHERE parent_category = $2`,
      [canonicalRoot.category_id, alternateRoot.category_id]
    );

    await client.query('COMMIT');

    console.log('Home decor duplicate merge completed.');
    console.log('Canonical root:', canonicalRoot);
    console.log('Alternate root:', alternateRoot);
    console.log('Duplicate pairs merged:', duplicates.rows.length);
    console.log('Products moved:', movedProducts);
    console.log('Duplicate categories deleted:', deletedCategories);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Merge failed:', error.message);
  process.exit(1);
});
