const express = require("express");
const healthRoutes = require("./routes/healthRoutes");
const proxyRoutes = require("./routes/proxyRoutes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/health", healthRoutes);
app.use(proxyRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Not Found - ${req.originalUrl}` });
});

module.exports = app;
