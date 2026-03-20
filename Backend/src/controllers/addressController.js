const { pool } = require('../config/database');

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeText = (value) => String(value || '').trim();

const normalizeOptionalText = (value) => {
  const trimmed = normalizeText(value);
  return trimmed.length ? trimmed : null;
};

const buildAddressResponse = (address) => ({
  address_id: address.address_id,
  street: address.street,
  city: address.city,
  postal_code: address.postal_code,
  country: address.country,
  is_default: address.is_default,
  user_id: address.user_id,
  created_at: address.created_at,
  updated_at: address.updated_at
});

// GET /api/addresses
// Returns all non-deleted addresses for the authenticated user
const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT address_id, street, city, postal_code, country,
              is_default, user_id, created_at, updated_at
       FROM address
       WHERE user_id = $1
         AND is_deleted = false
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      addresses: result.rows.map(buildAddressResponse)
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    return res.status(500).json({ error: 'Failed to fetch addresses' });
  }
};

// GET /api/addresses/:id
const getAddressById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = parsePositiveInt(req.params.id);

    if (!addressId) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    const result = await pool.query(
      `SELECT address_id, street, city, postal_code, country,
              is_default, user_id, created_at, updated_at
       FROM address
       WHERE address_id = $1
         AND user_id = $2
         AND is_deleted = false`,
      [addressId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    return res.status(200).json({
      address: buildAddressResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Get address error:', error);
    return res.status(500).json({ error: 'Failed to fetch address' });
  }
};

// POST /api/addresses
const createAddress = async (req, res) => {
  let client;

  try {
    const userId = req.user.userId;
    const body = req.body || {};

    const street = normalizeText(body.street);
    const city = normalizeText(body.city);
    const postal_code = normalizeOptionalText(body.postal_code);
    const country = normalizeText(body.country) || 'Bangladesh';
    const requestedDefault = body.is_default === true;

    if (!street) {
      return res.status(400).json({ error: 'Street is required' });
    }

    if (!city) {
      return res.status(400).json({ error: 'City is required' });
    }

    if (!country) {
      return res.status(400).json({ error: 'Country is required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM address
       WHERE user_id = $1
         AND is_deleted = false`,
      [userId]
    );

    const isFirstAddress = countResult.rows[0].count === 0;
    const makeDefault = requestedDefault || isFirstAddress;

    if (makeDefault) {
      await client.query(
        `UPDATE address
         SET is_default = false,
             updated_at = NOW()
         WHERE user_id = $1
           AND is_deleted = false`,
        [userId]
      );
    }

    const result = await client.query(
      `INSERT INTO address (
         street, city, postal_code, country,
         is_default, is_deleted, user_id
       )
       VALUES ($1, $2, $3, $4, $5, false, $6)
       RETURNING address_id, street, city, postal_code, country,
                 is_default, user_id, created_at, updated_at`,
      [street, city, postal_code, country, makeDefault, userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Address created successfully',
      address: buildAddressResponse(result.rows[0])
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Create address error:', error);
    return res.status(500).json({ error: 'Failed to create address' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// PATCH /api/addresses/:id
// General field update only. Use the dedicated /default endpoint to change default.
const updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = parsePositiveInt(req.params.id);

    if (!addressId) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    const existing = await pool.query(
      `SELECT address_id
       FROM address
       WHERE address_id = $1
         AND user_id = $2
         AND is_deleted = false`,
      [addressId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const body = req.body || {};
    const updates = [];
    const params = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(body, 'street')) {
      const street = normalizeText(body.street);
      if (!street) {
        return res.status(400).json({ error: 'Street cannot be empty' });
      }
      updates.push(`street = $${idx}`);
      params.push(street);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'city')) {
      const city = normalizeText(body.city);
      if (!city) {
        return res.status(400).json({ error: 'City cannot be empty' });
      }
      updates.push(`city = $${idx}`);
      params.push(city);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'postal_code')) {
      updates.push(`postal_code = $${idx}`);
      params.push(normalizeOptionalText(body.postal_code));
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'country')) {
      const country = normalizeText(body.country);
      if (!country) {
        return res.status(400).json({ error: 'Country cannot be empty' });
      }
      updates.push(`country = $${idx}`);
      params.push(country);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'is_default')) {
      return res.status(400).json({
        error: 'Use the dedicated default-address endpoint to change the default address'
      });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(addressId, userId);

    const result = await pool.query(
      `UPDATE address
       SET ${updates.join(', ')}
       WHERE address_id = $${idx}
         AND user_id = $${idx + 1}
         AND is_deleted = false
       RETURNING address_id, street, city, postal_code, country,
                 is_default, user_id, created_at, updated_at`,
      params
    );

    return res.status(200).json({
      message: 'Address updated successfully',
      address: buildAddressResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Update address error:', error);
    return res.status(500).json({ error: 'Failed to update address' });
  }
};

// PATCH /api/addresses/:id/default
const setDefaultAddress = async (req, res) => {
  let client;

  try {
    const userId = req.user.userId;
    const addressId = parsePositiveInt(req.params.id);

    if (!addressId) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT address_id, street, city, postal_code, country,
              is_default, user_id, created_at, updated_at
       FROM address
       WHERE address_id = $1
         AND user_id = $2
         AND is_deleted = false`,
      [addressId, userId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Address not found' });
    }

    await client.query(
      `UPDATE address
       SET is_default = false,
           updated_at = NOW()
       WHERE user_id = $1
         AND is_deleted = false`,
      [userId]
    );

    const result = await client.query(
      `UPDATE address
       SET is_default = true,
           updated_at = NOW()
       WHERE address_id = $1
         AND user_id = $2
         AND is_deleted = false
       RETURNING address_id, street, city, postal_code, country,
                 is_default, user_id, created_at, updated_at`,
      [addressId, userId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Default address updated successfully',
      address: buildAddressResponse(result.rows[0])
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Set default address error:', error);
    return res.status(500).json({ error: 'Failed to set default address' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// DELETE /api/addresses/:id
// If any order references the address, soft delete it.
// Otherwise hard delete is safe.
const deleteAddress = async (req, res) => {
  let client;

  try {
    const userId = req.user.userId;
    const addressId = parsePositiveInt(req.params.id);

    if (!addressId) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT address_id, is_default
       FROM address
       WHERE address_id = $1
         AND user_id = $2
         AND is_deleted = false`,
      [addressId, userId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Address not found' });
    }

    const wasDefault = existing.rows[0].is_default;

    const orderReferenceCheck = await client.query(
      `SELECT 1
       FROM orders
       WHERE address_id = $1
       LIMIT 1`,
      [addressId]
    );

    const hasOrderReference = orderReferenceCheck.rows.length > 0;

    if (hasOrderReference) {
      await client.query(
        `UPDATE address
         SET is_deleted = true,
             is_default = false,
             updated_at = NOW()
         WHERE address_id = $1
           AND user_id = $2`,
        [addressId, userId]
      );
    } else {
      await client.query(
        `DELETE FROM address
         WHERE address_id = $1
           AND user_id = $2`,
        [addressId, userId]
      );
    }

    if (wasDefault) {
      await client.query(
        `UPDATE address
         SET is_default = true,
             updated_at = NOW()
         WHERE address_id = (
           SELECT address_id
           FROM address
           WHERE user_id = $1
             AND is_deleted = false
           ORDER BY created_at DESC
           LIMIT 1
         )`,
        [userId]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      message: hasOrderReference
        ? 'Address removed from your active list and preserved for order history'
        : 'Address deleted successfully'
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Delete address error:', error);
    return res.status(500).json({ error: 'Failed to delete address' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
};