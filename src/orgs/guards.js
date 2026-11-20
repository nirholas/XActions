// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Content checks that run before a post is queued and again before it ships.
 *
 * Two rules, both from X's own policies, not taste:
 *
 * 1. **No duplicate posts across accounts.** X's automation rules forbid
 *    posting identical or substantially similar content across several
 *    accounts you operate, even ones that openly belong to the same
 *    organization. The sanctioned way to put one announcement on several
 *    accounts is for the others to repost it, so a cross-post here is either
 *    a genuinely different variant per account or a repost of the primary.
 *    `findSimilarPairs()` compares every pair of texts in a post, and
 *    `findRecentEchoes()` compares against what the org's other accounts
 *    published recently.
 *
 * 2. **Paid or affiliate promotion is labelled.** An account marked
 *    `affiliate` posts on a brand's behalf, so every post it makes carries a
 *    disclosure tag (`#ad` by default). `applyDisclosure()` adds it when the
 *    writer forgot.
 *
 * Similarity is Jaccard overlap of word bigrams after normalisation (lower
 * case, URLs and punctuation removed). Two posts that differ only by a link,
 * an emoji or capitalisation score 1.0; two posts that announce the same
 * thing in their own words score well under the 0.8 default.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** Default similarity at or above which two texts count as duplicates. */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.8;

/** Default disclosure tag for affiliate accounts. */
export const DEFAULT_DISCLOSURE = '#ad';

/** How far back `findRecentEchoes()` looks by default. */
export const ECHO_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Normalise text for comparison: lower case, no URLs, no punctuation, single
 * spaces. Mentions and hashtags keep their words.
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shingles(text) {
  const words = normalizeText(text).split(' ').filter(Boolean);
  if (words.length < 2) return new Set(words);
  const out = new Set();
  for (let i = 0; i < words.length - 1; i++) out.add(`${words[i]} ${words[i + 1]}`);
  return out;
}

/**
 * Jaccard similarity of two texts' word bigrams, 0 to 1.
 * Two texts that normalise to nothing (only a link, only emoji) score 1,
 * because there is nothing to tell them apart.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function similarity(a, b) {
  const sa = shingles(a);
  const sb = shingles(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const s of sa) if (sb.has(s)) shared++;
  return shared / (sa.size + sb.size - shared);
}

/**
 * Every pair of texts at or above the threshold.
 * @param {Array<{handle: string, text: string}>} items
 * @param {number} [threshold]
 * @returns {Array<{a: string, b: string, score: number}>}
 */
export function findSimilarPairs(items, threshold = DEFAULT_SIMILARITY_THRESHOLD) {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const score = similarity(items[i].text, items[j].text);
      if (score >= threshold) pairs.push({ a: items[i].handle, b: items[j].handle, score: round(score) });
    }
  }
  return pairs;
}

/**
 * Texts in `items` that repeat something another account in the org
 * published inside the window. A post on the same account is not an echo:
 * that is X's own duplicate check, not a cross-account one.
 *
 * @param {Array<{handle: string, text: string}>} items
 * @param {Array<{handle: string, text: string, publishedAt: string, postId: string}>} published
 * @param {{threshold?: number, now?: number, windowMs?: number}} [options]
 * @returns {Array<{handle: string, echoes: string, postId: string, score: number}>}
 */
export function findRecentEchoes(items, published, { threshold = DEFAULT_SIMILARITY_THRESHOLD, now = Date.now(), windowMs = ECHO_WINDOW_MS } = {}) {
  const cutoff = now - windowMs;
  const recent = published.filter((p) => Date.parse(p.publishedAt) >= cutoff);
  const hits = [];
  for (const item of items) {
    for (const prior of recent) {
      if (prior.handle === item.handle) continue;
      const score = similarity(item.text, prior.text);
      if (score >= threshold) hits.push({ handle: item.handle, echoes: prior.handle, postId: prior.postId, score: round(score) });
    }
  }
  return hits;
}

/**
 * Whether `text` already carries the disclosure tag, as a whole word,
 * case-insensitively. `#ad` is satisfied by `#AD` and `#ad,` but not by `#adventure`.
 * @param {string} text
 * @param {string} tag
 * @returns {boolean}
 */
export function hasDisclosure(text, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}_#])${escaped}(?![\\p{L}\\p{N}_])`, 'iu').test(text);
}

/**
 * Append the disclosure tag when it is missing.
 * @param {string} text
 * @param {string} tag
 * @returns {{text: string, added: boolean}}
 */
export function applyDisclosure(text, tag) {
  if (hasDisclosure(text, tag)) return { text, added: false };
  return { text: `${text.trimEnd()} ${tag}`, added: true };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
