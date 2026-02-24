// XActions trigger node for n8n — fires on new tweets, follower changes, mentions
// by nichxbt

/**
 * XActions Trigger — polls XActions streaming system or REST API and emits
 * new events as n8n workflow triggers.
 *
 * Supports:
 *   - New tweets from a user
 *   - Follower changes (new followers, lost followers)
 *   - New mentions of a username
 *
 * Uses polling internally (n8n scheduler), calling XActions streaming or
 * direct scraper APIs each interval.
 */
export class XActionsTrigger {
  description = {
    displayName: 'XActions Trigger',
    name: 'xActionsTrigger',
    icon: 'file:xactions.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
    description: 'Trigger workflows on X/Twitter events — new tweets, follower changes, mentions. No API fees.',
    defaults: { name: 'XActions Trigger' },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'xActionsApi',
        required: false,
      },
    ],
    polling: true,
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        options: [
          {
            name: 'New Tweet',
            value: 'newTweet',
            description: 'Triggers when a user posts a new tweet',
          },
          {
            name: 'Follower Change',
            value: 'followerChange',
            description: 'Triggers when someone follows or unfollows',
          },
          {
            name: 'New Mention',
            value: 'newMention',
            description: 'Triggers when the username is mentioned',
          },
          {
            name: 'Sentiment Alert',
            value: 'sentimentAlert',
            description: 'Triggers when sentiment drops below threshold',
          },
        ],
        default: 'newTweet',
        required: true,
      },
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        default: '',
        placeholder: 'elonmusk',
        description: 'Target username to watch (without @)',
        required: true,
      },
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
        description: 'Social platform to monitor',
      },
      {
        displayName: 'Sentiment Threshold',
        name: 'sentimentThreshold',
        type: 'number',
        default: -0.3,
        description: 'Alert when average sentiment drops below this value (-1 to 1)',
        displayOptions: { show: { event: ['sentimentAlert'] } },
      },
      {
        displayName: 'Max Results Per Poll',
        name: 'limit',
        type: 'number',
        default: 10,
        description: 'Maximum items to return per poll cycle',
      },
    ],
  };

  // ───────────────────────────────────────────────
  //  Poll method — called by n8n's scheduler
  // ───────────────────────────────────────────────

  async poll() {
    const event = this.getNodeParameter('event');
    const username = this.getNodeParameter('username');
    const platform = this.getNodeParameter('platform', 'twitter');
    const limit = this.getNodeParameter('limit', 10);
    const credentials = await this.getCredentials('xActionsApi').catch(() => null);
    const mode = credentials?.mode || 'local';

    // Get previous state from n8n's static data
    const staticData = this.getWorkflowStaticData('node');

    let newItems = [];

    try {
      if (mode === 'remote') {
        newItems = await this._pollRemote(event, username, limit, credentials, staticData);
      } else {
        newItems = await this._pollLocal(event, username, platform, limit, credentials, staticData);
      }
    } catch (error) {
      // Log but don't crash — n8n will retry on next interval
      console.error(`[XActionsTrigger] Poll error (${event}/${username}):`, error.message);
      return null;
    }

    if (!newItems || newItems.length === 0) {
      return null;
    }

    return [newItems.map((item) => ({ json: item }))];
  }

  // ───────────────────────────────────────────────
  //  Remote polling — via XActions REST API
  // ───────────────────────────────────────────────

  async _pollRemote(event, username, limit, credentials, staticData) {
    const baseUrl = credentials.baseUrl || 'http://localhost:3001';
    const headers = {
      'Content-Type': 'application/json',
      ...(credentials.apiToken ? { Authorization: `Bearer ${credentials.apiToken}` } : {}),
    };

    const get = async (path) => {
      return await this.helpers.httpRequest({ method: 'GET', url: `${baseUrl}${path}`, headers });
    };
    const post = async (path, body) => {
      return await this.helpers.httpRequest({ method: 'POST', url: `${baseUrl}${path}`, headers, body });
    };

    switch (event) {
      case 'newTweet': {
        const resp = await get(`/api/twitter/tweets/${username}?limit=${limit}`);
        const tweets = Array.isArray(resp) ? resp : resp?.tweets || [];
        return this._dedup(tweets, staticData, 'tweets', 'id');
      }

      case 'followerChange': {
        const resp = await get(`/api/twitter/followers/${username}?limit=${limit}`);
        const followers = Array.isArray(resp) ? resp : resp?.followers || [];
        return this._diffFollowers(followers, staticData);
      }

      case 'newMention': {
        const resp = await get(`/api/twitter/search?q=${encodeURIComponent('@' + username)}&limit=${limit}`);
        const mentions = Array.isArray(resp) ? resp : resp?.tweets || [];
        return this._dedup(mentions, staticData, 'mentions', 'id');
      }

      case 'sentimentAlert': {
        const resp = await post('/api/analytics/sentiment', {
          text: `@${username}`,
          mode: 'rules',
        });
        const threshold = this.getNodeParameter('sentimentThreshold', -0.3);
        if (resp?.score !== undefined && resp.score < threshold) {
          return [{ ...resp, alert: true, threshold, username }];
        }
        return [];
      }

      default:
        return [];
    }
  }

  // ───────────────────────────────────────────────
  //  Local polling — direct scraper access
  // ───────────────────────────────────────────────

  async _pollLocal(event, username, platform, limit, credentials, staticData) {
    const authToken = credentials?.authToken || '';
    const { scrape } = await import('xactions/scrapers');

    switch (event) {
      case 'newTweet': {
        const tweets = await scrape(platform, 'tweets', { username, limit, authToken, autoClose: true });
        const arr = Array.isArray(tweets) ? tweets : [];
        return this._dedup(arr, staticData, 'tweets', 'id');
      }

      case 'followerChange': {
        const followers = await scrape(platform, 'followers', { username, limit, authToken, autoClose: true });
        const arr = Array.isArray(followers) ? followers : [];
        return this._diffFollowers(arr, staticData);
      }

      case 'newMention': {
        const mentions = await scrape(platform, 'search', {
          query: `@${username}`,
          limit,
          authToken,
          autoClose: true,
        });
        const arr = Array.isArray(mentions) ? mentions : [];
        return this._dedup(arr, staticData, 'mentions', 'id');
      }

      case 'sentimentAlert': {
        const { analyzeSentiment } = await import('xactions/analytics');
        // Analyze recent mentions for sentiment
        const mentions = await scrape(platform, 'search', {
          query: `@${username}`,
          limit: 10,
          authToken,
          autoClose: true,
        });
        const arr = Array.isArray(mentions) ? mentions : [];
        if (arr.length === 0) return [];

        const texts = arr.map((m) => m.text || m.full_text || '').filter(Boolean);
        const { analyzeBatch, aggregateResults } = await import('xactions/analytics');
        const results = await analyzeBatch(texts, { mode: 'rules' });
        const agg = aggregateResults(results);

        const threshold = this.getNodeParameter('sentimentThreshold', -0.3);
        if (agg.average < threshold) {
          return [{
            alert: true,
            username,
            averageSentiment: agg.average,
            threshold,
            distribution: agg.distribution,
            sampleSize: results.length,
            topNegative: results.filter((r) => r.label === 'negative').slice(0, 3),
          }];
        }
        return [];
      }

      default:
        return [];
    }
  }

  // ───────────────────────────────────────────────
  //  Helpers — dedup + diff
  // ───────────────────────────────────────────────

  /**
   * Dedup items against previously seen IDs stored in staticData.
   * Returns only new items. Updates staticData with latest IDs.
   */
  _dedup(items, staticData, stateKey, idField) {
    const seenKey = `${stateKey}_seen`;
    const previousIds = new Set(staticData[seenKey] || []);

    // On first run, just store IDs and return nothing (avoid flooding)
    if (previousIds.size === 0) {
      staticData[seenKey] = items.map((i) => i[idField]).filter(Boolean).slice(0, 500);
      return [];
    }

    const newItems = items.filter((item) => {
      const id = item[idField];
      return id && !previousIds.has(id);
    });

    // Update seen IDs (keep last 500)
    const allIds = [...items.map((i) => i[idField]).filter(Boolean), ...Array.from(previousIds)];
    staticData[seenKey] = [...new Set(allIds)].slice(0, 500);

    return newItems;
  }

  /**
   * Diff followers: detect new followers and lost followers.
   * Returns events for each new/lost follower.
   */
  _diffFollowers(currentFollowers, staticData) {
    const currentUsernames = currentFollowers.map((f) => f.username || f.screen_name || f.handle || '').filter(Boolean);
    const previousUsernames = new Set(staticData.follower_usernames || []);

    // First run — store and return nothing
    if (previousUsernames.size === 0) {
      staticData.follower_usernames = currentUsernames;
      return [];
    }

    const currentSet = new Set(currentUsernames);
    const events = [];

    // New followers
    for (const u of currentUsernames) {
      if (!previousUsernames.has(u)) {
        const follower = currentFollowers.find((f) => (f.username || f.screen_name || f.handle) === u);
        events.push({
          event: 'new_follower',
          username: u,
          ...(follower || {}),
        });
      }
    }

    // Lost followers
    for (const u of previousUsernames) {
      if (!currentSet.has(u)) {
        events.push({
          event: 'lost_follower',
          username: u,
        });
      }
    }

    // Update state
    staticData.follower_usernames = currentUsernames;

    return events;
  }
}
