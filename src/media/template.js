// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Filename templating for media downloads.
 *
 * Modelled on gallery-dl's template system, which is the format people in this
 * space already know, plus the keys its users have asked for and not received.
 * `{media_filename}` and `{cdn_basename}` expose X's own CDN name
 * (`Go6lFkVWsAAQwOo`), which gallery-dl cannot currently put in a filename
 * (mikf/gallery-dl#7695), so an archive downloaded here stays diffable against
 * the names X itself uses.
 *
 * Every rendered path is confined to the output directory: a template, a
 * username and a tweet's own text are all attacker-controlled in the general
 * case, and none of them may produce `../` or an absolute path.
 *
 * @module media/template
 * by nichxbt
 */

import { basename, extname, isAbsolute, join, normalize, relative, sep } from 'node:path';

/** Keys a template may use, with a one-line description for `--help` and the docs. */
export const TEMPLATE_KEYS = Object.freeze({
  username: "author's handle, without the @",
  user_id: "author's numeric id",
  tweet_id: 'id of the tweet the media belongs to',
  num: 'position within the tweet, starting at 1',
  ext: 'file extension without the dot (jpg, mp4, ...)',
  type: 'photo, video or animated_gif',
  kind: 'media, avatar or banner',
  date: 'tweet date as YYYY-MM-DD',
  datetime: 'tweet date as YYYYMMDD_HHMMSS',
  year: 'tweet year',
  month: 'tweet month, zero padded',
  day: 'tweet day, zero padded',
  width: 'pixel width, 0 when unknown',
  height: 'pixel height, 0 when unknown',
  bitrate: 'video bitrate, 0 for photos',
  media_filename: "X's own CDN filename without the extension",
  cdn_basename: 'alias of media_filename',
  hash: 'first 16 hex characters of the sha256 of the bytes (resolved after download)',
});

/** What a caller gets when it asks for the default. */
export const DEFAULT_TEMPLATE = '{username}/{tweet_id}_{num}.{ext}';

/** Characters no filesystem we support tolerates, plus control characters. */
// eslint-disable-next-line no-control-regex -- control characters are illegal in file names
const ILLEGAL = /[\u0000-\u001f<>:"|?*\\]/g;

/**
 * Make one path segment safe: no separators, no traversal, no trailing dots
 * (Windows drops those silently, which turns two distinct names into one).
 */
function sanitizeSegment(value) {
  const text = String(value ?? '')
    .replace(ILLEGAL, '_')
    .replace(/\//g, '_')
    .trim()
    .replace(/^\.+/, '')
    .replace(/\.+$/, '');
  return text || '_';
}

/** Zero-pad a number for date parts. */
const pad = (n) => String(n).padStart(2, '0');

/**
 * The CDN's own name for a file: `.../media/Go6lFkVWsAAQwOo.jpg?name=orig`
 * becomes `Go6lFkVWsAAQwOo`. Query strings and the extension are dropped so it
 * composes with `{ext}`.
 */
export function cdnBasename(url) {
  try {
    const path = new URL(url).pathname;
    const name = basename(path);
    return name.replace(extname(name), '') || 'media';
  } catch {
    const clean = String(url).split('?')[0].split('/').pop() || 'media';
    return clean.replace(extname(clean), '') || 'media';
  }
}

/**
 * The extension to save under, taken from the URL and falling back to the
 * media type. X serves photos as `.jpg` with a `format=` query, so the query
 * is consulted before the path.
 */
export function extensionFor(item) {
  const url = String(item.url || '');
  const format = url.match(/[?&]format=(\w+)/)?.[1];
  if (format) return format.toLowerCase();
  const fromPath = extname(url.split('?')[0]).replace('.', '').toLowerCase();
  if (fromPath) return fromPath;
  if (item.mediaType === 'photo') return 'jpg';
  return 'mp4';
}

/**
 * Build the substitution map for one media item.
 *
 * @param {object} item  a media entity (see media/sources.js)
 * @returns {Record<string, string>}
 */
export function templateValues(item) {
  const created = item.createdAt ? new Date(item.createdAt) : null;
  const valid = created && !Number.isNaN(created.getTime());
  const name = cdnBasename(item.url);
  return {
    username: item.username || 'unknown',
    user_id: item.userId || '0',
    tweet_id: item.tweetId || '0',
    num: String(item.num ?? 1),
    ext: extensionFor(item),
    type: item.mediaType || 'photo',
    kind: item.kind || 'media',
    date: valid ? created.toISOString().slice(0, 10) : '0000-00-00',
    datetime: valid
      ? `${created.getUTCFullYear()}${pad(created.getUTCMonth() + 1)}${pad(created.getUTCDate())}_${pad(created.getUTCHours())}${pad(created.getUTCMinutes())}${pad(created.getUTCSeconds())}`
      : '00000000_000000',
    year: valid ? String(created.getUTCFullYear()) : '0000',
    month: valid ? pad(created.getUTCMonth() + 1) : '00',
    day: valid ? pad(created.getUTCDate()) : '00',
    width: String(item.width ?? 0),
    height: String(item.height ?? 0),
    bitrate: String(item.bitrate ?? 0),
    media_filename: name,
    cdn_basename: name,
    hash: item.hash || '',
  };
}

/**
 * Render a template into a path relative to the output directory.
 *
 * Unknown keys are an error rather than an empty string: a typo like
 * `{tweetid}` should be corrected, not silently collapse every file in a run
 * onto the same name.
 *
 * @param {string} template
 * @param {object} item
 * @returns {string} a relative path using the platform separator
 */
export function renderTemplate(template, item) {
  const values = templateValues(item);
  const unknown = [];
  const rendered = String(template).replace(/\{(\w+)\}/g, (_, key) => {
    if (!(key in values)) { unknown.push(key); return ''; }
    return sanitizeSegment(values[key]);
  });
  if (unknown.length) {
    throw new Error(
      `Unknown template key${unknown.length > 1 ? 's' : ''}: ${[...new Set(unknown)].map((k) => `{${k}}`).join(', ')}. ` +
      `Available: ${Object.keys(TEMPLATE_KEYS).map((k) => `{${k}}`).join(', ')}`
    );
  }
  const parts = rendered.split('/').filter((p) => p && p !== '.' && p !== '..');
  if (!parts.length) throw new Error(`Template "${template}" rendered to an empty path`);
  return parts.join(sep);
}

/**
 * Resolve a rendered path inside the output directory, refusing anything that
 * escapes it. Returns an absolute path.
 */
export function resolveWithin(outputDir, relativePath) {
  const target = normalize(join(outputDir, relativePath));
  const rel = relative(outputDir, target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Refusing to write outside the output directory: ${relativePath}`);
  }
  return target;
}
