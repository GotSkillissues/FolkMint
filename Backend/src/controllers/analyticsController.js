const { pool } = require('../config/database');

// All endpoints in this controller are admin only.
// Route middleware should enforce this before reaching these handlers.

// GET /api/analytics/dashboard
// Overview stats for the admin dashboard.
const getDashboardStats = async (req, res) => {
  try {
    const [
      revenueResult,
      ordersResult,
      usersResult,
      productsResult,
      pendingOrdersResult,
      lowStockResult
    ] = await Promise.all([
      // Revenue — exclude cancelled orders
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount), 0)::text AS total_revenue,
          COALESCE(
            SUM(
              CASE
                WHEN created_at >= NOW() - INTERVAL '30 days' THEN total_amount
                ELSE 0
              END
            ),
            0
          )::text AS revenue_last_30_days,
          COALESCE(
            SUM(
              CASE
                WHEN created_at >= NOW() - INTERVAL '7 days' THEN total_amount
                ELSE 0
              END
            ),
            0
          )::text AS revenue_last_7_days
        FROM orders
        WHERE status != 'cancelled'
      `),

      // Order counts
      pool.query(`
        SELECT
          COUNT(*)::int AS total_orders,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS orders_last_30_days,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS orders_last_7_days,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders
        FROM orders
      `),

      // Customer counts
      pool.query(`
        SELECT
          COUNT(*)::int AS total_customers,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_last_30_days,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_last_7_days
        FROM users
        WHERE role = 'customer'
      `),

      // Product counts
      pool.query(`
        SELECT
          COUNT(*)::int AS total_products,
          COUNT(*) FILTER (WHERE is_active = true)::int AS active_products,
          COUNT(*) FILTER (WHERE is_active = false)::int AS inactive_products
        FROM product
      `),

      // Pending orders needing attention
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM orders
        WHERE status = 'pending'
      `),

      // Low stock variants for active products only — stock between 1 and 5
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM product_variant pv
        JOIN product p ON p.product_id = pv.product_id
        WHERE pv.stock_quantity > 0
          AND pv.stock_quantity <= 5
          AND p.is_active = true
      `)
    ]);

    return res.status(200).json({
      revenue: {
        total: revenueResult.rows[0].total_revenue,
        last_30_days: revenueResult.rows[0].revenue_last_30_days,
        last_7_days: revenueResult.rows[0].revenue_last_7_days
      },
      orders: {
        total: ordersResult.rows[0].total_orders,
        last_30_days: ordersResult.rows[0].orders_last_30_days,
        last_7_days: ordersResult.rows[0].orders_last_7_days,
        pending: ordersResult.rows[0].pending_orders
      },
      customers: {
        total: usersResult.rows[0].total_customers,
        new_last_30_days: usersResult.rows[0].new_last_30_days,
        new_last_7_days: usersResult.rows[0].new_last_7_days
      },
      products: {
        total: productsResult.rows[0].total_products,
        active: productsResult.rows[0].active_products,
        inactive: productsResult.rows[0].inactive_products
      },
      alerts: {
        pending_orders: pendingOrdersResult.rows[0].count,
        low_stock_variants: lowStockResult.rows[0].count
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// GET /api/analytics/sales
// Sales over time. Grouped by day, week, or month.
// Query params: ?period=daily|weekly|monthly&days=30
const getSalesReport = async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const days = Math.min(365, Math.max(1, Number.parseInt(req.query.days, 10) || 30));

    const PERIOD_MAP = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month'
    };

    if (!PERIOD_MAP[period]) {
      return res.status(400).json({
        error: 'Invalid period. Must be daily, weekly, or monthly'
      });
    }

    const dateTrunc = PERIOD_MAP[period];

    const result = await pool.query(
      `SELECT
         DATE_TRUNC($1, created_at) AS period_start,
         COUNT(*)::int AS order_count,
         COALESCE(SUM(total_amount), 0)::text AS revenue,
         COALESCE(AVG(total_amount), 0)::text AS avg_order_value
       FROM orders
       WHERE status != 'cancelled'
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY DATE_TRUNC($1, created_at)
       ORDER BY period_start ASC`,
      [dateTrunc, days]
    );

    return res.status(200).json({
      period,
      days,
      data: result.rows
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    return res.status(500).json({ error: 'Failed to fetch sales report' });
  }
};

// GET /api/analytics/top-products
// Best performing products by revenue, quantity, or order count.
// Query params: ?sort_by=revenue|quantity|orders&limit=10
const getTopProducts = async (req, res) => {
  try {
    const sort_by = req.query.sort_by || 'revenue';
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));

    const SORT_MAP = {
      revenue: 'total_revenue_numeric DESC',
      quantity: 'total_quantity DESC',
      orders: 'order_count DESC'
    };

    if (!SORT_MAP[sort_by]) {
      return res.status(400).json({
        error: 'Invalid sort_by. Must be revenue, quantity, or orders'
      });
    }

    const result = await pool.query(
      `SELECT
         p.product_id,
         p.name,
         p.sku,
         p.price::text,
         c.name AS category_name,
         COUNT(DISTINCT o.order_id)::int AS order_count,
         COALESCE(
           SUM(CASE WHEN o.order_id IS NOT NULL THEN oi.quantity ELSE 0 END),
           0
         )::int AS total_quantity,
         COALESCE(
           SUM(CASE WHEN o.order_id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END),
           0
         )::text AS total_revenue,
         COALESCE(
           SUM(CASE WHEN o.order_id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END),
           0
         ) AS total_revenue_numeric,
         (
           SELECT pi.image_url
           FROM product_image pi
           WHERE pi.product_id = p.product_id
             AND pi.is_primary = true
           LIMIT 1
         ) AS primary_image
       FROM product p
       LEFT JOIN order_item oi ON oi.product_id = p.product_id
       LEFT JOIN orders o
         ON o.order_id = oi.order_id
        AND o.status != 'cancelled'
       LEFT JOIN category c ON c.category_id = p.category_id
       WHERE p.is_active = true
       GROUP BY p.product_id, p.name, p.sku, p.price, c.name
       ORDER BY ${SORT_MAP[sort_by]}, p.name ASC
       LIMIT $1`,
      [limit]
    );

    return res.status(200).json({
      sort_by,
      products: result.rows.map(({ total_revenue_numeric, ...row }) => row)
    });
  } catch (error) {
    console.error('Get top products error:', error);
    return res.status(500).json({ error: 'Failed to fetch top products' });
  }
};

// GET /api/analytics/orders/status-breakdown
// Count and percentage of orders by status.
const getOrderStatusBreakdown = async (req, res) => {
  try {
    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM orders'
    );
    const total = totalResult.rows[0].total;

    const result = await pool.query(
      `SELECT
         status,
         COUNT(*)::int AS count,
         COALESCE(SUM(total_amount), 0)::text AS total_value
       FROM orders
       GROUP BY status
       ORDER BY count DESC`
    );

    const breakdown = result.rows.map((row) => ({
      status: row.status,
      count: row.count,
      total_value: row.total_value,
      percentage: total > 0
        ? parseFloat(((row.count / total) * 100).toFixed(1))
        : 0
    }));

    return res.status(200).json({ total_orders: total, breakdown });
  } catch (error) {
    console.error('Get order status breakdown error:', error);
    return res.status(500).json({ error: 'Failed to fetch order breakdown' });
  }
};

// GET /api/analytics/low-stock
// Variants with stock at or below threshold for active products.
// Query params: ?threshold=5&page=1&limit=20
const getLowStockProducts = async (req, res) => {
  try {
    const threshold = Math.max(0, Number.parseInt(req.query.threshold, 10) || 5);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       WHERE pv.stock_quantity <= $1
         AND p.is_active = true`,
      [threshold]
    );
    const total = countResult.rows[0].count;

    const result = await pool.query(
      `SELECT
         pv.variant_id,
         pv.size,
         pv.stock_quantity,
         p.product_id,
         p.name AS product_name,
         p.sku AS product_sku,
         c.name AS category_name,
         (
           SELECT pi.image_url
           FROM product_image pi
           WHERE pi.product_id = p.product_id
             AND pi.is_primary = true
           LIMIT 1
         ) AS primary_image
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       LEFT JOIN category c ON c.category_id = p.category_id
       WHERE pv.stock_quantity <= $1
         AND p.is_active = true
       ORDER BY pv.stock_quantity ASC, p.name ASC
       LIMIT $2 OFFSET $3`,
      [threshold, limit, offset]
    );

    return res.status(200).json({
      threshold,
      variants: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    return res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
};

// GET /api/analytics/categories
// Revenue and sales per category, excluding cancelled orders.
const getCategoryPerformance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.category_id,
         c.name,
         c.category_slug,
         c.depth,
         COUNT(DISTINCT p.product_id)::int AS product_count,
         COALESCE(
           SUM(CASE WHEN o.order_id IS NOT NULL THEN oi.quantity ELSE 0 END),
           0
         )::int AS items_sold,
         COALESCE(
           SUM(CASE WHEN o.order_id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END),
           0
         )::text AS total_revenue,
         COALESCE(
           SUM(CASE WHEN o.order_id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END),
           0
         ) AS total_revenue_numeric
       FROM category c
       LEFT JOIN product p ON p.category_id = c.category_id
       LEFT JOIN order_item oi ON oi.product_id = p.product_id
       LEFT JOIN orders o
         ON o.order_id = oi.order_id
        AND o.status != 'cancelled'
       GROUP BY c.category_id, c.name, c.category_slug, c.depth
       ORDER BY total_revenue_numeric DESC, c.name ASC`
    );

    return res.status(200).json({
      categories: result.rows.map(({ total_revenue_numeric, ...row }) => row)
    });
  } catch (error) {
    console.error('Get category performance error:', error);
    return res.status(500).json({ error: 'Failed to fetch category performance' });
  }
};

// GET /api/analytics/recent-activity
// Recent orders and new users for the admin dashboard feed.
// Query params: ?limit=10
const getRecentActivity = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));

    const [ordersResult, usersResult] = await Promise.all([
      pool.query(
        `SELECT
           o.order_id,
           o.status,
           o.total_amount::text,
           o.created_at,
           u.user_id,
           u.email,
           u.first_name,
           u.last_name
         FROM orders o
         JOIN users u ON u.user_id = o.user_id
         ORDER BY o.created_at DESC
         LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT
           user_id, email, first_name, last_name, role, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      )
    ]);

    return res.status(200).json({
      recent_orders: ordersResult.rows,
      recent_users: usersResult.rows
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    return res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

// GET /api/analytics/reviews
// Review stats across all products — useful for spotting quality issues.
const getReviewStats = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_reviews,
         ROUND(AVG(rating)::numeric, 2)::text AS avg_rating,
         COUNT(*) FILTER (WHERE rating = 5)::int AS five_star,
         COUNT(*) FILTER (WHERE rating = 4)::int AS four_star,
         COUNT(*) FILTER (WHERE rating = 3)::int AS three_star,
         COUNT(*) FILTER (WHERE rating = 2)::int AS two_star,
         COUNT(*) FILTER (WHERE rating = 1)::int AS one_star
       FROM review`
    );

    const topReviewedResult = await pool.query(
      `SELECT
         p.product_id,
         p.name,
         p.sku,
         COUNT(r.review_id)::int AS review_count,
         ROUND(AVG(r.rating)::numeric, 1)::text AS avg_rating
       FROM review r
       JOIN product p ON p.product_id = r.product_id
       GROUP BY p.product_id, p.name, p.sku
       ORDER BY review_count DESC
       LIMIT 10`
    );

    const lowRatedResult = await pool.query(
      `SELECT
         p.product_id,
         p.name,
         p.sku,
         COUNT(r.review_id)::int AS review_count,
         ROUND(AVG(r.rating)::numeric, 1)::text AS avg_rating
       FROM review r
       JOIN product p ON p.product_id = r.product_id
       GROUP BY p.product_id, p.name, p.sku
       HAVING COUNT(r.review_id) >= 3
       ORDER BY AVG(r.rating) ASC, review_count DESC
       LIMIT 10`
    );

    return res.status(200).json({
      summary: result.rows[0],
      top_reviewed: topReviewedResult.rows,
      low_rated: lowRatedResult.rows
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch review stats' });
  }

};

 // GET /api/analytics
  // General-purpose analytics aggregate.
  // Combines revenue, orders, customers, products, and top-line sales
  // into a single response. Accepts optional query params to scope the data:
  //   ?days=30       — lookback window for time-series data (default 30, max 365)
  //   ?period=daily|weekly|monthly  — grouping for the sales series (default daily)
  const getAnalytics = async (req, res) => {
    try {
      const days = Math.min(365, Math.max(1, Number.parseInt(req.query.days, 10) || 30));
      const period = ['daily', 'weekly', 'monthly'].includes(req.query.period)
        ? req.query.period
        : 'daily';

      const PERIOD_MAP = { daily: 'day', weekly: 'week', monthly: 'month' };
      const dateTrunc = PERIOD_MAP[period];

      const [
        revenueResult,
        ordersResult,
        usersResult,
        productsResult,
        salesSeriesResult,
        statusResult,
        topProductsResult
      ] = await Promise.all([

        // Revenue totals — exclude cancelled
        pool.query(`
        SELECT
          COALESCE(SUM(total_amount), 0)::text                                        AS total_revenue,
          COALESCE(SUM(total_amount) FILTER (
            WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL), 0)::text          AS period_revenue,
          COALESCE(AVG(total_amount) FILTER (
            WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL), 0)::text          AS avg_order_value
        FROM orders
        WHERE status != 'cancelled'
      `, [days]),

        // Order counts
        pool.query(`
        SELECT
          COUNT(*)::int                                                                 AS total_orders,
          COUNT(*) FILTER (WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL)::int AS period_orders,
          COUNT(*) FILTER (WHERE status = 'pending')::int                              AS pending_orders,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int                            AS cancelled_orders
        FROM orders
      `, [days]),

        // Customer counts
        pool.query(`
        SELECT
          COUNT(*)::int                                                                 AS total_customers,
          COUNT(*) FILTER (WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL)::int AS new_customers
        FROM users
        WHERE role = 'customer'
      `, [days]),

        // Product counts + low stock alert count
        pool.query(`
        SELECT
          COUNT(*)::int                                               AS total_products,
          COUNT(*) FILTER (WHERE is_active = true)::int              AS active_products,
          (
            SELECT COUNT(*)::int
            FROM product_variant pv
            JOIN product p2 ON p2.product_id = pv.product_id
            WHERE pv.stock_quantity <= 5 AND p2.is_active = true
          )                                                           AS low_stock_count
        FROM product
      `),

        // Sales time series grouped by period
        pool.query(`
        SELECT
          DATE_TRUNC($1, created_at)         AS period_start,
          COUNT(*)::int                      AS order_count,
          COALESCE(SUM(total_amount), 0)::text AS revenue
        FROM orders
        WHERE status != 'cancelled'
          AND created_at >= NOW() - ($2 || ' days')::INTERVAL
        GROUP BY DATE_TRUNC($1, created_at)
        ORDER BY period_start ASC
      `, [dateTrunc, days]),

        // Order status breakdown
        pool.query(`
        SELECT
          status,
          COUNT(*)::int                        AS count,
          COALESCE(SUM(total_amount), 0)::text AS total_value
        FROM orders
        GROUP BY status
        ORDER BY count DESC
      `),

        // Top 5 products by revenue in the window
        pool.query(`
        SELECT
          p.product_id,
          p.name,
          COALESCE(SUM(oi.quantity * oi.unit_price), 0)::text AS revenue,
          COALESCE(SUM(oi.quantity), 0)::int                  AS units_sold
        FROM product p
        JOIN order_item oi ON oi.product_id = p.product_id
        JOIN orders o      ON o.order_id = oi.order_id
          AND o.status != 'cancelled'
          AND o.created_at >= NOW() - ($1 || ' days')::INTERVAL
        GROUP BY p.product_id, p.name
        ORDER BY SUM(oi.quantity * oi.unit_price) DESC
        LIMIT 5
      `, [days])
      ]);

      return res.status(200).json({
        period,
        days,
        revenue: {
          total: revenueResult.rows[0].total_revenue,
          period_total: revenueResult.rows[0].period_revenue,
          avg_order_value: revenueResult.rows[0].avg_order_value,
        },
        orders: {
          total: ordersResult.rows[0].total_orders,
          period: ordersResult.rows[0].period_orders,
          pending: ordersResult.rows[0].pending_orders,
          cancelled: ordersResult.rows[0].cancelled_orders,
        },
        customers: {
          total: usersResult.rows[0].total_customers,
          new: usersResult.rows[0].new_customers,
        },
        products: {
          total: productsResult.rows[0].total_products,
          active: productsResult.rows[0].active_products,
          low_stock_count: productsResult.rows[0].low_stock_count,
        },
        sales_series: salesSeriesResult.rows,
        order_status: statusResult.rows,
        top_products: topProductsResult.rows,
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

module.exports = {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getOrderStatusBreakdown,
  getLowStockProducts,
  getCategoryPerformance,
  getRecentActivity,
  getReviewStats,
  getAnalytics,
};