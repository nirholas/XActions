// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Followers Scraper
 * Export your followers list to JSON/CSV
 * 
 * HOW TO USE:
 * 1. Go to x.com/USERNAME/followers
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste this script and press Enter
 * 
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    MAX_FOLLOWERS: 5000,
    SCROLL_DELAY: 1500,
    MAX_SCROLLS: 1000,
    FORMAT: 'both', // 'json', 'csv', 'both'
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // When X throttles a long list it stops loading and shows a Retry button.
  // Clicking it resumes the list; without this a throttled list looked done.
  const clickRetryIfPresent = () => {
    const btn = Array.from(document.querySelectorAll('[role="button"]'))
      .find(b => /^(retry|try again)$/i.test((b.innerText || '').trim()));
    if (btn) { btn.click(); return true; }
    return false;
  };

  // A spinner means the next page is still on its way, not that the list ended.
  const isLoading = () => !!document.querySelector('[role="progressbar"]');

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const extractBio = (cell) => {
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    const text = autoDir?.textContent?.trim();
    if (text && text.length >= 10 && !text.startsWith('@')) return text;
    return '';
  };

  const extractUser = (cell) => {
    try {
      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const handleEl = cell.querySelector('a[href^="/"]');
      const followsYou = !!cell.querySelector('[data-testid="userFollowIndicator"]');
      
      const href = handleEl?.getAttribute('href') || '';
      const handle = href.replace('/', '').split('/')[0];
      
      return {
        handle,
        displayName: nameEl?.textContent || '',
        bio: extractBio(cell),
        followsYou,
        profileUrl: `https://x.com/${handle}`,
      };
    } catch (e) {
      return null;
    }
  };

  const run = async () => {
    if (!window.location.pathname.includes('/followers')) {
      console.error('❌ Please go to x.com/USERNAME/followers first!');
      return;
    }

    const username = window.location.pathname.split('/')[1];
    console.log(`👥 Scraping followers of @${username}...`);

    const followers = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (followers.size < CONFIG.MAX_FOLLOWERS && noNewCount < 5) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      const beforeCount = followers.size;

      cells.forEach(cell => {
        const user = extractUser(cell);
        if (user && user.handle && !followers.has(user.handle)) {
          followers.set(user.handle, user);
        }
      });

      const added = followers.size - beforeCount;
      if (added > 0) {
        console.log(`👥 Collected ${followers.size} followers...`);
        noNewCount = 0;
      } else if (clickRetryIfPresent()) {
        console.log('🔁 X paused the list with a Retry button, clicked it...');
        await sleep(CONFIG.SCROLL_DELAY * 2);
      } else if (!isLoading()) {
        noNewCount++;
      }

      // One screen at a time: X virtualizes the list, so a fixed jump can skip
      // rows that are rendered and recycled between two passes.
      window.scrollBy(0, window.innerHeight * 0.8);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;

      if (scrolls > CONFIG.MAX_SCROLLS) break;
    }

    if (noNewCount >= 5 && followers.size < CONFIG.MAX_FOLLOWERS) {
      console.warn(`⚠️ X stopped serving new rows after ${followers.size}. Wait a few minutes and run again to continue past a rate limit.`);
    }

    const followerList = Array.from(followers.values());

    console.log('\n' + '='.repeat(60));
    console.log(`👥 SCRAPED ${followerList.length} FOLLOWERS`);
    console.log('='.repeat(60) + '\n');

    followerList.slice(0, 5).forEach((f, i) => {
      console.log(`${i + 1}. @${f.handle} - ${f.displayName}`);
    });
    if (followerList.length > 5) {
      console.log(`   ... and ${followerList.length - 5} more\n`);
    }

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      download(JSON.stringify(followerList, null, 2), `${username}_followers_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded followers.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,DisplayName,Bio,FollowsYou,ProfileURL',
        ...followerList.map(f => 
          `"@${f.handle}","${f.displayName.replace(/"/g, '""')}","${f.bio.replace(/"/g, '""').replace(/\n/g, ' ')}",${f.followsYou},"${f.profileUrl}"`
        )
      ].join('\n');
      download(csv, `${username}_followers_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded followers.csv');
    }

    window.scrapedFollowers = followerList;
    console.log('\n✅ Done! Access data: window.scrapedFollowers');
  };

  run();
})();
