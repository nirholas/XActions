// Vercel serverless entry point — wraps Express auth/user API
// by nichxbt
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import { generateSpec, generateWellKnown } from './openapi.js';
import { x402Middleware, x402HealthCheck, x402Pricing } from './middleware/x402.js';

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://xactions.app', 'https://x-actions.vercel.app', process.env.FRONTEND_URL].filter(Boolean)
    : true,
  credentials: true
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' }
});

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'xactions-api', timestamp: new Date().toISOString() });
});

// x402 discovery endpoints
app.get('/openapi.json', (req, res) => {
  res.type('application/json').json(generateSpec());
});

app.get('/.well-known/x402', (req, res) => {
  res.type('application/json').json(generateWellKnown());
});

// AI API — free info endpoints
app.get('/api/ai/health', x402HealthCheck);
app.get('/api/ai/pricing', x402Pricing);

// AI API — x402 payment gate for all paid endpoints
// The middleware returns 402 when no X-PAYMENT header is present.
// Actual AI execution is handled by the Railway deployment.
app.use('/api/ai', x402Middleware, (req, res) => {
  res.status(503).json({
    error: 'AI execution requires Railway deployment',
    message: 'Payment accepted. Connect to the Railway API for execution.',
  });
});

// Auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/user', userRoutes);

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
