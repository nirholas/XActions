// XActions Automation - Session Logger & Analytics
// https://github.com/nirholas/XActions
//
// REQUIRES: Paste core.js first!
//
// Track all automation actions and generate reports
//
// HOW TO USE:
// 1. Paste core.js first
// 2. Paste this script to start logging
// 3. All automation actions will be recorded

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, storage } = window.XActions.Core;

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // How long to keep logs (days)
    LOG_RETENTION_DAYS: 30,
    
    // Save to localStorage frequency
    SAVE_INTERVAL_SECONDS: 30,
    
    // Actions to track
    TRACK_ACTIONS: ['follow', 'unfollow', 'like', 'unlike', 'comment', 'retweet', 'dm'],
    
    // Export format: 'json' or 'csv'
    EXPORT_FORMAT: 'json',
  };

  // ============================================
  // SESSION STATE
  // ============================================
  const KEY_SESSIONS = 'xactions_sessions';
  const KEY_CURRENT = 'xactions_current_session';
  
  const currentSession = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    startTime: Date.now(),
    endTime: null,
    actions: [],
    stats: {
      follows: 0,
      unfollows: 0,
      likes: 0,
      comments: 0,
      retweets: 0,
      dms: 0,
      errors: 0,
    },
    metadata: {
      userAgent: navigator.userAgent,
      startPage: window.location.href,
    },
  };

  // ============================================
  // LOGGING FUNCTIONS
  // ============================================
  const logAction = (action, target, details = {}) => {
    const entry = {
      timestamp: Date.now(),
      action: action,
      target: target,
      details: details,
      page: window.location.href,
    };
    
    currentSession.actions.push(entry);
    
    // Update stats
    if (action in currentSession.stats) {
      currentSession.stats[action + 's']++;
    }
    
    // Save periodically
    saveSession();
    
    return entry;
  };

  const logError = (error, context = {}) => {
    const entry = {
      timestamp: Date.now(),
      type: 'error',
      message: error.message || String(error),
      stack: error.stack,
      context: context,
      page: window.location.href,
    };
    
    currentSession.actions.push(entry);
    currentSession.stats.errors++;
    
    saveSession();
    
    return entry;
  };

  // ============================================
  // SESSION MANAGEMENT
  // ============================================
  const saveSession = () => {
    storage.set(KEY_CURRENT, currentSession);
  };

  const endSession = () => {
    currentSession.endTime = Date.now();
    currentSession.duration = currentSession.endTime - currentSession.startTime;
    
    // Move to sessions list
    const sessions = storage.get(KEY_SESSIONS) || [];
    sessions.push(currentSession);
    
    // Clean old sessions
    const cutoff = Date.now() - (CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const filtered = sessions.filter(s => s.startTime > cutoff);
    
    storage.set(KEY_SESSIONS, filtered);
    storage.set(KEY_CURRENT, null);
    
    log(`Session ended. Duration: ${formatDuration(currentSession.duration)}`, 'info');
    
    return currentSession;
  };

  const getSessions = () => {
    return storage.get(KEY_SESSIONS) || [];
  };

  // ============================================
  // ANALYTICS
  // ============================================
  const getStats = (period = 'all') => {
    const sessions = getSessions();
    let filteredSessions = sessions;
    
    const now = Date.now();
    if (period === 'today') {
      const start = new Date().setHours(0, 0, 0, 0);
      filteredSessions = sessions.filter(s => s.startTime >= start);
    } else if (period === 'week') {
      const start = now - (7 * 24 * 60 * 60 * 1000);
      filteredSessions = sessions.filter(s => s.startTime >= start);
    } else if (period === 'month') {
      const start = now - (30 * 24 * 60 * 60 * 1000);
      filteredSessions = sessions.filter(s => s.startTime >= start);
    }
    
    // Include current session
    filteredSessions = [...filteredSessions, currentSession];
    
    const totals = {
      sessions: filteredSessions.length,
      follows: 0,
      unfollows: 0,
      likes: 0,
      comments: 0,
      retweets: 0,
      dms: 0,
      errors: 0,
      totalActions: 0,
      totalDuration: 0,
    };
    
    for (const session of filteredSessions) {
      if (session.stats) {
        totals.follows += session.stats.follows || 0;
        totals.unfollows += session.stats.unfollows || 0;
        totals.likes += session.stats.likes || 0;
        totals.comments += session.stats.comments || 0;
        totals.retweets += session.stats.retweets || 0;
        totals.dms += session.stats.dms || 0;
        totals.errors += session.stats.errors || 0;
      }
      if (session.actions) {
        totals.totalActions += session.actions.length;
      }
      if (session.duration) {
        totals.totalDuration += session.duration;
      }
    }
    
    // Net follow change
    totals.netFollows = totals.follows - totals.unfollows;
    
    return totals;
  };

  const getDailyStats = () => {
    const sessions = [...getSessions(), currentSession];
    const dailyStats = {};
    
    for (const session of sessions) {
      if (!session.actions) continue;
      
      for (const action of session.actions) {
        const date = new Date(action.timestamp).toLocaleDateString();
        
        if (!dailyStats[date]) {
          dailyStats[date] = { follows: 0, unfollows: 0, likes: 0, comments: 0 };
        }
        
        if (action.action === 'follow') dailyStats[date].follows++;
        if (action.action === 'unfollow') dailyStats[date].unfollows++;
        if (action.action === 'like') dailyStats[date].likes++;
        if (action.action === 'comment') dailyStats[date].comments++;
      }
    }
    
    return dailyStats;
  };

  const getMostFollowed = (limit = 10) => {
    const sessions = [...getSessions(), currentSession];
    const followCounts = {};
    
    for (const session of sessions) {
      if (!session.actions) continue;
      
      for (const action of session.actions) {
        if (action.action === 'follow' && action.target) {
          followCounts[action.target] = (followCounts[action.target] || 0) + 1;
        }
      }
    }
    
    return Object.entries(followCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // ============================================
  // REPORTS
  // ============================================
  const printReport = (period = 'all') => {
    const stats = getStats(period);
    const periodLabel = period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1);
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📊 XActions Analytics - ${periodLabel.padEnd(10)}                     ║
╠═══════════════════════════════════════════════════════════╣
║  Sessions: ${String(stats.sessions).padEnd(10)}                              ║
║  Total Duration: ${formatDuration(stats.totalDuration).padEnd(15)}                   ║
╠───────────────────────────────────────────────────────────╣
║  ACTIONS                                                  ║
║    Follows:   ${String(stats.follows).padEnd(8)}  │  Unfollows:  ${String(stats.unfollows).padEnd(8)}   ║
║    Likes:     ${String(stats.likes).padEnd(8)}  │  Comments:   ${String(stats.comments).padEnd(8)}   ║
║    Retweets:  ${String(stats.retweets).padEnd(8)}  │  DMs:        ${String(stats.dms).padEnd(8)}   ║
╠───────────────────────────────────────────────────────────╣
║  Net Follow Change: ${(stats.netFollows >= 0 ? '+' : '') + stats.netFollows}                              ║
║  Errors: ${String(stats.errors).padEnd(5)}                                        ║
╚═══════════════════════════════════════════════════════════╝
    `);
  };

  const printDailyReport = () => {
    const daily = getDailyStats();
    const dates = Object.keys(daily).sort().reverse().slice(0, 7);
    
    console.log('\n📅 Daily Activity (Last 7 Days):');
    console.log('─'.repeat(50));
    console.log('Date           | Follows | Unfollows | Likes | Comments');
    console.log('─'.repeat(50));
    
    for (const date of dates) {
      const d = daily[date];
      console.log(
        `${date.padEnd(14)} | ${String(d.follows).padEnd(7)} | ${String(d.unfollows).padEnd(9)} | ${String(d.likes).padEnd(5)} | ${d.comments}`
      );
    }
    
    console.log('─'.repeat(50));
  };

  const printCurrentSession = () => {
    const duration = Date.now() - currentSession.startTime;
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📍 Current Session                                       ║
╠═══════════════════════════════════════════════════════════╣
║  Session ID: ${currentSession.id.padEnd(20)}                   ║
║  Running for: ${formatDuration(duration).padEnd(15)}                        ║
║  Actions: ${String(currentSession.actions.length).padEnd(10)}                              ║
╠───────────────────────────────────────────────────────────╣
║  Follows: ${String(currentSession.stats.follows).padEnd(5)}  │  Unfollows: ${String(currentSession.stats.unfollows).padEnd(5)}          ║
║  Likes: ${String(currentSession.stats.likes).padEnd(5)}    │  Comments: ${String(currentSession.stats.comments).padEnd(5)}           ║
║  Errors: ${String(currentSession.stats.errors).padEnd(5)}                                       ║
╚═══════════════════════════════════════════════════════════╝
    `);
  };

  // ============================================
  // EXPORT
  // ============================================
  const exportLogs = (period = 'all') => {
    let sessions = getSessions();
    
    const now = Date.now();
    if (period === 'today') {
      const start = new Date().setHours(0, 0, 0, 0);
      sessions = sessions.filter(s => s.startTime >= start);
    } else if (period === 'week') {
      const start = now - (7 * 24 * 60 * 60 * 1000);
      sessions = sessions.filter(s => s.startTime >= start);
    }
    
    // Include current session
    sessions = [...sessions, currentSession];
    
    const data = {
      exportDate: new Date().toISOString(),
      period: period,
      sessions: sessions,
      summary: getStats(period),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions-logs-${period}-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    log(`Exported ${sessions.length} sessions`, 'success');
  };

  const exportCSV = () => {
    const sessions = [...getSessions(), currentSession];
    
    const rows = ['timestamp,action,target,page'];
    
    for (const session of sessions) {
      if (!session.actions) continue;
      
      for (const action of session.actions) {
        if (action.type === 'error') continue;
        
        rows.push([
          new Date(action.timestamp).toISOString(),
          action.action,
          action.target || '',
          action.page || '',
        ].join(','));
      }
    }
    
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions-logs-${Date.now()}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    log('Exported logs to CSV', 'success');
  };

  // ============================================
  // CLEANUP
  // ============================================
  const clearLogs = () => {
    storage.set(KEY_SESSIONS, []);
    log('All logs cleared', 'success');
  };

  // ============================================
  // AUTO-SAVE
  // ============================================
  setInterval(() => {
    saveSession();
  }, CONFIG.SAVE_INTERVAL_SECONDS * 1000);

  // ============================================
  // WINDOW UNLOAD HANDLER
  // ============================================
  window.addEventListener('beforeunload', () => {
    endSession();
  });

  // ============================================
  // EXPORT API
  // ============================================
  window.XActions.Logger = {
    logAction,
    logError,
    endSession,
    getSessions,
    getStats,
    getDailyStats,
    printReport,
    printDailyReport,
    printCurrentSession,
    exportLogs,
    exportCSV,
    clearLogs,
    currentSession: () => currentSession,
  };

  // Global shortcuts
  window.stats = () => printReport('all');
  window.todayStats = () => printReport('today');
  window.weekStats = () => printReport('week');
  window.dailyStats = printDailyReport;
  window.sessionStats = printCurrentSession;
  window.exportLogs = exportLogs;

  log('✅ Session Logger loaded!', 'success');
  log(`Session ID: ${currentSession.id}`, 'info');
})();
