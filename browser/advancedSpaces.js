// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        advancedSpaces.js
 * @title       Advanced Spaces Tools
 * @description Join, leave, speak, co-host, record, caption, react in and end Spaces.
 * @category    spaces
 * @page        x.com/*
 * @writes      true
 */
// browser/advancedSpaces.js
// Advanced Spaces features for X/Twitter
// by nichxbt
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const SEL = {
    // Spaces
    joinSpace:        '[data-testid="joinSpace"]',
    spaceSpeakers:    '[data-testid="spaceSpeakers"]',
    spaceListeners:   '[data-testid="spaceListeners"]',
    spaceRecording:   '[data-testid="spaceRecording"]',
    spaceTitle:       '[data-testid="spaceTitle"]',
    // General
    confirmDialog:    '[data-testid="confirmationSheetConfirm"]',
    searchInput:      '[data-testid="SearchBox_Search_Input"]',
    userCell:         '[data-testid="UserCell"]',
    toast:            '[data-testid="toast"]',
  };

  /**
   * Wait for a DOM element to appear.
   * @param {string} selector - CSS selector
   * @param {number} timeout - Max wait time in ms
   * @returns {Promise<Element|null>}
   */
  const waitFor = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(250);
    }
    return null;
  };

  /**
   * Wait for any element matching a CSS selector that contains specific text.
   * @param {string} selector - CSS selector to search within
   * @param {string} text - Text content to match (case-insensitive)
   * @param {number} timeout - Max wait time in ms
   * @returns {Promise<Element|null>}
   */
  const waitForText = async (selector, text, timeout = 10000) => {
    const lowerText = text.toLowerCase();
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const els = $$(selector);
      for (const el of els) {
        if (el.textContent.toLowerCase().includes(lowerText)) return el;
      }
      await sleep(250);
    }
    return null;
  };

  /**
   * Find a button by its visible text label (case-insensitive partial match).
   * @param {string} text - Button label text
   * @returns {Element|null}
   */
  const findButton = (text) => {
    const lowerText = text.toLowerCase();
    const buttons = $$('button, [role="button"]');
    for (const btn of buttons) {
      if (btn.textContent.toLowerCase().includes(lowerText)) return btn;
    }
    return null;
  };

  /**
   * Find a menu item by its visible text label (case-insensitive partial match).
   * @param {string} text - Menu item label text
   * @returns {Element|null}
   */
  const findMenuItem = (text) => {
    const lowerText = text.toLowerCase();
    const items = $$('[role="menuitem"], [role="option"], [data-testid="Dropdown"] div');
    for (const item of items) {
      if (item.textContent.toLowerCase().includes(lowerText)) return item;
    }
    return null;
  };

  // ──────────────────────────────────────────────────────────────
  // 1. Join Space
  // ──────────────────────────────────────────────────────────────

  /**
   * Join a Space as a listener.
   * Must be on a Space URL (x.com/i/spaces/...) or a page showing a Space card.
   * @param {string} [spaceUrl] - Optional Space URL to navigate to first
   */
  const joinSpace = async (spaceUrl) => {
    console.log('🔄 Joining Space...');

    if (spaceUrl) {
      console.log(`🔄 Navigating to ${spaceUrl}`);
      window.location.href = spaceUrl;
      await sleep(4000);
    }

    // Look for the join / start listening button
    let joinBtn = await waitFor(SEL.joinSpace, 8000);

    if (!joinBtn) {
      // Fallback: look for buttons with "listen" or "join" text
      joinBtn = findButton('start listening') || findButton('join') || findButton('listen');
    }

    if (!joinBtn) {
      console.log('❌ Could not find Join/Listen button');
      console.log('💡 Make sure you are on a live Space page (x.com/i/spaces/...)');
      return { success: false, error: 'Join button not found' };
    }

    joinBtn.click();
    await sleep(3000);

    // Check for microphone permission dialog or confirmation
    const confirmBtn = $(SEL.confirmDialog);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(1000);
    }

    console.log('✅ Joined Space as a listener');
    return { success: true };
  };

  // ──────────────────────────────────────────────────────────────
  // 2. Leave Space
  // ──────────────────────────────────────────────────────────────

  /**
   * Leave (exit) the current Space.
   */
  const leaveSpace = async () => {
    console.log('🔄 Leaving Space...');

    // Look for leave/exit button
    let leaveBtn = findButton('leave') || findButton('exit');

    if (!leaveBtn) {
      // Try aria-label based search
      leaveBtn = $('[aria-label="Leave"]') || $('[aria-label="Leave Space"]') || $('[aria-label="Exit"]');
    }

    if (!leaveBtn) {
      // Some Space UIs have a close/X button in the top area
      leaveBtn = $('[data-testid="app-bar-close"]') || $('[data-testid="spaceLeave"]');
    }

    if (!leaveBtn) {
      console.log('❌ Could not find Leave/Exit button');
      console.log('💡 Make sure you are currently inside a Space');
      return { success: false, error: 'Leave button not found' };
    }

    leaveBtn.click();
    await sleep(1500);

    // Handle confirmation dialog
    const confirmBtn = $(SEL.confirmDialog);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(1000);
    }

    // Also check for text-based confirmation
    const confirmLeave = findButton('leave') || findButton('yes');
    if (confirmLeave && confirmLeave !== leaveBtn) {
      confirmLeave.click();
      await sleep(1000);
    }

    console.log('✅ Left the Space');
    return { success: true };
  };

  // ──────────────────────────────────────────────────────────────
  // 3. Request to Speak
  // ──────────────────────────────────────────────────────────────

  /**
   * Send a request to become a speaker in the current Space.
   */
  const requestToSpeak = async () => {
    console.log('🔄 Requesting to speak...');

    // Look for the request/hand-raise button
    let requestBtn = findButton('request') ||
                     findButton('speak') ||
                     $('[aria-label="Request to speak"]') ||
                     $('[aria-label="Raise hand"]') ||
                     $('[data-testid="requestToSpeak"]');

    if (!requestBtn) {
      // Some Space UIs use a mic icon / hand icon
      const micBtn = $('[aria-label="Microphone"]') || $('[aria-label="Hand"]');
      if (micBtn) requestBtn = micBtn;
    }

    if (!requestBtn) {
      console.log('❌ Could not find Request to Speak button');
      console.log('💡 Make sure you are inside a Space as a listener');
      console.log('💡 The host may have disabled speaker requests');
      return { success: false, error: 'Request button not found' };
    }

    requestBtn.click();
    await sleep(2000);

    // Handle any confirmation
    const confirmBtn = $(SEL.confirmDialog);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(1000);
    }

    console.log('✅ Speaker request sent');
    console.log('⚠️ Wait for the host to accept your request');
    return { success: true };
  };

  // ──────────────────────────────────────────────────────────────
  // 4. Invite Users to Space
  // ──────────────────────────────────────────────────────────────

  /**
   * Invite one or more users to the current Space.
   * @param {string[]} usernames - Array of usernames to invite (without @)
   */
  const inviteUsers = async (usernames = []) => {
    if (!usernames || usernames.length === 0) {
      console.log('❌ No usernames provided');
      console.log('💡 Usage: window.XActions.advancedSpaces.inviteUsers(["user1", "user2"])');
      return { success: false, error: 'No usernames provided' };
    }

    console.log(`🔄 Inviting ${usernames.length} user(s) to Space...`);

    // Open the invite dialog
    let inviteBtn = findButton('invite') ||
                    $('[aria-label="Invite"]') ||
                    $('[data-testid="spaceInvite"]') ||
                    $('[aria-label="Share"]');

    if (!inviteBtn) {
      // Try the people/participants icon which may contain invite option
      const peopleBtn = $('[aria-label="People"]') || $('[aria-label="Participants"]');
      if (peopleBtn) {
        peopleBtn.click();
        await sleep(1500);
        inviteBtn = findButton('invite') || $('[aria-label="Invite"]');
      }
    }

    if (!inviteBtn) {
      console.log('❌ Could not find Invite button');
      console.log('💡 Make sure you are inside a Space (as host or co-host)');
      return { success: false, error: 'Invite button not found' };
    }

    inviteBtn.click();
    await sleep(2000);

    const results = { invited: [], failed: [] };

    for (const username of usernames) {
      const cleanName = username.replace(/^@/, '');
      console.log(`🔄 Searching for @${cleanName}...`);

      // Find the search input in the invite dialog
      const searchInput = $(SEL.searchInput) ||
                          $('input[placeholder*="Search"]') ||
                          $('input[placeholder*="search"]') ||
                          $('input[type="text"]');

      if (!searchInput) {
        console.log(`⚠️ Could not find search input for @${cleanName}`);
        results.failed.push(cleanName);
        continue;
      }

      // Clear and type the username
      searchInput.focus();
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(500);

      for (const char of cleanName) {
        document.execCommand('insertText', false, char);
        await sleep(50);
      }
      await sleep(2000);

      // Click the matching user cell
      const userCell = await waitFor(SEL.userCell, 5000);
      if (userCell) {
        userCell.click();
        await sleep(1500);

        // Send the invite
        const sendBtn = findButton('send') || findButton('invite') || findButton('done');
        if (sendBtn) {
          sendBtn.click();
          await sleep(1500);
        }

        console.log(`✅ Invited @${cleanName}`);
        results.invited.push(cleanName);
      } else {
        console.log(`⚠️ Could not find user @${cleanName}`);
        results.failed.push(cleanName);
      }

      // Clear for next search
      if (searchInput) {
        searchInput.focus();
        document.execCommand('selectAll');
        document.execCommand('delete');
        await sleep(500);
      }
    }

    console.log(`✅ Invited: ${results.invited.length}, Failed: ${results.failed.length}`);
    return { success: true, ...results };
  };

  // ──────────────────────────────────────────────────────────────
  // 5. Co-host Management
  // ──────────────────────────────────────────────────────────────

  /**
   * Add or remove a co-host from the current Space.
   * @param {string} username - Username to add/remove (without @)
   * @param {'add'|'remove'} action - Whether to add or remove
   */
  const manageCoHost = async (username, action = 'add') => {
    if (!username) {
      console.log('❌ No username provided');
      console.log('💡 Usage: window.XActions.advancedSpaces.manageCoHost("user", "add")');
      return { success: false, error: 'No username provided' };
    }

    const cleanName = username.replace(/^@/, '');
    console.log(`🔄 ${action === 'add' ? 'Adding' : 'Removing'} co-host @${cleanName}...`);

    // Open the participants panel
    const peopleBtn = $('[aria-label="People"]') ||
                      $('[aria-label="Participants"]') ||
                      findButton('people') ||
                      $('[data-testid="spacePeople"]');

    if (peopleBtn) {
      peopleBtn.click();
      await sleep(2000);
    }

    if (action === 'add') {
      // Look for an "Add co-host" option
      const addBtn = findButton('add co-host') ||
                     findButton('co-host') ||
                     findMenuItem('add co-host') ||
                     $('[data-testid="addCoHost"]');

      if (!addBtn) {
        console.log('❌ Could not find Add Co-host option');
        console.log('💡 Make sure you are the host of this Space');
        return { success: false, error: 'Add co-host option not found' };
      }

      addBtn.click();
      await sleep(2000);

      // Search for the user
      const searchInput = $('input[placeholder*="Search"]') ||
                          $('input[placeholder*="search"]') ||
                          $(SEL.searchInput) ||
                          $('input[type="text"]');

      if (searchInput) {
        searchInput.focus();
        for (const char of cleanName) {
          document.execCommand('insertText', false, char);
          await sleep(50);
        }
        await sleep(2000);

        const userCell = await waitFor(SEL.userCell, 5000);
        if (userCell) {
          userCell.click();
          await sleep(1500);

          // Confirm
          const confirmBtn = $(SEL.confirmDialog) || findButton('add') || findButton('confirm');
          if (confirmBtn) {
            confirmBtn.click();
            await sleep(1000);
          }

          console.log(`✅ Added @${cleanName} as co-host`);
          return { success: true, username: cleanName, action: 'added' };
        } else {
          console.log(`⚠️ Could not find user @${cleanName}`);
          return { success: false, error: 'User not found' };
        }
      }

      console.log('❌ Could not find search input in co-host dialog');
      return { success: false, error: 'Search input not found' };
    }

    if (action === 'remove') {
      // Find the user in the participants list and open their context menu
      const userCells = $$(SEL.userCell);
      let targetCell = null;

      for (const cell of userCells) {
        if (cell.textContent.toLowerCase().includes(cleanName.toLowerCase())) {
          targetCell = cell;
          break;
        }
      }

      if (!targetCell) {
        console.log(`❌ Could not find @${cleanName} in participants list`);
        return { success: false, error: 'User not found in participants' };
      }

      // Click on the user to open their options
      targetCell.click();
      await sleep(1500);

      const removeBtn = findButton('remove co-host') ||
                        findMenuItem('remove co-host') ||
                        findButton('remove as co-host') ||
                        $('[data-testid="removeCoHost"]');

      if (!removeBtn) {
        console.log('❌ Could not find Remove Co-host option');
        return { success: false, error: 'Remove co-host option not found' };
      }

      removeBtn.click();
      await sleep(1500);

      // Confirm removal
      const confirmBtn = $(SEL.confirmDialog) || findButton('remove') || findButton('confirm');
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(1000);
      }

      console.log(`✅ Removed @${cleanName} as co-host`);
      return { success: true, username: cleanName, action: 'removed' };
    }

    console.log('❌ Invalid action. Use "add" or "remove"');
    return { success: false, error: 'Invalid action' };
  };

  // ──────────────────────────────────────────────────────────────
  // 6. Space Recording Management
  // ──────────────────────────────────────────────────────────────

  /**
   * Toggle recording on/off for the current Space.
   * @param {boolean} enable - true to enable, false to disable
   */
  const toggleRecording = async (enable = true) => {
    console.log(`🔄 ${enable ? 'Enabling' : 'Disabling'} recording...`);

    // Open Space settings/options menu
    const settingsBtn = $('[aria-label="Settings"]') ||
                        $('[aria-label="More"]') ||
                        $('[data-testid="spaceSettings"]') ||
                        findButton('settings');

    if (settingsBtn) {
      settingsBtn.click();
      await sleep(1500);
    }

    // Find the recording toggle
    let recordingToggle = $(SEL.spaceRecording) ||
                          $('[data-testid="spaceRecordingToggle"]') ||
                          $('[aria-label="Record Space"]');

    if (!recordingToggle) {
      // Look for a menu item or toggle with "record" text
      recordingToggle = findMenuItem('record') || findButton('record');
    }

    if (!recordingToggle) {
      console.log('❌ Could not find recording toggle');
      console.log('💡 Make sure you are the host and the Space is live');
      console.log('💡 Recording may need to be enabled before starting the Space');
      return { success: false, error: 'Recording toggle not found' };
    }

    // Check current state if possible
    const isCurrentlyOn = recordingToggle.getAttribute('aria-checked') === 'true' ||
                          recordingToggle.classList.contains('r-1vhakwd') ||
                          recordingToggle.closest('[aria-checked="true"]');

    if ((enable && isCurrentlyOn) || (!enable && !isCurrentlyOn)) {
      console.log(`⚠️ Recording is already ${enable ? 'enabled' : 'disabled'}`);
      return { success: true, alreadyInState: true };
    }

    recordingToggle.click();
    await sleep(2000);

    // Handle confirmation
    const confirmBtn = $(SEL.confirmDialog);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(1000);
    }

    console.log(`✅ Recording ${enable ? 'enabled' : 'disabled'}`);
    return { success: true, recording: enable };
  };

  // ──────────────────────────────────────────────────────────────
  // 7. Space Captions
  // ──────────────────────────────────────────────────────────────

  /**
   * Toggle live captions/closed captions in the current Space.
   * @param {boolean} enable - true to enable, false to disable
   */
  const toggleCaptions = async (enable = true) => {
    console.log(`🔄 ${enable ? 'Enabling' : 'Disabling'} captions...`);

    // Open accessibility or captions menu
    let captionsBtn = $('[aria-label="Captions"]') ||
                      $('[aria-label="Closed captions"]') ||
                      $('[data-testid="spaceCaptions"]') ||
                      findButton('captions') ||
                      findButton('cc');

    if (!captionsBtn) {
      // Try opening the more/settings menu first
      const moreBtn = $('[aria-label="More"]') ||
                      $('[aria-label="Settings"]') ||
                      $('[data-testid="spaceSettings"]');

      if (moreBtn) {
        moreBtn.click();
        await sleep(1500);
        captionsBtn = findMenuItem('captions') ||
                      findMenuItem('closed caption') ||
                      $('[aria-label="Captions"]');
      }
    }

    if (!captionsBtn) {
      console.log('❌ Could not find captions toggle');
      console.log('💡 Captions may not be available for this Space');
      console.log('💡 Try opening the Space settings/menu first');
      return { success: false, error: 'Captions toggle not found' };
    }

    // Check current state
    const isCurrentlyOn = captionsBtn.getAttribute('aria-checked') === 'true' ||
                          captionsBtn.getAttribute('aria-pressed') === 'true' ||
                          captionsBtn.closest('[aria-checked="true"]');

    if ((enable && isCurrentlyOn) || (!enable && !isCurrentlyOn)) {
      console.log(`⚠️ Captions are already ${enable ? 'enabled' : 'disabled'}`);
      return { success: true, alreadyInState: true };
    }

    captionsBtn.click();
    await sleep(1500);

    console.log(`✅ Captions ${enable ? 'enabled' : 'disabled'}`);
    return { success: true, captions: enable };
  };

  // ──────────────────────────────────────────────────────────────
  // 8. Space Reactions / Emojis
  // ──────────────────────────────────────────────────────────────

  /**
   * Send an emoji reaction in the current Space.
   * @param {string} [emoji='❤️'] - Emoji to send. Common: ❤️ 🔥 👏 😂 😮 💯
   */
  const sendReaction = async (emoji = '❤️') => {
    console.log(`🔄 Sending reaction: ${emoji}`);

    // Look for the reaction/emoji bar
    let reactionBar = $('[data-testid="spaceReactions"]') ||
                      $('[aria-label="Reactions"]') ||
                      $('[aria-label="React"]');

    if (!reactionBar) {
      // Some UIs have emoji buttons directly visible at the bottom
      const emojiBtn = $('[aria-label="Emoji"]') || findButton('react');
      if (emojiBtn) {
        emojiBtn.click();
        await sleep(1000);
        reactionBar = $('[data-testid="spaceReactions"]') ||
                      $('[role="listbox"]') ||
                      $('[role="grid"]');
      }
    }

    if (!reactionBar) {
      console.log('❌ Could not find reaction panel');
      console.log('💡 Make sure you are inside a live Space');
      return { success: false, error: 'Reaction panel not found' };
    }

    // Try to find the specific emoji button
    const emojiButtons = reactionBar.querySelectorAll('button, [role="button"], [role="option"]');
    let targetBtn = null;

    for (const btn of emojiButtons) {
      if (btn.textContent.includes(emoji) || btn.getAttribute('aria-label')?.includes(emoji)) {
        targetBtn = btn;
        break;
      }
    }

    if (!targetBtn) {
      // If specific emoji not found, click the first available reaction
      if (emojiButtons.length > 0) {
        targetBtn = emojiButtons[0];
        console.log(`⚠️ Specific emoji "${emoji}" not found, using first available reaction`);
      } else {
        // Try clicking the reaction bar itself
        reactionBar.click();
        await sleep(1000);
        console.log('✅ Reaction sent (clicked reaction area)');
        return { success: true, emoji };
      }
    }

    targetBtn.click();
    await sleep(1000);

    console.log(`✅ Sent reaction: ${emoji}`);
    return { success: true, emoji };
  };

  // ──────────────────────────────────────────────────────────────
  // 9. End Space
  // ──────────────────────────────────────────────────────────────

  /**
   * End a Space you are hosting (with confirmation).
   */
  const endSpace = async () => {
    console.log('🔄 Ending Space...');
    console.log('⚠️ This will end the Space for all participants');

    // Look for the end/stop button
    let endBtn = findButton('end') ||
                 $('[aria-label="End Space"]') ||
                 $('[aria-label="End"]') ||
                 $('[data-testid="endSpace"]') ||
                 $('[data-testid="spaceEnd"]');

    if (!endBtn) {
      // Try the more/settings menu
      const moreBtn = $('[aria-label="More"]') ||
                      $('[aria-label="Settings"]') ||
                      $('[data-testid="spaceSettings"]');

      if (moreBtn) {
        moreBtn.click();
        await sleep(1500);
        endBtn = findMenuItem('end space') ||
                 findMenuItem('end') ||
                 findButton('end space');
      }
    }

    if (!endBtn) {
      console.log('❌ Could not find End Space button');
      console.log('💡 Make sure you are the host of this Space');
      return { success: false, error: 'End button not found' };
    }

    endBtn.click();
    await sleep(2000);

    // Confirmation dialog — ending a Space always requires confirmation
    const confirmBtn = $(SEL.confirmDialog) ||
                       findButton('end space') ||
                       findButton('end for everyone') ||
                       findButton('yes, end');

    if (confirmBtn) {
      confirmBtn.click();
      await sleep(2000);
    } else {
      console.log('⚠️ No confirmation dialog found — Space may not have ended');
      console.log('💡 Try clicking End Space again manually');
      return { success: false, error: 'Confirmation not found' };
    }

    console.log('✅ Space ended');
    return { success: true };
  };

  // ──────────────────────────────────────────────────────────────
  // 10. Download Space Recording
  // ──────────────────────────────────────────────────────────────

  /**
   * Find and download the recording of a completed Space.
   * Navigate to the Space URL first, or call from a Space page that has a recording.
   * @param {string} [spaceUrl] - Optional Space URL to navigate to first
   */
  const downloadRecording = async (spaceUrl) => {
    console.log('🔄 Looking for Space recording...');

    if (spaceUrl) {
      console.log(`🔄 Navigating to ${spaceUrl}`);
      window.location.href = spaceUrl;
      await sleep(5000);
    }

    // Look for a recording indicator or play button on completed Spaces
    let recordingEl = $(SEL.spaceRecording) ||
                      $('[data-testid="spacePlayback"]') ||
                      $('[aria-label="Play recording"]') ||
                      $('[aria-label="Recording"]');

    if (!recordingEl) {
      // Look for a play button or audio element
      recordingEl = findButton('play recording') ||
                    findButton('play') ||
                    $('audio[src]') ||
                    $('video[src]');
    }

    if (!recordingEl) {
      console.log('❌ No recording found for this Space');
      console.log('💡 Make sure the Space was recorded and has ended');
      console.log('💡 Navigate to the completed Space URL first');
      return { success: false, error: 'Recording not found' };
    }

    // Try to find the direct download link
    let downloadUrl = null;

    // Check for download button
    const downloadBtn = findButton('download') ||
                        $('[aria-label="Download"]') ||
                        $('[data-testid="downloadRecording"]') ||
                        $('a[download]');

    if (downloadBtn) {
      if (downloadBtn.href) {
        downloadUrl = downloadBtn.href;
      } else {
        downloadBtn.click();
        await sleep(2000);
        console.log('✅ Download initiated via button click');
        return { success: true, method: 'button' };
      }
    }

    // Try to extract audio/video source URL
    if (!downloadUrl) {
      const audioEl = $('audio[src]');
      const videoEl = $('video[src]');
      const sourceEl = $('source[src]');

      if (audioEl) downloadUrl = audioEl.src;
      else if (videoEl) downloadUrl = videoEl.src;
      else if (sourceEl) downloadUrl = sourceEl.src;
    }

    // Try to find URL in the more/share menu
    if (!downloadUrl) {
      const moreBtn = $('[aria-label="More"]') ||
                      $('[aria-label="Share"]') ||
                      findButton('more');

      if (moreBtn) {
        moreBtn.click();
        await sleep(1500);

        const dlOption = findMenuItem('download') ||
                         findMenuItem('save') ||
                         $('[data-testid="downloadRecording"]');

        if (dlOption) {
          if (dlOption.href) {
            downloadUrl = dlOption.href;
          } else {
            dlOption.click();
            await sleep(2000);
            console.log('✅ Download initiated via menu option');
            return { success: true, method: 'menu' };
          }
        }
      }
    }

    if (downloadUrl) {
      console.log(`✅ Recording URL found: ${downloadUrl}`);
      console.log('🔄 Starting download...');

      // Trigger download using a temporary anchor
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `space-recording-${Date.now()}.mp3`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log('✅ Download started');
      return { success: true, url: downloadUrl, method: 'direct' };
    }

    console.log('⚠️ Could not find a direct download link');
    console.log('💡 The recording may still be processing');
    console.log('💡 Try the Space settings menu for download options');
    return { success: false, error: 'Download link not found' };
  };

  // ──────────────────────────────────────────────────────────────
  // Expose on window.XActions.advancedSpaces
  // ──────────────────────────────────────────────────────────────

  window.XActions = window.XActions || {};
  window.XActions.advancedSpaces = {
    joinSpace,
    leaveSpace,
    requestToSpeak,
    inviteUsers,
    manageCoHost,
    toggleRecording,
    toggleCaptions,
    sendReaction,
    endSpace,
    downloadRecording,
  };

  // ──────────────────────────────────────────────────────────────
  // Print available commands
  // ──────────────────────────────────────────────────────────────

  const W = 64;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  🎙️ ADVANCED SPACES — XActions' + ' '.repeat(W - 33) + '║');
  console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
  console.log('');
  console.log('Available commands (via window.XActions.advancedSpaces):');
  console.log('');
  console.log('  1.  joinSpace(spaceUrl?)          — Join a Space as a listener');
  console.log('  2.  leaveSpace()                   — Leave/exit the current Space');
  console.log('  3.  requestToSpeak()               — Request speaker permissions');
  console.log('  4.  inviteUsers(["user1","user2"])  — Invite users to the Space');
  console.log('  5.  manageCoHost("user","add")      — Add/remove co-host');
  console.log('  6.  toggleRecording(true|false)     — Toggle Space recording');
  console.log('  7.  toggleCaptions(true|false)      — Toggle live captions');
  console.log('  8.  sendReaction("❤️")              — Send emoji reaction');
  console.log('  9.  endSpace()                      — End Space (host only)');
  console.log('  10. downloadRecording(spaceUrl?)    — Download Space recording');
  console.log('');
  console.log('Example:');
  console.log('  await window.XActions.advancedSpaces.joinSpace("https://x.com/i/spaces/abc123")');
  console.log('  await window.XActions.advancedSpaces.sendReaction("🔥")');
  console.log('');
  console.log('✅ Advanced Spaces loaded — all commands ready');
})();
