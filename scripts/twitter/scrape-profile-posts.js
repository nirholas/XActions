/**
 * ============================================================
 * 🐦 Twitter/X Profile Posts Scraper (Advanced)
 * ============================================================
 * 
 * @name        scrape-profile-posts.js
 * @description Scrapes posts from any Twitter/X profile with filtering,
 *              multiple export formats, and analytics
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS
 * ============================================================
 * 
 * 1. Go to the Twitter/X profile you want to scrape
 *    Example: https://x.com/SperaxUSD or https://twitter.com/elonmusk
 * 
 * 2. Open Chrome DevTools:
 *    - Windows/Linux: Press F12 or Ctrl+Shift+I
 *    - Mac: Press Cmd+Option+I
 * 
 * 3. Click on the "Console" tab
 * 
 * 4. CUSTOMIZE the CONFIG section below (optional but recommended!)
 * 
 * 5. Copy this ENTIRE script and paste it into the console
 * 
 * 6. Press Enter to run
 * 
 * 7. Results will be exported based on your CONFIG settings
 * 
 * ============================================================
 * ⚙️ CONFIGURATION - CUSTOMIZE THESE VALUES!
 * ============================================================
 * 
 * 📖 HOW TO CUSTOMIZE:
 * Each setting below has comments explaining what it does.
 * Change the values to match what you need, then run the script.
 * 
 */

const CONFIG = {
  
  // ==========================================
  // 📊 SCRAPING SETTINGS
  // ==========================================
  
  // Number of tweets to scrape (max)
  // 💡 Set to a higher number for more tweets, but it takes longer
  targetCount: 100,
  
  // Maximum scroll attempts before giving up
  // 💡 Increase if the profile has lots of media (slower loading)
  maxScrollAttempts: 50,
  
  // Delay between scrolls (milliseconds)
  // 💡 Increase to 3000-5000 if tweets aren't loading properly
  scrollDelay: 2000,
  
  // ==========================================
  // 🔍 FILTERING OPTIONS
  // ==========================================
  // Use these to only keep tweets matching your criteria
  
  filters: {
    
    // ---- KEYWORD WHITELIST ----
    // Only include tweets containing AT LEAST ONE of these words
    // 💡 Leave empty [] to include all tweets
    // 💡 Example: ['crypto', 'bitcoin', 'eth'] - keeps tweets with any of these words
    // 💡 Case-insensitive (matches 'Bitcoin', 'BITCOIN', 'bitcoin')
    whitelist: [],
    
    // ---- KEYWORD BLACKLIST ----
    // Exclude tweets containing ANY of these words
    // 💡 Leave empty [] to not exclude anything
    // 💡 Example: ['giveaway', 'spam', 'ad'] - removes tweets with these words
    // 💡 Case-insensitive
    blacklist: [],
    
    // ---- DATE RANGE ----
    // Only include tweets from the last X days
    // 💡 Set to 0 to include all tweets (no date filter)
    // 💡 Example: 7 = last week, 30 = last month, 365 = last year
    daysBack: 0,
    
    // ---- MINIMUM ENGAGEMENT ----
    // Only include tweets with at least this many likes
    // 💡 Set to 0 to include all tweets regardless of engagement
    // 💡 Example: 10 = only tweets with 10+ likes
    minLikes: 0,
    
    // Only include tweets with at least this many retweets
    // 💡 Set to 0 to include all
    minRetweets: 0,
    
    // ---- CONTENT TYPE FILTERS ----
    // Set to true to EXCLUDE these types of content
    
    // Exclude retweets (posts this user reposted from others)
    // 💡 Set to true to only see original content
    excludeRetweets: false,
    
    // Exclude replies (tweets that are responses to others)
    // 💡 Set to true to only see top-level posts
    excludeReplies: false,
    
    // ---- MEDIA FILTERS ----
    // Filter by media content
    // 💡 Options: 'all' | 'with-media' | 'without-media'
    // 💡 'all' = include everything
    // 💡 'with-media' = only tweets with images/videos
    // 💡 'without-media' = only text-only tweets
    mediaFilter: 'all'
  },
  
  // ==========================================
  // 📤 EXPORT FORMAT SETTINGS
  // ==========================================
  // Choose which formats to export. Set to true/false for each.
  
  export: {
    
    // ---- JSON FORMAT ----
    // Full data with all fields, good for programming/analysis
    // 💡 Best for: Importing into other tools, APIs, databases
    json: true,
    
    // ---- CSV FORMAT ----
    // Spreadsheet-compatible format
    // 💡 Best for: Opening in Excel, Google Sheets, data analysis
    // 💡 Opens directly in spreadsheet apps
    csv: true,
    
    // ---- MARKDOWN FORMAT ----
    // Formatted text with headers and lists
    // 💡 Best for: Documentation, Notion, Obsidian, note-taking apps
    markdown: false,
    
    // ---- PLAIN TEXT FORMAT ----
    // Simple readable text, one tweet per block
    // 💡 Best for: Reading, sharing, simple archives
    text: false,
    
    // ---- HTML TABLE ----
    // Styled HTML table you can embed in websites
    // 💡 Best for: Reports, presentations, embedding in web pages
    html: false
  },
  
  // ==========================================
  // 📊 DISPLAY & ANALYTICS
  // ==========================================
  
  display: {
    
    // Show summary statistics (total engagement, averages, etc.)
    // 💡 Displays: total likes/retweets, averages, top hashtags
    showStats: true,
    
    // Show top performing tweets (sorted by engagement)
    // 💡 Set to 0 to disable, or 5-10 to show top posts
    showTopPosts: 5,
    
    // Show extracted hashtags from all tweets
    // 💡 Useful to see trending topics for this profile
    showHashtags: true,
    
    // Show all @mentions found in tweets
    // 💡 Useful to see who this profile interacts with
    showMentions: true,
    
    // Show all URLs/links shared
    // 💡 Useful to see what resources they share
    showLinks: false,
    
    // Pretty print tweets in console (formatted text view)
    // 💡 Makes it easy to read tweets directly in console
    prettyPrint: true,
    
    // Number of tweets to pretty print (set lower to reduce console spam)
    prettyPrintLimit: 10
  },
  
  // ==========================================
  // 🔧 GENERAL SETTINGS
  // ==========================================
  
  // Copy results to clipboard when complete
  // 💡 Copies the primary export format (JSON by default)
  copyToClipboard: true,
  
  // Show verbose progress messages
  // 💡 Set to false for cleaner output
  verbose: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START - DO NOT MODIFY BELOW UNLESS YOU KNOW WHAT YOU'RE DOING
 * ============================================================
 */

(async function scrapeTweets() {
  const tweets = [];
  const seenIds = new Set();
  const startTime = Date.now();
  
  // Get profile name from URL
  const profileMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const profileName = profileMatch ? profileMatch[1] : 'unknown';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🐦 Twitter/X Profile Posts Scraper (Advanced)             ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🎯 Target Profile: @${profileName}`);
  console.log(`📊 Target Count: ${CONFIG.targetCount} tweets`);
  
  // Display active filters
  const activeFilters = [];
  if (CONFIG.filters.whitelist.length > 0) activeFilters.push(`Whitelist: ${CONFIG.filters.whitelist.join(', ')}`);
  if (CONFIG.filters.blacklist.length > 0) activeFilters.push(`Blacklist: ${CONFIG.filters.blacklist.join(', ')}`);
  if (CONFIG.filters.daysBack > 0) activeFilters.push(`Last ${CONFIG.filters.daysBack} days`);
  if (CONFIG.filters.minLikes > 0) activeFilters.push(`Min ${CONFIG.filters.minLikes} likes`);
  if (CONFIG.filters.minRetweets > 0) activeFilters.push(`Min ${CONFIG.filters.minRetweets} RTs`);
  if (CONFIG.filters.excludeRetweets) activeFilters.push('No retweets');
  if (CONFIG.filters.excludeReplies) activeFilters.push('No replies');
  if (CONFIG.filters.mediaFilter !== 'all') activeFilters.push(`Media: ${CONFIG.filters.mediaFilter}`);
  
  if (activeFilters.length > 0) {
    console.log('🔍 Active Filters:');
    activeFilters.forEach(f => console.log(`   • ${f}`));
  }
  
  console.log('');
  console.log('🚀 Starting to scrape tweets...');
  console.log('📜 Auto-scrolling to load more tweets...');
  console.log('');
  
  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  
  /**
   * Parse engagement numbers (handles K, M suffixes)
   */
  function parseEngagement(str) {
    if (!str || str === '') return 0;
    str = str.trim().toUpperCase();
    if (str.includes('K')) return parseFloat(str) * 1000;
    if (str.includes('M')) return parseFloat(str) * 1000000;
    return parseInt(str.replace(/,/g, '')) || 0;
  }
  
  /**
   * Check if tweet passes all filters
   */
  function passesFilters(tweet) {
    const text = tweet.text.toLowerCase();
    
    // Whitelist check
    if (CONFIG.filters.whitelist.length > 0) {
      const hasWhitelistedWord = CONFIG.filters.whitelist.some(word => 
        text.includes(word.toLowerCase())
      );
      if (!hasWhitelistedWord) return false;
    }
    
    // Blacklist check
    if (CONFIG.filters.blacklist.length > 0) {
      const hasBlacklistedWord = CONFIG.filters.blacklist.some(word => 
        text.includes(word.toLowerCase())
      );
      if (hasBlacklistedWord) return false;
    }
    
    // Date range check
    if (CONFIG.filters.daysBack > 0 && tweet.timestamp) {
      const tweetDate = new Date(tweet.timestamp);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.filters.daysBack);
      if (tweetDate < cutoffDate) return false;
    }
    
    // Engagement checks
    const likes = parseEngagement(tweet.metrics.likes);
    const retweets = parseEngagement(tweet.metrics.retweets);
    if (likes < CONFIG.filters.minLikes) return false;
    if (retweets < CONFIG.filters.minRetweets) return false;
    
    // Retweet/Reply exclusion
    if (CONFIG.filters.excludeRetweets && tweet.type.isRetweet) return false;
    if (CONFIG.filters.excludeReplies && tweet.type.isReply) return false;
    
    // Media filter
    if (CONFIG.filters.mediaFilter === 'with-media') {
      if (!tweet.media.hasImage && !tweet.media.hasVideo) return false;
    } else if (CONFIG.filters.mediaFilter === 'without-media') {
      if (tweet.media.hasImage || tweet.media.hasVideo) return false;
    }
    
    return true;
  }
  
  /**
   * Extract hashtags from text
   */
  function extractHashtags(text) {
    const matches = text.match(/#[\w]+/g);
    return matches || [];
  }
  
  /**
   * Extract mentions from text
   */
  function extractMentions(text) {
    const matches = text.match(/@[\w]+/g);
    return matches || [];
  }
  
  /**
   * Extract URLs from text
   */
  function extractUrls(text) {
    const matches = text.match(/https?:\/\/[^\s]+/g);
    return matches || [];
  }
  
  /**
   * Extract tweets from the current page DOM
   */
  function extractTweets() {
    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
    let newCount = 0;
    
    tweetElements.forEach(tweet => {
      try {
        // Get tweet link (contains the unique ID)
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        const tweetUrl = tweetLink ? tweetLink.href : null;
        const tweetId = tweetUrl ? tweetUrl.split('/status/')[1]?.split('?')[0] : null;
        
        // Skip if we've already seen this tweet or couldn't get ID
        if (!tweetId || seenIds.has(tweetId)) return;
        seenIds.add(tweetId);
        
        // Get the tweet text content
        const textElement = tweet.querySelector('[data-testid="tweetText"]');
        const text = textElement ? textElement.innerText : '';
        
        // Get the timestamp
        const timeElement = tweet.querySelector('time');
        const timestamp = timeElement ? timeElement.getAttribute('datetime') : null;
        const displayTime = timeElement ? timeElement.innerText : '';
        
        // Helper function to extract engagement metrics
        const getMetric = (testId) => {
          const el = tweet.querySelector(`[data-testid="${testId}"]`);
          const span = el?.querySelector('span span');
          return span ? span.innerText : '0';
        };
        
        // Extract all engagement metrics
        const replies = getMetric('reply');
        const retweets = getMetric('retweet');
        const likes = getMetric('like');
        
        // Views are in a different location
        const viewsElement = tweet.querySelector('a[href*="/analytics"]');
        const views = viewsElement ? viewsElement.innerText : '0';
        
        // Check for media attachments
        const hasImage = tweet.querySelector('[data-testid="tweetPhoto"]') !== null;
        const hasVideo = tweet.querySelector('[data-testid="videoPlayer"]') !== null;
        const hasCard = tweet.querySelector('[data-testid="card.wrapper"]') !== null;
        
        // Check if it's a retweet
        const isRetweet = tweet.querySelector('[data-testid="socialContext"]')?.innerText?.includes('reposted') || false;
        
        // Check if it's a reply
        const isReply = tweet.querySelector('[data-testid="socialContext"]')?.innerText?.includes('Replying to') || false;
        
        const tweetData = {
          id: tweetId,
          url: tweetUrl,
          text: text,
          timestamp: timestamp,
          displayTime: displayTime,
          metrics: {
            replies: replies,
            retweets: retweets,
            likes: likes,
            views: views
          },
          media: {
            hasImage: hasImage,
            hasVideo: hasVideo,
            hasCard: hasCard
          },
          type: {
            isRetweet: isRetweet,
            isReply: isReply
          },
          extracted: {
            hashtags: extractHashtags(text),
            mentions: extractMentions(text),
            urls: extractUrls(text)
          },
          scrapedAt: new Date().toISOString()
        };
        
        // Apply filters
        if (passesFilters(tweetData)) {
          tweets.push(tweetData);
          newCount++;
        }
        
      } catch (e) {
        console.warn('⚠️ Error extracting tweet:', e.message);
      }
    });
    
    return newCount;
  }
  
  // ==========================================
  // MAIN SCRAPING LOOP
  // ==========================================
  
  let scrollAttempts = 0;
  let lastTweetCount = 0;
  let noNewTweetsCount = 0;
  
  while (tweets.length < CONFIG.targetCount && scrollAttempts < CONFIG.maxScrollAttempts) {
    const newCount = extractTweets();
    
    // Log progress
    if (CONFIG.verbose && tweets.length !== lastTweetCount) {
      console.log(`📊 Progress: ${tweets.length}/${CONFIG.targetCount} tweets (${newCount} new this scroll)`);
      lastTweetCount = tweets.length;
      noNewTweetsCount = 0;
    } else if (tweets.length === lastTweetCount) {
      noNewTweetsCount++;
      if (noNewTweetsCount >= 5) {
        console.log('⚠️ No new tweets found after 5 scroll attempts. May have reached the end.');
        break;
      }
    }
    
    if (tweets.length >= CONFIG.targetCount) break;
    
    // Scroll down to load more tweets
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
    
    scrollAttempts++;
  }
  
  // Final extraction
  extractTweets();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // ==========================================
  // ANALYTICS & STATISTICS
  // ==========================================
  
  const finalTweets = tweets.slice(0, CONFIG.targetCount);
  
  // Calculate statistics
  const stats = {
    totalTweets: finalTweets.length,
    totalLikes: 0,
    totalRetweets: 0,
    totalReplies: 0,
    avgLikes: 0,
    avgRetweets: 0,
    tweetsWithMedia: 0,
    retweets: 0,
    replies: 0,
    topHashtags: {},
    topMentions: {},
    allUrls: []
  };
  
  finalTweets.forEach(t => {
    stats.totalLikes += parseEngagement(t.metrics.likes);
    stats.totalRetweets += parseEngagement(t.metrics.retweets);
    stats.totalReplies += parseEngagement(t.metrics.replies);
    if (t.media.hasImage || t.media.hasVideo) stats.tweetsWithMedia++;
    if (t.type.isRetweet) stats.retweets++;
    if (t.type.isReply) stats.replies++;
    
    t.extracted.hashtags.forEach(h => {
      stats.topHashtags[h.toLowerCase()] = (stats.topHashtags[h.toLowerCase()] || 0) + 1;
    });
    t.extracted.mentions.forEach(m => {
      stats.topMentions[m.toLowerCase()] = (stats.topMentions[m.toLowerCase()] || 0) + 1;
    });
    t.extracted.urls.forEach(u => {
      if (!stats.allUrls.includes(u)) stats.allUrls.push(u);
    });
  });
  
  stats.avgLikes = stats.totalTweets > 0 ? Math.round(stats.totalLikes / stats.totalTweets) : 0;
  stats.avgRetweets = stats.totalTweets > 0 ? Math.round(stats.totalRetweets / stats.totalTweets) : 0;
  
  // Sort hashtags and mentions by frequency
  const sortedHashtags = Object.entries(stats.topHashtags).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sortedMentions = Object.entries(stats.topMentions).sort((a, b) => b[1] - a[1]).slice(0, 10);
  
  // Build final output object
  const result = {
    profile: profileName,
    profileUrl: `https://x.com/${profileName}`,
    scrapedAt: new Date().toISOString(),
    duration: `${duration}s`,
    totalTweets: finalTweets.length,
    statistics: stats,
    tweets: finalTweets
  };
  
  // ==========================================
  // DISPLAY RESULTS
  // ==========================================
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SCRAPING COMPLETE!                                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`👤 Profile: @${result.profile}`);
  console.log(`📊 Tweets collected: ${result.totalTweets}`);
  console.log(`⏱️ Duration: ${result.duration}`);
  console.log('');
  
  // Show statistics
  if (CONFIG.display.showStats) {
    console.log('📈 ─────────────── STATISTICS ───────────────');
    console.log(`   Total Likes: ${stats.totalLikes.toLocaleString()}`);
    console.log(`   Total Retweets: ${stats.totalRetweets.toLocaleString()}`);
    console.log(`   Average Likes/Tweet: ${stats.avgLikes.toLocaleString()}`);
    console.log(`   Average Retweets/Tweet: ${stats.avgRetweets.toLocaleString()}`);
    console.log(`   Tweets with Media: ${stats.tweetsWithMedia}`);
    console.log(`   Retweets: ${stats.retweets}`);
    console.log(`   Replies: ${stats.replies}`);
    console.log('');
  }
  
  // Show top hashtags
  if (CONFIG.display.showHashtags && sortedHashtags.length > 0) {
    console.log('🏷️ ─────────────── TOP HASHTAGS ───────────────');
    sortedHashtags.forEach(([tag, count], i) => {
      console.log(`   ${i + 1}. ${tag} (${count})`);
    });
    console.log('');
  }
  
  // Show top mentions
  if (CONFIG.display.showMentions && sortedMentions.length > 0) {
    console.log('👥 ─────────────── TOP MENTIONS ───────────────');
    sortedMentions.forEach(([mention, count], i) => {
      console.log(`   ${i + 1}. ${mention} (${count})`);
    });
    console.log('');
  }
  
  // Show links
  if (CONFIG.display.showLinks && stats.allUrls.length > 0) {
    console.log('🔗 ─────────────── SHARED LINKS ───────────────');
    stats.allUrls.slice(0, 20).forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });
    if (stats.allUrls.length > 20) {
      console.log(`   ... and ${stats.allUrls.length - 20} more`);
    }
    console.log('');
  }
  
  // Show top posts
  if (CONFIG.display.showTopPosts > 0) {
    const topPosts = [...finalTweets]
      .sort((a, b) => parseEngagement(b.metrics.likes) - parseEngagement(a.metrics.likes))
      .slice(0, CONFIG.display.showTopPosts);
    
    console.log('🏆 ─────────────── TOP POSTS (by likes) ───────────────');
    topPosts.forEach((t, i) => {
      console.log(`   ${i + 1}. [${t.metrics.likes} ❤️] ${t.text.substring(0, 60)}...`);
      console.log(`      ${t.url}`);
    });
    console.log('');
  }
  
  // Pretty print tweets
  if (CONFIG.display.prettyPrint) {
    console.log('📝 ─────────────── TWEETS PREVIEW ───────────────');
    finalTweets.slice(0, CONFIG.display.prettyPrintLimit).forEach((t, i) => {
      console.log(`\n┌─ Tweet ${i + 1} ─────────────────────────────────`);
      console.log(`│ 📅 ${t.displayTime}`);
      console.log(`│ 💬 ${t.text.substring(0, 200)}${t.text.length > 200 ? '...' : ''}`);
      console.log(`│ ❤️ ${t.metrics.likes}  🔄 ${t.metrics.retweets}  💬 ${t.metrics.replies}  👁️ ${t.metrics.views}`);
      if (t.extracted.hashtags.length > 0) console.log(`│ 🏷️ ${t.extracted.hashtags.join(' ')}`);
      console.log(`│ 🔗 ${t.url}`);
      console.log(`└────────────────────────────────────────────────`);
    });
    if (finalTweets.length > CONFIG.display.prettyPrintLimit) {
      console.log(`\n... and ${finalTweets.length - CONFIG.display.prettyPrintLimit} more tweets`);
    }
    console.log('');
  }
  
  // ==========================================
  // EXPORT FUNCTIONS
  // ==========================================
  
  const dateStr = new Date().toISOString().split('T')[0];
  
  /**
   * Download a file with given content
   */
  function downloadFile(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error(`❌ Failed to download ${filename}:`, e.message);
      return false;
    }
  }
  
  /**
   * Convert tweets to CSV format
   */
  function toCSV() {
    const headers = ['Date', 'Text', 'Likes', 'Retweets', 'Replies', 'Views', 'Has Image', 'Has Video', 'Is Retweet', 'Is Reply', 'Hashtags', 'URL'];
    const rows = finalTweets.map(t => [
      t.displayTime,
      `"${t.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      parseEngagement(t.metrics.likes),
      parseEngagement(t.metrics.retweets),
      parseEngagement(t.metrics.replies),
      parseEngagement(t.metrics.views),
      t.media.hasImage,
      t.media.hasVideo,
      t.type.isRetweet,
      t.type.isReply,
      `"${t.extracted.hashtags.join(' ')}"`,
      t.url
    ].join(','));
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  /**
   * Convert tweets to Markdown format
   */
  function toMarkdown() {
    let md = `# Tweets from @${profileName}\n\n`;
    md += `> Scraped on ${result.scrapedAt}\n`;
    md += `> Total tweets: ${result.totalTweets}\n\n`;
    
    md += `## Statistics\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Total Likes | ${stats.totalLikes.toLocaleString()} |\n`;
    md += `| Total Retweets | ${stats.totalRetweets.toLocaleString()} |\n`;
    md += `| Avg Likes | ${stats.avgLikes} |\n`;
    md += `| Tweets with Media | ${stats.tweetsWithMedia} |\n\n`;
    
    if (sortedHashtags.length > 0) {
      md += `## Top Hashtags\n\n`;
      sortedHashtags.forEach(([tag, count]) => {
        md += `- ${tag} (${count})\n`;
      });
      md += '\n';
    }
    
    md += `## Tweets\n\n`;
    finalTweets.forEach((t, i) => {
      md += `### ${i + 1}. ${t.displayTime}\n\n`;
      md += `${t.text}\n\n`;
      md += `❤️ ${t.metrics.likes} | 🔄 ${t.metrics.retweets} | 💬 ${t.metrics.replies} | 👁️ ${t.metrics.views}\n\n`;
      md += `[View Tweet](${t.url})\n\n`;
      md += `---\n\n`;
    });
    
    return md;
  }
  
  /**
   * Convert tweets to plain text format
   */
  function toPlainText() {
    let txt = `TWEETS FROM @${profileName.toUpperCase()}\n`;
    txt += `${'='.repeat(50)}\n`;
    txt += `Scraped: ${result.scrapedAt}\n`;
    txt += `Total: ${result.totalTweets} tweets\n\n`;
    
    txt += `STATISTICS\n`;
    txt += `${'-'.repeat(30)}\n`;
    txt += `Total Likes: ${stats.totalLikes.toLocaleString()}\n`;
    txt += `Total Retweets: ${stats.totalRetweets.toLocaleString()}\n`;
    txt += `Average Likes: ${stats.avgLikes}\n\n`;
    
    txt += `TWEETS\n`;
    txt += `${'='.repeat(50)}\n\n`;
    
    finalTweets.forEach((t, i) => {
      txt += `[${i + 1}] ${t.displayTime}\n`;
      txt += `${'-'.repeat(30)}\n`;
      txt += `${t.text}\n\n`;
      txt += `Likes: ${t.metrics.likes} | RTs: ${t.metrics.retweets} | Replies: ${t.metrics.replies} | Views: ${t.metrics.views}\n`;
      txt += `URL: ${t.url}\n`;
      txt += `\n${'='.repeat(50)}\n\n`;
    });
    
    return txt;
  }
  
  /**
   * Convert tweets to HTML table format
   */
  function toHTML() {
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Tweets from @${profileName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1da1f2; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #1da1f2; color: white; }
    tr:hover { background: #f5f8fa; }
    .stats { background: #f5f8fa; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .tweet-text { max-width: 400px; }
    a { color: #1da1f2; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🐦 Tweets from @${profileName}</h1>
  <p>Scraped: ${result.scrapedAt}</p>
  
  <div class="stats">
    <strong>📊 Statistics:</strong><br>
    Total Tweets: ${result.totalTweets} |
    Total Likes: ${stats.totalLikes.toLocaleString()} |
    Total Retweets: ${stats.totalRetweets.toLocaleString()} |
    Avg Likes: ${stats.avgLikes}
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Tweet</th>
        <th>❤️</th>
        <th>🔄</th>
        <th>💬</th>
        <th>👁️</th>
        <th>Link</th>
      </tr>
    </thead>
    <tbody>`;
    
    finalTweets.forEach((t, i) => {
      html += `
      <tr>
        <td>${i + 1}</td>
        <td>${t.displayTime}</td>
        <td class="tweet-text">${t.text.substring(0, 150).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${t.text.length > 150 ? '...' : ''}</td>
        <td>${t.metrics.likes}</td>
        <td>${t.metrics.retweets}</td>
        <td>${t.metrics.replies}</td>
        <td>${t.metrics.views}</td>
        <td><a href="${t.url}" target="_blank">View</a></td>
      </tr>`;
    });
    
    html += `
    </tbody>
  </table>
  
  <p style="margin-top: 40px; color: #888; font-size: 12px;">
    Generated by <a href="https://github.com/nirholas/XActions">XActions</a> by @nichxbt
  </p>
</body>
</html>`;
    
    return html;
  }
  
  // ==========================================
  // PERFORM EXPORTS
  // ==========================================
  
  console.log('💾 ─────────────── EXPORTING ───────────────');
  
  if (CONFIG.export.json) {
    if (downloadFile(JSON.stringify(result, null, 2), `${profileName}_tweets_${dateStr}.json`, 'application/json')) {
      console.log('   ✅ JSON downloaded');
    }
  }
  
  if (CONFIG.export.csv) {
    if (downloadFile(toCSV(), `${profileName}_tweets_${dateStr}.csv`, 'text/csv')) {
      console.log('   ✅ CSV downloaded');
    }
  }
  
  if (CONFIG.export.markdown) {
    if (downloadFile(toMarkdown(), `${profileName}_tweets_${dateStr}.md`, 'text/markdown')) {
      console.log('   ✅ Markdown downloaded');
    }
  }
  
  if (CONFIG.export.text) {
    if (downloadFile(toPlainText(), `${profileName}_tweets_${dateStr}.txt`, 'text/plain')) {
      console.log('   ✅ Text file downloaded');
    }
  }
  
  if (CONFIG.export.html) {
    if (downloadFile(toHTML(), `${profileName}_tweets_${dateStr}.html`, 'text/html')) {
      console.log('   ✅ HTML downloaded');
    }
  }
  
  // Copy to clipboard
  if (CONFIG.copyToClipboard) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('   ✅ JSON copied to clipboard');
    } catch (e) {
      console.error('   ❌ Clipboard copy failed:', e.message);
    }
  }
  
  // Store in window for easy access
  window.scrapedTweets = result;
  window.exportCSV = toCSV;
  window.exportMarkdown = toMarkdown;
  window.exportText = toPlainText;
  window.exportHTML = toHTML;
  
  console.log('');
  console.log('💡 ─────────────── ACCESS YOUR DATA ───────────────');
  console.log('   window.scrapedTweets     - Full data object');
  console.log('   window.exportCSV()       - Get CSV string');
  console.log('   window.exportMarkdown()  - Get Markdown string');
  console.log('   window.exportText()      - Get plain text string');
  console.log('   window.exportHTML()      - Get HTML string');
  console.log('');
  
  return result;
})();
