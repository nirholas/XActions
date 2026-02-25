/**
 * XActions RSS & Webhook Content Ingestion
 * Monitor RSS feeds and accept webhooks to auto-create tweets.
 *
 * Kills: Hypefury (auto-plug, RSS), Taplio
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.xactions');
const FEEDS_FILE = path.join(CONFIG_DIR, 'rss-feeds.json');
const SEEN_FILE = path.join(CONFIG_DIR, 'rss-seen.json');
const DRAFTS_FILE = path.join(CONFIG_DIR, 'drafts.json');

// ============================================================================
// Feed Management
// ============================================================================

/**
 * Add an RSS feed to monitor
 */
export async function addFeed(config) {
  const { name, url, template = '📰 {title}\n\n{link}', autoPost = false, checkInterval = 30, filters = {} } = config;

  if (!name || !url) throw new Error('Feed requires: name, url');

  const feeds = await loadFeeds();
  feeds[name] = { name, url, template, autoPost, checkInterval, filters, lastChecked: null, itemCount: 0, createdAt: new Date().toISOString() };
  await saveFeeds(feeds);

  console.log(`✅ Feed "${name}" added: ${url}`);
  return feeds[name];
}

/**
 * Remove an RSS feed
 */
export async function removeFeed(name) {
  const feeds = await loadFeeds();
  if (!feeds[name]) return { error: `Feed "${name}" not found` };
  delete feeds[name];
  await saveFeeds(feeds);
  return { status: 'removed', name };
}

/**
 * List all feeds
 */
export async function listFeeds() {
  const feeds = await loadFeeds();
  return Object.values(feeds);
}

/**
 * Check a single feed for new items
 */
export async function checkFeed(name) {
  const feeds = await loadFeeds();
  const feed = feeds[name];
  if (!feed) return { error: `Feed "${name}" not found` };

  console.log(`🔍 Checking feed "${name}": ${feed.url}`);

  try {
    const response = await fetch(feed.url);
    const xml = await response.text();
    const items = parseRSS(xml);
    const seen = await loadSeen();
    const seenKeys = seen[name] || [];
    const seenSet = new Set(seenKeys);

    let newItems = 0;
    const drafts = await loadDrafts();

    for (const item of items) {
      const key = item.guid || item.link || item.title;
      if (seenSet.has(key)) continue;

      // Apply filters
      if (feed.filters) {
        if (feed.filters.titleContains && !item.title.toLowerCase().includes(feed.filters.titleContains.toLowerCase())) continue;
        if (feed.filters.titleExcludes && item.title.toLowerCase().includes(feed.filters.titleExcludes.toLowerCase())) continue;
        if (feed.filters.minLength && item.title.length < feed.filters.minLength) continue;
      }

      // Format tweet from template
      const tweetText = formatTemplate(feed.template, item);

      if (feed.autoPost) {
        try {
          const localTools = await import('../mcp/local-tools.js');
          if (localTools.x_post_tweet) {
            await localTools.x_post_tweet({ text: tweetText });
            console.log(`✅ Auto-posted: "${tweetText.slice(0, 60)}..."`);
          }
        } catch (error) {
          console.error(`❌ Auto-post failed: ${error.message}`);
          // Save as draft instead
          drafts.push({ id: Date.now().toString(), text: tweetText, source: `rss:${name}`, createdAt: new Date().toISOString() });
        }
      } else {
        drafts.push({ id: Date.now().toString() + Math.random().toString(36).slice(2, 6), text: tweetText, source: `rss:${name}`, title: item.title, link: item.link, createdAt: new Date().toISOString() });
      }

      seenSet.add(key);
      newItems++;

      // Small delay between processing
      await new Promise(r => setTimeout(r, 100));
    }

    // Update seen
    seen[name] = [...seenSet];
    await saveSeen(seen);
    await saveDrafts(drafts);

    // Update feed metadata
    feed.lastChecked = new Date().toISOString();
    feed.itemCount = (feed.itemCount || 0) + newItems;
    feeds[name] = feed;
    await saveFeeds(feeds);

    console.log(`📰 Feed "${name}": ${newItems} new items, ${items.length} total`);
    return { name, newItems, totalItems: items.length };
  } catch (error) {
    console.error(`❌ Feed check failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Check all feeds
 */
export async function checkAllFeeds() {
  const feeds = await loadFeeds();
  const results = [];
  for (const name of Object.keys(feeds)) {
    results.push(await checkFeed(name));
  }
  return results;
}

// ============================================================================
// Draft Queue
// ============================================================================

/**
 * Get all drafts
 */
export async function getDrafts() {
  return await loadDrafts();
}

/**
 * Post a specific draft
 */
export async function postDraft(id) {
  const drafts = await loadDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx === -1) return { error: `Draft "${id}" not found` };

  const draft = drafts[idx];

  try {
    const localTools = await import('../mcp/local-tools.js');
    if (localTools.x_post_tweet) {
      await localTools.x_post_tweet({ text: draft.text });
    }
    drafts.splice(idx, 1);
    await saveDrafts(drafts);
    console.log(`✅ Draft posted: "${draft.text.slice(0, 60)}..."`);
    return { status: 'posted', text: draft.text };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Delete a draft
 */
export async function deleteDraft(id) {
  const drafts = await loadDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx === -1) return { error: `Draft "${id}" not found` };
  drafts.splice(idx, 1);
  await saveDrafts(drafts);
  return { status: 'deleted', id };
}

/**
 * Post all drafts with delay
 */
export async function postAllDrafts(delayMs = 3000) {
  const drafts = await loadDrafts();
  if (drafts.length === 0) return { status: 'empty', message: 'No drafts to post' };

  let posted = 0;
  const failed = [];

  for (const draft of [...drafts]) {
    try {
      const localTools = await import('../mcp/local-tools.js');
      if (localTools.x_post_tweet) {
        await localTools.x_post_tweet({ text: draft.text });
      }
      posted++;
      console.log(`✅ [${posted}/${drafts.length}] Posted: "${draft.text.slice(0, 50)}..."`);
    } catch (error) {
      failed.push({ id: draft.id, error: error.message });
    }
    if (drafts.indexOf(draft) < drafts.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // Remove posted drafts, keep failed ones
  const failedIds = new Set(failed.map(f => f.id));
  const remaining = drafts.filter(d => failedIds.has(d.id));
  await saveDrafts(remaining);

  return { posted, failed: failed.length, total: drafts.length };
}

// ============================================================================
// RSS Parser (Lightweight, no dependencies)
// ============================================================================

function parseRSS(xml) {
  const items = [];

  // Try RSS 2.0 format first
  const rssItems = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const itemXml of rssItems) {
    items.push({
      title: extractTag(itemXml, 'title'),
      link: extractTag(itemXml, 'link'),
      description: extractTag(itemXml, 'description'),
      author: extractTag(itemXml, 'author') || extractTag(itemXml, 'dc:creator'),
      pubDate: extractTag(itemXml, 'pubDate'),
      guid: extractTag(itemXml, 'guid'),
      categories: extractAllTags(itemXml, 'category'),
    });
  }

  // Try Atom format
  if (items.length === 0) {
    const entries = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
    for (const entryXml of entries) {
      const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i);
      items.push({
        title: extractTag(entryXml, 'title'),
        link: linkMatch ? linkMatch[1] : extractTag(entryXml, 'link'),
        description: extractTag(entryXml, 'summary') || extractTag(entryXml, 'content'),
        author: extractTag(entryXml, 'name'),
        pubDate: extractTag(entryXml, 'published') || extractTag(entryXml, 'updated'),
        guid: extractTag(entryXml, 'id'),
        categories: extractAllTags(entryXml, 'category'),
      });
    }
  }

  return items;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
    || xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function extractAllTags(xml, tag) {
  const matches = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'gi')) || [];
  return matches.map(m => {
    const inner = m.match(/>([^<]*)</);
    return inner ? inner[1].trim() : '';
  }).filter(Boolean);
}

function formatTemplate(template, item) {
  let text = template
    .replace(/\{title\}/g, item.title || '')
    .replace(/\{link\}/g, item.link || '')
    .replace(/\{description\}/g, item.description || '')
    .replace(/\{author\}/g, item.author || '')
    .replace(/\{pubDate\}/g, item.pubDate || '')
    .replace(/\{categories\}/g, (item.categories || []).join(', '));

  // Ensure within 280 chars — truncate description, keep link
  if (text.length > 280) {
    const linkPart = item.link ? `\n${item.link}` : '';
    const maxTitle = 280 - linkPart.length - 5;
    const titleTruncated = (item.title || '').slice(0, maxTitle) + '...';
    text = `📰 ${titleTruncated}${linkPart}`;
  }

  return text;
}

// ============================================================================
// File Helpers
// ============================================================================

async function loadFeeds() {
  try { return JSON.parse(await fsp.readFile(FEEDS_FILE, 'utf-8')); } catch { return {}; }
}

async function saveFeeds(feeds) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  await fsp.writeFile(FEEDS_FILE, JSON.stringify(feeds, null, 2));
}

async function loadSeen() {
  try { return JSON.parse(await fsp.readFile(SEEN_FILE, 'utf-8')); } catch { return {}; }
}

async function saveSeen(seen) {
  await fsp.writeFile(SEEN_FILE, JSON.stringify(seen, null, 2));
}

async function loadDrafts() {
  try { return JSON.parse(await fsp.readFile(DRAFTS_FILE, 'utf-8')); } catch { return []; }
}

async function saveDrafts(drafts) {
  await fsp.writeFile(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
}

// by nichxbt
