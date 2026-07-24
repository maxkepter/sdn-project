const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

// Rate-limit window is expressed in minutes (matches the ConfigMap
// `RATE_LIMIT_WINDOW_MIN` and `RATE_LIMIT_MAX` keys declared in
// server/deploy/k8s/05-backend-config.yaml). We accept either the
// minute-based or the legacy millisecond-based env var so local .env
// files can still override at sub-minute granularity if needed.
const rateLimitWindowMin = parseInt(process.env.RATE_LIMIT_WINDOW_MIN, 10);
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX, 10);

let rateLimitWindowMsResolved;
if (Number.isFinite(rateLimitWindowMs) && rateLimitWindowMs > 0) {
  rateLimitWindowMsResolved = rateLimitWindowMs;
} else if (Number.isFinite(rateLimitWindowMin) && rateLimitWindowMin > 0) {
  rateLimitWindowMsResolved = rateLimitWindowMin * 60 * 1000;
} else {
  rateLimitWindowMsResolved = 15 * 60 * 1000;
}

module.exports = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "fallback_secret",
  rateLimit: {
    windowMs: rateLimitWindowMsResolved,
    // 0 / số âm → tắt rate-limit (dùng cho load-test hoặc khi muốn bypass).
    // Không hợp lệ / undefined → fallback 500 như cũ.
    max: Number.isFinite(rateLimitMax) ? rateLimitMax : 500,
  },
};

