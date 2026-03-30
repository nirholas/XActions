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
import {
  PAY_TO_ADDRESS,
  FACILITATOR_URL,
  NETWORK,
  AI_OPERATION_PRICES,
  isX402Configured,
} from './config/x402-config.js';

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

// USDC contract addresses per network
const USDC_ADDRESSES = {
  'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',   // Base
  'eip155:84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',  // Base Sepolia
  'eip155:42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',  // Arbitrum
  'eip155:10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',     // Optimism
  'eip155:137': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',    // Polygon
  'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',      // Ethereum
};

/**
 * Inline x402 payment gate — returns 402 for /api/ai/* paid routes
 * without requiring the full @x402/express SDK.
 */
function x402Gate(req, res, next) {
  const isAiPath = req.path.startsWith('/api/ai/');
  if (!isAiPath) return next();

  // Free endpoints pass through
  if (
    req.path === '/api/ai/' ||
    req.path === '/api/ai/health' ||
    req.path === '/api/ai/pricing'
  ) return next();

  // Only intercept POST requests to paid routes
  if (req.method !== 'POST') return next();

  // Check if already has payment header
  if (req.headers['x-payment']) return next();

  if (!isX402Configured()) return next();

  // Derive operation from path
  const match = req.path.match(/^\/api\/ai\/([^/]+)\/([^/]+)/);
  const operation = match ? `${match[1]}:${match[2]}` : null;
  const price = operation ? AI_OPERATION_PRICES[operation] : null;
  const maxAmount = price ? price.replace('$', '') : '0.001';

  const resource = `https://xactions.app${req.path}`;
  const asset = USDC_ADDRESSES[NETWORK] || USDC_ADDRESSES['eip155:8453'];

  res.status(402).json({
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK,
        maxAmountRequired: maxAmount,
        resource,
        description: `XActions AI API — ${operation || 'ai operation'}`,
        mimeType: 'application/json',
        payTo: PAY_TO_ADDRESS,
        maxTimeoutSeconds: 300,
        asset,
        extra: {
          name: 'USD Coin',
          version: '2',
        },
      },
    ],
    error: 'Payment Required',
  });
}

// AI API — free info endpoints
app.get('/api/ai/health', (req, res) => {
  res.json({
    service: 'XActions AI API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    x402: {
      enabled: isX402Configured(),
      version: 2,
      facilitator: FACILITATOR_URL,
      payTo: PAY_TO_ADDRESS,
    },
  });
});

app.get('/api/ai/pricing', (req, res) => {
  res.json({ pricing: AI_OPERATION_PRICES });
});

// x402 payment gate — intercepts unpaid POST requests to /api/ai/*
app.use(x402Gate);

// AI API — catch-all after x402 gate (payment verified, execution on Railway)
app.use('/api/ai', (req, res) => {
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
