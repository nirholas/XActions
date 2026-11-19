// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Chat context: turn what a person attaches (an account, a post, a thread)
 * into numbered posts a model can read and cite.
 *
 * An attachment is resolved once, through the guest-token readers in
 * src/edge/, and the result travels with the conversation. Every later
 * question sends the resolved items back, so a follow-up costs one LLM call
 * and no X requests at all. The numbering is assigned per request across all
 * attached items, which is what lets an answer say "[4]" and the page turn it
 * into a link to that exact post.
 *
 * Items arrive from the browser on every question, so `sanitizeItems` treats
 * them as untrusted: fields are re-typed, text is capped, and the whole
 * context is held inside a token budget before it reaches the prompt.
 *
 * Runs unchanged in Node, the Cloudflare Worker and tests: the X readers are
 * injected, and nothing here touches the filesystem.
 *
 * @module chat/context
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

/** Context budget, in estimated tokens, shown to the reader as "used / budget". */
export const CONTEXT_BUDGET = 24_000;
/** Most items one conversation can attach. */
export const MAX_ITEMS = 8;
/** Most posts kept per item. */
export const MAX_POSTS_PER_ITEM = 60;
/** Longest post text kept, in characters. Long-form posts are cut here. */
const MAX_POST_CHARS = 1500;
/** Recent posts read for an attached account. */
export const ACCOUNT_POSTS = 40;
/** Most posts read for an attached thread. */
export const THREAD_POSTS = 20;

/**
 * Rough token estimate. Four characters a token is close enough for English
 * and errs high for the short words posts are full of, which is the safe side
 * for a budget.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  return Math.ceil(String(text || '').length / 4);
}

/**
 * Work out what a person attached.
 *
 * Accepts a status URL on x.com or twitter.com (with or without the `/i/web`
 * form), a bare numeric post id, a profile URL, or a handle with or without @.
 *
 * @param {string} input
 * @returns {{kind: 'post', id: string} | {kind: 'account', username: string} | null}
 */
export function parseAttachment(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const status = raw.match(/^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]{1,15}|i(?:\/web)?)\/status(?:es)?\/(\d{5,25})/i);
  if (status) return { kind: 'post', id: status[1] };
  if (/^\d{10,25}$/.test(raw)) return { kind: 'post', id: raw };

  const profile = raw.match(/^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/i);
  const candidate = profile ? profile[1] : raw.replace(/^@/, '');
  const reserved = ['home', 'explore', 'search', 'i', 'settings', 'notifications', 'messages', 'compose', 'login', 'signup'];
  if (/^[A-Za-z0-9_]{1,15}$/.test(candidate) && !reserved.includes(candidate.toLowerCase())) {
    return { kind: 'account', username: candidate };
  }
  return null;
}

/**
 * Keep a value as a finite, non-negative integer.
 * @param {unknown} value
 * @returns {number}
 */
function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * A string, trimmed and capped, or the fallback.
 * @param {unknown} value
 * @param {number} max
 * @param {string} [fallback='']
 * @returns {string}
 */
function str(value, max, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed || fallback;
}

/**
 * Only https links to X itself survive sanitising; anything else would let a
 * crafted item put an arbitrary link behind a citation.
 * @param {unknown} url
 * @returns {string}
 */
function xUrl(url) {
  return typeof url === 'string' && /^https:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_/]+$/.test(url) ? url : '';
}

/**
 * Normalise a post from either edge reader (timeline or single-post shape)
 * onto the one shape a context item stores.
 * @param {object} post
 * @returns {object|null}
 */
export function toContextPost(post) {
  if (!post || !post.id) return null;
  const id = String(post.id);
  const username = str(post.author?.username || post.username, 15);
  if (!/^\d{1,25}$/.test(id)) return null;
  const metrics = post.metrics || {};
  const retweetOf = post.retweetOf || post.retweetedStatus || null;
  return {
    id,
    url: username ? `https://x.com/${username}/status/${id}` : `https://x.com/i/status/${id}`,
    author: username,
    name: str(post.author?.name || post.name, 60, username),
    createdAt: typeof post.createdAt === 'string' ? post.createdAt : null,
    text: str(post.text, MAX_POST_CHARS),
    likes: count(metrics.likes ?? post.likes),
    reposts: count(metrics.reposts ?? metrics.retweets ?? post.retweets),
    replies: count(metrics.replies ?? post.replies),
    views: count(metrics.views ?? post.views),
    isReply: Boolean(post.isReply || post.replyTo || post.inReplyTo),
    isRepost: Boolean(post.isRetweet || retweetOf),
    quoted: post.quoted || post.quotedTweet
      ? str(`@${(post.quoted || post.quotedTweet).author?.username || ''}: ${(post.quoted || post.quotedTweet).text || ''}`, 400)
      : '',
  };
}

/**
 * Re-type one stored post (the shape toContextPost produced) that came back
 * from a browser.
 * @param {unknown} p
 * @returns {object|null}
 */
function sanitizePost(p) {
  if (!p || typeof p !== 'object') return null;
  const id = String(p.id ?? '');
  if (!/^\d{1,25}$/.test(id)) return null;
  const author = /^[A-Za-z0-9_]{1,15}$/.test(p.author || '') ? p.author : '';
  return {
    id,
    url: xUrl(p.url) || (author ? `https://x.com/${author}/status/${id}` : `https://x.com/i/status/${id}`),
    author,
    name: str(p.name, 60, author),
    createdAt: typeof p.createdAt === 'string' ? p.createdAt.slice(0, 32) : null,
    text: str(p.text, MAX_POST_CHARS),
    likes: count(p.likes),
    reposts: count(p.reposts),
    replies: count(p.replies),
    views: count(p.views),
    isReply: Boolean(p.isReply),
    isRepost: Boolean(p.isRepost),
    quoted: str(p.quoted, 400),
  };
}

/**
 * Re-type and cap items that arrived from a browser. Anything malformed is
 * dropped rather than repaired, because a repaired item could cite a post that
 * does not say what the item claims.
 *
 * @param {unknown} items
 * @returns {object[]}
 */
export function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const item of items.slice(0, MAX_ITEMS)) {
    if (!item || typeof item !== 'object') continue;
    const kind = ['account', 'post', 'thread'].includes(item.kind) ? item.kind : null;
    if (!kind) continue;
    const posts = (Array.isArray(item.posts) ? item.posts : [])
      .slice(0, MAX_POSTS_PER_ITEM)
      .map(sanitizePost)
      .filter(Boolean);
    const profile = item.profile && typeof item.profile === 'object'
      ? {
          username: str(item.profile.username, 15),
          name: str(item.profile.name, 60),
          bio: str(item.profile.bio, 400),
          location: str(item.profile.location, 80),
          website: str(item.profile.website, 200),
          followers: count(item.profile.followers),
          following: count(item.profile.following),
          posts: count(item.profile.posts),
          verified: Boolean(item.profile.verified),
          joined: typeof item.profile.joined === 'string' ? item.profile.joined.slice(0, 32) : null,
        }
      : null;
    if (!posts.length && !profile) continue;
    out.push({
      id: str(item.id, 64, `${kind}-${out.length}`),
      kind,
      label: str(item.label, 80, kind),
      url: xUrl(item.url),
      profile,
      posts,
    });
  }
  return out;
}

/**
 * One post as the model reads it.
 * @param {object} post
 * @param {number} n
 * @returns {string}
 */
function postLine(post, n) {
  const date = post.createdAt ? post.createdAt.slice(0, 10) : 'undated';
  const kind = post.isRepost ? ' (repost)' : post.isReply ? ' (reply)' : '';
  const stats = [`${post.likes} likes`, `${post.reposts} reposts`, `${post.replies} replies`];
  if (post.views) stats.push(`${post.views} views`);
  const quoted = post.quoted ? `\n    quoting ${post.quoted}` : '';
  return `[${n}] @${post.author || 'unknown'} · ${date}${kind} · ${stats.join(', ')}\n    ${post.text.replace(/\s+/g, ' ')}${quoted}`;
}

/**
 * The profile header for an account item. Not citable on its own: the
 * account's link is the item's link, and answers cite posts.
 * @param {object} profile
 * @returns {string}
 */
function profileBlock(profile) {
  const lines = [`ACCOUNT @${profile.username}${profile.name ? ` (${profile.name})` : ''}${profile.verified ? ', verified' : ''}`];
  lines.push(`followers ${profile.followers}, following ${profile.following}, posts ${profile.posts}${profile.joined ? `, joined ${profile.joined.slice(0, 10)}` : ''}`);
  if (profile.bio) lines.push(`bio: ${profile.bio.replace(/\s+/g, ' ')}`);
  if (profile.location) lines.push(`location: ${profile.location}`);
  if (profile.website) lines.push(`website: ${profile.website}`);
  return lines.join('\n');
}

/**
 * Number every post across the attached items and render the block the model
 * reads, inside the token budget. When the items are over budget, the oldest
 * posts of the largest item are dropped first, one at a time, so a small
 * attachment never loses everything to a large one.
 *
 * @param {object[]} items - Sanitised items
 * @param {object} [options]
 * @param {number} [options.budget=CONTEXT_BUDGET]
 * @returns {{text: string, sources: Array<{n: number, url: string, title: string, kind: string, author: string, date: string|null}>, tokens: number, dropped: number}}
 */
export function buildContextBlock(items, { budget = CONTEXT_BUDGET } = {}) {
  const working = items.map((item) => ({ ...item, posts: [...item.posts] }));
  const render = () => {
    const sources = [];
    const parts = [];
    let n = 0;
    for (const item of working) {
      const head = item.kind === 'account' && item.profile
        ? profileBlock(item.profile)
        : `${item.kind === 'thread' ? 'THREAD' : 'POST'}: ${item.label}`;
      const lines = item.posts.map((post) => {
        n += 1;
        sources.push({
          n,
          url: post.url,
          title: `@${post.author}: ${post.text.replace(/\s+/g, ' ').slice(0, 90)}`,
          kind: 'post',
          author: post.author,
          date: post.createdAt,
        });
        return postLine(post, n);
      });
      parts.push([head, ...lines].join('\n'));
    }
    return { text: parts.join('\n\n'), sources };
  };

  let dropped = 0;
  let rendered = render();
  while (estimateTokens(rendered.text) > budget) {
    const largest = working.reduce((a, b) => (b.posts.length > a.posts.length ? b : a), working[0]);
    if (!largest || largest.posts.length <= 1) break;
    // Posts are stored newest first for accounts and in reading order for
    // threads; either way the last one is the least useful to keep.
    largest.posts.pop();
    dropped += 1;
    rendered = render();
  }

  return { ...rendered, tokens: estimateTokens(rendered.text), dropped };
}

/**
 * Resolve an attachment into a context item by reading X.
 *
 * @param {string} input - What the person typed or pasted
 * @param {object} reader - The X readers, injected so tests need no network
 * @param {(username: string) => Promise<object>} reader.getProfile
 * @param {(username: string, opts: object) => Promise<{tweets: object[]}>} reader.getTweets
 * @param {(id: string, opts: object) => Promise<{focal: object, posts: object[], truncated: boolean}>} reader.getThread
 * @param {(id: string) => Promise<object>} reader.getPost
 * @returns {Promise<object>} A context item with an estimated token cost
 */
export async function resolveAttachment(input, reader) {
  const target = parseAttachment(input);
  if (!target) {
    throw Object.assign(new Error('Paste an @handle, a profile link, or a post link from x.com.'), { status: 400 });
  }

  let item;
  if (target.kind === 'account') {
    const profile = await reader.getProfile(target.username);
    if (!profile?.username) throw Object.assign(new Error(`@${target.username} was not found.`), { status: 404 });
    if (profile.protected) {
      throw Object.assign(new Error(`@${profile.username} is protected, so its posts are not public.`), { status: 403 });
    }
    const timeline = await reader.getTweets(profile.username, { limit: ACCOUNT_POSTS, userId: profile.id });
    const posts = (timeline?.tweets || []).map(toContextPost).filter(Boolean);
    item = {
      id: `account-${profile.username.toLowerCase()}`,
      kind: 'account',
      label: `@${profile.username}`,
      url: `https://x.com/${profile.username}`,
      profile: {
        username: profile.username,
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        // The edge reader says `followers`; the Node client says `followersCount`.
        followers: count(profile.followers ?? profile.followersCount),
        following: count(profile.following ?? profile.followingCount),
        posts: count(profile.tweets ?? profile.tweetCount),
        verified: Boolean(profile.verified || profile.isBlueVerified),
        joined: profile.joined ? new Date(profile.joined).toISOString() : null,
        avatar: typeof profile.avatar === 'string' ? profile.avatar : '',
      },
      posts,
    };
  } else {
    let posts;
    let truncated = false;
    try {
      const thread = await reader.getThread(target.id, { limit: THREAD_POSTS });
      posts = thread.posts.map(toContextPost).filter(Boolean);
      truncated = Boolean(thread.truncated);
    } catch (error) {
      if (error?.name === 'NotFoundError' || error?.status === 404) {
        throw Object.assign(new Error('That post was not found. It may be deleted, private, or age-restricted.'), { status: 404 });
      }
      // The thread walk makes several requests; the post on its own is one.
      posts = [toContextPost(await reader.getPost(target.id))].filter(Boolean);
    }
    if (!posts.length) throw Object.assign(new Error('That post came back empty.'), { status: 404 });
    const focal = posts.find((p) => p.id === target.id) || posts[posts.length - 1];
    const isThread = posts.length > 1;
    item = {
      id: `${isThread ? 'thread' : 'post'}-${target.id}`,
      kind: isThread ? 'thread' : 'post',
      label: `${isThread ? `Thread by @${focal.author}` : `Post by @${focal.author}`}: ${focal.text.replace(/\s+/g, ' ').slice(0, 60)}`,
      url: focal.url,
      profile: null,
      posts,
      truncated,
    };
  }

  item.tokens = buildContextBlock([item], { budget: Number.POSITIVE_INFINITY }).tokens;
  item.resolvedAt = new Date().toISOString();
  return item;
}
