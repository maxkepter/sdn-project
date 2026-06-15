const environment = require('./environment');

/**
 * Connect to the database.
 * Replace the placeholder logic below with your actual DB connection
 * (e.g. Mongoose, Sequelize, pg, etc.)
 */
const connectDatabase = async () => {
  try {
    console.log('Connecting to database at:', environment.databaseUrl);
    // Example: await mongoose.connect(environment.databaseUrl);
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
