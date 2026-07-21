---
name: billing-management
description: Manage XActions subscriptions and billing — view plans, start a Stripe checkout, open the billing portal, or cancel a subscription. Use when users want to upgrade, downgrade, or manage their XActions subscription.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Billing Management

Stripe-powered subscription and billing management for XActions.

## Entry Points

| Goal | Route | Method |
|------|-------|--------|
| List available plans | `GET /api/billing/plans` | REST API |
| Start Stripe checkout | `POST /api/billing/checkout` | REST API |
| Open billing portal | `GET /api/billing/portal` | REST API |
| Get current subscription | `GET /api/billing/subscription` | REST API |
| Cancel subscription | `POST /api/billing/cancel` | REST API |

## API Usage

### List plans

```bash
GET /api/billing/plans
```

Returns all available subscription tiers with pricing and feature limits.

### Start checkout

```bash
POST /api/billing/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "pro",
  "successUrl": "https://yourapp.com/success",
  "cancelUrl": "https://yourapp.com/cancel"
}
```

Returns a Stripe checkout URL to redirect the user to.

### Open billing portal

```bash
GET /api/billing/portal
Authorization: Bearer <token>
```

Returns a Stripe Customer Portal URL where users can update payment methods, view invoices, and manage their subscription.

## Subscription Tiers

| Tier | Key Features |
|------|-------------|
| `free` | Limited operations, community features |
| `basic` | More operations, standard automations |
| `pro` | Unlimited operations, all features, API access |
| `enterprise` | Custom limits, dedicated support, team features |

## Notes

- Billing is handled entirely by Stripe — XActions does not store payment details
- Subscription status is synced via Stripe webhooks
- Downgrade takes effect at the end of the current billing period
- Credits (for pay-per-use operations) are separate from subscriptions

## Related Skills

- **teams-management** — Manage team members on your plan
- **x402-payments** — Alternative crypto-based payment via x402 protocol
- **xactions-cli** — Check plan status via CLI
