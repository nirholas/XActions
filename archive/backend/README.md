# Archived Backend Code

These files contained payment functionality that has been removed.
XActions is now 100% free and open-source.

## Archived Files

- `payments.js` - Stripe payment routes for subscriptions and credit purchases
- `crypto-payments.js` - Cryptocurrency payment routes (Coinbase, NOWPayments, BTCPay)
- `webhooks.js` - Stripe and crypto payment webhooks
- `subscription-tiers.js` - Subscription tier configuration and credit packages

## Archived on: January 25, 2026

## Reason: Transition to documentation-focused open-source project

XActions is now completely free with no accounts, credits, or payments required.
All features are accessible via browser scripts, CLI, or the Node.js library.

## Restoration

If payment features need to be restored, these files contain the complete implementation.
You would need to:

1. Move these files back to their original locations
2. Restore the imports in `api/server.js`
3. Restore the route registrations
4. Update `api/middleware/auth.js` to re-enable credit checking
5. Set up Stripe/crypto environment variables
