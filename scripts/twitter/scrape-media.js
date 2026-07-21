// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🖼️ Scrape Media - XActions
 * ============================================
 *
 * @name         scrape-media
 * @description  Collect every image, video, and GIF URL from a profile's Media tab and export to JSON/CSV.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to a profile's Media tab, e.g. x.com/nichxbt/media
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   On x.com/nichxbt/media the script scrolls the media grid and collects up to CONFIG.maxItems
 *   media URLs. Image URLs are upgraded to full resolution (the &name= size param is rewritten
 *   to &name=orig), and video/GIF sources are captured where the browser exposes them. It
 *   downloads a JSON manifest plus a plain-text list of URLs, and offers window.exportCSV().
 *   Stop early with window.stopScrapeMedia().
 *
 * ============================================
 */

(async function scrapeMedia() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of media items to collect before stopping
    maxItems: 500,

    // Upgrade image URLs to original resolution (strip the &name= size param)
    highestRes: true,

    // Which media types to keep
    includeImages: true,
    includeVideos: true,
    includeGifs: true,

    // Delay between scrolls (ms). Raise if the grid loads slowly.
    scrollDelay: 1800,

    // Give up after this many scrolls that add nothing new
    noNewItemsThreshold: 6,

    // Hard cap on scroll attempts so the loop can never run forever
    maxScrollAttempts: 400,

    // Auto-download a CSV file and a plain-text URL list too (JSON always downloads)
    downloadCsv: true,
    downloadUrlList: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    userName: '[data-testid="User-Name"]',
    tweetPhoto: '[data-testid="tweetPhoto"] img',
    video: 'video',
    gifThumb: 'img[src*="tweet_video_thumb"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (n, total) => console.log(`📊 Collected ${n}/${total} media items...`)
  };

  // Rewrite the &name= / ?name= size param to the original resolution.
  const toOriginalImage = (url) => {
    if (!url) return url;
    if (/[?&]name=/i.test(url)) {
      return url.replace(/&name=[^&]*/i, '&name=orig').replace(/\?name=[^&]*/i, '?name=orig');
    }
    // Some grid thumbnails encode the size in the path (e.g. ?format=jpg with no name).
    return url.includes('?') ? `${url}&name=orig` : `${url}?name=orig`;
  };

  const isDecorative = (src) => !src || src.includes('profile_images') || src.includes('emoji') || src.includes('profile_banners');

  const getPostContext = (article) => {
    const timeEl = article.querySelector('time');
    const permalink = timeEl ? timeEl.closest('a[href*="/status/"]') : null;
    const anchor = permalink || article.querySelector('a[href*="/status/"]');
    const url = anchor ? anchor.href : '';
    const id = url ? (url.split('/status/')[1] || '').split(/[?/]/)[0] : '';
    const nameBlock = article.querySelector(SELECTORS.userName);
    const handle = nameBlock ? (nameBlock.textContent.match(/@(\w+)/) || [, ''])[1] : '';
    return { tweetId: id, tweetUrl: url, handle, timestamp: timeEl ? timeEl.getAttribute('datetime') : null };
  };

  const extractMedia = (article) => {
    const out = [];
    const ctx = getPostContext(article);

    if (CONFIG.includeGifs) {
      article.querySelectorAll(SELECTORS.gifThumb).forEach((gif) => {
        if (!gif.src) return;
        out.push({ type: 'gif', url: gif.src, ...ctx });
      });
    }

    if (CONFIG.includeImages) {
      article.querySelectorAll(SELECTORS.tweetPhoto).forEach((img) => {
        if (isDecorative(img.src) || (img.src && img.src.includes('tweet_video_thumb'))) return;
        const url = CONFIG.highestRes ? toOriginalImage(img.src) : img.src;
        out.push({ type: 'image', url, ...ctx });
      });
    }

    if (CONFIG.includeVideos) {
      article.querySelectorAll(SELECTORS.video).forEach((v) => {
        const url = v.src || v.currentSrc || v.poster || '';
        if (!url) return;
        out.push({ type: 'video', url, poster: v.poster || '', ...ctx });
      });
    }

    return out;
  };

  const downloadFile = (content, filename, mime) => {
    try {
      const blob = new Blob([content], { type: mime });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
      return true;
    } catch (e) {
      log.error(`Failed to download ${filename}: ${e.message}`);
      return false;
    }
  };

  const csvCell = (value) => `"${String(value == null ? '' : value).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

  const toCSV = (media) => {
    const headers = ['type', 'url', 'handle', 'tweetId', 'tweetUrl', 'timestamp'];
    const rows = media.map((m) => [
      m.type, m.url, '@' + m.handle, m.tweetId, m.tweetUrl, m.timestamp || ''
    ].map(csvCell).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  // ============================================
  // 🎯 MAIN
  // ============================================
  const username = window.location.pathname.split('/').filter(Boolean)[0] || 'profile';

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🖼️ SCRAPE MEDIA - XActions                             ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn and return, never hard-redirect.
  if (!/\/media\/?$/.test(window.location.pathname)) {
    log.warning('You are not on a profile Media tab.');
    log.info(`Go to x.com/${username}/media, then run this script again.`);
    return;
  }

  const media = new Map();

  // Stop switch: run window.stopScrapeMedia() to end the scroll loop.
  let stopped = false;
  window.stopScrapeMedia = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then exporting.');
  };

  log.info(`Profile: @${username}`);
  log.info(`Max items: ${CONFIG.maxItems} | Highest resolution: ${CONFIG.highestRes}`);
  log.info('To stop early: window.stopScrapeMedia()');

  let scrollAttempts = 0;
  let noNewCount = 0;

  while (!stopped && media.size < CONFIG.maxItems && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = media.size;

    document.querySelectorAll(SELECTORS.tweet).forEach((article) => {
      try {
        extractMedia(article).forEach((item) => {
          // Dedupe by the base URL (without query) so re-rendered thumbnails
          // do not create duplicate entries.
          const key = `${item.type}:${item.url.split('?')[0]}`;
          if (!media.has(key)) media.set(key, item);
        });
      } catch (e) {
        log.error(`Skipped a media item: ${e.message}`);
      }
    });

    if (media.size > before) {
      log.progress(media.size, CONFIG.maxItems);
      noNewCount = 0;
    } else {
      noNewCount++;
      if (noNewCount >= CONFIG.noNewItemsThreshold) {
        log.warning('No new media after several scrolls. Reached the end of the tab.');
        break;
      }
    }

    if (media.size >= CONFIG.maxItems) break;

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollAttempts++;
  }

  const list = Array.from(media.values()).slice(0, CONFIG.maxItems);

  // ============================================
  // 📊 SUMMARY + EXPORT
  // ============================================
  if (list.length === 0) {
    log.warning('No media was found. The Media tab may be empty, or the grid had not loaded yet.');
    return;
  }

  const images = list.filter((m) => m.type === 'image');
  const videos = list.filter((m) => m.type === 'video');
  const gifs = list.filter((m) => m.type === 'gif');

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCRAPE MEDIA - COMPLETE                             ║
╠══════════════════════════════════════════════════════════╣
║  👤 Profile:      ${String('@' + username).slice(0, 36).padEnd(37)}║
║  🖼️  Total:        ${String(list.length).padEnd(37)}║
║  📷 Images:       ${String(images.length).padEnd(37)}║
║  🎥 Videos:       ${String(videos.length).padEnd(37)}║
║  🎞️  GIFs:         ${String(gifs.length).padEnd(37)}║
╚══════════════════════════════════════════════════════════╝
  `);

  const stamp = new Date().toISOString().split('T')[0];
  const result = {
    username,
    scrapedAt: new Date().toISOString(),
    stats: { images: images.length, videos: videos.length, gifs: gifs.length, total: list.length },
    media: list
  };

  if (downloadFile(JSON.stringify(result, null, 2), `${username}_media_${stamp}.json`, 'application/json')) {
    log.success('JSON downloaded');
  }
  if (CONFIG.downloadUrlList) {
    const urlText = list.map((m) => m.url).join('\n');
    if (downloadFile(urlText, `${username}_media_urls_${stamp}.txt`, 'text/plain')) log.success('URL list (.txt) downloaded');
  }
  if (CONFIG.downloadCsv && downloadFile(toCSV(list), `${username}_media_${stamp}.csv`, 'text/csv')) {
    log.success('CSV downloaded');
  }

  window.scrapedMedia = result;
  window.exportCSV = () => toCSV(list);
  console.log('');
  log.info('window.scrapedMedia holds the full data. window.exportCSV() returns the CSV string.');
  log.info('Open any URL from the JSON to save the file, or feed the .txt list to a downloader.');
  log.success('Done! by nichxbt');

  return result;
})();
