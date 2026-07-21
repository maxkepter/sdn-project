const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "fallback_secret",
  rateLimit: {
    windowMs:
      parseInt(process.env.RATE_LIMIT_WINDOW_MS) * 60 * 100 || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 500,
  },
};
