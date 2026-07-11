const app = require("./app");
const environment = require("./config/environment");
const connectDatabase = require("./config/db");

const startServer = async () => {
  // Connect to the DB
  await connectDatabase();

  const server = app.listen(environment.port, () => {
    console.log(
      `Server running in ${environment.env} mode on port ${environment.port}`,
    );
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error(`Unhandled Rejection Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();
