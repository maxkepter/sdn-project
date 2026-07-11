const mongoose = require("mongoose");
const environment = require("./environment");

const connectDatabase = async () => {
  try {
    console.log("Connecting to database at:", environment.databaseUrl);
    await mongoose.connect(environment.databaseUrl);
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
