const amqp = require("amqplib");
const environment = require("../config/environment");

let channel = null;

const connectRabbitMQ = async () => {
  try {
    const conn = await amqp.connect(environment.rabbitmqUrl);
    channel = await conn.createChannel();

    await channel.assertQueue("order.created", { durable: true });
    await channel.assertQueue("order.updated", { durable: true });
    await channel.assertQueue("payment.processed", { durable: true });

    console.log("RabbitMQ connected");
    return channel;
  } catch (err) {
    // ponytail: demo gateway can run without RabbitMQ; add retry/backoff before production.
    console.warn("RabbitMQ not available:", err.message);
    return null;
  }
};

const getRabbitMQStatus = () => (channel ? "connected" : "disconnected");

module.exports = { connectRabbitMQ, getRabbitMQStatus };
