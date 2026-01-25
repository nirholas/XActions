

## Agent 5: Testing & Deployment

**Role**: QA & DevOps Specialist  
**Focus**: Create tests, deployment configuration, and monitoring

### Task

1. Create test suite for x402 middleware
2. Set up environment configuration
3. Add monitoring and analytics

### Files to Create

#### 1. `tests/x402.test.js`
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../api/server.js';

describe('x402 AI API', () => {
  describe('Without payment', () => {
    it('returns 402 for AI endpoints', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.status).toBe(402);
      expect(res.headers['payment-required']).toBeDefined();
      expect(res.body.error).toBe('Payment Required');
    });
    
    it('includes payment requirements in response', async () => {
      const res = await request(app)
        .post('/api/ai/scrape/profile')
        .send({ username: 'test' });
      
      expect(res.body.price).toBeDefined();
      expect(res.body.network).toBeDefined();
      expect(res.body.payTo).toBeDefined();
    });
  });
  
  describe('Health check', () => {
    it('returns pricing info without payment', async () => {
      const res = await request(app).get('/api/ai/health');
      
      expect(res.status).toBe(200);
      expect(res.body.pricing).toBeDefined();
      expect(res.body.x402.enabled).toBe(true);
    });
  });
  
  describe('Human endpoints remain free', () => {
    it('allows /api/user/* without payment', async () => {
      // ... test human endpoints
    });
  });
});
```

#### 2. `.env.example`
```bash
# XActions Configuration

# x402 Payment Settings
X402_PAY_TO_ADDRESS=0xYourEthereumAddress
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_NETWORK=eip155:84532  # Base Sepolia (testnet)
# X402_NETWORK=eip155:8453  # Base (mainnet)

# Database
DATABASE_URL=postgresql://...

# API
PORT=3001
NODE_ENV=development
```

#### 3. `scripts/verify-x402.js` - Verification script
```javascript
#!/usr/bin/env node
/**
 * Verify x402 configuration
 */

import { validateConfig } from '../api/config/x402-config.js';

console.log('🔍 Verifying x402 configuration...\n');

const { valid, errors } = validateConfig();

if (valid) {
  console.log('✅ x402 configuration is valid\n');
} else {
  console.log('⚠️  Configuration issues:\n');
  errors.forEach(e => console.log(`   - ${e}`));
}

// Test facilitator connection
console.log('🔗 Testing facilitator connection...');
try {
  const res = await fetch(process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator');
  if (res.ok) {
    console.log('✅ Facilitator is reachable\n');
  } else {
    console.log('❌ Facilitator returned error:', res.status);
  }
} catch (e) {
  console.log('❌ Failed to reach facilitator:', e.message);
}
```

### Success Criteria

- [ ] Tests pass for 402 responses
- [ ] Tests verify payment header format
- [ ] Tests confirm human endpoints are free
- [ ] Verification script works
- [ ] Environment variables documented

---

## Summary

| Agent | Role | Key Deliverables |
|-------|------|------------------|
| **1** | x402 Infrastructure | Payment middleware, config, AI detection |
| **2** | AI API Routes | `/api/ai/*` endpoints, structured responses |
| **3** | MCP Integration | Dual-mode MCP server, x402 client |
| **4** | Dashboard & Docs | AI API docs, pricing page |
| **5** | Testing & Deploy | Test suite, env config, monitoring |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         XActions                                 │
├─────────────────────────────┬───────────────────────────────────┤
│     HUMAN ACCESS (FREE)     │      AI AGENT ACCESS (PAID)       │
├─────────────────────────────┼───────────────────────────────────┤
│                             │                                   │
│  ┌─────────────────────┐    │    ┌─────────────────────────┐   │
│  │  Browser Scripts    │    │    │   AI Agent (Claude)     │   │
│  │  (Copy-paste)       │    │    │   with USDC Wallet      │   │
│  └─────────────────────┘    │    └───────────┬─────────────┘   │
│                             │                │                  │
│  ┌─────────────────────┐    │    ┌───────────▼─────────────┐   │
│  │  CLI Tool           │    │    │   POST /api/ai/scrape   │   │
│  │  (npm install)      │    │    │   (No X-PAYMENT)        │   │
│  └─────────────────────┘    │    └───────────┬─────────────┘   │
│                             │                │                  │
│  ┌─────────────────────┐    │    ┌───────────▼─────────────┐   │
│  │  Node.js Library    │    │    │   402 Payment Required  │   │
│  │  (import xactions)  │    │    │   + PAYMENT-REQUIRED    │   │
│  └─────────────────────┘    │    └───────────┬─────────────┘   │
│                             │                │                  │
│  ┌─────────────────────┐    │    ┌───────────▼─────────────┐   │
│  │  Dashboard          │    │    │   Agent Signs USDC      │   │
│  │  (xactions.app)     │    │    │   Payment               │   │
│  └─────────────────────┘    │    └───────────┬─────────────┘   │
│                             │                │                  │
│  ┌─────────────────────┐    │    ┌───────────▼─────────────┐   │
│  │  Local MCP Server   │    │    │   Retry with X-PAYMENT  │   │
│  │  (Puppeteer)        │    │    │   Header                │   │
│  └─────────────────────┘    │    └───────────┬─────────────┘   │
│                             │                │                  │
│                             │    ┌───────────▼─────────────┐   │
│                             │    │   x402 Middleware       │   │
│                             │    │   Verifies + Settles    │   │
│                             │    └───────────┬─────────────┘   │
│                             │                │                  │
│                             │    ┌───────────▼─────────────┐   │
│                             │    │   Execute Operation     │   │
│                             │    │   Return Result         │   │
│                             │    └─────────────────────────┘   │
│                             │                                   │
└─────────────────────────────┴───────────────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │   Facilitator       │
                   │   (x402.org)        │
                   │   Verify + Settle   │
                   └─────────────────────┘
```

## Key Principles

1. **Humans stay free**: Browser scripts, CLI, library, dashboard - all free forever
2. **AI agents pay**: Programmatic API access requires micropayments
3. **No accounts needed**: x402 payments are permissionless
4. **Transparent pricing**: Clear costs per operation
5. **Graceful degradation**: If x402 fails, log warning but don't break
