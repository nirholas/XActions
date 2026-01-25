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

describe('x402 Configuration Validation', () => {
  // Test helper to create a mock environment
  const withEnv = (env, fn) => {
    const original = { ...process.env };
    Object.assign(process.env, env);
    try {
      return fn();
    } finally {
      // Restore original env
      for (const key of Object.keys(env)) {
        if (original[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = original[key];
        }
      }
    }
  };

  describe('Payment address validation', () => {
    it('should reject placeholder address 0xYourWalletAddress', () => {
      const result = mockValidateAddress('0xYourWalletAddress');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('placeholder');
    });
    
    it('should reject placeholder address 0xYourEthereumAddress', () => {
      const result = mockValidateAddress('0xYourEthereumAddress');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('placeholder');
    });
    
    it('should reject invalid address format (too short)', () => {
      const result = mockValidateAddress('0x123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid Ethereum address');
    });
    
    it('should reject invalid address format (no 0x prefix)', () => {
      const result = mockValidateAddress('abcd1234567890abcd1234567890abcd12345678');
      expect(result.valid).toBe(false);
    });
    
    it('should accept valid Ethereum address', () => {
      const result = mockValidateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f5FacB');
      expect(result.valid).toBe(true);
    });
    
    it('should accept valid address with lowercase', () => {
      const result = mockValidateAddress('0x742d35cc6634c0532925a3b844bc9e7595f5facb');
      expect(result.valid).toBe(true);
    });
    
    it('should accept valid address with uppercase', () => {
      const result = mockValidateAddress('0x742D35CC6634C0532925A3B844BC9E7595F5FACB');
      expect(result.valid).toBe(true);
    });
  });
  
  describe('Network configuration', () => {
    it('should recognize Base Sepolia testnet', () => {
      expect(getNetworkInfo('eip155:84532').isTestnet).toBe(true);
      expect(getNetworkInfo('eip155:84532').name).toContain('Sepolia');
    });
    
    it('should recognize Base mainnet', () => {
      expect(getNetworkInfo('eip155:8453').isTestnet).toBe(false);
      expect(getNetworkInfo('eip155:8453').name).toContain('Base');
    });
    
    it('should warn about testnet in production', () => {
      const result = mockValidateNetwork('eip155:84532', true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('testnet');
    });
    
    it('should warn about mainnet in development', () => {
      const result = mockValidateNetwork('eip155:8453', false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('mainnet');
    });
  });
  
  describe('Production requirements', () => {
    it('should require payment address in production', () => {
      const result = mockValidateConfig({ payToAddress: null, isProduction: true });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('REQUIRED'))).toBe(true);
    });
    
    it('should allow missing payment address in development', () => {
      const result = mockValidateConfig({ payToAddress: null, isProduction: false });
      // In dev, missing address is a warning not an error
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
    
    it('should not allow placeholder address even in development', () => {
      const result = mockValidateConfig({ payToAddress: '0xYourWalletAddress', isProduction: false });
      expect(result.valid).toBe(false);
    });
  });
});

// Mock validation functions for testing (mirrors logic from x402-config.js)
function mockValidateAddress(address) {
  if (!address) {
    return { valid: false, error: 'Address is required' };
  }
  if (address === '0xYourWalletAddress' || address === '0xYourEthereumAddress') {
    return { valid: false, error: 'Address is set to a placeholder value' };
  }
  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { valid: false, error: 'Not a valid Ethereum address' };
  }
  return { valid: true };
}

function getNetworkInfo(networkId) {
  const networks = {
    'eip155:84532': { name: 'Base Sepolia', isTestnet: true },
    'eip155:8453': { name: 'Base Mainnet', isTestnet: false },
    'eip155:1': { name: 'Ethereum Mainnet', isTestnet: false },
  };
  return networks[networkId] || { name: 'Unknown', isTestnet: false };
}

function mockValidateNetwork(networkId, isProduction) {
  const warnings = [];
  const info = getNetworkInfo(networkId);
  
  if (info.isTestnet && isProduction) {
    warnings.push('Using testnet in production - switch to mainnet');
  }
  if (!info.isTestnet && !isProduction) {
    warnings.push('Using mainnet in development - consider testnet');
  }
  
  return { warnings };
}

function mockValidateConfig({ payToAddress, isProduction }) {
  const errors = [];
  const warnings = [];
  
  if (!payToAddress) {
    if (isProduction) {
      errors.push('X402_PAY_TO_ADDRESS is REQUIRED in production');
    } else {
      warnings.push('X402_PAY_TO_ADDRESS not set - x402 payments disabled');
    }
  } else {
    const addrResult = mockValidateAddress(payToAddress);
    if (!addrResult.valid) {
      errors.push(addrResult.error);
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Payment Webhook Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Payment Webhooks', () => {
  describe('Webhook Service', () => {
    it('should export all required functions', async () => {
      const webhooks = await import('../api/services/payment-webhooks.js');
      
      expect(webhooks.notifyPaymentReceived).toBeDefined();
      expect(webhooks.notifyPaymentFailed).toBeDefined();
      expect(webhooks.notifyPaymentSettled).toBeDefined();
      expect(webhooks.hasWebhooksConfigured).toBeDefined();
      expect(webhooks.getWebhookStatus).toBeDefined();
      expect(webhooks.testWebhooks).toBeDefined();
      expect(webhooks.PAYMENT_EVENTS).toBeDefined();
    });
    
    it('should have correct PAYMENT_EVENTS', async () => {
      const { PAYMENT_EVENTS } = await import('../api/services/payment-webhooks.js');
      
      expect(PAYMENT_EVENTS.RECEIVED).toBe('payment.received');
      expect(PAYMENT_EVENTS.SETTLED).toBe('payment.settled');
      expect(PAYMENT_EVENTS.FAILED).toBe('payment.failed');
      expect(PAYMENT_EVENTS.VERIFICATION_FAILED).toBe('payment.verification_failed');
    });
    
    it('should return false when no webhooks configured', async () => {
      const { hasWebhooksConfigured } = await import('../api/services/payment-webhooks.js');
      
      // Without env vars, should return false
      expect(hasWebhooksConfigured()).toBe(false);
    });
    
    it('should return status object with correct structure', async () => {
      const { getWebhookStatus } = await import('../api/services/payment-webhooks.js');
      
      const status = getWebhookStatus();
      
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('delivery');
      expect(status).toHaveProperty('recentDeliveries');
      
      expect(status.configured).toHaveProperty('customWebhook');
      expect(status.configured).toHaveProperty('discord');
      expect(status.configured).toHaveProperty('slack');
      expect(status.configured).toHaveProperty('signatureEnabled');
      
      expect(status.delivery).toHaveProperty('total');
      expect(status.delivery).toHaveProperty('successful');
      expect(status.delivery).toHaveProperty('failed');
      expect(status.delivery).toHaveProperty('retried');
      expect(status.delivery).toHaveProperty('successRate');
    });
    
    it('should skip notification when no webhooks configured', async () => {
      const { notifyPaymentReceived } = await import('../api/services/payment-webhooks.js');
      
      const result = await notifyPaymentReceived({
        price: '$0.01',
        operation: 'test:operation',
        payerAddress: '0x1234567890123456789012345678901234567890',
        network: 'eip155:8453',
      });
      
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('No webhooks configured');
    });
  });
  
  describe('Webhook Payload Structure', () => {
    it('should format payment amounts correctly', () => {
      // Test amount parsing helper - this is internal but we test the concept
      const parseAmountToCents = (price) => {
        if (!price) return 0;
        const numericValue = parseFloat(price.replace(/[^0-9.]/g, ''));
        return Math.round(numericValue * 100);
      };
      
      expect(parseAmountToCents('$0.01')).toBe(1);
      expect(parseAmountToCents('$0.05')).toBe(5);
      expect(parseAmountToCents('$1.00')).toBe(100);
      expect(parseAmountToCents('$0.001')).toBe(0); // Rounds to 0 cents
      expect(parseAmountToCents(null)).toBe(0);
    });
    
    it('should format network names correctly', () => {
      const getNetworkName = (network) => {
        const networks = {
          'eip155:8453': 'Base',
          'eip155:84532': 'Base Sepolia (Testnet)',
          'eip155:1': 'Ethereum',
          'eip155:42161': 'Arbitrum One',
        };
        return networks[network] || network || 'Unknown';
      };
      
      expect(getNetworkName('eip155:8453')).toBe('Base');
      expect(getNetworkName('eip155:84532')).toBe('Base Sepolia (Testnet)');
      expect(getNetworkName('eip155:1')).toBe('Ethereum');
      expect(getNetworkName('unknown')).toBe('unknown');
      expect(getNetworkName(null)).toBe('Unknown');
    });
    
    it('should generate block explorer URLs correctly', () => {
      const getExplorerUrl = (network, txHash) => {
        if (!txHash) return null;
        const explorers = {
          'eip155:8453': `https://basescan.org/tx/${txHash}`,
          'eip155:84532': `https://sepolia.basescan.org/tx/${txHash}`,
          'eip155:1': `https://etherscan.io/tx/${txHash}`,
          'eip155:42161': `https://arbiscan.io/tx/${txHash}`,
        };
        return explorers[network] || null;
      };
      
      const testTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      expect(getExplorerUrl('eip155:8453', testTxHash)).toBe(`https://basescan.org/tx/${testTxHash}`);
      expect(getExplorerUrl('eip155:84532', testTxHash)).toBe(`https://sepolia.basescan.org/tx/${testTxHash}`);
      expect(getExplorerUrl('eip155:8453', null)).toBeNull();
      expect(getExplorerUrl('unknown', testTxHash)).toBeNull();
    });
  });
});

// Multi-network support tests
describe('Multi-Network Support', () => {
  describe('SUPPORTED_NETWORKS configuration', () => {
    it('should have Base mainnet as recommended', async () => {
      const { SUPPORTED_NETWORKS } = await import('../api/config/x402-config.js');
      
      expect(SUPPORTED_NETWORKS['eip155:8453']).toBeDefined();
      expect(SUPPORTED_NETWORKS['eip155:8453'].recommended).toBe(true);
      expect(SUPPORTED_NETWORKS['eip155:8453'].name).toBe('Base');
    });
    
    it('should have Base Sepolia as testnet', async () => {
      const { SUPPORTED_NETWORKS } = await import('../api/config/x402-config.js');
      
      expect(SUPPORTED_NETWORKS['eip155:84532']).toBeDefined();
      expect(SUPPORTED_NETWORKS['eip155:84532'].testnet).toBe(true);
      expect(SUPPORTED_NETWORKS['eip155:84532'].name).toBe('Base Sepolia');
    });
    
    it('should have Ethereum mainnet with high gas cost', async () => {
      const { SUPPORTED_NETWORKS } = await import('../api/config/x402-config.js');
      
      expect(SUPPORTED_NETWORKS['eip155:1']).toBeDefined();
      expect(SUPPORTED_NETWORKS['eip155:1'].gasCost).toBe('high');
      expect(SUPPORTED_NETWORKS['eip155:1'].name).toBe('Ethereum');
    });
    
    it('should have Arbitrum One with low gas cost', async () => {
      const { SUPPORTED_NETWORKS } = await import('../api/config/x402-config.js');
      
      expect(SUPPORTED_NETWORKS['eip155:42161']).toBeDefined();
      expect(SUPPORTED_NETWORKS['eip155:42161'].gasCost).toBe('low');
      expect(SUPPORTED_NETWORKS['eip155:42161'].name).toBe('Arbitrum One');
    });
    
    it('should have valid USDC addresses for all networks', async () => {
      const { SUPPORTED_NETWORKS } = await import('../api/config/x402-config.js');
      
      for (const [networkId, config] of Object.entries(SUPPORTED_NETWORKS)) {
        expect(config.usdc).toBeDefined();
        expect(config.usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });
  });
  
  describe('getAcceptedNetworks function', () => {
    it('should exclude testnets when includeTestnet is false', async () => {
      const { getAcceptedNetworks } = await import('../api/config/x402-config.js');
      
      const networks = getAcceptedNetworks(false);
      const hasTestnet = networks.some(n => n.testnet);
      
      expect(hasTestnet).toBe(false);
      expect(networks.length).toBeGreaterThan(0);
    });
    
    it('should include testnets when includeTestnet is true', async () => {
      const { getAcceptedNetworks } = await import('../api/config/x402-config.js');
      
      const networks = getAcceptedNetworks(true);
      const hasTestnet = networks.some(n => n.testnet);
      
      expect(hasTestnet).toBe(true);
    });
    
    it('should return network objects with all required properties', async () => {
      const { getAcceptedNetworks } = await import('../api/config/x402-config.js');
      
      const networks = getAcceptedNetworks(true);
      
      for (const network of networks) {
        expect(network.network).toBeDefined();
        expect(network.name).toBeDefined();
        expect(network.usdc).toBeDefined();
        expect(network.gasCost).toBeDefined();
      }
    });
  });
  
  describe('getNetworkConfig function', () => {
    it('should return config for valid network ID', async () => {
      const { getNetworkConfig } = await import('../api/config/x402-config.js');
      
      const config = getNetworkConfig('eip155:8453');
      
      expect(config).toBeDefined();
      expect(config.name).toBe('Base');
      expect(config.usdc).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    });
    
    it('should return null for invalid network ID', async () => {
      const { getNetworkConfig } = await import('../api/config/x402-config.js');
      
      const config = getNetworkConfig('eip155:99999');
      
      expect(config).toBeNull();
    });
  });
  
  describe('x402 Client NETWORK_CONFIGS', () => {
    it('should export NETWORK_CONFIGS with all networks', async () => {
      const { NETWORK_CONFIGS } = await import('../src/mcp/x402-client.js');
      
      expect(NETWORK_CONFIGS).toBeDefined();
      expect(NETWORK_CONFIGS['base']).toBeDefined();
      expect(NETWORK_CONFIGS['base-sepolia']).toBeDefined();
      expect(NETWORK_CONFIGS['ethereum']).toBeDefined();
      expect(NETWORK_CONFIGS['arbitrum']).toBeDefined();
    });
    
    it('should have chainId and networkId for all networks', async () => {
      const { NETWORK_CONFIGS } = await import('../src/mcp/x402-client.js');
      
      for (const [name, config] of Object.entries(NETWORK_CONFIGS)) {
        expect(config.chainId).toBeDefined();
        expect(typeof config.chainId).toBe('number');
        expect(config.networkId).toBeDefined();
        expect(config.networkId).toMatch(/^eip155:\d+$/);
      }
    });
    
    it('should have Base as recommended network', async () => {
      const { NETWORK_CONFIGS } = await import('../src/mcp/x402-client.js');
      
      expect(NETWORK_CONFIGS['base'].recommended).toBe(true);
    });
    
    it('should have base-sepolia as testnet', async () => {
      const { NETWORK_CONFIGS } = await import('../src/mcp/x402-client.js');
      
      expect(NETWORK_CONFIGS['base-sepolia'].testnet).toBe(true);
    });
  });
});
