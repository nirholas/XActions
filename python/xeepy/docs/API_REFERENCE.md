# Xeepy REST API Reference

Complete reference for the Xeepy REST API.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

If an API key is configured, include it in the header:

```
X-API-Key: your-api-key
```

## Endpoints

---

## Health & Status

### GET /

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### GET /status

Get API status and available features.

**Response:**
```json
{
  "authenticated": true,
  "features": ["scrape", "follow", "unfollow", "engage", "monitor", "ai"],
  "rate_limit": 60
}
```

---

## Scraping Endpoints

### GET /api/v1/scrape/profile/{username}

Scrape a user's profile.

**Parameters:**
- `username` (path): Twitter username

**Response:**
```json
{
  "username": "elonmusk",
  "display_name": "Elon Musk",
  "bio": "...",
  "followers_count": 150000000,
  "following_count": 500,
  "tweets_count": 25000,
  "verified": true,
  "created_at": "2009-06-02T00:00:00Z"
}
```

### GET /api/v1/scrape/followers/{username}

Scrape followers of a user.

**Parameters:**
- `username` (path): Twitter username
- `limit` (query): Max results (1-1000, default: 100)
- `offset` (query): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "username": "follower1",
      "display_name": "Follower One",
      "followers_count": 1000
    }
  ],
  "total": 1000000,
  "limit": 100,
  "offset": 0,
  "has_more": true
}
```

### GET /api/v1/scrape/following/{username}

Scrape accounts a user is following.

**Parameters:** Same as followers endpoint.

### GET /api/v1/scrape/tweets/{username}

Scrape a user's tweets.

**Parameters:**
- `username` (path): Twitter username
- `limit` (query): Max tweets (1-500, default: 50)
- `offset` (query): Pagination offset
- `include_replies` (query): Include replies (default: false)
- `include_retweets` (query): Include retweets (default: false)

**Response:**
```json
{
  "data": [
    {
      "id": "123456789",
      "text": "Tweet content...",
      "author": "username",
      "likes": 1000,
      "retweets": 100,
      "replies": 50,
      "created_at": "2024-01-15T12:00:00Z"
    }
  ],
  "total": 500,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

### POST /api/v1/scrape/replies

Scrape replies to a tweet.

**Request Body:**
```json
{
  "tweet_url": "https://twitter.com/user/status/123456789",
  "limit": 100
}
```

### POST /api/v1/scrape/thread

Scrape an entire thread.

**Request Body:**
```json
{
  "tweet_url": "https://twitter.com/user/status/123456789"
}
```

**Response:**
```json
{
  "thread_id": "thread_123",
  "author": "username",
  "tweets": [
    {"id": "1", "text": "Tweet 1..."},
    {"id": "2", "text": "Tweet 2..."}
  ],
  "total_tweets": 5
}
```

### POST /api/v1/scrape/search

Search for tweets or users.

**Request Body:**
```json
{
  "query": "AI machine learning",
  "type": "tweets",
  "limit": 50
}
```

---

## Follow Endpoints

### POST /api/v1/follow/user

Follow a specific user.

**Request Body:**
```json
{
  "username": "target_user"
}
```

**Response:**
```json
{
  "success": true,
  "username": "target_user",
  "message": "Successfully followed @target_user"
}
```

### POST /api/v1/follow/bulk

Follow multiple users (background job).

**Request Body:**
```json
{
  "usernames": ["user1", "user2", "user3"],
  "delay_seconds": 5.0
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "action": "bulk_follow",
  "target_count": 3,
  "created_at": "2024-01-15T12:00:00Z"
}
```

### POST /api/v1/follow/by-keyword

Follow users tweeting about keywords.

**Request Body:**
```json
{
  "keywords": ["AI", "machine learning"],
  "max_follows": 50,
  "min_followers": 100,
  "max_followers": 100000,
  "verified_only": false
}
```

### POST /api/v1/follow/followers-of

Follow followers of an account.

**Request Body:**
```json
{
  "username": "competitor",
  "max_follows": 100,
  "min_followers": 50,
  "skip_private": true
}
```

### DELETE /api/v1/follow/user

Unfollow a user.

**Request Body:**
```json
{
  "username": "target_user"
}
```

### POST /api/v1/follow/unfollow/non-followers

Unfollow non-followers.

**Request Body:**
```json
{
  "max_unfollows": 100,
  "whitelist": ["friend1", "friend2"],
  "min_days_following": 7
}
```

### POST /api/v1/follow/unfollow/inactive

Unfollow inactive users.

**Request Body:**
```json
{
  "days_inactive": 90,
  "max_unfollows": 100,
  "whitelist": []
}
```

### POST /api/v1/follow/unfollow/smart

Smart unfollow operation.

**Request Body:**
```json
{
  "preserve_engagement": true,
  "preserve_recent_days": 30,
  "target_ratio": 1.5,
  "max_unfollows": 50
}
```

### GET /api/v1/follow/stats

Get follow statistics.

**Response:**
```json
{
  "total_following": 1500,
  "total_followers": 1000,
  "ratio": 1.5,
  "non_followers": 800,
  "inactive_following": 200
}
```

---

## Engagement Endpoints

### POST /api/v1/engage/like

Like a tweet.

**Request Body:**
```json
{
  "tweet_url": "https://twitter.com/user/status/123"
}
```

### DELETE /api/v1/engage/like

Unlike a tweet.

### POST /api/v1/engage/auto-like

Auto-like tweets (background job).

**Request Body:**
```json
{
  "keywords": ["AI", "tech"],
  "max_likes": 50,
  "duration_minutes": 30,
  "min_likes": 0,
  "max_likes_count": 10000,
  "verified_only": false
}
```

### POST /api/v1/engage/comment

Comment on a tweet.

**Request Body:**
```json
{
  "tweet_url": "https://twitter.com/user/status/123",
  "text": "Great tweet!",
  "use_ai": false,
  "style": "helpful"
}
```

### POST /api/v1/engage/auto-comment

Auto-comment (background job).

**Request Body:**
```json
{
  "keywords": ["AI", "tech"],
  "max_comments": 20,
  "style": "helpful",
  "duration_minutes": 60
}
```

### POST /api/v1/engage/retweet

Retweet or quote tweet.

**Request Body:**
```json
{
  "tweet_url": "https://twitter.com/user/status/123",
  "quote": "Optional quote text",
  "ai_quote": false
}
```

### POST /api/v1/engage/auto-engage

Auto-engage with a user.

**Request Body:**
```json
{
  "username": "target_user",
  "likes": 5,
  "comments": 2,
  "retweets": 1,
  "style": "helpful"
}
```

---

## Monitoring Endpoints

### GET /api/v1/monitor/unfollowers

Get unfollower report.

**Parameters:**
- `compare_snapshot` (query): Snapshot ID to compare with

**Response:**
```json
{
  "snapshot_date": "2024-01-15T12:00:00Z",
  "current_followers": 10000,
  "previous_followers": 10050,
  "new_followers": 20,
  "unfollowers": [
    {"username": "unfollower1", "unfollowed_at": "2024-01-15T10:00:00Z"}
  ],
  "net_change": -30
}
```

### POST /api/v1/monitor/unfollowers/snapshot

Create a follower snapshot.

### GET /api/v1/monitor/growth

Get growth report.

**Parameters:**
- `period` (query): "1d", "7d", or "30d" (default: "7d")

**Response:**
```json
{
  "period": "7d",
  "followers_start": 9500,
  "followers_end": 10000,
  "followers_change": 500,
  "followers_change_pct": 5.26,
  "engagement": {
    "avg_likes": 50,
    "avg_retweets": 10,
    "avg_replies": 5,
    "engagement_rate": 2.5
  },
  "best_posting_times": ["9am", "12pm", "6pm"]
}
```

### GET /api/v1/monitor/account/{username}

Get account statistics.

### POST /api/v1/monitor/account/{username}/track

Add account to tracking.

### GET /api/v1/monitor/keywords

Get keyword statistics.

**Parameters:**
- `keywords` (query): List of keywords

### GET /api/v1/monitor/mentions

Get recent mentions.

**Parameters:**
- `limit` (query): Max results
- `since` (query): ISO datetime

---

## AI Endpoints

### POST /api/v1/ai/generate/reply

Generate an AI reply.

**Request Body:**
```json
{
  "tweet_text": "Just launched my AI startup!",
  "style": "helpful",
  "max_length": 280,
  "num_alternatives": 3
}
```

**Response:**
```json
{
  "tweet_text": "Just launched my AI startup!",
  "replies": [
    "Congratulations! What problem does your startup solve?",
    "That's exciting! Would love to learn more about your tech.",
    "Amazing! The AI space is so hot right now."
  ],
  "style": "helpful"
}
```

### POST /api/v1/ai/generate/tweet

Generate a tweet about a topic.

**Request Body:**
```json
{
  "topic": "Python tips",
  "style": "informative",
  "hashtags": ["Python", "coding"]
}
```

### POST /api/v1/ai/generate/thread

Generate a tweet thread.

**Request Body:**
```json
{
  "topic": "Machine learning basics",
  "num_tweets": 5,
  "style": "educational"
}
```

**Response:**
```json
{
  "topic": "Machine learning basics",
  "tweets": [
    "🧵 Let's talk about Machine Learning basics...",
    "1/ First, what is ML? It's...",
    "2/ There are three main types...",
    "3/ Here's how to get started...",
    "4/ Best resources to learn..."
  ],
  "total_tweets": 5
}
```

### POST /api/v1/ai/improve

Improve text for engagement.

**Request Body:**
```json
{
  "text": "I made a new app",
  "goal": "engagement"
}
```

**Response:**
```json
{
  "original": "I made a new app",
  "improved": "🚀 Just shipped my latest app! After 3 months of building, it's finally live. Here's what I learned...",
  "goal": "engagement"
}
```

### POST /api/v1/ai/analyze/sentiment

Analyze sentiment.

**Request Body:**
```json
{
  "text": "This product is amazing! Best purchase ever!",
  "include_emotions": true
}
```

**Response:**
```json
{
  "text": "This product is amazing! Best purchase ever!",
  "sentiment": "positive",
  "score": 0.85,
  "confidence": 0.92,
  "emotions": {
    "joy": 0.8,
    "trust": 0.6,
    "anticipation": 0.3
  }
}
```

### POST /api/v1/ai/analyze/bot

Analyze for bot/spam.

**Request Body:**
```json
{
  "username": "suspicious_account",
  "profile_data": {
    "followers_count": 10,
    "following_count": 5000,
    "tweets_count": 50
  }
}
```

**Response:**
```json
{
  "username": "suspicious_account",
  "bot_probability": 0.75,
  "spam_probability": 0.80,
  "fake_probability": 0.70,
  "quality_score": 25,
  "red_flags": [
    "High following/followers ratio (500:1)",
    "Low tweet count for account age",
    "No profile picture"
  ]
}
```

### POST /api/v1/ai/targeting

Find target accounts.

**Request Body:**
```json
{
  "niche": "AI/ML",
  "goal": "growth",
  "limit": 10
}
```

**Response:**
```json
[
  {
    "username": "ai_researcher",
    "score": 85,
    "reasons": ["Active in niche", "Good engagement"],
    "recommended_actions": ["Follow", "Engage with recent tweets"],
    "estimated_follow_back_chance": 0.35,
    "priority": "high"
  }
]
```

### POST /api/v1/ai/crypto/sentiment

Crypto token sentiment.

**Request Body:**
```json
{
  "token": "BTC",
  "tweets": []
}
```

**Response:**
```json
{
  "token": "BTC",
  "sentiment_label": "bullish",
  "overall_sentiment": 0.65,
  "volume": 1000,
  "trending": true,
  "key_influencers": ["whale_alert", "btc_analyst"],
  "common_narratives": ["halving", "ETF approval"],
  "warning_signs": []
}
```

### GET /api/v1/ai/status

Get AI feature status.

**Response:**
```json
{
  "ai_enabled": true,
  "providers": {
    "openai": {"available": true, "model": "gpt-4-turbo-preview"},
    "anthropic": {"available": false, "model": null},
    "local": {"available": false, "model": null}
  },
  "features": [
    "content_generation",
    "sentiment_analysis",
    "spam_detection",
    "smart_targeting",
    "crypto_analysis"
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing API key |
| 403 | Forbidden - Invalid API key |
| 404 | Not Found - Resource doesn't exist |
| 422 | Validation Error - Invalid request body |
| 429 | Rate Limited - Too many requests |
| 500 | Server Error |
| 503 | Service Unavailable - AI provider not configured |

---

## Rate Limiting

Default: 60 requests per minute.

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1705320000
```

---

## SDKs

### Python

```python
import httpx

client = httpx.Client(
    base_url="http://localhost:8000",
    headers={"X-API-Key": "your-api-key"}
)

# Generate a reply
response = client.post("/api/v1/ai/generate/reply", json={
    "tweet_text": "Just launched my startup!",
    "style": "helpful"
})
print(response.json())
```

### JavaScript

```javascript
const response = await fetch('http://localhost:8000/api/v1/ai/generate/reply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    tweet_text: 'Just launched my startup!',
    style: 'helpful'
  })
});

const data = await response.json();
console.log(data);
```

### cURL

```bash
curl -X POST http://localhost:8000/api/v1/ai/generate/reply \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"tweet_text": "Just launched my startup!", "style": "helpful"}'
```
