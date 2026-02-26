/**
 * XActions Client — Barrel Export
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

// Main entry point
export { Scraper, SearchMode } from './Scraper.js';

// Data models
export { Tweet } from './models/Tweet.js';
export { Profile } from './models/Profile.js';
export { Message } from './models/Message.js';

// Errors
export { ScraperError, AuthenticationError, RateLimitError, NotFoundError, TwitterApiError } from './errors.js';

// GraphQL internals (advanced usage)
export { GRAPHQL_ENDPOINTS, BEARER_TOKEN, DEFAULT_FEATURES, buildGraphQLUrl } from './api/graphqlQueries.js';

// Auth
export { TokenManager } from './auth/TokenManager.js';
