const express = require("express");
const environment = require("../config/environment");
const { getRabbitMQStatus } = require("../services/rabbitmq");
const { getBackends } = require("../services/loadBalancer");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    gateway: environment.port,
    backends: environment.backends,
    rabbitmq: getRabbitMQStatus(),
  });
});

router.get("/backends", (req, res) => {
  res.json({
    backends: getBackends(),
  });
});

module.exports = router;
