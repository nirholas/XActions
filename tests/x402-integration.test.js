/**
 * x402 Integration Tests
 * 
 * End-to-end tests for the x402 payment flow.
 * Tests 402 responses, payment headers, and endpoint protection.
 * 
 * NOTE: These tests require a running server!
 * Run with: npm run dev & npm run test:x402:integration
 * 
 * @author nichxbt
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { 
  createMockPayment, 
  encodePayment, 
  createInvalidPayment,
  createMockPaymentForNetwork 
} from './x402-mock-payment.js';

// Test against local server or specify TEST_API_URL
const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Check if server is running before tests
async function isServerRunning() {
  try {
    const res = await fetch(`${API_URL}/health`, { 
      signal: AbortSignal.timeout(1000) 
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Skip tests if server isn't running (for CI without server)
const describeWithServer = process.env.CI ? describe.skip : describe;

describeWithServer('x402 Payment Integration', () => {
  
  describe('402 Response Format', () => {
    it('returns 402 for AI scrape/profile endpoint without payment', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
      expect(res.body.error).toBe('Payment Required');
    });

    it('returns 402 for AI scrape/followers endpoint without payment', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/followers')
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
    });

    it('returns 402 for AI action endpoints without payment', async () => {
      const res = await request(API_URL)
        .post('/api/ai/action/unfollow-non-followers')
        .send({});
      
      expect(res.status).toBe(402);
    });

    it('includes required fields in 402 response body', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.body.price).toBeDefined();
      expect(res.body.operation).toBeDefined();
      expect(res.body.operationName).toBeDefined();
      expect(res.body.humanAlternative).toBeDefined();
      expect(res.body.docs).toBeDefined();
    });

    it('includes PAYMENT-REQUIRED header with base64-encoded requirements', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      const header = res.headers['payment-required'];
      expect(header).toBeDefined();
      
      // Should be valid base64
      const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
      expect(decoded.x402Version).toBe(2);
      expect(decoded.accepts).toBeInstanceOf(Array);
      expect(decoded.accepts.length).toBeGreaterThan(0);
    });

    it('includes network options in 402 response', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.body.networks).toBeDefined();
      expect(res.body.networks.supported).toBeInstanceOf(Array);
      expect(res.body.networks.recommended).toBeDefined();
    });

    it('includes x402 protocol info in response', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.body.x402).toBeDefined();
      expect(res.body.x402.version).toBe(2);
      expect(res.body.x402.facilitator).toBeDefined();
      expect(res.body.x402.accepts).toBeInstanceOf(Array);
    });
  });

  describe('Health Endpoint (Free)', () => {
    it('returns 200 without payment', async () => {
      const res = await request(API_URL).get('/api/ai/health');
      
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('XActions AI API');
    });

    it('returns pricing information', async () => {
      const res = await request(API_URL).get('/api/ai/health');
      
      expect(res.body.pricing).toBeDefined();
      expect(Object.keys(res.body.pricing).length).toBeGreaterThan(0);
    });

    it('returns x402 configuration status', async () => {
      const res = await request(API_URL).get('/api/ai/health');
      
      expect(res.body.x402).toBeDefined();
      expect(res.body.x402.version).toBe(2);
      expect(res.body.x402.networks).toBeDefined();
    });

    it('includes documentation links', async () => {
      const res = await request(API_URL).get('/api/ai/health');
      
      expect(res.body.docs).toBeDefined();
      expect(res.body.humanAccess).toBeDefined();
    });

    it('lists all available endpoints', async () => {
      const res = await request(API_URL).get('/api/ai/health');
      
      expect(res.body.endpoints).toBeInstanceOf(Array);
      expect(res.body.endpoints.length).toBeGreaterThan(0);
      
      // Each endpoint should have required fields
      const endpoint = res.body.endpoints[0];
      expect(endpoint.operation).toBeDefined();
      expect(endpoint.name).toBeDefined();
      expect(endpoint.path).toBeDefined();
      expect(endpoint.price).toBeDefined();
    });
  });

  describe('Pricing Endpoint (Free)', () => {
    it('returns 200 without payment', async () => {
      const res = await request(API_URL).get('/api/ai/pricing');
      
      expect(res.status).toBe(200);
    });

    it('returns pricing by operation', async () => {
      const res = await request(API_URL).get('/api/ai/pricing');
      
      expect(res.body.pricing).toBeDefined();
      expect(res.body.currency).toBe('USDC');
    });

    it('returns supported networks', async () => {
      const res = await request(API_URL).get('/api/ai/pricing');
      
      expect(res.body.networks).toBeInstanceOf(Array);
      expect(res.body.recommendedNetwork).toBeDefined();
    });
  });

  describe('Payment Verification', () => {
    it('rejects malformed base64 payment header', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', 'not-valid-base64!!!')
        .send({ username: 'test' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('rejects payment missing x402Version', async () => {
      const badPayment = encodePayment(createInvalidPayment('missing-version'));
      
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', badPayment)
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
    });

    it('rejects payment missing payload', async () => {
      const badPayment = encodePayment(createInvalidPayment('missing-payload'));
      
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .set('X-PAYMENT', badPayment)
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
    });

    it('accepts payment via PAYMENT-SIGNATURE header (alternative)', async () => {
      // Using alternative header name should also work for parsing
      const payment = encodePayment(createMockPayment());
      
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .set('PAYMENT-SIGNATURE', payment)
        .send({ username: 'test' });
      
      // Should at least parse the header (may fail verification without real signature)
      expect(res.status).not.toBe(400); // Not a parse error
    });
  });

  describe('Non-AI Endpoints (Free)', () => {
    it('does not require payment for /health', async () => {
      const res = await request(API_URL).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['payment-required']).toBeUndefined();
    });

    it('does not require payment for /api/health', async () => {
      const res = await request(API_URL).get('/api/health');
      expect(res.status).toBe(200);
    });

    it('does not require payment for static files', async () => {
      const res = await request(API_URL).get('/');
      expect(res.status).not.toBe(402);
    });

    it('does not include PAYMENT-REQUIRED header on non-AI endpoints', async () => {
      const res = await request(API_URL).get('/health');
      expect(res.headers['payment-required']).toBeUndefined();
    });
  });

  describe('Content-Type Handling', () => {
    it('returns application/json for 402 responses', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.headers['content-type']).toContain('application/json');
    });

    it('returns application/json for health endpoint', async () => {
      const res = await request(API_URL).get('/api/ai/health');
      
      expect(res.headers['content-type']).toContain('application/json');
    });
  });

  describe('Multi-Network Support', () => {
    it('accepts payments from different networks', async () => {
      const networks = ['base-sepolia', 'base', 'ethereum', 'arbitrum'];
      
      for (const network of networks) {
        const payment = encodePayment(createMockPaymentForNetwork(network));
        
        const res = await request(API_URL)
          .post('/api/ai/scrape/profile')
          .set('X-PAYMENT', payment)
          .send({ username: 'test' });
        
        // Should parse successfully (may fail verification, but not 400)
        expect(res.status).not.toBe(400);
      }
    });

    it('returns multiple network options in 402 response', async () => {
      const res = await request(API_URL)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.body.networks.supported.length).toBeGreaterThan(1);
      
      // Each network should have required fields
      const network = res.body.networks.supported[0];
      expect(network.network).toBeDefined();
      expect(network.name).toBeDefined();
      expect(network.usdc).toBeDefined();
    });
  });
});

describeWithServer('x402 API Documentation Endpoint', () => {
  it('returns API documentation at /api/ai/', async () => {
    const res = await request(API_URL).get('/api/ai/');
    
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('XActions AI API');
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.pricing).toBeDefined();
  });

  it('lists all endpoint categories', async () => {
    const res = await request(API_URL).get('/api/ai/');
    
    expect(res.body.endpoints.scraping).toBeDefined();
    expect(res.body.endpoints.actions).toBeDefined();
    expect(res.body.endpoints.monitoring).toBeDefined();
    expect(res.body.endpoints.utility).toBeDefined();
  });

  it('includes free alternatives for humans', async () => {
    const res = await request(API_URL).get('/api/ai/');
    
    expect(res.body.freeAlternatives).toBeDefined();
    expect(res.body.freeAlternatives.browser).toBeDefined();
    expect(res.body.freeAlternatives.cli).toBeDefined();
  });
});
