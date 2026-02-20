// Coupon Controller - Handle discount coupon operations
const { pool } = require('../config/database');

// Get all coupons (Admin only)
const getCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 20, is_active } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let idx = 1;

    let query = 'SELECT * FROM coupon WHERE 1=1';

    if (is_active !== undefined) {
      query += ` AND is_active = $${idx}`;
      params.push(is_active === 'true');
      idx++;
    }

    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      coupons: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons: ' + error.message });
  }
};

// Get coupon by ID (Admin only)
const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM coupon WHERE coupon_id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.status(200).json({ coupon: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupon: ' + error.message });
  }
};

// Validate a coupon code (User-facing - returns discount info)
const validateCoupon = async (req, res) => {
  try {
    const { code, order_amount } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const result = await pool.query(
      'SELECT * FROM coupon WHERE code = $1',
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }

    const coupon = result.rows[0];

    if (!coupon.is_active) {
      return res.status(400).json({ error: 'This coupon is no longer active' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This coupon has expired' });
    }

    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'This coupon has reached its usage limit' });
    }

    if (order_amount && parseFloat(order_amount) < parseFloat(coupon.min_order_amount)) {
      return res.status(400).json({
        error: `Minimum order amount of ${coupon.min_order_amount} required for this coupon`
      });
    }

    // Calculate discount
    let discount_amount = 0;
    if (order_amount) {
      const amount = parseFloat(order_amount);
      if (coupon.type === 'percentage') {
        discount_amount = (amount * parseFloat(coupon.value)) / 100;
        if (coupon.max_discount_amount) {
          discount_amount = Math.min(discount_amount, parseFloat(coupon.max_discount_amount));
        }
      } else {
        discount_amount = Math.min(parseFloat(coupon.value), amount);
      }
      discount_amount = parseFloat(discount_amount.toFixed(2));
    }

    res.status(200).json({
      valid: true,
      coupon: {
        coupon_id: coupon.coupon_id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        min_order_amount: coupon.min_order_amount,
        max_discount_amount: coupon.max_discount_amount,
        expires_at: coupon.expires_at
      },
      discount_amount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate coupon: ' + error.message });
  }
};

// Create coupon (Admin only)
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      min_order_amount = 0,
      max_discount_amount = null,
      usage_limit = null,
      expires_at = null
    } = req.body;

    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'code, type, and value are required' });
    }

    const validTypes = ['percentage', 'fixed'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'type must be percentage or fixed' });
    }

    if (parseFloat(value) <= 0) {
      return res.status(400).json({ error: 'value must be greater than 0' });
    }

    if (type === 'percentage' && parseFloat(value) > 100) {
      return res.status(400).json({ error: 'Percentage value cannot exceed 100' });
    }

    const result = await pool.query(
      `INSERT INTO coupon (code, type, value, min_order_amount, max_discount_amount, usage_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [code.toUpperCase(), type, value, min_order_amount, max_discount_amount, usage_limit, expires_at]
    );

    res.status(201).json({ message: 'Coupon created', coupon: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: 'Failed to create coupon: ' + error.message });
  }
};

// Update coupon (Admin only)
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      type,
      value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      expires_at,
      is_active
    } = req.body;

    const existing = await pool.query('SELECT * FROM coupon WHERE coupon_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (code !== undefined) { fields.push(`code = $${idx}`); params.push(code.toUpperCase()); idx++; }
    if (type !== undefined) { fields.push(`type = $${idx}`); params.push(type); idx++; }
    if (value !== undefined) { fields.push(`value = $${idx}`); params.push(value); idx++; }
    if (min_order_amount !== undefined) { fields.push(`min_order_amount = $${idx}`); params.push(min_order_amount); idx++; }
    if (max_discount_amount !== undefined) { fields.push(`max_discount_amount = $${idx}`); params.push(max_discount_amount); idx++; }
    if (usage_limit !== undefined) { fields.push(`usage_limit = $${idx}`); params.push(usage_limit); idx++; }
    if (expires_at !== undefined) { fields.push(`expires_at = $${idx}`); params.push(expires_at); idx++; }
    if (is_active !== undefined) { fields.push(`is_active = $${idx}`); params.push(is_active); idx++; }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE coupon SET ${fields.join(', ')} WHERE coupon_id = $${idx} RETURNING *`,
      params
    );

    res.status(200).json({ message: 'Coupon updated', coupon: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: 'Failed to update coupon: ' + error.message });
  }
};

// Delete coupon (Admin only)
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM coupon WHERE coupon_id = $1 RETURNING coupon_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete coupon: ' + error.message });
  }
};

module.exports = {
  getCoupons,
  getCouponById,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
