// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        advancedDM.js
 * @title       Advanced DM Tools
 * @description Advanced direct message features: reactions, search, pinning, requests and exports.
 * @category    messages
 * @page        x.com/messages
 * @writes      true
 */
// browser/advancedDM.js
// Advanced Direct Message features for X/Twitter
// by nichxbt
//
// 1. Go to https://x.com/messages (or open a DM conversation)
// 2. Open DevTools Console (F12)
// 3. Paste and run this script
// 4. Use window.XActions.advancedDM.<function>() to call features
//
// Features:
//   sendMedia(filePath)         - Send photo/video/GIF via the media button
//   sendGIF(searchTerm)         - Search and send a GIF in the current conversation
//   sendVoiceMessage()          - Record and send a voice message
//   startAudioCall()            - Initiate an audio call from the conversation
//   startVideoCall()            - Initiate a video call from the conversation
//   toggleEncryptedDM()         - Toggle encrypted DMs (lock icon)
//   pinConversation()           - Pin the current conversation
//   deleteMessage(messageEl)    - Delete a specific message (hover > menu)
//   deleteConversation()        - Delete the entire current conversation
//   leaveGroupDM()              - Leave a group DM conversation
//   renameGroupDM(newName)      - Rename a group DM
//   addGroupMember(username)    - Add a member to a group DM
//   removeGroupMember(username) - Remove a member from a group DM
//   toggleReadReceipts()        - Toggle read receipts in DM settings
//   sharePostViaDM(tweetUrl, username) - Share a tweet to a DM conversation
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const SEL = {
    // Compose area
    composerInput:      '[data-testid="dmComposerTextInput"]',
    sendButton:         '[data-testid="dmComposerSendButton"]',
    mediaButton:        '[data-testid="fileInput"]',
    gifButton:          '[aria-label="GIF"]',
    gifSearchInput:     '[data-testid="gifSearchField"], input[aria-label="Search for GIFs"]',
    gifResult:          '[data-testid="gifSearchResult"], [role="option"] img',
    voiceButton:        '[aria-label="Voice message"], [data-testid="voiceMessageButton"]',
    voiceRecordStop:    '[aria-label="Stop recording"], [data-testid="voiceMessageStop"]',
    voiceRecordSend:    '[aria-label="Send voice message"], [data-testid="voiceMessageSend"]',

    // Calls
    audioCallButton:    '[aria-label="Start an audio call"], [data-testid="dmAudioCallButton"]',
    videoCallButton:    '[aria-label="Start a video call"], [data-testid="dmVideoCallButton"]',

    // Conversation header / info
    dmHeader:           '[data-testid="DmActivityContainer"]',
    conversationInfo:   '[data-testid="conversationInfoButton"], [aria-label="Conversation info"]',
    lockIcon:           '[data-testid="lockIcon"]',
    encryptedToggle:    '[data-testid="encryptedDM"]',

    // Conversation list
    conversation:       '[data-testid="conversation"]',
    newDM:              '[data-testid="NewDM_Button"]',
    searchPeople:       '[data-testid="searchPeople"]',
    typeaheadUser:      '[data-testid="TypeaheadUser"]',
    nextButton:         '[data-testid="nextButton"]',

    // Context menus & actions
    messageEntry:       '[data-testid="messageEntry"]',
    moreButton:         '[data-testid="caret"], [aria-label="More"]',
    deleteMenuItem:     '[data-testid="Dropdown-Item-Delete"], [role="menuitem"]',
    confirmButton:      '[data-testid="confirmationSheetConfirm"]',
    backButton:         '[data-testid="app-bar-back"]',

    // Group DM
    groupNameInput:     '[data-testid="groupDmName"], input[name="groupName"]',
    addMemberButton:    '[data-testid="addMember"], [aria-label="Add people"]',
    leaveButton:        '[data-testid="leaveConversation"]',
    removeMemberButton: '[data-testid="removeMember"]',

    // Settings
    settingsSwitch:     '[data-testid="settingsSwitch"]',
    toast:              '[data-testid="toast"]',
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

  const waitForAny = async (selectors, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      for (const s of selectors) {
        const el = $(s);
        if (el) return el;
      }
      await sleep(200);
    }
    return null;
  };

  const typeText = async (element, text, charDelay = 50) => {
    element.focus();
    for (const char of text) {
      document.execCommand('insertText', false, char);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
      await sleep(charDelay);
    }
  };

  const clearInput = (element) => {
    element.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const ensureOnMessages = () => {
    if (!window.location.href.includes('/messages')) {
      console.log('❌ Navigate to https://x.com/messages first');
      return false;
    }
    return true;
  };

  const ensureInConversation = () => {
    if (!$(SEL.composerInput) && !$(SEL.dmHeader)) {
      console.log('❌ Open a DM conversation first');
      return false;
    }
    return true;
  };

  const openConversationInfo = async () => {
    const infoBtn = await waitForAny([
      SEL.conversationInfo,
      '[data-testid="conversationInfoButton"]',
      '[aria-label="Conversation info"]',
    ], 5000);
    if (!infoBtn) {
      console.log('❌ Could not find conversation info button');
      return false;
    }
    infoBtn.click();
    await sleep(2000);
    return true;
  };

  // ─────────────────────────────────────────────────────────
  // 1. Send media in DMs
  // ─────────────────────────────────────────────────────────
  const sendMedia = async () => {
    if (!ensureInConversation()) return;
    console.log('🔄 Opening media file picker...');
    console.log('💡 The file picker will open. Select your photo or video.');

    const fileInput = $(SEL.mediaButton);
    if (!fileInput) {
      // Try to find a hidden file input in the DM compose area
      const hiddenInput = $('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');
      if (hiddenInput) {
        hiddenInput.click();
        console.log('✅ File picker opened. Select your media file.');
      } else {
        console.log('❌ Could not find media input. Make sure the DM compose bar is visible.');
      }
      return;
    }

    fileInput.click();
    console.log('✅ File picker opened. Select your photo/video to attach.');
    console.log('💡 After selecting, click the send button or call sendMessage().');
  };

  // ─────────────────────────────────────────────────────────
  // 2. Send GIF in DMs
  // ─────────────────────────────────────────────────────────
  const sendGIF = async (searchTerm = '') => {
    if (!ensureInConversation()) return;
    console.log('🔄 Opening GIF picker...');

    const gifBtn = await waitForAny([
      SEL.gifButton,
      '[aria-label="GIF"]',
      '[data-testid="gifButton"]',
      'button[aria-label*="GIF"]',
    ], 5000);

    if (!gifBtn) {
      console.log('❌ Could not find GIF button in DM compose area');
      return;
    }

    gifBtn.click();
    await sleep(2000);

    if (searchTerm) {
      console.log(`🔍 Searching for GIF: "${searchTerm}"`);
      const searchInput = await waitForAny([
        SEL.gifSearchInput,
        'input[placeholder*="Search"]',
        '[data-testid="gifSearchField"]',
      ], 5000);

      if (searchInput) {
        clearInput(searchInput);
        await typeText(searchInput, searchTerm);
        await sleep(2000);

        const firstGif = await waitForAny([
          SEL.gifResult,
          '[data-testid="gifSearchResult"]',
          '[role="option"] img',
        ], 5000);

        if (firstGif) {
          firstGif.click();
          await sleep(1500);
          console.log(`✅ GIF "${searchTerm}" sent!`);
        } else {
          console.log(`⚠️ No GIF results found for "${searchTerm}"`);
        }
      } else {
        console.log('⚠️ Could not find GIF search input');
      }
    } else {
      console.log('✅ GIF picker opened. Select a GIF to send.');
    }
  };

  // ─────────────────────────────────────────────────────────
  // 3. Send voice message
  // ─────────────────────────────────────────────────────────
  const sendVoiceMessage = async (durationMs = 5000) => {
    if (!ensureInConversation()) return;
    console.log('🔄 Starting voice message recording...');

    const voiceBtn = await waitForAny([
      SEL.voiceButton,
      '[aria-label="Voice message"]',
      '[data-testid="voiceMessageButton"]',
    ], 5000);

    if (!voiceBtn) {
      console.log('❌ Could not find voice message button');
      console.log('💡 Voice messages may require X Premium or may not be available in all regions');
      return;
    }

    voiceBtn.click();
    await sleep(1500);

    console.log(`🎙️ Recording for ${(durationMs / 1000).toFixed(1)}s...`);
    await sleep(durationMs);

    // Stop recording
    const stopBtn = await waitForAny([
      SEL.voiceRecordStop,
      '[aria-label="Stop recording"]',
      '[data-testid="voiceMessageStop"]',
    ], 3000);

    if (stopBtn) {
      stopBtn.click();
      await sleep(1000);
    }

    // Send the voice message
    const sendVoiceBtn = await waitForAny([
      SEL.voiceRecordSend,
      '[aria-label="Send voice message"]',
      '[data-testid="voiceMessageSend"]',
      SEL.sendButton,
    ], 3000);

    if (sendVoiceBtn) {
      sendVoiceBtn.click();
      await sleep(1500);
      console.log('✅ Voice message sent!');
    } else {
      console.log('⚠️ Could not find send button for voice message');
    }
  };

  // ─────────────────────────────────────────────────────────
  // 4. Audio call
  // ─────────────────────────────────────────────────────────
  const startAudioCall = async () => {
    if (!ensureInConversation()) return;
    console.log('🔄 Starting audio call...');

    const callBtn = await waitForAny([
      SEL.audioCallButton,
      '[aria-label="Start an audio call"]',
      '[data-testid="dmAudioCallButton"]',
      '[aria-label="Audio call"]',
    ], 5000);

    if (!callBtn) {
      console.log('❌ Could not find audio call button');
      console.log('💡 Audio calls must be enabled in DM settings and both users must allow them');
      return;
    }

    callBtn.click();
    await sleep(2000);
    console.log('✅ Audio call initiated!');
  };

  // ─────────────────────────────────────────────────────────
  // 5. Video call
  // ─────────────────────────────────────────────────────────
  const startVideoCall = async () => {
    if (!ensureInConversation()) return;
    console.log('🔄 Starting video call...');

    const callBtn = await waitForAny([
      SEL.videoCallButton,
      '[aria-label="Start a video call"]',
      '[data-testid="dmVideoCallButton"]',
      '[aria-label="Video call"]',
    ], 5000);

    if (!callBtn) {
      console.log('❌ Could not find video call button');
      console.log('💡 Video calls must be enabled in DM settings and both users must allow them');
      return;
    }

    callBtn.click();
    await sleep(2000);
    console.log('✅ Video call initiated!');
  };

  // ─────────────────────────────────────────────────────────
  // 6. Toggle encrypted DMs
  // ─────────────────────────────────────────────────────────
  const toggleEncryptedDM = async () => {
    if (!ensureInConversation()) return;
    console.log('🔄 Toggling encrypted DM mode...');

    // Check for lock icon in the conversation header area
    const lockIcon = $(SEL.lockIcon);
    const encryptedToggle = $(SEL.encryptedToggle);

    if (encryptedToggle) {
      encryptedToggle.click();
      await sleep(2000);
      console.log('✅ Encrypted DM mode toggled');
      return;
    }

    if (lockIcon) {
      lockIcon.click();
      await sleep(2000);
      console.log('✅ Encrypted DM lock toggled');
      return;
    }

    // Try opening conversation info to find the toggle
    const opened = await openConversationInfo();
    if (opened) {
      const toggle = await waitForAny([
        SEL.encryptedToggle,
        SEL.lockIcon,
        '[aria-label*="ncrypt"]',
      ], 5000);
      if (toggle) {
        toggle.click();
        await sleep(2000);
        console.log('✅ Encrypted DM mode toggled');
      } else {
        console.log('❌ Could not find encryption toggle');
        console.log('💡 Both users must have X Premium for encrypted DMs');
      }
    }
  };

  // ─────────────────────────────────────────────────────────
  // 7. Pin conversation
  // ─────────────────────────────────────────────────────────
  const pinConversation = async () => {
    if (!ensureOnMessages()) return;
    console.log('🔄 Pinning current conversation...');

    const opened = await openConversationInfo();
    if (!opened) return;

    // Look for pin option
    const pinBtn = await waitForAny([
      '[data-testid="pinConversation"]',
      '[aria-label="Pin conversation"]',
      'div[role="menuitem"]',
    ], 5000);

    if (pinBtn) {
      // If we got a generic menuitem, try to find the one with "Pin" text
      if (!pinBtn.matches('[data-testid="pinConversation"], [aria-label="Pin conversation"]')) {
        const menuItems = $$('[role="menuitem"]');
        const pinItem = menuItems.find(el => el.textContent.toLowerCase().includes('pin'));
        if (pinItem) {
          pinItem.click();
          await sleep(1500);
          console.log('✅ Conversation pinned!');
          return;
        }
      } else {
        pinBtn.click();
        await sleep(1500);
        console.log('✅ Conversation pinned!');
        return;
      }
    }

    // Alternative: try right-clicking or long-pressing the conversation in the list
    console.log('⚠️ Pin button not found in conversation info');
    console.log('💡 Try right-clicking the conversation in the list and selecting "Pin"');
  };

  // ─────────────────────────────────────────────────────────
  // 8. Delete specific message
  // ─────────────────────────────────────────────────────────
  const deleteMessage = async (messageIndex = -1) => {
    if (!ensureInConversation()) return;
    console.log('🔄 Deleting a specific message...');

    const messages = $$(SEL.messageEntry);
    if (messages.length === 0) {
      console.log('❌ No messages found in this conversation');
      return;
    }

    // Default to the last message (your most recent)
    const targetIndex = messageIndex >= 0 ? messageIndex : messages.length - 1;
    if (targetIndex >= messages.length) {
      console.log(`❌ Message index ${targetIndex} out of range (0-${messages.length - 1})`);
      return;
    }

    const targetMsg = messages[targetIndex];
    console.log(`🔄 Targeting message #${targetIndex}: "${targetMsg.textContent.substring(0, 50)}..."`);

    // Hover over the message to reveal the action menu
    targetMsg.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    targetMsg.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await sleep(1000);

    // Click the more/caret button that appears on hover
    const moreBtn = targetMsg.querySelector(SEL.moreButton) ||
                    targetMsg.querySelector('[aria-label="More"]') ||
                    targetMsg.querySelector('[data-testid="caret"]');

    if (!moreBtn) {
      // Try finding it near the message
      const moreBtnGlobal = await waitForAny([
        SEL.moreButton,
        '[aria-label="More"]',
      ], 3000);
      if (!moreBtnGlobal) {
        console.log('❌ Could not find message action menu');
        console.log('💡 You can only delete your own messages');
        return;
      }
      moreBtnGlobal.click();
    } else {
      moreBtn.click();
    }

    await sleep(1500);

    // Find and click delete option
    const deleteItem = await waitForAny([
      SEL.deleteMenuItem,
      '[role="menuitem"]',
    ], 5000);

    if (deleteItem) {
      // If generic menuitem, find the delete one
      const menuItems = $$('[role="menuitem"]');
      const deleteOption = menuItems.find(el => el.textContent.toLowerCase().includes('delete'));
      if (deleteOption) {
        deleteOption.click();
        await sleep(1500);

        // Confirm deletion
        const confirmBtn = await waitForSelector(SEL.confirmButton, 5000);
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(1500);
          console.log('✅ Message deleted!');
        } else {
          console.log('⚠️ Confirmation dialog not found. Message may already be deleted.');
        }
      } else {
        console.log('❌ Delete option not found in menu');
      }
    } else {
      console.log('❌ Could not find message action menu items');
    }
  };

  // ─────────────────────────────────────────────────────────
  // 9. Delete entire conversation
  // ─────────────────────────────────────────────────────────
  const deleteConversation = async () => {
    if (!ensureOnMessages()) return;
    console.log('🔄 Deleting entire conversation...');

    const opened = await openConversationInfo();
    if (!opened) return;

    await sleep(1000);

    // Look for delete conversation option
    const deleteBtn = await waitForAny([
      '[data-testid="deleteConversation"]',
      '[aria-label="Delete conversation"]',
    ], 5000);

    if (!deleteBtn) {
      // Try scrolling down in the info panel to find it
      const menuItems = $$('[role="menuitem"], [role="button"]');
      const deleteOption = menuItems.find(el =>
        el.textContent.toLowerCase().includes('delete conversation') ||
        el.textContent.toLowerCase().includes('delete')
      );
      if (deleteOption) {
        deleteOption.click();
      } else {
        console.log('❌ Could not find delete conversation option');
        return;
      }
    } else {
      deleteBtn.click();
    }

    await sleep(1500);

    // Confirm deletion
    const confirmBtn = await waitForSelector(SEL.confirmButton, 5000);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(2000);
      console.log('✅ Conversation deleted!');
    } else {
      console.log('⚠️ Confirmation dialog not found');
    }
  };

  // ─────────────────────────────────────────────────────────
  // 10. Leave group DM
  // ─────────────────────────────────────────────────────────
  const leaveGroupDM = async () => {
    if (!ensureInConversation()) return;
    console.log('🔄 Leaving group DM...');

    const opened = await openConversationInfo();
    if (!opened) return;

    await sleep(1000);

    const leaveBtn = await waitForAny([
      SEL.leaveButton,
      '[data-testid="leaveConversation"]',
      '[aria-label="Leave conversation"]',
    ], 5000);

    if (!leaveBtn) {
      // Try finding by text
      const buttons = $$('[role="button"], [role="menuitem"]');
      const leaveOption = buttons.find(el =>
        el.textContent.toLowerCase().includes('leave')
      );
      if (leaveOption) {
        leaveOption.click();
      } else {
        console.log('❌ Could not find "Leave conversation" option');
        console.log('💡 This feature is only available in group DMs');
        return;
      }
    } else {
      leaveBtn.click();
    }

    await sleep(1500);

    const confirmBtn = await waitForSelector(SEL.confirmButton, 5000);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(2000);
      console.log('✅ Left the group DM!');
    } else {
      console.log('⚠️ Confirmation dialog not found');
    }
  };

  // ─────────────────────────────────────────────────────────
  // 11. Rename group DM
  // ─────────────────────────────────────────────────────────
  const renameGroupDM = async (newName) => {
    if (!newName || typeof newName !== 'string') {
      console.log('❌ Provide a new name: renameGroupDM("My Group")');
      return;
    }
    if (!ensureInConversation()) return;
    console.log(`🔄 Renaming group DM to "${newName}"...`);

    const opened = await openConversationInfo();
    if (!opened) return;

    await sleep(1000);

    // Look for the group name edit area
    const nameInput = await waitForAny([
      SEL.groupNameInput,
      '[data-testid="groupDmName"]',
      'input[name="groupName"]',
      '[aria-label="Group name"]',
    ], 5000);

    if (!nameInput) {
      // Try clicking on the group name text to make it editable
      const headerTexts = $$('h2, [role="heading"]');
      const groupHeader = headerTexts.find(el => el.closest('[data-testid="DmActivityContainer"], [data-testid="conversationInfoButton"]'));
      if (groupHeader) {
        groupHeader.click();
        await sleep(1500);
        const editInput = await waitForAny([
          'input[name="groupName"]',
          '[data-testid="groupDmName"]',
          'input[aria-label="Group name"]',
        ], 5000);
        if (editInput) {
          clearInput(editInput);
          await typeText(editInput, newName);
          await sleep(1000);

          // Save / confirm
          const saveBtn = await waitForAny([
            '[data-testid="confirmationSheetConfirm"]',
            '[data-testid="Profile_Save_Button"]',
            'button[type="submit"]',
          ], 3000);
          if (saveBtn) saveBtn.click();
          await sleep(1500);
          console.log(`✅ Group DM renamed to "${newName}"!`);
          return;
        }
      }
      console.log('❌ Could not find group name input');
      console.log('💡 This feature is only available in group DMs');
      return;
    }

    clearInput(nameInput);
    await typeText(nameInput, newName);
    await sleep(1000);

    // Look for save/done button
    const saveBtn = await waitForAny([
      '[data-testid="confirmationSheetConfirm"]',
      '[data-testid="Profile_Save_Button"]',
      'button[type="submit"]',
    ], 3000);
    if (saveBtn) {
      saveBtn.click();
      await sleep(1500);
    }

    console.log(`✅ Group DM renamed to "${newName}"!`);
  };

  // ─────────────────────────────────────────────────────────
  // 12. Add member to group DM
  // ─────────────────────────────────────────────────────────
  const addGroupMember = async (username) => {
    if (!username || typeof username !== 'string') {
      console.log('❌ Provide a username: addGroupMember("username")');
      return;
    }
    if (!ensureInConversation()) return;
    console.log(`🔄 Adding @${username} to group DM...`);

    const opened = await openConversationInfo();
    if (!opened) return;

    await sleep(1000);

    const addBtn = await waitForAny([
      SEL.addMemberButton,
      '[data-testid="addMember"]',
      '[aria-label="Add people"]',
      '[aria-label="Add members"]',
    ], 5000);

    if (!addBtn) {
      console.log('❌ Could not find "Add people" button');
      console.log('💡 This feature is only available in group DMs');
      return;
    }

    addBtn.click();
    await sleep(2000);

    const searchInput = await waitForAny([
      SEL.searchPeople,
      '[data-testid="searchPeople"]',
      'input[placeholder*="Search"]',
    ], 5000);

    if (!searchInput) {
      console.log('❌ Could not find search input');
      return;
    }

    await typeText(searchInput, username);
    await sleep(2000);

    const userResult = await waitForAny([
      '[data-testid="TypeaheadUser"]',
      '[data-testid="UserCell"]',
    ], 5000);

    if (!userResult) {
      console.log(`⚠️ Could not find @${username} in search results`);
      return;
    }

    userResult.click();
    await sleep(1500);

    // Confirm adding
    const doneBtn = await waitForAny([
      SEL.nextButton,
      '[data-testid="nextButton"]',
      SEL.confirmButton,
    ], 3000);

    if (doneBtn) {
      doneBtn.click();
      await sleep(1500);
    }

    console.log(`✅ @${username} added to group DM!`);
  };

  // ─────────────────────────────────────────────────────────
  // 13. Remove member from group DM
  // ─────────────────────────────────────────────────────────
  const removeGroupMember = async (username) => {
    if (!username || typeof username !== 'string') {
      console.log('❌ Provide a username: removeGroupMember("username")');
      return;
    }
    if (!ensureInConversation()) return;
    console.log(`🔄 Removing @${username} from group DM...`);

    const opened = await openConversationInfo();
    if (!opened) return;

    await sleep(1000);

    // Find the member in the member list
    const memberCells = $$('[data-testid="UserCell"]');
    const memberCell = memberCells.find(cell =>
      cell.textContent.toLowerCase().includes(username.toLowerCase())
    );

    if (!memberCell) {
      console.log(`❌ Could not find @${username} in group members`);
      return;
    }

    // Click on the member to open their options
    memberCell.click();
    await sleep(1500);

    const removeBtn = await waitForAny([
      SEL.removeMemberButton,
      '[data-testid="removeMember"]',
      '[aria-label="Remove from conversation"]',
    ], 5000);

    if (!removeBtn) {
      // Try looking in a dropdown menu
      const menuItems = $$('[role="menuitem"]');
      const removeOption = menuItems.find(el =>
        el.textContent.toLowerCase().includes('remove')
      );
      if (removeOption) {
        removeOption.click();
      } else {
        console.log('❌ Could not find "Remove" option');
        console.log('💡 You may need to be the group admin to remove members');
        return;
      }
    } else {
      removeBtn.click();
    }

    await sleep(1500);

    const confirmBtn = await waitForSelector(SEL.confirmButton, 5000);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(1500);
    }

    console.log(`✅ @${username} removed from group DM!`);
  };

  // ─────────────────────────────────────────────────────────
  // 14. Toggle read receipts
  // ─────────────────────────────────────────────────────────
  const toggleReadReceipts = async () => {
    console.log('🔄 Toggling DM read receipts...');
    console.log('🔄 Navigating to DM settings...');

    // Navigate to DM settings
    window.location.href = 'https://x.com/settings/direct_messages';
    await sleep(3000);

    // Wait for the page to load
    const settingsPage = await waitForAny([
      SEL.settingsSwitch,
      'input[type="checkbox"]',
      '[role="switch"]',
    ], 10000);

    if (!settingsPage) {
      console.log('❌ Could not find DM settings controls');
      console.log('💡 Try navigating to Settings > Privacy and Safety > Direct Messages manually');
      return;
    }

    // Look for read receipts toggle
    const switches = $$('[role="switch"], input[type="checkbox"], [data-testid="settingsSwitch"]');
    const labels = $$('span, label');
    const readReceiptLabel = labels.find(el =>
      el.textContent.toLowerCase().includes('read receipt') ||
      el.textContent.toLowerCase().includes('show read')
    );

    if (readReceiptLabel) {
      // Find the closest toggle to this label
      const container = readReceiptLabel.closest('[role="listitem"], div[class]');
      if (container) {
        const toggle = container.querySelector('[role="switch"], input[type="checkbox"], [data-testid="settingsSwitch"]');
        if (toggle) {
          toggle.click();
          await sleep(2000);
          console.log('✅ Read receipts toggled!');
          return;
        }
      }

      // Fallback: click the label area itself
      readReceiptLabel.click();
      await sleep(2000);
      console.log('✅ Read receipts setting clicked');
      return;
    }

    // If we can't find by label, toggle the first switch (often read receipts)
    if (switches.length > 0) {
      console.log(`⚠️ Found ${switches.length} toggle(s). Clicking the first one (likely read receipts).`);
      switches[0].click();
      await sleep(2000);
      console.log('✅ Setting toggled. Verify it was the correct one.');
    } else {
      console.log('❌ Could not find read receipts toggle');
    }
  };

  // ─────────────────────────────────────────────────────────
  // 15. Share post via DM
  // ─────────────────────────────────────────────────────────
  const sharePostViaDM = async (tweetUrl, username) => {
    if (!tweetUrl || typeof tweetUrl !== 'string') {
      console.log('❌ Provide a tweet URL: sharePostViaDM("https://x.com/user/status/123", "recipient")');
      return;
    }
    if (!username || typeof username !== 'string') {
      console.log('❌ Provide a recipient username: sharePostViaDM("url", "username")');
      return;
    }

    console.log(`🔄 Sharing post to @${username} via DM...`);

    // Navigate to the tweet first
    if (!window.location.href.includes(tweetUrl.replace('https://x.com', ''))) {
      window.location.href = tweetUrl;
      await sleep(3000);
    }

    // Find the share button on the tweet
    const shareBtn = await waitForAny([
      '[data-testid="share"]',
      'button[aria-label="Share post"]',
      'button[aria-label="Share Tweet"]',
    ], 5000);

    if (!shareBtn) {
      // Alternative: try the first tweet's share button
      const tweets = $$('article[data-testid="tweet"]');
      if (tweets.length > 0) {
        const tweetShareBtn = tweets[0].querySelector('[data-testid="share"], [aria-label*="Share"]');
        if (tweetShareBtn) {
          tweetShareBtn.click();
          await sleep(1500);
        } else {
          console.log('❌ Could not find share button on the tweet');
          return;
        }
      } else {
        console.log('❌ Could not find the tweet');
        return;
      }
    } else {
      shareBtn.click();
      await sleep(1500);
    }

    // Click "Send via Direct Message" in the share menu
    const menuItems = $$('[role="menuitem"]');
    const dmOption = menuItems.find(el =>
      el.textContent.toLowerCase().includes('direct message') ||
      el.textContent.toLowerCase().includes('send via')
    );

    if (dmOption) {
      dmOption.click();
      await sleep(2000);
    } else {
      // Try looking for the DM icon option
      const sendDMBtn = await waitForAny([
        '[data-testid="sendViaDM"]',
        '[aria-label*="Direct Message"]',
        '[aria-label*="Send via"]',
      ], 3000);
      if (sendDMBtn) {
        sendDMBtn.click();
        await sleep(2000);
      } else {
        console.log('❌ Could not find "Send via Direct Message" option');
        console.log('💡 Alternatively, just paste the tweet URL in a DM');
        return;
      }
    }

    // Search for the recipient
    const searchInput = await waitForAny([
      SEL.searchPeople,
      'input[placeholder*="Search"]',
    ], 5000);

    if (searchInput) {
      await typeText(searchInput, username);
      await sleep(2000);

      const userResult = await waitForAny([
        '[data-testid="TypeaheadUser"]',
        '[data-testid="UserCell"]',
      ], 5000);

      if (userResult) {
        userResult.click();
        await sleep(1500);

        // Click send
        const sendBtn = await waitForAny([
          SEL.sendButton,
          SEL.nextButton,
          '[data-testid="dmComposerSendButton"]',
        ], 3000);

        if (sendBtn) {
          sendBtn.click();
          await sleep(2000);
          console.log(`✅ Post shared with @${username} via DM!`);
        } else {
          console.log('⚠️ Could not find send button');
        }
      } else {
        console.log(`⚠️ Could not find @${username} in search results`);
      }
    } else {
      console.log('❌ Could not find recipient search input');
    }
  };

  // ─────────────────────────────────────────────────────────
  // Expose on window.XActions.advancedDM
  // ─────────────────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.advancedDM = {
    sendMedia,
    sendGIF,
    sendVoiceMessage,
    startAudioCall,
    startVideoCall,
    toggleEncryptedDM,
    pinConversation,
    deleteMessage,
    deleteConversation,
    leaveGroupDM,
    renameGroupDM,
    addGroupMember,
    removeGroupMember,
    toggleReadReceipts,
    sharePostViaDM,
  };

  // ─────────────────────────────────────────────────────────
  // Print menu
  // ─────────────────────────────────────────────────────────
  const W = 62;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  💬 ADVANCED DM FEATURES — XActions' + ' '.repeat(W - 38) + '║');
  console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  📎 Media & Content' + ' '.repeat(W - 21) + '║');
  console.log('║    sendMedia()' + ' '.repeat(W - 16) + '║');
  console.log('║    sendGIF("search term")' + ' '.repeat(W - 27) + '║');
  console.log('║    sendVoiceMessage(durationMs)' + ' '.repeat(W - 33) + '║');
  console.log('║    sharePostViaDM(tweetUrl, username)' + ' '.repeat(W - 39) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  📞 Calls' + ' '.repeat(W - 12) + '║');
  console.log('║    startAudioCall()' + ' '.repeat(W - 21) + '║');
  console.log('║    startVideoCall()' + ' '.repeat(W - 21) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  🔒 Privacy & Settings' + ' '.repeat(W - 25) + '║');
  console.log('║    toggleEncryptedDM()' + ' '.repeat(W - 24) + '║');
  console.log('║    toggleReadReceipts()' + ' '.repeat(W - 25) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  📌 Conversation Management' + ' '.repeat(W - 30) + '║');
  console.log('║    pinConversation()' + ' '.repeat(W - 22) + '║');
  console.log('║    deleteMessage(index)' + ' '.repeat(W - 25) + '║');
  console.log('║    deleteConversation()' + ' '.repeat(W - 25) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  👥 Group DM' + ' '.repeat(W - 15) + '║');
  console.log('║    leaveGroupDM()' + ' '.repeat(W - 19) + '║');
  console.log('║    renameGroupDM("New Name")' + ' '.repeat(W - 30) + '║');
  console.log('║    addGroupMember("username")' + ' '.repeat(W - 31) + '║');
  console.log('║    removeGroupMember("username")' + ' '.repeat(W - 33) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
  console.log('');
  console.log('💡 Usage: window.XActions.advancedDM.sendGIF("thumbs up")');
  console.log('💡 Open a DM conversation first, then call a function.');
})();
