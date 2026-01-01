const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  // Warn about default secrets
  if (process.env.JWT_SECRET?.includes('change-this')) {
    console.warn('⚠️  Warning: Using default JWT_SECRET - please set a secure value!');
  }
}

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const operationRoutes = require('./routes/operations');
const webhookRoutes = require('./routes/webhooks');
const twitterRoutes = require('./routes/twitter');
const sessionAuthRoutes = require('./routes/session-auth');
const paymentsRoutes = require('./routes/payments');
const cryptoPaymentsRoutes = require('./routes/crypto-payments');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing (except for webhooks which need raw body)
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'xactions-api', timestamp: new Date().toISOString() });
});

// Serve dashboard static files
app.use(express.static(path.join(__dirname, '../dashboard')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/session', sessionAuthRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/crypto', cryptoPaymentsRoutes);

// Dashboard routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/pricing.html'));
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/docs.html'));
});

app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/features.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 XActions API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

