import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import operationRoutes from './routes/operations.js';
import twitterRoutes from './routes/twitter.js';
import sessionAuthRoutes from './routes/session-auth.js';
import licenseRoutes from './routes/license.js';
import adminRoutes from './routes/admin.js';
// AI API routes - modular structure optimized for AI agent consumption
import aiRoutes from './routes/ai/index.js';
import { initializeSocketIO } from './realtime/socketHandler.js';
import { initializeLicensing, brandingMiddleware } from './services/licensing.js';

// x402 Payment Protocol for AI Agents
import { x402Middleware, x402HealthCheck, x402Pricing } from './middleware/x402.js';
import aiDetectorMiddleware from './middleware/ai-detector.js';
import { validateConfig as validateX402Config } from './config/x402-config.js';

// Payment routes archived - XActions is now 100% free and open-source
// Archived files moved to: archive/backend/
// - payments.js (Stripe)
// - crypto-payments.js (Coinbase, NOWPayments)
// - webhooks.js (payment webhooks)
// 
// NEW: AI agents pay per API call via x402 protocol
// Humans continue to use free browser scripts

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io for real-time browser-to-browser communication
const io = initializeSocketIO(httpServer);

// 42 is the answer to life, the universe, and everything
// But 3001 is the answer to local development
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://xactions.app', process.env.FRONTEND_URL].filter(Boolean)
    : true, // Allow all origins in development
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login/register attempts per 15 min
  message: { error: 'Too many attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// AI Agent Detection - adds req.isAI and req.agentType
app.use(aiDetectorMiddleware);

// x402 Payment Middleware - protects /api/ai/* routes with crypto payments
// Humans use free browser scripts; AI agents pay per API call
app.use(x402Middleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'xactions-api', timestamp: new Date().toISOString() });
});

// x402 AI API endpoints (health check, pricing info - no payment required)
app.get('/api/ai/health', x402HealthCheck);
app.get('/api/ai/pricing', x402Pricing);

// AI Agent paid endpoints (protected by x402 middleware)
app.use('/api/ai', aiRoutes);

// Serve dashboard static files
app.use(express.static(path.join(__dirname, '../dashboard')));

// Branding middleware - injects "Powered by XActions" if no license
app.use(brandingMiddleware());

// Routes
// Payment routes archived - XActions is now 100% free and open-source
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/session', sessionAuthRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/admin', adminRoutes);

// Dashboard routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

// Pricing page now redirects to docs - XActions is 100% free
app.get('/pricing', (req, res) => {
  res.redirect('/docs');
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/docs.html'));
});

app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/features.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/admin.html'));
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

// Use httpServer instead of app.listen for Socket.io support
httpServer.listen(PORT, async () => {
  console.log(`🚀 XActions API Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time connections`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Validate x402 configuration
  const x402Validation = validateX402Config();
  if (!x402Validation.valid) {
    x402Validation.errors.forEach(e => console.error(`❌ x402: ${e}`));
  }
  x402Validation.warnings?.forEach(w => console.warn(`⚠️  x402: ${w}`));
  console.log(`💰 x402 AI monetization: Humans free, AI agents pay per call`);
  
  // Initialize licensing and telemetry
  await initializeLicensing();
});

export default app;

