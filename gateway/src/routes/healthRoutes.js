const express = require("express");
const environment = require("../config/environment");
const { getRabbitMQStatus } = require("../services/rabbitmq");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    gateway: environment.port,
    backends: environment.backends,
    rabbitmq: getRabbitMQStatus(),
  });
});

module.exports = router;
