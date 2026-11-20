// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// browser/communityManager.js
// Community management for X/Twitter
// by nichxbt
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min = 1000, max = 3000) => sleep(min + Math.random() * (max - min));

  // ══════════════════════════════════════════════════════════
  // 🔧 Selectors
  // ══════════════════════════════════════════════════════════

  const SEL = {
    communitiesNav: 'a[aria-label="Communities"]',
    communityLinks: 'a[href^="/i/communities/"]',
    communityName: '[data-testid="communityName"]',
    joinedButton: 'button[aria-label^="Joined"]',
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    confirmDialog: '[data-testid="confirmationSheetConfirm"]',
    userCell: '[data-testid="UserCell"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    toast: '[data-testid="toast"]',
    userActions: '[data-testid="userActions"]',
    appBarBack: '[data-testid="app-bar-back"]',
  };

  // ══════════════════════════════════════════════════════════
  // 🛠️ Helpers
  // ══════════════════════════════════════════════════════════

  const log = (emoji, ...args) => console.log(emoji, '[CommunityManager]', ...args);

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(300);
    }
    return null;
  };

  const waitForSelectorAll = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) return els;
      await sleep(300);
    }
    return [];
  };

  const typeIntoField = async (element, text) => {
    element.focus();
    await sleep(200);
    // Use execCommand for contenteditable fields, input event for regular inputs
    if (element.getAttribute('contenteditable') !== null || element.role === 'textbox') {
      document.execCommand('insertText', false, text);
    } else {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(element, text);
      } else {
        element.value = text;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await sleep(300);
  };

  const clickButton = async (selector, label = 'button') => {
    const btn = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!btn) {
      log('❌', `${label} not found`);
      return false;
    }
    btn.click();
    await sleep(500);
    return true;
  };

  const confirmAction = async () => {
    await sleep(500);
    const confirm = document.querySelector(SEL.confirmDialog);
    if (confirm) {
      confirm.click();
      await sleep(500);
      return true;
    }
    return false;
  };

  const navigateTo = async (url) => {
    window.location.href = url;
    await sleep(3000);
  };

  const scrollToBottom = async () => {
    window.scrollBy(0, 800);
    await sleep(2000);
  };

  const extractCommunityId = (urlOrId) => {
    if (/^\d+$/.test(urlOrId)) return urlOrId;
    const match = urlOrId.match(/communities\/(\d+)/);
    return match ? match[1] : null;
  };

  // ══════════════════════════════════════════════════════════
  // 1. 🏗️ Create Community
  // ══════════════════════════════════════════════════════════

  const createCommunity = async (options = {}) => {
    const {
      name = '',
      description = '',
      rules = [],
      isPrivate = false,
    } = options;

    if (!name) {
      log('❌', 'Community name is required. Usage: createCommunity({ name: "My Community", description: "...", rules: ["Rule 1"], isPrivate: false })');
      return null;
    }

    log('🔄', `Creating community: "${name}"...`);

    // Navigate to communities page
    await navigateTo('https://x.com/i/communities');

    // Look for create button
    const createBtn = await waitForSelector('a[href="/i/communities/create"], [data-testid="createCommunity"], [aria-label="Create Community"], [aria-label="Create a Community"]');
    if (!createBtn) {
      // Try finding it via text content
      const buttons = document.querySelectorAll('button, a');
      let found = false;
      for (const btn of buttons) {
        if (btn.textContent?.toLowerCase().includes('create')) {
          btn.click();
          found = true;
          break;
        }
      }
      if (!found) {
        log('❌', 'Create community button not found. Make sure you have access to community creation.');
        return null;
      }
    } else {
      createBtn.click();
    }
    await sleep(2000);

    // Fill in community name
    const nameInput = await waitForSelector('input[name="name"], input[placeholder*="name" i], [data-testid="communityNameInput"]');
    if (nameInput) {
      await typeIntoField(nameInput, name);
      log('✅', `Set community name: "${name}"`);
    } else {
      log('⚠️', 'Could not find name input field');
    }
    await randomDelay();

    // Fill in description
    if (description) {
      const descInput = await waitForSelector('textarea[name="description"], textarea[placeholder*="description" i], [data-testid="communityDescriptionInput"]');
      if (descInput) {
        await typeIntoField(descInput, description);
        log('✅', `Set description: "${description.substring(0, 50)}..."`);
      } else {
        log('⚠️', 'Could not find description input field');
      }
      await randomDelay();
    }

    // Set privacy
    if (isPrivate) {
      const privacyToggle = document.querySelector('[data-testid="communityPrivacyToggle"], [aria-label*="private" i], [aria-label*="Private" i]');
      if (privacyToggle) {
        privacyToggle.click();
        await sleep(500);
        log('✅', 'Set community to private');
      } else {
        log('⚠️', 'Could not find privacy toggle');
      }
    }

    // Add rules
    if (rules.length > 0) {
      for (const rule of rules) {
        const addRuleBtn = document.querySelector('[data-testid="addRuleButton"], button[aria-label*="Add rule" i]');
        if (addRuleBtn) {
          addRuleBtn.click();
          await sleep(500);
          const ruleInput = document.querySelector('input[name="rule"], input[placeholder*="rule" i], [data-testid="ruleInput"]');
          if (ruleInput) {
            await typeIntoField(ruleInput, rule);
            log('✅', `Added rule: "${rule}"`);
          }
          await randomDelay();
        }
      }
    }

    // Submit creation
    const submitBtn = document.querySelector('button[data-testid="createCommunitySubmit"], button[type="submit"]');
    if (submitBtn) {
      submitBtn.click();
      await sleep(3000);
      log('✅', `Community "${name}" created successfully!`);
    } else {
      // Try any primary/prominent button with create text
      const allBtns = document.querySelectorAll('button');
      for (const btn of allBtns) {
        if (btn.textContent?.toLowerCase().includes('create') && !btn.disabled) {
          btn.click();
          await sleep(3000);
          log('✅', `Community "${name}" creation submitted`);
          break;
        }
      }
    }

    return { name, description, isPrivate };
  };

  // ══════════════════════════════════════════════════════════
  // 2. ⚙️ Community Settings
  // ══════════════════════════════════════════════════════════

  const editCommunitySettings = async (communityIdOrUrl, settings = {}) => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL. Usage: editCommunitySettings("123456", { name: "New Name", description: "..." })');
      return false;
    }

    const {
      name,
      description,
      rules,
      joinRequirement,
    } = settings;

    log('🔄', `Editing settings for community ${communityId}...`);

    // Navigate to community settings/admin page
    await navigateTo(`https://x.com/i/communities/${communityId}`);
    await sleep(2000);

    // Look for settings/admin button
    const settingsBtn = await waitForSelector('[data-testid="communitySettings"], [aria-label="Community settings"], [aria-label="Settings"], button[aria-label*="More"]');
    if (settingsBtn) {
      settingsBtn.click();
      await sleep(1500);
    } else {
      log('⚠️', 'Settings button not found, trying admin page...');
      await navigateTo(`https://x.com/i/communities/${communityId}/admin`);
      await sleep(2000);
    }

    // Edit name
    if (name) {
      const nameInput = await waitForSelector('input[name="name"], [data-testid="communityNameInput"]');
      if (nameInput) {
        nameInput.select?.();
        await sleep(200);
        await typeIntoField(nameInput, name);
        log('✅', `Updated name to: "${name}"`);
      }
      await randomDelay();
    }

    // Edit description
    if (description) {
      const descInput = await waitForSelector('textarea[name="description"], [data-testid="communityDescriptionInput"]');
      if (descInput) {
        descInput.select?.();
        await sleep(200);
        await typeIntoField(descInput, description);
        log('✅', `Updated description`);
      }
      await randomDelay();
    }

    // Edit rules
    if (rules && Array.isArray(rules)) {
      const rulesSection = document.querySelector('[data-testid="communityRules"], [aria-label*="Rules"]');
      if (rulesSection) {
        rulesSection.click();
        await sleep(1000);
      }
      for (const rule of rules) {
        const addRuleBtn = document.querySelector('[data-testid="addRuleButton"], button[aria-label*="Add rule" i]');
        if (addRuleBtn) {
          addRuleBtn.click();
          await sleep(500);
          const ruleInput = document.querySelector('input[name="rule"], [data-testid="ruleInput"]');
          if (ruleInput) {
            await typeIntoField(ruleInput, rule);
            log('✅', `Added rule: "${rule}"`);
          }
          await randomDelay();
        }
      }
    }

    // Set join requirement
    if (joinRequirement) {
      const joinReqOption = document.querySelector(`[data-testid="joinRequirement_${joinRequirement}"], [aria-label*="${joinRequirement}" i]`);
      if (joinReqOption) {
        joinReqOption.click();
        await sleep(500);
        log('✅', `Set join requirement: ${joinRequirement}`);
      }
    }

    // Save changes
    const saveBtn = document.querySelector('button[data-testid="communitySave"], button[type="submit"]');
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.click();
      await sleep(2000);
      log('✅', `Community settings saved for ${communityId}`);
    } else {
      const allBtns = document.querySelectorAll('button');
      for (const btn of allBtns) {
        if ((btn.textContent?.toLowerCase().includes('save') || btn.textContent?.toLowerCase().includes('done')) && !btn.disabled) {
          btn.click();
          await sleep(2000);
          log('✅', 'Settings saved');
          break;
        }
      }
    }

    return true;
  };

  // ══════════════════════════════════════════════════════════
  // 3. 📝 Post in Community
  // ══════════════════════════════════════════════════════════

  const postInCommunity = async (communityIdOrUrl, tweetText) => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL. Usage: postInCommunity("123456", "Hello community!")');
      return false;
    }
    if (!tweetText) {
      log('❌', 'Tweet text is required');
      return false;
    }

    log('🔄', `Posting in community ${communityId}...`);

    // Navigate to community page
    await navigateTo(`https://x.com/i/communities/${communityId}`);
    await sleep(2000);

    // Find the compose area or compose button within the community
    let textarea = await waitForSelector(SEL.tweetTextarea);

    if (!textarea) {
      // Try clicking compose button first
      const composeBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"], [aria-label="Compose tweet"], [aria-label="Post"]');
      if (composeBtn) {
        composeBtn.click();
        await sleep(1500);
        textarea = await waitForSelector(SEL.tweetTextarea);
      }
    }

    if (!textarea) {
      log('❌', 'Could not find tweet compose area in community');
      return false;
    }

    // Type the tweet
    await typeIntoField(textarea, tweetText);
    log('🔄', `Typed: "${tweetText.substring(0, 80)}${tweetText.length > 80 ? '...' : ''}"`);
    await randomDelay();

    // Click post button
    const postBtn = await waitForSelector(SEL.tweetButton);
    if (!postBtn) {
      log('❌', 'Post button not found');
      return false;
    }

    postBtn.click();
    await sleep(2000);

    // Check for toast confirmation
    const toast = document.querySelector(SEL.toast);
    if (toast) {
      log('✅', `Posted in community ${communityId}: "${tweetText.substring(0, 50)}..."`);
    } else {
      log('✅', `Post submitted to community ${communityId}`);
    }

    return true;
  };

  // ══════════════════════════════════════════════════════════
  // 4. 🛡️ Moderate Community
  // ══════════════════════════════════════════════════════════

  const moderateCommunity = async (communityIdOrUrl, action, targetId = null) => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL');
      return false;
    }

    const validActions = ['removePost', 'banMember', 'unbanMember', 'reviewReported'];
    if (!validActions.includes(action)) {
      log('❌', `Invalid action. Valid actions: ${validActions.join(', ')}`);
      log('❌', 'Usage: moderateCommunity("123456", "removePost", "tweetId") or moderateCommunity("123456", "reviewReported")');
      return false;
    }

    log('🔄', `Performing moderation action: ${action} on community ${communityId}...`);

    switch (action) {
      case 'removePost': {
        if (!targetId) {
          log('❌', 'Post/tweet ID required for removePost');
          return false;
        }
        // Navigate to the specific tweet
        await navigateTo(`https://x.com/i/communities/${communityId}/status/${targetId}`);
        await sleep(2000);

        // Find the tweet's more menu
        const tweet = await waitForSelector(SEL.tweet);
        if (!tweet) {
          log('❌', 'Tweet not found');
          return false;
        }

        const moreBtn = tweet.querySelector('[data-testid="caret"], [aria-label="More"]');
        if (moreBtn) {
          moreBtn.click();
          await sleep(800);

          // Look for remove/delete option in dropdown
          const menuItems = document.querySelectorAll('[role="menuitem"], [data-testid="Dropdown"] [role="listitem"]');
          for (const item of menuItems) {
            if (item.textContent?.toLowerCase().includes('remove') || item.textContent?.toLowerCase().includes('delete')) {
              item.click();
              await sleep(500);
              await confirmAction();
              log('✅', `Post ${targetId} removed from community`);
              return true;
            }
          }
          log('❌', 'Remove option not found in menu. You may not have moderator permissions.');
        }
        return false;
      }

      case 'banMember': {
        if (!targetId) {
          log('❌', 'Username required for banMember');
          return false;
        }
        await navigateTo(`https://x.com/i/communities/${communityId}/members`);
        await sleep(2000);

        // Find the user in member list
        const userCells = await waitForSelectorAll(SEL.userCell);
        for (const cell of userCells) {
          const usernameEl = cell.querySelector('a[href*="/' + targetId + '"], [dir="ltr"]');
          if (usernameEl && usernameEl.textContent?.toLowerCase().includes(targetId.toLowerCase())) {
            // Click user actions
            const actionsBtn = cell.querySelector(SEL.userActions) || cell.querySelector('[aria-label="More"]');
            if (actionsBtn) {
              actionsBtn.click();
              await sleep(800);
              const menuItems = document.querySelectorAll('[role="menuitem"]');
              for (const item of menuItems) {
                if (item.textContent?.toLowerCase().includes('ban') || item.textContent?.toLowerCase().includes('remove from community')) {
                  item.click();
                  await sleep(500);
                  await confirmAction();
                  log('✅', `Banned @${targetId} from community ${communityId}`);
                  return true;
                }
              }
            }
          }
        }
        log('❌', `Could not find or ban @${targetId}`);
        return false;
      }

      case 'unbanMember': {
        if (!targetId) {
          log('❌', 'Username required for unbanMember');
          return false;
        }
        // Navigate to banned members list
        await navigateTo(`https://x.com/i/communities/${communityId}/members/banned`);
        await sleep(2000);

        const userCells = await waitForSelectorAll(SEL.userCell);
        for (const cell of userCells) {
          const usernameEl = cell.querySelector('a[href*="/' + targetId + '"], [dir="ltr"]');
          if (usernameEl && usernameEl.textContent?.toLowerCase().includes(targetId.toLowerCase())) {
            const unbanBtn = cell.querySelector('button');
            if (unbanBtn && unbanBtn.textContent?.toLowerCase().includes('unban')) {
              unbanBtn.click();
              await sleep(500);
              await confirmAction();
              log('✅', `Unbanned @${targetId} from community ${communityId}`);
              return true;
            }
          }
        }
        log('❌', `Could not find @${targetId} in banned members`);
        return false;
      }

      case 'reviewReported': {
        await navigateTo(`https://x.com/i/communities/${communityId}/admin`);
        await sleep(2000);

        // Look for reported content / moderation queue section
        const modLinks = document.querySelectorAll('a[href*="reported"], a[href*="moderation"], [data-testid="moderationQueue"]');
        if (modLinks.length > 0) {
          modLinks[0].click();
          await sleep(2000);
        }

        const reportedItems = document.querySelectorAll(SEL.tweet);
        if (reportedItems.length === 0) {
          log('✅', 'No reported content to review');
          return true;
        }

        log('🔄', `Found ${reportedItems.length} reported items to review`);
        const reports = [];
        for (const item of reportedItems) {
          const text = item.querySelector(SEL.tweetText)?.textContent || '';
          const author = item.querySelector('a[role="link"] span')?.textContent || 'Unknown';
          reports.push({ author, text: text.substring(0, 100) });
        }

        console.table(reports);
        log('✅', `Listed ${reports.length} reported items. Use removePost() to take action.`);
        return reports;
      }
    }

    return false;
  };

  // ══════════════════════════════════════════════════════════
  // 5. 👑 Community Roles
  // ══════════════════════════════════════════════════════════

  const manageCommunityRole = async (communityIdOrUrl, username, role, action = 'assign') => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL');
      return false;
    }
    if (!username) {
      log('❌', 'Username is required. Usage: manageCommunityRole("123456", "username", "moderator", "assign")');
      return false;
    }

    const validRoles = ['admin', 'moderator'];
    if (!validRoles.includes(role)) {
      log('❌', `Invalid role. Valid roles: ${validRoles.join(', ')}`);
      return false;
    }

    const validActions = ['assign', 'remove'];
    if (!validActions.includes(action)) {
      log('❌', `Invalid action. Valid actions: ${validActions.join(', ')}`);
      return false;
    }

    log('🔄', `${action === 'assign' ? 'Assigning' : 'Removing'} ${role} role ${action === 'assign' ? 'to' : 'from'} @${username}...`);

    // Navigate to community members
    await navigateTo(`https://x.com/i/communities/${communityId}/members`);
    await sleep(2000);

    // Scroll to find user
    let found = false;
    let retries = 5;

    while (!found && retries > 0) {
      const userCells = document.querySelectorAll(SEL.userCell);
      for (const cell of userCells) {
        const links = cell.querySelectorAll('a[role="link"]');
        let isTargetUser = false;
        for (const link of links) {
          if (link.href?.includes(`/${username}`) || link.textContent?.toLowerCase().includes(username.toLowerCase())) {
            isTargetUser = true;
            break;
          }
        }

        if (isTargetUser) {
          // Click the user's actions menu
          const actionsBtn = cell.querySelector(SEL.userActions) || cell.querySelector('[aria-label="More"]');
          if (actionsBtn) {
            actionsBtn.click();
            await sleep(800);

            const menuItems = document.querySelectorAll('[role="menuitem"]');
            for (const item of menuItems) {
              const itemText = item.textContent?.toLowerCase() || '';
              if (action === 'assign' && (itemText.includes(`make ${role}`) || itemText.includes(`assign ${role}`) || itemText.includes(`add as ${role}`))) {
                item.click();
                await sleep(500);
                await confirmAction();
                log('✅', `Assigned ${role} role to @${username}`);
                return true;
              }
              if (action === 'remove' && (itemText.includes(`remove ${role}`) || itemText.includes(`revoke ${role}`) || itemText.includes(`demote`))) {
                item.click();
                await sleep(500);
                await confirmAction();
                log('✅', `Removed ${role} role from @${username}`);
                return true;
              }
            }

            // Close menu if no matching option found
            document.body.click();
            await sleep(300);
          }

          found = true;
          break;
        }
      }

      if (!found) {
        await scrollToBottom();
        retries--;
      }
    }

    if (!found) {
      log('❌', `User @${username} not found in community members`);
    } else {
      log('❌', `Could not find the ${action} ${role} option for @${username}. Check your permissions.`);
    }
    return false;
  };

  // ══════════════════════════════════════════════════════════
  // 6. ✉️ Invite to Community
  // ══════════════════════════════════════════════════════════

  const inviteToCommunity = async (communityIdOrUrl, usernames = []) => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL');
      return { invited: [], failed: [] };
    }
    if (!Array.isArray(usernames) || usernames.length === 0) {
      log('❌', 'Usernames array is required. Usage: inviteToCommunity("123456", ["user1", "user2"])');
      return { invited: [], failed: [] };
    }

    log('🔄', `Inviting ${usernames.length} user(s) to community ${communityId}...`);

    await navigateTo(`https://x.com/i/communities/${communityId}`);
    await sleep(2000);

    // Look for invite button
    const inviteBtn = await waitForSelector('[data-testid="communityInvite"], [aria-label="Invite"], [aria-label*="invite" i], button[aria-label*="Invite"]');
    if (!inviteBtn) {
      // Try the community menu
      const moreBtn = document.querySelector('[aria-label="More"], [data-testid="communityMore"]');
      if (moreBtn) {
        moreBtn.click();
        await sleep(800);
        const menuItems = document.querySelectorAll('[role="menuitem"]');
        for (const item of menuItems) {
          if (item.textContent?.toLowerCase().includes('invite')) {
            item.click();
            await sleep(1000);
            break;
          }
        }
      }
    } else {
      inviteBtn.click();
      await sleep(1000);
    }

    const invited = [];
    const failed = [];

    for (const username of usernames) {
      log('🔄', `Inviting @${username}...`);

      // Find search/input field for inviting
      const searchInput = await waitForSelector('input[data-testid="searchPeople"], input[placeholder*="Search" i], input[aria-label*="Search" i]');
      if (!searchInput) {
        log('❌', 'Invite search field not found');
        failed.push(username);
        continue;
      }

      // Clear and type username
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(300);
      await typeIntoField(searchInput, username);
      await sleep(1500);

      // Select user from results
      const results = document.querySelectorAll(SEL.userCell);
      let userFound = false;
      for (const result of results) {
        if (result.textContent?.toLowerCase().includes(username.toLowerCase())) {
          result.click();
          await sleep(500);
          userFound = true;
          break;
        }
      }

      if (userFound) {
        invited.push(username);
        log('✅', `Invited @${username}`);
      } else {
        failed.push(username);
        log('❌', `Could not find @${username} in search results`);
      }

      await randomDelay(1500, 3000);
    }

    // Confirm/send invitations if there's a send button
    const sendBtn = document.querySelector('button[data-testid="sendInvite"], button[data-testid="confirmationSheetConfirm"]');
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      await sleep(1000);
    }

    log('✅', `Invitation complete. Invited: ${invited.length}, Failed: ${failed.length}`);
    if (failed.length > 0) log('⚠️', `Failed to invite: ${failed.join(', ')}`);

    return { invited, failed };
  };

  // ══════════════════════════════════════════════════════════
  // 7. 🔍 Search Within Community
  // ══════════════════════════════════════════════════════════

  const searchCommunity = async (communityIdOrUrl, query, type = 'posts') => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL');
      return [];
    }
    if (!query) {
      log('❌', 'Search query is required. Usage: searchCommunity("123456", "keyword", "posts"|"members")');
      return [];
    }

    const validTypes = ['posts', 'members'];
    if (!validTypes.includes(type)) {
      log('❌', `Invalid type. Valid types: ${validTypes.join(', ')}`);
      return [];
    }

    log('🔄', `Searching community ${communityId} for "${query}" (${type})...`);

    if (type === 'members') {
      // Navigate to members page and search
      await navigateTo(`https://x.com/i/communities/${communityId}/members`);
      await sleep(2000);

      const searchInput = await waitForSelector(`${SEL.searchInput}, input[placeholder*="Search" i]`);
      if (searchInput) {
        await typeIntoField(searchInput, query);
        await sleep(2000);
      }

      const results = [];
      const userCells = document.querySelectorAll(SEL.userCell);
      for (const cell of userCells) {
        const displayName = cell.querySelector('[dir="ltr"] > span')?.textContent || '';
        const handle = cell.querySelector('a[role="link"][href^="/"]')?.href?.split('/').pop() || '';
        const bio = cell.querySelector('[data-testid="UserDescription"]')?.textContent || '';
        if (displayName || handle) {
          results.push({ displayName, handle: `@${handle}`, bio: bio.substring(0, 100) });
        }
      }

      console.table(results);
      log('✅', `Found ${results.length} matching members`);
      return results;

    } else {
      // Search posts within community
      await navigateTo(`https://x.com/i/communities/${communityId}`);
      await sleep(2000);

      // Try using the search functionality
      const searchInput = await waitForSelector(`${SEL.searchInput}, input[placeholder*="Search" i]`);
      if (searchInput) {
        await typeIntoField(searchInput, query);
        await sleep(2000);
      } else {
        // Use global search scoped to community
        await navigateTo(`https://x.com/search?q=${encodeURIComponent(query)}+community:${communityId}&src=typed_query`);
        await sleep(3000);
      }

      const results = [];
      const tweets = document.querySelectorAll(SEL.tweet);
      for (const tweet of tweets) {
        const text = tweet.querySelector(SEL.tweetText)?.textContent || '';
        const author = tweet.querySelector('a[role="link"] span')?.textContent || 'Unknown';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        if (text.toLowerCase().includes(query.toLowerCase())) {
          results.push({ author, text: text.substring(0, 150), time });
        }
      }

      if (results.length === 0) {
        // If search didn't work, do a manual scroll-and-filter
        log('🔄', 'No direct search results, scanning community posts...');
        let retries = 3;
        while (retries > 0) {
          const allTweets = document.querySelectorAll(SEL.tweet);
          for (const tweet of allTweets) {
            const text = tweet.querySelector(SEL.tweetText)?.textContent || '';
            const author = tweet.querySelector('a[role="link"] span')?.textContent || 'Unknown';
            const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
            if (text.toLowerCase().includes(query.toLowerCase())) {
              const alreadyFound = results.some(r => r.text === text.substring(0, 150));
              if (!alreadyFound) {
                results.push({ author, text: text.substring(0, 150), time });
              }
            }
          }
          await scrollToBottom();
          retries--;
        }
      }

      console.table(results);
      log('✅', `Found ${results.length} posts matching "${query}"`);
      return results;
    }
  };

  // ══════════════════════════════════════════════════════════
  // 8. 👥 View Community Members
  // ══════════════════════════════════════════════════════════

  const viewCommunityMembers = async (communityIdOrUrl, maxMembers = 200) => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL. Usage: viewCommunityMembers("123456", 200)');
      return [];
    }

    log('🔄', `Scraping members of community ${communityId} (max: ${maxMembers})...`);

    await navigateTo(`https://x.com/i/communities/${communityId}/members`);
    await sleep(3000);

    const members = [];
    const seenHandles = new Set();
    let emptyScrolls = 0;
    const maxEmptyScrolls = 5;

    while (members.length < maxMembers && emptyScrolls < maxEmptyScrolls) {
      const userCells = document.querySelectorAll(SEL.userCell);
      let newFound = 0;

      for (const cell of userCells) {
        if (members.length >= maxMembers) break;

        const linkEl = cell.querySelector('a[role="link"][href^="/"]');
        const handle = linkEl?.href?.split('/').pop() || '';

        if (!handle || seenHandles.has(handle)) continue;
        seenHandles.add(handle);

        const displayName = cell.querySelector('[dir="ltr"] > span')?.textContent || '';
        const bio = cell.querySelector('[data-testid="UserDescription"]')?.textContent || '';
        const isVerified = !!cell.querySelector('[data-testid="icon-verified"]');
        const roleEl = cell.querySelector('[data-testid="communityRole"]');
        const role = roleEl?.textContent || 'member';

        members.push({
          handle: `@${handle}`,
          displayName,
          bio: bio.substring(0, 100),
          verified: isVerified,
          role,
        });
        newFound++;
      }

      if (newFound === 0) {
        emptyScrolls++;
        log('🔄', `No new members found (${emptyScrolls}/${maxEmptyScrolls}). Scrolling...`);
      } else {
        emptyScrolls = 0;
        log('🔄', `Collected ${members.length} members so far...`);
      }

      await scrollToBottom();
    }

    console.table(members);
    log('✅', `Scraped ${members.length} members from community ${communityId}`);

    // Store in sessionStorage for re-use
    sessionStorage.setItem(`xactions_community_members_${communityId}`, JSON.stringify(members));
    log('✅', `Members saved to sessionStorage key: xactions_community_members_${communityId}`);

    return members;
  };

  // ══════════════════════════════════════════════════════════
  // 9. 📌 Pin Community Post
  // ══════════════════════════════════════════════════════════

  const pinCommunityPost = async (communityIdOrUrl, tweetId, unpin = false) => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL');
      return false;
    }
    if (!tweetId) {
      log('❌', 'Tweet ID is required. Usage: pinCommunityPost("communityId", "tweetId") or pinCommunityPost("communityId", "tweetId", true) to unpin');
      return false;
    }

    const actionLabel = unpin ? 'Unpinning' : 'Pinning';
    log('🔄', `${actionLabel} post ${tweetId} in community ${communityId}...`);

    // Navigate to the tweet within the community
    await navigateTo(`https://x.com/i/communities/${communityId}/status/${tweetId}`);
    await sleep(2000);

    const tweet = await waitForSelector(SEL.tweet);
    if (!tweet) {
      // Fallback: try standard tweet URL
      await navigateTo(`https://x.com/i/status/${tweetId}`);
      await sleep(2000);
    }

    // Click the more/caret menu on the tweet
    const moreBtn = document.querySelector(`${SEL.tweet} [data-testid="caret"], ${SEL.tweet} [aria-label="More"]`);
    if (!moreBtn) {
      log('❌', 'Could not find tweet options menu');
      return false;
    }

    moreBtn.click();
    await sleep(800);

    // Look for pin/unpin option
    const targetText = unpin ? 'unpin' : 'pin';
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    for (const item of menuItems) {
      if (item.textContent?.toLowerCase().includes(targetText)) {
        item.click();
        await sleep(500);
        await confirmAction();
        log('✅', `${unpin ? 'Unpinned' : 'Pinned'} post ${tweetId} in community ${communityId}`);
        return true;
      }
    }

    log('❌', `${unpin ? 'Unpin' : 'Pin'} option not found. You may not have moderator permissions.`);

    // Close menu
    document.body.click();
    await sleep(300);

    return false;
  };

  // ══════════════════════════════════════════════════════════
  // 10. 📊 Community Analytics
  // ══════════════════════════════════════════════════════════

  const communityAnalytics = async (communityIdOrUrl) => {
    const communityId = extractCommunityId(communityIdOrUrl);
    if (!communityId) {
      log('❌', 'Invalid community ID or URL. Usage: communityAnalytics("123456")');
      return null;
    }

    log('🔄', `Gathering analytics for community ${communityId}...`);

    await navigateTo(`https://x.com/i/communities/${communityId}`);
    await sleep(3000);

    const analytics = {
      communityId,
      name: '',
      memberCount: 0,
      description: '',
      posts: [],
      engagement: {
        totalLikes: 0,
        totalReplies: 0,
        totalReposts: 0,
        avgLikesPerPost: 0,
        avgRepliesPerPost: 0,
        avgRepostsPerPost: 0,
      },
      topPosts: [],
      activeAuthors: {},
      scrapedAt: new Date().toISOString(),
    };

    // Get community name
    const nameEl = document.querySelector(SEL.communityName) || document.querySelector('h2[dir="ltr"]') || document.querySelector('[data-testid="titleContainer"]');
    analytics.name = nameEl?.textContent?.trim() || 'Unknown';

    // Get member count from the page
    const allText = document.body.innerText;
    const memberMatch = allText.match(/([\d,.]+[KkMm]?)\s*[Mm]embers?/);
    if (memberMatch) {
      const rawCount = memberMatch[1].replace(/,/g, '');
      if (rawCount.toLowerCase().endsWith('k')) {
        analytics.memberCount = parseFloat(rawCount) * 1000;
      } else if (rawCount.toLowerCase().endsWith('m')) {
        analytics.memberCount = parseFloat(rawCount) * 1000000;
      } else {
        analytics.memberCount = parseInt(rawCount, 10);
      }
    }

    // Get description
    const descEl = document.querySelector('[data-testid="communityDescription"]') || document.querySelector('[data-testid="UserDescription"]');
    analytics.description = descEl?.textContent?.trim() || '';

    // Scroll and collect posts for engagement metrics
    log('🔄', 'Scanning recent posts for engagement data...');
    let retries = 5;
    const seenPosts = new Set();

    while (retries > 0) {
      const tweets = document.querySelectorAll(SEL.tweet);
      let newFound = 0;

      for (const tweet of tweets) {
        const tweetText = tweet.querySelector(SEL.tweetText)?.textContent || '';
        const tweetKey = tweetText.substring(0, 80);
        if (seenPosts.has(tweetKey)) continue;
        seenPosts.add(tweetKey);
        newFound++;

        const author = tweet.querySelector('a[role="link"] span')?.textContent || 'Unknown';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';

        // Parse engagement counts
        const parseCount = (el) => {
          if (!el) return 0;
          const text = el.getAttribute('aria-label') || el.textContent || '0';
          const numMatch = text.match(/([\d,.]+[KkMm]?)/);
          if (!numMatch) return 0;
          const raw = numMatch[1].replace(/,/g, '');
          if (raw.toLowerCase().endsWith('k')) return parseFloat(raw) * 1000;
          if (raw.toLowerCase().endsWith('m')) return parseFloat(raw) * 1000000;
          return parseInt(raw, 10) || 0;
        };

        const likeBtn = tweet.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const replyBtn = tweet.querySelector('[data-testid="reply"]');
        const retweetBtn = tweet.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');

        const likes = parseCount(likeBtn);
        const replies = parseCount(replyBtn);
        const reposts = parseCount(retweetBtn);

        analytics.posts.push({
          author,
          text: tweetText.substring(0, 100),
          time,
          likes,
          replies,
          reposts,
        });

        analytics.engagement.totalLikes += likes;
        analytics.engagement.totalReplies += replies;
        analytics.engagement.totalReposts += reposts;

        // Track active authors
        analytics.activeAuthors[author] = (analytics.activeAuthors[author] || 0) + 1;
      }

      if (newFound === 0) {
        retries--;
      } else {
        retries = Math.min(retries, 3);
      }

      await scrollToBottom();
    }

    // Calculate averages
    const postCount = analytics.posts.length;
    if (postCount > 0) {
      analytics.engagement.avgLikesPerPost = Math.round(analytics.engagement.totalLikes / postCount * 10) / 10;
      analytics.engagement.avgRepliesPerPost = Math.round(analytics.engagement.totalReplies / postCount * 10) / 10;
      analytics.engagement.avgRepostsPerPost = Math.round(analytics.engagement.totalReposts / postCount * 10) / 10;
    }

    // Top posts by engagement
    analytics.topPosts = [...analytics.posts]
      .sort((a, b) => (b.likes + b.replies + b.reposts) - (a.likes + a.replies + a.reposts))
      .slice(0, 10);

    // Sort active authors
    const sortedAuthors = Object.entries(analytics.activeAuthors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Log results
    console.log('\n📊 Community Analytics Report');
    console.log('═══════════════════════════════════════');
    console.log(`📛 Name: ${analytics.name}`);
    console.log(`👥 Members: ${analytics.memberCount.toLocaleString()}`);
    console.log(`📝 Posts scanned: ${postCount}`);
    console.log(`❤️  Total likes: ${analytics.engagement.totalLikes}`);
    console.log(`💬 Total replies: ${analytics.engagement.totalReplies}`);
    console.log(`🔁 Total reposts: ${analytics.engagement.totalReposts}`);
    console.log(`📈 Avg likes/post: ${analytics.engagement.avgLikesPerPost}`);
    console.log(`📈 Avg replies/post: ${analytics.engagement.avgRepliesPerPost}`);
    console.log(`📈 Avg reposts/post: ${analytics.engagement.avgRepostsPerPost}`);
    console.log('\n🏆 Top Posts:');
    console.table(analytics.topPosts);
    console.log('\n🗣️ Most Active Authors:');
    console.table(sortedAuthors.map(([author, count]) => ({ author, posts: count })));

    // Store in sessionStorage
    sessionStorage.setItem(`xactions_community_analytics_${communityId}`, JSON.stringify(analytics));
    log('✅', `Analytics saved to sessionStorage key: xactions_community_analytics_${communityId}`);

    return analytics;
  };

  // ══════════════════════════════════════════════════════════
  // 🌐 Expose on window.XActions.communityManager
  // ══════════════════════════════════════════════════════════

  window.XActions = window.XActions || {};
  window.XActions.communityManager = {
    createCommunity,
    editCommunitySettings,
    postInCommunity,
    moderateCommunity,
    manageCommunityRole,
    inviteToCommunity,
    searchCommunity,
    viewCommunityMembers,
    pinCommunityPost,
    communityAnalytics,
  };

  // ══════════════════════════════════════════════════════════
  // 📋 Menu
  // ══════════════════════════════════════════════════════════

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           🏘️  XActions Community Manager — by nichxbt         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  All functions available on window.XActions.communityManager  ║
║                                                               ║
║  1. 🏗️  createCommunity({ name, description, rules, isPrivate })
║     Create a new community with custom settings               ║
║                                                               ║
║  2. ⚙️  editCommunitySettings(communityId, { name, description, rules, joinRequirement })
║     Edit an existing community's settings                     ║
║                                                               ║
║  3. 📝 postInCommunity(communityId, "text")                   ║
║     Post a tweet within a community                           ║
║                                                               ║
║  4. 🛡️  moderateCommunity(communityId, action, targetId)      ║
║     Actions: "removePost", "banMember", "unbanMember",        ║
║     "reviewReported"                                          ║
║                                                               ║
║  5. 👑 manageCommunityRole(communityId, "user", "moderator", "assign"|"remove")
║     Assign or remove admin/moderator roles                    ║
║                                                               ║
║  6. ✉️  inviteToCommunity(communityId, ["user1", "user2"])     ║
║     Send community invitations to users                       ║
║                                                               ║
║  7. 🔍 searchCommunity(communityId, "query", "posts"|"members")
║     Search for posts or members within a community            ║
║                                                               ║
║  8. 👥 viewCommunityMembers(communityId, maxMembers)           ║
║     Scrape full member list with scroll pagination            ║
║                                                               ║
║  9. 📌 pinCommunityPost(communityId, "tweetId", unpin?)       ║
║     Pin or unpin a post in a community                        ║
║                                                               ║
║ 10. 📊 communityAnalytics(communityId)                        ║
║     Scrape stats: members, engagement, top posts, authors     ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  💡 Example:                                                  ║
║  const cm = window.XActions.communityManager;                 ║
║  await cm.createCommunity({ name: "My Group" });              ║
║  await cm.postInCommunity("123456", "Hello community!");      ║
║  await cm.viewCommunityMembers("123456", 100);                ║
║  await cm.communityAnalytics("123456");                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
})();
