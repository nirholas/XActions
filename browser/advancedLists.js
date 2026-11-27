// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        advancedLists.js
 * @title       Advanced List Tools
 * @description Advanced List management: create, copy, pin, follow and export Lists.
 * @category    lists
 * @page        x.com/i/lists
 * @writes      true
 */
// browser/advancedLists.js
// Advanced list management for X/Twitter
// by nichxbt
// https://github.com/nirholas/XActions
//
// Features: delete list, edit list, remove member, follow/unfollow list,
// pin list, scrape list timeline, view subscribers, view lists you're on,
// share list.
//
// 1. Go to x.com (any page, or a specific list page for targeted actions)
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
// 4. Use window.XActions.advancedLists.<function>() to run features
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userCell: '[data-testid="UserCell"]',
    userName: '[data-testid="User-Name"]',
    confirm: '[data-testid="confirmationSheetConfirm"]',
    listFollow: '[data-testid="listFollow"]',
    listUnfollow: '[data-testid="listUnfollow"]',
    pinList: '[data-testid="pinList"]',
    share: '[data-testid="share"]',
    toast: '[data-testid="toast"]',
    backButton: '[data-testid="app-bar-back"]',
  };

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const getListIdFromUrl = (url) => {
    const match = (url || window.location.href).match(/\/lists\/(\d+)/);
    return match ? match[1] : null;
  };

  const ensureOnListPage = (listUrl) => {
    if (listUrl && window.location.href !== listUrl) {
      console.log(`🔄 Navigate to ${listUrl} first, then re-run.`);
      return false;
    }
    if (!getListIdFromUrl()) {
      console.log('❌ Not on a list page. Navigate to a list URL (x.com/i/lists/<id>) first.');
      return false;
    }
    return true;
  };

  const setInputValue = (input, value) => {
    input.focus();
    input.select?.();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, value);
  };

  // ─────────────────────────────────────────────────
  // 1. Delete List
  // ─────────────────────────────────────────────────
  const deleteList = async (listUrl) => {
    if (!ensureOnListPage(listUrl)) return;

    console.log('🔄 Deleting list...');

    // Open list settings via the more/edit menu
    const editBtn = $('[aria-label="More"]') || $('[data-testid="editList"]') || $('[aria-label="Edit List"]');
    if (!editBtn) {
      console.log('❌ Could not find list settings button. Make sure you are on the list page.');
      return;
    }

    editBtn.click();
    await sleep(1500);

    // Look for "Delete List" in the dropdown or settings
    const menuItems = $$('[role="menuitem"], [role="listitem"], [role="option"]');
    const deleteItem = menuItems.find(item =>
      item.textContent.toLowerCase().includes('delete list') ||
      item.textContent.toLowerCase().includes('delete')
    );

    if (deleteItem) {
      deleteItem.click();
      await sleep(1000);
    } else {
      // Try finding a delete button directly in settings
      const deleteBtn = $('[data-testid="deleteList"]') || $('button[style*="color: rgb(244"]');
      if (!deleteBtn) {
        console.log('❌ Could not find Delete option. Try opening list settings manually.');
        return;
      }
      deleteBtn.click();
      await sleep(1000);
    }

    // Confirm deletion
    const confirmBtn = await waitForSelector(SEL.confirm, 5000);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(2000);
      console.log('✅ List deleted successfully!');
    } else {
      console.log('⚠️ No confirmation dialog found. List may not have been deleted.');
    }
  };

  // ─────────────────────────────────────────────────
  // 2. Edit List
  // ─────────────────────────────────────────────────
  const editList = async (options = {}) => {
    const { name, description, isPrivate, listUrl } = options;

    if (!ensureOnListPage(listUrl)) return;

    if (!name && description === undefined && isPrivate === undefined) {
      console.log('⚠️ Provide at least one option: { name, description, isPrivate }');
      return;
    }

    console.log('🔄 Editing list...');

    // Open edit modal
    const editBtn = $('[aria-label="More"]') || $('[data-testid="editList"]') || $('[aria-label="Edit List"]');
    if (!editBtn) {
      console.log('❌ Could not find edit button.');
      return;
    }

    editBtn.click();
    await sleep(1500);

    // If we got a dropdown, look for "Edit List"
    const menuItems = $$('[role="menuitem"]');
    const editMenuItem = menuItems.find(item =>
      item.textContent.toLowerCase().includes('edit list') ||
      item.textContent.toLowerCase().includes('edit')
    );
    if (editMenuItem) {
      editMenuItem.click();
      await sleep(1500);
    }

    // Edit name
    if (name) {
      const nameInput = $('[data-testid="listNameInput"]') || $('input[name="name"]') || $('input[placeholder*="Name"]');
      if (nameInput) {
        setInputValue(nameInput, name);
        console.log(`✅ Name set to: "${name}"`);
        await sleep(500);
      } else {
        console.log('⚠️ Could not find name input.');
      }
    }

    // Edit description
    if (description !== undefined) {
      const descInput = $('[data-testid="listDescriptionInput"]') || $('textarea[name="description"]') || $('textarea[placeholder*="Description"]');
      if (descInput) {
        setInputValue(descInput, description);
        console.log(`✅ Description set to: "${description}"`);
        await sleep(500);
      } else {
        console.log('⚠️ Could not find description input.');
      }
    }

    // Toggle privacy
    if (isPrivate !== undefined) {
      const toggle = $('[data-testid="listPrivateToggle"]') || $('[role="switch"]') || $('input[type="checkbox"]');
      if (toggle) {
        const isCurrentlyPrivate = toggle.getAttribute('aria-checked') === 'true' || toggle.checked;
        if (isCurrentlyPrivate !== isPrivate) {
          toggle.click();
          console.log(`✅ Privacy set to: ${isPrivate ? 'private' : 'public'}`);
          await sleep(500);
        } else {
          console.log(`ℹ️ Privacy already set to: ${isPrivate ? 'private' : 'public'}`);
        }
      } else {
        console.log('⚠️ Could not find privacy toggle.');
      }
    }

    // Save changes
    const saveBtn = $('[data-testid="listSaveButton"]') || $('[data-testid="Profile_Save_Button"]');
    if (!saveBtn) {
      // Fallback: look for a "Done" or "Save" button
      const buttons = $$('button, [role="button"]');
      const saveFallback = buttons.find(b =>
        b.textContent.toLowerCase().includes('save') || b.textContent.toLowerCase().includes('done')
      );
      if (saveFallback) {
        saveFallback.click();
        await sleep(1500);
        console.log('✅ List changes saved!');
      } else {
        console.log('⚠️ Could not find save button. Changes may not be saved.');
      }
    } else {
      saveBtn.click();
      await sleep(1500);
      console.log('✅ List changes saved!');
    }
  };

  // ─────────────────────────────────────────────────
  // 3. Remove Member from List
  // ─────────────────────────────────────────────────
  const removeMember = async (username, listUrl) => {
    if (!ensureOnListPage(listUrl)) return;

    if (!username) {
      console.log('❌ Provide a username to remove. Usage: removeMember("username")');
      return;
    }

    const cleanUsername = username.replace('@', '').toLowerCase();
    console.log(`🔄 Removing @${cleanUsername} from list...`);

    // Navigate to list members tab
    const listId = getListIdFromUrl();
    const membersUrl = `https://x.com/i/lists/${listId}/members`;
    if (!window.location.href.includes('/members')) {
      window.location.href = membersUrl;
      console.log('🔄 Navigating to members page. Re-run after page loads.');
      return;
    }

    await sleep(2000);

    // Scroll and find the user
    let found = false;
    let scrollAttempts = 0;

    while (!found && scrollAttempts < 20) {
      const cells = $$(SEL.userCell);
      for (const cell of cells) {
        const linkEl = cell.querySelector('a[href^="/"]');
        const cellUsername = linkEl?.href?.replace(/^.*x\.com\//, '').split('/')[0]?.toLowerCase() || '';

        if (cellUsername === cleanUsername) {
          found = true;

          // Click the three-dot menu on the user cell
          const moreBtn = cell.querySelector('[data-testid="userActions"]') || cell.querySelector('[aria-label="More"]');
          if (moreBtn) {
            moreBtn.click();
            await sleep(1000);

            // Find "Remove from List" option
            const menuItems = $$('[role="menuitem"]');
            const removeItem = menuItems.find(item =>
              item.textContent.toLowerCase().includes('remove') ||
              item.textContent.toLowerCase().includes('remove from list')
            );

            if (removeItem) {
              removeItem.click();
              await sleep(1000);

              const confirmBtn = await waitForSelector(SEL.confirm, 3000);
              if (confirmBtn) confirmBtn.click();

              await sleep(1500);
              console.log(`✅ @${cleanUsername} removed from list!`);
            } else {
              console.log(`⚠️ Could not find "Remove" option for @${cleanUsername}.`);
            }
          } else {
            console.log(`⚠️ Could not find actions menu for @${cleanUsername}.`);
          }
          break;
        }
      }

      if (!found) {
        window.scrollBy(0, 500);
        await sleep(1500);
        scrollAttempts++;
      }
    }

    if (!found) {
      console.log(`❌ @${cleanUsername} not found in list members.`);
    }
  };

  // ─────────────────────────────────────────────────
  // 4. Follow / Subscribe to List
  // ─────────────────────────────────────────────────
  const followList = async (listUrl) => {
    if (!ensureOnListPage(listUrl)) return;

    console.log('🔄 Following list...');

    const followBtn = await waitForSelector(SEL.listFollow, 5000);
    if (!followBtn) {
      console.log('⚠️ Follow button not found. You may already be following this list.');
      return;
    }

    followBtn.click();
    await sleep(2000);
    console.log('✅ List followed!');
  };

  // ─────────────────────────────────────────────────
  // 5. Unfollow / Unsubscribe from List
  // ─────────────────────────────────────────────────
  const unfollowList = async (listUrl) => {
    if (!ensureOnListPage(listUrl)) return;

    console.log('🔄 Unfollowing list...');

    const unfollowBtn = await waitForSelector(SEL.listUnfollow, 5000);
    if (!unfollowBtn) {
      console.log('⚠️ Unfollow button not found. You may not be following this list.');
      return;
    }

    unfollowBtn.click();
    await sleep(1000);

    const confirmBtn = await waitForSelector(SEL.confirm, 3000);
    if (confirmBtn) confirmBtn.click();

    await sleep(2000);
    console.log('✅ List unfollowed!');
  };

  // ─────────────────────────────────────────────────
  // 6. Pin List
  // ─────────────────────────────────────────────────
  const pinList = async (listUrl) => {
    if (!ensureOnListPage(listUrl)) return;

    console.log('📌 Pinning list to home timeline...');

    const pinBtn = await waitForSelector(SEL.pinList, 5000);
    if (pinBtn) {
      pinBtn.click();
      await sleep(2000);
      console.log('✅ List pinned to your home timeline tabs!');
      return;
    }

    // Fallback: try the more menu
    const moreBtn = $('[aria-label="More"]');
    if (moreBtn) {
      moreBtn.click();
      await sleep(1000);

      const menuItems = $$('[role="menuitem"]');
      const pinItem = menuItems.find(item => item.textContent.toLowerCase().includes('pin'));
      if (pinItem) {
        pinItem.click();
        await sleep(2000);
        console.log('✅ List pinned to your home timeline tabs!');
        return;
      }
    }

    console.log('❌ Could not find pin option. The list may already be pinned.');
  };

  // ─────────────────────────────────────────────────
  // 7. Scrape List Timeline
  // ─────────────────────────────────────────────────
  const scrapeListTimeline = async (options = {}) => {
    const { listUrl, maxTweets = 100, format = 'json' } = options;

    if (!ensureOnListPage(listUrl)) return [];

    console.log(`🔄 Scraping list timeline (max ${maxTweets} tweets)...`);

    const tweets = [];
    const processedUrls = new Set();
    let noNewItems = 0;

    while (tweets.length < maxTweets && noNewItems < 5) {
      const prevCount = tweets.length;
      const tweetEls = $$(SEL.tweet);

      for (const el of tweetEls) {
        if (tweets.length >= maxTweets) break;

        const linkEl = el.querySelector('a[href*="/status/"]');
        const url = linkEl?.href || '';
        if (!url || processedUrls.has(url)) continue;
        processedUrls.add(url);

        const text = el.querySelector(SEL.tweetText)?.textContent || '';
        const authorEl = el.querySelector(SEL.userName);
        const authorLink = authorEl?.querySelector('a[href^="/"]');
        const author = authorLink?.href?.replace(/^.*x\.com\//, '').split('/')[0] || '';
        const displayName = authorEl?.querySelector('span')?.textContent || '';
        const time = el.querySelector('time')?.getAttribute('datetime') || '';

        const likes = el.querySelector('[data-testid="like"] span')?.textContent || '0';
        const reposts = el.querySelector('[data-testid="retweet"] span')?.textContent || '0';
        const replies = el.querySelector('[data-testid="reply"] span')?.textContent || '0';

        tweets.push({ url, author, displayName, text, time, likes, reposts, replies });
        console.log(`🔄 Scraped ${tweets.length}/${maxTweets} tweets...`);
      }

      if (tweets.length === prevCount) noNewItems++;
      else noNewItems = 0;

      window.scrollBy(0, 800);
      await sleep(2000);
    }

    console.log(`✅ Scraped ${tweets.length} tweets from list timeline.`);

    if (format === 'csv') {
      const header = 'url,author,displayName,text,time,likes,reposts,replies';
      const rows = tweets.map(t =>
        `"${t.url}","${t.author}","${t.displayName}","${t.text.replace(/"/g, '""')}","${t.time}","${t.likes}","${t.reposts}","${t.replies}"`
      );
      const csv = header + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `xactions-list-timeline-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      console.log('📥 Exported as CSV');
    } else {
      const blob = new Blob([JSON.stringify(tweets, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `xactions-list-timeline-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('📥 Exported as JSON');
    }

    return tweets;
  };

  // ─────────────────────────────────────────────────
  // 8. View List Subscribers
  // ─────────────────────────────────────────────────
  const viewListSubscribers = async (options = {}) => {
    const { listUrl, maxSubscribers = 200 } = options;

    if (!ensureOnListPage(listUrl)) return [];

    const listId = getListIdFromUrl();
    const subscribersUrl = `https://x.com/i/lists/${listId}/followers`;

    if (!window.location.href.includes('/followers')) {
      window.location.href = subscribersUrl;
      console.log('🔄 Navigating to subscribers page. Re-run after page loads.');
      return [];
    }

    console.log(`🔄 Scraping list subscribers (max ${maxSubscribers})...`);

    const subscribers = new Map();
    let noNewItems = 0;

    while (subscribers.size < maxSubscribers && noNewItems < 5) {
      const prevSize = subscribers.size;
      const cells = $$(SEL.userCell);

      for (const cell of cells) {
        const linkEl = cell.querySelector('a[href^="/"]');
        const username = linkEl?.href?.replace(/^.*x\.com\//, '').split('/')[0] || '';
        if (!username || subscribers.has(username)) continue;

        const nameEl = cell.querySelector(SEL.userName);
        const displayName = nameEl?.querySelector('span')?.textContent || '';
        const bioEl = cell.querySelector('[dir="auto"]:not([data-testid])');
        const bio = bioEl?.textContent || '';
        const isVerified = !!cell.querySelector('[data-testid="icon-verified"]');

        subscribers.set(username, { username, displayName, bio, isVerified });
      }

      if (subscribers.size === prevSize) noNewItems++;
      else noNewItems = 0;

      window.scrollBy(0, 500);
      await sleep(1500);
    }

    const data = [...subscribers.values()];
    console.log(`✅ Found ${data.length} subscribers.`);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xactions-list-subscribers-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    console.log('📥 Subscribers exported as JSON');

    return data;
  };

  // ─────────────────────────────────────────────────
  // 9. View "Lists You're On"
  // ─────────────────────────────────────────────────
  const viewListsYoureOn = async (options = {}) => {
    const { maxLists = 100 } = options;

    // Navigate to the "Member of" page
    const memberOfUrl = 'https://x.com/i/lists/memberships';
    if (!window.location.href.includes('/memberships')) {
      window.location.href = memberOfUrl;
      console.log('🔄 Navigating to "Lists you\'re on" page. Re-run after page loads.');
      return [];
    }

    console.log(`🔄 Scraping lists you're a member of (max ${maxLists})...`);

    const lists = new Map();
    let noNewItems = 0;

    while (lists.size < maxLists && noNewItems < 5) {
      const prevSize = lists.size;

      // List entries appear as links to /i/lists/<id>
      const listLinks = $$('a[href*="/i/lists/"]');
      for (const link of listLinks) {
        const href = link.href || '';
        const listId = href.match(/\/lists\/(\d+)/)?.[1];
        if (!listId || lists.has(listId)) continue;

        const container = link.closest('[data-testid]') || link.parentElement;
        const name = container?.querySelector('span')?.textContent || link.textContent?.trim() || '';
        const description = container?.querySelector('[dir="auto"]:not([data-testid])')?.textContent || '';

        lists.set(listId, {
          listId,
          name: name.split('\n')[0].trim(),
          url: `https://x.com/i/lists/${listId}`,
          description,
        });
      }

      if (lists.size === prevSize) noNewItems++;
      else noNewItems = 0;

      window.scrollBy(0, 500);
      await sleep(1500);
    }

    const data = [...lists.values()];
    console.log(`✅ Found ${data.length} lists you're on.`);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xactions-lists-youre-on-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    console.log('📥 Lists exported as JSON');

    return data;
  };

  // ─────────────────────────────────────────────────
  // 10. Share List
  // ─────────────────────────────────────────────────
  const shareList = async (options = {}) => {
    const { listUrl, method = 'clipboard' } = options;

    if (!ensureOnListPage(listUrl)) return;

    const listId = getListIdFromUrl();
    const url = `https://x.com/i/lists/${listId}`;

    if (method === 'clipboard') {
      try {
        await navigator.clipboard.writeText(url);
        console.log(`✅ List URL copied to clipboard: ${url}`);
      } catch {
        // Fallback for clipboard permission issues
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        console.log(`✅ List URL copied to clipboard: ${url}`);
      }
    } else if (method === 'dm') {
      console.log('🔄 Opening share via DM...');

      // Click the share button on the list page
      const shareBtn = $(SEL.share) || $('[aria-label="Share"]');
      if (shareBtn) {
        shareBtn.click();
        await sleep(1000);

        // Look for "Send via Direct Message" option
        const menuItems = $$('[role="menuitem"]');
        const dmItem = menuItems.find(item =>
          item.textContent.toLowerCase().includes('direct message') ||
          item.textContent.toLowerCase().includes('send via')
        );

        if (dmItem) {
          dmItem.click();
          await sleep(1500);
          console.log('✅ DM share dialog opened. Select a recipient to send.');
        } else {
          console.log('⚠️ Could not find DM share option.');
          console.log(`ℹ️ List URL: ${url}`);
        }
      } else {
        console.log('⚠️ Share button not found.');
        console.log(`ℹ️ List URL: ${url}`);
      }
    } else {
      console.log(`ℹ️ List URL: ${url}`);
    }

    return url;
  };

  // ─────────────────────────────────────────────────
  // Expose on window.XActions.advancedLists
  // ─────────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.advancedLists = {
    deleteList,
    editList,
    removeMember,
    followList,
    unfollowList,
    pinList,
    scrapeListTimeline,
    viewListSubscribers,
    viewListsYoureOn,
    shareList,
  };

  // ─────────────────────────────────────────────────
  // Menu
  // ─────────────────────────────────────────────────
  const W = 62;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  📋 ADVANCED LIST MANAGEMENT — XActions' + ' '.repeat(W - 41) + '║');
  console.log('║  by nichxbt' + ' '.repeat(W - 14) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  Available commands:' + ' '.repeat(W - 22) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  1.  deleteList()' + ' '.repeat(W - 20) + '║');
  console.log('║      Delete the current list with confirmation' + ' '.repeat(W - 49) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  2.  editList({ name, description, isPrivate })' + ' '.repeat(W - 50) + '║');
  console.log('║      Edit list name, description, or privacy' + ' '.repeat(W - 47) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  3.  removeMember("username")' + ' '.repeat(W - 31) + '║');
  console.log('║      Remove a user from the current list' + ' '.repeat(W - 43) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  4.  followList()' + ' '.repeat(W - 20) + '║');
  console.log('║      Follow/subscribe to the current list' + ' '.repeat(W - 44) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  5.  unfollowList()' + ' '.repeat(W - 22) + '║');
  console.log('║      Unfollow/unsubscribe from the current list' + ' '.repeat(W - 50) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  6.  pinList()' + ' '.repeat(W - 16) + '║');
  console.log('║      Pin list to your home timeline tabs' + ' '.repeat(W - 43) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  7.  scrapeListTimeline({ maxTweets, format })' + ' '.repeat(W - 49) + '║');
  console.log('║      Scrape tweets from list timeline' + ' '.repeat(W - 40) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  8.  viewListSubscribers({ maxSubscribers })' + ' '.repeat(W - 47) + '║');
  console.log('║      Scrape who subscribes to this list' + ' '.repeat(W - 42) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  9.  viewListsYoureOn({ maxLists })' + ' '.repeat(W - 38) + '║');
  console.log('║      Scrape all lists you are a member of' + ' '.repeat(W - 45) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  10. shareList({ method: "clipboard"|"dm" })' + ' '.repeat(W - 47) + '║');
  console.log('║      Copy list URL or share via DM' + ' '.repeat(W - 37) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  Usage: XActions.advancedLists.followList()' + ' '.repeat(W - 46) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
})();
