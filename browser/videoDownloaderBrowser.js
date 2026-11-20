// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// browser/videoDownloaderBrowser.js
// Download videos from X/Twitter posts in browser
// by nichxbt
// https://github.com/nirholas/XActions
//
// HOW TO USE:
// 1. Go to a tweet with a video on x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
//
// AVAILABLE FUNCTIONS:
//   downloadCurrent()              — Download video from current tweet page
//   downloadFromUrl(tweetUrl)      — Navigate to tweet URL and download video
//   downloadGif()                  — Download GIF from current tweet (GIFs are mp4)
//   batchDownload([url1, url2...]) — Download videos from multiple tweet URLs
//   getVideoInfo()                 — Show video metadata without downloading
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const SEL = {
    tweet:          'article[data-testid="tweet"]',
    tweetText:      '[data-testid="tweetText"]',
    videoPlayer:    '[data-testid="videoPlayer"]',
    videoComponent: '[data-testid="videoComponent"]',
    toast:          '[data-testid="toast"]',
  };

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  // ─── URL Helpers ───────────────────────────────────────────

  const getTweetId = (url = window.location.href) => {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const getAuthor = (url = window.location.href) => {
    const match = url.match(/(?:x|twitter)\.com\/(\w+)/);
    return match ? match[1] : 'unknown';
  };

  const isTweetPage = (url = window.location.href) => /status\/\d+/.test(url);

  // ─── Video Extraction Strategies ──────────────────────────

  /**
   * Strategy 1: Direct <video> element src
   */
  const findVideoElements = () => {
    const videos = [];

    $$('video').forEach(video => {
      if (video.src && !video.src.startsWith('blob:')) {
        videos.push({ url: video.src, quality: 'direct', type: 'mp4', source: 'video-element' });
      }
      video.querySelectorAll('source').forEach(source => {
        if (source.src && !source.src.startsWith('blob:')) {
          videos.push({ url: source.src, quality: 'source', type: 'mp4', source: 'source-element' });
        }
      });
    });

    return videos;
  };

  /**
   * Strategy 2: Scan page HTML for video.twimg.com URLs
   */
  const findVideoInPageData = () => {
    const videos = [];
    const pageContent = document.documentElement.innerHTML;

    const patterns = [
      /https:\/\/video\.twimg\.com\/[^"'\s\\]+\.mp4[^"'\s\\]*/g,
      /https:\/\/video\.twimg\.com\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g,
      /https:\/\/pbs\.twimg\.com\/[^"'\s\\]+\.mp4[^"'\s\\]*/g,
      /https:\/\/[^"'\s\\]*\/amplify_video[^"'\s\\]*\.mp4[^"'\s\\]*/g,
      /https:\/\/[^"'\s\\]*\/ext_tw_video[^"'\s\\]*\.mp4[^"'\s\\]*/g,
      /https:\/\/[^"'\s\\]*\/tweet_video[^"'\s\\]*\.mp4[^"'\s\\]*/g,
    ];

    patterns.forEach(pattern => {
      const matches = pageContent.match(pattern) || [];
      matches.forEach(url => {
        let cleanUrl = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
        cleanUrl = cleanUrl.split('"')[0].split("'")[0].split(' ')[0];

        const qualityMatch = cleanUrl.match(/\/(\d+x\d+)\//);
        const quality = qualityMatch ? qualityMatch[1] : 'unknown';
        const type = cleanUrl.includes('.m3u8') ? 'm3u8' : 'mp4';

        videos.push({ url: cleanUrl, quality, type, source: 'page-data' });
      });
    });

    return videos;
  };

  /**
   * Strategy 3: Performance API — check resource timing entries for video URLs
   */
  const findVideoInPerformance = () => {
    const videos = [];

    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      resources.forEach(entry => {
        const url = entry.name;
        if (url && (url.includes('video.twimg.com') || url.includes('.mp4') || url.includes('.m3u8'))) {
          const qualityMatch = url.match(/\/(\d+x\d+)\//);
          const quality = qualityMatch ? qualityMatch[1] : 'performance';
          const type = url.includes('.m3u8') ? 'm3u8' : 'mp4';
          videos.push({ url, quality, type, source: 'performance-api' });
        }
      });
    }

    return videos;
  };

  /**
   * Strategy 4: React fiber — walk the DOM tree for video data in React internals
   */
  const findVideoInReactFiber = () => {
    const videos = [];

    const videoPlayers = $$(SEL.videoPlayer) || $$(SEL.videoComponent);
    videoPlayers.forEach(el => {
      // Traverse React fiber for props containing video URLs
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (!fiberKey) return;

      try {
        const fiberStr = JSON.stringify(el[fiberKey], (key, value) => {
          if (typeof value === 'object' && value !== null && key !== '') {
            // Limit depth to avoid circular refs
            return value;
          }
          return value;
        }, 0);

        // This will likely throw or be incomplete, but try extracting URLs
        const mp4Matches = fiberStr?.match(/https:[^"]*video\.twimg\.com[^"]*\.mp4[^"]*/g) || [];
        mp4Matches.forEach(url => {
          const cleanUrl = url.replace(/\\/g, '');
          const qualityMatch = cleanUrl.match(/\/(\d+x\d+)\//);
          videos.push({ url: cleanUrl, quality: qualityMatch ? qualityMatch[1] : 'fiber', type: 'mp4', source: 'react-fiber' });
        });
      } catch (e) {
        // Circular reference or access error — expected, silently skip
      }
    });

    return videos;
  };

  /**
   * Strategy 5: Network interceptor — capture future video loads
   */
  const setupInterceptor = () => {
    if (window.__XACTIONS_VD_INTERCEPTOR) return;

    window.__XACTIONS_VD_CAPTURED = window.__XACTIONS_VD_CAPTURED || [];

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString?.() || args[0]?.url || args[0];
      if (url && (url.includes('.mp4') || url.includes('.m3u8') || url.includes('video.twimg'))) {
        window.__XACTIONS_VD_CAPTURED.push({
          url,
          quality: 'intercepted',
          type: url.includes('.m3u8') ? 'm3u8' : 'mp4',
          source: 'fetch-intercept',
          time: Date.now(),
        });
        console.log('🎬 Captured video URL:', url.slice(0, 80) + '...');
      }
      return originalFetch(...args);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (url && (url.includes('.mp4') || url.includes('.m3u8') || url.includes('video.twimg'))) {
        window.__XACTIONS_VD_CAPTURED.push({
          url,
          quality: 'intercepted-xhr',
          type: url.includes('.m3u8') ? 'm3u8' : 'mp4',
          source: 'xhr-intercept',
          time: Date.now(),
        });
        console.log('🎬 Captured video URL (XHR):', url.slice(0, 80) + '...');
      }
      return originalXHROpen.call(this, method, url, ...rest);
    };

    window.__XACTIONS_VD_INTERCEPTOR = true;
    console.log('🔍 Video network interceptor activated');
  };

  const getInterceptedVideos = () => window.__XACTIONS_VD_CAPTURED || [];

  // ─── Dedup & Sort ─────────────────────────────────────────

  const dedup = (videos) => {
    const seen = new Set();
    return videos.filter(v => {
      const key = v.url.split('?')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const sortByQuality = (videos) => {
    return videos.sort((a, b) => {
      const getRes = (v) => {
        const m = v.quality?.match(/(\d+)x(\d+)/);
        return m ? parseInt(m[1]) * parseInt(m[2]) : 0;
      };
      return getRes(b) - getRes(a);
    });
  };

  // ─── Gather All Videos ────────────────────────────────────

  const findAllVideos = () => {
    let all = [];

    const s1 = findVideoElements();
    if (s1.length) console.log(`   ✅ Found ${s1.length} from <video> elements`);
    all.push(...s1);

    const s2 = findVideoInPageData();
    if (s2.length) console.log(`   ✅ Found ${s2.length} from page data`);
    all.push(...s2);

    const s3 = findVideoInPerformance();
    if (s3.length) console.log(`   ✅ Found ${s3.length} from Performance API`);
    all.push(...s3);

    const s4 = findVideoInReactFiber();
    if (s4.length) console.log(`   ✅ Found ${s4.length} from React fiber`);
    all.push(...s4);

    const s5 = getInterceptedVideos();
    if (s5.length) console.log(`   ✅ Found ${s5.length} from network intercepts`);
    all.push(...s5);

    all = dedup(all);
    all = sortByQuality(all);

    return all;
  };

  // ─── Download Helper ──────────────────────────────────────

  const triggerDownload = async (url, filename) => {
    console.log(`⬇️  Downloading: ${filename}`);

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        console.log(`✅ Download started: ${filename}`);
        return true;
      }
    } catch (e) {
      console.log('⚠️  CORS blocked, trying fallback...');
    }

    // Fallback: open in new tab
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      console.log('✅ Opened in new tab — right-click → Save Video As');
      return true;
    } catch (e2) {
      window.open(url, '_blank');
      console.log('📺 Opened in new tab — right-click → Save Video As');
      return true;
    }
  };

  // ─── Feature 1: Download Video From Current Tweet ─────────

  const downloadCurrent = async () => {
    console.log('🎬 XActions Video Downloader');
    console.log('═'.repeat(50));

    if (!isTweetPage()) {
      console.error('❌ Please navigate to a tweet page first!');
      console.log('   Example: https://x.com/user/status/123456789');
      return null;
    }

    const tweetId = getTweetId();
    const author = getAuthor();
    console.log(`📍 Tweet: @${author}/status/${tweetId}`);
    console.log('🔍 Searching for video URLs...\n');

    setupInterceptor();

    const videos = findAllVideos();

    if (videos.length === 0) {
      console.log('\n❌ No video URLs found.');
      console.log('\n💡 Tips:');
      console.log('   1. Make sure the tweet has a video');
      console.log('   2. Click PLAY on the video first, then retry');
      console.log('   3. The interceptor is now active — play video and run downloadCurrent() again');
      return null;
    }

    console.log(`\n📹 Found ${videos.length} video(s)\n`);
    videos.forEach((v, i) => {
      console.log(`   ${i + 1}. [${v.quality}] ${v.type.toUpperCase()} (${v.source})`);
      console.log(`      ${v.url.slice(0, 80)}...`);
    });

    const best = videos[0];
    console.log(`\n🏆 Best quality: ${best.quality} (${best.type.toUpperCase()})`);

    try {
      await navigator.clipboard.writeText(best.url);
      console.log('📋 URL copied to clipboard!');
    } catch (e) {
      // Clipboard access may be denied
    }

    const filename = `${author}_${tweetId}.mp4`;
    await triggerDownload(best.url, filename);

    console.log(`\n🔗 Direct URL:\n${best.url}`);

    return { best, all: videos, author, tweetId };
  };

  // ─── Feature 2: Download Video By Tweet URL ───────────────

  const downloadFromUrl = async (tweetUrl) => {
    if (!tweetUrl || !tweetUrl.match(/status\/\d+/)) {
      console.error('❌ Invalid tweet URL. Provide a URL like: https://x.com/user/status/123456789');
      return null;
    }

    const tweetId = getTweetId(tweetUrl);
    const author = getAuthor(tweetUrl);
    console.log(`🎬 Downloading video from @${author}/status/${tweetId}`);
    console.log('🔄 Navigating to tweet...');

    // If we're already on this tweet, just download
    if (window.location.href.includes(tweetId)) {
      return downloadCurrent();
    }

    // Navigate to the tweet
    window.location.href = tweetUrl;
    console.log('⏳ Page is loading... Run downloadCurrent() once the video is visible.');
    console.log('💡 Tip: After the page loads, click PLAY on the video, then run:');
    console.log(`   window.XActions.videoDownloader.downloadCurrent()`);

    // Store intent in sessionStorage so user can resume
    sessionStorage.setItem('xactions_vd_pending', JSON.stringify({ tweetUrl, tweetId, author }));

    return null;
  };

  // ─── Feature 3: Download GIF ──────────────────────────────

  const downloadGif = async () => {
    console.log('🎬 XActions GIF Downloader');
    console.log('═'.repeat(50));
    console.log('ℹ️  GIFs on X/Twitter are actually MP4 videos\n');

    if (!isTweetPage()) {
      console.error('❌ Please navigate to a tweet with a GIF first!');
      return null;
    }

    const tweetId = getTweetId();
    const author = getAuthor();

    setupInterceptor();

    // GIFs use tweet_video in the URL path
    const allVideos = findAllVideos();

    // Prefer tweet_video (GIF) URLs, then fall back to any video
    const gifVideos = allVideos.filter(v => v.url.includes('tweet_video'));
    const videos = gifVideos.length > 0 ? gifVideos : allVideos;

    if (videos.length === 0) {
      console.log('❌ No GIF/video found on this tweet.');
      console.log('💡 Make sure the GIF is playing, then retry.');
      return null;
    }

    const best = videos[0];
    console.log(`✅ Found GIF: ${best.quality} (${best.source})`);

    const filename = `${author}_${tweetId}_gif.mp4`;
    await triggerDownload(best.url, filename);

    console.log(`\n🔗 Direct URL:\n${best.url}`);

    return { best, all: videos, author, tweetId, isGif: true };
  };

  // ─── Feature 4: Batch Download ────────────────────────────

  const batchDownload = async (tweetUrls = []) => {
    if (!Array.isArray(tweetUrls) || tweetUrls.length === 0) {
      console.error('❌ Provide an array of tweet URLs.');
      console.log('   Example: batchDownload(["https://x.com/user/status/111", "https://x.com/user/status/222"])');
      return [];
    }

    console.log('🎬 XActions Batch Video Downloader');
    console.log('═'.repeat(50));
    console.log(`📦 Processing ${tweetUrls.length} tweet(s)\n`);

    const results = [];

    // We can only directly download the one we're currently on
    // For others, we collect URLs and let the user navigate manually
    const currentTweetId = getTweetId();

    for (let i = 0; i < tweetUrls.length; i++) {
      const url = tweetUrls[i];
      const tweetId = getTweetId(url);
      const author = getAuthor(url);

      console.log(`\n🔄 [${i + 1}/${tweetUrls.length}] @${author}/status/${tweetId}`);

      if (tweetId === currentTweetId) {
        // We're on this tweet — extract and download
        setupInterceptor();
        const videos = findAllVideos();

        if (videos.length > 0) {
          const best = videos[0];
          const filename = `${author}_${tweetId}.mp4`;
          await triggerDownload(best.url, filename);
          results.push({ tweetId, author, url: best.url, status: 'downloaded', quality: best.quality });
          console.log(`   ✅ Downloaded: ${best.quality}`);
        } else {
          results.push({ tweetId, author, url: null, status: 'no_video_found' });
          console.log('   ❌ No video found');
        }
      } else {
        // Not on this tweet — queue for later
        results.push({ tweetId, author, tweetUrl: url, status: 'queued' });
        console.log('   ⏳ Queued — navigate to this tweet and run downloadCurrent()');
      }

      await sleep(1000);
    }

    // Save queued URLs to sessionStorage
    const queued = results.filter(r => r.status === 'queued');
    if (queued.length > 0) {
      sessionStorage.setItem('xactions_vd_batch', JSON.stringify(queued));
      console.log(`\n📋 ${queued.length} tweet(s) queued in sessionStorage.`);
      console.log('   Navigate to each tweet, then run: window.XActions.videoDownloader.downloadCurrent()');
      console.log('   Or retrieve the queue: JSON.parse(sessionStorage.getItem("xactions_vd_batch"))');
    }

    console.log('\n═'.repeat(50));
    console.log(`📊 Results: ${results.filter(r => r.status === 'downloaded').length} downloaded, ${queued.length} queued`);

    return results;
  };

  // ─── Feature 5: Get Video Info ────────────────────────────

  const getVideoInfo = async () => {
    console.log('🎬 XActions Video Info');
    console.log('═'.repeat(50));

    if (!isTweetPage()) {
      console.error('❌ Please navigate to a tweet page first!');
      return null;
    }

    const tweetId = getTweetId();
    const author = getAuthor();

    setupInterceptor();

    // Gather video element metadata
    const videoEl = $('video');
    const info = {
      tweetId,
      author,
      tweetUrl: window.location.href,
      videoElement: null,
      availableQualities: [],
    };

    if (videoEl) {
      info.videoElement = {
        duration: videoEl.duration ? `${Math.round(videoEl.duration)}s` : 'unknown',
        durationRaw: videoEl.duration || null,
        videoWidth: videoEl.videoWidth || null,
        videoHeight: videoEl.videoHeight || null,
        resolution: (videoEl.videoWidth && videoEl.videoHeight) ? `${videoEl.videoWidth}x${videoEl.videoHeight}` : 'unknown',
        currentSrc: videoEl.currentSrc || null,
        paused: videoEl.paused,
        muted: videoEl.muted,
        readyState: videoEl.readyState,
        networkState: videoEl.networkState,
      };

      console.log('\n📺 Video Element Info:');
      console.log(`   Duration:   ${info.videoElement.duration}`);
      console.log(`   Resolution: ${info.videoElement.resolution}`);
      console.log(`   Paused:     ${info.videoElement.paused}`);
      console.log(`   Muted:      ${info.videoElement.muted}`);
    } else {
      console.log('\n⚠️  No <video> element found on this page.');
      console.log('   Make sure the video is visible and has been played.');
    }

    // Find all quality variants
    const videos = findAllVideos();
    info.availableQualities = videos.map(v => ({
      quality: v.quality,
      type: v.type,
      source: v.source,
      url: v.url,
    }));

    if (videos.length > 0) {
      console.log(`\n📊 Available Qualities (${videos.length}):\n`);
      videos.forEach((v, i) => {
        // Estimate file size from URL quality
        let sizeEstimate = 'unknown';
        const resMatch = v.quality.match(/(\d+)x(\d+)/);
        if (resMatch && info.videoElement?.durationRaw) {
          const pixels = parseInt(resMatch[1]) * parseInt(resMatch[2]);
          const duration = info.videoElement.durationRaw;
          // Rough estimate: ~2-5 bits per pixel per frame at 30fps
          const bitsPerSecond = pixels * 3 * 30;
          const bytes = (bitsPerSecond * duration) / 8;
          if (bytes > 1024 * 1024) {
            sizeEstimate = `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          } else {
            sizeEstimate = `~${(bytes / 1024).toFixed(0)} KB`;
          }
        }

        console.log(`   ${i + 1}. [${v.quality}] ${v.type.toUpperCase()} — ${v.source} — est. ${sizeEstimate}`);
      });

      const best = videos[0];
      console.log(`\n🏆 Best quality: ${best.quality}`);

      try {
        await navigator.clipboard.writeText(best.url);
        console.log('📋 Best URL copied to clipboard');
      } catch (e) {
        // Clipboard may not be available
      }

      console.log(`\n🔗 Best URL:\n${best.url}`);
    } else {
      console.log('\n❌ No downloadable video URLs found.');
      console.log('💡 Click PLAY on the video, then run getVideoInfo() again.');
    }

    return info;
  };

  // ─── Resume Pending Download (from navigation) ────────────

  const checkPending = () => {
    const pending = sessionStorage.getItem('xactions_vd_pending');
    if (pending) {
      try {
        const { tweetId } = JSON.parse(pending);
        if (getTweetId() === tweetId) {
          console.log('🔄 Resuming pending download...');
          sessionStorage.removeItem('xactions_vd_pending');
          setTimeout(() => downloadCurrent(), 2000);
        }
      } catch (e) {
        // Ignore
      }
    }
  };

  // ─── Initialize ───────────────────────────────────────────

  setupInterceptor();
  checkPending();

  // ─── Expose on window.XActions ────────────────────────────

  window.XActions = window.XActions || {};
  window.XActions.videoDownloader = {
    downloadCurrent,
    downloadFromUrl,
    downloadGif,
    batchDownload,
    getVideoInfo,
  };

  // ─── Print Menu ───────────────────────────────────────────

  console.log(`
╔══════════════════════════════════════════════════════════╗
║        🎬  XActions Video Downloader — Loaded           ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  All functions available at:                             ║
║    window.XActions.videoDownloader.<function>             ║
║                                                          ║
║  1. downloadCurrent()                                    ║
║     ↳ Download video from current tweet page             ║
║                                                          ║
║  2. downloadFromUrl('https://x.com/user/status/123')     ║
║     ↳ Navigate to tweet URL and download video           ║
║                                                          ║
║  3. downloadGif()                                        ║
║     ↳ Download GIF from current tweet (GIFs are mp4)     ║
║                                                          ║
║  4. batchDownload(['url1', 'url2', ...])                 ║
║     ↳ Download videos from multiple tweet URLs           ║
║                                                          ║
║  5. getVideoInfo()                                       ║
║     ↳ Show video metadata without downloading            ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  💡 Tip: Click PLAY on the video first for best results  ║
║  🔍 Network interceptor is active — captures video URLs  ║
║  📋 Results saved to sessionStorage for batch downloads   ║
╚══════════════════════════════════════════════════════════╝
  `);
})();
