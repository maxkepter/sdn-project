const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const environment = require('./config/environment');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers
app.use(helmet());

// Cross-origin resource sharing
app.use(cors({ origin: environment.clientUrl, credentials: true }));

// HTTP request logger
app.use(environment.env === 'development' ? morgan('dev') : morgan('combined'));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/v1', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global error handler
app.use(errorHandler);

module.exports = app;
