// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The original bulk operations: unfollow, detect unfollowers, auto-like,
 * follow engagers, keyword follow, auto-comment, plus script runs, dataset
 * fetches and DM conversation listing.
 *
 * Each bulk operation has two engines. A job that carries an X session (a
 * dashboard user who saved one, or an agent that sent its cookie) drives a
 * browser logged in as that session. A dashboard user who connected through
 * OAuth instead goes through the X API client in ../operations/.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { processUnfollowNonFollowers } from '../operations/unfollowNonFollowers.js';
import { processUnfollowEveryone } from '../operations/unfollowEveryone.js';
import { processDetectUnfollowers } from '../operations/detectUnfollowers.js';
import { processAutoLike } from '../operations/autoLike.js';
import { processFollowEngagers } from '../operations/followEngagers.js';
import { processKeywordFollow } from '../operations/keywordFollow.js';
import { processAutoComment } from '../operations/autoComment.js';
import { unfollowNonFollowersBrowser } from '../operations/puppeteer/unfollowNonFollowers.js';
import { unfollowEveryoneBrowser } from '../operations/puppeteer/unfollowEveryone.js';
import { detectUnfollowersBrowser } from '../operations/puppeteer/detectUnfollowers.js';
import { autoLikeBrowser } from '../operations/puppeteer/autoLike.js';
import { followEngagersBrowser } from '../operations/puppeteer/followEngagers.js';
import { keywordFollowBrowser } from '../operations/puppeteer/keywordFollow.js';
import { autoCommentBrowser } from '../operations/puppeteer/autoComment.js';
import { runBrowserScript } from '../operations/puppeteer/scriptRunner.js';

/**
 * Run a bulk operation on whichever engine the job's credentials allow.
 *
 * The browser engines take the auth_token in `config.sessionCookie`. They used
 * to receive the value exactly as the route put it there, which for dashboard
 * users is the encrypted column, so X saw ciphertext as the cookie. The
 * context resolves (and decrypts) it first.
 */
function dualEngine(browserEngine, apiEngine) {
  return async (ctx) => {
    const isCancelled = () => ctx.cancelled();
    // Every write is charged against the account's rolling 24 hour cap, as
    // every other write path is; these engines once bypassed it.
    const charge = (actionClass) => ctx.charge(actionClass);
    const oauthOnly = ctx.data.authMethod && ctx.data.authMethod !== 'session';
    if (!oauthOnly && (await ctx.hasSession())) {
      const config = { ...ctx.config, sessionCookie: await ctx.authToken() };
      return browserEngine(ctx.userId, config, (message) => ctx.progress(message), isCancelled, charge);
    }
    return apiEngine(ctx.data, isCancelled, charge);
  };
}

export default {
  unfollowNonFollowers: {
    run: dualEngine(unfollowNonFollowersBrowser, processUnfollowNonFollowers),
    write: true,
    description: 'Unfollow accounts that do not follow back',
  },
  unfollowEveryone: {
    run: dualEngine(unfollowEveryoneBrowser, processUnfollowEveryone),
    write: true,
    description: 'Unfollow every account',
  },
  detectUnfollowers: {
    run: dualEngine(detectUnfollowersBrowser, processDetectUnfollowers),
    concurrency: 3,
    description: 'List who unfollowed since the last run',
  },
  autoLike: {
    run: dualEngine(autoLikeBrowser, processAutoLike),
    write: true,
    description: 'Like posts matching a target',
  },
  followEngagers: {
    run: dualEngine(followEngagersBrowser, processFollowEngagers),
    write: true,
    description: 'Follow the accounts engaging with a post',
  },
  keywordFollow: {
    run: dualEngine(keywordFollowBrowser, processKeywordFollow),
    write: true,
    description: 'Follow accounts posting about a keyword',
  },
  autoComment: {
    run: dualEngine(autoCommentBrowser, processAutoComment),
    write: true,
    description: 'Reply to posts matching a target',
  },

  scriptRun: {
    run: async (ctx) => {
      const config = { ...ctx.config, sessionCookie: await ctx.authToken() };
      return runBrowserScript(config, (message) => ctx.progress(message), () => ctx.cancelled());
    },
    write: true,
    description: 'Run a browser console script as the session',
  },

  datasetFetch: {
    run: async (ctx) => {
      const dataset = ctx.require('dataset');
      const { DatasetStore } = await import('../../../src/scraping/paginationEngine.js');
      const store = new DatasetStore(dataset, await ctx.authToken());
      ctx.progress(`Fetching dataset: ${dataset}`);
      const data = await store.getData({ offset: ctx.config.offset || 0, limit: ctx.config.limit || 100 });
      ctx.progress({ status: 'done', message: `Fetched ${data?.items?.length ?? 0} records` });
      return data;
    },
    description: 'Page through a stored dataset',
  },

  getConversations: {
    run: async (ctx) => {
      const { listDmConversations } = await import('../xSession.js');
      const conversations = await listDmConversations(await ctx.scraper(), ctx.config.limit || 20);
      return { success: true, count: conversations.length, conversations };
    },
    concurrency: 3,
    description: 'List DM conversations',
  },
};
