// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Bulk media downloading for X/Twitter.
 *
 * XActions could always *find* media; it could not save it. This is the piece
 * that was missing: point it at a profile, a tweet, a search or a community
 * and it writes every photo, video and GIF to disk with the filename layout
 * you asked for, skipping whatever it already has.
 *
 *   import { downloadMediaFor } from 'xactions/media';
 *
 *   const { summary } = await downloadMediaFor('@nichxbt:all', {
 *     scrapers,                        // from createHttpScraper()
 *     outputDir: './archive',
 *     template: '{username}/{date}_{media_filename}.{ext}',
 *     archivePath: './archive/.xactions-archive.jsonl',
 *     concurrency: 4,
 *   });
 *
 * @module media
 * by nichxbt
 */

import { openArchive } from './archive.js';
import { downloadAll } from './download.js';
import { collectItems, parseTarget } from './sources.js';
import { DEFAULT_TEMPLATE } from './template.js';

export { DEFAULT_ARCHIVE, hashBytes, identityKey, openArchive } from './archive.js';
export { OUTCOMES, downloadAll, downloadItem } from './download.js';
export { TARGET_KINDS, applyFilters, collectItems, itemsFromTweet, originalBannerUrl, originalImageUrl, parseTarget } from './sources.js';
export { DEFAULT_TEMPLATE, TEMPLATE_KEYS, cdnBasename, extensionFor, renderTemplate, resolveWithin, templateValues } from './template.js';

/**
 * Resolve a target and download everything it names.
 *
 * @param {string} target  "@user", "@user:avatar", a tweet URL or id, "search:<query>", "community:<id>"
 * @param {object} options
 * @param {object} options.scrapers      the object createHttpScraper() returns
 * @param {string} options.outputDir     where files land
 * @param {string} [options.template]    filename template
 * @param {string|null} [options.archivePath]  JSONL archive; null disables recording
 * @param {number} [options.limit]       how many source items to walk
 * @param {string[]} [options.types]     photo | video | gif
 * @param {Date|null} [options.since]
 * @param {Date|null} [options.until]
 * @param {number} [options.concurrency]
 * @param {boolean} [options.overwrite]
 * @param {boolean} [options.dryRun]
 * @param {Function} [options.onResult]
 * @param {Function} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ target: object, items: Array<object>, results: Array<object>, summary: object }>}
 */
export async function downloadMediaFor(target, options = {}) {
  const {
    scrapers,
    outputDir = process.cwd(),
    template = DEFAULT_TEMPLATE,
    archivePath = null,
    limit = 100,
    types,
    since = null,
    until = null,
    concurrency = 4,
    overwrite = false,
    dryRun = false,
    onResult,
    onProgress,
    signal,
  } = options;

  if (!scrapers) throw new Error('downloadMediaFor needs a `scrapers` instance from createHttpScraper()');

  const parsed = parseTarget(target);
  const archive = await openArchive(archivePath);
  const items = await collectItems(parsed, scrapers, { limit, types, since, until });

  const { results, summary } = await downloadAll(items, {
    outputDir,
    template,
    archive,
    concurrency,
    overwrite,
    dryRun,
    onResult,
    onProgress,
    signal,
  });

  return { target: parsed, items, results, summary };
}
