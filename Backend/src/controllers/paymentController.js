const { pool } = require('../config/database');

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const PAYMENT_TYPES = ['cod', 'bkash', 'visa', 'mastercard', 'amex'];
const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

const buildPaymentMethodResponse = (row) => ({
  payment_method_id: row.payment_method_id,
  type:       row.type,
  is_default: row.is_default,
  user_id:    row.user_id,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const buildPaymentResponse = (row) => ({
  payment_id:        row.payment_id,
  order_id:          row.order_id,
  payment_method_id: row.payment_method_id,
  payment_type:      row.payment_type || null,
  amount:            row.amount == null ? null : String(row.amount),
  status:            row.status,
  created_at:        row.created_at,
  updated_at:        row.updated_at
});

// =====================================================================
// PAYMENT METHODS
// =====================================================================

// GET /api/payment-methods
// Authenticated. Returns all payment methods for the current user.
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
         payment_method_id, type, is_default,
         user_id, created_at, updated_at
       FROM payment_method
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      payment_methods: result.rows.map(buildPaymentMethodResponse)
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
};

// GET /api/payment-methods/:id
// Authenticated. Only returns methods belonging to the current user.
const getPaymentMethodById = async (req, res) => {
  try {
    const userId          = req.user.userId;
    const paymentMethodId = parsePositiveInt(req.params.id);

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Invalid payment method ID' });
    }

    const result = await pool.query(
      `SELECT
         payment_method_id, type, is_default,
         user_id, created_at, updated_at
       FROM payment_method
       WHERE payment_method_id = $1
         AND user_id = $2`,
      [paymentMethodId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    return res.status(200).json({
      payment_method: buildPaymentMethodResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Get payment method error:', error);
    return res.status(500).json({ error: 'Failed to fetch payment method' });
  }
};

// POST /api/payment-methods
// Authenticated. Adds a new payment method.
// First method is automatically set as default.
const createPaymentMethod = async (req, res) => {
  let client;

  try {
    const userId     = req.user.userId;
    const type       = String(req.body?.type || '').trim().toLowerCase();
    const is_default = req.body?.is_default === true;

    if (!type) {
      return res.status(400).json({ error: 'Payment type is required' });
    }

    if (!PAYMENT_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid payment type. Must be one of: ${PAYMENT_TYPES.join(', ')}`
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Check if this is the first method — make default automatically
    const countResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM payment_method WHERE user_id = $1',
      [userId]
    );

    const isFirst    = countResult.rows[0].count === 0;
    const makeDefault = is_default || isFirst;

    if (makeDefault) {
      await client.query(
        'UPDATE payment_method SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    const result = await client.query(
      `INSERT INTO payment_method (user_id, type, is_default)
       VALUES ($1, $2, $3)
       RETURNING payment_method_id, type, is_default, user_id, created_at, updated_at`,
      [userId, type, makeDefault]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Payment method added successfully',
      payment_method: buildPaymentMethodResponse(result.rows[0])
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Create payment method error:', error);
    return res.status(500).json({ error: 'Failed to add payment method' });
  } finally {
    if (client) client.release();
  }
};

// PATCH /api/payment-methods/:id/default
// Authenticated. Sets a method as default, unsets all others.
const setDefaultPaymentMethod = async (req, res) => {
  let client;

  try {
    const userId          = req.user.userId;
    const paymentMethodId = parsePositiveInt(req.params.id);

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Invalid payment method ID' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT payment_method_id
       FROM payment_method
       WHERE payment_method_id = $1
         AND user_id = $2`,
      [paymentMethodId, userId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await client.query(
      'UPDATE payment_method SET is_default = false, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    const result = await client.query(
      `UPDATE payment_method
       SET is_default = true, updated_at = NOW()
       WHERE payment_method_id = $1
         AND user_id = $2
       RETURNING payment_method_id, type, is_default, user_id, created_at, updated_at`,
      [paymentMethodId, userId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Default payment method updated',
      payment_method: buildPaymentMethodResponse(result.rows[0])
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Set default payment method error:', error);
    return res.status(500).json({ error: 'Failed to set default payment method' });
  } finally {
    if (client) client.release();
  }
};

// DELETE /api/payment-methods/:id
// Authenticated. Cannot delete a method linked to a pending payment.
// If deleting the default, promotes another method automatically.
const deletePaymentMethod = async (req, res) => {
  let client;

  try {
    const userId          = req.user.userId;
    const paymentMethodId = parsePositiveInt(req.params.id);

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Invalid payment method ID' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT payment_method_id, is_default
       FROM payment_method
       WHERE payment_method_id = $1
         AND user_id = $2`,
      [paymentMethodId, userId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const wasDefault = existing.rows[0].is_default;

    // Block if linked to a pending payment
    const pendingCheck = await client.query(
      `SELECT 1
       FROM payment
       WHERE payment_method_id = $1
         AND status = 'pending'
       LIMIT 1`,
      [paymentMethodId]
    );

    if (pendingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Cannot delete a payment method linked to a pending payment'
      });
    }

    // Schema uses ON DELETE SET NULL on payment.payment_method_id
    // so historical payments are preserved after deletion
    await client.query(
      'DELETE FROM payment_method WHERE payment_method_id = $1 AND user_id = $2',
      [paymentMethodId, userId]
    );

    // If deleted was default, promote the most recently added remaining method
    if (wasDefault) {
      await client.query(
        `UPDATE payment_method
         SET is_default = true, updated_at = NOW()
         WHERE payment_method_id = (
           SELECT payment_method_id
           FROM payment_method
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 1
         )`,
        [userId]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Delete payment method error:', error);
    return res.status(500).json({ error: 'Failed to delete payment method' });
  } finally {
    if (client) client.release();
  }
};

// =====================================================================
// PAYMENTS
// =====================================================================

// GET /api/payments
// Admin: all payments. Customer: own payments only.
const getPayments = async (req, res) => {
  try {
    const userId  = req.user.userId;
    const isAdmin = req.user.role === 'admin';
    const page    = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit   = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset  = (page - 1) * limit;
    const { status } = req.query;

    if (status && !PAYMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const conditions = [];
    const params = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`o.user_id = $${idx}`);
      params.push(userId);
      idx++;
    }

    if (status) {
      conditions.push(`pay.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM payment pay
       JOIN orders o ON o.order_id = pay.order_id
       ${whereClause}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT
         pay.payment_id, pay.order_id, pay.payment_method_id,
         pay.amount, pay.status,
         pay.created_at, pay.updated_at,
         pm.type AS payment_type
       FROM payment pay
       JOIN orders o ON o.order_id = pay.order_id
       LEFT JOIN payment_method pm ON pm.payment_method_id = pay.payment_method_id
       ${whereClause}
       ORDER BY pay.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      payments: result.rows.map(buildPaymentResponse),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// GET /api/payments/:id
// Admin can fetch any payment. Customer can only fetch their own.
const getPaymentById = async (req, res) => {
  try {
    const paymentId = parsePositiveInt(req.params.id);
    const userId    = req.user.userId;
    const isAdmin   = req.user.role === 'admin';

    if (!paymentId) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    const result = await pool.query(
      `SELECT
         pay.payment_id, pay.order_id, pay.payment_method_id,
         pay.amount, pay.status,
         pay.created_at, pay.updated_at,
         pm.type AS payment_type,
         o.user_id
       FROM payment pay
       JOIN orders o ON o.order_id = pay.order_id
       LEFT JOIN payment_method pm ON pm.payment_method_id = pay.payment_method_id
       WHERE pay.payment_id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = result.rows[0];

    if (!isAdmin && payment.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.status(200).json({ payment: buildPaymentResponse(payment) });
  } catch (error) {
    console.error('Get payment error:', error);
    return res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

// PATCH /api/payments/:id/status
// Admin only. Manually update payment status.
// Used for bKash/card gateway callbacks or manual corrections.
const updatePaymentStatus = async (req, res) => {
  try {
    const paymentId = parsePositiveInt(req.params.id);
    const status    = String(req.body?.status || '').trim();

    if (!paymentId) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    if (!PAYMENT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${PAYMENT_STATUSES.join(', ')}`
      });
    }

    const existing = await pool.query(
      'SELECT payment_id FROM payment WHERE payment_id = $1',
      [paymentId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const result = await pool.query(
      `UPDATE payment
       SET status = $1, updated_at = NOW()
       WHERE payment_id = $2
       RETURNING payment_id, order_id, payment_method_id,
                 amount, status, created_at, updated_at`,
      [status, paymentId]
    );

    return res.status(200).json({
      message: 'Payment status updated',
      payment: buildPaymentResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    return res.status(500).json({ error: 'Failed to update payment status' });
  }
};

module.exports = {
  // Payment methods
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  // Payments
  getPayments,
  getPaymentById,
  updatePaymentStatus
};