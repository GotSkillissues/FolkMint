const { pool } = require('../src/config/database');

async function getHomeDecorRootId(client) {
  const existing = await client.query(
    `SELECT category_id
       FROM category
      WHERE parent_category IS NULL
        AND LOWER(name) = LOWER('Home Decor')
      ORDER BY CASE WHEN category_id = 4 THEN 0 ELSE 1 END, category_id
      LIMIT 1`
  );

  if (existing.rows.length > 0) return existing.rows[0].category_id;

  const created = await client.query(
    `INSERT INTO category (name, description, parent_category)
     VALUES ($1, $2, NULL)
     RETURNING category_id`,
    ['Home Decor', 'Decorative handmade home items and showpieces']
  );

  return created.rows[0].category_id;
}

async function ensureDirectChildCategory(client, homeDecorId, name, description) {
  const direct = await client.query(
    `SELECT category_id
       FROM category
      WHERE parent_category = $1
        AND LOWER(name) = LOWER($2)
      ORDER BY category_id
      LIMIT 1`,
    [homeDecorId, name]
  );

  let canonicalId = null;

  if (direct.rows.length > 0) {
    canonicalId = direct.rows[0].category_id;
  } else {
    const legacy = await client.query(
      `SELECT c.category_id
         FROM category c
         LEFT JOIN category p ON p.category_id = c.parent_category
        WHERE LOWER(c.name) = LOWER($1)
          AND (
            c.parent_category = $2
            OR (
              LOWER(COALESCE(p.name, '')) IN (LOWER('Dining'), LOWER('Decor'))
              AND p.parent_category = $2
            )
          )
        ORDER BY c.category_id
        LIMIT 1`,
      [name, homeDecorId]
    );

    if (legacy.rows.length > 0) {
      canonicalId = legacy.rows[0].category_id;
      await client.query(
        `UPDATE category
            SET parent_category = $1
          WHERE category_id = $2`,
        [homeDecorId, canonicalId]
      );
    } else {
      const created = await client.query(
        `INSERT INTO category (name, description, parent_category)
         VALUES ($1, $2, $3)
         RETURNING category_id`,
        [name, description, homeDecorId]
      );
      canonicalId = created.rows[0].category_id;
    }
  }

  const duplicates = await client.query(
    `SELECT c.category_id
       FROM category c
       LEFT JOIN category p ON p.category_id = c.parent_category
      WHERE LOWER(c.name) = LOWER($1)
        AND c.category_id <> $2
        AND (
          c.parent_category = $3
          OR (
            LOWER(COALESCE(p.name, '')) IN (LOWER('Dining'), LOWER('Decor'))
            AND p.parent_category = $3
          )
        )
      ORDER BY c.category_id`,
    [name, canonicalId, homeDecorId]
  );

  for (const row of duplicates.rows) {
    const duplicateId = row.category_id;

    await client.query(
      `UPDATE product
          SET category_id = $1,
              updated_at = NOW()
        WHERE category_id = $2`,
      [canonicalId, duplicateId]
    );

    await client.query(
      `UPDATE category
          SET parent_category = $1
        WHERE parent_category = $2`,
      [canonicalId, duplicateId]
    );

    await client.query('DELETE FROM category WHERE category_id = $1', [duplicateId]);
  }

  await client.query(
    `UPDATE category
        SET parent_category = $1
      WHERE category_id = $2`,
    [homeDecorId, canonicalId]
  );

  return canonicalId;
}
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

    const homeDecorId = await getHomeDecorRootId(client);

    const platesPlattersId = await ensureDirectChildCategory(
      client,
      homeDecorId,
      'Plates & Platters',
      'Decorative and functional plates and platters'
    );

    const wallHangingsId = await ensureDirectChildCategory(
      client,
      homeDecorId,
      'Wall Hangings',
      'Handcrafted and artisan wall hangings'
    );

    await client.query('COMMIT');

    const summary = await client.query(
      `SELECT c.category_id, c.name, c.parent_category, p.name AS parent_name,
              COUNT(pr.product_id)::int AS product_count
         FROM category c
         LEFT JOIN category p ON p.category_id = c.parent_category
         LEFT JOIN product pr ON pr.category_id = c.category_id
        WHERE c.category_id = $1
            OR c.parent_category = $1
           OR LOWER(c.name) = LOWER('Terracotta and Clay Craft')
           OR LOWER(c.name) = LOWER('Plates & Platters')
           OR LOWER(c.name) = LOWER('Wall Hangings')
        GROUP BY c.category_id, c.name, c.parent_category, p.name
        ORDER BY c.category_id`
      ,
      [homeDecorId]
    );

    console.log('Finalized category structure:');
    console.log(summary.rows);
    console.log('Pinned dedicated categories:', {
      homeDecorId,
      platesPlattersId,
      wallHangingsId,
    });
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
