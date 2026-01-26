/**
 * Media Scraper
 * Download all media (images/videos) from a user's profile
 * 
 * HOW TO USE:
 * 1. Go to x.com/USERNAME/media
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_ITEMS: 500,
    SCROLL_DELAY: 1500,
    HIGH_QUALITY: true, // Get highest quality images
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upgradeImageQuality = (url) => {
    if (!url) return url;
    // Remove size parameters to get full quality
    return url
      .replace(/&name=\w+/, '&name=large')
      .replace(/\?format=\w+/, '?format=jpg')
      .replace('_normal', '_400x400');
  };

  const extractMedia = (article) => {
    const media = [];
    
    // Get tweet info
    const timeLink = article.querySelector('time')?.closest('a');
    const tweetUrl = timeLink?.href || '';
    const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0] || '';
    const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
    const handle = userName.match(/@(\w+)/)?.[1] || '';

    // Get images
    const images = article.querySelectorAll('img[src*="media"], img[src*="pbs.twimg.com/media"]');
    images.forEach(img => {
      let src = img.src;
      if (CONFIG.HIGH_QUALITY) {
        src = upgradeImageQuality(src);
      }
      if (!src.includes('profile_images') && !src.includes('emoji')) {
        media.push({
          type: 'image',
          url: src,
          tweetId,
          tweetUrl,
          handle,
        });
      }
    });

    // Get videos (poster images or video elements)
    const videos = article.querySelectorAll('video');
    videos.forEach(video => {
      media.push({
        type: 'video',
        url: video.poster || video.src || '',
        tweetId,
        tweetUrl,
        handle,
      });
    });

    // Get GIFs
    const gifs = article.querySelectorAll('img[src*="tweet_video_thumb"]');
    gifs.forEach(gif => {
      media.push({
        type: 'gif',
        url: gif.src,
        tweetId,
        tweetUrl,
        handle,
      });
    });

    return media;
  };

  const run = async () => {
    const username = window.location.pathname.split('/')[1];
    
    if (!window.location.pathname.includes('/media')) {
      console.log('⚠️ For best results, go to x.com/' + username + '/media');
    }

    console.log(`🖼️ Scraping media from @${username}...`);

    const allMedia = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (allMedia.size < CONFIG.MAX_ITEMS && noNewCount < 5) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const beforeCount = allMedia.size;

      articles.forEach(article => {
        const mediaItems = extractMedia(article);
        mediaItems.forEach(item => {
          const key = item.url.split('?')[0]; // Dedupe by base URL
          if (!allMedia.has(key)) {
            allMedia.set(key, item);
          }
        });
      });

      const added = allMedia.size - beforeCount;
      if (added > 0) {
        console.log(`🖼️ Collected ${allMedia.size} media items...`);
        noNewCount = 0;
      } else {
        noNewCount++;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > 100) break;
    }

    const mediaList = Array.from(allMedia.values());
    const images = mediaList.filter(m => m.type === 'image');
    const videos = mediaList.filter(m => m.type === 'video');
    const gifs = mediaList.filter(m => m.type === 'gif');

    console.log('\n' + '='.repeat(60));
    console.log(`🖼️ SCRAPED ${mediaList.length} MEDIA ITEMS FROM @${username}`);
    console.log('='.repeat(60));
    console.log(`📷 Images: ${images.length}`);
    console.log(`🎥 Videos: ${videos.length}`);
    console.log(`🎞️ GIFs: ${gifs.length}`);
    console.log('='.repeat(60) + '\n');

    // Download JSON with all URLs
    const data = {
      username,
      scrapedAt: new Date().toISOString(),
      stats: {
        images: images.length,
        videos: videos.length,
        gifs: gifs.length,
        total: mediaList.length,
      },
      media: mediaList,
    };

    download(JSON.stringify(data, null, 2), `${username}_media_${Date.now()}.json`, 'application/json');
    console.log('💾 Downloaded media.json');

    // Also create a simple text file with just URLs
    const urlList = mediaList.map(m => m.url).join('\n');
    download(urlList, `${username}_media_urls_${Date.now()}.txt`, 'text/plain');
    console.log('💾 Downloaded media_urls.txt');

    window.scrapedMedia = data;
    console.log('\n✅ Done! Access data: window.scrapedMedia');
    console.log('💡 To download images: Open each URL from the JSON file');
  };

  run();
})();
