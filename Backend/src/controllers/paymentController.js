// Payment Controller - Handle payment method and payment operations
const { pool } = require('../config/database');

// ===== PAYMENT METHODS =====

// Get user's payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT payment_method_id, type, provider, is_default, created_at
       FROM payment_method WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.status(200).json({ payment_methods: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment methods: ' + error.message });
  }
};

// Get payment method by ID
const getPaymentMethodById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT payment_method_id, type, provider, is_default, created_at
       FROM payment_method WHERE payment_method_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    res.status(200).json({ payment_method: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment method: ' + error.message });
  }
};

// Create payment method
const createPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, provider, account_number, is_default = false } = req.body;

    if (!type || !provider) {
      return res.status(400).json({ error: 'Type and provider are required' });
    }

    const validTypes = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    // If default, unset other defaults
    if (is_default) {
      await pool.query(
        'UPDATE payment_method SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    // If first method, make default
    const existingCount = await pool.query(
      'SELECT COUNT(*) FROM payment_method WHERE user_id = $1',
      [userId]
    );
    const makeDefault = is_default || parseInt(existingCount.rows[0].count) === 0;

    const result = await pool.query(
      `INSERT INTO payment_method (user_id, type, provider, account_number, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING payment_method_id, type, provider, is_default, created_at`,
      [userId, type, provider, account_number, makeDefault]
    );

    res.status(201).json({ message: 'Payment method created', payment_method: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment method: ' + error.message });
  }
};

// Update payment method
const updatePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { type, provider, account_number, is_default } = req.body;

    // Verify ownership
    const existing = await pool.query(
      'SELECT payment_method_id FROM payment_method WHERE payment_method_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (type !== undefined) {
      const validTypes = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid payment type' });
      }
      updates.push(`type = $${idx}`);
      params.push(type);
      idx++;
    }
    if (provider !== undefined) {
      updates.push(`provider = $${idx}`);
      params.push(provider);
      idx++;
    }
    if (account_number !== undefined) {
      updates.push(`account_number = $${idx}`);
      params.push(account_number);
      idx++;
    }
    if (is_default !== undefined) {
      if (is_default) {
        await pool.query(
          'UPDATE payment_method SET is_default = false WHERE user_id = $1 AND payment_method_id != $2',
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
      `UPDATE payment_method SET ${updates.join(', ')} WHERE payment_method_id = $${idx}
       RETURNING payment_method_id, type, provider, is_default, created_at`,
      params
    );

    res.status(200).json({ message: 'Payment method updated', payment_method: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment method: ' + error.message });
  }
};

// Delete payment method
const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM payment_method WHERE payment_method_id = $1 AND user_id = $2 RETURNING payment_method_id, is_default',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // If deleted was default, make another default
    if (result.rows[0].is_default) {
      await pool.query(
        `UPDATE payment_method SET is_default = true 
         WHERE user_id = $1 
         AND payment_method_id = (SELECT payment_method_id FROM payment_method WHERE user_id = $1 LIMIT 1)`,
        [userId]
      );
    }

    res.status(200).json({ message: 'Payment method deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment method: ' + error.message });
  }
};

// Set default payment method
const setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT payment_method_id FROM payment_method WHERE payment_method_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await pool.query('UPDATE payment_method SET is_default = false WHERE user_id = $1', [userId]);
    
    const result = await pool.query(
      'UPDATE payment_method SET is_default = true WHERE payment_method_id = $1 RETURNING *',
      [id]
    );

    res.status(200).json({ message: 'Default payment method set', payment_method: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set default: ' + error.message });
  }
};

// ===== PAYMENTS =====

// Get payments (Admin: all, User: own)
const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT p.*, o.user_id, pm.type as payment_type, pm.provider
      FROM payment p
      JOIN orders o ON p.order_id = o.order_id
      LEFT JOIN payment_method pm ON p.payment_method_id = pm.payment_method_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (!isAdmin) {
      query += ` AND o.user_id = $${idx}`;
      params.push(userId);
      idx++;
    }

    if (status) {
      query += ` AND p.status = $${idx}`;
      params.push(status);
      idx++;
    }

    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      payments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments: ' + error.message });
  }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const result = await pool.query(
      `SELECT p.*, o.user_id, pm.type as payment_type, pm.provider
       FROM payment p
       JOIN orders o ON p.order_id = o.order_id
       LEFT JOIN payment_method pm ON p.payment_method_id = pm.payment_method_id
       WHERE p.payment_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (!isAdmin && result.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json({ payment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment: ' + error.message });
  }
};

// Process payment (simulate payment processing)
const processPayment = async (req, res) => {
  try {
    const { order_id, payment_method_id } = req.body;
    const userId = req.user.userId;

    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Verify order belongs to user and is pending
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1 AND user_id = $2 AND status = $3',
      [order_id, userId, 'pending']
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or not pending' });
    }

    const order = orderResult.rows[0];

    // Check if payment already exists
    const existingPayment = await pool.query(
      'SELECT payment_id FROM payment WHERE order_id = $1',
      [order_id]
    );

    let result;
    if (existingPayment.rows.length > 0) {
      // Update existing payment
      result = await pool.query(
        `UPDATE payment SET status = 'completed', payment_method_id = $1, updated_at = NOW()
         WHERE order_id = $2 RETURNING *`,
        [payment_method_id, order_id]
      );
    } else {
      // Create new payment
      result = await pool.query(
        `INSERT INTO payment (order_id, payment_method_id, amount, status)
         VALUES ($1, $2, $3, 'completed') RETURNING *`,
        [order_id, payment_method_id, order.total_amount]
      );
    }

    // Update order status
    await pool.query(
      "UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE order_id = $1",
      [order_id]
    );

    res.status(200).json({ message: 'Payment processed', payment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process payment: ' + error.message });
  }
};

// Update payment status (Admin only)
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE payment SET status = $1, updated_at = NOW() WHERE payment_id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.status(200).json({ message: 'Payment status updated', payment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment: ' + error.message });
  }
};

module.exports = {
  // Payment Methods
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  // Payments
  getPayments,
  getPaymentById,
  processPayment,
  updatePaymentStatus
};
