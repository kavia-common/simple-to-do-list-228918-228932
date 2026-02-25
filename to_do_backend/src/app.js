const cors = require('cors');
const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');
const { initDb } = require('./services/db');

// Initialize express app
const app = express();

// Initialize database schema (idempotent). Any error will be logged; requests may fail if DB isn't available.
initDb().catch((err) => {
  console.error('Failed to initialize SQLite schema:', err);
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.set('trust proxy', true);

// Serve raw OpenAPI JSON at /openapi.json
app.get('/openapi.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host'); // may or may not include port
  let protocol = req.protocol; // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');

  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
     (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Parse JSON request body
app.use(express.json());

// Mount routes
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  // Support "expected" errors thrown from services.
  const status = err.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;

  if (status >= 500) {
    console.error(err.stack);
  }

  res.status(status).json({
    message: status === 500 ? 'Internal Server Error' : err.message,
  });
});

module.exports = app;

