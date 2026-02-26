/**
 * XActions Client — Tweet Data Model
 *
 * Represents a tweet from Twitter's internal GraphQL API.
 * Use Tweet.fromGraphQL(raw) to parse raw API responses.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Parse a Twitter media entity into a normalized object.
 * @param {Object} media - Raw media entity from legacy.entities.media[]
 * @returns {{id: string, type: string, url: string, preview: string, width: number, height: number, duration: number|null, altText: string|null}|null}
 * @private
 */
function parseMediaEntity(media) {
  if (!media) return null;

  const type = media.type || 'photo';
  const result = {
    id: media.id_str || media.media_key || '',
    type,
    url: media.media_url_https || media.media_url || '',
    preview: media.media_url_https || media.media_url || '',
    width: media.original_info?.width || media.sizes?.large?.w || 0,
    height: media.original_info?.height || media.sizes?.large?.h || 0,
    duration: null,
    altText: media.ext_alt_text || null,
  };

  if ((type === 'video' || type === 'animated_gif') && media.video_info) {
    const variants = (media.video_info.variants || [])
      .filter((v) => v.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    if (variants.length > 0) {
      result.url = variants[0].url;
    }
    result.duration = media.video_info.duration_millis
      ? Math.round(media.video_info.duration_millis / 1000)
      : null;
  }

  return result;
}

/**
 * Parse a poll from a tweet's card data.
 * @param {Object} card - Raw card data
 * @returns {{id: string, options: Array<{label: string, votes: number}>, endDatetime: string|null, votingStatus: string, totalVotes: number}|null}
 * @private
 */
function parsePollFromCard(card) {
  if (!card) return null;

  const bindingValues = card.legacy?.binding_values || card.binding_values;
  if (!bindingValues) return null;

  const vals = {};
  if (Array.isArray(bindingValues)) {
    for (const bv of bindingValues) {
      if (bv.key && bv.value) {
        vals[bv.key] = bv.value.string_value || bv.value.scribe_value?.value || '';
      }
    }
  } else {
    for (const [key, val] of Object.entries(bindingValues)) {
      vals[key] = val?.string_value || val?.scribe_value?.value || '';
    }
  }

  const options = [];
  let totalVotes = 0;
  for (let i = 1; i <= 4; i++) {
    const label = vals[`choice${i}_label`];
    if (!label) break;
    const votes = parseInt(vals[`choice${i}_count`] || '0', 10);
    options.push({ label, votes });
    totalVotes += votes;
  }
  if (options.length === 0) return null;

  return {
    id: vals.card_url || '',
    options,
    endDatetime: vals.end_datetime_utc || null,
    votingStatus: vals.counts_are_final === 'true' ? 'closed' : 'open',
    totalVotes,
  };
}

// ============================================================================
// Tweet Class
// ============================================================================

/**
 * Represents a single tweet from Twitter.
 */
export class Tweet {
  constructor() {
    /** @type {string} */
    this.id = '';
    /** @type {string} */
    this.text = '';
    /** @type {string} */
    this.fullText = '';
    /** @type {string} */
    this.username = '';
    /** @type {string} */
    this.userId = '';
    /** @type {Date|null} */
    this.timeParsed = null;
    /** @type {number|null} */
    this.timestamp = null;
    /** @type {string[]} */
    this.hashtags = [];
    /** @type {string[]} */
    this.mentions = [];
    /** @type {string[]} */
    this.urls = [];
    /** @type {Array<{id: string, url: string, alt: string|null}>} */
    this.photos = [];
    /** @type {Array<{id: string, url: string, preview: string, duration: number|null}>} */
    this.videos = [];
    /** @type {Tweet[]} */
    this.thread = [];
    /** @type {string|null} */
    this.inReplyToStatusId = null;
    /** @type {Tweet|null} */
    this.inReplyToStatus = null;
    /** @type {string|null} */
    this.quotedStatusId = null;
    /** @type {Tweet|null} */
    this.quotedStatus = null;
    /** @type {boolean} */
    this.isRetweet = false;
    /** @type {boolean} */
    this.isReply = false;
    /** @type {boolean} */
    this.isQuote = false;
    /** @type {Tweet|null} */
    this.retweetedStatus = null;
    /** @type {number} */
    this.likes = 0;
    /** @type {number} */
    this.retweets = 0;
    /** @type {number} */
    this.replies = 0;
    /** @type {number} */
    this.views = 0;
    /** @type {number} */
    this.bookmarkCount = 0;
    /** @type {Object|null} */
    this.place = null;
    /** @type {boolean} */
    this.sensitiveContent = false;
    /** @type {string} */
    this.conversationId = '';
    /** @type {Object|null} */
    this.poll = null;
  }

  /**
   * Create a Tweet from a raw Twitter GraphQL "tweet_results.result" object.
   *
   * @param {Object} raw - Raw GraphQL tweet result
   * @returns {Tweet|null} Parsed tweet, or null if unparseable/tombstone
   */
  static fromGraphQL(raw) {
    if (!raw) return null;

    // Handle "TweetWithVisibilityResults" wrapper
    if (raw.__typename === 'TweetWithVisibilityResults' && raw.tweet) {
      raw = raw.tweet;
    }

    // Handle tombstone (deleted/unavailable tweets)
    if (raw.__typename === 'TweetTombstone') return null;

    const legacy = raw.legacy;
    if (!legacy) return null;

    const tweet = new Tweet();

    // Core fields
    tweet.id = legacy.id_str || raw.rest_id || '';
    tweet.fullText = legacy.full_text || legacy.text || '';
    tweet.text = tweet.fullText;
    tweet.conversationId = legacy.conversation_id_str || '';

    // User info from core.user_results
    const userResult = raw.core?.user_results?.result;
    if (userResult) {
      tweet.username = userResult.legacy?.screen_name || '';
      tweet.userId = userResult.rest_id || userResult.legacy?.id_str || '';
    }

    // Timestamp
    if (legacy.created_at) {
      tweet.timeParsed = new Date(legacy.created_at);
      tweet.timestamp = tweet.timeParsed.getTime();
    }

    // Entities
    const entities = legacy.entities || {};
    tweet.hashtags = (entities.hashtags || []).map((h) => h.text).filter(Boolean);
    tweet.mentions = (entities.user_mentions || []).map((m) => m.screen_name).filter(Boolean);
    tweet.urls = (entities.urls || []).map((u) => u.expanded_url || u.url).filter(Boolean);

    // Media (prefer extended_entities for full media info)
    const mediaEntities = legacy.extended_entities?.media || entities.media || [];
    for (const media of mediaEntities) {
      const parsed = parseMediaEntity(media);
      if (!parsed) continue;
      if (parsed.type === 'photo') {
        tweet.photos.push({ id: parsed.id, url: parsed.url, alt: parsed.altText });
      } else if (parsed.type === 'video' || parsed.type === 'animated_gif') {
        tweet.videos.push({
          id: parsed.id,
          url: parsed.url,
          preview: parsed.preview,
          duration: parsed.duration,
        });
      }
    }

    // Engagement counts
    tweet.likes = parseInt(legacy.favorite_count, 10) || 0;
    tweet.retweets = parseInt(legacy.retweet_count, 10) || 0;
    tweet.replies = parseInt(legacy.reply_count, 10) || 0;
    tweet.bookmarkCount = parseInt(legacy.bookmark_count, 10) || 0;

    // Views
    const viewCount = raw.views?.count;
    tweet.views = viewCount ? parseInt(viewCount, 10) || 0 : 0;

    // Reply info
    tweet.inReplyToStatusId = legacy.in_reply_to_status_id_str || null;
    tweet.isReply = !!tweet.inReplyToStatusId;

    // Quoted tweet (recursive)
    const quotedResult = raw.quoted_status_result?.result;
    if (quotedResult) {
      tweet.quotedStatusId = legacy.quoted_status_id_str || quotedResult.rest_id || null;
      tweet.quotedStatus = Tweet.fromGraphQL(quotedResult);
      tweet.isQuote = true;
    }

    // Retweet (recursive)
    const retweetResult = legacy.retweeted_status_result?.result;
    if (retweetResult) {
      tweet.retweetedStatus = Tweet.fromGraphQL(retweetResult);
      tweet.isRetweet = true;
    }

    // Sensitive content
    tweet.sensitiveContent = legacy.possibly_sensitive || false;

    // Place/geo
    if (legacy.place) {
      tweet.place = {
        id: legacy.place.id,
        name: legacy.place.name || legacy.place.full_name,
        fullName: legacy.place.full_name,
        country: legacy.place.country,
        countryCode: legacy.place.country_code,
        placeType: legacy.place.place_type,
      };
    }

    // Poll (from card data)
    if (raw.card) {
      tweet.poll = parsePollFromCard(raw.card);
    }

    return tweet;
  }

  /**
   * Permanent URL for this tweet.
   * @returns {string}
   */
  get permanentUrl() {
    if (this.username && this.id) {
      return `https://x.com/${this.username}/status/${this.id}`;
    }
    return '';
  }

  /**
   * JSON-serializable representation.
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      fullText: this.fullText,
      username: this.username,
      userId: this.userId,
      timeParsed: this.timeParsed?.toISOString() || null,
      timestamp: this.timestamp,
      hashtags: this.hashtags,
      mentions: this.mentions,
      urls: this.urls,
      photos: this.photos,
      videos: this.videos,
      likes: this.likes,
      retweets: this.retweets,
      replies: this.replies,
      views: this.views,
      bookmarkCount: this.bookmarkCount,
      isRetweet: this.isRetweet,
      isReply: this.isReply,
      isQuote: this.isQuote,
      inReplyToStatusId: this.inReplyToStatusId,
      quotedStatusId: this.quotedStatusId,
      conversationId: this.conversationId,
      sensitiveContent: this.sensitiveContent,
      place: this.place,
      poll: this.poll,
      permanentUrl: this.permanentUrl,
    };
  }
}
