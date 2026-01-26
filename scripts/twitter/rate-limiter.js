/**
 * ============================================================
 * ⏱️ Rate Limiter
 * ============================================================
 * 
 * @name        rate-limiter.js
 * @description Rate limiting and quota management utility
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 FEATURES:
 * ============================================================
 * 
 * • Track actions per hour/day
 * • Enforce rate limits
 * • Quota management
 * • Cooldown timers
 * • Safe automation defaults
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Paste this script FIRST before other XActions scripts
 * 2. Other scripts can use XActions.RateLimit
 * 3. Monitors and enforces safe limits
 * 
 * ============================================================
 */

/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(function rateLimiter() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ⏱️ RATE LIMITER                                           ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const STORAGE_KEY = 'xactions_ratelimit';
  
  // Default rate limits (conservative/safe)
  const defaultLimits = {
    follow: {
      perHour: 20,
      perDay: 100,
      cooldownMs: 2000,  // Minimum ms between actions
    },
    unfollow: {
      perHour: 20,
      perDay: 100,
      cooldownMs: 2000,
    },
    like: {
      perHour: 50,
      perDay: 200,
      cooldownMs: 1000,
    },
    retweet: {
      perHour: 25,
      perDay: 100,
      cooldownMs: 2000,
    },
    tweet: {
      perHour: 10,
      perDay: 50,
      cooldownMs: 5000,
    },
    reply: {
      perHour: 20,
      perDay: 100,
      cooldownMs: 3000,
    },
    dm: {
      perHour: 10,
      perDay: 50,
      cooldownMs: 30000, // 30 seconds for DMs
    },
    search: {
      perHour: 30,
      perDay: 200,
      cooldownMs: 2000,
    }
  };
  
  // Storage helpers
  const getData = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : { actions: {}, limits: defaultLimits };
    } catch {
      return { actions: {}, limits: defaultLimits };
    }
  };
  
  const saveData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };
  
  // Get actions in time window
  const getActionsInWindow = (actionType, windowMs) => {
    const data = getData();
    const actions = data.actions[actionType] || [];
    const cutoff = Date.now() - windowMs;
    return actions.filter(ts => ts > cutoff);
  };
  
  // Record an action
  const recordAction = (actionType) => {
    const data = getData();
    if (!data.actions[actionType]) {
      data.actions[actionType] = [];
    }
    data.actions[actionType].push(Date.now());
    
    // Clean old entries (older than 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    data.actions[actionType] = data.actions[actionType].filter(ts => ts > oneDayAgo);
    
    saveData(data);
  };
  
  // Check if action is allowed
  const canPerformAction = (actionType) => {
    const data = getData();
    const limits = data.limits[actionType] || defaultLimits[actionType];
    
    if (!limits) {
      return { allowed: true };
    }
    
    const hourAgo = 60 * 60 * 1000;
    const dayAgo = 24 * 60 * 60 * 1000;
    
    const actionsLastHour = getActionsInWindow(actionType, hourAgo);
    const actionsLastDay = getActionsInWindow(actionType, dayAgo);
    
    if (actionsLastHour.length >= limits.perHour) {
      const oldestInHour = Math.min(...actionsLastHour);
      const waitMs = hourAgo - (Date.now() - oldestInHour);
      return {
        allowed: false,
        reason: 'hourly limit',
        waitMs,
        current: actionsLastHour.length,
        limit: limits.perHour
      };
    }
    
    if (actionsLastDay.length >= limits.perDay) {
      const oldestInDay = Math.min(...actionsLastDay);
      const waitMs = dayAgo - (Date.now() - oldestInDay);
      return {
        allowed: false,
        reason: 'daily limit',
        waitMs,
        current: actionsLastDay.length,
        limit: limits.perDay
      };
    }
    
    // Check cooldown
    const lastAction = actionsLastHour[actionsLastHour.length - 1];
    if (lastAction) {
      const timeSinceLast = Date.now() - lastAction;
      if (timeSinceLast < limits.cooldownMs) {
        return {
          allowed: false,
          reason: 'cooldown',
          waitMs: limits.cooldownMs - timeSinceLast
        };
      }
    }
    
    return { allowed: true };
  };
  
  // Wait for rate limit
  const waitForRateLimit = async (actionType) => {
    const check = canPerformAction(actionType);
    if (check.allowed) return true;
    
    console.log(`⏳ Rate limited (${check.reason}). Waiting ${Math.ceil(check.waitMs / 1000)}s...`);
    await new Promise(r => setTimeout(r, check.waitMs + 100));
    return true;
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.RateLimit = {
    
    // Check if action is allowed
    check: canPerformAction,
    
    // Record an action
    record: recordAction,
    
    // Wait for rate limit to clear
    wait: waitForRateLimit,
    
    // Perform action with rate limiting
    perform: async (actionType, actionFn) => {
      const check = canPerformAction(actionType);
      
      if (!check.allowed) {
        console.log(`⏳ Rate limited: ${actionType} (${check.reason})`);
        await waitForRateLimit(actionType);
      }
      
      const result = await actionFn();
      recordAction(actionType);
      return result;
    },
    
    // Get current quotas
    quotas: () => {
      const data = getData();
      const hourAgo = 60 * 60 * 1000;
      const dayAgo = 24 * 60 * 60 * 1000;
      
      console.log('');
      console.log('═'.repeat(50));
      console.log('📊 CURRENT QUOTAS');
      console.log('═'.repeat(50));
      
      Object.keys(data.limits).forEach(actionType => {
        const limits = data.limits[actionType];
        const hourlyCount = getActionsInWindow(actionType, hourAgo).length;
        const dailyCount = getActionsInWindow(actionType, dayAgo).length;
        
        const hourPct = Math.round((hourlyCount / limits.perHour) * 100);
        const dayPct = Math.round((dailyCount / limits.perDay) * 100);
        
        console.log(`${actionType}:`);
        console.log(`   Hour: ${hourlyCount}/${limits.perHour} (${hourPct}%)`);
        console.log(`   Day:  ${dailyCount}/${limits.perDay} (${dayPct}%)`);
      });
      
      console.log('═'.repeat(50));
      console.log('');
    },
    
    // Get remaining quota
    remaining: (actionType) => {
      const data = getData();
      const limits = data.limits[actionType] || defaultLimits[actionType];
      
      if (!limits) return { hourly: Infinity, daily: Infinity };
      
      const hourAgo = 60 * 60 * 1000;
      const dayAgo = 24 * 60 * 60 * 1000;
      
      const hourlyCount = getActionsInWindow(actionType, hourAgo).length;
      const dailyCount = getActionsInWindow(actionType, dayAgo).length;
      
      return {
        hourly: Math.max(0, limits.perHour - hourlyCount),
        daily: Math.max(0, limits.perDay - dailyCount)
      };
    },
    
    // Set custom limits
    setLimits: (actionType, limits) => {
      const data = getData();
      data.limits[actionType] = { ...data.limits[actionType], ...limits };
      saveData(data);
      console.log(`✅ Updated limits for ${actionType}:`, limits);
    },
    
    // Get current limits
    getLimits: (actionType) => {
      const data = getData();
      return data.limits[actionType] || defaultLimits[actionType];
    },
    
    // Presets
    presets: {
      // Very conservative
      safe: () => {
        const data = getData();
        data.limits = {
          ...defaultLimits,
          follow: { perHour: 10, perDay: 50, cooldownMs: 5000 },
          unfollow: { perHour: 10, perDay: 50, cooldownMs: 5000 },
          like: { perHour: 25, perDay: 100, cooldownMs: 2000 },
        };
        saveData(data);
        console.log('✅ Applied SAFE preset (very conservative)');
      },
      
      // Default/moderate
      moderate: () => {
        const data = getData();
        data.limits = { ...defaultLimits };
        saveData(data);
        console.log('✅ Applied MODERATE preset (default)');
      },
      
      // Aggressive (use with caution!)
      aggressive: () => {
        const data = getData();
        data.limits = {
          ...defaultLimits,
          follow: { perHour: 40, perDay: 200, cooldownMs: 1000 },
          unfollow: { perHour: 40, perDay: 200, cooldownMs: 1000 },
          like: { perHour: 100, perDay: 400, cooldownMs: 500 },
        };
        saveData(data);
        console.log('⚠️ Applied AGGRESSIVE preset (use with caution!)');
      }
    },
    
    // Reset all tracking
    reset: () => {
      if (confirm('⚠️ Reset all action tracking?')) {
        const data = getData();
        data.actions = {};
        saveData(data);
        console.log('✅ Action tracking reset.');
      }
    },
    
    // Reset to default limits
    resetLimits: () => {
      if (confirm('⚠️ Reset to default limits?')) {
        const data = getData();
        data.limits = { ...defaultLimits };
        saveData(data);
        console.log('✅ Limits reset to defaults.');
      }
    },
    
    // Time until next action allowed
    nextAllowed: (actionType) => {
      const check = canPerformAction(actionType);
      if (check.allowed) {
        console.log(`✅ ${actionType} is allowed now.`);
        return 0;
      }
      
      const seconds = Math.ceil(check.waitMs / 1000);
      console.log(`⏳ ${actionType} allowed in ${seconds}s (${check.reason})`);
      return check.waitMs;
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 RATE LIMITER COMMANDS:');
      console.log('');
      console.log('   XActions.RateLimit.check("follow")');
      console.log('   XActions.RateLimit.record("follow")');
      console.log('   XActions.RateLimit.wait("follow")');
      console.log('   XActions.RateLimit.perform("follow", fn)');
      console.log('   XActions.RateLimit.quotas()');
      console.log('   XActions.RateLimit.remaining("follow")');
      console.log('   XActions.RateLimit.nextAllowed("follow")');
      console.log('   XActions.RateLimit.setLimits("follow", {perHour: 30})');
      console.log('   XActions.RateLimit.getLimits("follow")');
      console.log('');
      console.log('📦 PRESETS:');
      console.log('   XActions.RateLimit.presets.safe()');
      console.log('   XActions.RateLimit.presets.moderate()');
      console.log('   XActions.RateLimit.presets.aggressive()');
      console.log('');
      console.log('🔄 RESET:');
      console.log('   XActions.RateLimit.reset()');
      console.log('   XActions.RateLimit.resetLimits()');
      console.log('');
      console.log('📊 ACTION TYPES:');
      console.log('   follow, unfollow, like, retweet, tweet, reply, dm, search');
      console.log('');
    }
  };
  
  console.log('⏱️ Rate Limiter loaded!');
  console.log('   Run XActions.RateLimit.quotas() to see usage.');
  console.log('   Run XActions.RateLimit.help() for commands.');
  console.log('');
})();
