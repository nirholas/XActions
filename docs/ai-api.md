# 🤖 XActions AI API Documentation

Free & open-source API for AI agents. Use locally with Puppeteer (free, no limits) or self-host the remote API with optional x402 micropayments.

---

## 📋 Overview

XActions is **100% free** for all users:

| Mode | Access | Cost |
|------|--------|------|
| **🆓 Local (default)** | Browser scripts, CLI, Node.js library, local MCP server | **FREE** |
| **☁️ Remote (self-hosted)** | Self-hosted API for remote AI agent access | **FREE** (optionally supports x402 micropayments) |

> **Note:** x402 micropayments are entirely optional. They're only relevant if you self-host the XActions API and want to monetize remote access for AI agents.

---

## 🔐 Authentication

All API requests require your X/Twitter session cookie (`auth_token`) to perform actions on your behalf.

### Getting Your Session Cookie

1. Log into [x.com](https://x.com)
2. Open Developer Tools (F12)
3. Go to Application → Cookies → x.com
4. Find `auth_token` and copy its value

### Using the Session Cookie

Include it in the `X-Session-Cookie` header:

```http
X-Session-Cookie: your_auth_token_here
```

> ⚠️ **Security Warning:** Never share your session cookie. It provides full access to your X account.

---

## 💳 x402 Payment Flow (Optional)

If you enable x402 on your self-hosted API, the protocol handles HTTP-native micropayments. No API keys needed—agents sign payments with an Ethereum wallet.

### How It Works

```
┌─────────┐                      ┌─────────┐
│  Client │                      │  Server │
└────┬────┘                      └────┬────┘
     │                                │
     │  1. POST /api/ai/scrape/profile│
     │ ─────────────────────────────► │
     │                                │
     │  2. 402 Payment Required       │
     │     X-Payment-Required: {...}  │
     │ ◄───────────────────────────── │
     │                                │
     │  3. Sign payment with wallet   │
     │     ...                        │
     │                                │
     │  4. POST with X-Payment header │
     │ ─────────────────────────────► │
     │                                │
     │  5. 200 OK + Data              │
     │ ◄───────────────────────────── │
     │                                │
```

### Step-by-Step

#### 1. Make Initial Request

```javascript
const response = await fetch('https://api.xactions.app/api/ai/scrape/profile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Cookie': 'your_auth_token'
  },
  body: JSON.stringify({ username: 'elonmusk' })
});
```

#### 2. Receive 402 Response

```http
HTTP/1.1 402 Payment Required
X-Payment-Required: eyJhbW91bnQiOiIxMDAwMDAw...
Content-Type: application/json

{
  "error": "payment_required",
  "amount": "0.001",
  "currency": "USD",
  "paymentAddress": "0x...",
  "chain": "base",
  "validUntil": "2026-01-25T12:00:00Z"
}
```

#### 3. Sign Payment

Using ethers.js or similar:

```javascript
import { Wallet } from 'ethers';

const wallet = new Wallet(process.env.X402_PRIVATE_KEY);
const paymentDetails = response.headers.get('X-Payment-Required');
const payload = JSON.parse(atob(paymentDetails));

const signature = await wallet.signMessage(JSON.stringify({
  amount: payload.amount,
  recipient: payload.paymentAddress,
  nonce: payload.nonce,
  validUntil: payload.validUntil
}));

const signedPayment = btoa(JSON.stringify({
  ...payload,
  signature,
  payer: wallet.address
}));
```

#### 4. Retry with Payment

```javascript
const paidResponse = await fetch('https://api.xactions.app/api/ai/scrape/profile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Cookie': 'your_auth_token',
    'X-Payment': signedPayment
  },
  body: JSON.stringify({ username: 'elonmusk' })
});

const data = await paidResponse.json();
```

### Supported Chains

| Chain | Chain ID | Recommended |
|-------|----------|-------------|
| Base | 8453 | ✅ Yes (low fees) |
| Ethereum Mainnet | 1 | For larger amounts |
| Arbitrum | 42161 | Alternative |

### Supported Tokens

- **ETH** - Native currency
- **USDC** - Stablecoin (recommended)

---

## 💰 Pricing

All prices in USD. Actual payment in ETH or USDC.

### Scraping Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/ai/scrape/profile` | $0.001 | Get user profile info |
| `/api/ai/scrape/followers` | $0.01 | Scrape followers (up to 100) |
| `/api/ai/scrape/following` | $0.01 | Scrape following (up to 100) |
| `/api/ai/scrape/tweets` | $0.005 | Scrape tweets (up to 50) |
| `/api/ai/scrape/search` | $0.01 | Search tweets |

### Action Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/ai/action/unfollow-non-followers` | $0.05 | Mass unfollow non-followers |
| `/api/ai/action/unfollow-everyone` | $0.10 | Unfollow all accounts |
| `/api/ai/action/detect-unfollowers` | $0.02 | Find recent unfollowers |
| `/api/ai/action/auto-like` | $0.02 | Auto-like session |

### Monitoring Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/ai/monitor/account` | $0.01 | Monitor account changes |
| `/api/ai/monitor/follower-alerts` | $0.005 | New follower notifications |

---

## 📡 API Endpoints

### Scrape Profile

Get detailed profile information for any X/Twitter user.

**Endpoint:** `POST /api/ai/scrape/profile`

**Cost:** $0.001

**Request:**
```json
{
  "username": "elonmusk"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "elonmusk",
    "name": "Elon Musk",
    "bio": "Mars & Cars, Chips & Dips",
    "location": "Austin, Texas",
    "website": "https://tesla.com",
    "joinDate": "2009-06-02",
    "followersCount": 150000000,
    "followingCount": 500,
    "tweetsCount": 35000,
    "verified": true,
    "profileImageUrl": "https://..."
  }
}
```

---

### Scrape Followers

Scrape a user's followers list.

**Endpoint:** `POST /api/ai/scrape/followers`

**Cost:** $0.01 per 100 followers

**Request:**
```json
{
  "username": "nichxbt",
  "limit": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "nichxbt",
    "totalFollowers": 5000,
    "scrapedCount": 100,
    "followers": [
      {
        "username": "user1",
        "name": "User One",
        "bio": "Web3 developer",
        "followersCount": 1200
      }
    ]
  }
}
```

---

### Scrape Following

Scrape accounts a user follows.

**Endpoint:** `POST /api/ai/scrape/following`

**Cost:** $0.01 per 100

**Request:**
```json
{
  "username": "nichxbt",
  "limit": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "nichxbt",
    "totalFollowing": 800,
    "scrapedCount": 100,
    "following": [
      {
        "username": "account1",
        "name": "Account One",
        "followsBack": true
      }
    ]
  }
}
```

---

### Scrape Tweets

Scrape recent tweets from a user's profile.

**Endpoint:** `POST /api/ai/scrape/tweets`

**Cost:** $0.005 per 50 tweets

**Request:**
```json
{
  "username": "elonmusk",
  "limit": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "elonmusk",
    "scrapedCount": 50,
    "tweets": [
      {
        "id": "1234567890",
        "text": "The future is electric ⚡",
        "timestamp": "2026-01-25T10:30:00Z",
        "likes": 150000,
        "retweets": 25000,
        "replies": 8000,
        "url": "https://x.com/elonmusk/status/1234567890"
      }
    ]
  }
}
```

---

### Search Tweets

Search for tweets matching a query.

**Endpoint:** `POST /api/ai/scrape/search`

**Cost:** $0.01 per search

**Request:**
```json
{
  "query": "xactions automation",
  "limit": 50,
  "filter": "latest"
}
```

**Filters:** `latest`, `top`, `people`, `media`

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "xactions automation",
    "resultCount": 50,
    "tweets": [
      {
        "id": "...",
        "text": "...",
        "author": {
          "username": "...",
          "name": "..."
        },
        "timestamp": "...",
        "likes": 100,
        "retweets": 20
      }
    ]
  }
}
```

---

### Unfollow Non-Followers

Mass unfollow accounts that don't follow you back.

**Endpoint:** `POST /api/ai/action/unfollow-non-followers`

**Cost:** $0.05

**Request:**
```json
{
  "username": "your_username",
  "limit": 100,
  "delay": 2000,
  "excludeVerified": false,
  "excludeList": ["friend1", "friend2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unfollowedCount": 87,
    "totalNonFollowers": 150,
    "unfollowed": [
      { "username": "user1", "name": "User One" }
    ],
    "errors": []
  }
}
```

---

### Unfollow Everyone

Unfollow all accounts.

**Endpoint:** `POST /api/ai/action/unfollow-everyone`

**Cost:** $0.10

**Request:**
```json
{
  "username": "your_username",
  "delay": 2000,
  "excludeList": ["important_friend"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unfollowedCount": 450,
    "totalFollowing": 452,
    "excluded": 2
  }
}
```

---

### Detect Unfollowers

Find accounts that recently unfollowed you.

**Endpoint:** `POST /api/ai/action/detect-unfollowers`

**Cost:** $0.02

**Request:**
```json
{
  "username": "your_username"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentFollowers": 5000,
    "previousFollowers": 5025,
    "unfollowers": [
      {
        "username": "former_follower",
        "name": "Former Follower",
        "unfollowedAt": "2026-01-24"
      }
    ],
    "newFollowers": [
      {
        "username": "new_follower",
        "name": "New Follower"
      }
    ]
  }
}
```

---

### Monitor Account

Track changes to any public account.

**Endpoint:** `POST /api/ai/monitor/account`

**Cost:** $0.01 per check

**Request:**
```json
{
  "username": "target_account"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "target_account",
    "currentStats": {
      "followers": 10000,
      "following": 500,
      "tweets": 2500
    },
    "changes": {
      "followersDelta": +50,
      "followingDelta": -2,
      "newTweets": 3
    },
    "checkedAt": "2026-01-25T12:00:00Z"
  }
}
```

---

## 🚨 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `payment_required` | 402 | Payment needed for this request |
| `invalid_payment` | 402 | Payment signature invalid or expired |
| `insufficient_funds` | 402 | Wallet has insufficient balance |
| `missing_cookie` | 401 | X-Session-Cookie header required |
| `invalid_cookie` | 401 | Session cookie expired or invalid |
| `rate_limited` | 429 | Too many requests, slow down |
| `user_not_found` | 404 | X/Twitter user doesn't exist |
| `account_suspended` | 403 | Target account is suspended |
| `internal_error` | 500 | Server error, please retry |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "invalid_cookie",
    "message": "Your session cookie has expired. Please get a new one from x.com.",
    "details": {}
  }
}
```

---

## ⏱️ Rate Limits

To protect your X account from detection:

| Type | Limit | Window |
|------|-------|--------|
| Scraping | 100 requests | per minute |
| Actions | 30 actions | per minute |
| Monitoring | 60 checks | per minute |

**Best Practices:**
- Use 2-3 second delays between actions
- Don't exceed 100 unfollows per session
- Space out large scraping jobs

---

## 💻 Code Examples

### Python

```python
import requests
import json
from eth_account import Account
from eth_account.messages import encode_defunct
import base64

class XActionsClient:
    def __init__(self, private_key: str, session_cookie: str):
        self.base_url = "https://api.xactions.app"
        self.private_key = private_key
        self.session_cookie = session_cookie
        self.account = Account.from_key(private_key)
    
    def _sign_payment(self, payment_details: dict) -> str:
        message = json.dumps({
            "amount": payment_details["amount"],
            "recipient": payment_details["paymentAddress"],
            "nonce": payment_details["nonce"],
            "validUntil": payment_details["validUntil"]
        })
        signed = self.account.sign_message(encode_defunct(text=message))
        
        payload = {
            **payment_details,
            "signature": signed.signature.hex(),
            "payer": self.account.address
        }
        return base64.b64encode(json.dumps(payload).encode()).decode()
    
    def _request(self, endpoint: str, data: dict):
        headers = {
            "Content-Type": "application/json",
            "X-Session-Cookie": self.session_cookie
        }
        
        # Initial request
        response = requests.post(
            f"{self.base_url}{endpoint}",
            headers=headers,
            json=data
        )
        
        # Handle 402 Payment Required
        if response.status_code == 402:
            payment_b64 = response.headers.get("X-Payment-Required")
            payment_details = json.loads(base64.b64decode(payment_b64))
            
            # Sign and retry
            signed = self._sign_payment(payment_details)
            headers["X-Payment"] = signed
            
            response = requests.post(
                f"{self.base_url}{endpoint}",
                headers=headers,
                json=data
            )
        
        return response.json()
    
    def get_profile(self, username: str):
        return self._request("/api/ai/scrape/profile", {"username": username})
    
    def get_followers(self, username: str, limit: int = 100):
        return self._request("/api/ai/scrape/followers", {
            "username": username,
            "limit": limit
        })
    
    def unfollow_non_followers(self, username: str, limit: int = 100):
        return self._request("/api/ai/action/unfollow-non-followers", {
            "username": username,
            "limit": limit
        })

# Usage
client = XActionsClient(
    private_key="0x...",
    session_cookie="your_auth_token"
)

profile = client.get_profile("elonmusk")
print(profile)
```

### JavaScript/Node.js

```javascript
import { Wallet } from 'ethers';

class XActionsClient {
  constructor(privateKey, sessionCookie) {
    this.baseUrl = 'https://api.xactions.app';
    this.wallet = new Wallet(privateKey);
    this.sessionCookie = sessionCookie;
  }

  async signPayment(paymentDetails) {
    const message = JSON.stringify({
      amount: paymentDetails.amount,
      recipient: paymentDetails.paymentAddress,
      nonce: paymentDetails.nonce,
      validUntil: paymentDetails.validUntil
    });
    
    const signature = await this.wallet.signMessage(message);
    
    return btoa(JSON.stringify({
      ...paymentDetails,
      signature,
      payer: this.wallet.address
    }));
  }

  async request(endpoint, data) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Session-Cookie': this.sessionCookie
    };

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    // Handle 402 Payment Required
    if (response.status === 402) {
      const paymentB64 = response.headers.get('X-Payment-Required');
      const paymentDetails = JSON.parse(atob(paymentB64));
      
      headers['X-Payment'] = await this.signPayment(paymentDetails);
      
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
    }

    return response.json();
  }

  getProfile(username) {
    return this.request('/api/ai/scrape/profile', { username });
  }

  getFollowers(username, limit = 100) {
    return this.request('/api/ai/scrape/followers', { username, limit });
  }

  unfollowNonFollowers(username, limit = 100) {
    return this.request('/api/ai/action/unfollow-non-followers', { username, limit });
  }
}

// Usage
const client = new XActionsClient(
  '0x...',
  'your_auth_token'
);

const profile = await client.getProfile('elonmusk');
console.log(profile);
```

### cURL

```bash
# Step 1: Make initial request (will return 402)
curl -X POST https://api.xactions.app/api/ai/scrape/profile \
  -H "Content-Type: application/json" \
  -H "X-Session-Cookie: your_auth_token" \
  -d '{"username": "elonmusk"}'

# Step 2: Sign the payment details from X-Payment-Required header
# (Use your preferred signing tool)

# Step 3: Retry with payment
curl -X POST https://api.xactions.app/api/ai/scrape/profile \
  -H "Content-Type: application/json" \
  -H "X-Session-Cookie: your_auth_token" \
  -H "X-Payment: eyJhbW91bnQiOi..." \
  -d '{"username": "elonmusk"}'
```

---

## 🤖 MCP Integration

For AI assistants like Claude, use the MCP server with remote mode:

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["xactions-mcp"],
      "env": {
        "XACTIONS_MODE": "remote",
        "X402_PRIVATE_KEY": "0x...",
        "XACTIONS_SESSION_COOKIE": "your_auth_token"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `XACTIONS_MODE` | Yes | Set to `remote` for paid API, `local` for free Puppeteer |
| `X402_PRIVATE_KEY` | For remote | Your Ethereum wallet private key |
| `XACTIONS_SESSION_COOKIE` | Yes | Your X/Twitter auth_token cookie |

### Local vs Remote Mode

| Feature | Local Mode | Remote Mode |
|---------|-----------|-------------|
| Cost | **Free** | Pay-per-use |
| Setup | Requires Puppeteer | Just config |
| Speed | Slower (browser) | Fast (API) |
| Reliability | May break | Maintained |

---

## 🆓 Free Alternatives

If you don't need the remote API, use XActions for free:

### Browser Scripts
Copy-paste scripts directly in your browser console.
→ [View all scripts](/features)

### CLI Tool
```bash
npm install -g xactions
xactions unfollow --non-followers
```

### Node.js Library
```javascript
import { unfollowNonFollowers } from 'xactions';
await unfollowNonFollowers({ cookie: '...' });
```

### Local MCP Server
```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["xactions-mcp"],
      "env": {
        "XACTIONS_MODE": "local",
        "XACTIONS_SESSION_COOKIE": "..."
      }
    }
  }
}
```

---

## 📞 Support

- **GitHub Issues:** [github.com/nirholas/XActions/issues](https://github.com/nirholas/XActions/issues)
- **Twitter/X:** [@nichxbt](https://x.com/nichxbt)
- **Documentation:** [xactions.app/docs](https://xactions.app/docs)

---

## 📜 Terms

By using the AI API, you agree to:
- Use your own X/Twitter session cookie
- Respect X/Twitter's terms of service
- Accept usage-based pricing via x402
- Not abuse the API for spam or harassment

The API is provided as-is. We're not responsible for actions taken on your X account.
