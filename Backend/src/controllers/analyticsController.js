// Admin Analytics Controller - Business intelligence and reporting
const { pool } = require('../config/database');

// Dashboard overview stats
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
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN total_amount ELSE 0 END), 0) as revenue_last_30_days,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN total_amount ELSE 0 END), 0) as revenue_last_7_days
        FROM orders WHERE status != 'cancelled'
      `),
      pool.query(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as orders_last_30_days,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as orders_last_7_days
        FROM orders
      `),
      pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_last_30_days,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_last_7_days
        FROM users WHERE role = 'customer'
      `),
      pool.query('SELECT COUNT(*) as total_products FROM product'),
      pool.query(`SELECT COUNT(*) as pending_orders FROM orders WHERE status = 'pending'`),
      pool.query(`
        SELECT COUNT(*) as low_stock_variants
        FROM product_variant WHERE stock_quantity > 0 AND stock_quantity <= 5
      `)
    ]);

    res.status(200).json({
      revenue: revenueResult.rows[0],
      orders: ordersResult.rows[0],
      users: usersResult.rows[0],
      products: productsResult.rows[0],
      alerts: {
        pending_orders: parseInt(pendingOrdersResult.rows[0].pending_orders),
        low_stock_variants: parseInt(lowStockResult.rows[0].low_stock_variants)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats: ' + error.message });
  }
};

// Sales report over time (daily/weekly/monthly)
const getSalesReport = async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;

    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'period must be daily, weekly, or monthly' });
    }

    let dateTrunc;
    if (period === 'daily') dateTrunc = 'day';
    else if (period === 'weekly') dateTrunc = 'week';
    else dateTrunc = 'month';

    const result = await pool.query(
      `SELECT
         DATE_TRUNC($1, created_at) as period_start,
         COUNT(*) as order_count,
         COALESCE(SUM(total_amount), 0) as revenue,
         COALESCE(AVG(total_amount), 0) as avg_order_value
       FROM orders
       WHERE status != 'cancelled'
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY DATE_TRUNC($1, created_at)
       ORDER BY period_start ASC`,
      [dateTrunc, parseInt(days)]
    );

    res.status(200).json({ period, days: parseInt(days), data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales report: ' + error.message });
  }
};

// Top selling products
const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, sort_by = 'revenue' } = req.query;

    const validSorts = ['revenue', 'quantity', 'orders'];
    if (!validSorts.includes(sort_by)) {
      return res.status(400).json({ error: 'sort_by must be revenue, quantity, or orders' });
    }

    let orderBy;
    if (sort_by === 'revenue') orderBy = 'total_revenue DESC';
    else if (sort_by === 'quantity') orderBy = 'total_quantity DESC';
    else orderBy = 'order_count DESC';

    const result = await pool.query(
      `SELECT
         p.product_id, p.name, p.base_price,
         c.name as category_name,
         COUNT(DISTINCT oi.order_id) as order_count,
         COALESCE(SUM(oi.quantity), 0) as total_quantity,
         COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
         (SELECT pi.image_url FROM product_image pi
          JOIN product_variant pv ON pi.variant_id = pv.variant_id
          WHERE pv.product_id = p.product_id LIMIT 1) as image_url
       FROM product p
       LEFT JOIN product_variant pv ON p.product_id = pv.product_id
       LEFT JOIN order_item oi ON pv.variant_id = oi.variant_id
       LEFT JOIN orders o ON oi.order_id = o.order_id AND o.status != 'cancelled'
       JOIN category c ON p.category_id = c.category_id
       GROUP BY p.product_id, p.name, p.base_price, c.name
       ORDER BY ${orderBy}
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.status(200).json({ sort_by, products: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top products: ' + error.message });
  }
};

// Order status breakdown
const getOrderStatusBreakdown = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_value
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);

    const totalResult = await pool.query('SELECT COUNT(*) as total FROM orders');
    const total = parseInt(totalResult.rows[0].total);

    const breakdown = result.rows.map(row => ({
      ...row,
      percentage: total > 0 ? parseFloat(((row.count / total) * 100).toFixed(1)) : 0
    }));

    res.status(200).json({ total_orders: total, breakdown });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order breakdown: ' + error.message });
  }
};

// Low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const { threshold = 5, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM product_variant WHERE stock_quantity <= $1`,
      [parseInt(threshold)]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT
         pv.variant_id, pv.size, pv.color, pv.stock_quantity, pv.price,
         p.product_id, p.name as product_name,
         c.name as category_name
       FROM product_variant pv
       JOIN product p ON pv.product_id = p.product_id
       JOIN category c ON p.category_id = c.category_id
       WHERE pv.stock_quantity <= $1
       ORDER BY pv.stock_quantity ASC
       LIMIT $2 OFFSET $3`,
      [parseInt(threshold), parseInt(limit), offset]
    );

    res.status(200).json({
      threshold: parseInt(threshold),
      variants: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch low stock products: ' + error.message });
  }
};

// Recent activity feed (recent orders + new users)
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [ordersResult, usersResult] = await Promise.all([
      pool.query(
        `SELECT
           o.order_id, o.status, o.total_amount, o.created_at,
           u.username, u.email
         FROM orders o
         JOIN users u ON o.user_id = u.user_id
         ORDER BY o.created_at DESC
         LIMIT $1`,
        [parseInt(limit)]
      ),
      pool.query(
        `SELECT user_id, username, email, role, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1`,
        [parseInt(limit)]
      )
    ]);

    res.status(200).json({
      recent_orders: ordersResult.rows,
      recent_users: usersResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent activity: ' + error.message });
  }
};

// Category performance
const getCategoryPerformance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.category_id, c.name,
        COUNT(DISTINCT p.product_id) as product_count,
        COUNT(DISTINCT oi.order_item_id) as items_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue
      FROM category c
      LEFT JOIN product p ON c.category_id = p.category_id
      LEFT JOIN product_variant pv ON p.product_id = pv.product_id
      LEFT JOIN order_item oi ON pv.variant_id = oi.variant_id
      GROUP BY c.category_id, c.name
      ORDER BY total_revenue DESC
    `);

    res.status(200).json({ categories: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category performance: ' + error.message });
  }
};

module.exports = {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getOrderStatusBreakdown,
  getLowStockProducts,
  getRecentActivity,
  getCategoryPerformance
};
