const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const environment = require("./config/environment");
const routes = require("./modules/auth/routes");
const errorHandler = require("./modules/auth/middleware/errorHandler");

const app = express();

// Security headers (relax for dev)
app.use(helmet({ crossOriginResourcePolicy: false }));

// Cross-origin resource sharing
app.use(cors({ origin: environment.clientUrl, credentials: true }));

// HTTP request logger
app.use(environment.env === "development" ? morgan("dev") : morgan("combined"));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// API routes
app.use("/api/v1", routes);

// Public listing creation (no auth required)
const listingsRoutes = require("./modules/listings/routes/listingsRoutes");
app.use("/api/v1/listings", listingsRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global error handler
app.use(errorHandler);

module.exports = app;
