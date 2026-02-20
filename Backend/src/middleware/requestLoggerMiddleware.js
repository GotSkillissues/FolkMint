// Request Logger Middleware
// Logs: method, path, status code, response time, and IP
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Intercept res.end to capture status + timing after response is sent
  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method.padEnd(7);
    const path = req.originalUrl || req.url;
    const ip = req.ip || req.socket?.remoteAddress || '-';

    // Colour-code by status range
    let statusLabel;
    if (status >= 500) statusLabel = `\x1b[31m${status}\x1b[0m`;      // red
    else if (status >= 400) statusLabel = `\x1b[33m${status}\x1b[0m`; // yellow
    else if (status >= 300) statusLabel = `\x1b[36m${status}\x1b[0m`; // cyan
    else statusLabel = `\x1b[32m${status}\x1b[0m`;                    // green

    console.log(`${method} ${path} ${statusLabel} ${duration}ms — ${ip}`);
    return originalEnd(...args);
  };

  next();
};

module.exports = { requestLogger };
