const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const { securityHeaders } = require('./middleware/securityMiddleware');
const { requestLogger } = require('./middleware/requestLoggerMiddleware');
const { apiLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimitMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

const app = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (file://, curl, Postman) or from allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// --- Global Middleware ---
app.use(securityHeaders);                               // HTTP security headers
app.use(cors(corsOptions));                             // CORS
app.use(express.json());                                // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));        // Parse URL-encoded bodies
app.use(requestLogger);                                 // Log every request

// --- Static Files ---
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- Rate Limiters (applied per route group) ---
app.use('/api/auth', authLimiter);                      // Strict: 10 req / 15 min
app.use('/api/upload', uploadLimiter);                  // 20 uploads / hour
app.use('/api', apiLimiter);                            // General: 100 req / 15 min

// --- Routes ---
app.use('/api', routes);

// --- Health Check ---
app.get('/', (req, res) => {
  res.status(200).json({ message: 'FolkMint API is running' });
});

// --- 404 & Error Handlers (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
