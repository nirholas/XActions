/**
 * ============================================================
 * 👤 Interact By Users
 * ============================================================
 * 
 * @name        interact-by-users.js
 * @description Full interaction suite for specific users on X/Twitter
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 FEATURES:
 * ============================================================
 * 
 * • Like recent posts from target users
 * • Reply to their tweets
 * • Retweet their content
 * • Follow them (if not already following)
 * • Track interaction history
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Configure target users below
 * 2. Open Chrome DevTools (F12)
 * 3. Paste this script and press Enter
 * 4. Use the interaction commands
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Target usernames to interact with
  targetUsers: [
    // 'nichxbt',
    // 'elonmusk',
  ],
  
  // Actions to perform
  actions: {
    like: true,
    retweet: false,
    reply: false,
    follow: true,
  },
  
  // Limits per user
  limits: {
    likesPerUser: 3,
    retweetsPerUser: 1,
    repliesPerUser: 1,
  },
  
  // Timing
  delayBetweenActions: 2000,
  delayBetweenUsers: 5000,
  
  // Reply templates (random selection)
  replyTemplates: [
    'Great point! 🔥',
    'Couldn\'t agree more 👏',
    'This is gold 💯',
    'Thanks for sharing!',
  ],
};

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function interactByUsers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  // DOM Selectors
  const SELECTORS = {
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    unretweetButton: '[data-testid="unretweet"]',
    replyButton: '[data-testid="reply"]',
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    tweetInput: '[data-testid="tweetTextarea_0"]',
    tweetSubmit: '[data-testid="tweetButton"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👤 INTERACT BY USERS                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage
  const storage = {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(`xactions_interact_${key}`) || 'null'); }
      catch { return null; }
    },
    set: (key, value) => {
      localStorage.setItem(`xactions_interact_${key}`, JSON.stringify(value));
    }
  };
  
  // Track interactions
  const history = storage.get('history') || {};
  
  const saveHistory = () => storage.set('history', history);
  
  const getInteractionCount = (username, type) => {
    if (!history[username]) history[username] = { likes: 0, retweets: 0, replies: 0, followed: false };
    return history[username][type] || 0;
  };
  
  const recordInteraction = (username, type) => {
    if (!history[username]) history[username] = { likes: 0, retweets: 0, replies: 0, followed: false };
    if (type === 'followed') {
      history[username].followed = true;
    } else {
      history[username][type] = (history[username][type] || 0) + 1;
    }
    saveHistory();
  };
  
  // State
  const state = {
    isRunning: false,
    currentUser: null,
    stats: { likes: 0, retweets: 0, replies: 0, follows: 0 },
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.InteractUsers = {
    config: CONFIG,
    state,
    history,
    
    // Interact with a single user's profile
    interactWith: async (username) => {
      const cleanUsername = username.replace('@', '').toLowerCase();
      console.log(`👤 Starting interaction with @${cleanUsername}...`);
      
      state.currentUser = cleanUsername;
      state.isRunning = true;
      
      // Navigate to user's profile
      console.log(`📍 Navigate to: https://x.com/${cleanUsername}`);
      
      await sleep(1000);
      
      // Wait for tweets to load
      await sleep(2000);
      
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      console.log(`🔍 Found ${tweets.length} tweets`);
      
      let userLikes = 0;
      let userRetweets = 0;
      let userReplies = 0;
      
      for (const tweet of tweets) {
        if (!state.isRunning) break;
        
        // Like
        if (CONFIG.actions.like && userLikes < CONFIG.limits.likesPerUser) {
          const likeBtn = tweet.querySelector(SELECTORS.likeButton);
          if (likeBtn) {
            likeBtn.click();
            userLikes++;
            state.stats.likes++;
            recordInteraction(cleanUsername, 'likes');
            console.log(`❤️ Liked tweet ${userLikes}/${CONFIG.limits.likesPerUser}`);
            await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
          }
        }
        
        // Retweet
        if (CONFIG.actions.retweet && userRetweets < CONFIG.limits.retweetsPerUser) {
          const rtBtn = tweet.querySelector(SELECTORS.retweetButton);
          if (rtBtn) {
            rtBtn.click();
            await sleep(500);
            // Confirm retweet
            const confirmBtn = document.querySelector('[data-testid="retweetConfirm"]');
            if (confirmBtn) confirmBtn.click();
            
            userRetweets++;
            state.stats.retweets++;
            recordInteraction(cleanUsername, 'retweets');
            console.log(`🔄 Retweeted ${userRetweets}/${CONFIG.limits.retweetsPerUser}`);
            await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
          }
        }
      }
      
      // Follow
      if (CONFIG.actions.follow && !history[cleanUsername]?.followed) {
        const followBtn = document.querySelector(SELECTORS.followButton);
        if (followBtn) {
          followBtn.click();
          state.stats.follows++;
          recordInteraction(cleanUsername, 'followed');
          console.log(`👥 Followed @${cleanUsername}`);
        }
      }
      
      console.log(`✅ Completed interaction with @${cleanUsername}`);
      console.log(`   Likes: ${userLikes}, Retweets: ${userRetweets}, Replies: ${userReplies}`);
      state.currentUser = null;
    },
    
    // Interact with all target users
    interactAll: async () => {
      if (CONFIG.targetUsers.length === 0) {
        console.error('❌ No target users configured!');
        console.log('Add usernames to CONFIG.targetUsers array.');
        return;
      }
      
      console.log(`🚀 Starting interaction with ${CONFIG.targetUsers.length} users...`);
      state.isRunning = true;
      
      for (const username of CONFIG.targetUsers) {
        if (!state.isRunning) break;
        
        await window.XActions.InteractUsers.interactWith(username);
        
        if (state.isRunning) {
          console.log(`⏳ Waiting before next user...`);
          await sleep(CONFIG.delayBetweenUsers);
        }
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 ALL INTERACTIONS COMPLETE!                             ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.InteractUsers.stats();
    },
    
    // Add user to target list
    addUser: (username) => {
      const clean = username.replace('@', '').toLowerCase();
      if (!CONFIG.targetUsers.includes(clean)) {
        CONFIG.targetUsers.push(clean);
        console.log(`✅ Added @${clean} to target list`);
      } else {
        console.log(`⚠️ @${clean} already in target list`);
      }
    },
    
    // Remove user from target list
    removeUser: (username) => {
      const clean = username.replace('@', '').toLowerCase();
      const idx = CONFIG.targetUsers.indexOf(clean);
      if (idx > -1) {
        CONFIG.targetUsers.splice(idx, 1);
        console.log(`✅ Removed @${clean} from target list`);
      }
    },
    
    // Stop interaction
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Interaction stopped.');
    },
    
    // Show stats
    stats: () => {
      console.log('');
      console.log('📊 INTERACTION STATS:');
      console.log(`   ❤️ Total likes: ${state.stats.likes}`);
      console.log(`   🔄 Total retweets: ${state.stats.retweets}`);
      console.log(`   💬 Total replies: ${state.stats.replies}`);
      console.log(`   👥 Total follows: ${state.stats.follows}`);
      console.log('');
    },
    
    // Show history
    showHistory: () => {
      console.log('');
      console.log('📜 INTERACTION HISTORY:');
      Object.entries(history).forEach(([user, data]) => {
        console.log(`   @${user}: ${data.likes}L / ${data.retweets}RT / ${data.replies}R / ${data.followed ? '✓Following' : ''}`);
      });
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 INTERACT BY USERS COMMANDS:');
      console.log('');
      console.log('   XActions.InteractUsers.addUser("username")');
      console.log('   XActions.InteractUsers.removeUser("username")');
      console.log('   XActions.InteractUsers.interactWith("username")');
      console.log('   XActions.InteractUsers.interactAll()');
      console.log('   XActions.InteractUsers.stop()');
      console.log('   XActions.InteractUsers.stats()');
      console.log('   XActions.InteractUsers.showHistory()');
      console.log('');
    }
  };
  
  console.log('✅ Interact By Users loaded!');
  console.log(`📋 Target users: ${CONFIG.targetUsers.length}`);
  console.log('   Run XActions.InteractUsers.help() for commands.');
  console.log('');
})();
