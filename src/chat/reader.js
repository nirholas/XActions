// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The X readers Chat resolves attachments with: the guest-token GraphQL rail
 * in src/edge/, which needs no login and runs in Node and in the Cloudflare
 * Worker alike. Kept apart from ./context.js so tests can inject their own.
 *
 * @module chat/reader
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { getProfile, getTweets } from '../edge/twitterClient.js';
import { getPost, getThread } from '../edge/postReader.js';

export const edgeReader = { getProfile, getTweets, getPost, getThread };
