---
name: premium-subscriptions
description: Manage X Premium tiers (Basic $3/mo, Premium $8/mo, Premium+ $16/mo) and SuperGrok ($60/mo). Features include ad reduction, longer posts/videos, verification, revenue sharing, undo post, custom icons, reply boosts, and the 2026 pay-for-reach emphasis.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Premium & Subscriptions with XActions

Guide and automate X Premium subscription features.

## Tier Comparison

| Feature | Free | Basic ($3) | Premium ($8) | Premium+ ($16) |
|---------|------|------------|--------------|-----------------|
| Post length | 280 | 280 | 25,000+ | 25,000+ |
| Video length | 140s | 140s | 60min | 3hr |
| Ad reduction | None | 50% fewer | 50% fewer | No ads |
| Verification | No | No | Blue check | Blue check |
| Edit posts | No | No | Yes (1hr) | Yes (1hr) |
| Scheduling | No | No | Yes | Yes |
| Bookmark folders | No | No | Yes | Yes |
| Bold/italics | No | No | Yes | Yes |
| Revenue share | No | No | Yes | Yes |
| Articles | No | No | No | Yes |
| Radar Search | No | No | No | Yes |
| Grok limits | Basic | More | Higher | Highest |
| Reply boost | None | Small | Medium | Largest |

## SuperGrok ($60/mo)
Separate xAI subscription with X integration:
- Unlimited Grok queries and agents
- MacOS/iOS dedicated apps
- Project organization
- Advanced AI features

## 2026 Changes
- **Pay-for-reach**: Non-Premium organic reach significantly lowered
- Premium accounts get higher algorithm priority
- More features gated behind Premium tiers

## Browser Console Script

**File:** `scripts/premiumFeatures.js`

Check Premium status and available features.

### Key selectors

| Element | Selector |
|---------|----------|
| Premium nav | `a[href="/i/premium_sign_up"]` |
| Verification badge | `[data-testid="icon-verified"]` |
| Subscription info | `[data-testid="subscriptionInfo"]` |

## MCP Tools

- `x_check_premium` – Check user's Premium tier
- `x_premium_features` – List available Premium features
- `x_verify_status` – Check verification status

## API Endpoints

- `GET /api/premium/status` – Check Premium tier
- `GET /api/premium/features` – List available features
- `GET /api/premium/verify/:username` – Check verification

## Related Files

- `src/premiumManager.js` – Premium feature management
- `scripts/premiumFeatures.js` – Browser Premium check script

## Notes

- Premium features vary by region
- Verification requires ID or payment
- Revenue sharing requires 500+ followers and 5M+ impressions in 3 months
- Pay-for-reach means Premium is increasingly necessary for growth (2026)
