const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const environment = require("../config/environment");
const { getBackend } = require("../services/loadBalancer");

const router = express.Router();

const proxyConfig = (target) => ({
  target,
  changeOrigin: true,
  pathRewrite: { "^/api": "/api" },
  onError: (err, req, res) => {
    console.error(`Proxy error to ${target}:`, err.message);
    res.status(502).json({ error: "Backend unavailable" });
  },
});

router.use("/api", (req, res, next) => {
  const target = getBackend();
  console.log(`${req.method} ${req.originalUrl} -> ${target}`);
  createProxyMiddleware(proxyConfig(target))(req, res, next);
});

router.use(
  "/uploads",
  createProxyMiddleware({
    target: environment.backends[0],
    changeOrigin: true,
    pathRewrite: { "^/uploads": "/uploads" },
  })
);

module.exports = router;
