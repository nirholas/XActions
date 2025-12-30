// UnfollowX Automation - Quota Supervisor
// https://github.com/nirholas/UnfollowX
//
// REQUIRES: Paste core.js first!
//
// Sophisticated rate limiting and action management to protect your account
//
// HOW TO USE:
// 1. Paste core.js first
// 2. Paste this script to enable quota supervision
// 3. All other automation scripts will respect these limits

(() => {
  if (!window.UnfollowX?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, storage } = window.UnfollowX.Core;

  // ============================================
  // QUOTA CONFIGURATION
  // ============================================
  const QUOTAS = {
    // Hourly limits
    HOURLY: {
      likes: 60,           // Max likes per hour
      follows: 30,         // Max follows per hour
      unfollows: 40,       // Max unfollows per hour
      comments: 10,        // Max comments per hour
      dms: 5,              // Max DMs per hour
    },
    
    // Daily limits
    DAILY: {
      likes: 500,
      follows: 200,
      unfollows: 300,
      comments: 50,
      dms: 20,
    },
    
    // Sleep behavior when quota is hit
    SLEEP: {
      enabled: true,
      sleepyhead: true,    // Add extra sleep time when tired
      minSleepMinutes: 5,
      maxSleepMinutes: 15,
    },
    
    // Notifications
    NOTIFY: {
      enabled: true,
      onQuotaHit: true,    // Notify when quota is reached
      onResume: true,      // Notify when resuming after sleep
    },
    
    // Stochastic flow (randomize limits slightly)
    STOCHASTIC: {
      enabled: true,
      variance: 0.15,      // 15% variance in limits
    },
  };

  // ============================================
  // QUOTA STATE
  // ============================================
  const KEY = 'unfollowx_quota_state';
  
  const getState = () => {
    const saved = storage.get(KEY);
    if (!saved) return createFreshState();
    
    const now = Date.now();
    const state = saved;
    
    // Reset hourly counts if hour has passed
    if (now - state.hourlyReset > 60 * 60 * 1000) {
      state.hourly = { likes: 0, follows: 0, unfollows: 0, comments: 0, dms: 0 };
      state.hourlyReset = now;
    }
    
    // Reset daily counts if day has passed
    if (now - state.dailyReset > 24 * 60 * 60 * 1000) {
      state.daily = { likes: 0, follows: 0, unfollows: 0, comments: 0, dms: 0 };
      state.dailyReset = now;
    }
    
    return state;
  };
  
  const createFreshState = () => ({
    hourly: { likes: 0, follows: 0, unfollows: 0, comments: 0, dms: 0 },
    daily: { likes: 0, follows: 0, unfollows: 0, comments: 0, dms: 0 },
    hourlyReset: Date.now(),
    dailyReset: Date.now(),
    totalAllTime: { likes: 0, follows: 0, unfollows: 0, comments: 0, dms: 0 },
    sleepUntil: null,
  });
  
  const saveState = (state) => storage.set(KEY, state);

  // ============================================
  // GET EFFECTIVE LIMIT (with stochastic variance)
  // ============================================
  const getEffectiveLimit = (baseLimit) => {
    if (!QUOTAS.STOCHASTIC.enabled) return baseLimit;
    
    const variance = QUOTAS.STOCHASTIC.variance;
    const min = Math.floor(baseLimit * (1 - variance));
    const max = Math.ceil(baseLimit * (1 + variance));
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // ============================================
  // CHECK IF ACTION IS ALLOWED
  // ============================================
  const canPerform = (action) => {
    const state = getState();
    const now = Date.now();
    
    // Check if we're in a sleep period
    if (state.sleepUntil && now < state.sleepUntil) {
      const remaining = Math.ceil((state.sleepUntil - now) / 1000 / 60);
      return { 
        allowed: false, 
        reason: `sleeping`, 
        waitMinutes: remaining 
      };
    }
    
    // Check hourly limit
    const hourlyLimit = getEffectiveLimit(QUOTAS.HOURLY[action] || Infinity);
    if (state.hourly[action] >= hourlyLimit) {
      return { 
        allowed: false, 
        reason: 'hourly_limit', 
        limit: hourlyLimit,
        current: state.hourly[action] 
      };
    }
    
    // Check daily limit
    const dailyLimit = getEffectiveLimit(QUOTAS.DAILY[action] || Infinity);
    if (state.daily[action] >= dailyLimit) {
      return { 
        allowed: false, 
        reason: 'daily_limit', 
        limit: dailyLimit,
        current: state.daily[action] 
      };
    }
    
    return { allowed: true };
  };

  // ============================================
  // RECORD ACTION
  // ============================================
  const recordAction = (action) => {
    const state = getState();
    
    state.hourly[action] = (state.hourly[action] || 0) + 1;
    state.daily[action] = (state.daily[action] || 0) + 1;
    state.totalAllTime[action] = (state.totalAllTime[action] || 0) + 1;
    
    saveState(state);
    
    return state;
  };

  // ============================================
  // SLEEP FUNCTION
  // ============================================
  const triggerSleep = (reason) => {
    if (!QUOTAS.SLEEP.enabled) return;
    
    const state = getState();
    let sleepMinutes = Math.floor(
      Math.random() * (QUOTAS.SLEEP.maxSleepMinutes - QUOTAS.SLEEP.minSleepMinutes + 1)
    ) + QUOTAS.SLEEP.minSleepMinutes;
    
    // Sleepyhead mode: add extra time if near multiple limits
    if (QUOTAS.SLEEP.sleepyhead) {
      const actions = ['likes', 'follows', 'unfollows', 'comments'];
      let nearLimitCount = 0;
      
      for (const action of actions) {
        const hourlyRatio = state.hourly[action] / (QUOTAS.HOURLY[action] || Infinity);
        const dailyRatio = state.daily[action] / (QUOTAS.DAILY[action] || Infinity);
        
        if (hourlyRatio > 0.8 || dailyRatio > 0.8) nearLimitCount++;
      }
      
      sleepMinutes += nearLimitCount * 3; // Add 3 mins per near-limit action
    }
    
    state.sleepUntil = Date.now() + (sleepMinutes * 60 * 1000);
    saveState(state);
    
    log(`😴 Quota hit! Sleeping for ${sleepMinutes} minutes (${reason})`, 'warning');
    
    if (QUOTAS.NOTIFY.enabled && QUOTAS.NOTIFY.onQuotaHit) {
      notify(`UnfollowX: Sleeping ${sleepMinutes}min`, reason);
    }
    
    return sleepMinutes;
  };

  // ============================================
  // NOTIFICATION
  // ============================================
  const notify = (title, body) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '✂️' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '✂️' });
        }
      });
    }
  };

  // ============================================
  // PERFORM ACTION WITH QUOTA CHECK
  // ============================================
  const perform = async (action, callback) => {
    const check = canPerform(action);
    
    if (!check.allowed) {
      if (check.reason === 'sleeping') {
        log(`⏳ Waiting ${check.waitMinutes} minutes (quota sleep)`, 'info');
        return { success: false, reason: check.reason, wait: check.waitMinutes };
      }
      
      // Trigger sleep on limit hit
      const sleepMins = triggerSleep(`${action} ${check.reason}`);
      return { success: false, reason: check.reason, wait: sleepMins };
    }
    
    // Perform the action
    const result = await callback();
    
    // Record the action
    if (result !== false) {
      recordAction(action);
    }
    
    return { success: true, result };
  };

  // ============================================
  // GET STATUS REPORT
  // ============================================
  const getStatus = () => {
    const state = getState();
    const now = Date.now();
    
    const hourlyRemaining = {};
    const dailyRemaining = {};
    
    for (const action of Object.keys(QUOTAS.HOURLY)) {
      hourlyRemaining[action] = Math.max(0, QUOTAS.HOURLY[action] - (state.hourly[action] || 0));
      dailyRemaining[action] = Math.max(0, QUOTAS.DAILY[action] - (state.daily[action] || 0));
    }
    
    return {
      hourly: { used: state.hourly, remaining: hourlyRemaining, limits: QUOTAS.HOURLY },
      daily: { used: state.daily, remaining: dailyRemaining, limits: QUOTAS.DAILY },
      allTime: state.totalAllTime,
      sleeping: state.sleepUntil && now < state.sleepUntil,
      sleepRemaining: state.sleepUntil ? Math.max(0, Math.ceil((state.sleepUntil - now) / 1000 / 60)) : 0,
      hourlyResetsIn: Math.ceil((state.hourlyReset + 60 * 60 * 1000 - now) / 1000 / 60),
      dailyResetsIn: Math.ceil((state.dailyReset + 24 * 60 * 60 * 1000 - now) / 1000 / 60 / 60),
    };
  };

  // ============================================
  // PRINT STATUS
  // ============================================
  const printStatus = () => {
    const status = getStatus();
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📊 QUOTA SUPERVISOR STATUS                               ║
╠═══════════════════════════════════════════════════════════╣
║  HOURLY (resets in ${String(status.hourlyResetsIn).padStart(2)}m)                              ║
║    Likes:    ${String(status.hourly.used.likes || 0).padStart(3)}/${String(status.hourly.limits.likes).padStart(3)}  │  Follows:   ${String(status.hourly.used.follows || 0).padStart(3)}/${String(status.hourly.limits.follows).padStart(3)}  ║
║    Unfollows:${String(status.hourly.used.unfollows || 0).padStart(3)}/${String(status.hourly.limits.unfollows).padStart(3)}  │  Comments:  ${String(status.hourly.used.comments || 0).padStart(3)}/${String(status.hourly.limits.comments).padStart(3)}  ║
╠───────────────────────────────────────────────────────────╣
║  DAILY (resets in ${String(status.dailyResetsIn).padStart(2)}h)                               ║
║    Likes:    ${String(status.daily.used.likes || 0).padStart(3)}/${String(status.daily.limits.likes).padStart(3)}  │  Follows:   ${String(status.daily.used.follows || 0).padStart(3)}/${String(status.daily.limits.follows).padStart(3)}  ║
║    Unfollows:${String(status.daily.used.unfollows || 0).padStart(3)}/${String(status.daily.limits.unfollows).padStart(3)}  │  Comments:  ${String(status.daily.used.comments || 0).padStart(3)}/${String(status.daily.limits.comments).padStart(3)}  ║
╠───────────────────────────────────────────────────────────╣
║  STATUS: ${status.sleeping ? `😴 Sleeping (${status.sleepRemaining}m left)`.padEnd(25) : '✅ Active'.padEnd(25)}                ║
╚═══════════════════════════════════════════════════════════╝
    `);
  };

  // ============================================
  // RESET FUNCTIONS
  // ============================================
  const resetHourly = () => {
    const state = getState();
    state.hourly = { likes: 0, follows: 0, unfollows: 0, comments: 0, dms: 0 };
    state.hourlyReset = Date.now();
    saveState(state);
    log('Hourly quotas reset', 'success');
  };

  const resetDaily = () => {
    const state = getState();
    state.daily = { likes: 0, follows: 0, unfollows: 0, comments: 0, dms: 0 };
    state.dailyReset = Date.now();
    saveState(state);
    log('Daily quotas reset', 'success');
  };

  const resetAll = () => {
    storage.set(KEY, createFreshState());
    log('All quotas reset', 'success');
  };

  const wakeUp = () => {
    const state = getState();
    state.sleepUntil = null;
    saveState(state);
    log('Woken up from quota sleep', 'success');
  };

  // ============================================
  // EXPORT
  // ============================================
  window.UnfollowX.Quota = {
    canPerform,
    recordAction,
    perform,
    getStatus,
    printStatus,
    triggerSleep,
    resetHourly,
    resetDaily,
    resetAll,
    wakeUp,
    config: QUOTAS,
  };

  // Also expose as global shortcuts
  window.quotaStatus = printStatus;
  window.quotaReset = resetAll;
  window.quotaWake = wakeUp;

  log('✅ Quota Supervisor loaded!', 'success');
  printStatus();
})();
