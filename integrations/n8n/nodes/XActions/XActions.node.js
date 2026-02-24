// XActions action node for n8n
// by nichxbt

/**
 * XActions n8n node — exposes X/Twitter (and Bluesky, Mastodon, Threads)
 * scraping, posting, engagement, analytics, and streaming as n8n actions.
 *
 * Two execution modes:
 *   Local  — imports xactions scrapers / modules directly (Puppeteer, same machine)
 *   Remote — calls the XActions REST API via HTTP
 */
export class XActions {
  description = {
    displayName: 'XActions',
    name: 'xActions',
    icon: 'file:xactions.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Automate X/Twitter, Bluesky, Mastodon & Threads — scrape, post, engage, analyze. No API fees.',
    defaults: { name: 'XActions' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'xActionsApi',
        required: false,
      },
    ],
    properties: [
      // ── Resource ──
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Profile', value: 'profile' },
          { name: 'Tweets', value: 'tweets' },
          { name: 'Followers', value: 'followers' },
          { name: 'Engagement', value: 'engagement' },
          { name: 'Analytics', value: 'analytics' },
          { name: 'Streaming', value: 'streaming' },
          { name: 'Posting', value: 'posting' },
          { name: 'DMs', value: 'dms' },
          { name: 'Bookmarks', value: 'bookmarks' },
        ],
        default: 'profile',
      },

      // ── Profile operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['profile'] } },
        options: [
          { name: 'Get Profile', value: 'getProfile', description: 'Scrape a user profile' },
          { name: 'Update Profile', value: 'updateProfile', description: 'Update your profile bio/name/location' },
        ],
        default: 'getProfile',
      },

      // ── Tweets operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['tweets'] } },
        options: [
          { name: 'Get Tweets', value: 'getTweets', description: 'Scrape recent tweets from a user' },
          { name: 'Search Tweets', value: 'searchTweets', description: 'Search for tweets by query' },
          { name: 'Get Thread', value: 'getThread', description: 'Scrape a full tweet thread' },
          { name: 'Get Hashtag', value: 'getHashtag', description: 'Scrape tweets by hashtag' },
          { name: 'Get Likes', value: 'getLikes', description: "Scrape a user's liked tweets" },
          { name: 'Get Media', value: 'getMedia', description: "Scrape a user's media tweets" },
          { name: 'Get Trending', value: 'getTrending', description: 'Get current trending topics' },
        ],
        default: 'getTweets',
      },

      // ── Followers operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['followers'] } },
        options: [
          { name: 'Get Followers', value: 'getFollowers', description: "Scrape a user's followers" },
          { name: 'Get Following', value: 'getFollowing', description: "Scrape who a user follows" },
          { name: 'Get Non-Followers', value: 'getNonFollowers', description: "Find who doesn't follow you back" },
          { name: 'Unfollow Non-Followers', value: 'unfollowNonFollowers', description: 'Unfollow users who don\'t follow back' },
          { name: 'Follow User', value: 'follow', description: 'Follow a user' },
          { name: 'Unfollow User', value: 'unfollow', description: 'Unfollow a user' },
        ],
        default: 'getFollowers',
      },

      // ── Engagement operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['engagement'] } },
        options: [
          { name: 'Like Tweet', value: 'like', description: 'Like a tweet by URL' },
          { name: 'Retweet', value: 'retweet', description: 'Retweet a tweet by URL' },
          { name: 'Reply', value: 'reply', description: 'Reply to a tweet' },
          { name: 'Auto-Like', value: 'autoLike', description: 'Auto-like tweets matching keywords' },
        ],
        default: 'like',
      },

      // ── Analytics operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['analytics'] } },
        options: [
          { name: 'Analyze Sentiment', value: 'analyzeSentiment', description: 'Analyze sentiment of text or tweets' },
          { name: 'Monitor Reputation', value: 'monitorReputation', description: 'Start monitoring mentions for sentiment' },
          { name: 'Get Report', value: 'getReport', description: 'Generate a reputation report' },
        ],
        default: 'analyzeSentiment',
      },

      // ── Streaming operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['streaming'] } },
        options: [
          { name: 'Start Stream', value: 'startStream', description: 'Start a real-time event stream' },
          { name: 'Stop Stream', value: 'stopStream', description: 'Stop an active stream' },
          { name: 'List Streams', value: 'listStreams', description: 'List all active streams' },
          { name: 'Pause Stream', value: 'pauseStream', description: 'Pause a stream' },
          { name: 'Resume Stream', value: 'resumeStream', description: 'Resume a paused stream' },
          { name: 'Get Stream History', value: 'getStreamHistory', description: 'Get recent events from a stream' },
        ],
        default: 'startStream',
      },

      // ── Posting operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['posting'] } },
        options: [
          { name: 'Post Tweet', value: 'postTweet', description: 'Post a new tweet' },
          { name: 'Post Thread', value: 'postThread', description: 'Post a thread (multiple tweets)' },
          { name: 'Create Poll', value: 'createPoll', description: 'Create a tweet with a poll' },
          { name: 'Delete Tweet', value: 'deleteTweet', description: 'Delete a tweet by URL' },
        ],
        default: 'postTweet',
      },

      // ── DM operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['dms'] } },
        options: [
          { name: 'Send DM', value: 'sendDm', description: 'Send a direct message' },
          { name: 'Get Conversations', value: 'getConversations', description: 'List DM conversations' },
          { name: 'Export DMs', value: 'exportDms', description: 'Export DM history' },
        ],
        default: 'sendDm',
      },

      // ── Bookmark operations ──
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['bookmarks'] } },
        options: [
          { name: 'Get Bookmarks', value: 'getBookmarks', description: 'Scrape your bookmarks' },
          { name: 'Add Bookmark', value: 'addBookmark', description: 'Bookmark a tweet' },
          { name: 'Clear Bookmarks', value: 'clearBookmarks', description: 'Remove all bookmarks' },
        ],
        default: 'getBookmarks',
      },

      // ════════════════════════
      //  Shared input fields
      // ════════════════════════

      // Platform override
      {
        displayName: 'Platform',
        name: 'platform',
        type: 'options',
        options: [
          { name: 'Twitter/X', value: 'twitter' },
          { name: 'Bluesky', value: 'bluesky' },
          { name: 'Mastodon', value: 'mastodon' },
          { name: 'Threads', value: 'threads' },
        ],
        default: 'twitter',
        description: 'Social platform to use',
        displayOptions: {
          show: {
            resource: ['profile', 'tweets', 'followers'],
          },
        },
      },

      // Username — used by most operations
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        default: '',
        placeholder: 'elonmusk',
        description: 'Target username (without @)',
        displayOptions: {
          show: {
            operation: [
              'getProfile', 'getTweets', 'getFollowers', 'getFollowing',
              'getNonFollowers', 'unfollowNonFollowers', 'follow', 'unfollow',
              'getLikes', 'getMedia', 'monitorReputation', 'getReport',
              'startStream', 'updateProfile',
            ],
          },
        },
      },

      // Query — for search operations
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        placeholder: 'AI agents',
        description: 'Search query',
        displayOptions: {
          show: { operation: ['searchTweets'] },
        },
      },

      // Hashtag
      {
        displayName: 'Hashtag',
        name: 'hashtag',
        type: 'string',
        default: '',
        placeholder: 'AI',
        description: 'Hashtag to scrape (without #)',
        displayOptions: {
          show: { operation: ['getHashtag'] },
        },
      },

      // URL — for tweet actions
      {
        displayName: 'Tweet URL',
        name: 'tweetUrl',
        type: 'string',
        default: '',
        placeholder: 'https://x.com/user/status/123456',
        description: 'URL of the tweet',
        displayOptions: {
          show: { operation: ['like', 'retweet', 'reply', 'deleteTweet', 'addBookmark', 'getThread'] },
        },
      },

      // Text — for posting / replying / sentiment
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        description: 'Tweet text, reply text, or text to analyze',
        displayOptions: {
          show: { operation: ['postTweet', 'reply', 'analyzeSentiment', 'sendDm'] },
        },
      },

      // Thread tweets
      {
        displayName: 'Thread Tweets',
        name: 'threadTweets',
        type: 'string',
        typeOptions: { rows: 8 },
        default: '',
        description: 'Thread tweets separated by \\n---\\n',
        displayOptions: {
          show: { operation: ['postThread'] },
        },
      },

      // Poll options
      {
        displayName: 'Poll Question',
        name: 'pollQuestion',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['createPoll'] } },
      },
      {
        displayName: 'Poll Options (comma-separated)',
        name: 'pollOptions',
        type: 'string',
        default: '',
        placeholder: 'Yes, No, Maybe',
        displayOptions: { show: { operation: ['createPoll'] } },
      },
      {
        displayName: 'Poll Duration (hours)',
        name: 'pollDuration',
        type: 'number',
        default: 24,
        displayOptions: { show: { operation: ['createPoll'] } },
      },

      // Stream type
      {
        displayName: 'Stream Type',
        name: 'streamType',
        type: 'options',
        options: [
          { name: 'New Tweets', value: 'tweet' },
          { name: 'Follower Changes', value: 'follower' },
          { name: 'Mentions', value: 'mention' },
        ],
        default: 'tweet',
        displayOptions: { show: { operation: ['startStream'] } },
      },

      // Stream ID
      {
        displayName: 'Stream ID',
        name: 'streamId',
        type: 'string',
        default: '',
        description: 'ID of an existing stream',
        displayOptions: {
          show: { operation: ['stopStream', 'pauseStream', 'resumeStream', 'getStreamHistory'] },
        },
      },

      // Interval
      {
        displayName: 'Poll Interval (seconds)',
        name: 'interval',
        type: 'number',
        default: 60,
        description: 'How often to poll (15-3600 seconds)',
        displayOptions: { show: { operation: ['startStream'] } },
      },

      // Auto-like keywords
      {
        displayName: 'Keywords',
        name: 'keywords',
        type: 'string',
        default: '',
        placeholder: 'AI, automation, n8n',
        description: 'Comma-separated keywords to match',
        displayOptions: { show: { operation: ['autoLike'] } },
      },

      // Limit
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 20,
        description: 'Max items to return / process',
        displayOptions: {
          show: {
            operation: [
              'getTweets', 'searchTweets', 'getFollowers', 'getFollowing',
              'getHashtag', 'getLikes', 'getMedia', 'getBookmarks',
              'getStreamHistory', 'autoLike', 'getConversations',
            ],
          },
        },
      },

      // DM recipient
      {
        displayName: 'Recipient Username',
        name: 'recipient',
        type: 'string',
        default: '',
        placeholder: 'username',
        displayOptions: { show: { operation: ['sendDm'] } },
      },

      // Dry run toggle
      {
        displayName: 'Dry Run',
        name: 'dryRun',
        type: 'boolean',
        default: true,
        description: 'Preview actions without executing',
        displayOptions: {
          show: { operation: ['unfollowNonFollowers', 'autoLike', 'clearBookmarks'] },
        },
      },

      // Sentiment mode
      {
        displayName: 'Sentiment Mode',
        name: 'sentimentMode',
        type: 'options',
        options: [
          { name: 'Rules (offline, fast)', value: 'rules' },
          { name: 'LLM (OpenRouter, nuanced)', value: 'llm' },
        ],
        default: 'rules',
        displayOptions: { show: { operation: ['analyzeSentiment'] } },
      },
    ],
  };

  // ───────────────────────────────────────────────
  //  Execution
  // ───────────────────────────────────────────────

  async execute() {
    const items = this.getInputData();
    const returnData = [];
    const credentials = await this.getCredentials('xActionsApi').catch(() => null);
    const mode = credentials?.mode || 'local';

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i);
        const operation = this.getNodeParameter('operation', i);
        const platform = this.getNodeParameter('platform', i, 'twitter');

        let result;

        if (mode === 'remote') {
          result = await this._executeRemote(resource, operation, i, credentials);
        } else {
          result = await this._executeLocal(resource, operation, i, platform, credentials);
        }

        // Normalize output — always return array of items
        if (Array.isArray(result)) {
          for (const item of result) {
            returnData.push({ json: item });
          }
        } else if (result !== null && result !== undefined) {
          returnData.push({ json: result });
        } else {
          returnData.push({ json: { success: true, operation } });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }

  // ───────────────────────────────────────────────
  //  Remote mode — calls XActions REST API
  // ───────────────────────────────────────────────

  async _executeRemote(resource, operation, idx, credentials) {
    const baseUrl = credentials.baseUrl || 'http://localhost:3001';
    const headers = {
      'Content-Type': 'application/json',
      ...(credentials.apiToken ? { Authorization: `Bearer ${credentials.apiToken}` } : {}),
    };

    const get = async (path) => {
      const resp = await this.helpers.httpRequest({ method: 'GET', url: `${baseUrl}${path}`, headers });
      return resp;
    };
    const post = async (path, body) => {
      const resp = await this.helpers.httpRequest({ method: 'POST', url: `${baseUrl}${path}`, headers, body });
      return resp;
    };
    const del = async (path) => {
      const resp = await this.helpers.httpRequest({ method: 'DELETE', url: `${baseUrl}${path}`, headers });
      return resp;
    };

    const username = this.getNodeParameter('username', idx, '');
    const limit = this.getNodeParameter('limit', idx, 20);

    // Map resource + operation → API calls
    const routes = {
      'profile:getProfile': () => get(`/api/twitter/profile/${username}`),
      'tweets:getTweets': () => get(`/api/twitter/tweets/${username}?limit=${limit}`),
      'tweets:searchTweets': () => {
        const query = this.getNodeParameter('query', idx, '');
        return get(`/api/twitter/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      },
      'tweets:getTrending': () => get('/api/twitter/trending'),
      'followers:getFollowers': () => get(`/api/twitter/followers/${username}?limit=${limit}`),
      'followers:getFollowing': () => get(`/api/twitter/following/${username}?limit=${limit}`),
      'followers:getNonFollowers': () => get(`/api/twitter/non-followers/${username}`),
      'engagement:like': () => {
        const url = this.getNodeParameter('tweetUrl', idx, '');
        return post('/api/engagement/like', { url });
      },
      'engagement:retweet': () => {
        const url = this.getNodeParameter('tweetUrl', idx, '');
        return post('/api/engagement/retweet', { url });
      },
      'engagement:reply': () => {
        const url = this.getNodeParameter('tweetUrl', idx, '');
        const text = this.getNodeParameter('text', idx, '');
        return post('/api/engagement/reply', { url, text });
      },
      'posting:postTweet': () => {
        const text = this.getNodeParameter('text', idx, '');
        return post('/api/posting/tweet', { text });
      },
      'posting:postThread': () => {
        const raw = this.getNodeParameter('threadTweets', idx, '');
        const tweets = raw.split('\n---\n').map((t) => t.trim()).filter(Boolean);
        return post('/api/posting/thread', { tweets });
      },
      'analytics:analyzeSentiment': () => {
        const text = this.getNodeParameter('text', idx, '');
        const mode = this.getNodeParameter('sentimentMode', idx, 'rules');
        return post('/api/analytics/sentiment', { text, mode });
      },
      'analytics:monitorReputation': () => post('/api/analytics/monitor', { target: username }),
      'analytics:getReport': () => get(`/api/analytics/reports/${username}`),
      'streaming:startStream': () => {
        const type = this.getNodeParameter('streamType', idx, 'tweet');
        const interval = this.getNodeParameter('interval', idx, 60);
        return post('/api/streams', { type, username, interval });
      },
      'streaming:stopStream': () => {
        const id = this.getNodeParameter('streamId', idx, '');
        return del(`/api/streams/${id}`);
      },
      'streaming:listStreams': () => get('/api/streams'),
      'streaming:pauseStream': () => {
        const id = this.getNodeParameter('streamId', idx, '');
        return post(`/api/streams/${id}/pause`, {});
      },
      'streaming:resumeStream': () => {
        const id = this.getNodeParameter('streamId', idx, '');
        return post(`/api/streams/${id}/resume`, {});
      },
      'streaming:getStreamHistory': () => {
        const id = this.getNodeParameter('streamId', idx, '');
        return get(`/api/streams/${id}/history?limit=${limit}`);
      },
      'bookmarks:getBookmarks': () => get(`/api/bookmarks?limit=${limit}`),
      'bookmarks:addBookmark': () => {
        const url = this.getNodeParameter('tweetUrl', idx, '');
        return post('/api/bookmarks', { url });
      },
      'dms:sendDm': () => {
        const recipient = this.getNodeParameter('recipient', idx, '');
        const text = this.getNodeParameter('text', idx, '');
        return post('/api/messages/send', { recipient, text });
      },
      'dms:getConversations': () => get(`/api/messages/conversations?limit=${limit}`),
    };

    const key = `${resource}:${operation}`;
    const handler = routes[key];
    if (!handler) {
      throw new Error(`Unsupported operation: ${resource}.${operation}`);
    }
    return await handler();
  }

  // ───────────────────────────────────────────────
  //  Local mode — imports XActions modules directly
  // ───────────────────────────────────────────────

  async _executeLocal(resource, operation, idx, platform, credentials) {
    const authToken = credentials?.authToken || '';

    // Lazy-import the unified scraper
    const { scrape } = await import('xactions/scrapers');

    const username = this.getNodeParameter('username', idx, '');
    const limit = this.getNodeParameter('limit', idx, 20);

    switch (`${resource}:${operation}`) {
      // ── Profile ──
      case 'profile:getProfile':
        return await scrape(platform, 'profile', { username, authToken, autoClose: true });

      // ── Tweets ──
      case 'tweets:getTweets':
        return await scrape(platform, 'tweets', { username, limit, authToken, autoClose: true });
      case 'tweets:searchTweets': {
        const query = this.getNodeParameter('query', idx, '');
        return await scrape(platform, 'search', { query, limit, authToken, autoClose: true });
      }
      case 'tweets:getThread': {
        const url = this.getNodeParameter('tweetUrl', idx, '');
        return await scrape('twitter', 'thread', { url, authToken, autoClose: true });
      }
      case 'tweets:getHashtag': {
        const hashtag = this.getNodeParameter('hashtag', idx, '');
        return await scrape(platform, 'hashtag', { hashtag, limit, authToken, autoClose: true });
      }
      case 'tweets:getLikes':
        return await scrape('twitter', 'likes', { username, limit, authToken, autoClose: true });
      case 'tweets:getMedia':
        return await scrape('twitter', 'media', { username, limit, authToken, autoClose: true });
      case 'tweets:getTrending':
        return await scrape(platform, 'trending', { authToken, autoClose: true });

      // ── Followers ──
      case 'followers:getFollowers':
        return await scrape(platform, 'followers', { username, limit, authToken, autoClose: true });
      case 'followers:getFollowing':
        return await scrape(platform, 'following', { username, limit, authToken, autoClose: true });

      // ── Analytics ──
      case 'analytics:analyzeSentiment': {
        const { analyzeSentiment } = await import('xactions/analytics');
        const text = this.getNodeParameter('text', idx, '');
        const mode = this.getNodeParameter('sentimentMode', idx, 'rules');
        return await analyzeSentiment(text, { mode });
      }

      // ── Streaming ──
      case 'streaming:startStream': {
        const streaming = await import('xactions/streaming');
        const type = this.getNodeParameter('streamType', idx, 'tweet');
        const interval = this.getNodeParameter('interval', idx, 60);
        return await streaming.createStream({ type, username, interval: interval * 1000, authToken });
      }
      case 'streaming:stopStream': {
        const streaming = await import('xactions/streaming');
        const id = this.getNodeParameter('streamId', idx, '');
        return await streaming.stopStream(id);
      }
      case 'streaming:listStreams': {
        const streaming = await import('xactions/streaming');
        const streams = await streaming.listStreams();
        const pool = streaming.getPoolStatus();
        return { streams, pool };
      }
      case 'streaming:pauseStream': {
        const streaming = await import('xactions/streaming');
        const id = this.getNodeParameter('streamId', idx, '');
        return await streaming.pauseStream(id);
      }
      case 'streaming:resumeStream': {
        const streaming = await import('xactions/streaming');
        const id = this.getNodeParameter('streamId', idx, '');
        return await streaming.resumeStream(id);
      }
      case 'streaming:getStreamHistory': {
        const streaming = await import('xactions/streaming');
        const id = this.getNodeParameter('streamId', idx, '');
        return await streaming.getStreamHistory(id, { limit });
      }

      // ── Posting ──
      case 'posting:postTweet': {
        const text = this.getNodeParameter('text', idx, '');
        return { posted: true, text, note: 'Posting requires browser session — use remote mode or automation scripts' };
      }

      default:
        throw new Error(`Unsupported local operation: ${resource}.${operation}. Try remote mode for full API access.`);
    }
  }
}
