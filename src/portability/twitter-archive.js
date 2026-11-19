// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Twitter Archive Importer
 * Reads the official X/Twitter data export (the GDPR archive) from either the
 * downloaded `.zip` or an already-extracted folder, and normalises it into the
 * record shapes the rest of the portability module (exporter, archive viewer,
 * differ, migrate) already understands.
 *
 * Archive format: every `data/<name>.js` file is a JS assignment wrapping JSON,
 *   window.YTD.<name>.part0 = [ ... ]
 * Large sections are split across `<name>.js`, `<name>-part1.js`, ... with a
 * matching `partN` suffix. Media lives under `data/tweets_media/` and friends.
 *
 * Zips are streamed entry by entry with yauzl, so a multi-GB archive never has
 * to fit in memory: only the one section file currently being parsed does.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import { toCSV, tweetsToMarkdown, profileToMarkdown } from './exporter.js';
import { generateArchiveHTML } from './archive-viewer.js';

export const ARCHIVE_SOURCE = 'twitterArchive';

// ============================================================================
// Section registry
// ============================================================================

/**
 * Every section we understand, keyed by the name used in `options.sections`
 * and on the result object. `files` are the `data/<file>.js` base names that
 * feed the section (several archive generations used different names).
 */
export const ARCHIVE_SECTIONS = {
  account: { files: ['account'] },
  profile: { files: ['profile'] },
  tweets: { files: ['tweets', 'tweet'] },
  likes: { files: ['like'] },
  following: { files: ['following'] },
  followers: { files: ['follower'] },
  blocks: { files: ['block'] },
  mutes: { files: ['mute'] },
  dms: { files: ['direct-messages', 'direct-messages-group'] },
  lists: { files: ['lists-created', 'lists-member', 'lists-subscribed'] },
  bookmarks: { files: ['bookmarks'] },
  grok: { files: ['grok-chat-item'] },
  media: { files: [] },
};

export const ALL_SECTIONS = Object.keys(ARCHIVE_SECTIONS);

const MEDIA_DIRS = ['tweets_media', 'tweet_media', 'direct_messages_media', 'direct_messages_group_media', 'profile_media'];

const FILE_TO_SECTION = new Map();
for (const [section, def] of Object.entries(ARCHIVE_SECTIONS)) {
  for (const file of def.files) FILE_TO_SECTION.set(file, section);
}

// ============================================================================
// Low-level parsing
// ============================================================================

const PREFIX_RE = /^\uFEFF?\s*window\.YTD\.[\w-]+\.part(\d+)\s*=\s*/;

/**
 * Strip the `window.YTD.<name>.partN = ` prefix and parse the JSON body.
 * Returns `{ part, records }`.
 */
export function parseArchiveFile(source) {
  const match = PREFIX_RE.exec(source);
  if (!match) {
    throw new Error('Not a Twitter archive data file: missing "window.YTD.<name>.partN =" prefix');
  }
  let body = source.slice(match[0].length).trim();
  if (body.endsWith(';')) body = body.slice(0, -1);
  const records = JSON.parse(body);
  return { part: Number(match[1]), records: Array.isArray(records) ? records : [records] };
}

/**
 * Match `data/<base>[-partN].js` anywhere in an entry path (zips are sometimes
 * rooted one folder deep). Returns `{ base, part }` or null.
 */
function classifyDataFile(entryPath) {
  const m = /(?:^|\/)data\/([a-z0-9_-]+?)(?:[-.]part(\d+))?\.js$/i.exec(entryPath);
  if (!m) return null;
  return { base: m[1], part: m[2] ? Number(m[2]) : 0 };
}

function classifyMediaFile(entryPath) {
  const m = /(?:^|\/)data\/([a-z_]+_media)\/([^/]+)$/i.exec(entryPath);
  if (!m || !MEDIA_DIRS.includes(m[1])) return null;
  return { dir: m[1], file: m[2] };
}

// ============================================================================
// Normalisers
// ============================================================================

function toISO(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function normaliseMedia(tweet) {
  const entities = tweet.extended_entities?.media || tweet.entities?.media || [];
  return entities.map((m) => {
    const variants = m.video_info?.variants || [];
    const best = variants
      .filter((v) => v.content_type === 'video/mp4')
      .sort((a, b) => toInt(b.bitrate) - toInt(a.bitrate))[0];
    return {
      id: m.id_str || m.id || null,
      type: m.type || 'photo',
      url: best?.url || m.media_url_https || m.media_url || null,
      previewUrl: m.media_url_https || m.media_url || null,
      expandedUrl: m.expanded_url || null,
    };
  });
}

/**
 * Archive tweet record -> normalised tweet.
 * Keeps the flat `timestamp/likes/retweets/url` fields the exporter, archive
 * viewer and differ already read, and adds the archive-only detail on top.
 */
export function normaliseTweet(record, username) {
  const t = record.tweet || record;
  const id = t.id_str || t.id || null;
  const text = t.full_text ?? t.text ?? '';
  const createdAt = toISO(t.created_at);
  const inReplyTo = t.in_reply_to_status_id_str || t.in_reply_to_user_id_str
    ? {
        tweetId: t.in_reply_to_status_id_str || null,
        userId: t.in_reply_to_user_id_str || null,
        username: t.in_reply_to_screen_name || null,
      }
    : null;
  const likes = toInt(t.favorite_count);
  const retweets = toInt(t.retweet_count);
  const handle = username || 'i';
  return {
    id,
    text,
    createdAt,
    timestamp: createdAt,
    url: id ? `https://x.com/${handle}/status/${id}` : null,
    inReplyTo,
    retweeted: Boolean(t.retweeted) || /^RT @\w+:/.test(text),
    media: normaliseMedia(t),
    metrics: { likes, retweets },
    likes,
    retweets,
    hashtags: (t.entities?.hashtags || []).map((h) => h.text),
    mentions: (t.entities?.user_mentions || []).map((u) => ({
      id: u.id_str || u.id || null,
      username: u.screen_name || null,
      name: u.name || null,
    })),
    links: (t.entities?.urls || []).map((u) => u.expanded_url || u.url).filter(Boolean),
    lang: t.lang || null,
    source: t.source ? t.source.replace(/<[^>]+>/g, '') : null,
  };
}

function normaliseLike(record) {
  const l = record.like || record;
  return {
    id: l.tweetId || null,
    text: l.fullText || '',
    url: l.expandedUrl || (l.tweetId ? `https://x.com/i/web/status/${l.tweetId}` : null),
  };
}

function normaliseBookmark(record) {
  return normaliseLike(record.bookmark || record);
}

function normaliseGrokItem(record) {
  const g = record.grokChatItem || record;
  return {
    chatId: g.chatId ?? g.conversationId ?? null,
    sender: g.sender ?? null,
    message: g.message ?? g.text ?? '',
    createdAt: g.createdAt ?? null,
  };
}

function normaliseRelation(record) {
  const r = record.following || record.follower || record.blocking || record.muting || record;
  return { id: r.accountId || null, url: r.userLink || (r.accountId ? `https://x.com/intent/user?user_id=${r.accountId}` : null) };
}

function normaliseAccount(record) {
  const a = record.account || record;
  return {
    id: a.accountId || null,
    username: a.username || null,
    name: a.accountDisplayName || null,
    email: a.email || null,
    createdAt: toISO(a.createdAt),
    createdVia: a.createdVia || null,
  };
}

function normaliseProfile(record) {
  const p = record.profile || record;
  return {
    bio: p.description?.bio || '',
    website: p.description?.website || null,
    location: p.description?.location || null,
    avatarUrl: p.avatarMediaUrl || null,
    headerUrl: p.headerMediaUrl || null,
  };
}

function normaliseList(record, kind) {
  const l = record.userListInfo || record;
  return { kind, name: l.name || null, url: l.url || null, description: l.description || null };
}

function normaliseDm(record, kind) {
  const c = record.dmConversation || record;
  const messages = [];
  const participants = new Set();
  const events = [];
  for (const m of c.messages || []) {
    if (m.messageCreate) {
      const mc = m.messageCreate;
      participants.add(mc.senderId);
      if (mc.recipientId) participants.add(mc.recipientId);
      messages.push({
        id: mc.id || null,
        senderId: mc.senderId || null,
        recipientId: mc.recipientId || null,
        text: mc.text || '',
        createdAt: toISO(mc.createdAt),
        media: (mc.mediaUrls || []).slice(),
        links: (mc.urls || []).map((u) => u.expanded || u.url).filter(Boolean),
        reactions: (mc.reactions || []).map((r) => ({ senderId: r.senderId, reaction: r.reactionKey, createdAt: toISO(r.createdAt) })),
      });
    } else {
      const [type, body] = Object.entries(m)[0] || [];
      if (type) events.push({ type, ...body, createdAt: toISO(body?.createdAt) });
      for (const id of body?.userIds || []) participants.add(id);
      if (body?.initiatingUserId) participants.add(body.initiatingUserId);
    }
  }
  messages.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  return {
    id: c.conversationId || null,
    kind,
    participants: [...participants].filter(Boolean),
    messageCount: messages.length,
    firstMessageAt: messages[0]?.createdAt || null,
    lastMessageAt: messages[messages.length - 1]?.createdAt || null,
    messages,
    events,
  };
}

function mediaRef(dir, file, size) {
  const tweetMatch = /^(\d+)-/.exec(file);
  return {
    dir,
    file,
    path: `data/${dir}/${file}`,
    size: size ?? null,
    tweetId: tweetMatch ? tweetMatch[1] : null,
    kind: dir.startsWith('direct_messages') ? 'dm' : dir === 'profile_media' ? 'profile' : 'tweet',
  };
}

// ============================================================================
// Result assembly
// ============================================================================

function emptyResult(archivePath) {
  return {
    source: ARCHIVE_SOURCE,
    archivePath,
    importedAt: new Date().toISOString(),
    account: null,
    profile: null,
    tweets: [],
    likes: [],
    following: [],
    followers: [],
    blocks: [],
    mutes: [],
    dms: [],
    lists: [],
    bookmarks: [],
    grok: [],
    media: [],
    sections: { present: [], missing: [] },
    files: [],
  };
}

/** Collects raw parts per file base, then folds them into the result in order. */
class Assembler {
  constructor(result, sections, onProgress) {
    this.result = result;
    this.sections = sections;
    this.onProgress = onProgress;
    this.parts = new Map();
  }

  wants(base) {
    const section = FILE_TO_SECTION.get(base);
    return section ? this.sections.includes(section) : false;
  }

  addPart(base, part, source, file) {
    const parsed = parseArchiveFile(source);
    const list = this.parts.get(base) || [];
    list.push({ part: parsed.part ?? part, records: parsed.records });
    this.parts.set(base, list);
    this.result.files.push({ file, section: FILE_TO_SECTION.get(base), part: parsed.part, records: parsed.records.length });
    this.onProgress?.({ phase: FILE_TO_SECTION.get(base), file, records: parsed.records.length });
  }

  addMedia(dir, file, size) {
    if (!this.sections.includes('media')) return;
    this.result.media.push(mediaRef(dir, file, size));
  }

  records(base) {
    const list = this.parts.get(base);
    if (!list) return null;
    return list.sort((a, b) => a.part - b.part).flatMap((p) => p.records);
  }

  finish() {
    const r = this.result;
    const present = new Set();
    const seen = (section) => present.add(section);

    const account = this.records('account');
    if (account) { r.account = normaliseAccount(account[0] || {}); seen('account'); }
    const profile = this.records('profile');
    if (profile) { r.profile = normaliseProfile(profile[0] || {}); seen('profile'); }
    if (r.account || r.profile) {
      r.profile = { username: r.account?.username || null, name: r.account?.name || null, ...(r.profile || {}) };
    }

    const username = r.account?.username;
    const tweets = this.records('tweets') || this.records('tweet');
    if (tweets) {
      r.tweets = tweets.map((t) => normaliseTweet(t, username));
      r.tweets.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      seen('tweets');
    }

    const likes = this.records('like');
    if (likes) { r.likes = likes.map(normaliseLike); seen('likes'); }

    const rel = [['following', 'following'], ['follower', 'followers'], ['block', 'blocks'], ['mute', 'mutes']];
    for (const [base, section] of rel) {
      const list = this.records(base);
      if (list) { r[section] = list.map(normaliseRelation); seen(section); }
    }

    const dms = this.records('direct-messages');
    const groupDms = this.records('direct-messages-group');
    if (dms || groupDms) {
      r.dms = [
        ...(dms || []).map((c) => normaliseDm(c, 'direct')),
        ...(groupDms || []).map((c) => normaliseDm(c, 'group')),
      ].sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
      seen('dms');
    }

    const listKinds = [['lists-created', 'created'], ['lists-member', 'member'], ['lists-subscribed', 'subscribed']];
    for (const [base, kind] of listKinds) {
      const list = this.records(base);
      if (list) { r.lists.push(...list.map((l) => normaliseList(l, kind))); seen('lists'); }
    }

    const bookmarks = this.records('bookmarks');
    if (bookmarks) { r.bookmarks = bookmarks.map(normaliseBookmark); seen('bookmarks'); }

    const grok = this.records('grok-chat-item');
    if (grok) {
      r.grok = grok.map(normaliseGrokItem).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      seen('grok');
    }

    if (r.media.length) {
      const byTweet = new Map();
      for (const m of r.media) {
        if (!m.tweetId) continue;
        const list = byTweet.get(m.tweetId) || [];
        list.push(m);
        byTweet.set(m.tweetId, list);
      }
      for (const t of r.tweets) {
        const files = byTweet.get(t.id);
        if (!files) continue;
        t.media = t.media.length
          ? t.media.map((m, i) => ({ ...m, file: files[i]?.path || files[0].path }))
          : files.map((f) => ({ id: null, type: 'photo', url: null, previewUrl: null, expandedUrl: null, file: f.path }));
      }
      seen('media');
    }

    r.sections.present = this.sections.filter((s) => present.has(s));
    r.sections.missing = this.sections.filter((s) => !present.has(s));
    return r;
  }
}

// ============================================================================
// Readers: folder and zip
// ============================================================================

async function walk(dir, prefix = '') {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else out.push(rel);
  }
  return out;
}

async function readFolder(root, assembler, onProgress) {
  const files = await walk(root);
  let completed = 0;
  for (const rel of files) {
    completed++;
    const data = classifyDataFile(rel);
    if (data && assembler.wants(data.base)) {
      const source = await fs.readFile(path.join(root, rel), 'utf-8');
      assembler.addPart(data.base, data.part, source, rel);
    } else {
      const media = classifyMediaFile(rel);
      if (media) {
        const stat = await fs.stat(path.join(root, rel));
        assembler.addMedia(media.dir, media.file, stat.size);
      }
    }
    onProgress?.({ phase: 'scan', completed, total: files.length, file: rel });
  }
}

function readEntryText(zipfile, entry) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err) return reject(err);
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  });
}

async function readZip(zipPath, assembler, onProgress) {
  const zipfile = await yauzl.openPromise(zipPath, { lazyEntries: true });
  const total = zipfile.entryCount;
  let completed = 0;
  await new Promise((resolve, reject) => {
    zipfile.on('error', reject);
    zipfile.on('end', resolve);
    zipfile.on('entry', (entry) => {
      completed++;
      const name = entry.fileName;
      const done = () => {
        onProgress?.({ phase: 'scan', completed, total, file: name });
        zipfile.readEntry();
      };
      if (name.endsWith('/')) return done();
      const data = classifyDataFile(name);
      if (data && assembler.wants(data.base)) {
        readEntryText(zipfile, entry)
          .then((source) => { assembler.addPart(data.base, data.part, source, name); done(); })
          .catch(reject);
        return;
      }
      const media = classifyMediaFile(name);
      if (media) assembler.addMedia(media.dir, media.file, entry.uncompressedSize);
      done();
    });
    zipfile.readEntry();
  });
  zipfile.close();
}

async function isZip(archivePath) {
  const stat = await fs.stat(archivePath);
  if (stat.isDirectory()) return false;
  const fh = await fs.open(archivePath, 'r');
  try {
    const { buffer } = await fh.read(Buffer.alloc(4), 0, 4, 0);
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  } finally {
    await fh.close();
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Import an official X/Twitter data export.
 *
 * @param {string} archivePath - Path to the downloaded `.zip` or the extracted folder
 * @param {object} [options]
 * @param {string[]} [options.sections] - Subset of ALL_SECTIONS to load (default: all)
 * @param {function} [options.onProgress] - Called with `{ phase, file, ... }` as entries are scanned and parsed
 * @returns {Promise<object>} Normalised archive: account, profile, tweets, likes, following, followers, blocks, mutes, dms, lists, bookmarks, grok, media
 */
export async function importTwitterArchive(archivePath, options = {}) {
  const { sections = ALL_SECTIONS, onProgress } = options;
  const unknown = sections.filter((s) => !ALL_SECTIONS.includes(s));
  if (unknown.length) {
    throw new Error(`Unknown archive section(s): ${unknown.join(', ')}. Valid: ${ALL_SECTIONS.join(', ')}`);
  }
  try {
    await fs.access(archivePath);
  } catch {
    throw new Error(`Archive not found: ${archivePath}`);
  }

  const result = emptyResult(path.resolve(archivePath));
  const assembler = new Assembler(result, sections, onProgress);

  if (await isZip(archivePath)) {
    result.format = 'zip';
    await readZip(archivePath, assembler, onProgress);
  } else {
    const stat = await fs.stat(archivePath);
    if (!stat.isDirectory()) throw new Error(`Not a zip or a folder: ${archivePath}`);
    result.format = 'folder';
    await readFolder(archivePath, assembler, onProgress);
  }

  assembler.finish();
  if (result.files.length === 0 && result.media.length === 0) {
    throw new Error(`No Twitter archive data found in ${archivePath} (expected data/*.js files)`);
  }
  return result;
}

/**
 * Open a media file referenced by the import (`result.media[n]` or `tweet.media[n].file`)
 * as a readable stream, from either the zip or the folder.
 */
export async function openArchiveMedia(result, mediaPath) {
  if (result.format === 'folder') {
    return createReadStream(path.join(result.archivePath, mediaPath));
  }
  const zipfile = await yauzl.openPromise(result.archivePath, { lazyEntries: true });
  return new Promise((resolve, reject) => {
    zipfile.on('error', reject);
    zipfile.on('end', () => { zipfile.close(); reject(new Error(`Media not found in archive: ${mediaPath}`)); });
    zipfile.on('entry', (entry) => {
      if (entry.fileName === mediaPath || entry.fileName.endsWith(`/${mediaPath}`)) {
        zipfile.openReadStream(entry, (err, stream) => {
          if (err) return reject(err);
          stream.on('end', () => zipfile.close());
          resolve(stream);
        });
        return;
      }
      zipfile.readEntry();
    });
    zipfile.readEntry();
  });
}

// ============================================================================
// Summary
// ============================================================================

function topN(counter, n) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

/**
 * Summarise an imported archive: counts, date range, per-year activity,
 * top hashtags and mentions, busiest year, reply and retweet share.
 */
export function summarizeArchive(result, { top = 10 } = {}) {
  const tweets = result.tweets || [];
  const dated = tweets.filter((t) => t.createdAt).map((t) => t.createdAt).sort();
  const hashtags = new Map();
  const mentions = new Map();
  const perYear = {};
  let replies = 0;
  let retweets = 0;
  let withMedia = 0;
  let likesReceived = 0;
  let retweetsReceived = 0;

  for (const t of tweets) {
    if (t.inReplyTo) replies++;
    if (t.retweeted) retweets++;
    if (t.media?.length) withMedia++;
    likesReceived += t.likes || 0;
    retweetsReceived += t.retweets || 0;
    for (const h of t.hashtags || []) {
      const key = h.toLowerCase();
      hashtags.set(key, (hashtags.get(key) || 0) + 1);
    }
    for (const m of t.mentions || []) {
      if (!m.username) continue;
      const key = m.username.toLowerCase();
      mentions.set(key, (mentions.get(key) || 0) + 1);
    }
    if (t.createdAt) {
      const year = t.createdAt.slice(0, 4);
      perYear[year] = (perYear[year] || 0) + 1;
    }
  }

  const busiest = Object.entries(perYear).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const dmMessages = (result.dms || []).reduce((n, c) => n + (c.messageCount || 0), 0);

  return {
    source: result.source,
    archivePath: result.archivePath,
    format: result.format,
    username: result.account?.username || result.profile?.username || null,
    accountCreatedAt: result.account?.createdAt || null,
    counts: {
      tweets: tweets.length,
      replies,
      retweets,
      original: tweets.length - replies - retweets,
      withMedia,
      likes: (result.likes || []).length,
      following: (result.following || []).length,
      followers: (result.followers || []).length,
      blocks: (result.blocks || []).length,
      mutes: (result.mutes || []).length,
      dmConversations: (result.dms || []).length,
      dmMessages,
      lists: (result.lists || []).length,
      mediaFiles: (result.media || []).length,
    },
    engagement: { likesReceived, retweetsReceived },
    dateRange: dated.length ? { first: dated[0], last: dated[dated.length - 1] } : null,
    tweetsPerYear: perYear,
    busiestYear: busiest ? { year: busiest[0], tweets: busiest[1] } : null,
    topHashtags: topN(hashtags, top),
    topMentions: topN(mentions, top),
    sections: result.sections,
  };
}

/**
 * Render a summary as a plain-text report for the terminal.
 */
export function formatArchiveReport(summary) {
  const c = summary.counts;
  const lines = [];
  lines.push(`X archive for @${summary.username || 'unknown'} (${summary.format})`);
  if (summary.accountCreatedAt) lines.push(`Account created: ${summary.accountCreatedAt.slice(0, 10)}`);
  if (summary.dateRange) lines.push(`Tweets span:     ${summary.dateRange.first.slice(0, 10)} to ${summary.dateRange.last.slice(0, 10)}`);
  lines.push('');
  lines.push(`Tweets       ${c.tweets} (${c.original} original, ${c.replies} replies, ${c.retweets} retweets, ${c.withMedia} with media)`);
  lines.push(`Likes        ${c.likes}`);
  lines.push(`Following    ${c.following}`);
  lines.push(`Followers    ${c.followers}`);
  lines.push(`Blocks       ${c.blocks}`);
  lines.push(`Mutes        ${c.mutes}`);
  lines.push(`DMs          ${c.dmMessages} messages in ${c.dmConversations} conversations`);
  lines.push(`Lists        ${c.lists}`);
  lines.push(`Media files  ${c.mediaFiles}`);
  lines.push(`Engagement   ${summary.engagement.likesReceived} likes, ${summary.engagement.retweetsReceived} retweets received`);
  if (summary.busiestYear) lines.push(`Busiest year ${summary.busiestYear.year} (${summary.busiestYear.tweets} tweets)`);
  const years = Object.keys(summary.tweetsPerYear).sort();
  if (years.length) {
    lines.push('');
    lines.push('Tweets per year');
    for (const y of years) lines.push(`  ${y}  ${summary.tweetsPerYear[y]}`);
  }
  if (summary.topHashtags.length) {
    lines.push('');
    lines.push('Top hashtags');
    for (const h of summary.topHashtags) lines.push(`  #${h.value}  ${h.count}`);
  }
  if (summary.topMentions.length) {
    lines.push('');
    lines.push('Top mentions');
    for (const m of summary.topMentions) lines.push(`  @${m.value}  ${m.count}`);
  }
  if (summary.sections?.missing?.length) {
    lines.push('');
    lines.push(`Not in this archive: ${summary.sections.missing.join(', ')}`);
  }
  return lines.join('\n');
}

// ============================================================================
// Export: write the import in the same layout exportAccount produces
// ============================================================================

function idsToMarkdown(rows, title) {
  let md = `# ${title}\n\nImported from X archive via XActions\n\nTotal: ${rows.length}\n\n`;
  md += '| Account id | Link |\n|------------|------|\n';
  for (const r of rows) md += `| ${r.id || ''} | ${r.url || ''} |\n`;
  return md;
}

function dmsToMarkdown(dms) {
  let md = `# Direct messages\n\nImported from X archive via XActions\n\n${dms.length} conversations\n\n---\n\n`;
  for (const c of dms) {
    md += `## Conversation ${c.id} (${c.kind}, ${c.messageCount} messages)\n\n`;
    md += `Participants: ${c.participants.join(', ')}\n\n`;
    for (const m of c.messages) md += `- **${m.createdAt || ''}** ${m.senderId}: ${m.text}\n`;
    md += '\n---\n\n';
  }
  return md;
}

function listsToMarkdown(lists) {
  let md = `# Lists\n\nImported from X archive via XActions\n\n| Kind | Name | URL |\n|------|------|-----|\n`;
  for (const l of lists) md += `| ${l.kind} | ${l.name || ''} | ${l.url || ''} |\n`;
  return md;
}

function flattenDm(c) {
  return c.messages.map((m) => ({ conversationId: c.id, kind: c.kind, ...m }));
}

/**
 * Write an imported archive to disk in the layout `exportAccount` produces
 * (`profile.json`, `tweets.json`, `following.json`, ...), so `migrate`,
 * `diffExports` and the HTML archive viewer all work on it unchanged.
 *
 * @param {object} result - Return value of importTwitterArchive
 * @param {object} [options]
 * @param {string} [options.outputDir] - Default: exports/<username>_archive_<YYYY-MM-DD>
 * @param {string[]} [options.formats=['json','csv','md','html']]
 * @returns {Promise<object>} `{ dir, files, counts }`
 */
export async function exportArchive(result, options = {}) {
  const { formats = ['json', 'csv', 'md', 'html'] } = options;
  const username = result.account?.username || result.profile?.username || 'archive';
  const date = new Date().toISOString().slice(0, 10);
  const dir = options.outputDir || path.join(process.cwd(), 'exports', `${username}_archive_${date}`);
  await fs.mkdir(dir, { recursive: true });

  const profile = {
    username,
    name: result.account?.name || null,
    bio: result.profile?.bio || '',
    location: result.profile?.location || null,
    website: result.profile?.website || null,
    joined: result.account?.createdAt || null,
    followers: result.followers.length,
    following: result.following.length,
    avatarUrl: result.profile?.avatarUrl || null,
    headerUrl: result.profile?.headerUrl || null,
    accountId: result.account?.id || null,
  };

  const tables = {
    profile: { data: profile, md: () => profileToMarkdown(profile) },
    tweets: { data: result.tweets, md: () => tweetsToMarkdown(result.tweets, username) },
    likes: { data: result.likes, md: () => tweetsToMarkdown(result.likes, `${username}'s Likes`) },
    following: { data: result.following, md: () => idsToMarkdown(result.following, `@${username} Following`) },
    followers: { data: result.followers, md: () => idsToMarkdown(result.followers, `Followers of @${username}`) },
    blocks: { data: result.blocks, md: () => idsToMarkdown(result.blocks, 'Blocked accounts') },
    mutes: { data: result.mutes, md: () => idsToMarkdown(result.mutes, 'Muted accounts') },
    dms: { data: result.dms, csv: () => result.dms.flatMap(flattenDm), md: () => dmsToMarkdown(result.dms) },
    lists: { data: result.lists, md: () => listsToMarkdown(result.lists) },
    bookmarks: { data: result.bookmarks || [], md: () => tweetsToMarkdown(result.bookmarks || [], `${username}'s Bookmarks`) },
    grok: { data: result.grok || [] },
    media: { data: result.media },
  };

  const files = [];
  const counts = {};
  const write = async (name, content) => {
    await fs.writeFile(path.join(dir, name), content);
    files.push(name);
  };

  for (const [name, t] of Object.entries(tables)) {
    const rows = Array.isArray(t.data) ? t.data : [t.data];
    counts[name] = Array.isArray(t.data) ? t.data.length : 1;
    if (formats.includes('json')) await write(`${name}.json`, JSON.stringify(t.data, null, 2));
    if (formats.includes('csv') && Array.isArray(t.data) && rows.length) {
      await write(`${name}.csv`, toCSV(t.csv ? t.csv() : rows));
    }
    if (formats.includes('md') && t.md) await write(`${name}.md`, t.md());
  }

  if (formats.includes('html')) {
    await write('index.html', generateArchiveHTML({
      profile,
      tweets: result.tweets,
      followers: result.followers,
      following: result.following,
      bookmarks: result.bookmarks || [],
      likes: result.likes,
    }));
  }

  const summary = summarizeArchive(result);
  await write('summary.json', JSON.stringify({ ...summary, dir, files }, null, 2));
  return { dir, files, counts };
}

export default importTwitterArchive;
