// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Token-efficient output for the read commands.
 *
 * An agent that calls `xactions tweets nasa` pays for every byte that comes
 * back. The default JSON carries avatars, entity offsets, nested quote tweets
 * and a dozen booleans it will never look at, and the pretty output carries
 * ANSI colour codes and spinner frames it cannot parse. `--compact` prints one
 * record per line as tab-separated `key=value` pairs, essential fields only,
 * and `--fields` narrows that further to exactly the columns the caller asked
 * for. No colours, no spinners, no box drawing.
 *
 * The same module owns the spinner factory so that `--json` and `--compact`
 * stay silent when stdout is a pipe: ora writes to stderr and would otherwise
 * keep animating into a log file while the data went to the pipe.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import ora from 'ora';

/**
 * The canonical flat field names, in the order they print when no `--fields`
 * is given. Every record kind is a subset of this list, so a caller can learn
 * the vocabulary once and use it on any command.
 */
export const CANONICAL_FIELDS = [
  'id',
  'username',
  'name',
  'date',
  'likes',
  'retweets',
  'replies',
  'views',
  'followers',
  'following',
  'tweets',
  'verified',
  'location',
  'website',
  'type',
  'url',
  'bio',
  'text',
];

/** Default columns per record kind. Text always goes last so a line stays scannable. */
export const DEFAULT_FIELDS = {
  tweet: ['id', 'username', 'date', 'likes', 'retweets', 'replies', 'views', 'text'],
  profile: ['id', 'username', 'name', 'followers', 'following', 'tweets', 'verified', 'bio'],
  user: ['id', 'username', 'name', 'followers', 'verified', 'bio'],
  media: ['type', 'url', 'tweetUrl'],
  report: [
    'username',
    'followers',
    'following',
    'postsPerDay',
    'engagementRate',
    'medianEngagement',
    'mediaShare',
    'bestHourUTC',
    'bestWeekday',
  ],
};

/**
 * Parse a `--fields` value into a list of field names.
 *
 * @param {string|string[]|undefined} value - `"id,text,likes"`, an array, or nothing
 * @returns {string[]|null} Null when no selection was made
 */
export function parseFields(value) {
  if (!value) return null;
  const list = Array.isArray(value) ? value : String(value).split(',');
  const fields = list.map((f) => f.trim()).filter(Boolean);
  return fields.length ? fields : null;
}

/**
 * Pick the first defined value from a list of candidates.
 * @param {...unknown} candidates
 * @returns {unknown}
 */
function first(...candidates) {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') return candidate;
  }
  return undefined;
}

/**
 * Normalise the three date shapes the scrapers produce (Date, epoch
 * milliseconds, ISO or display string) to one ISO string.
 * @param {unknown} value
 * @returns {string|undefined}
 */
function toIsoDate(value) {
  if (value === undefined) return undefined;
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? undefined : value.toISOString();
  if (typeof value === 'number') return new Date(value < 1e11 ? value * 1000 : value).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? String(value) : parsed.toISOString();
}

/**
 * Reduce one record to the canonical flat vocabulary.
 *
 * Tweets arrive in two shapes (the HTTP client's model with `likes` at the top
 * level, and the GraphQL parser's with `metrics.likes` and `author.username`),
 * profiles in two (`followers` versus `followersCount`), and the browser
 * scrapers add a third with `timestamp` strings. This maps all of them to one
 * set of names so `--fields likes` means the same thing on every command.
 *
 * @param {object} record
 * @returns {Record<string, unknown>} Only the fields that had a value
 */
export function flattenRecord(record) {
  if (!record || typeof record !== 'object') return { value: record };
  const metrics = record.metrics || {};
  const author = record.author || {};

  const flat = {
    id: first(record.id, record.tweetId, record.userId),
    username: first(
      record.username,
      author.username,
      // The browser scrapers put the handle in `author` as a plain string.
      typeof author === 'string' ? author : undefined,
      record.screenName,
      record.handle,
    ),
    name: first(record.name, author.name, record.displayName),
    date: toIsoDate(first(record.timeParsed, record.timestamp, record.createdAt, record.date, record.joined)),
    likes: first(record.likes, metrics.likes, record.likesCount, record.favoriteCount),
    retweets: first(record.retweets, metrics.retweets, record.retweetCount),
    replies: first(record.replies, metrics.replies, record.replyCount),
    views: first(record.views, metrics.views, record.viewCount),
    followers: first(record.followers, record.followersCount),
    following: first(record.following, record.followingCount),
    tweets: first(record.tweets, record.tweetCount, record.statusesCount),
    verified: first(record.verified, record.isBlueVerified, author.verified),
    location: record.location,
    website: record.website,
    type: record.type,
    url: first(record.permanentUrl, record.url, record.tweetUrl, record.profileUrl),
    tweetUrl: record.tweetUrl,
    bio: first(record.bio, record.description),
    text: first(record.text, record.fullText),
  };

  // Keep every other primitive the record carried so `--fields` can name it.
  for (const [key, value] of Object.entries(record)) {
    if (flat[key] === undefined && (typeof value !== 'object' || value === null || value instanceof Date)) {
      flat[key] = value;
    }
  }

  return Object.fromEntries(Object.entries(flat).filter(([, v]) => v !== undefined));
}

/**
 * Reduce an account report (from `xactions analyze`) to the compact vocabulary.
 * @param {object} report
 * @returns {Record<string, unknown>}
 */
export function flattenReport(report) {
  const { identity = {}, audience = {}, output = {}, engagement = {}, mix = {}, timing = {} } = report;
  return Object.fromEntries(
    Object.entries({
      username: identity.username,
      name: identity.name,
      followers: audience.followers,
      following: audience.following,
      followersPerDay: audience.followersPerDay,
      lifetimePosts: output.lifetimePosts,
      postsPerDay: output.postsPerDay,
      engagementRate: engagement.rate,
      medianEngagement: engagement.medianPerOriginal,
      medianLikes: engagement.medianLikes,
      medianViews: engagement.medianViews,
      originalShare: mix.originalShare,
      mediaShare: mix.mediaShare,
      bestHourUTC: timing.bestHourUTC,
      bestWeekday: timing.bestWeekday,
    }).filter(([, v]) => v !== undefined && v !== null),
  );
}

/**
 * Render one value for a single-line record. Newlines and tabs are the only
 * characters that would break the line format, so they become spaces.
 * @param {unknown} value
 * @returns {string}
 */
export function formatValue(value) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? '' : value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).replace(/[\t\r\n]+/g, ' ').replace(/ {2,}/g, ' ').trim();
}

/**
 * Choose the columns for a record kind, honouring an explicit `--fields`.
 * @param {string} kind
 * @param {string[]|null} fields
 * @returns {string[]}
 */
export function selectFields(kind, fields) {
  if (fields && fields.length) return fields;
  return DEFAULT_FIELDS[kind] || null;
}

/**
 * Format records as compact lines.
 *
 * @param {object|object[]} data - One record or a list
 * @param {object} [options]
 * @param {'tweet'|'profile'|'user'|'media'|'report'|'record'} [options.kind='record']
 * @param {string[]|string|null} [options.fields] - Explicit column selection
 * @returns {string} One line per record, no trailing newline
 */
export function formatCompact(data, { kind = 'record', fields = null } = {}) {
  const records = Array.isArray(data) ? data : [data];
  const selected = selectFields(kind, parseFields(fields));

  return records
    .map((record) => {
      const flat = kind === 'report' ? flattenReport(record) : flattenRecord(record);
      const columns = selected || Object.keys(flat);
      const cells = [];
      for (const key of columns) {
        const value = key in flat ? flat[key] : record?.[key];
        if (value === undefined) continue;
        cells.push(`${key}=${formatValue(value)}`);
      }
      return cells.join('\t');
    })
    .join('\n');
}

/**
 * Print records in compact form to stdout.
 * @param {object|object[]} data
 * @param {object} [options] - See {@link formatCompact}
 */
export function printCompact(data, options = {}) {
  const text = formatCompact(data, options);
  if (text.length) process.stdout.write(`${text}\n`);
}

/**
 * Work out which output mode a command is running in.
 *
 * `--json` is declared per command and arrives in the action's options;
 * `--compact` and `--fields` are declared once on the root program so every
 * read command gets them without repeating the declaration. Commander stores
 * root options on the root, so both have to be consulted.
 *
 * @param {import('commander').Command} program - The root command
 * @param {object} [options={}] - The action's own options
 * @returns {{json: boolean, compact: boolean, fields: string[]|null}}
 */
export function resolveOutputMode(program, options = {}) {
  const global = typeof program?.opts === 'function' ? program.opts() : {};
  return {
    json: Boolean(options.json || global.json),
    compact: Boolean(options.compact || global.compact),
    fields: parseFields(options.fields || global.fields),
  };
}

/**
 * Whether a machine is reading stdout: `--json` or `--compact` was asked for
 * and stdout is not a terminal. Spinners and decoration stay off in that case.
 *
 * @param {{json?: boolean, compact?: boolean}} mode
 * @param {NodeJS.WriteStream} [stdout=process.stdout]
 * @returns {boolean}
 */
export function isMachineOutput(mode, stdout = process.stdout) {
  return Boolean(mode?.json || mode?.compact) && !stdout.isTTY;
}

/**
 * Create and start a spinner that knows when to keep quiet.
 *
 * @param {string} text
 * @param {{json?: boolean, compact?: boolean}} [mode={}]
 * @returns {import('ora').Ora}
 */
export function createSpinner(text, mode = {}) {
  return ora({ text, isSilent: isMachineOutput(mode) }).start();
}
