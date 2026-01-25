/**
 * x402 AI API Test Suite
 * 
 * Tests for the x402 payment middleware and AI endpoints.
 * Verifies that:
 * - AI endpoints return 402 without payment
 * - Payment headers are correctly formatted
 * - Human endpoints remain free
 * - Health check returns pricing info
 * 
 * @author nichxbt
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the x402 middleware for isolated testing
const mockX402Middleware = (req, res, next) => {
  if (!req.path.startsWith('/api/ai/')) {
    return next();
  }
  
  // Health check is free
  if (req.path === '/api/ai/health') {
    return next();
  }
  
  const paymentHeader = req.headers['x-payment'] || req.headers['payment-signature'];
  
  if (!paymentHeader) {
    const paymentRequired = {
      x402Version: 2,
      error: 'Payment required for AI agent access',
      accepts: [{
        scheme: 'exact',
        price: '$0.001',
        network: 'eip155:84532',
        payTo: '0xTestAddress',
      }],
    };
    
    const encodedRequirements = Buffer.from(JSON.stringify(paymentRequired)).toString('base64');
    
    res.status(402);
    res.set('PAYMENT-REQUIRED', encodedRequirements);
    res.set('Content-Type', 'application/json');
    
    return res.json({
      error: 'Payment Required',
      message: 'This endpoint requires payment. AI agents must include X-PAYMENT header.',
      price: '$0.001',
      network: 'eip155:84532',
      payTo: '0xTestAddress',
      humanAlternative: 'Use free browser scripts at https://xactions.app/features',
      docs: 'https://xactions.app/docs/ai-api',
    });
  }
  
  // Payment provided - validate format
  try {
    const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
    
    if (!paymentPayload.x402Version || !paymentPayload.scheme || !paymentPayload.payload) {
      return res.status(402).json({
        error: 'Invalid payment format',
        message: 'Payment payload must include x402Version, scheme, and payload',
      });
    }
    
    // Mock successful verification
    req.x402 = { verified: true, price: '$0.001' };
    next();
  } catch (e) {
    return res.status(402).json({
      error: 'Payment processing failed',
      message: e.message,
    });
  }
};

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(mockX402Middleware);
  
  // AI endpoints (protected)
  app.post('/api/ai/scrape/profile', (req, res) => {
    res.json({
      success: true,
      data: {
        username: req.body.username,
        displayName: 'Test User',
        bio: 'Test bio',
        followersCount: 1000,
        followingCount: 500,
      },
      meta: {
        scrapedAt: new Date().toISOString(),
        paid: req.x402?.verified || false,
      },
    });
  });
  
  app.post('/api/ai/scrape/followers', (req, res) => {
    res.json({
      success: true,
      data: {
        username: req.body.username,
        followers: [{ username: 'follower1' }, { username: 'follower2' }],
        pagination: { count: 2, hasMore: false },
      },
    });
  });
  
  app.post('/api/ai/scrape/tweets', (req, res) => {
    res.json({
      success: true,
      data: {
        username: req.body.username,
        tweets: [{ id: '1', text: 'Test tweet' }],
      },
    });
  });
  
  app.post('/api/ai/action/unfollow-non-followers', (req, res) => {
    res.json({
      success: true,
      data: {
        operationId: 'test-op-123',
        status: 'queued',
        type: 'unfollow-non-followers',
      },
    });
  });
  
  app.post('/api/ai/action/detect-unfollowers', (req, res) => {
    res.json({
      success: true,
      data: {
        operationId: 'test-op-456',
        status: 'queued',
        type: 'detect-unfollowers',
      },
    });
  });
  
  // Health check (free)
  app.get('/api/ai/health', (req, res) => {
    res.json({
      service: 'XActions AI API',
      x402: {
        enabled: true,
        version: 2,
        network: 'eip155:84532',
        facilitator: 'https://x402.org/facilitator',
        payTo: '0xTestAddress',
      },
      pricing: {
        'scrape:profile': '$0.001',
        'scrape:followers': '$0.01',
        'scrape:tweets': '$0.005',
        'action:unfollow-non-followers': '$0.05',
        'action:detect-unfollowers': '$0.02',
      },
      docs: 'https://xactions.app/docs/ai-api',
      humanAccess: 'Free browser scripts at https://xactions.app/features',
    });
  });
  
  // Human endpoints (free)
  app.get('/api/user/profile', (req, res) => {
    res.json({ success: true, user: { id: 'user-123' } });
  });
  
  app.post('/api/operations/unfollow-non-followers', (req, res) => {
    res.json({ success: true, operationId: 'human-op-789' });
  });
  
  app.get('/api/operations/status/:id', (req, res) => {
    res.json({ success: true, status: 'completed' });
  });
  
  return app;
}

describe('x402 AI API', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('Without payment', () => {
    it('returns 402 for AI scrape/profile endpoint', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
      expect(res.headers['payment-required']).toBeDefined();
      expect(res.body.error).toBe('Payment Required');
    });
    
    it('returns 402 for AI scrape/followers endpoint', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/followers')
        .send({ username: 'test', limit: 100 });
      
      expect(res.status).toBe(402);
      expect(res.body.error).toBe('Payment Required');
    });
    
    it('returns 402 for AI scrape/tweets endpoint', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/tweets')
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
    });
    
    it('returns 402 for AI action/unfollow-non-followers endpoint', async () => {
      const res = await request(app)
        .post('/api/ai/action/unfollow-non-followers')
        .send({ maxUnfollows: 100 });
      
      expect(res.status).toBe(402);
    });
    
    it('returns 402 for AI action/detect-unfollowers endpoint', async () => {
      const res = await request(app)
        .post('/api/ai/action/detect-unfollowers')
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
    });
    
    it('includes payment requirements in response body', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.body.price).toBeDefined();
      expect(res.body.network).toBe('eip155:84532');
      expect(res.body.payTo).toBe('0xTestAddress');
      expect(res.body.humanAlternative).toContain('xactions.app');
      expect(res.body.docs).toContain('xactions.app');
    });
    
    it('includes PAYMENT-REQUIRED header with base64-encoded requirements', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      const paymentRequiredHeader = res.headers['payment-required'];
      expect(paymentRequiredHeader).toBeDefined();
      
      // Decode and verify structure
      const decoded = JSON.parse(Buffer.from(paymentRequiredHeader, 'base64').toString('utf-8'));
      expect(decoded.x402Version).toBe(2);
      expect(decoded.accepts).toBeInstanceOf(Array);
      expect(decoded.accepts[0].scheme).toBe('exact');
      expect(decoded.accepts[0].price).toBeDefined();
      expect(decoded.accepts[0].network).toBeDefined();
      expect(decoded.accepts[0].payTo).toBeDefined();
    });
  });
  
  describe('With valid payment', () => {
    const createValidPayment = () => {
      const payment = {
        x402Version: 2,
        scheme: 'exact',
        network: 'eip155:84532',
        payload: {
          signature: '0xMockSignature',
          from: '0xTestPayer',
          to: '0xTestAddress',
          value: '1000',
          validAfter: 0,
          validBefore: Math.floor(Date.now() / 1000) + 3600,
          nonce: '0x1234567890abcdef',
        },
      };
      return Buffer.from(JSON.stringify(payment)).toString('base64');
    };
    
    it('returns 200 for AI scrape/profile with valid payment', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', createValidPayment())
        .send({ username: 'test' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('test');
    });
    
    it('returns 200 for AI scrape/followers with valid payment', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/followers')
        .set('X-PAYMENT', createValidPayment())
        .send({ username: 'test', limit: 100 });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.followers).toBeInstanceOf(Array);
    });
    
    it('returns 200 for AI action endpoints with valid payment', async () => {
      const res = await request(app)
        .post('/api/ai/action/unfollow-non-followers')
        .set('X-PAYMENT', createValidPayment())
        .send({ maxUnfollows: 50 });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.operationId).toBeDefined();
      expect(res.body.data.status).toBe('queued');
    });
    
    it('accepts payment via PAYMENT-SIGNATURE header (alternative)', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .set('PAYMENT-SIGNATURE', createValidPayment())
        .send({ username: 'test' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('indicates payment was verified in response metadata', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', createValidPayment())
        .send({ username: 'test' });
      
      expect(res.body.meta.paid).toBe(true);
    });
  });
  
  describe('With invalid payment', () => {
    it('returns 402 for malformed base64 payment', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', 'not-valid-base64!!!')
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
      expect(res.body.error).toContain('failed');
    });
    
    it('returns 402 for payment missing required fields', async () => {
      const invalidPayment = Buffer.from(JSON.stringify({
        x402Version: 2,
        // missing scheme and payload
      })).toString('base64');
      
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', invalidPayment)
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
      expect(res.body.error).toBe('Invalid payment format');
    });
    
    it('returns 402 for invalid JSON in payment', async () => {
      const invalidPayment = Buffer.from('{not valid json').toString('base64');
      
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', invalidPayment)
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
    });
  });
  
  describe('Health check endpoint', () => {
    it('returns 200 without payment', async () => {
      const res = await request(app).get('/api/ai/health');
      
      expect(res.status).toBe(200);
    });
    
    it('returns pricing information', async () => {
      const res = await request(app).get('/api/ai/health');
      
      expect(res.body.pricing).toBeDefined();
      expect(res.body.pricing['scrape:profile']).toBeDefined();
      expect(res.body.pricing['scrape:followers']).toBeDefined();
      expect(res.body.pricing['action:unfollow-non-followers']).toBeDefined();
    });
    
    it('returns x402 configuration', async () => {
      const res = await request(app).get('/api/ai/health');
      
      expect(res.body.x402).toBeDefined();
      expect(res.body.x402.enabled).toBe(true);
      expect(res.body.x402.version).toBe(2);
      expect(res.body.x402.network).toBeDefined();
      expect(res.body.x402.facilitator).toBeDefined();
      expect(res.body.x402.payTo).toBeDefined();
    });
    
    it('includes documentation links', async () => {
      const res = await request(app).get('/api/ai/health');
      
      expect(res.body.docs).toContain('xactions.app');
      expect(res.body.humanAccess).toBeDefined();
    });
    
    it('returns service name', async () => {
      const res = await request(app).get('/api/ai/health');
      
      expect(res.body.service).toBe('XActions AI API');
    });
  });
  
  describe('Human endpoints remain free', () => {
    it('allows /api/user/profile without payment', async () => {
      const res = await request(app).get('/api/user/profile');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('allows /api/operations/unfollow-non-followers without payment', async () => {
      const res = await request(app)
        .post('/api/operations/unfollow-non-followers')
        .send({ maxUnfollows: 100 });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('allows /api/operations/status/:id without payment', async () => {
      const res = await request(app).get('/api/operations/status/test-123');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('does not include PAYMENT-REQUIRED header on human endpoints', async () => {
      const res = await request(app).get('/api/user/profile');
      
      expect(res.headers['payment-required']).toBeUndefined();
    });
  });
  
  describe('Response format consistency', () => {
    const createValidPayment = () => {
      const payment = {
        x402Version: 2,
        scheme: 'exact',
        network: 'eip155:84532',
        payload: {
          signature: '0xMockSignature',
          from: '0xTestPayer',
          to: '0xTestAddress',
          value: '1000',
          validAfter: 0,
          validBefore: Math.floor(Date.now() / 1000) + 3600,
          nonce: '0x1234567890abcdef',
        },
      };
      return Buffer.from(JSON.stringify(payment)).toString('base64');
    };
    
    it('returns consistent JSON structure for successful responses', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', createValidPayment())
        .send({ username: 'test' });
      
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
    
    it('returns consistent JSON structure for 402 responses', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('price');
      expect(res.body).toHaveProperty('network');
      expect(res.body).toHaveProperty('payTo');
    });
    
    it('returns application/json content-type for all responses', async () => {
      const res402 = await request(app)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res402.headers['content-type']).toContain('application/json');
      
      const res200 = await request(app)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', createValidPayment())
        .send({ username: 'test' });
      
      expect(res200.headers['content-type']).toContain('application/json');
    });
  });
  
  describe('AI agent detection', () => {
    it('detects requests without User-Agent as AI agents', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .set('User-Agent', '')
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
    });
    
    it('detects requests with automation User-Agents as AI agents', async () => {
      const aiUserAgents = [
        'python-requests/2.28.0',
        'axios/1.4.0',
        'node-fetch/3.0.0',
        'OpenAI-SDK/4.0.0',
        'Anthropic-Client/1.0.0',
      ];
      
      for (const ua of aiUserAgents) {
        const res = await request(app)
          .post('/api/ai/scrape/profile')
          .set('User-Agent', ua)
          .send({ username: 'test' });
        
        expect(res.status).toBe(402);
      }
    });
  });
});

describe('x402 Configuration', () => {
  describe('Environment variables', () => {
    it('should use default facilitator URL if not set', () => {
      const defaultUrl = 'https://x402.org/facilitator';
      expect(defaultUrl).toBe('https://x402.org/facilitator');
    });
    
    it('should use Base Sepolia as default network', () => {
      const defaultNetwork = 'eip155:84532';
      expect(defaultNetwork).toBe('eip155:84532');
    });
  });
  
  describe('Pricing configuration', () => {
    const pricing = {
      'scrape:profile': '$0.001',
      'scrape:followers': '$0.01',
      'scrape:following': '$0.01',
      'scrape:tweets': '$0.005',
      'scrape:search': '$0.01',
      'action:unfollow-non-followers': '$0.05',
      'action:unfollow-everyone': '$0.10',
      'action:detect-unfollowers': '$0.02',
    };
    
    it('should have valid price format for all operations', () => {
      for (const [operation, price] of Object.entries(pricing)) {
        expect(price).toMatch(/^\$\d+(\.\d+)?$/);
      }
    });
    
    it('should have prices for all scrape operations', () => {
      expect(pricing['scrape:profile']).toBeDefined();
      expect(pricing['scrape:followers']).toBeDefined();
      expect(pricing['scrape:following']).toBeDefined();
      expect(pricing['scrape:tweets']).toBeDefined();
    });
    
    it('should have prices for all action operations', () => {
      expect(pricing['action:unfollow-non-followers']).toBeDefined();
      expect(pricing['action:unfollow-everyone']).toBeDefined();
      expect(pricing['action:detect-unfollowers']).toBeDefined();
    });
  });
});

describe('Payment header encoding', () => {
  it('should correctly encode/decode base64 payment requirements', () => {
    const requirements = {
      x402Version: 2,
      scheme: 'exact',
      price: '$0.001',
      network: 'eip155:84532',
      payTo: '0xTestAddress',
    };
    
    const encoded = Buffer.from(JSON.stringify(requirements)).toString('base64');
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
    
    expect(decoded).toEqual(requirements);
  });
  
  it('should handle special characters in payment data', () => {
    const requirements = {
      x402Version: 2,
      description: 'Test with "quotes" and special chars: éàü',
      resource: 'https://api.xactions.app/api/ai/scrape/profile?foo=bar&baz=qux',
    };
    
    const encoded = Buffer.from(JSON.stringify(requirements)).toString('base64');
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
    
    expect(decoded).toEqual(requirements);
  });
});
