const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const environment = require("../config/environment");
const {
  getBackend,
  getBackends,
  markUnhealthy,
} = require("../services/loadBalancer");

const router = express.Router();

// Single proxy instance for all /api traffic.
const apiProxy = createProxyMiddleware({
  target: environment.backends[0], // fallback
  router: (req) => {
    // If the pre-proxy middleware already selected a backend, use it to avoid double round-robin advancement.
    const target = req.selectedBackend || getBackend();
    req.selectedBackend = target;
    return target || environment.backends[0];
  },
  changeOrigin: true,
  pathRewrite: { "^/api": "/api" },
  onError: (err, req, res) => {
    const target = req.selectedBackend || "unknown";
    console.error(`[proxyRoutes] Error proxying to ${target}: ${err.message}`);
    if (target && target !== "unknown") {
      markUnhealthy(target);
    }
    if (!res.headersSent) {
      res.status(502).json({ error: "Backend unavailable" });
    }
  },
});

// Pre-proxy middleware to check backend health and fail fast
router.use("/api", (req, res, next) => {
  const target = getBackend();
  if (!target) {
    return res.status(503).json({
      error: "Service Unavailable",
      message: "No healthy backends available",
      backends: getBackends(),
    });
  }
  req.selectedBackend = target;
  return next();
});

router.use("/api", apiProxy);

// Single proxy instance for uploads
const uploadsProxy = createProxyMiddleware({
  target: environment.backends[0],
  changeOrigin: true,
  pathRewrite: { "^/uploads": "/uploads" },
});

router.use("/uploads", uploadsProxy);

module.exports = router;