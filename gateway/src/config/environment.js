require("dotenv").config();

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 8080,
  backends: (process.env.BACKENDS || "http://localhost:5001,http://localhost:5002,http://localhost:5003")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  rabbitmqUrl: process.env.RABBITMQ_URL || "amqp://localhost:5672",
};
