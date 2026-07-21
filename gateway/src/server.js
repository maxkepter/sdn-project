const app = require("./app");
const environment = require("./config/environment");
const { connectRabbitMQ } = require("./services/rabbitmq");

const startServer = async () => {
  await connectRabbitMQ();

  const server = app.listen(environment.port, () => {
    console.log(`Gateway running on port ${environment.port}`);
    console.log(`Backends: ${environment.backends.join(", ")}`);
  });

  process.on("unhandledRejection", (err) => {
    console.error(`Unhandled Rejection Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();
