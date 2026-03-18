const { pool } = require('../src/config/database');

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

async function getWomenId(client) {
  const result = await client.query(
    `SELECT category_id
       FROM category
      WHERE LOWER(name) = LOWER('Women')
      LIMIT 1`
  );

  if (!result.rows[0]) {
    throw new Error('Women category not found.');
  }

  return result.rows[0].category_id;
}

async function getWomenChildren(client, womenId) {
  const result = await client.query(
    `SELECT category_id, name
       FROM category
      WHERE parent_category = $1
      ORDER BY category_id`,
    [womenId]
  );

  return result.rows;
}

async function ensureCanonicalCategory(client, womenId, canonicalName, fallbackDescription) {
  const existing = await client.query(
    `SELECT category_id
       FROM category
      WHERE parent_category = $1
        AND LOWER(name) = LOWER($2)
      LIMIT 1`,
    [womenId, canonicalName]
  );

  if (existing.rows[0]) return existing.rows[0].category_id;

  const inserted = await client.query(
    `INSERT INTO category (name, description, parent_category)
     VALUES ($1, $2, $3)
     RETURNING category_id`,
    [canonicalName, fallbackDescription, womenId]
  );

  return inserted.rows[0].category_id;
}

async function migrateIntoTarget(client, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;

  await client.query(
    `UPDATE product
        SET category_id = $1,
            updated_at = NOW()
      WHERE category_id = $2`,
    [targetId, sourceId]
  );

  await client.query(
    `UPDATE category
        SET parent_category = $1
      WHERE parent_category = $2`,
    [targetId, sourceId]
  );

  await client.query(
    `DELETE FROM category
      WHERE category_id = $1`,
    [sourceId]
  );
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const womenId = await getWomenId(client);
    const womenChildren = await getWomenChildren(client, womenId);

    const byName = new Map(
      womenChildren.map((row) => [normalizeKey(row.name), row.category_id])
    );

    const shawlsId = await ensureCanonicalCategory(
      client,
      womenId,
      'Shawls',
      "Handcrafted shawls and wraps"
    );

    const shalwarsId = await ensureCanonicalCategory(
      client,
      womenId,
      'Shalwars',
      "Traditional shalwar designs"
    );

    const shawlLegacyNames = ['shawl'];
    const shalwarLegacyNames = ['salwar kameez', 'shalwar kameez', 'salwar', 'shalwar'];

    for (const legacyName of shawlLegacyNames) {
      const sourceId = byName.get(normalizeKey(legacyName));
      await migrateIntoTarget(client, sourceId, shawlsId);
    }

    for (const legacyName of shalwarLegacyNames) {
      const sourceId = byName.get(normalizeKey(legacyName));
      await migrateIntoTarget(client, sourceId, shalwarsId);
    }

    const finalChildrenResult = await client.query(
      `SELECT category_id, name
         FROM category
        WHERE parent_category = $1
        ORDER BY category_id`,
      [womenId]
    );

    const oldNamesLeft = finalChildrenResult.rows.filter((row) => {
      const key = normalizeKey(row.name);
      return key === 'shawl' || key === 'salwar kameez' || key === 'shalwar kameez';
    });

    if (oldNamesLeft.length > 0) {
      throw new Error(`Normalization incomplete. Remaining old names: ${oldNamesLeft.map((row) => row.name).join(', ')}`);
    }

    await client.query('COMMIT');

    const counts = await client.query(
      `SELECT c.name, COUNT(p.product_id)::int AS products
         FROM category c
         LEFT JOIN product p ON p.category_id = c.category_id
        WHERE c.parent_category = $1
          AND LOWER(c.name) IN (LOWER('Shawls'), LOWER('Shalwars'))
        GROUP BY c.name
        ORDER BY c.name`,
      [womenId]
    );

    console.log('Women category normalization complete.');
    console.log('Canonical category product counts:', counts.rows);
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
