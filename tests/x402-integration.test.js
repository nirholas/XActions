// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402 Integration Tests
 *
 * End-to-end tests for the x402 payment flow using the official @x402/express SDK.
 * Tests 402 responses, payment headers, and endpoint protection.
 *
 * NOTE: These tests require a running server!
 * Run with: npm run dev & npm run test:x402:integration
 *
 * @author nichxbt
 */

import { describe, it, expect } from 'vitest';
import {
  encodePayment,
  createMockPayment,
  createMockPaymentForNetwork,
} from './x402-mock-payment.js';

// Test against local server or specify TEST_API_URL
const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Helper for fetch-based requests (supertest optional)
async function apiRequest(method, path, { body, headers } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, body: data };
}

// Skip all tests if server isn't running
const describeWithServer = process.env.CI ? describe.skip : describe;

describeWithServer('x402 Payment Integration', () => {

  // ═══════════════════════════════════════════════════════════════════════
  // 402 Response — AI endpoints require payment
  // ═══════════════════════════════════════════════════════════════════════

  describe('402 Response Format', () => {
    it('returns 402 for /api/ai/scrape/profile without payment', async () => {
      const res = await apiRequest('POST', '/api/ai/scrape/profile', {
        body: { username: 'test' },
      });
      expect(res.status).toBe(402);
    });

    it('returns 402 for /api/ai/scrape/followers without payment', async () => {
      const res = await apiRequest('POST', '/api/ai/scrape/followers', {
        body: { username: 'test' },
      });
      expect(res.status).toBe(402);
    });

    it('returns 402 for /api/ai/action endpoints without payment', async () => {
      const res = await apiRequest('POST', '/api/ai/action/unfollow-non-followers', {
        body: {},
      });
      expect(res.status).toBe(402);
    });

    it('includes payment requirements header (base64-encoded)', async () => {
      const res = await apiRequest('POST', '/api/ai/scrape/profile', {
        body: { username: 'test' },
      });

      // The official SDK uses x-payment-requirements header
      const header =
        res.headers.get('x-payment-requirements') ||
        res.headers.get('payment-required');

      expect(header).toBeDefined();

      // Should be valid base64 JSON with accepts array
      const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
      expect(decoded.accepts).toBeInstanceOf(Array);
      expect(decoded.accepts.length).toBeGreaterThan(0);
    });

    it('payment requirements contain valid network and payTo', async () => {
      const res = await apiRequest('POST', '/api/ai/scrape/profile', {
        body: { username: 'test' },
      });

      const header =
        res.headers.get('x-payment-requirements') ||
        res.headers.get('payment-required');
      const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));

      const accept = decoded.accepts[0];
      expect(accept.network).toMatch(/^eip155:\d+$/);
      expect(accept.payTo).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(accept.maxAmountRequired).toBeDefined();
    });

    it('returns JSON content-type for 402 responses', async () => {
      const res = await apiRequest('POST', '/api/ai/scrape/profile', {
        body: { username: 'test' },
      });
      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Free Endpoints — health, pricing, non-AI routes
  // ═══════════════════════════════════════════════════════════════════════

  describe('Health Endpoint (Free)', () => {
    it('returns 200 without payment', async () => {
      const res = await apiRequest('GET', '/api/ai/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('XActions AI API');
    });

    it('returns pricing information', async () => {
      const res = await apiRequest('GET', '/api/ai/health');
      expect(res.body.pricing).toBeDefined();
      expect(Object.keys(res.body.pricing).length).toBeGreaterThan(0);
    });

    it('returns x402 configuration status', async () => {
      const res = await apiRequest('GET', '/api/ai/health');
      expect(res.body.x402).toBeDefined();
      expect(res.body.x402.version).toBe(2);
      expect(res.body.x402.networks).toBeDefined();
    });

    it('lists all available endpoints with prices', async () => {
      const res = await apiRequest('GET', '/api/ai/health');
      expect(res.body.endpoints).toBeInstanceOf(Array);
      expect(res.body.endpoints.length).toBeGreaterThan(0);

      const endpoint = res.body.endpoints[0];
      expect(endpoint.operation).toBeDefined();
      expect(endpoint.name).toBeDefined();
      expect(endpoint.path).toBeDefined();
      expect(endpoint.price).toBeDefined();
    });
  });

  describe('Pricing Endpoint (Free)', () => {
    it('returns 200 without payment', async () => {
      const res = await apiRequest('GET', '/api/ai/pricing');
      expect(res.status).toBe(200);
    });

    it('returns pricing by operation in USDC', async () => {
      const res = await apiRequest('GET', '/api/ai/pricing');
      expect(res.body.pricing).toBeDefined();
      expect(res.body.currency).toBe('USDC');
    });

    it('returns supported networks with recommended', async () => {
      const res = await apiRequest('GET', '/api/ai/pricing');
      expect(res.body.networks).toBeInstanceOf(Array);
      expect(res.body.recommendedNetwork).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Payment Verification — SDK validates payment payloads
  // ═══════════════════════════════════════════════════════════════════════

  describe('Payment Verification', () => {
    it('rejects mock payment (invalid signature)', async () => {
      const payment = encodePayment(createMockPayment());
      const res = await apiRequest('POST', '/api/ai/scrape/profile', {
        body: { username: 'test' },
        headers: { 'X-PAYMENT': payment },
      });
      // SDK should reject: either 402 (verification failed) or 400
      expect([400, 402]).toContain(res.status);
    });

    it('rejects payment with missing fields', async () => {
      const badPayment = encodePayment({ x402Version: 2 });
      const res = await apiRequest('POST', '/api/ai/scrape/profile', {
        body: { username: 'test' },
        headers: { 'X-PAYMENT': badPayment },
      });
      expect([400, 402]).toContain(res.status);
    });

    it('accepts payment via payment-signature header', async () => {
      const payment = encodePayment(createMockPayment());
      const res = await apiRequest('POST', '/api/ai/scrape/profile', {
        body: { username: 'test' },
        headers: { 'payment-signature': payment },
      });
      // Should parse — won't be 200 (no real signature), but not a 500
      expect(res.status).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Non-AI Endpoints — always free
  // ═══════════════════════════════════════════════════════════════════════

  describe('Non-AI Endpoints (Free)', () => {
    it('/health does not require payment', async () => {
      const res = await apiRequest('GET', '/health');
      expect(res.status).toBe(200);
    });

    it('/api/health does not require payment', async () => {
      const res = await apiRequest('GET', '/api/health');
      expect(res.status).toBe(200);
    });

    it('static files do not require payment', async () => {
      const res = await apiRequest('GET', '/');
      expect(res.status).not.toBe(402);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Multi-Network Support
  // ═══════════════════════════════════════════════════════════════════════

  describe('Multi-Network Support', () => {
    it('payment requirements include multiple network options', async () => {
      const res = await apiRequest('POST', '/api/ai/scrape/profile', {
        body: { username: 'test' },
      });

      const header =
        res.headers.get('x-payment-requirements') ||
        res.headers.get('payment-required');

      if (header) {
        const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
        // In dev mode, should have at least the configured network
        expect(decoded.accepts.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('processes payments from different networks without crash', async () => {
      const networks = ['base-sepolia', 'base', 'ethereum', 'arbitrum'];

      for (const network of networks) {
        const payment = encodePayment(createMockPaymentForNetwork(network));
        const res = await apiRequest('POST', '/api/ai/scrape/profile', {
          body: { username: 'test' },
          headers: { 'X-PAYMENT': payment },
        });
        // Should not crash (500) — 402 or 400 is fine
        expect(res.status).toBeLessThan(500);
      }
    });
  });
});

describeWithServer('x402 API Documentation Endpoint', () => {
  it('returns API documentation at /api/ai/', async () => {
    const res = await apiRequest('GET', '/api/ai/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('XActions AI API');
  });

  it('lists endpoint categories', async () => {
    const res = await apiRequest('GET', '/api/ai/');
    expect(res.body.endpoints).toBeDefined();
  });
});
