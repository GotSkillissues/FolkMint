// Address Controller - Handle address-related operations
const { pool } = require('../config/database');

const ensureAddressSoftDeleteColumn = async () => {
  await pool.query(
    `ALTER TABLE address
     ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false`
  );
};

// Get user's addresses
const getAddresses = async (req, res) => {
  try {
    await ensureAddressSoftDeleteColumn();
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT *
       FROM address
       WHERE user_id = $1 AND is_deleted = false
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.status(200).json({ addresses: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch addresses: ' + error.message });
  }
};

// Get address by ID
const getAddressById = async (req, res) => {
  try {
    await ensureAddressSoftDeleteColumn();
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM address WHERE address_id = $1 AND user_id = $2 AND is_deleted = false',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.status(200).json({ address: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch address: ' + error.message });
  }
};

// Create address
const createAddress = async (req, res) => {
  try {
    await ensureAddressSoftDeleteColumn();
    const userId = req.user.userId;
    const { street, city, postal_code, country, is_default = false } = req.body;

    if (!street || !city || !country) {
      return res.status(400).json({ error: 'Street, city, and country are required' });
    }

    // If this is default, unset other defaults
    if (is_default) {
      await pool.query(
        'UPDATE address SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    // If this is first address, make it default
    const existingCount = await pool.query(
      'SELECT COUNT(*) FROM address WHERE user_id = $1 AND is_deleted = false',
      [userId]
    );
    const makeDefault = is_default || parseInt(existingCount.rows[0].count) === 0;

    const result = await pool.query(
      `INSERT INTO address (user_id, street, city, postal_code, country, is_default, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING *`,
      [userId, street, city, postal_code, country, makeDefault]
    );

    res.status(201).json({ message: 'Address created', address: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create address: ' + error.message });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    await ensureAddressSoftDeleteColumn();
    const userId = req.user.userId;
    const { id } = req.params;
    const { street, city, postal_code, country, is_default } = req.body;

    // Verify ownership
    const existing = await pool.query(
      'SELECT address_id FROM address WHERE address_id = $1 AND user_id = $2 AND is_deleted = false',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (street !== undefined) {
      updates.push(`street = $${idx}`);
      params.push(street);
      idx++;
    }
    if (city !== undefined) {
      updates.push(`city = $${idx}`);
      params.push(city);
      idx++;
    }
    if (postal_code !== undefined) {
      updates.push(`postal_code = $${idx}`);
      params.push(postal_code);
      idx++;
    }
    if (country !== undefined) {
      updates.push(`country = $${idx}`);
      params.push(country);
      idx++;
    }
    if (is_default !== undefined) {
      if (is_default) {
        // Unset other defaults
        await pool.query(
          'UPDATE address SET is_default = false WHERE user_id = $1 AND address_id != $2',
          [userId, id]
        );
      }
      updates.push(`is_default = $${idx}`);
      params.push(is_default);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE address SET ${updates.join(', ')} WHERE address_id = $${idx}
       RETURNING *`,
      params
    );

    res.status(200).json({ message: 'Address updated', address: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update address: ' + error.message });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    await ensureAddressSoftDeleteColumn();
    const userId = req.user.userId;
    const { id } = req.params;

    const ownership = await pool.query(
      'SELECT address_id, is_default FROM address WHERE address_id = $1 AND user_id = $2 AND is_deleted = false',
      [id, userId]
    );

    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const linkedOrders = await pool.query(
      'SELECT status FROM orders WHERE address_id = $1 AND user_id = $2',
      [id, userId]
    );

    const hasActiveLinkedOrder = linkedOrders.rows.some((row) => !['cancelled', 'delivered'].includes(row.status));

    if (hasActiveLinkedOrder) {
      return res.status(409).json({
        error: 'This address is used in active orders and cannot be deleted yet.'
      });
    }

    const hasTerminalLinkedOrder = linkedOrders.rows.length > 0;

    let removedAddressWasDefault = ownership.rows[0].is_default;

    if (hasTerminalLinkedOrder) {
      await pool.query(
        `UPDATE address
         SET is_deleted = true,
             is_default = false,
             updated_at = NOW()
         WHERE address_id = $1 AND user_id = $2`,
        [id, userId]
      );
    } else {
      const result = await pool.query(
        'DELETE FROM address WHERE address_id = $1 AND user_id = $2 RETURNING address_id, is_default',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Address not found' });
      }

      removedAddressWasDefault = result.rows[0].is_default;
    }

    // If deleted address was default, make another default
    if (removedAddressWasDefault) {
      await pool.query(
        `UPDATE address SET is_default = true 
         WHERE user_id = $1 
         AND is_deleted = false
         AND address_id = (
           SELECT address_id
           FROM address
           WHERE user_id = $1 AND is_deleted = false
           ORDER BY created_at ASC
           LIMIT 1
         )`,
        [userId]
      );
    }

    if (hasTerminalLinkedOrder) {
      return res.status(200).json({
        message: 'Address removed from your account. Linked order records kept for history.'
      });
    }

    res.status(200).json({ message: 'Address deleted' });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        error: 'This address is used in active orders and cannot be deleted yet.'
      });
    }
    res.status(500).json({ error: 'Failed to delete address: ' + error.message });
  }
};

// Set default address
const setDefaultAddress = async (req, res) => {
  try {
    await ensureAddressSoftDeleteColumn();
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify ownership
    const existing = await pool.query(
      'SELECT address_id FROM address WHERE address_id = $1 AND user_id = $2 AND is_deleted = false',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Unset all defaults and set new default
    await pool.query('UPDATE address SET is_default = false WHERE user_id = $1', [userId]);
    
    const result = await pool.query(
      'UPDATE address SET is_default = true WHERE address_id = $1 RETURNING *',
      [id]
    );

    res.status(200).json({ message: 'Default address set', address: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set default: ' + error.message });
  }
};

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
