/**
 * Global Express error handler.
 * Returns a JSON error response with stack trace in development.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  console.error(`[Error] ${status} — ${err.message}`);

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
