/**
 * ============================================================
 * 📈 Followers Growth Tracker
 * ============================================================
 * 
 * @name        followers-growth-tracker.js
 * @description Track follower growth over time with historical data
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to any profile page: https://x.com/USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Run periodically to track growth over time
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Storage key prefix
  storageKey: 'xactions_growth_tracker',
  
  // Maximum history entries to keep
  maxHistory: 365,
  
  // Show chart in console
  showChart: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function followersGrowthTracker() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📈 XActions — Followers Growth Tracker                      ║
║  Track follower growth over time                             ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Get username from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  if (!pathMatch) {
    console.error('❌ Please navigate to a profile page first!');
    console.log('👉 Example: https://x.com/elonmusk');
    return;
  }
  
  const username = pathMatch[1].toLowerCase();
  
  // Skip non-profile pages
  const invalidPaths = ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'];
  if (invalidPaths.includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  console.log(`📊 Tracking growth for @${username}\n`);

  // Extract follower/following counts from the page
  const getStats = () => {
    const stats = { followers: 0, following: 0 };
    
    // Try to find follower count
    const links = document.querySelectorAll('a[href$="/verified_followers"], a[href$="/followers"]');
    links.forEach(link => {
      const text = link.textContent;
      const match = text.match(/([\d,.]+[KMB]?)\s*Followers/i);
      if (match) {
        stats.followers = parseCount(match[1]);
      }
    });
    
    // Try to find following count
    const followingLinks = document.querySelectorAll('a[href$="/following"]');
    followingLinks.forEach(link => {
      const text = link.textContent;
      const match = text.match(/([\d,.]+[KMB]?)\s*Following/i);
      if (match) {
        stats.following = parseCount(match[1]);
      }
    });
    
    // Alternative: look for span elements with counts
    if (stats.followers === 0) {
      document.querySelectorAll('span').forEach(span => {
        const text = span.textContent;
        if (text.match(/^\d[\d,.]*[KMB]?$/) && span.closest('a[href*="followers"]')) {
          stats.followers = parseCount(text);
        }
        if (text.match(/^\d[\d,.]*[KMB]?$/) && span.closest('a[href*="following"]')) {
          stats.following = parseCount(text);
        }
      });
    }
    
    return stats;
  };

  const parseCount = (str) => {
    str = str.replace(/,/g, '');
    const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      if (match[2]) {
        num *= multipliers[match[2].toUpperCase()];
      }
      return Math.round(num);
    }
    return parseInt(str) || 0;
  };

  const storageKey = `${CONFIG.storageKey}_${username}`;

  const loadHistory = () => {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  };

  const saveHistory = (history) => {
    // Keep only last N entries
    const trimmed = history.slice(-CONFIG.maxHistory);
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  // Get current stats
  const currentStats = getStats();
  
  if (currentStats.followers === 0) {
    console.warn('⚠️ Could not detect follower count. Make sure you\'re on a profile page.');
    console.log('   Try scrolling up to make sure the profile header is visible.');
    return;
  }

  console.log(`📌 Current Stats:`);
  console.log(`   Followers: ${formatNumber(currentStats.followers)}`);
  console.log(`   Following: ${formatNumber(currentStats.following)}`);
  console.log(`   Ratio: ${(currentStats.followers / (currentStats.following || 1)).toFixed(2)}`);

  // Load history and add new entry
  const history = loadHistory();
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // Check if we already have an entry for today
  const todayIndex = history.findIndex(h => h.date.startsWith(today));
  
  const entry = {
    date: now,
    followers: currentStats.followers,
    following: currentStats.following
  };

  if (todayIndex >= 0) {
    history[todayIndex] = entry;
    console.log('\n📝 Updated today\'s entry');
  } else {
    history.push(entry);
    console.log('\n📝 Added new entry');
  }

  saveHistory(history);

  // Calculate growth metrics
  if (history.length >= 2) {
    console.log('\n📈 GROWTH ANALYSIS:\n');
    console.log('─'.repeat(50));

    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    const daysDiff = Math.max(1, Math.round((new Date(newest.date) - new Date(oldest.date)) / (1000 * 60 * 60 * 24)));

    const totalGrowth = newest.followers - oldest.followers;
    const dailyAvg = totalGrowth / daysDiff;
    const weeklyProjection = dailyAvg * 7;
    const monthlyProjection = dailyAvg * 30;

    console.log(`📅 Tracking period: ${daysDiff} days`);
    console.log(`   From: ${formatDate(oldest.date)} (${formatNumber(oldest.followers)} followers)`);
    console.log(`   To:   ${formatDate(newest.date)} (${formatNumber(newest.followers)} followers)`);
    console.log('');
    console.log(`📊 Total growth: ${totalGrowth >= 0 ? '+' : ''}${formatNumber(totalGrowth)} followers`);
    console.log(`   Daily average: ${dailyAvg >= 0 ? '+' : ''}${dailyAvg.toFixed(1)} followers/day`);
    console.log(`   Weekly projection: ${weeklyProjection >= 0 ? '+' : ''}${formatNumber(Math.round(weeklyProjection))}`);
    console.log(`   Monthly projection: ${monthlyProjection >= 0 ? '+' : ''}${formatNumber(Math.round(monthlyProjection))}`);

    // Recent changes
    if (sorted.length >= 2) {
      const prev = sorted[sorted.length - 2];
      const recentChange = newest.followers - prev.followers;
      console.log(`\n🔄 Since last check (${formatDate(prev.date)}):`);
      console.log(`   ${recentChange >= 0 ? '+' : ''}${recentChange} followers`);
    }

    // ASCII chart
    if (CONFIG.showChart && sorted.length >= 3) {
      console.log('\n📉 Growth Chart (last 14 days):\n');
      
      const recent = sorted.slice(-14);
      const values = recent.map(h => h.followers);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const height = 8;

      // Build chart
      const chart = [];
      for (let row = height; row >= 0; row--) {
        let line = '';
        const threshold = min + (range * row / height);
        
        if (row === height) {
          line = formatNumber(max).padStart(6) + ' ┤';
        } else if (row === 0) {
          line = formatNumber(min).padStart(6) + ' ┤';
        } else {
          line = '      ┤';
        }
        
        recent.forEach((h, i) => {
          const normalized = (h.followers - min) / range * height;
          if (normalized >= row) {
            line += '█';
          } else {
            line += ' ';
          }
        });
        
        chart.push(line);
      }
      
      chart.push('       └' + '─'.repeat(recent.length));
      chart.push('        ' + recent.map((h, i) => i % 3 === 0 ? formatDate(h.date).slice(0, 3) : '   ').join('').slice(0, recent.length));
      
      chart.forEach(line => console.log(line));
    }

    console.log('\n─'.repeat(50));
  } else {
    console.log('\n📸 First snapshot saved!');
    console.log('   Run this script again later to see growth metrics.');
  }

  console.log(`\n💾 History saved (${history.length} entries)`);
  console.log('   Run this script periodically to track growth over time.\n');

  // Export data option
  console.log('📥 To export your data, run: copy(localStorage.getItem("' + storageKey + '"))');

})();
