// Review Controller - Handle review-related operations
const { pool } = require('../config/database');

// Get reviews (optionally filtered by product)
const getReviews = async (req, res) => {
  try {
    const { product_id, page = 1, limit = 10, rating } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, u.username, u.first_name, u.last_name,
             p.name as product_name
      FROM review r
      JOIN users u ON r.user_id = u.user_id
      JOIN product p ON r.product_id = p.product_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (product_id) {
      query += ` AND r.product_id = $${idx}`;
      params.push(product_id);
      idx++;
    }

    if (rating) {
      query += ` AND r.rating = $${idx}`;
      params.push(rating);
      idx++;
    }

    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY r.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get average rating if product filter applied
    let averageRating = null;
    if (product_id) {
      const avgResult = await pool.query(
        'SELECT AVG(rating)::numeric(2,1) as avg_rating, COUNT(*) as review_count FROM review WHERE product_id = $1',
        [product_id]
      );
      averageRating = {
        average: parseFloat(avgResult.rows[0].avg_rating) || 0,
        count: parseInt(avgResult.rows[0].review_count)
      };
    }

    res.status(200).json({
      reviews: result.rows,
      rating_summary: averageRating,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews: ' + error.message });
  }
};

// Get review by ID
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, u.username, u.first_name, u.last_name, p.name as product_name
       FROM review r
       JOIN users u ON r.user_id = u.user_id
       JOIN product p ON r.product_id = p.product_id
       WHERE r.review_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.status(200).json({ review: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review: ' + error.message });
  }
};

// Create review
const createReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id, rating, comment } = req.body;

    if (!product_id || !rating) {
      return res.status(400).json({ error: 'Product ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify product exists
    const productExists = await pool.query(
      'SELECT product_id FROM product WHERE product_id = $1',
      [product_id]
    );

    if (productExists.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user has purchased this product (optional verification)
    const hasPurchased = await pool.query(
      `SELECT oi.order_item_id FROM order_item oi
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
       LIMIT 1`,
      [userId, product_id]
    );

    // Check if user already reviewed this product
    const existingReview = await pool.query(
      'SELECT review_id FROM review WHERE user_id = $1 AND product_id = $2',
      [userId, product_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }

    const result = await pool.query(
      `INSERT INTO review (user_id, product_id, rating, comment, verified_purchase)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, product_id, rating, comment, hasPurchased.rows.length > 0]
    );

    res.status(201).json({ message: 'Review created', review: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review: ' + error.message });
  }
};

// Update review
const updateReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { rating, comment } = req.body;
    const isAdmin = req.user.role === 'admin';

    // Verify ownership (unless admin)
    const existing = await pool.query(
      'SELECT * FROM review WHERE review_id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!isAdmin && existing.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      updates.push(`rating = $${idx}`);
      params.push(rating);
      idx++;
    }
    if (comment !== undefined) {
      updates.push(`comment = $${idx}`);
      params.push(comment);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE review SET ${updates.join(', ')} WHERE review_id = $${idx}
       RETURNING *`,
      params
    );

    res.status(200).json({ message: 'Review updated', review: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review: ' + error.message });
  }
};

// Delete review
const deleteReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    // Verify ownership (unless admin)
    const existing = await pool.query(
      'SELECT user_id FROM review WHERE review_id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!isAdmin && existing.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM review WHERE review_id = $1', [id]);

    res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review: ' + error.message });
  }
};

// Get product review summary
const getProductReviewSummary = async (req, res) => {
  try {
    const { product_id } = req.params;

    // Get average and count
    const summaryResult = await pool.query(
      `SELECT 
         AVG(rating)::numeric(2,1) as average_rating,
         COUNT(*) as total_reviews,
         COUNT(*) FILTER (WHERE rating = 5) as five_star,
         COUNT(*) FILTER (WHERE rating = 4) as four_star,
         COUNT(*) FILTER (WHERE rating = 3) as three_star,
         COUNT(*) FILTER (WHERE rating = 2) as two_star,
         COUNT(*) FILTER (WHERE rating = 1) as one_star,
         COUNT(*) FILTER (WHERE verified_purchase = true) as verified_purchases
       FROM review WHERE product_id = $1`,
      [product_id]
    );

    if (summaryResult.rows[0].total_reviews === '0') {
      return res.status(200).json({
        summary: {
          average_rating: 0,
          total_reviews: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          verified_purchases: 0
        }
      });
    }

    const summary = summaryResult.rows[0];

    res.status(200).json({
      summary: {
        average_rating: parseFloat(summary.average_rating) || 0,
        total_reviews: parseInt(summary.total_reviews),
        distribution: {
          5: parseInt(summary.five_star),
          4: parseInt(summary.four_star),
          3: parseInt(summary.three_star),
          2: parseInt(summary.two_star),
          1: parseInt(summary.one_star)
        },
        verified_purchases: parseInt(summary.verified_purchases)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary: ' + error.message });
  }
};

// Get user's reviews
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM review WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT r.*, p.name as product_name,
              (SELECT url FROM product_image WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as product_image
       FROM review r
       JOIN product p ON r.product_id = p.product_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.status(200).json({
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews: ' + error.message });
  }
};

module.exports = {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getProductReviewSummary,
  getUserReviews
};
