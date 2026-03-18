const { pool } = require('../src/config/database');

async function findRootCategory(client) {
  const result = await client.query(
    `SELECT category_id, name
       FROM category
      WHERE parent_category IS NULL
        AND (
          LOWER(name) = LOWER('Home Decor / Showpieces')
          OR LOWER(name) = LOWER('Home Decor')
        )
      ORDER BY CASE
        WHEN LOWER(name) = LOWER('Home Decor / Showpieces') THEN 0
        ELSE 1
      END,
      category_id ASC
      LIMIT 1`
  );

  return result.rows[0] || null;
}

async function ensureCanonicalCategory(client, rootId) {
  const existing = await client.query(
    `SELECT category_id, name
       FROM category
      WHERE parent_category = $1
        AND (
          LOWER(name) = LOWER('Terracotta and Clay Craft')
          OR LOWER(name) = LOWER('Terracotta & Clay Crafts')
        )
      ORDER BY CASE
        WHEN LOWER(name) = LOWER('Terracotta and Clay Craft') THEN 0
        ELSE 1
      END,
      category_id ASC
      LIMIT 1`,
    [rootId]
  );

  if (existing.rows.length > 0) {
    const canonicalId = existing.rows[0].category_id;
    await client.query(
      `UPDATE category
          SET name = 'Terracotta and Clay Craft',
              description = 'Terracotta and clay craft collection'
        WHERE category_id = $1`,
      [canonicalId]
    );
    return canonicalId;
  }

  const inserted = await client.query(
    `INSERT INTO category (name, description, parent_category)
     VALUES ($1, $2, $3)
     RETURNING category_id`,
    ['Terracotta and Clay Craft', 'Terracotta and clay craft collection', rootId]
  );

  return inserted.rows[0].category_id;
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const root = await findRootCategory(client);
    if (!root) throw new Error('Home decor root category not found.');

    const canonicalId = await ensureCanonicalCategory(client, root.category_id);

    const mergeCandidates = await client.query(
      `SELECT category_id, name
         FROM category
        WHERE category_id <> $1
          AND (
            LOWER(name) = LOWER('Terracotta')
            OR LOWER(name) = LOWER('Clay Crafts')
            OR LOWER(name) = LOWER('Showpieces')
            OR LOWER(name) = LOWER('Terracotta & Clay Crafts')
            OR LOWER(name) = LOWER('Terracotta and Clay Craft')
          )
        ORDER BY category_id`,
      [canonicalId]
    );

    let movedProducts = 0;
    let movedChildren = 0;
    let deletedCategories = 0;

    for (const row of mergeCandidates.rows) {
      const sourceId = row.category_id;

      // Move products to canonical category
      const moved = await client.query(
        `UPDATE product
            SET category_id = $1,
                updated_at = NOW()
          WHERE category_id = $2`,
        [canonicalId, sourceId]
      );
      movedProducts += moved.rowCount || 0;

      // Reparent children to root first to avoid accidental cascade/orphans.
      const children = await client.query(
        `UPDATE category
            SET parent_category = $1
          WHERE parent_category = $2`,
        [root.category_id, sourceId]
      );
      movedChildren += children.rowCount || 0;

      const del = await client.query(
        `DELETE FROM category WHERE category_id = $1`,
        [sourceId]
      );
      deletedCategories += del.rowCount || 0;
    }

    await client.query('COMMIT');

    const summary = await client.query(
      `SELECT c.category_id, c.name, c.parent_category, p.name AS parent_name,
              COUNT(pr.product_id)::int AS product_count
         FROM category c
         LEFT JOIN category p ON p.category_id = c.parent_category
         LEFT JOIN product pr ON pr.category_id = c.category_id
        WHERE c.category_id = $1
           OR LOWER(c.name) IN (LOWER('Terracotta'), LOWER('Clay Crafts'), LOWER('Showpieces'), LOWER('Terracotta & Clay Crafts'))
        GROUP BY c.category_id, c.name, c.parent_category, p.name
        ORDER BY c.category_id`,
      [canonicalId]
    );

    console.log('Terracotta/Clay single-category merge completed.');
    console.log('Root category:', root);
    console.log('Canonical category ID:', canonicalId);
    console.log('Products moved:', movedProducts);
    console.log('Children reparented:', movedChildren);
    console.log('Categories deleted:', deletedCategories);
    console.log('Post-merge categories:', summary.rows);
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
