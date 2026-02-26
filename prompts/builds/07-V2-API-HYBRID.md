# Track 07 — Twitter API v2 Hybrid Mode

> romeoscript/agent-twitter-client uses Twitter API v2 for features unavailable in GraphQL — polls, Spaces, conversations endpoint, analytics. XActions should support an optional v2 layer for users who have API keys, while defaulting to free GraphQL scraping.

---

## Research Before Starting

```
src/client/Scraper.js          — Main Scraper class (GraphQL-based)
src/client/http/HttpClient.js  — HTTP client
src/client/auth/               — Auth system (cookie-based)
```

Twitter API v2 Endpoints (requires Bearer Token or OAuth 2.0):
```
Base: https://api.twitter.com/2/

Tweets:
  GET /tweets/:id                    — Single tweet with expansions
  GET /tweets/search/recent          — Search last 7 days (Basic tier)
  GET /tweets/search/all             — Full archive (Academic/Pro tier)
  POST /tweets                       — Create tweet (with polls!)
  
Users:
  GET /users/:id                     — User lookup
  GET /users/:id/followers           — Followers list
  GET /users/:id/following           — Following list
  GET /users/me                      — Authenticated user
  
Spaces:
  GET /spaces/:id                    — Space details
  GET /spaces/search                 — Search active spaces
  GET /spaces/:id/tweets             — Tweets shared in space
  
Lists:
  GET /lists/:id/tweets              — List timeline
  POST /lists                        — Create list
  
Compliance:
  GET /tweets/compliance/stream      — Real-time compliance events
```

Auth models:
- OAuth 1.0a User Context — read/write, requires consumer key/secret + access token/secret
- OAuth 2.0 Bearer Token — app-only, read-only
- OAuth 2.0 PKCE — user context via authorization code flow

---

## Prompts

### Prompt 1: V2 Client Core

```
Create src/client/v2/V2Client.js.

A separate client for Twitter API v2 that works alongside the GraphQL scraper.

class V2Client {
  constructor(options = {}) {
    this.bearerToken = options.bearerToken;       // App-only token
    this.apiKey = options.apiKey;                  // OAuth 1.0a consumer key
    this.apiSecret = options.apiSecret;
    this.accessToken = options.accessToken;        // OAuth 1.0a access token
    this.accessSecret = options.accessSecret;
    this.httpClient = options.httpClient || new HttpClient();
    this.baseUrl = 'https://api.twitter.com/2';
    this.rateLimiter = new RateLimiter();
  }

  async get(endpoint, params = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getAuthHeaders('GET', url, params);
    
    const response = await this.httpClient.get(url, {
      params,
      headers,
    });
    
    // V2 returns { data, includes, meta, errors }
    if (response.errors) {
      throw V2ApiError.fromResponse(response);
    }
    
    return response;
  }

  async post(endpoint, body = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getAuthHeaders('POST', url);
    headers['Content-Type'] = 'application/json';
    
    return this.httpClient.post(url, JSON.stringify(body), { headers });
  }

  getAuthHeaders(method, url, params) {
    if (this.accessToken && this.apiKey) {
      // OAuth 1.0a — sign request
      return this.signOAuth1(method, url, params);
    } else if (this.bearerToken) {
      // Bearer token
      return { Authorization: `Bearer ${this.bearerToken}` };
    }
    throw new Error('No API credentials configured. Set bearerToken or OAuth 1.0a keys.');
  }
}

Export V2Client. This is the foundation for all v2 interactions.
```

### Prompt 2: OAuth 1.0a Request Signing

```
Create src/client/v2/oauth1.js.

Implement OAuth 1.0a signature generation (HMAC-SHA1) without external dependencies — use Node.js crypto.

export function signOAuth1Request(method, url, params, credentials) {
  const { apiKey, apiSecret, accessToken, accessSecret } = credentials;
  
  const nonce = generateNonce();
  const timestamp = Math.floor(Date.now() / 1000);
  
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };
  
  // 1. Combine all params (URL params + OAuth params + body params if form-encoded)
  const allParams = { ...params, ...oauthParams };
  
  // 2. Sort and encode
  const paramString = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');
  
  // 3. Build signature base string
  const baseString = [
    method.toUpperCase(),
    percentEncode(normalizeUrl(url)),
    percentEncode(paramString),
  ].join('&');
  
  // 4. Generate signing key
  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessSecret)}`;
  
  // 5. HMAC-SHA1
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
  
  oauthParams.oauth_signature = signature;
  
  // 6. Build Authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');
  
  return { Authorization: authHeader };
}

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function normalizeUrl(url) {
  const u = new URL(url);
  return `${u.protocol}//${u.host}${u.pathname}`;
}

All OAuth 1.0a signing math must be exact — Twitter rejects invalid signatures with 401.
```

### Prompt 3: OAuth 2.0 PKCE Authorization Flow

```
Create src/client/v2/oauth2.js.

Implement OAuth 2.0 Authorization Code Flow with PKCE for user-context v2 access.

export class OAuth2Handler {
  constructor(options) {
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri || 'http://localhost:3000/callback';
    this.scopes = options.scopes || ['tweet.read', 'tweet.write', 'users.read', 'follows.read', 'offline.access'];
    this.tokenStore = options.tokenStore; // Persistent storage for tokens
  }

  async getAuthorizationUrl() {
    // Generate PKCE code verifier (43-128 chars, unreserved characters)
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // Generate code challenge (SHA256 of verifier, base64url-encoded)
    this.codeChallenge = crypto
      .createHash('sha256')
      .update(this.codeVerifier)
      .digest('base64url');
    
    this.state = crypto.randomBytes(16).toString('hex');
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: this.state,
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256',
    });
    
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  async exchangeCode(code, returnedState) {
    if (returnedState !== this.state) throw new Error('State mismatch');
    
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code_verifier: this.codeVerifier,
      }),
    });
    
    const tokens = await response.json();
    // { token_type, expires_in, access_token, scope, refresh_token }
    
    if (this.tokenStore) {
      await this.tokenStore.save({
        ...tokens,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      });
    }
    
    return tokens;
  }

  async refreshToken(refreshToken) {
    // POST https://api.twitter.com/2/oauth2/token
    // grant_type=refresh_token
  }

  // Start local HTTP server for callback
  async startCallbackServer(port = 3000) {
    // Minimal HTTP server that captures the ?code= parameter
    // Returns HTML page saying "Auth successful, you can close this tab"
    // Resolves promise with the code
  }
}
```

### Prompt 4: V2 Response Expander

```
Create src/client/v2/expander.js.

Twitter API v2 returns minimal data by default. Expansions and fields must be requested.
This module builds the correct expansion parameters and resolves includes.

export const TWEET_EXPANSIONS = [
  'author_id',
  'referenced_tweets.id',
  'referenced_tweets.id.author_id',
  'in_reply_to_user_id',
  'attachments.media_keys',
  'attachments.poll_ids',
  'entities.mentions.username',
  'geo.place_id',
  'edit_history_tweet_ids',
];

export const TWEET_FIELDS = [
  'id', 'text', 'created_at', 'author_id', 'conversation_id',
  'in_reply_to_user_id', 'referenced_tweets', 'attachments',
  'context_annotations', 'entities', 'public_metrics',
  'possibly_sensitive', 'lang', 'reply_settings', 'source',
  'edit_controls', 'edit_history_tweet_ids',
];

export const USER_FIELDS = [
  'id', 'name', 'username', 'created_at', 'description',
  'entities', 'location', 'pinned_tweet_id', 'profile_image_url',
  'protected', 'public_metrics', 'url', 'verified', 'verified_type',
  'withheld', 'subscription_type',
];

export const MEDIA_FIELDS = [
  'media_key', 'type', 'url', 'preview_image_url', 'duration_ms',
  'height', 'width', 'alt_text', 'variants', 'public_metrics',
];

export const POLL_FIELDS = ['id', 'options', 'duration_minutes', 'end_datetime', 'voting_status'];
export const PLACE_FIELDS = ['id', 'full_name', 'country', 'country_code', 'geo', 'name', 'place_type'];

export function buildQueryParams(options = {}) {
  return {
    'tweet.fields': (options.tweetFields || TWEET_FIELDS).join(','),
    'user.fields': (options.userFields || USER_FIELDS).join(','),
    'media.fields': (options.mediaFields || MEDIA_FIELDS).join(','),
    'poll.fields': (options.pollFields || POLL_FIELDS).join(','),
    'place.fields': (options.placeFields || PLACE_FIELDS).join(','),
    expansions: (options.expansions || TWEET_EXPANSIONS).join(','),
  };
}

// Resolve includes back into the main data objects
export function resolveIncludes(response) {
  const { data, includes = {} } = response;
  const userMap = new Map((includes.users || []).map(u => [u.id, u]));
  const tweetMap = new Map((includes.tweets || []).map(t => [t.id, t]));
  const mediaMap = new Map((includes.media || []).map(m => [m.media_key, m]));
  const pollMap = new Map((includes.polls || []).map(p => [p.id, p]));
  
  function expandTweet(tweet) {
    return {
      ...tweet,
      author: userMap.get(tweet.author_id),
      referencedTweets: tweet.referenced_tweets?.map(rt => ({
        ...rt,
        tweet: tweetMap.get(rt.id),
      })),
      media: tweet.attachments?.media_keys?.map(k => mediaMap.get(k)).filter(Boolean),
      poll: tweet.attachments?.poll_ids?.map(id => pollMap.get(id))[0],
    };
  }
  
  if (Array.isArray(data)) {
    return data.map(expandTweet);
  }
  return expandTweet(data);
}
```

### Prompt 5: V2 Tweets API

```
Create src/client/v2/tweets.js.

export async function getTweet(v2Client, tweetId) {
  const params = buildQueryParams();
  const response = await v2Client.get(`/tweets/${tweetId}`, params);
  return resolveIncludes(response);
}

export async function getTweets(v2Client, tweetIds) {
  // Batch lookup, max 100 IDs
  const params = { ids: tweetIds.join(','), ...buildQueryParams() };
  const response = await v2Client.get('/tweets', params);
  return resolveIncludes(response);
}

export async function* searchRecent(v2Client, query, options = {}) {
  // GET /tweets/search/recent
  // Pagination via next_token (not cursor)
  const { maxResults = 100, startTime, endTime, sinceId, untilId } = options;
  let nextToken = null;
  let total = 0;
  
  do {
    const params = {
      query,
      max_results: Math.min(100, maxResults - total),
      ...(nextToken && { next_token: nextToken }),
      ...(startTime && { start_time: startTime }),
      ...(endTime && { end_time: endTime }),
      ...(sinceId && { since_id: sinceId }),
      ...(untilId && { until_id: untilId }),
      ...buildQueryParams(),
    };
    
    const response = await v2Client.get('/tweets/search/recent', params);
    const expanded = resolveIncludes(response);
    
    for (const tweet of expanded) {
      yield tweet;
      total++;
      if (total >= maxResults) return;
    }
    
    nextToken = response.meta?.next_token;
    if (nextToken) await sleep(1000);
  } while (nextToken);
}

export async function* searchAll(v2Client, query, options = {}) {
  // GET /tweets/search/all — Academic/Pro tier only
  // Same pagination pattern, different endpoint
}

export async function createTweet(v2Client, options) {
  // POST /tweets
  return v2Client.post('/tweets', {
    text: options.text,
    reply: options.replyTo ? { in_reply_to_tweet_id: options.replyTo } : undefined,
    quote_tweet_id: options.quoteTweet,
    media: options.mediaIds ? { media_ids: options.mediaIds, tagged_user_ids: options.taggedUsers } : undefined,
    poll: options.poll ? {
      options: options.poll.options,
      duration_minutes: options.poll.durationMinutes,
    } : undefined,
    reply_settings: options.replySettings, // 'everyone' | 'mentionedUsers' | 'following'
    for_super_followers_only: options.superFollowersOnly,
  });
}

export async function deleteTweet(v2Client, tweetId) {
  return v2Client.delete(`/tweets/${tweetId}`);
}
```

### Prompt 6: V2 Poll Creation

```
Create src/client/v2/polls.js.

Polls are ONLY available via v2 API — GraphQL scraper can read them but cannot create them.

export async function createPoll(v2Client, text, pollOptions, durationMinutes = 1440) {
  // Validate
  if (pollOptions.length < 2 || pollOptions.length > 4) {
    throw new Error('Polls require 2-4 options');
  }
  if (durationMinutes < 5 || durationMinutes > 10080) {
    throw new Error('Poll duration must be 5-10080 minutes (5 min to 7 days)');
  }
  for (const option of pollOptions) {
    if (option.length > 25) {
      throw new Error(`Poll option "${option}" exceeds 25 character limit`);
    }
  }
  
  return createTweet(v2Client, {
    text,
    poll: {
      options: pollOptions,
      durationMinutes,
    },
  });
}

export async function getPollResults(v2Client, tweetId) {
  // Fetch tweet with poll expansion
  const tweet = await getTweet(v2Client, tweetId);
  
  if (!tweet.poll) {
    throw new Error('Tweet does not contain a poll');
  }
  
  const totalVotes = tweet.poll.options.reduce((sum, o) => sum + o.votes, 0);
  
  return {
    id: tweet.poll.id,
    question: tweet.text,
    options: tweet.poll.options.map(o => ({
      position: o.position,
      label: o.label,
      votes: o.votes,
      percentage: totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0,
    })),
    totalVotes,
    endDatetime: tweet.poll.end_datetime,
    votingStatus: tweet.poll.voting_status, // 'open' | 'closed'
    durationMinutes: tweet.poll.duration_minutes,
  };
}
```

### Prompt 7: V2 Spaces API

```
Create src/client/v2/spaces.js.

export async function getSpace(v2Client, spaceId) {
  const params = {
    'space.fields': 'id,state,title,host_ids,created_at,started_at,ended_at,lang,is_ticketed,participant_count,scheduled_start,speaker_ids,invited_user_ids,topic_ids,subscriber_count',
    'user.fields': USER_FIELDS.join(','),
    expansions: 'host_ids,speaker_ids,creator_id,invited_user_ids',
  };
  
  const response = await v2Client.get(`/spaces/${spaceId}`, params);
  return resolveSpaceIncludes(response);
}

export async function searchSpaces(v2Client, query, options = {}) {
  const { state = 'live' } = options; // 'live' | 'scheduled' | 'all'
  
  const params = {
    query,
    state,
    'space.fields': 'id,state,title,host_ids,participant_count,scheduled_start,started_at',
    expansions: 'host_ids',
    'user.fields': 'id,name,username,profile_image_url',
  };
  
  const response = await v2Client.get('/spaces/search', params);
  return response.data || [];
}

export async function getSpaceTweets(v2Client, spaceId) {
  const params = buildQueryParams();
  const response = await v2Client.get(`/spaces/${spaceId}/tweets`, params);
  return resolveIncludes(response);
}

export async function getSpaceBuyers(v2Client, spaceId) {
  // For ticketed Spaces
  const response = await v2Client.get(`/spaces/${spaceId}/buyers`);
  return response.data || [];
}
```

### Prompt 8: Hybrid Scraper — Unified Interface

```
Create src/client/HybridScraper.js.

A unified interface that uses GraphQL for free operations and v2 for premium features.

import { Scraper } from './Scraper.js';
import { V2Client } from './v2/V2Client.js';

export class HybridScraper extends Scraper {
  constructor(options = {}) {
    super(options);
    
    this.v2 = null;
    if (options.apiKey || options.bearerToken) {
      this.v2 = new V2Client({
        apiKey: options.apiKey,
        apiSecret: options.apiSecret,
        accessToken: options.accessToken,
        accessSecret: options.accessSecret,
        bearerToken: options.bearerToken,
        httpClient: this.httpClient,
      });
    }
  }

  get hasV2() { return this.v2 !== null; }

  // Prefer GraphQL (free), fall back to v2 if needed
  async getProfile(username) {
    return super.getProfile(username); // Always use GraphQL — it's free
  }

  // v2-only features
  async createPoll(text, options, duration) {
    this.requireV2('Poll creation requires API v2 credentials');
    return createPoll(this.v2, text, options, duration);
  }

  async searchSpaces(query, options) {
    this.requireV2('Spaces search requires API v2 credentials');
    return searchSpaces(this.v2, query, options);
  }

  // v2-enhanced features (GraphQL base + v2 enrichment)
  async searchTweets(query, options = {}) {
    if (this.hasV2 && options.useV2) {
      // v2 search: more structured, supports academic archive
      return searchRecent(this.v2, query, options);
    }
    return super.searchTweets(query, options); // Default: GraphQL
  }

  // Helper
  requireV2(message) {
    if (!this.v2) {
      throw new Error(`${message}. Initialize with apiKey/bearerToken options.`);
    }
  }
}
```

### Prompt 9: V2 Analytics and Metrics

```
Create src/client/v2/analytics.js.

Tweet-level analytics available through v2 with proper access:

export async function getTweetMetrics(v2Client, tweetId) {
  // Uses organic_metrics, non_public_metrics, promoted_metrics fields
  // Requires user context (OAuth 1.0a) for non-public metrics
  const params = {
    'tweet.fields': 'public_metrics,organic_metrics,non_public_metrics',
  };
  
  const response = await v2Client.get(`/tweets/${tweetId}`, params);
  
  return {
    public: response.data.public_metrics,
    // { retweet_count, reply_count, like_count, quote_count, bookmark_count, impression_count }
    organic: response.data.organic_metrics,
    // { impression_count, url_link_clicks, user_profile_clicks }
    nonPublic: response.data.non_public_metrics,
    // { impression_count, url_link_clicks, user_profile_clicks }
  };
}

export async function getUserMetrics(v2Client, userId) {
  const params = {
    'user.fields': 'public_metrics,created_at',
  };
  
  const response = await v2Client.get(`/users/${userId}`, params);
  
  return {
    followers: response.data.public_metrics.followers_count,
    following: response.data.public_metrics.following_count,
    tweets: response.data.public_metrics.tweet_count,
    listed: response.data.public_metrics.listed_count,
    likes: response.data.public_metrics.like_count,
    accountAge: new Date() - new Date(response.data.created_at),
  };
}

export async function* getRecentMentions(v2Client, userId, options = {}) {
  // GET /users/:id/mentions — paginated
  // Returns tweets mentioning the user
}

export async function* getRecentTweets(v2Client, userId, options = {}) {
  // GET /users/:id/tweets — paginated with next_token
  // Includes detailed metrics per tweet
}
```

### Prompt 10: V2 Bookmarks and Likes Mutations

```
Create src/client/v2/interactions.js.

Write operations through v2 API:

export async function likeTweet(v2Client, userId, tweetId) {
  return v2Client.post(`/users/${userId}/likes`, { tweet_id: tweetId });
}

export async function unlikeTweet(v2Client, userId, tweetId) {
  return v2Client.delete(`/users/${userId}/likes/${tweetId}`);
}

export async function retweet(v2Client, userId, tweetId) {
  return v2Client.post(`/users/${userId}/retweets`, { tweet_id: tweetId });
}

export async function unretweet(v2Client, userId, tweetId) {
  return v2Client.delete(`/users/${userId}/retweets/${tweetId}`);
}

export async function follow(v2Client, userId, targetUserId) {
  return v2Client.post(`/users/${userId}/following`, { target_user_id: targetUserId });
}

export async function unfollow(v2Client, userId, targetUserId) {
  return v2Client.delete(`/users/${userId}/following/${targetUserId}`);
}

export async function block(v2Client, userId, targetUserId) {
  return v2Client.post(`/users/${userId}/blocking`, { target_user_id: targetUserId });
}

export async function mute(v2Client, userId, targetUserId) {
  return v2Client.post(`/users/${userId}/muting`, { target_user_id: targetUserId });
}

export async function bookmark(v2Client, userId, tweetId) {
  return v2Client.post(`/users/${userId}/bookmarks`, { tweet_id: tweetId });
}

export async function removeBookmark(v2Client, userId, tweetId) {
  return v2Client.delete(`/users/${userId}/bookmarks/${tweetId}`);
}

export async function hideReply(v2Client, tweetId) {
  return v2Client.put(`/tweets/${tweetId}/hidden`, { hidden: true });
}
```

### Prompt 11: V2 Streaming (Filtered Stream)

```
Create src/client/v2/stream.js.

Twitter v2 filtered stream for real-time tweet matching.

export class FilteredStream {
  constructor(v2Client) {
    this.v2Client = v2Client;
    this.connection = null;
    this.rules = [];
    this.handlers = new Map();
  }

  async addRule(value, tag) {
    // POST /tweets/search/stream/rules
    const response = await this.v2Client.post('/tweets/search/stream/rules', {
      add: [{ value, tag }],
    });
    return response.data;
  }

  async deleteRules(ids) {
    await this.v2Client.post('/tweets/search/stream/rules', {
      delete: { ids },
    });
  }

  async getRules() {
    const response = await this.v2Client.get('/tweets/search/stream/rules');
    this.rules = response.data || [];
    return this.rules;
  }

  async connect(options = {}) {
    const params = {
      ...buildQueryParams(),
      ...(options.backfillMinutes && { backfill_minutes: options.backfillMinutes }),
    };
    
    // GET /tweets/search/stream — SSE connection
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/stream?${new URLSearchParams(params)}`,
      {
        headers: this.v2Client.getAuthHeaders('GET', 'https://api.twitter.com/2/tweets/search/stream'),
        signal: this.abortController?.signal,
      }
    );
    
    // Read NDJSON stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\r\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (!line.trim()) continue; // heartbeat
        try {
          const tweet = JSON.parse(line);
          this.emit('tweet', resolveIncludes(tweet));
          
          // Route to tag-specific handlers
          for (const rule of tweet.matching_rules || []) {
            const handler = this.handlers.get(rule.tag);
            if (handler) handler(resolveIncludes(tweet));
          }
        } catch (e) {
          this.emit('error', e);
        }
      }
    }
  }

  on(tag, handler) {
    this.handlers.set(tag, handler);
  }

  disconnect() {
    this.abortController?.abort();
  }
}
```

### Prompt 12: V2 Module Index and Configuration

```
Create src/client/v2/index.js.

export { V2Client } from './V2Client.js';
export { signOAuth1Request } from './oauth1.js';
export { OAuth2Handler } from './oauth2.js';
export { buildQueryParams, resolveIncludes, TWEET_EXPANSIONS, TWEET_FIELDS, USER_FIELDS, MEDIA_FIELDS, POLL_FIELDS } from './expander.js';
export * as tweets from './tweets.js';
export * as polls from './polls.js';
export * as spaces from './spaces.js';
export * as analytics from './analytics.js';
export * as interactions from './interactions.js';
export { FilteredStream } from './stream.js';

// API Tier detection
export const API_TIERS = {
  FREE: { searchRecent: 10, tweetLookup: 10, userLookup: 10 },    // per 15min
  BASIC: { searchRecent: 60, tweetLookup: 300, userLookup: 300 },
  PRO: { searchRecent: 300, tweetLookup: 900, userLookup: 900, searchAll: true },
  ENTERPRISE: { unlimited: true, searchAll: true, filteredStream: true },
};

// Auto-detect tier from rate limit headers
export function detectApiTier(rateLimits) {
  const searchLimit = rateLimits.get('/tweets/search/recent')?.limit;
  if (!searchLimit) return 'FREE';
  if (searchLimit <= 10) return 'FREE';
  if (searchLimit <= 60) return 'BASIC';
  if (searchLimit <= 300) return 'PRO';
  return 'ENTERPRISE';
}

Update src/client/index.js:
export { HybridScraper } from './HybridScraper.js';
export * as v2 from './v2/index.js';

Update package.json exports:
"./v2": "./src/client/v2/index.js"
```

### Prompt 13: V2 Error Handling

```
Create src/client/v2/errors.js.

export class V2ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'V2ApiError';
    this.status = options.status;
    this.type = options.type;
    this.title = options.title;
    this.detail = options.detail;
    this.errors = options.errors; // Array of individual field errors
  }

  static fromResponse(response) {
    // V2 error format: { title, detail, type, status }
    // Or: { errors: [{ message, parameters, ... }] }
    if (response.title) {
      return new V2ApiError(response.detail || response.title, {
        status: response.status,
        type: response.type,
        title: response.title,
        detail: response.detail,
      });
    }
    if (response.errors) {
      const messages = response.errors.map(e => e.message).join('; ');
      return new V2ApiError(messages, { errors: response.errors });
    }
    return new V2ApiError('Unknown V2 API error');
  }

  get isRateLimit() { return this.status === 429; }
  get isAuth() { return this.status === 401 || this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isForbidden() { return this.status === 403; }
}

// Map v2 errors to standard XActions error types
export function normalizeV2Error(error) {
  if (error.isRateLimit) return new RateLimitError(error.message, { source: 'v2' });
  if (error.isAuth) return new AuthenticationError(error.message, { source: 'v2' });
  if (error.isNotFound) return new NotFoundError(error.message, { source: 'v2' });
  return error;
}
```

### Prompt 14: MCP and CLI v2 Integration

```
Add v2 tools to MCP (src/mcp/local-tools.js):

x_v2_create_poll:
  params: { text, options: string[], durationMinutes }
  handler: Use HybridScraper.createPoll

x_v2_search_spaces:
  params: { query, state? }
  handler: Use HybridScraper.searchSpaces

x_v2_get_space:
  params: { spaceId }
  handler: Return space details

x_v2_tweet_analytics:
  params: { tweetId }
  handler: Return public + organic metrics

x_v2_create_filtered_stream:
  params: { rules: { value, tag }[] }
  handler: Set up stream rules, return confirmation

Add CLI commands:

xactions v2 auth
  → Interactive OAuth 2.0 PKCE flow (opens browser, starts callback server)

xactions v2 poll "Question?" --options "Yes" "No" "Maybe" --duration 1440
  → Create poll

xactions v2 spaces search "ai"
  → Search active Spaces

xactions v2 analytics <tweetId>
  → Show tweet metrics
```

### Prompt 15: V2 Tests

```
Create tests/client/v2.test.js.

15 tests:
1. signOAuth1Request generates valid Authorization header format
2. signOAuth1Request signature matches known test vector (use Twitter's published test values)
3. OAuth2Handler.getAuthorizationUrl includes PKCE challenge and state
4. buildQueryParams returns all field/expansion parameters
5. resolveIncludes attaches author to tweet data
6. resolveIncludes maps media_keys to media objects
7. V2Client.get adds Bearer token header
8. V2ApiError.fromResponse parses v2 error format
9. createTweet sends correct POST body with poll options
10. createPoll validates 2-4 options and 25 char limit
11. HybridScraper.getProfile uses GraphQL (not v2)
12. HybridScraper.createPoll throws without v2 credentials
13. HybridScraper.createPoll succeeds with v2 configured
14. detectApiTier maps rate limits to correct tier names
15. FilteredStream.addRule sends correct POST body
```

---

## Validation

```bash
node -e "import('./src/client/v2/index.js').then(m => console.log('✅ V2 module loaded'))"
node -e "import('./src/client/HybridScraper.js').then(m => console.log('✅ HybridScraper loaded'))"
npx vitest run tests/client/v2.test.js
```
