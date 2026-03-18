const { pool } = require('../src/config/database');

async function getCategory(client, name, parentId = null) {
  const result = await client.query(
    `SELECT category_id, name, parent_category
       FROM category
      WHERE LOWER(name) = LOWER($1)
        AND parent_category IS NOT DISTINCT FROM $2
      ORDER BY category_id ASC
      LIMIT 1`,
    [name, parentId]
  );

  return result.rows[0] || null;
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const showpiecesRoot =
      (await getCategory(client, 'Home Decor / Showpieces', null)) ||
      (await getCategory(client, 'Home Decor', null));

    if (!showpiecesRoot) {
      throw new Error('Home decor root category not found.');
    }

    const clayCrafts = await getCategory(client, 'Clay Crafts', showpiecesRoot.category_id);
    const terracotta = await getCategory(client, 'Terracotta', showpiecesRoot.category_id);

    if (!clayCrafts || !terracotta) {
      throw new Error('Clay Crafts or Terracotta category missing under Home Decor / Showpieces.');
    }

    const homeDecorAlt = await getCategory(client, 'Home Decor', null);

    const rootIds = [showpiecesRoot.category_id];
    if (homeDecorAlt && homeDecorAlt.category_id !== showpiecesRoot.category_id) {
      rootIds.push(homeDecorAlt.category_id);
    }

    const moveTerracotta = await client.query(
      `UPDATE product
          SET category_id = $1,
              updated_at = NOW()
        WHERE category_id = ANY($2::int[])
          AND LOWER(name) LIKE '%terracotta%'`,
      [terracotta.category_id, rootIds]
    );

    const moveClay = await client.query(
      `UPDATE product
          SET category_id = $1,
              updated_at = NOW()
        WHERE category_id = ANY($2::int[])
          AND category_id <> $3`,
      [clayCrafts.category_id, rootIds, terracotta.category_id]
    );

    let deletedHomeDecor = 0;

    if (homeDecorAlt && homeDecorAlt.category_id !== showpiecesRoot.category_id) {
      const childCount = await client.query(
        `SELECT COUNT(*)::int AS total FROM category WHERE parent_category = $1`,
        [homeDecorAlt.category_id]
      );

      const productCount = await client.query(
        `SELECT COUNT(*)::int AS total FROM product WHERE category_id = $1`,
        [homeDecorAlt.category_id]
      );

      if ((childCount.rows[0].total || 0) === 0 && (productCount.rows[0].total || 0) === 0) {
        const del = await client.query(
          `DELETE FROM category WHERE category_id = $1`,
          [homeDecorAlt.category_id]
        );
        deletedHomeDecor = del.rowCount || 0;
      }
    }

    await client.query('COMMIT');

    console.log('Terracotta/Clay consolidation completed.');
    console.log('Moved to Terracotta:', moveTerracotta.rowCount || 0);
    console.log('Moved to Clay Crafts:', moveClay.rowCount || 0);
    console.log('Deleted extra Home Decor category:', deletedHomeDecor);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Consolidation failed:', error.message);
  process.exit(1);
});
