# Archived Code

The following files have been archived as XActions transitioned to a 100% free, open-source model on January 25, 2026.

## Backend Payment Code (`archive/backend/`)

| File | Description | Original Location |
|------|-------------|-------------------|
| `payments.js` | Stripe payment routes for subscriptions and credit purchases | `api/routes/payments.js` |
| `crypto-payments.js` | Cryptocurrency payment routes (Coinbase Commerce, NOWPayments, BTCPay) | `api/routes/crypto-payments.js` |
| `webhooks.js` | Payment webhooks for Stripe and crypto providers | `api/routes/webhooks.js` |
| `subscription-tiers.js` | Subscription tier configuration, credit packages, and monetization rules | `api/config/subscription-tiers.js` |

## Dashboard Pages (`archive/dashboard/`)

| File | Description | Original Location |
|------|-------------|-------------------|
| `pricing.html` | Pricing page with credit packages and crypto payment options | `dashboard/pricing.html` |

## Why Archived?

XActions is now completely **free and open source** with:
- ✅ No accounts required for browser scripts
- ✅ No credit system or payments
- ✅ No subscription tiers
- ✅ Unlimited access to all features
- ✅ Full source code available on GitHub

All features are accessible via:
1. **Browser Console Scripts** - Copy-paste automation (no setup needed)
2. **CLI Tools** - `npm install -g xactions` 
3. **Node.js Library** - `import { unfollowEveryone } from 'xactions'`
4. **MCP Server** - AI agent integration for Claude, GPT, etc.

## Modified Files

The following files were modified to remove payment functionality:

### `api/server.js`
- Removed payment route imports and registrations
- `/pricing` now redirects to `/docs`

### `api/middleware/auth.js`
- `checkCredits()` - Now always allows (no-op)
- `requireSubscription()` - Now always allows (no-op)
- Removed subscription tier validation

### `api/routes/user.js`
- Removed credit balance endpoints
- Removed subscription status endpoints
- Removed `claim-follow-bonus` endpoint

### `api/routes/operations.js`
- Removed `checkCredits` middleware from all routes
- Removed credit deduction logic
- Operations are now free and unlimited

### `api/realtime/socketHandler.js`
- Removed credit checking before operations
- Removed credit deduction on completion

### `dashboard/index.html`
- Removed credit display code from `loadDashboard()`
- Removed credit deduction in `updateProgress()`
- Removed `needCredits` error handling
- Removed `claimFollowBonus()` function
- Removed `.credits-highlight` CSS class
- Removed "This will cost 2 credits" confirmation text

## Restoration Guide

If payment features need to be restored:

1. Move archived files back to original locations
2. Restore imports in `api/server.js`:
   ```javascript
   import webhookRoutes from './routes/webhooks.js';
   import paymentsRoutes from './routes/payments.js';
   import cryptoPaymentsRoutes from './routes/crypto-payments.js';
   ```
3. Restore route registrations:
   ```javascript
   app.use('/api/webhooks', webhookRoutes);
   app.use('/api/payments', paymentsRoutes);
   app.use('/api/crypto', cryptoPaymentsRoutes);
   ```
4. Restore raw body parsing for webhooks:
   ```javascript
   app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));
   ```
5. Restore credit logic in `auth.js`, `operations.js`, and `socketHandler.js`
6. Configure environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `COINBASE_COMMERCE_API_KEY`
   - `NOWPAYMENTS_API_KEY`
   - etc.

---

*Archived by Agent 1 - January 25, 2026*
*XActions is now 100% free and open source*
