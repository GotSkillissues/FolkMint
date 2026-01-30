const express = require('express');
const { pool } = require("./config/database");

const app = express();
const PORT = 4000;

// Home - show available test routes
app.get('/', (req, res) => {
  res.json({
    message: 'FolkMint Test Server',
    routes: {
      '/products': 'Get all products',
      '/users': 'Get all users',
      '/categories': 'Get all categories',
      '/orders': 'Get all orders',
      '/query?sql=YOUR_QUERY': 'Run custom SELECT query'
    }
  });
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM product');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, username, email, first_name, last_name, role, created_at FROM users');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all categories
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM category');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "order"');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Custom query (SELECT only for safety)
app.get('/query', async (req, res) => {
  const { sql } = req.query;
  if (!sql) {
    return res.status(400).json({ error: 'Provide ?sql=YOUR_QUERY' });
  }
  if (!sql.trim().toLowerCase().startsWith('select')) {
    return res.status(400).json({ error: 'Only SELECT queries allowed' });
  }
  try {
    const result = await pool.query(sql);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});