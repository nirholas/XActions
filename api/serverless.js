// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Vercel serverless entry point — wraps Express auth/user API
// by nichxbt
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { paymentGatePath } from './utils/paymentGatePath.js';

dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import twitterRoutes from './routes/twitter.js';
import videoRoutes from './routes/video.js';
import unfollowersRoutes from './routes/unfollowers.js';
import askRoutes from './routes/ask.js';
import { generateSpec, generateWellKnown } from './openapi.js';
import {
  PAY_TO_ADDRESS,
  FACILITATOR_URL,
  NETWORK,
  AI_OPERATION_PRICES,
  isX402Configured,
  operationForPath,
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
// Express 5's parsers leave req.body undefined when none of them ran (no body,
// or another content type); handlers read fields off it, as they could on 4.
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

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
  // Compared the way Express routes it, so a mixed-case path cannot skip it.
  const gatePath = paymentGatePath(req.path);
  if (!gatePath.startsWith('/api/ai/')) return next();

  // Free endpoints pass through
  if (
    gatePath === '/api/ai/health' ||
    gatePath === '/api/ai/pricing'
  ) return next();

  // A payment header is not proof of payment: anyone can set a header, and this
  // entry point has no facilitator client to check one with. It also executes no
  // AI work (every /api/ai/* route below answers 503), so the honest answer to a
  // paid call here is "not deployed", not "payment accepted".
  if (req.headers['x-payment'] || req.headers['payment-signature']) {
    return res.status(503).json({
      error: 'AI_EXECUTION_UNAVAILABLE',
      message:
        'This deployment serves the payment terms only; it does not execute AI operations and cannot verify or settle a payment. ' +
        'Nothing was charged. Call the endpoint on a deployment that runs the full backend.',
      docs: 'https://github.com/nirholas/XActions/blob/main/docs/x402.md',
    });
  }

  if (!isX402Configured()) return next();

  // Derive the operation from the whole path, the same way every other gate
  // does, so a three-segment route is not read as its first two.
  const operation = operationForPath(req.path);
  const price = operation ? AI_OPERATION_PRICES[operation] : null;
  if (!price) return next(); // free or unknown endpoint — pass through

  // Convert dollar price to USDC atomic units (6 decimals: 1 USDC = 1_000_000 units)
  const dollarAmount = parseFloat(price.replace('$', ''));
  const maxAmount = Math.round(dollarAmount * 1_000_000).toString();

  const url = `https://xactions.app${req.path}`;
  const method = req.method;
  const asset = USDC_ADDRESSES[NETWORK] || USDC_ADDRESSES['eip155:8453'];

  const payload = {
    x402Version: 2,
    resource: {
      url,
      method,
      description: `XActions AI API — ${operation || 'ai operation'}`,
      mimeType: 'application/json',
    },
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK,
        amount: maxAmount,
        asset,
        payTo: PAY_TO_ADDRESS,
        maxTimeoutSeconds: 300,
        extra: {
          name: 'USD Coin',
          version: '2',
        },
      },
    ],
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  res.status(402)
    .set('payment-required', encoded)
    .set('content-type', 'application/json')
    .end();
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

// Ask XActions: keyless free LLM lanes, so it runs on the serverless tier too
app.use('/api/ask', askRoutes);

// x402 payment gate — intercepts unpaid POST requests to /api/ai/*
app.use(x402Gate);

// AI API — catch-all after x402 gate (payment verified, execution on Railway)
app.use('/api/ai', (req, res) => {
  res.status(503).json({
    error: 'AI_EXECUTION_UNAVAILABLE',
    message:
      'This deployment publishes the x402 terms but does not execute AI operations. Nothing was charged.',
    docs: 'https://github.com/nirholas/XActions/blob/main/docs/x402.md',
  });
});

// Auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);

// Twitter OAuth routes
app.use('/api/twitter', twitterRoutes);

// User routes
app.use('/api/user', userRoutes);

// Video routes
app.use('/api/video', videoRoutes);

// Unfollower tracking routes (stats, changes, chart, schedule — scan requires Railway)
app.use('/api/unfollowers', unfollowersRoutes);

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
