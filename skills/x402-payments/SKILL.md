---
name: x402-payments
description: Enable and integrate x402 crypto payment protocol for XActions API access. Supports multi-chain, multi-token payments for pay-per-use API calls. Use when users want to pay for XActions operations with crypto or integrate x402 into their own agent/app.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# x402 Payments

XActions supports the [x402 payment protocol](https://x402.org) — an HTTP-native micropayment standard for pay-per-use API access with cryptocurrency.

## Entry Points

| Goal | Route | Method |
|------|-------|--------|
| Discover payment capabilities | `GET /.well-known/x402` | Public |
| Get OpenAPI spec with payment info | `GET /api/x402/openapi` | Public |
| Make a paid API call | Any protected route | REST API (with x402 headers) |

## Configuration

Config lives in `api/config/x402-config.js`. Key settings:

```js
{
  networks: ['base', 'ethereum', 'polygon', 'arbitrum'],  // Supported chains
  tokens: {
    base: ['USDC', 'ETH'],
    ethereum: ['USDC', 'USDT', 'ETH'],
    polygon: ['USDC', 'MATIC'],
    arbitrum: ['USDC', 'ETH'],
  },
  pricing: {
    'POST /api/operations/unfollow': { amount: '0.01', token: 'USDC' },
    'POST /api/operations/follow':   { amount: '0.005', token: 'USDC' },
    // ... per-route pricing
  }
}
```

## Discovery (`/.well-known/x402`)

Returns a JSON manifest describing all payable routes, supported networks, and token addresses:

```bash
GET https://api.xactions.io/.well-known/x402
```

Response includes:
- List of payable API endpoints with prices
- Supported blockchain networks
- Token contract addresses per network
- Payment verification endpoint

## Making a Paid Request

x402-compatible clients handle payment automatically. For manual integration:

```bash
# 1. Get payment requirements (HTTP 402 response)
POST /api/operations/unfollow → 402 Payment Required
  X-Payment-Required: { amount, token, network, recipient }

# 2. Submit on-chain payment + proof
POST /api/operations/unfollow
  X-Payment: <signed-payment-proof>
```

## Middleware

`api/middleware/x402.js` handles:
- Detecting x402-protected routes
- Returning `402 Payment Required` with payment details
- Verifying payment proofs before processing requests
- Multi-chain verification across Base, Ethereum, Polygon, Arbitrum

## Supported Clients

Any x402-compatible client works automatically:
- `x402-axios` — Axios adapter with auto-payment
- `x402-fetch` — Fetch adapter with auto-payment
- Claude agents with x402 MCP tools
- Custom implementations following the x402 spec

## Notes

- x402 payments are per-request — no subscription needed
- Payment proofs are cryptographically verified on-chain before operations run
- Use `/.well-known/x402` for discovery in agent applications
- Stripe billing (`billing-management` skill) remains an alternative for subscription access

## Related Skills

- **billing-management** — Stripe subscription-based payment alternative
- **xactions-mcp-server** — MCP server that uses x402 for AI agent access
- **a2a-multi-agent** — Agent-to-agent workflows that use x402 for payment
