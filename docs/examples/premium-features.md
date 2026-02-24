# 💎 Premium Features Guide

Compare X/Twitter Premium tiers and check which features are available to your account.

## 📋 What It Does

1. Detects your current Premium tier
2. Shows feature comparison across all tiers
3. Identifies upgrade opportunities
4. Checks revenue sharing eligibility

## 💰 Tier Comparison (Feb 2026)

| Feature | Free | Basic ($3) | Premium ($8) | Premium+ ($16) |
|---------|------|------------|---------------|-----------------|
| Post length | 280 | 280 | 25,000 | 25,000 |
| Video upload | 140s | 140s | 60 min | 3 hr |
| Verification | ❌ | ❌ | ✅ | ✅ |
| Edit posts | ❌ | ❌ | ✅ | ✅ |
| Post scheduling | ❌ | ❌ | ✅ | ✅ |
| Bookmark folders | ❌ | ❌ | ✅ | ✅ |
| Articles | ❌ | ❌ | ❌ | ✅ |
| Ad reduction | None | 50% | 50% | No ads |
| Revenue sharing | ❌ | ❌ | ✅ | ✅ |
| Grok access | Basic | Basic | Full | Full |
| SuperGrok | ❌ | ❌ | ❌ | Add-on ($60) |

## 🌐 Browser Console Script

```javascript
// Go to: x.com (any page while logged in)
// Paste scripts/premiumFeatures.js
```

## 📦 Node.js Module

```javascript
import { checkPremiumStatus, compareTiers } from 'xactions';

const status = await checkPremiumStatus(page);
console.log(status.tier); // 'premium', 'premium+', etc.

const tiers = compareTiers();
console.log(tiers); // Full feature matrix
```

## ⚠️ Notes

- Pricing varies by country and payment method
- Annual billing offers ~15% discount
- Revenue sharing requires 500+ followers and 5M impressions in last 3 months
- SuperGrok is a separate xAI subscription, not included in Premium+
- Business verified ($200/mo or $1,000/mo) is separate from Premium
