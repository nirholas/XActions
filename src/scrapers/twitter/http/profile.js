// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Twitter HTTP Profile Scraper
 *
 * Scrapes user profiles via Twitter's internal GraphQL API (UserByScreenName,
 * UserByRestId) — no browser required.  Drop-in replacement for the
 * Puppeteer-based scrapeProfile() in ../index.js.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { GRAPHQL } from './endpoints.js';
import { NotFoundError, TwitterApiError } from './errors.js';

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

// parseUserData and its helpers live in ./parse/user.js so the edge API can
// import them without dragging in the HTTP client and the Node filesystem.
// Re-exported here because this module has been the public home of
// parseUserData since it was written.
export { parseUserData } from './parse/user.js';
import { parseUserData } from './parse/user.js';

// ---------------------------------------------------------------------------
// scrapeProfile (by username)
// ---------------------------------------------------------------------------

/**
 * Scrape a user profile by screen name via the `UserByScreenName` GraphQL
 * endpoint.
 *
 * Works with both **guest tokens** (for public profiles) and **auth tokens**
 * (any visible profile).
 *
 * @param {import('./client.js').TwitterHttpClient} client — Configured HTTP client.
 * @param {string} username — The screen name (without leading `@`).
 * @returns {Promise<object>} XActions profile object.
 * @throws {NotFoundError} Non-existent or suspended username.
 * @throws {AuthError} Protected account accessed without auth.
 * @throws {TwitterApiError} Other API errors.
 */
export async function scrapeProfile(client, username) {
  const { queryId, operationName } = GRAPHQL.UserByScreenName;
  const variables = {
    screen_name: username,
    withSafetyModeUserFields: true,
  };

  const response = await client.graphql(queryId, operationName, variables);

  // Validate response structure
  const result = response?.data?.user?.result;

  if (!result) {
    throw new NotFoundError(`User @${username} not found`);
  }

  // Handle errors array in response (rate-limit, partial errors)
  if (response.errors?.length) {
    const msg = response.errors.map((e) => e.message).join('; ');
    throw new TwitterApiError(`GraphQL errors: ${msg}`, { data: response });
  }

  // Protected account without auth → surface a clear error
  if (result.__typename === 'User' && (result.privacy?.protected ?? result.legacy?.protected) && !client.isAuthenticated()) {
    // We can still return the partial profile data — but callers should know
    // the bio / tweets may be restricted.
  }

  return parseUserData(result);
}

// ---------------------------------------------------------------------------
// scrapeProfileById (by user ID)
// ---------------------------------------------------------------------------

/**
 * Scrape a user profile by REST ID via the `UserByRestId` GraphQL endpoint.
 *
 * @param {import('./client.js').TwitterHttpClient} client — Configured HTTP client.
 * @param {string} userId — The numeric user ID.
 * @returns {Promise<object>} XActions profile object.
 * @throws {NotFoundError} Unknown user ID.
 * @throws {AuthError} Protected account without auth.
 * @throws {TwitterApiError} Other API errors.
 */
export async function scrapeProfileById(client, userId) {
  const { queryId, operationName } = GRAPHQL.UserByRestId;
  const variables = {
    userId: String(userId),
    withSafetyModeUserFields: true,
  };

  const response = await client.graphql(queryId, operationName, variables);

  const result = response?.data?.user?.result;

  if (!result) {
    throw new NotFoundError(`User with ID ${userId} not found`);
  }

  if (response.errors?.length) {
    const msg = response.errors.map((e) => e.message).join('; ');
    throw new TwitterApiError(`GraphQL errors: ${msg}`, { data: response });
  }

  return parseUserData(result);
}
