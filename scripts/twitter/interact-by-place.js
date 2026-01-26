/**
 * ============================================================
 * 📍 Interact By Place/Location
 * ============================================================
 * 
 * @name        interact-by-place.js
 * @description Interact with posts from specific locations
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 FEATURES:
 * ============================================================
 * 
 * • Search by location/place
 * • Filter by geocode
 * • Like local tweets
 * • Follow local users
 * • Great for local business accounts
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Configure locations below
 * 2. Open Chrome DevTools (F12)
 * 3. Paste this script and press Enter
 * 4. Use XActions.Place commands
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Target locations
  locations: [
    { name: 'New York', query: 'near:"New York"' },
    { name: 'San Francisco', query: 'near:"San Francisco"' },
    // { name: 'London', query: 'near:"London"' },
  ],
  
  // Keywords to combine with location
  keywords: [
    // 'coffee',
    // 'startup',
    // 'tech',
  ],
  
  // Actions
  actions: {
    like: true,
    follow: true,
    retweet: false,
  },
  
  // Limits
  limits: {
    likes: 15,
    follows: 10,
    retweets: 3,
  },
  
  // Timing
  delayBetweenActions: 2000,
  scrollDelay: 2000,
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function interactByPlace() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  
  // DOM Selectors
  const SELECTORS = {
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    followButton: '[data-testid$="-follow"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📍 INTERACT BY PLACE                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // State
  const state = {
    isRunning: false,
    currentLocation: null,
    stats: { likes: 0, follows: 0, retweets: 0 },
    processedTweets: new Set(),
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Place = {
    config: CONFIG,
    state,
    
    // Search by location
    search: (locationName, keyword = '') => {
      let location = CONFIG.locations.find(l => 
        l.name.toLowerCase() === locationName?.toLowerCase()
      );
      
      if (!location && locationName) {
        // Use custom location
        location = { name: locationName, query: `near:"${locationName}"` };
      }
      
      if (!location) {
        location = CONFIG.locations[0];
      }
      
      if (!location) {
        console.error('❌ No location specified or configured!');
        return;
      }
      
      let searchQuery = location.query;
      if (keyword) {
        searchQuery = `${keyword} ${location.query}`;
      }
      
      console.log(`📍 Searching: ${searchQuery}`);
      
      const encodedQuery = encodeURIComponent(searchQuery);
      window.location.href = `https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`;
    },
    
    // Interact with search results
    interact: async () => {
      console.log('🚀 Starting location-based interaction...');
      state.isRunning = true;
      
      while (state.isRunning && state.stats.likes < CONFIG.limits.likes) {
        const tweets = document.querySelectorAll(SELECTORS.tweet);
        
        for (const tweet of tweets) {
          if (!state.isRunning) break;
          if (state.stats.likes >= CONFIG.limits.likes) break;
          
          const tweetLink = tweet.querySelector('a[href*="/status/"]');
          const tweetId = tweetLink?.href?.match(/status\/(\d+)/)?.[1];
          
          if (!tweetId || state.processedTweets.has(tweetId)) continue;
          state.processedTweets.add(tweetId);
          
          // Skip already liked
          if (tweet.querySelector(SELECTORS.unlikeButton)) continue;
          
          // Like
          if (CONFIG.actions.like && state.stats.likes < CONFIG.limits.likes) {
            const likeBtn = tweet.querySelector(SELECTORS.likeButton);
            if (likeBtn) {
              likeBtn.click();
              state.stats.likes++;
              console.log(`❤️ Liked tweet (${state.stats.likes}/${CONFIG.limits.likes})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          // Follow
          if (CONFIG.actions.follow && state.stats.follows < CONFIG.limits.follows) {
            const followBtn = tweet.querySelector(SELECTORS.followButton);
            if (followBtn) {
              followBtn.click();
              state.stats.follows++;
              console.log(`👥 Followed (${state.stats.follows}/${CONFIG.limits.follows})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          // Retweet
          if (CONFIG.actions.retweet && state.stats.retweets < CONFIG.limits.retweets) {
            const rtBtn = tweet.querySelector(SELECTORS.retweetButton);
            if (rtBtn) {
              rtBtn.click();
              await sleep(500);
              const confirmBtn = document.querySelector('[data-testid="retweetConfirm"]');
              if (confirmBtn) confirmBtn.click();
              
              state.stats.retweets++;
              console.log(`🔄 Retweeted (${state.stats.retweets}/${CONFIG.limits.retweets})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
        }
        
        window.scrollBy(0, window.innerHeight);
        await sleep(CONFIG.scrollDelay);
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 LOCATION INTERACTION COMPLETE!                         ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.Place.stats();
    },
    
    // Add location
    addLocation: (name, customQuery = null) => {
      const query = customQuery || `near:"${name}"`;
      CONFIG.locations.push({ name, query });
      console.log(`✅ Added location: ${name}`);
    },
    
    // List locations
    listLocations: () => {
      console.log('');
      console.log('📍 CONFIGURED LOCATIONS:');
      CONFIG.locations.forEach((l, i) => {
        console.log(`   ${i + 1}. ${l.name}: ${l.query}`);
      });
      console.log('');
    },
    
    // Stop
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Stopped.');
    },
    
    // Stats
    stats: () => {
      console.log('');
      console.log('📊 LOCATION INTERACTION STATS:');
      console.log(`   ❤️ Likes: ${state.stats.likes}/${CONFIG.limits.likes}`);
      console.log(`   👥 Follows: ${state.stats.follows}/${CONFIG.limits.follows}`);
      console.log(`   🔄 Retweets: ${state.stats.retweets}/${CONFIG.limits.retweets}`);
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 PLACE INTERACTION COMMANDS:');
      console.log('');
      console.log('   XActions.Place.search("New York")');
      console.log('   XActions.Place.search("NYC", "coffee")');
      console.log('   XActions.Place.interact()');
      console.log('   XActions.Place.addLocation("Miami")');
      console.log('   XActions.Place.listLocations()');
      console.log('   XActions.Place.stop()');
      console.log('   XActions.Place.stats()');
      console.log('');
    }
  };
  
  console.log('✅ Interact By Place loaded!');
  console.log(`📍 Configured locations: ${CONFIG.locations.length}`);
  console.log('   Run XActions.Place.help() for commands.');
  console.log('');
})();
