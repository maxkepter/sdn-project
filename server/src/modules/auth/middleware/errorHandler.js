const environment = require("../../../config/environment");

/**
 * Global error handling middleware.
 * Catches errors forwarded by next(err) and sends a structured JSON response.
 * Exposes stack traces only in development mode.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    message: err.message || "Internal Server Error",
    ...(environment.env === "development" && { stack: err.stack }),
  };

  console.error(`[Error] ${err.message}`);
  res.status(statusCode).json(response);
};

module.exports = errorHandler;
