/**
 * XActions Twitter HTTP Scraper
 * Direct HTTP-based scraping via Twitter's internal GraphQL API
 * No browser required. 10x faster. Works in serverless/edge.
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

// Core client & auth
export { TwitterHttpClient, WaitingRateLimitStrategy, ErrorRateLimitStrategy } from './client.js';
export { TwitterAuth } from './auth.js';
export { GuestTokenManager } from './guest.js';

// Scraping functions
export { scrapeProfile, scrapeProfileById, parseUserData } from './profile.js';
export { scrapeFollowers, scrapeFollowing, scrapeNonFollowers, scrapeLikers, scrapeRetweeters, scrapeListMembers } from './relationships.js';

// Action functions (mutations)
export { postTweet, postThread, deleteTweet, replyToTweet, quoteTweet, schedulePost } from './actions.js';
export { likeTweet, unlikeTweet, retweet, unretweet, followUser, unfollowUser, followByUsername, blockUser, unblockUser, muteUser, unmuteUser, bookmarkTweet, unbookmarkTweet, pinTweet, unpinTweet, bulkUnfollow, bulkLike, bulkBlock } from './engagement.js';
export { uploadMedia, uploadImage, uploadVideo, uploadGif, setAltText, scrapeMedia, downloadMedia, getVideoUrl } from './media.js';

// Endpoint constants
export { BEARER_TOKEN, GRAPHQL, REST, DEFAULT_FEATURES, DEFAULT_FIELD_TOGGLES, RATE_LIMITS, USER_AGENTS, buildGraphQLUrl, buildGraphQLVariables } from './endpoints.js';

// Error classes
export { TwitterApiError, RateLimitError, AuthError, NotFoundError, NetworkError, parseTwitterErrors } from './errors.js';

// ---------------------------------------------------------------------------
// Convenience Factory
// ---------------------------------------------------------------------------

/**
 * Create an HTTP scraper instance ready to use.
 * 
 * @param {Object} options
 * @param {string} [options.cookies] - Browser cookie string for authentication
 * @param {string} [options.proxy] - HTTP/SOCKS5 proxy URL
 * @param {'wait'|'error'} [options.rateLimitStrategy] - How to handle rate limits
 * @returns {Promise<Object>} Scraper with all methods bound to the client
 * 
 * @example
 * import { createHttpScraper } from 'xactions/scrapers/twitter/http';
 * const scraper = await createHttpScraper({ cookies: 'auth_token=xxx; ct0=yyy' });
 * const profile = await scraper.scrapeProfile('elonmusk');
 * const tweets = await scraper.scrapeTweets('elonmusk', { limit: 50 });
 */
export async function createHttpScraper(options = {}) {
  const { TwitterHttpClient } = await import('./client.js');
  const { TwitterAuth } = await import('./auth.js');

  const client = new TwitterHttpClient(options);

  if (options.cookies) {
    const auth = new TwitterAuth(client);
    await auth.loginWithCookies(options.cookies);
  }

  // Lazy-import scraping modules so barrel stays light when unused
  const [profileMod, relationshipsMod, actionsMod, engagementMod, mediaMod] = await Promise.all([
    import('./profile.js'),
    import('./relationships.js'),
    import('./actions.js'),
    import('./engagement.js'),
    import('./media.js'),
  ]);

  return {
    client,

    // Profile
    scrapeProfile: (username) => profileMod.scrapeProfile(client, username),
    scrapeProfileById: (userId) => profileMod.scrapeProfileById(client, userId),
    parseUserData: profileMod.parseUserData,

    // Relationships
    scrapeFollowers: (username, opts) => relationshipsMod.scrapeFollowers(client, username, opts),
    scrapeFollowing: (username, opts) => relationshipsMod.scrapeFollowing(client, username, opts),
    scrapeNonFollowers: (username, opts) => relationshipsMod.scrapeNonFollowers(client, username, opts),
    scrapeLikers: (tweetId, opts) => relationshipsMod.scrapeLikers(client, tweetId, opts),
    scrapeRetweeters: (tweetId, opts) => relationshipsMod.scrapeRetweeters(client, tweetId, opts),
    scrapeListMembers: (listId, opts) => relationshipsMod.scrapeListMembers(client, listId, opts),

    // Actions (mutations)
    postTweet: (text, opts) => actionsMod.postTweet(client, text, opts),
    postThread: (tweets, opts) => actionsMod.postThread(client, tweets, opts),
    deleteTweet: (tweetId) => actionsMod.deleteTweet(client, tweetId),
    replyToTweet: (tweetId, text, opts) => actionsMod.replyToTweet(client, tweetId, text, opts),
    quoteTweet: (tweetId, text, opts) => actionsMod.quoteTweet(client, tweetId, text, opts),
    schedulePost: (text, scheduledAt, opts) => actionsMod.schedulePost(client, text, scheduledAt, opts),

    // Engagement
    likeTweet: (tweetId) => engagementMod.likeTweet(client, tweetId),
    unlikeTweet: (tweetId) => engagementMod.unlikeTweet(client, tweetId),
    retweet: (tweetId) => engagementMod.retweet(client, tweetId),
    unretweet: (tweetId) => engagementMod.unretweet(client, tweetId),
    followUser: (userId) => engagementMod.followUser(client, userId),
    unfollowUser: (userId) => engagementMod.unfollowUser(client, userId),
    followByUsername: (username) => engagementMod.followByUsername(client, username),
    blockUser: (userId) => engagementMod.blockUser(client, userId),
    unblockUser: (userId) => engagementMod.unblockUser(client, userId),
    muteUser: (userId) => engagementMod.muteUser(client, userId),
    unmuteUser: (userId) => engagementMod.unmuteUser(client, userId),
    bookmarkTweet: (tweetId) => engagementMod.bookmarkTweet(client, tweetId),
    unbookmarkTweet: (tweetId) => engagementMod.unbookmarkTweet(client, tweetId),
    pinTweet: (tweetId) => engagementMod.pinTweet(client, tweetId),
    unpinTweet: (tweetId) => engagementMod.unpinTweet(client, tweetId),
    bulkUnfollow: (userIds, opts) => engagementMod.bulkUnfollow(client, userIds, opts),
    bulkLike: (tweetIds, opts) => engagementMod.bulkLike(client, tweetIds, opts),
    bulkBlock: (userIds, opts) => engagementMod.bulkBlock(client, userIds, opts),

    // Media
    uploadMedia: (input, opts) => mediaMod.uploadMedia(client, input, opts),
    uploadImage: (input, opts) => mediaMod.uploadImage(client, input, opts),
    uploadVideo: (input, opts) => mediaMod.uploadVideo(client, input, opts),
    uploadGif: (input, opts) => mediaMod.uploadGif(client, input, opts),
    setAltText: (mediaId, altText) => mediaMod.setAltText(client, mediaId, altText),
    scrapeMedia: (username, opts) => mediaMod.scrapeMedia(client, username, opts),
    downloadMedia: (url, opts) => mediaMod.downloadMedia(client, url, opts),
    getVideoUrl: (tweetId) => mediaMod.getVideoUrl(client, tweetId),
  };
}
