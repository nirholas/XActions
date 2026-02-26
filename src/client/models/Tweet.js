/**/**





































































































































































































































































export default Tweet;}  };    votingStatus: vals.counts_are_final === 'true' ? 'closed' : 'open',    endDatetime: vals.end_datetime_utc || vals.counts_are_final || '',    options,    id: vals.card_url || '',  return {  if (options.length === 0) return null;  }    options.push({ label, votes });    const votes = parseInt(vals[`choice${i}_count`] || '0', 10);    if (!label) break;    const label = vals[`choice${i}_label`];  for (let i = 1; i <= 4; i++) {  const options = [];  // Detect poll via choice labels  }    }      vals[key] = val?.string_value || val?.scribe_value?.value || '';    for (const [key, val] of Object.entries(bindingValues)) {  } else {    }      }        vals[bv.key] = bv.value.string_value || bv.value.scribe_value?.value || '';      if (bv.key && bv.value) {    for (const bv of bindingValues) {  if (Array.isArray(bindingValues)) {  const vals = {};  // bindingValues can be an array of {key, value} or an object  if (!bindingValues) return null;function parsePollFromCard(bindingValues) { */ * @returns {{id: string, options: Array<{label: string, votes: number}>, endDatetime: string, votingStatus: string}|null} * @param {Object} bindingValues - card.legacy.binding_values (array of {key, value}) * * Parse poll data from a Twitter Card binding_values object./**// ============================================================================// Internal Helpers// ============================================================================}  }    });      poll,      conversationId: legacy.conversation_id_str || '',      sensitiveContent: legacy.possibly_sensitive === true,      place: legacy.place || null,      bookmarkCount: legacy.bookmark_count || 0,      views,      replies: legacy.reply_count || 0,      retweets: legacy.retweet_count || 0,      likes: legacy.favorite_count || 0,      retweetedStatus,      isQuote,      isReply,      isRetweet,      quotedStatus,      quotedStatusId,      inReplyToStatus: null,      inReplyToStatusId: legacy.in_reply_to_status_id_str || null,      thread: [],      videos,      photos,      urls,      mentions,      hashtags,      timestamp,      timeParsed,      userId: core?.rest_id || legacy.user_id_str || '',      username: core?.legacy?.screen_name || '',      fullText: legacy.full_text || legacy.text || '',      text: legacy.full_text || legacy.text || '',      id: legacy.id_str || raw.rest_id || '',    return new Tweet({    const isQuote = !!quotedStatus || legacy.is_quote_status === true;    const isRetweet = !!retweetedStatus || !!legacy.retweeted_status_result;    const isReply = !!legacy.in_reply_to_status_id_str;    }      views = parseInt(raw.views.count, 10) || 0;    if (raw.views?.count) {    let views = 0;    // View count    }      poll = parsePollFromCard(card);    if (card) {    const card = raw.card?.legacy?.binding_values;    let poll = null;    // Poll data    }      retweetedStatus = Tweet.fromGraphQL(raw.legacy.retweeted_status_result.result);    if (raw.legacy?.retweeted_status_result?.result) {    let retweetedStatus = null;    // Retweeted status (recursive)    }      quotedStatus = Tweet.fromGraphQL(raw.quoted_status_result.result);    if (raw.quoted_status_result?.result) {    let quotedStatusId = legacy.quoted_status_id_str || null;    let quotedStatus = null;    // Quoted status (recursive)    }      }        });            : 0,            ? media.video_info.duration_millis / 1000          duration: media.video_info?.duration_millis          preview: media.media_url_https || media.media_url || '',          url: best?.url || '',          id: media.id_str || String(media.id || ''),        videos.push({          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];          .filter((v) => v.content_type === 'video/mp4')        const best = variants        const variants = media.video_info?.variants || [];      } else if (media.type === 'video' || media.type === 'animated_gif') {        });          alt: media.ext_alt_text || '',          url: media.media_url_https || media.media_url || '',          id: media.id_str || String(media.id || ''),        photos.push({      if (media.type === 'photo') {    for (const media of mediaEntities) {    const videos = [];    const photos = [];    const mediaEntities = extEntities.media || entities.media || [];    // Media — photos & videos    const urls = (entities.urls || []).map((u) => u.expanded_url).filter(Boolean);    // URLs (expanded)    const mentions = (entities.user_mentions || []).map((m) => m.screen_name).filter(Boolean);    // Mentions    const hashtags = (entities.hashtags || []).map((h) => h.text).filter(Boolean);    // Hashtags    }      timestamp = timeParsed.getTime();      timeParsed = new Date(legacy.created_at);    if (legacy.created_at) {    let timestamp = 0;    let timeParsed = null;    // Parse date    const extEntities = legacy.extended_entities || {};    const entities = legacy.entities || {};    const core = raw.core?.user_results?.result;    const legacy = raw.legacy;    }      return null;    if (raw.__typename === 'TweetTombstone' || !raw.legacy) {    // Tombstone / unavailable tweet    }      raw = raw.tweet;    if (raw.__typename === 'TweetWithVisibilityResults' && raw.tweet) {    // Unwrap TweetWithVisibilityResults    if (!raw) return null;  static fromGraphQL(raw) {   */   * @returns {Tweet|null} Parsed tweet, or null if the data is unparseable   * @param {Object} raw - Raw GraphQL tweet result   *   * data is nested under `raw.tweet`.   * Handles the "TweetWithVisibilityResults" wrapper where the actual tweet   *   * Parse a raw Twitter GraphQL "tweet_results.result" object into a Tweet.  /**  }    this.poll = data.poll || null;    /** @type {{id: string, options: Array<{label: string, votes: number}>, endDatetime: string, votingStatus: string}|null} */    this.conversationId = data.conversationId || '';    /** @type {string} */    this.sensitiveContent = data.sensitiveContent || false;    /** @type {boolean} */    this.place = data.place || null;    /** @type {Object|null} */    this.bookmarkCount = data.bookmarkCount || 0;    /** @type {number} */    this.views = data.views || 0;    /** @type {number} */    this.replies = data.replies || 0;    /** @type {number} */    this.retweets = data.retweets || 0;    /** @type {number} */    this.likes = data.likes || 0;    /** @type {number} */    this.retweetedStatus = data.retweetedStatus || null;    /** @type {Tweet|null} */    this.isQuote = data.isQuote || false;    /** @type {boolean} */    this.isReply = data.isReply || false;    /** @type {boolean} */    this.isRetweet = data.isRetweet || false;    /** @type {boolean} */    this.quotedStatus = data.quotedStatus || null;    /** @type {Tweet|null} */    this.quotedStatusId = data.quotedStatusId || null;    /** @type {string|null} */    this.inReplyToStatus = data.inReplyToStatus || null;    /** @type {Tweet|null} */    this.inReplyToStatusId = data.inReplyToStatusId || null;    /** @type {string|null} */    this.thread = data.thread || [];    /** @type {Tweet[]} */    this.videos = data.videos || [];    /** @type {Array<{id: string, url: string, preview: string, duration: number}>} */    this.photos = data.photos || [];    /** @type {Array<{id: string, url: string, alt: string}>} */    this.urls = data.urls || [];    /** @type {string[]} */    this.mentions = data.mentions || [];    /** @type {string[]} */    this.hashtags = data.hashtags || [];    /** @type {string[]} */    this.timestamp = data.timestamp || 0;    /** @type {number} */    this.timeParsed = data.timeParsed || null;    /** @type {Date|null} */    this.userId = data.userId || '';    /** @type {string} */    this.username = data.username || '';    /** @type {string} */    this.fullText = data.fullText || '';    /** @type {string} */    this.text = data.text || '';    /** @type {string} */    this.id = data.id || '';    /** @type {string} */  constructor(data = {}) {   */   * @param {Object} [data] - Pre-mapped tweet data  /**export class Tweet { */ * Represents a single tweet/post from Twitter./** */ * @license MIT * @author nich (@nichxbt) * * Maps Twitter GraphQL "tweet_results.result" objects to a clean Tweet class. * XActions Client — Tweet Data Model * XActions Client — Tweet Data Model
 * Maps Twitter GraphQL "tweet_results.result" objects to a clean Tweet class.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Represents a single tweet from the Twitter GraphQL API.
 */
export class Tweet {
  /**
   * @param {Object} [data={}] - Pre-mapped tweet data
   */
  constructor(data = {}) {
    /** @type {string} */
    this.id = data.id || '';
    /** @type {string} */
    this.text = data.text || '';
    /** @type {string} */
    this.fullText = data.fullText || '';
    /** @type {string} */
    this.username = data.username || '';
    /** @type {string} */
    this.userId = data.userId || '';
    /** @type {Date|null} */
    this.timeParsed = data.timeParsed || null;
    /** @type {number} */
    this.timestamp = data.timestamp || 0;
    /** @type {string[]} */
    this.hashtags = data.hashtags || [];
    /** @type {string[]} */
    this.mentions = data.mentions || [];
    /** @type {string[]} */
    this.urls = data.urls || [];
    /** @type {Array<{id: string, url: string, alt: string}>} */
    this.photos = data.photos || [];
    /** @type {Array<{id: string, url: string, preview: string, duration: number}>} */
    this.videos = data.videos || [];
    /** @type {Tweet[]} */
    this.thread = data.thread || [];
    /** @type {string|null} */
    this.inReplyToStatusId = data.inReplyToStatusId || null;
    /** @type {Tweet|null} */
    this.inReplyToStatus = data.inReplyToStatus || null;
    /** @type {string|null} */
    this.quotedStatusId = data.quotedStatusId || null;
    /** @type {Tweet|null} */
    this.quotedStatus = data.quotedStatus || null;
    /** @type {boolean} */
    this.isRetweet = data.isRetweet || false;
    /** @type {boolean} */
    this.isReply = data.isReply || false;
    /** @type {boolean} */
    this.isQuote = data.isQuote || false;
    /** @type {Tweet|null} */
    this.retweetedStatus = data.retweetedStatus || null;
    /** @type {number} */
    this.likes = data.likes || 0;
    /** @type {number} */
    this.retweets = data.retweets || 0;
    /** @type {number} */
    this.replies = data.replies || 0;
    /** @type {number} */
    this.views = data.views || 0;
    /** @type {number} */
    this.bookmarkCount = data.bookmarkCount || 0;
    /** @type {Object|null} */
    this.place = data.place || null;
    /** @type {boolean} */
    this.sensitiveContent = data.sensitiveContent || false;
    /** @type {string} */
    this.conversationId = data.conversationId || '';
    /** @type {{id: string, options: Array<{label: string, votes: number}>, endDatetime: string, votingStatus: string}|null} */
    this.poll = data.poll || null;
  }

  /**
   * Parse a raw Twitter GraphQL tweet_results.result object into a Tweet instance.
   * Handles TweetWithVisibilityResults wrappers and nested quoted / retweeted statuses.
   *
   * @param {Object} raw - Raw GraphQL result object
   * @returns {Tweet|null} Parsed Tweet or null if data is unusable
   */
  static fromGraphQL(raw) {
    if (!raw) return null;

    // Unwrap TweetWithVisibilityResults
    if (raw.__typename === 'TweetWithVisibilityResults') {
      raw = raw.tweet;
    }
    if (!raw || raw.__typename === 'TweetTombstone') return null;

    const legacy = raw.legacy || {};
    const core = raw.core?.user_results?.result || {};
    const coreLegacy = core.legacy || {};

    // Parse date
    const createdAt = legacy.created_at;
    let timeParsed = null;
    let timestamp = 0;
    if (createdAt) {
      timeParsed = new Date(createdAt);
      timestamp = timeParsed.getTime();
    }

    // Entities
    const entities = legacy.entities || {};
    const extEntities = legacy.extended_entities || {};

    const hashtags = (entities.hashtags || []).map((h) => h.text).filter(Boolean);
    const mentions = (entities.user_mentions || []).map((m) => m.screen_name).filter(Boolean);
    const urls = (entities.urls || []).map((u) => u.expanded_url).filter(Boolean);

    // Media: separate photos and videos
    const mediaList = extEntities.media || entities.media || [];
    const photos = [];
    const videos = [];

    for (const media of mediaList) {
      if (media.type === 'photo') {
        photos.push({
          id: media.id_str || String(media.id || ''),
          url: media.media_url_https || media.media_url || '',
          alt: media.ext_alt_text || '',
        });
      } else if (media.type === 'video' || media.type === 'animated_gif') {
        const variants = media.video_info?.variants || [];
        const best = variants
          .filter((v) => v.content_type === 'video/mp4')
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        videos.push({
          id: media.id_str || String(media.id || ''),
          url: best?.url || '',
          preview: media.media_url_https || media.media_url || '',
          duration: media.video_info?.duration_millis
            ? Math.round(media.video_info.duration_millis / 1000)
            : 0,
        });
      }
    }

    // Quoted status (recursive)
    let quotedStatus = null;
    let quotedStatusId = legacy.quoted_status_id_str || null;
    const quotedRaw = raw.quoted_status_result?.result;
    if (quotedRaw) {
      quotedStatus = Tweet.fromGraphQL(quotedRaw);
      if (quotedStatus && !quotedStatusId) {
        quotedStatusId = quotedStatus.id;
      }
    }

    // Retweeted status (recursive)
    let retweetedStatus = null;
    const retweetRaw = legacy.retweeted_status_result?.result;
    if (retweetRaw) {
      retweetedStatus = Tweet.fromGraphQL(retweetRaw);
    }

    // In-reply-to
    const inReplyToStatusId = legacy.in_reply_to_status_id_str || null;

    // Flags
    const isRetweet = !!retweetedStatus || (legacy.full_text || '').startsWith('RT @');
    const isReply = !!inReplyToStatusId;
    const isQuote = !!quotedStatus || legacy.is_quote_status === true;

    // Engagement counts
    const likes = legacy.favorite_count || 0;
    const retweets = legacy.retweet_count || 0;
    const replies = legacy.reply_count || 0;
    const views = parseInt(raw.views?.count, 10) || 0;
    const bookmarkCount = legacy.bookmark_count || 0;

    // Place
    const place = legacy.place || null;

    // Sensitive content
    const sensitiveContent = legacy.possibly_sensitive === true;

    // Poll parsing from card
    let poll = null;
    const card = raw.card?.legacy?.binding_values;
    if (card) {
      poll = parsePollFromCard(card);
    }

    return new Tweet({
      id: legacy.id_str || raw.rest_id || '',
      text: legacy.full_text || legacy.text || '',
      fullText: legacy.full_text || legacy.text || '',
      username: coreLegacy.screen_name || '',
      userId: core.rest_id || legacy.user_id_str || '',
      timeParsed,
      timestamp,
      hashtags,
      mentions,
      urls,
      photos,
      videos,
      thread: [],
      inReplyToStatusId,
      inReplyToStatus: null,
      quotedStatusId,
      quotedStatus,
      isRetweet,
      isReply,
      isQuote,
      retweetedStatus,
      likes,
      retweets,
      replies,
      views,
      bookmarkCount,
      place,
      sensitiveContent,
      conversationId: legacy.conversation_id_str || '',
      poll,
    });
  }
}

/**
 * Parse poll data from a Twitter card's binding_values.
 * @param {Object[]|Object} bindingValues
 * @returns {{id: string, options: Array<{label: string, votes: number}>, endDatetime: string, votingStatus: string}|null}
 */
function parsePollFromCard(bindingValues) {
  const vals = Array.isArray(bindingValues)
    ? Object.fromEntries(bindingValues.map((b) => [b.key, b.value?.string_value || b.value?.scribe_value?.value || '']))
    : Object.fromEntries(
        Object.entries(bindingValues).map(([k, v]) => [k, v?.string_value || v?.scribe_value?.value || '']),
      );

  // Detect poll by checking for choice1_label
  if (!vals.choice1_label) return null;

  const options = [];
  for (let i = 1; i <= 4; i++) {
    const label = vals[`choice${i}_label`];
    if (!label) break;
    options.push({
      label,
      votes: parseInt(vals[`choice${i}_count`], 10) || 0,
    });
  }

  return {
    id: vals.card_url || '',
    options,
    endDatetime: vals.end_datetime_utc || vals.counts_are_final || '',
    votingStatus: vals.counts_are_final === 'true' ? 'closed' : 'open',
  };
}
