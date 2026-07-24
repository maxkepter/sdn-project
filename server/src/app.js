const express = require("express");
const path = require("path");
const os = require("os");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const environment = require("./config/environment");
const routes = require("./modules/auth/routes");
const errorHandler = require("./modules/auth/middleware/errorHandler");
const { httpLogger } = require("./modules/auth/middleware/httpLogger");
const rateLimit = require("express-rate-limit");

const app = express();

const limiter = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  max: environment.rateLimit.max,
  message: {
    status: 429,
    message: "Too many requests, please try again later.",
  },
});

// Security headers (relax for dev)
app.use(helmet({ crossOriginResourcePolicy: false }));

// Cross-origin resource sharing
app.use(cors({ origin: environment.clientUrl, credentials: true }));

// Attach the backend pod's hostname to every response so that load
// balancer tests can attribute each request to a specific pod without
// having to target /health. The header is cheap and harmless for
// non-load-testing clients; K8s probes only check HTTP 200 and ignore
// extra headers.
const BACKEND_INSTANCE = os.hostname();
app.use((req, res, next) => {
  res.set("X-Backend-Instance", BACKEND_INSTANCE);
  next();
});

// HTTP request logger
// app.use(environment.env === "development" ? morgan("dev") : morgan("combined"));
app.use(httpLogger);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files — use UPLOAD_DIR if set, else default
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "../public/uploads");
app.use("/uploads", express.static(uploadDir));

// Rate limiting
app.use(limiter);

// API routes
app.use("/api/v1", routes);

const storeRoutes = require("./modules/store/routes/storeRoutes");
app.use("/api/v1/store", storeRoutes);

// Public listing creation (no auth required)
const listingsRoutes = require("./modules/listings/routes/listingsRoutes");
app.use("/api/v1/listings", listingsRoutes);

// Health check endpoint
// Exposes pod hostname via JSON body and `X-Backend-Instance` response
// header so load-balancer tests can attribute each request to a specific
// pod. K8s startup/liveness/readiness probes only check HTTP 200 and are
// unaffected by the extra header/field.
app.get("/health", (req, res) => {
  const hostname = os.hostname();
  res.set("X-Backend-Instance", hostname);
  res.status(200).json({
    status: "OK",
    timestamp: new Date(),
    hostname,
  });
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
