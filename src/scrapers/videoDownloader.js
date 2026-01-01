/**
 * X Video Downloader
 * Download any video from X/Twitter posts
 * 
 * HOW TO USE:
 * 1. Go to any tweet with a video: x.com/user/status/123456
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    QUALITY: 'highest',      // 'highest', 'lowest', 'all'
    AUTO_DOWNLOAD: true,     // Auto-download best quality
    SHOW_ALL_QUALITIES: true // Show all available qualities
  };

  // Get tweet ID from URL
  const getTweetId = () => {
    const match = window.location.href.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  // Get author from URL
  const getAuthor = () => {
    const match = window.location.href.match(/x\.com\/(\w+)/);
    return match ? match[1] : 'unknown';
  };

  // Method 1: Find video in React state/props
  const findVideoInReactState = () => {
    const videos = [];
    
    // Look for video elements and their React fiber
    document.querySelectorAll('video').forEach(video => {
      // Check for src directly
      if (video.src && !video.src.startsWith('blob:')) {
        videos.push({ url: video.src, quality: 'direct', type: 'mp4' });
      }
      
      // Check source elements
      video.querySelectorAll('source').forEach(source => {
        if (source.src && !source.src.startsWith('blob:')) {
          videos.push({ url: source.src, quality: 'source', type: 'mp4' });
        }
      });
    });

    return videos;
  };

  // Method 2: Find video URLs in page scripts/data
  const findVideoInPageData = () => {
    const videos = [];
    const pageContent = document.documentElement.innerHTML;
    
    // Look for video URLs in the page
    const patterns = [
      /https:\/\/video\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g,
      /https:\/\/video\.twimg\.com\/[^"'\s]+\.m3u8[^"'\s]*/g,
      /https:\/\/pbs\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/amplify_video[^"'\s]*\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/ext_tw_video[^"'\s]*\.mp4[^"'\s]*/g,
    ];
    
    patterns.forEach(pattern => {
      const matches = pageContent.match(pattern) || [];
      matches.forEach(url => {
        // Clean up URL
        let cleanUrl = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
        cleanUrl = cleanUrl.split('"')[0].split("'")[0].split(' ')[0];
        
        if (cleanUrl.includes('.mp4')) {
          // Extract quality from URL
          const qualityMatch = cleanUrl.match(/\/(\d+x\d+)\//);
          const quality = qualityMatch ? qualityMatch[1] : 'unknown';
          
          videos.push({ 
            url: cleanUrl, 
            quality,
            type: 'mp4'
          });
        }
      });
    });

    // Deduplicate
    const unique = [];
    const seen = new Set();
    videos.forEach(v => {
      const key = v.url.split('?')[0]; // Ignore query params for dedup
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(v);
      }
    });

    return unique;
  };

  // Method 3: Check network requests (if interceptor was set up)
  const findVideoInNetwork = () => {
    return window.__XACTIONS_VIDEO_URLS || [];
  };

  // Method 4: Look in window.__NEXT_DATA__ or similar
  const findVideoInNextData = () => {
    const videos = [];
    
    // Check for Next.js data
    if (window.__NEXT_DATA__) {
      const dataStr = JSON.stringify(window.__NEXT_DATA__);
      const mp4Matches = dataStr.match(/https:[^"]*\.mp4[^"]*/g) || [];
      mp4Matches.forEach(url => {
        videos.push({ url: url.replace(/\\/g, ''), quality: 'next_data', type: 'mp4' });
      });
    }

    return videos;
  };

  // Set up network interceptor for future requests
  const setupInterceptor = () => {
    if (window.__XACTIONS_INTERCEPTOR_ACTIVE) return;
    
    window.__XACTIONS_VIDEO_URLS = window.__XACTIONS_VIDEO_URLS || [];
    
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString?.() || args[0]?.url || args[0];
      
      if (url && (url.includes('.mp4') || url.includes('.m3u8') || url.includes('video.twimg'))) {
        window.__XACTIONS_VIDEO_URLS.push({
          url,
          quality: 'intercepted',
          type: url.includes('.m3u8') ? 'm3u8' : 'mp4',
          time: Date.now()
        });
        console.log('🎬 Captured video URL:', url.slice(0, 60) + '...');
      }
      
      return originalFetch(...args);
    };

    // Intercept XHR
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (url && (url.includes('.mp4') || url.includes('.m3u8') || url.includes('video.twimg'))) {
        window.__XACTIONS_VIDEO_URLS.push({
          url,
          quality: 'xhr',
          type: url.includes('.m3u8') ? 'm3u8' : 'mp4',
          time: Date.now()
        });
        console.log('🎬 Captured video URL (XHR):', url.slice(0, 60) + '...');
      }
      return originalXHR.call(this, method, url, ...rest);
    };

    window.__XACTIONS_INTERCEPTOR_ACTIVE = true;
    console.log('🔍 Video interceptor activated');
  };

  // Sort videos by quality (highest resolution first)
  const sortByQuality = (videos) => {
    return videos.sort((a, b) => {
      // Extract resolution numbers
      const getRes = (q) => {
        const match = q.quality?.match(/(\d+)x(\d+)/);
        return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
      };
      return getRes(b) - getRes(a);
    });
  };

  // Download video file
  const downloadVideo = async (url, filename) => {
    console.log('⬇️ Starting download...');
    
    try {
      // Try direct download first
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      
      // For cross-origin, we need to fetch and create blob
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          console.log('✅ Download started!');
          return true;
        }
      } catch (e) {
        // CORS blocked, try direct link
        console.log('⚠️ CORS blocked, opening in new tab...');
      }
      
      // Fallback: open in new tab
      window.open(url, '_blank');
      console.log('📺 Opened in new tab - right-click → Save Video As');
      return true;
      
    } catch (e) {
      console.error('❌ Download failed:', e.message);
      console.log('💡 Try: Right-click the URL below → Open in new tab → Save');
      return false;
    }
  };

  // Main function
  const run = async () => {
    console.clear();
    console.log('🎬 X Video Downloader v2.0');
    console.log('═'.repeat(50));

    const tweetId = getTweetId();
    const author = getAuthor();

    if (!tweetId) {
      console.error('❌ Please navigate to a tweet page first!');
      console.log('   Example: x.com/user/status/123456789');
      return;
    }

    console.log(`📍 Tweet: @${author}/status/${tweetId}\n`);

    // Set up interceptor for future use
    setupInterceptor();

    // Try all methods to find videos
    console.log('🔍 Searching for video URLs...\n');
    
    let allVideos = [];
    
    // Method 1: Direct video elements
    const reactVideos = findVideoInReactState();
    if (reactVideos.length) {
      console.log(`   ✓ Found ${reactVideos.length} in video elements`);
      allVideos.push(...reactVideos);
    }
    
    // Method 2: Page data/scripts
    const pageVideos = findVideoInPageData();
    if (pageVideos.length) {
      console.log(`   ✓ Found ${pageVideos.length} in page data`);
      allVideos.push(...pageVideos);
    }
    
    // Method 3: Network intercepts
    const networkVideos = findVideoInNetwork();
    if (networkVideos.length) {
      console.log(`   ✓ Found ${networkVideos.length} from network`);
      allVideos.push(...networkVideos);
    }
    
    // Method 4: Next.js data
    const nextVideos = findVideoInNextData();
    if (nextVideos.length) {
      console.log(`   ✓ Found ${nextVideos.length} in framework data`);
      allVideos.push(...nextVideos);
    }

    // Deduplicate
    const seen = new Set();
    allVideos = allVideos.filter(v => {
      const key = v.url.split('?')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by quality
    allVideos = sortByQuality(allVideos);

    if (allVideos.length === 0) {
      console.log('\n❌ No video URLs found.');
      console.log('\n💡 Tips:');
      console.log('   1. Make sure the tweet has a video (not a GIF or image)');
      console.log('   2. Click PLAY on the video first');
      console.log('   3. Run this script again');
      console.log('   4. The interceptor is now active - play video and retry');
      return;
    }

    // Display results
    console.log('\n' + '═'.repeat(50));
    console.log(`📹 FOUND ${allVideos.length} VIDEO(S)`);
    console.log('═'.repeat(50) + '\n');

    if (CONFIG.SHOW_ALL_QUALITIES) {
      console.log('Available qualities:\n');
      allVideos.forEach((v, i) => {
        console.log(`${i + 1}. [${v.quality}] ${v.type.toUpperCase()}`);
        console.log(`   ${v.url.slice(0, 70)}...`);
        console.log('');
      });
    }

    // Best quality
    const best = allVideos[0];
    console.log('═'.repeat(50));
    console.log('🏆 BEST QUALITY:');
    console.log(`   Resolution: ${best.quality}`);
    console.log(`   Type: ${best.type.toUpperCase()}`);
    console.log('═'.repeat(50));

    // Copy URL
    try {
      await navigator.clipboard.writeText(best.url);
      console.log('\n📋 Best quality URL copied to clipboard!');
    } catch (e) {
      console.log('\n📋 Copy URL manually from below');
    }

    // Store globally
    window.xVideo = {
      best: best.url,
      all: allVideos,
      author,
      tweetId,
      tweetUrl: window.location.href
    };

    console.log('\n🔗 Direct URL:');
    console.log(best.url);

    // Auto download
    if (CONFIG.AUTO_DOWNLOAD) {
      console.log('\n');
      const filename = `${author}_${tweetId}.mp4`;
      await downloadVideo(best.url, filename);
    }

    console.log('\n═'.repeat(50));
    console.log('💾 Access all data: window.xVideo');
    console.log('   window.xVideo.best  → Best quality URL');
    console.log('   window.xVideo.all   → All qualities');
    console.log('═'.repeat(50));

    // Manual download instructions
    console.log('\n📥 MANUAL DOWNLOAD:');
    console.log('   1. Right-click the URL above');
    console.log('   2. Select "Open in new tab"');
    console.log('   3. Right-click video → "Save video as..."');
  };

  run();
})();
