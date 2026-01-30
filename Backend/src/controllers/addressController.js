// Address Controller - Handle address-related operations
const { pool } = require('../config/database');

// Get user's addresses
const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT * FROM address WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
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
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM address WHERE address_id = $1 AND user_id = $2',
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
    const userId = req.user.userId;
    const { street, city, state, postal_code, country, is_default = false } = req.body;

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
      'SELECT COUNT(*) FROM address WHERE user_id = $1',
      [userId]
    );
    const makeDefault = is_default || parseInt(existingCount.rows[0].count) === 0;

    const result = await pool.query(
      `INSERT INTO address (user_id, street, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, street, city, state, postal_code, country, makeDefault]
    );

    res.status(201).json({ message: 'Address created', address: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create address: ' + error.message });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { street, city, state, postal_code, country, is_default } = req.body;

    // Verify ownership
    const existing = await pool.query(
      'SELECT address_id FROM address WHERE address_id = $1 AND user_id = $2',
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
    if (state !== undefined) {
      updates.push(`state = $${idx}`);
      params.push(state);
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
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM address WHERE address_id = $1 AND user_id = $2 RETURNING address_id, is_default',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If deleted address was default, make another default
    if (result.rows[0].is_default) {
      await pool.query(
        `UPDATE address SET is_default = true 
         WHERE user_id = $1 
         AND address_id = (SELECT address_id FROM address WHERE user_id = $1 LIMIT 1)`,
        [userId]
      );
    }

    res.status(200).json({ message: 'Address deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address: ' + error.message });
  }
};

// Set default address
const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify ownership
    const existing = await pool.query(
      'SELECT address_id FROM address WHERE address_id = $1 AND user_id = $2',
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
