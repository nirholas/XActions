// X Pro (TweetDeck) — by nichxbt
// https://github.com/nirholas/XActions
// Navigate to X Pro / TweetDeck, setup monitoring columns, and multi-column view helpers.
//
// HOW TO USE:
// 1. Go to https://x.com or https://pro.x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    autoNavigate: true,              // Navigate to X Pro automatically
    setupColumns: false,             // Attempt to add default monitoring columns
    columnPresets: [                  // Column types to add when setupColumns = true
      'home',
      'notifications',
      'mentions',
      'search',
    ],
    searchTerms: [                   // Search columns to add (when setupColumns = true)
      // 'from:nichxbt',
      // '#xactions',
    ],
    showColumnInfo: true,            // Display info about existing columns
    delayBetweenActions: 2000,       // ms between UI actions
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_xpro';

  const SELECTORS = {
    proLink: 'a[href*="pro.x.com"]',
    column: '[data-testid="column"]',
    columnHeader: '[data-testid="columnHeader"]',
    addColumn: '[data-testid="addColumn"]',
    columnSettings: '[data-testid="columnSettings"]',
    columnContent: '[data-testid="columnContent"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    sidebarNav: 'nav[role="navigation"]',
    deckContainer: '[data-testid="deck"], .deck-container, #deck',
    tweetInColumn: 'article[data-testid="tweet"]',
  };

  const COLUMN_TYPES = {
    home: { name: 'Home Timeline', icon: '🏠', description: 'Your main timeline' },
    notifications: { name: 'Notifications', icon: '🔔', description: 'All notifications' },
    mentions: { name: 'Mentions', icon: '💬', description: 'Posts that mention you' },
    messages: { name: 'Messages', icon: '✉️', description: 'Direct messages' },
    search: { name: 'Search', icon: '🔍', description: 'Search results for a query' },
    list: { name: 'List', icon: '📋', description: 'Posts from a specific list' },
    likes: { name: 'Likes', icon: '❤️', description: 'Posts you\'ve liked' },
    trending: { name: 'Trending', icon: '📈', description: 'Trending topics' },
    followers: { name: 'Followers', icon: '👥', description: 'New follower activity' },
  };

  const checkXProAccess = () => {
    console.log('🔍 Checking X Pro access...');

    const isPro = window.location.hostname.includes('pro.x.com')
      || window.location.pathname.includes('/i/tweetdeck');

    if (isPro) {
      console.log('✅ You are on X Pro.');
      return true;
    }

    const proLink = document.querySelector(SELECTORS.proLink);
    if (proLink) {
      console.log('✅ X Pro link found — you have access.');
      return true;
    }

    console.log('⚠️ X Pro access not detected.');
    console.log('💡 X Pro requires Premium+ subscription ($16/mo).');
    console.log('   Subscribe at: https://x.com/i/premium_sign_up');
    return false;
  };

  const navigateToXPro = async () => {
    console.log('🚀 Navigating to X Pro...');

    const proLink = document.querySelector(SELECTORS.proLink);
    if (proLink) {
      proLink.click();
      console.log('✅ Clicked X Pro link.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ X Pro link not found. Opening directly...');
      window.open('https://pro.x.com', '_blank');
      await sleep(CONFIG.delayBetweenActions);
    }
  };

  const scanExistingColumns = () => {
    console.log('📊 Scanning existing columns...');

    const columns = document.querySelectorAll(
      `${SELECTORS.column}, [class*="column"], section[aria-label]`
    );

    if (columns.length === 0) {
      console.log('ℹ️ No columns detected. This may not be the X Pro interface.');
      return [];
    }

    console.log(`\n📋 Found ${columns.length} column(s):`);
    console.log('─'.repeat(50));

    const columnData = [];
    columns.forEach((col, i) => {
      const header = col.querySelector(
        `${SELECTORS.columnHeader}, h2, [role="heading"]`
      );
      const name = header?.textContent?.trim()
        || col.getAttribute('aria-label')
        || `Column ${i + 1}`;

      const tweets = col.querySelectorAll(SELECTORS.tweetInColumn);
      const tweetCount = tweets.length;

      console.log(`   ${i + 1}. 📌 ${name} (${tweetCount} posts visible)`);

      columnData.push({ index: i, name, tweetCount });
    });

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        scannedAt: new Date().toISOString(),
        columns: columnData,
      }));
    } catch (e) {
      // Silent fail
    }

    return columnData;
  };

  const addSearchColumn = async (query) => {
    console.log(`🔍 Adding search column for: "${query}"...`);

    const addBtn = document.querySelector(SELECTORS.addColumn)
      || document.querySelector('button[aria-label*="Add column"]')
      || document.querySelector('button[aria-label*="add"]');

    if (addBtn) {
      addBtn.click();
      await sleep(CONFIG.delayBetweenActions);

      const searchOption = [...document.querySelectorAll('[role="menuitem"], [role="option"], button')]
        .find(el => el.textContent.toLowerCase().includes('search'));

      if (searchOption) {
        searchOption.click();
        await sleep(CONFIG.delayBetweenActions);

        const searchInput = document.querySelector(SELECTORS.searchInput)
          || document.querySelector('input[type="text"]');

        if (searchInput) {
          searchInput.focus();
          searchInput.value = query;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(1000);

          const submitBtn = searchInput.closest('form')?.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.click();
          } else {
            searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }

          console.log(`✅ Search column added for: "${query}"`);
          await sleep(CONFIG.delayBetweenActions);
          return true;
        }
      }
    }

    console.log(`⚠️ Could not add search column automatically. Add it manually in X Pro.`);
    return false;
  };

  const showColumnGuide = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('📚 X PRO COLUMN TYPES');
    console.log('══════════════════════════════════════════════════\n');

    for (const [key, info] of Object.entries(COLUMN_TYPES)) {
      console.log(`   ${info.icon} ${info.name} — ${info.description}`);
    }

    console.log('\n💡 Tips for effective monitoring:');
    console.log('   • Keep 4-6 columns for best readability');
    console.log('   • Use Search columns for tracking keywords or competitors');
    console.log('   • Pin important columns to the left');
    console.log('   • Use List columns to group accounts by topic');
    console.log('══════════════════════════════════════════════════\n');
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('📊 XActions — X Pro (TweetDeck)');
    console.log('═══════════════════════════════════════════\n');

    const hasAccess = checkXProAccess();
    await sleep(1000);

    const isPro = window.location.hostname.includes('pro.x.com');

    if (!isPro && CONFIG.autoNavigate) {
      await navigateToXPro();
      console.log('\n💡 Run this script again on pro.x.com to manage columns.');
      return;
    }

    if (isPro) {
      showColumnGuide();

      if (CONFIG.showColumnInfo) {
        scanExistingColumns();
        await sleep(1000);
      }

      if (CONFIG.setupColumns) {
        console.log('\n🔧 Setting up monitoring columns...');
        for (const term of CONFIG.searchTerms) {
          await addSearchColumn(term);
        }
      }
    } else {
      if (!hasAccess) {
        console.log('\n❌ X Pro requires Premium+ subscription.');
        return;
      }

      showColumnGuide();
      console.log('💡 Navigate to https://pro.x.com to use X Pro.');
    }

    console.log('\n✅ X Pro script complete.');
  };

  run();
})();
