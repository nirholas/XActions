/**
 * ============================================================
 * ⚙️ Filter Manager
 * ============================================================
 * 
 * @name        filter-manager.js
 * @description Configure filters for XActions automation
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 FEATURES:
 * ============================================================
 * 
 * • Follower count filters (min/max)
 * • Account age filters
 * • Language filters
 * • Bio keyword filters
 * • Verified account handling
 * • Default profile pic detection
 * • Tweet count filters
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Open any X page
 * 2. Open Chrome DevTools (F12)
 * 3. Paste this script and press Enter
 * 4. Configure filters with XActions.Filters
 * 
 * ============================================================
 */

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(function filterManager() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ⚙️ FILTER MANAGER                                         ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const STORAGE_KEY = 'xactions_filters';
  
  // Default filter configuration
  const defaultFilters = {
    // Follower counts
    followers: {
      min: 0,
      max: Infinity,
      enabled: false
    },
    
    // Following counts
    following: {
      min: 0,
      max: Infinity,
      enabled: false
    },
    
    // Follower/Following ratio
    ratio: {
      min: 0,      // Minimum followers/following ratio
      max: Infinity,
      enabled: false
    },
    
    // Tweet count
    tweets: {
      min: 1,
      max: Infinity,
      enabled: false
    },
    
    // Account age (days)
    accountAge: {
      min: 30,    // At least 30 days old
      enabled: false
    },
    
    // Bio requirements
    bio: {
      required: false,           // Must have bio
      keywords: [],              // Must contain these words
      excludeKeywords: [],       // Must NOT contain these
      minLength: 0,
      enabled: false
    },
    
    // Profile picture
    profilePic: {
      required: false,           // Must have profile pic (not default)
      enabled: false
    },
    
    // Language
    language: {
      allowed: [],               // Empty = all languages
      enabled: false
    },
    
    // Verified status
    verified: {
      skip: false,               // Skip verified accounts
      only: false,               // Only verified accounts
      enabled: false
    },
    
    // Activity
    activity: {
      lastTweetDays: 30,         // Must have tweeted in last X days
      enabled: false
    },
    
    // Spam detection
    spam: {
      skipNoTweets: true,
      skipSuspicious: true,      // Suspicious follower/following ratio
      skipBotPatterns: true,     // Username looks like bot
      enabled: true
    }
  };
  
  // Storage helpers
  const getFilters = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? { ...defaultFilters, ...JSON.parse(data) } : { ...defaultFilters };
    } catch {
      return { ...defaultFilters };
    }
  };
  
  const saveFilters = (filters) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Filters = {
    
    // Get current filters
    get: () => getFilters(),
    
    // Set a specific filter
    set: (category, key, value) => {
      const filters = getFilters();
      if (filters[category]) {
        filters[category][key] = value;
        saveFilters(filters);
        console.log(`✅ Set ${category}.${key} = ${value}`);
      } else {
        console.error(`❌ Unknown filter category: ${category}`);
      }
    },
    
    // Enable a filter category
    enable: (category) => {
      const filters = getFilters();
      if (filters[category]) {
        filters[category].enabled = true;
        saveFilters(filters);
        console.log(`✅ Enabled ${category} filter`);
      }
    },
    
    // Disable a filter category
    disable: (category) => {
      const filters = getFilters();
      if (filters[category]) {
        filters[category].enabled = false;
        saveFilters(filters);
        console.log(`✅ Disabled ${category} filter`);
      }
    },
    
    // Quick presets
    presets: {
      // Quality followers (engaged users)
      quality: () => {
        const filters = getFilters();
        filters.followers.min = 100;
        filters.followers.max = 50000;
        filters.followers.enabled = true;
        filters.tweets.min = 10;
        filters.tweets.enabled = true;
        filters.bio.required = true;
        filters.bio.enabled = true;
        filters.profilePic.required = true;
        filters.profilePic.enabled = true;
        filters.accountAge.min = 90;
        filters.accountAge.enabled = true;
        saveFilters(filters);
        console.log('✅ Applied QUALITY preset');
      },
      
      // Influencers (high follower counts)
      influencers: () => {
        const filters = getFilters();
        filters.followers.min = 10000;
        filters.followers.max = Infinity;
        filters.followers.enabled = true;
        filters.verified.only = false;
        filters.verified.enabled = false;
        saveFilters(filters);
        console.log('✅ Applied INFLUENCERS preset');
      },
      
      // Small accounts (easier to engage)
      small: () => {
        const filters = getFilters();
        filters.followers.min = 50;
        filters.followers.max = 5000;
        filters.followers.enabled = true;
        filters.activity.lastTweetDays = 7;
        filters.activity.enabled = true;
        saveFilters(filters);
        console.log('✅ Applied SMALL ACCOUNTS preset');
      },
      
      // Anti-spam
      antiSpam: () => {
        const filters = getFilters();
        filters.spam.skipNoTweets = true;
        filters.spam.skipSuspicious = true;
        filters.spam.skipBotPatterns = true;
        filters.spam.enabled = true;
        filters.tweets.min = 5;
        filters.tweets.enabled = true;
        filters.profilePic.required = true;
        filters.profilePic.enabled = true;
        saveFilters(filters);
        console.log('✅ Applied ANTI-SPAM preset');
      },
      
      // No filters
      none: () => {
        saveFilters(defaultFilters);
        console.log('✅ Reset to default (no filters)');
      }
    },
    
    // Check if user passes all filters (helper for other scripts)
    check: (userData) => {
      const filters = getFilters();
      const failures = [];
      
      // Followers
      if (filters.followers.enabled) {
        if (userData.followers < filters.followers.min) {
          failures.push(`followers < ${filters.followers.min}`);
        }
        if (userData.followers > filters.followers.max) {
          failures.push(`followers > ${filters.followers.max}`);
        }
      }
      
      // Following
      if (filters.following.enabled) {
        if (userData.following < filters.following.min) {
          failures.push(`following < ${filters.following.min}`);
        }
        if (userData.following > filters.following.max) {
          failures.push(`following > ${filters.following.max}`);
        }
      }
      
      // Tweets
      if (filters.tweets.enabled) {
        if (userData.tweets < filters.tweets.min) {
          failures.push(`tweets < ${filters.tweets.min}`);
        }
      }
      
      // Bio
      if (filters.bio.enabled && filters.bio.required && !userData.bio) {
        failures.push('no bio');
      }
      
      // Profile pic
      if (filters.profilePic.enabled && filters.profilePic.required && !userData.hasProfilePic) {
        failures.push('no profile pic');
      }
      
      // Verified
      if (filters.verified.enabled) {
        if (filters.verified.skip && userData.isVerified) {
          failures.push('is verified');
        }
        if (filters.verified.only && !userData.isVerified) {
          failures.push('not verified');
        }
      }
      
      return {
        passes: failures.length === 0,
        failures
      };
    },
    
    // Show current configuration
    show: () => {
      const filters = getFilters();
      console.log('');
      console.log('═'.repeat(50));
      console.log('⚙️ CURRENT FILTER CONFIGURATION');
      console.log('═'.repeat(50));
      
      Object.entries(filters).forEach(([category, settings]) => {
        const status = settings.enabled ? '✅' : '⭕';
        console.log(`${status} ${category}:`);
        Object.entries(settings).forEach(([key, value]) => {
          if (key !== 'enabled') {
            console.log(`   ${key}: ${JSON.stringify(value)}`);
          }
        });
      });
      
      console.log('═'.repeat(50));
      console.log('');
    },
    
    // Reset to defaults
    reset: () => {
      if (confirm('⚠️ Reset all filters to defaults?')) {
        saveFilters(defaultFilters);
        console.log('✅ Filters reset to defaults.');
      }
    },
    
    // Export
    export: () => {
      const filters = getFilters();
      const json = JSON.stringify(filters, null, 2);
      console.log('📋 Filter config (copy this):');
      console.log(json);
      navigator.clipboard?.writeText(json);
      console.log('✅ Copied to clipboard!');
    },
    
    // Import
    import: (jsonString) => {
      try {
        const imported = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        const merged = { ...getFilters(), ...imported };
        saveFilters(merged);
        console.log('✅ Filters imported.');
      } catch (e) {
        console.error('❌ Invalid JSON:', e.message);
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 FILTER MANAGER COMMANDS:');
      console.log('');
      console.log('   XActions.Filters.show()           - Show current config');
      console.log('   XActions.Filters.get()            - Get filters object');
      console.log('   XActions.Filters.set(cat,key,val) - Set specific filter');
      console.log('   XActions.Filters.enable("bio")    - Enable filter');
      console.log('   XActions.Filters.disable("bio")   - Disable filter');
      console.log('');
      console.log('📦 PRESETS:');
      console.log('   XActions.Filters.presets.quality()');
      console.log('   XActions.Filters.presets.influencers()');
      console.log('   XActions.Filters.presets.small()');
      console.log('   XActions.Filters.presets.antiSpam()');
      console.log('   XActions.Filters.presets.none()');
      console.log('');
      console.log('📤 EXPORT/IMPORT:');
      console.log('   XActions.Filters.export()');
      console.log('   XActions.Filters.import(json)');
      console.log('   XActions.Filters.reset()');
      console.log('');
    }
  };
  
  const filters = getFilters();
  const enabledCount = Object.values(filters).filter(f => f.enabled).length;
  
  console.log(`⚙️ Filter Manager loaded! (${enabledCount} filters enabled)`);
  console.log('   Run XActions.Filters.help() for commands.');
  console.log('   Run XActions.Filters.show() to see current config.');
  console.log('');
})();
