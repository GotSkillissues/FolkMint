const { pool } = require('../src/config/database');

const CANONICAL_NAME = 'Terracotta & Clay Crafts';
const CANONICAL_PARENT_NAME = 'Home Decor / Showpieces';
const LEGACY_NAMES = ['Terracotta', 'Clay Crafts', 'Terracotta Clay', 'Terracotta & Clay'];

const normalize = (value) => String(value || '').trim().toLowerCase();

async function fetchCandidates(client) {
  const result = await client.query(
    `SELECT category_id, name, parent_category, description
       FROM category
      WHERE LOWER(name) = ANY($1::text[])
      ORDER BY category_id`,
    [LEGACY_NAMES.map((name) => normalize(name))]
  );

  return result.rows;
}

async function fetchCanonicalByName(client) {
  const result = await client.query(
    `SELECT category_id, name, parent_category, description
       FROM category
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1`,
    [CANONICAL_NAME]
  );

  return result.rows[0] || null;
}

async function getCanonicalParentId(client) {
  const result = await client.query(
    `SELECT category_id
       FROM category
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1`,
    [CANONICAL_PARENT_NAME]
  );

  if (!result.rows[0]) {
    throw new Error(`Canonical parent category not found: ${CANONICAL_PARENT_NAME}`);
  }

  return result.rows[0].category_id;
}

function choosePreferredParent(rows) {
  const counts = new Map();

  for (const row of rows) {
    const key = row.parent_category === null ? 'null' : String(row.parent_category);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  if (counts.size === 0) return null;

  const [selected] = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    if (a[0] === 'null') return -1;
    if (b[0] === 'null') return 1;
    return Number(a[0]) - Number(b[0]);
  });

  return selected[0] === 'null' ? null : Number(selected[0]);
}

async function ensureCanonicalCategory(client, rows) {
  const canonicalParentId = await getCanonicalParentId(client);
  const canonicalExisting = rows.find(
    (row) => normalize(row.name) === normalize(CANONICAL_NAME) && row.parent_category === canonicalParentId
  );
  if (canonicalExisting) return canonicalExisting.category_id;

  const preferredParent = canonicalParentId || choosePreferredParent(rows);
  const inserted = await client.query(
    `INSERT INTO category (name, description, parent_category)
     VALUES ($1, $2, $3)
     RETURNING category_id`,
    [CANONICAL_NAME, 'Merged category for terracotta and clay craft products', preferredParent]
  );

  return inserted.rows[0].category_id;
}

async function migratePreferenceCategory(client, sourceId, targetId) {
  await client.query(
    `INSERT INTO preference_category (preference_id, category_id)
     SELECT preference_id, $1
       FROM preference_category
      WHERE category_id = $2
     ON CONFLICT (preference_id, category_id) DO NOTHING`,
    [targetId, sourceId]
  );

  await client.query('DELETE FROM preference_category WHERE category_id = $1', [sourceId]);
}

async function mergeCategoryIntoTarget(client, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;

  await client.query(
    `UPDATE product
        SET category_id = $1,
            updated_at = NOW()
      WHERE category_id = $2`,
    [targetId, sourceId]
  );

  await migratePreferenceCategory(client, sourceId, targetId);

  await client.query(
    `UPDATE category
        SET parent_category = $1
      WHERE parent_category = $2`,
    [targetId, sourceId]
  );

  await client.query('DELETE FROM category WHERE category_id = $1', [sourceId]);
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const candidates = await fetchCandidates(client);
    const duplicateCanonicalRows = await client.query(
      `SELECT category_id, name, parent_category, description
         FROM category
        WHERE LOWER(name) = LOWER($1)
        ORDER BY category_id`,
      [CANONICAL_NAME]
    );

    const allCandidates = [...candidates, ...duplicateCanonicalRows.rows];
    const uniqueCandidateIds = [...new Set(allCandidates.map((row) => row.category_id))];

    if (uniqueCandidateIds.length === 0) {
      throw new Error('No Terracotta/Clay categories found to merge.');
    }

    if (uniqueCandidateIds.length === 1) {
      const canonicalOnly = await fetchCanonicalByName(client);
      await client.query('COMMIT');
      console.log('Terracotta/Clay category is already merged.');
      console.log('Canonical category:', {
        category_id: canonicalOnly?.category_id,
        name: canonicalOnly?.name,
        parent_category: canonicalOnly?.parent_category,
      });
      return;
    }

    const targetId = await ensureCanonicalCategory(client, allCandidates);
    const sourceIds = allCandidates
      .map((row) => row.category_id)
      .filter((id) => id !== targetId)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    for (const sourceId of sourceIds) {
      await mergeCategoryIntoTarget(client, sourceId, targetId);
    }

    await client.query('COMMIT');

    const summary = await client.query(
      `SELECT c.category_id, c.name, c.parent_category,
              COUNT(p.product_id)::int AS product_count
         FROM category c
         LEFT JOIN product p ON p.category_id = c.category_id
        WHERE c.category_id = $1
        GROUP BY c.category_id, c.name, c.parent_category`,
      [targetId]
    );

    console.log('Terracotta/Clay category merge complete.');
    console.log('Canonical category:', summary.rows[0]);
    console.log('Merged source category IDs:', sourceIds);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Category merge failed:', error.message);
  process.exit(1);
});
