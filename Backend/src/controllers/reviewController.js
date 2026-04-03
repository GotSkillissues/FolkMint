const { pool } = require('../config/database');

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeOptionalText = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed.length ? trimmed : null;
};

const buildReviewResponse = (row) => ({
  review_id:  row.review_id,
  rating:     row.rating,
  comment:    row.comment,
  user_id:    row.user_id,
  product_id: row.product_id,
  created_at: row.created_at,
  updated_at: row.updated_at
});

// GET /api/reviews
// Admin only. All reviews across all users with product + user info.
const getAllReviews = async (req, res) => {
  try {
    const page   = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;
    const rating = parsePositiveInt(req.query.rating);

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (rating) {
      conditions.push(`r.rating = $${idx}`);
      params.push(rating);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM review r ${whereClause}`,
      params
    );
    const total = countResult.rows[0].count;

    const result = await pool.query(
      `SELECT
         r.review_id, r.rating, r.comment,
         r.user_id, r.product_id,
         r.created_at, r.updated_at,
         u.first_name, u.last_name, u.email,
         p.name AS product_name,
         p.sku
       FROM review r
       JOIN users   u ON u.user_id    = r.user_id
       JOIN product p ON p.product_id = r.product_id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      reviews: result.rows.map(row => ({
        ...buildReviewResponse(row),
        first_name:   row.first_name  || null,
        last_name:    row.last_name   || null,
        email:        row.email,
        product_name: row.product_name,
        sku:          row.sku         || null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// GET /api/reviews/product/:productId
// Public. Paginated reviews for a product with summary.
const getProductReviews = async (req, res) => {
  try {
    const productId = parsePositiveInt(req.params.productId);
    const page      = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit     = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset    = (page - 1) * limit;

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const productCheck = await pool.query(
      'SELECT product_id FROM product WHERE product_id = $1 AND is_active = true',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM review WHERE product_id = $1',
      [productId]
    );
    const total = countResult.rows[0].count;

    const result = await pool.query(
      `SELECT
         r.review_id, r.rating, r.comment,
         r.user_id, r.product_id,
         r.created_at, r.updated_at,
         u.first_name, u.last_name
       FROM review r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    const summaryResult = await pool.query(
      'SELECT * FROM get_product_rating_distribution($1)',
      [productId]
    );

    const summary = summaryResult.rows[0];

    return res.status(200).json({
      summary: {
        total_reviews: summary.total_reviews,
        avg_rating:    summary.avg_rating ? String(summary.avg_rating) : '0.0',
        distribution: {
          5: summary.five_star,
          4: summary.four_star,
          3: summary.three_star,
          2: summary.two_star,
          1: summary.one_star
        }
      },
      reviews: result.rows.map((row) => ({
        ...buildReviewResponse(row),
        reviewer_name: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Anonymous'
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// Admin only. Returns all reviews across all users with product + user info.


// GET /api/reviews/my-reviews
// Authenticated. Returns all reviews written by the current user.
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page   = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM review WHERE user_id = $1',
      [userId]
    );
    const total = countResult.rows[0].count;

    const result = await pool.query(
      `SELECT
         r.review_id, r.rating, r.comment,
         r.user_id, r.product_id,
         r.created_at, r.updated_at,
         p.name AS product_name,
         p.sku  AS product_sku,
         (
           SELECT pi.image_url FROM product_image pi
           WHERE pi.product_id = p.product_id AND pi.is_primary = true
           LIMIT 1
         ) AS product_image
       FROM review r
       JOIN product p ON p.product_id = r.product_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return res.status(200).json({
      reviews: result.rows.map((row) => ({
        ...buildReviewResponse(row),
        product_name:  row.product_name,
        product_sku:   row.product_sku,
        product_image: row.product_image || null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// POST /api/reviews
// Authenticated. Creates a review.
// Backend enforces purchase check — user must have a delivered order
// containing this product before a review is allowed.
const createReview = async (req, res) => {
  try {
    const userId     = req.user.userId;
    const product_id = parsePositiveInt(req.body?.product_id);
    const rating     = Number.parseInt(req.body?.rating, 10);
    const comment    = normalizeOptionalText(req.body?.comment);

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const callResult = await pool.query(
      'CALL submit_review($1, $2, $3, $4, NULL)',
      [userId, product_id, rating, comment]
    );

    const reviewId = callResult.rows?.[0]?.p_review_id;
    const result = await pool.query(
      `SELECT review_id, rating, comment, user_id, product_id, created_at, updated_at
       FROM review
       WHERE review_id = $1`,
      [reviewId]
    );

    return res.status(201).json({
      message: 'Review submitted successfully',
      review:  buildReviewResponse(result.rows[0])
    });
  } catch (error) {
    const message = String(error?.message || '');

    if (message.includes('Product not found')) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (message.includes('You can only review products you have purchased and received')) {
      return res.status(403).json({
        error: 'You can only review products you have purchased and received'
      });
    }

    if (message.includes('You have already reviewed this product') || error.code === '23505') {
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }

    console.error('Create review error:', error);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
};

// PATCH /api/reviews/:id
// Authenticated. User can only edit their own review.
// Only rating and comment are editable.
const updateReview = async (req, res) => {
  try {
    const userId   = req.user.userId;
    const reviewId = parsePositiveInt(req.params.id);

    if (!reviewId) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const existing = await pool.query(
      'SELECT review_id, user_id FROM review WHERE review_id = $1',
      [reviewId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }

    const body    = req.body || {};
    const updates = [];
    const params  = [];
    let idx       = 1;

    if (Object.prototype.hasOwnProperty.call(body, 'rating')) {
      const rating = Number.parseInt(body.rating, 10);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      updates.push(`rating = $${idx}`);
      params.push(rating);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'comment')) {
      updates.push(`comment = $${idx}`);
      params.push(normalizeOptionalText(body.comment));
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(reviewId);

    const result = await pool.query(
      `UPDATE review
       SET ${updates.join(', ')}
       WHERE review_id = $${idx}
       RETURNING review_id, rating, comment, user_id, product_id, created_at, updated_at`,
      params
    );

    return res.status(200).json({
      message: 'Review updated successfully',
      review:  buildReviewResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Update review error:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
};

// DELETE /api/reviews/:id
// User can delete their own review.
// Admin can delete any review.
const deleteReview = async (req, res) => {
  try {
    const userId   = req.user.userId;
    const isAdmin  = req.user.role === 'admin';
    const reviewId = parsePositiveInt(req.params.id);

    if (!reviewId) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const existing = await pool.query(
      'SELECT review_id, user_id FROM review WHERE review_id = $1',
      [reviewId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!isAdmin && existing.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await pool.query('DELETE FROM review WHERE review_id = $1', [reviewId]);

    return res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
};

module.exports = {
  getAllReviews,
  getProductReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
};