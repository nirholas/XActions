/**
 * Twitter HTTP Thread Scraper
 *
 * Full conversation thread scraping and reconstruction via Twitter's
 * `TweetDetail` GraphQL endpoint. Supports:
 * - Thread scraping from any tweet in a chain
 * - Walking up reply chains to find the root tweet
 * - Full conversation pagination ("Show more replies")
 * - Self-thread extraction (same author's continuation)
 * - Tree/flat reconstruction from unordered tweet arrays
 *
 * No browser required. Uses the HTTP client directly.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { GRAPHQL } from './endpoints.js';
import { NotFoundError } from './errors.js';
import { parseTweetData } from './tweets.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Deduplicate tweets by `id`, keeping the first occurrence.
 *
 * @param {object[]} tweets
 * @returns {object[]}
 */
function deduplicateTweets(tweets) {
  const seen = new Set();
  return tweets.filter((t) => {
    if (!t.id || seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/**
 * Sort tweets chronologically by createdAt (ascending).
 *
 * @param {object[]} tweets
 * @returns {object[]}
 */
function sortChronologically(tweets) {
  return [...tweets].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return da - db;
  });
}

// ---------------------------------------------------------------------------
// parseConversationModule — Parse Twitter's conversation thread module
// ---------------------------------------------------------------------------

/**
 * Parse a single conversation module from the TweetDetail response.
 *
 * Twitter groups replies into `TimelineTimelineModule` entries keyed
 * by `conversationthread-{id}`. Each module contains an `items` array
 * of `TimelineTimelineItem` entries, each holding either a tweet or a
 * "Show more" cursor.
 *
 * @param {object} module — A module entry from the TweetDetail response.
 * @returns {{ tweets: object[], cursors: object[] }}
 */
export function parseConversationModule(module) {
  const tweets = [];
  const cursors = [];

  if (!module) return { tweets, cursors };

  // Handle both direct items array and nested content.items
  const items = module.items || module.content?.items || [];

  for (const item of items) {
    const itemContent =
      item?.item?.itemContent ??
      item?.itemContent ??
      null;

    if (!itemContent) continue;

    // Tweet entry
    const tweetResult = itemContent.tweet_results?.result;
    if (tweetResult) {
      const parsed = parseTweetData(tweetResult);
      if (parsed && (parsed.id || parsed.tombstone)) {
        tweets.push(parsed);
      }
      continue;
    }

    // Cursor entry (e.g. "Show more replies")
    const cursorType = itemContent.cursorType ?? itemContent.itemType;
    const cursorValue = itemContent.value;
    if (
      cursorValue &&
      (cursorType === 'ShowMoreThreads' ||
        cursorType === 'ShowMoreThreadsPrompt' ||
        cursorType === 'TimelineTimelineCursor' ||
        itemContent.__typename === 'TimelineTimelineCursor')
    ) {
      cursors.push({
        type: cursorType,
        value: cursorValue,
      });
    }
  }

  return { tweets, cursors };
}

// ---------------------------------------------------------------------------
// parseTweetDetailResponse — Extract tweets & cursors from TweetDetail
// ---------------------------------------------------------------------------

/**
 * Parse a full TweetDetail GraphQL response into flat arrays of tweets
 * and cursors.
 *
 * @param {object} response — The raw GraphQL response from TweetDetail.
 * @returns {{ tweets: object[], cursors: object[], modules: Map<string, object[]> }}
 */
function parseTweetDetailResponse(response) {
  const allTweets = [];
  const allCursors = [];
  const modules = new Map(); // entryId → tweets[]

  const instructions =
    response?.data?.threaded_conversation_with_injections_v2?.instructions ?? [];

  for (const instruction of instructions) {
    const type = instruction.type;

    if (type === 'TimelineAddEntries') {
      const entries = instruction.entries || [];
      for (const entry of entries) {
        const entryId = entry.entryId || '';
        const entryType = entry.content?.__typename || entry.content?.entryType || '';

        // ---- Single tweet entry (tweet-{id}) ----------------------------
        if (entryType === 'TimelineTimelineItem' || entryId.startsWith('tweet-')) {
          const tweetResult =
            entry.content?.itemContent?.tweet_results?.result ?? null;
          if (tweetResult) {
            const parsed = parseTweetData(tweetResult);
            if (parsed && (parsed.id || parsed.tombstone)) {
              allTweets.push(parsed);
            }
          }

          // Also check for cursor in single entries
          const cursorValue = entry.content?.itemContent?.value;
          const cursorType =
            entry.content?.itemContent?.cursorType ??
            entry.content?.cursorType;
          if (cursorValue && cursorType) {
            allCursors.push({ type: cursorType, value: cursorValue });
          }
          continue;
        }

        // ---- Conversation module (conversationthread-{id}) ---------------
        if (
          entryType === 'TimelineTimelineModule' ||
          entryId.startsWith('conversationthread-')
        ) {
          const { tweets, cursors } = parseConversationModule(entry.content);
          allTweets.push(...tweets);
          allCursors.push(...cursors);
          if (tweets.length > 0) {
            modules.set(entryId, tweets);
          }
          continue;
        }

        // ---- Cursor entries (cursor-bottom-*, cursor-top-*, cursor-showmore-*) ----
        if (entryId.startsWith('cursor-')) {
          const value =
            entry.content?.value ??
            entry.content?.itemContent?.value ??
            null;
          const type =
            entry.content?.cursorType ??
            entry.content?.itemContent?.cursorType ??
            (entryId.includes('bottom') ? 'Bottom' : 'ShowMore');
          if (value) {
            allCursors.push({ type, value });
          }
        }
      }
    }

    // ---- TimelineAddToModule — appended replies --------------------------
    if (type === 'TimelineAddToModule') {
      const moduleItems = instruction.moduleItems || [];
      for (const item of moduleItems) {
        const tweetResult = item?.item?.itemContent?.tweet_results?.result;
        if (tweetResult) {
          const parsed = parseTweetData(tweetResult);
          if (parsed && (parsed.id || parsed.tombstone)) {
            allTweets.push(parsed);
          }
        }
      }
    }
  }

  return {
    tweets: deduplicateTweets(allTweets),
    cursors: allCursors,
    modules,
  };
}

// ---------------------------------------------------------------------------
// reconstructThread — Pure function for thread ordering
// ---------------------------------------------------------------------------

/**
 * Reconstruct a thread from a flat array of parsed tweets.
 *
 * Produces an ordered flat array and separates author self-replies.
 * Handles self-threads, branching conversations, and missing (deleted)
 * tweets by inspecting each tweet's `inReplyTo` field.
 *
 * @param {object[]} tweets — Flat array of parsed tweets (with `inReplyTo`).
 * @returns {{
 *   rootTweet: object|null,
 *   authorReplies: object[],
 *   conversation: object[],
 *   tree: Map<string|null, object[]>,
 * }}
 */
export function reconstructThread(tweets) {
  if (!tweets || tweets.length === 0) {
    return { rootTweet: null, authorReplies: [], conversation: [], tree: new Map() };
  }

  // Build a set of known tweet IDs
  const tweetMap = new Map();
  for (const tweet of tweets) {
    if (tweet.id) tweetMap.set(tweet.id, tweet);
  }

  // Find root tweet(s) — tweets that are not replies, or whose parent is not
  // in our set (the parent was not fetched / was deleted)
  const roots = [];
  for (const tweet of tweets) {
    if (!tweet.inReplyTo) {
      roots.push(tweet);
    } else if (!tweetMap.has(tweet.inReplyTo.tweetId)) {
      // Parent not in our set — treat as a root of its subtree
      roots.push(tweet);
    }
  }

  // Sort roots chronologically and pick the earliest as THE root
  const sortedRoots = sortChronologically(roots);
  const rootTweet = sortedRoots[0] || tweets[0] || null;

  // Build parent → children map (tree)
  const tree = new Map();
  for (const tweet of tweets) {
    const parentId = tweet.inReplyTo?.tweetId ?? null;
    if (!tree.has(parentId)) tree.set(parentId, []);
    tree.get(parentId).push(tweet);
  }
  // Sort children chronologically
  for (const [, children] of tree) {
    children.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return da - db;
    });
  }

  // Identify the thread author (root tweet's author)
  const authorId = rootTweet?.author?.id;

  // Separate author's self-replies from other conversation replies
  const authorReplies = [];
  const conversation = [];

  // Walk the tree depth-first to produce ordered flat arrays
  const visited = new Set();

  function walk(tweetId) {
    const children = tree.get(tweetId) || [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);

      if (child.author?.id === authorId) {
        authorReplies.push(child);
      }
      conversation.push(child);

      // Recurse into this child's replies
      walk(child.id);
    }
  }

  // Start from roots
  if (rootTweet?.id) {
    visited.add(rootTweet.id);
    walk(rootTweet.id);
  }

  // Also walk from null parent (for tweets whose parent isn't in our set)
  const orphanChildren = tree.get(null) || [];
  for (const orphan of orphanChildren) {
    if (visited.has(orphan.id)) continue;
    visited.add(orphan.id);
    conversation.push(orphan);
    if (orphan.author?.id === authorId) {
      authorReplies.push(orphan);
    }
    walk(orphan.id);
  }

  // Pick up any remaining unvisited tweets (defensive)
  for (const tweet of tweets) {
    if (tweet.id && !visited.has(tweet.id)) {
      visited.add(tweet.id);
      conversation.push(tweet);
      if (tweet.author?.id === authorId) {
        authorReplies.push(tweet);
      }
    }
  }

  return {
    rootTweet,
    authorReplies: sortChronologically(authorReplies),
    conversation: sortChronologically(conversation),
    tree,
  };
}

// ---------------------------------------------------------------------------
// scrapeThread — Thread scraping from a single tweet
// ---------------------------------------------------------------------------

/**
 * Scrape a conversation thread starting from any tweet in the chain.
 *
 * Uses the `TweetDetail` GraphQL endpoint which returns the conversation
 * context: parent tweets above, the focal tweet, and replies below.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId — Any tweet in the thread.
 * @param {object} [options]
 * @param {string} [options.cursor] — Resume pagination cursor.
 * @returns {Promise<{
 *   rootTweet: object,
 *   authorReplies: object[],
 *   conversation: object[],
 *   totalReplies: number,
 *   hasMore: boolean,
 *   cursor: string|null,
 * }>}
 */
export async function scrapeThread(client, tweetId, options = {}) {
  const { queryId, operationName } = GRAPHQL.TweetDetail;

  const variables = {
    focalTweetId: tweetId,
    with_rux_injections: false,
    rankingMode: 'Relevance',
    includePromotedContent: false,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: true,
    withBirdwatchNotes: true,
    withVoice: true,
  };

  if (options.cursor) {
    variables.cursor = options.cursor;
  }

  const resp = await client.graphql(queryId, operationName, variables);

  const { tweets, cursors } = parseTweetDetailResponse(resp);

  if (tweets.length === 0) {
    throw new NotFoundError(`Thread for tweet ${tweetId} not found`);
  }

  // Find "show more" / bottom cursor for pagination
  const showMoreCursor =
    cursors.find(
      (c) =>
        c.type === 'Bottom' ||
        c.type === 'ShowMore' ||
        c.type === 'ShowMoreThreads' ||
        c.type === 'ShowMoreThreadsPrompt',
    ) ?? null;

  const { rootTweet, authorReplies, conversation } = reconstructThread(tweets);

  return {
    rootTweet,
    authorReplies,
    conversation,
    totalReplies: conversation.length,
    hasMore: showMoreCursor !== null,
    cursor: showMoreCursor?.value ?? null,
  };
}

// ---------------------------------------------------------------------------
// scrapeFullThread — Walk up to root, then scrape full thread
// ---------------------------------------------------------------------------

/**
 * Walk up the reply chain to find the root tweet, then scrape the full
 * thread from root to all leaves.
 *
 * Uses `in_reply_to_status_id_str` to traverse parent tweets one by one,
 * then calls `scrapeThread()` on the discovered root.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId — Any tweet in the thread.
 * @param {object} [options]
 * @param {number} [options.maxDepth=50] — Max parent traversals to prevent loops.
 * @returns {Promise<{
 *   rootTweet: object,
 *   authorReplies: object[],
 *   conversation: object[],
 *   totalReplies: number,
 *   hasMore: boolean,
 *   cursor: string|null,
 * }>}
 */
export async function scrapeFullThread(client, tweetId, options = {}) {
  const { maxDepth = 50 } = options;
  const { queryId, operationName } = GRAPHQL.TweetDetail;

  // Walk up to find the root tweet
  let currentId = tweetId;
  const visited = new Set();
  let depth = 0;

  while (depth < maxDepth) {
    if (visited.has(currentId)) break; // cycle guard
    visited.add(currentId);

    const variables = {
      focalTweetId: currentId,
      with_rux_injections: false,
      rankingMode: 'Relevance',
      includePromotedContent: false,
      withCommunity: true,
      withQuickPromoteEligibilityTweetFields: true,
      withBirdwatchNotes: true,
      withVoice: true,
    };

    const resp = await client.graphql(queryId, operationName, variables);
    const { tweets } = parseTweetDetailResponse(resp);

    // Find the focal tweet to check if it has a parent
    const focalTweet = tweets.find((t) => t.id === currentId);

    if (!focalTweet) break;

    // If this tweet has a parent, walk up
    if (focalTweet.inReplyTo?.tweetId) {
      currentId = focalTweet.inReplyTo.tweetId;
      depth++;
    } else {
      // This is the root — we're done walking up
      break;
    }
  }

  // Now scrape the full thread from the root
  return scrapeThread(client, currentId, options);
}

// ---------------------------------------------------------------------------
// scrapeConversation — All replies with pagination
// ---------------------------------------------------------------------------

/**
 * Get all replies to a specific tweet (not just the author's).
 * Paginates through "Show more replies" cursors.
 *
 * @param {import('./client.js').TwitterHttpClient} client
 * @param {string} tweetId — The tweet to get replies for.
 * @param {object} [options]
 * @param {number} [options.limit=200]
 * @param {'relevance'|'recency'} [options.sortBy='relevance']
 * @param {function} [options.onProgress] — `({ fetched, limit }) => void`
 * @returns {Promise<{
 *   rootTweet: object,
 *   authorReplies: object[],
 *   conversation: object[],
 *   totalReplies: number,
 *   hasMore: boolean,
 *   cursor: string|null,
 * }>}
 */
export async function scrapeConversation(client, tweetId, options = {}) {
  const { limit = 200, sortBy = 'relevance', onProgress } = options;
  const { queryId, operationName } = GRAPHQL.TweetDetail;

  const rankingMode =
    sortBy === 'recency' ? 'Recency' : 'Relevance';

  const allTweets = [];
  let nextCursor = null;
  let firstRun = true;

  while (allTweets.length < limit) {
    const variables = {
      focalTweetId: tweetId,
      with_rux_injections: false,
      rankingMode,
      includePromotedContent: false,
      withCommunity: true,
      withQuickPromoteEligibilityTweetFields: true,
      withBirdwatchNotes: true,
      withVoice: true,
    };

    if (nextCursor) {
      variables.cursor = nextCursor;
    }

    const resp = await client.graphql(queryId, operationName, variables);
    const { tweets, cursors } = parseTweetDetailResponse(resp);

    // Add new tweets (deduplicate across pages)
    const existingIds = new Set(allTweets.map((t) => t.id));
    let newCount = 0;
    for (const tweet of tweets) {
      if (tweet.id && !existingIds.has(tweet.id)) {
        allTweets.push(tweet);
        newCount++;
        if (allTweets.length >= limit) break;
      }
    }

    if (onProgress) {
      onProgress({ fetched: allTweets.length, limit });
    }

    // Find next cursor
    const showMoreCursor =
      cursors.find(
        (c) =>
          c.type === 'Bottom' ||
          c.type === 'ShowMore' ||
          c.type === 'ShowMoreThreads' ||
          c.type === 'ShowMoreThreadsPrompt',
      ) ?? null;

    if (!showMoreCursor || newCount === 0) {
      // No more pages
      nextCursor = null;
      break;
    }

    nextCursor = showMoreCursor.value;

    // Rate-limit courtesy delay between pages
    if (!firstRun) {
      await sleep(1000 + Math.random() * 1000);
    }
    firstRun = false;
  }

  // Reconstruct the thread
  const dedupedTweets = deduplicateTweets(allTweets);
  const { rootTweet, authorReplies, conversation } = reconstructThread(dedupedTweets);

  // Check if there's still more to fetch
  const hasMore = nextCursor !== null && allTweets.length >= limit;

  return {
    rootTweet,
    authorReplies,
    conversation,
    totalReplies: conversation.length,
    hasMore,
    cursor: nextCursor,
  };
}
