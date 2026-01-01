// XActions Actions Library - Complete X/Twitter Actions
// https://github.com/nirholas/XActions
//
// This module contains ALL available X/Twitter actions - visible, hidden, and undocumented.
// Paste core.js FIRST, then this file. Other scripts can use window.XActions.
//
// Usage: XActions.tweet.post("Hello world!")
//        XActions.user.follow("username")
//        XActions.dm.send("username", "Hi there!")

window.XActions = window.XActions || {};

window.XActions = (() => {
  const Core = window.XActions?.Core;
  if (!Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return null;
  }

  const { sleep, randomDelay, log, storage, waitForElement, waitForElements, clickElement, typeText } = Core;

  // ============================================
  // EXTENDED SELECTORS (All X UI Elements)
  // ============================================
  const SEL = {
    // === Tweet/Post Elements ===
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    tweetLink: 'a[href*="/status/"]',
    quoteTweet: '[data-testid="tweet"] [data-testid="tweet"]',
    
    // === Compose/Input ===
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    tweetButtonInline: '[data-testid="tweetButtonInline"]',
    replyTextarea: '[data-testid="tweetTextarea_0"]',
    dmTextarea: '[data-testid="dmComposerTextInput"]',
    dmSendButton: '[data-testid="dmComposerSendButton"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    
    // === Action Buttons ===
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    unretweetButton: '[data-testid="unretweet"]',
    replyButton: '[data-testid="reply"]',
    shareButton: '[data-testid="share"]', 
    bookmarkButton: '[data-testid="bookmark"]',
    removeBookmark: '[data-testid="removeBookmark"]',
    
    // === Follow/Unfollow ===
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    followingButton: '[data-testid="placementTracking"] [role="button"]',
    
    // === Dropdown/Menu Actions ===
    caret: '[data-testid="caret"]',
    menuItem: '[role="menuitem"]',
    confirmButton: '[data-testid="confirmationSheetConfirm"]',
    cancelButton: '[data-testid="confirmationSheetCancel"]',
    
    // === User Elements ===
    userCell: '[data-testid="UserCell"]',
    userAvatar: '[data-testid="UserAvatar-Container"]',
    userName: '[data-testid="User-Name"]',
    userDescription: '[data-testid="UserDescription"]',
    userFollowIndicator: '[data-testid="userFollowIndicator"]',
    
    // === Profile Elements ===
    profileHeader: '[data-testid="UserProfileHeader_Items"]',
    editProfileButton: '[data-testid="editProfileButton"]',
    userProfileSchema: '[data-testid="UserProfileSchema"]',
    
    // === Navigation ===
    primaryColumn: '[data-testid="primaryColumn"]',
    sidebarColumn: '[data-testid="sidebarColumn"]',
    timeline: 'section[role="region"]',
    tabList: '[role="tablist"]',
    backButton: '[data-testid="app-bar-back"]',
    
    // === Modals/Dialogs ===
    modal: '[data-testid="modal"]',
    sheetDialog: '[data-testid="sheetDialog"]',
    toast: '[data-testid="toast"]',
    
    // === Media ===
    mediaUpload: 'input[data-testid="fileInput"]',
    gifButton: '[data-testid="gifyButton"]',
    emojiButton: '[data-testid="emojiButton"]',
    pollButton: '[data-testid="pollButton"]',
    scheduleButton: '[data-testid="scheduledButton"]',
    locationButton: '[data-testid="geoButton"]',
    
    // === Lists ===
    listContainer: '[data-testid="list"]',
    listItem: '[data-testid="listItem"]',
    
    // === DM Elements ===
    dmConversation: '[data-testid="conversation"]',
    dmMessage: '[data-testid="messageEntry"]',
    dmInbox: '[data-testid="DMDrawer"]',
    
    // === Notifications ===
    notification: '[data-testid="notification"]',
    notificationCell: '[data-testid="cellInnerDiv"]',
    
    // === Communities ===
    communityCard: '[data-testid="CommunityCard"]',
    communityHeader: '[data-testid="communityHeader"]',
    
    // === Spaces ===
    spaceBar: '[data-testid="SpaceBar"]',
    spaceCard: '[data-testid="SpaceCard"]',
  };

  // ============================================
  // SECTION 1: TWEET/POST ACTIONS
  // ============================================
  const tweet = {
    // Post a new tweet
    post: async (text, options = {}) => {
      log(`Posting tweet: "${text.substring(0, 30)}..."`, 'action');
      
      // Navigate to compose if needed
      const composeButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
      if (composeButton && !document.querySelector(SEL.tweetTextarea)) {
        await clickElement(composeButton);
        await sleep(1000);
      }
      
      const textarea = await waitForElement(SEL.tweetTextarea);
      if (!textarea) {
        log('Could not find tweet textarea', 'error');
        return false;
      }
      
      await typeText(textarea, text);
      await sleep(500);
      
      // Handle media if provided
      if (options.mediaUrl) {
        // Note: Browser can't upload files directly, but can trigger input
        log('Media upload requires manual file selection', 'warning');
      }
      
      if (!options.draft) {
        const postButton = document.querySelector(SEL.tweetButton) || 
                          document.querySelector(SEL.tweetButtonInline);
        if (postButton && !postButton.disabled) {
          await clickElement(postButton);
          log('Tweet posted!', 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Reply to a tweet
    reply: async (tweetElement, text) => {
      log(`Replying: "${text.substring(0, 30)}..."`, 'action');
      
      const replyBtn = tweetElement.querySelector(SEL.replyButton);
      if (!replyBtn) return false;
      
      await clickElement(replyBtn);
      await sleep(800);
      
      const textarea = await waitForElement(SEL.replyTextarea);
      if (!textarea) return false;
      
      await typeText(textarea, text);
      await sleep(500);
      
      const postButton = document.querySelector('[data-testid="tweetButton"]');
      if (postButton && !postButton.disabled) {
        await clickElement(postButton);
        log('Reply posted!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Quote tweet
    quote: async (tweetElement, text) => {
      log(`Quote tweeting: "${text.substring(0, 30)}..."`, 'action');
      
      const retweetBtn = tweetElement.querySelector(SEL.retweetButton);
      if (!retweetBtn) return false;
      
      await clickElement(retweetBtn);
      await sleep(500);
      
      // Click "Quote" option
      const quoteOption = await waitForElement('[data-testid="Dropdown"] [role="menuitem"]:nth-child(2)');
      if (!quoteOption) return false;
      
      await clickElement(quoteOption);
      await sleep(800);
      
      const textarea = await waitForElement(SEL.tweetTextarea);
      if (!textarea) return false;
      
      await typeText(textarea, text);
      await sleep(500);
      
      const postButton = document.querySelector(SEL.tweetButton);
      if (postButton && !postButton.disabled) {
        await clickElement(postButton);
        log('Quote tweet posted!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Delete a tweet (must be on your own tweet)
    delete: async (tweetElement) => {
      log('Deleting tweet...', 'action');
      
      const caret = tweetElement.querySelector(SEL.caret);
      if (!caret) return false;
      
      await clickElement(caret);
      await sleep(500);
      
      // Find delete option
      const menuItems = document.querySelectorAll(SEL.menuItem);
      let deleteItem = null;
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('delete')) {
          deleteItem = item;
          break;
        }
      }
      
      if (!deleteItem) return false;
      
      await clickElement(deleteItem);
      await sleep(500);
      
      const confirmBtn = await waitForElement(SEL.confirmButton);
      if (confirmBtn) {
        await clickElement(confirmBtn);
        log('Tweet deleted!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Pin a tweet to profile
    pin: async (tweetElement) => {
      log('Pinning tweet...', 'action');
      
      const caret = tweetElement.querySelector(SEL.caret);
      if (!caret) return false;
      
      await clickElement(caret);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      let pinItem = null;
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('pin')) {
          pinItem = item;
          break;
        }
      }
      
      if (pinItem) {
        await clickElement(pinItem);
        await sleep(500);
        
        const confirmBtn = await waitForElement(SEL.confirmButton);
        if (confirmBtn) await clickElement(confirmBtn);
        
        log('Tweet pinned!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Get tweet ID from element
    getId: (tweetElement) => {
      const link = tweetElement.querySelector(SEL.tweetLink);
      if (link) {
        const match = link.href.match(/status\/(\d+)/);
        if (match) return match[1];
      }
      return null;
    },
    
    // Get all visible tweets
    getAll: () => {
      return Array.from(document.querySelectorAll(SEL.tweet));
    },
    
    // Thread: Post multiple tweets as a thread
    thread: async (tweets) => {
      log(`Posting thread of ${tweets.length} tweets...`, 'action');
      
      for (let i = 0; i < tweets.length; i++) {
        await tweet.post(tweets[i], { addToThread: i > 0 });
        await randomDelay(2000, 4000);
      }
      
      log('Thread posted!', 'success');
      return true;
    },
  };

  // ============================================
  // SECTION 2: ENGAGEMENT ACTIONS
  // ============================================
  const engage = {
    // Like a tweet
    like: async (tweetElement) => {
      const likeBtn = tweetElement.querySelector(SEL.likeButton);
      if (!likeBtn) {
        log('Already liked or button not found', 'warning');
        return false;
      }
      
      await clickElement(likeBtn);
      log('Liked!', 'success');
      return true;
    },
    
    // Unlike a tweet
    unlike: async (tweetElement) => {
      const unlikeBtn = tweetElement.querySelector(SEL.unlikeButton);
      if (!unlikeBtn) return false;
      
      await clickElement(unlikeBtn);
      log('Unliked!', 'success');
      return true;
    },
    
    // Retweet
    retweet: async (tweetElement) => {
      const rtBtn = tweetElement.querySelector(SEL.retweetButton);
      if (!rtBtn) return false;
      
      await clickElement(rtBtn);
      await sleep(500);
      
      // Click first option (Repost)
      const repostOption = await waitForElement('[data-testid="retweetConfirm"]');
      if (repostOption) {
        await clickElement(repostOption);
        log('Retweeted!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Undo retweet
    unretweet: async (tweetElement) => {
      const unrtBtn = tweetElement.querySelector(SEL.unretweetButton);
      if (!unrtBtn) return false;
      
      await clickElement(unrtBtn);
      await sleep(500);
      
      const confirmOption = await waitForElement('[data-testid="unretweetConfirm"]');
      if (confirmOption) {
        await clickElement(confirmOption);
        log('Unretweeted!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Bookmark a tweet
    bookmark: async (tweetElement) => {
      const shareBtn = tweetElement.querySelector(SEL.shareButton);
      if (!shareBtn) return false;
      
      await clickElement(shareBtn);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('bookmark')) {
          await clickElement(item);
          log('Bookmarked!', 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Remove bookmark
    unbookmark: async (tweetElement) => {
      const removeBtn = tweetElement.querySelector(SEL.removeBookmark);
      if (removeBtn) {
        await clickElement(removeBtn);
        log('Bookmark removed!', 'success');
        return true;
      }
      
      // Try via share menu
      return await engage.bookmark(tweetElement); // Toggle
    },
    
    // Add to list via tweet menu
    addToList: async (tweetElement, listName) => {
      const caret = tweetElement.querySelector(SEL.caret);
      if (!caret) return false;
      
      await clickElement(caret);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('add') && 
            item.textContent.toLowerCase().includes('list')) {
          await clickElement(item);
          await sleep(800);
          
          // Find and click the specific list
          if (listName) {
            const lists = document.querySelectorAll('[data-testid="listItem"]');
            for (const list of lists) {
              if (list.textContent.includes(listName)) {
                await clickElement(list);
                log(`Added to list: ${listName}`, 'success');
                return true;
              }
            }
          }
          return true;
        }
      }
      
      return false;
    },
    
    // Report a tweet
    report: async (tweetElement, reason) => {
      log('Opening report dialog...', 'action');
      
      const caret = tweetElement.querySelector(SEL.caret);
      if (!caret) return false;
      
      await clickElement(caret);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('report')) {
          await clickElement(item);
          log('Report dialog opened - complete manually', 'warning');
          return true;
        }
      }
      
      return false;
    },
    
    // Copy link to tweet
    copyLink: async (tweetElement) => {
      const shareBtn = tweetElement.querySelector(SEL.shareButton);
      if (!shareBtn) return false;
      
      await clickElement(shareBtn);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('copy link')) {
          await clickElement(item);
          log('Link copied!', 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Share via DM
    shareViaDM: async (tweetElement, username) => {
      const shareBtn = tweetElement.querySelector(SEL.shareButton);
      if (!shareBtn) return false;
      
      await clickElement(shareBtn);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('send via direct message')) {
          await clickElement(item);
          await sleep(800);
          
          // Type username to search
          if (username) {
            const searchInput = await waitForElement('input[placeholder*="Search"]');
            if (searchInput) {
              searchInput.value = username;
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              await sleep(1000);
              
              // Click first result
              const result = await waitForElement('[data-testid="TypeaheadUser"]');
              if (result) await clickElement(result);
            }
          }
          
          return true;
        }
      }
      
      return false;
    },
    
    // Embed tweet (get embed code)
    embed: async (tweetElement) => {
      const shareBtn = tweetElement.querySelector(SEL.shareButton);
      if (!shareBtn) return false;
      
      await clickElement(shareBtn);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('embed')) {
          await clickElement(item);
          log('Embed dialog opened', 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // View tweet analytics (if available)
    viewAnalytics: async (tweetElement) => {
      const caret = tweetElement.querySelector(SEL.caret);
      if (!caret) return false;
      
      await clickElement(caret);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('analytics') ||
            item.textContent.toLowerCase().includes('view post engagements')) {
          await clickElement(item);
          log('Analytics opened', 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Request Community Note
    requestNote: async (tweetElement) => {
      const caret = tweetElement.querySelector(SEL.caret);
      if (!caret) return false;
      
      await clickElement(caret);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('note') ||
            item.textContent.toLowerCase().includes('community note')) {
          await clickElement(item);
          log('Community note dialog opened', 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Highlight tweet (X Premium)
    highlight: async (tweetElement) => {
      const caret = tweetElement.querySelector(SEL.caret);
      if (!caret) return false;
      
      await clickElement(caret);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('highlight')) {
          await clickElement(item);
          log('Tweet highlighted!', 'success');
          return true;
        }
      }
      
      return false;
    },
  };

  // ============================================
  // SECTION 3: USER ACTIONS
  // ============================================
  const user = {
    // Follow a user
    follow: async (target) => {
      let button;
      
      if (typeof target === 'string') {
        window.location.href = `https://x.com/${target}`;
        await sleep(2000);
        button = await waitForElement(SEL.followButton);
      } else {
        button = target.querySelector(SEL.followButton);
      }
      
      if (!button) {
        log('Follow button not found (already following?)', 'warning');
        return false;
      }
      
      await clickElement(button);
      log(`Followed!`, 'success');
      return true;
    },
    
    // Unfollow a user
    unfollow: async (target) => {
      let button;
      
      if (typeof target === 'string') {
        window.location.href = `https://x.com/${target}`;
        await sleep(2000);
        button = await waitForElement(SEL.unfollowButton);
      } else {
        button = target.querySelector(SEL.unfollowButton);
      }
      
      if (!button) {
        log('Unfollow button not found', 'warning');
        return false;
      }
      
      await clickElement(button);
      await sleep(500);
      
      const confirmBtn = await waitForElement(SEL.confirmButton);
      if (confirmBtn) {
        await clickElement(confirmBtn);
        log(`Unfollowed!`, 'success');
        return true;
      }
      
      return false;
    },
    
    // Block a user
    block: async (username) => {
      log(`Blocking @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const moreButton = await waitForElement('[data-testid="userActions"]');
      if (!moreButton) return false;
      
      await clickElement(moreButton);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('block')) {
          await clickElement(item);
          await sleep(500);
          
          const confirmBtn = await waitForElement(SEL.confirmButton);
          if (confirmBtn) {
            await clickElement(confirmBtn);
            log(`Blocked @${username}!`, 'success');
            return true;
          }
        }
      }
      
      return false;
    },
    
    // Unblock a user
    unblock: async (username) => {
      log(`Unblocking @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const unblockBtn = await waitForElement('[data-testid="placementTracking"] [role="button"]');
      if (unblockBtn && unblockBtn.textContent.toLowerCase().includes('blocked')) {
        await clickElement(unblockBtn);
        await sleep(500);
        
        const confirmBtn = await waitForElement(SEL.confirmButton);
        if (confirmBtn) await clickElement(confirmBtn);
        
        log(`Unblocked @${username}!`, 'success');
        return true;
      }
      
      return false;
    },
    
    // Mute a user
    mute: async (username) => {
      log(`Muting @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const moreButton = await waitForElement('[data-testid="userActions"]');
      if (!moreButton) return false;
      
      await clickElement(moreButton);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('mute')) {
          await clickElement(item);
          log(`Muted @${username}!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Unmute a user
    unmute: async (username) => {
      log(`Unmuting @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const moreButton = await waitForElement('[data-testid="userActions"]');
      if (!moreButton) return false;
      
      await clickElement(moreButton);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('unmute')) {
          await clickElement(item);
          log(`Unmuted @${username}!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Report a user
    report: async (username) => {
      log(`Reporting @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const moreButton = await waitForElement('[data-testid="userActions"]');
      if (!moreButton) return false;
      
      await clickElement(moreButton);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('report')) {
          await clickElement(item);
          log('Report dialog opened - complete manually', 'warning');
          return true;
        }
      }
      
      return false;
    },
    
    // Add user to a list
    addToList: async (username, listName) => {
      log(`Adding @${username} to list...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const moreButton = await waitForElement('[data-testid="userActions"]');
      if (!moreButton) return false;
      
      await clickElement(moreButton);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('add') && 
            item.textContent.toLowerCase().includes('list')) {
          await clickElement(item);
          await sleep(800);
          
          if (listName) {
            const lists = document.querySelectorAll('[role="checkbox"]');
            for (const list of lists) {
              if (list.closest('[data-testid]')?.textContent.includes(listName)) {
                await clickElement(list);
                log(`Added to ${listName}!`, 'success');
                break;
              }
            }
          }
          
          const doneBtn = document.querySelector('[data-testid="addToListsButton"]');
          if (doneBtn) await clickElement(doneBtn);
          
          return true;
        }
      }
      
      return false;
    },
    
    // Turn on notifications for user
    notifyOn: async (username) => {
      log(`Turning on notifications for @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const moreButton = await waitForElement('[data-testid="userActions"]');
      if (!moreButton) return false;
      
      await clickElement(moreButton);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('turn on notifications') ||
            item.textContent.toLowerCase().includes('notify')) {
          await clickElement(item);
          log(`Notifications on for @${username}!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Turn off notifications for user  
    notifyOff: async (username) => {
      log(`Turning off notifications for @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const moreButton = await waitForElement('[data-testid="userActions"]');
      if (!moreButton) return false;
      
      await clickElement(moreButton);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('turn off notifications')) {
          await clickElement(item);
          log(`Notifications off for @${username}!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Navigation helpers
    viewTopics: async (username) => { window.location.href = `https://x.com/${username}/topics`; await sleep(2000); return true; },
    viewLists: async (username) => { window.location.href = `https://x.com/${username}/lists`; await sleep(2000); return true; },
    viewFollowers: async (username) => { window.location.href = `https://x.com/${username}/followers`; await sleep(2000); return true; },
    viewFollowing: async (username) => { window.location.href = `https://x.com/${username}/following`; await sleep(2000); return true; },
    viewLikes: async (username) => { window.location.href = `https://x.com/${username}/likes`; await sleep(2000); return true; },
    viewMedia: async (username) => { window.location.href = `https://x.com/${username}/media`; await sleep(2000); return true; },
    viewReplies: async (username) => { window.location.href = `https://x.com/${username}/with_replies`; await sleep(2000); return true; },
    viewHighlights: async (username) => { window.location.href = `https://x.com/${username}/highlights`; await sleep(2000); return true; },
    viewArticles: async (username) => { window.location.href = `https://x.com/${username}/articles`; await sleep(2000); return true; },
    
    // Check if user follows you
    followsYou: async (username) => {
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      return document.querySelector(SEL.userFollowIndicator) !== null;
    },
    
    // Get user info
    getInfo: async (username) => {
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const info = {
        username,
        displayName: document.querySelector('[data-testid="UserName"]')?.textContent || '',
        bio: document.querySelector(SEL.userDescription)?.textContent || '',
        followsYou: document.querySelector(SEL.userFollowIndicator) !== null,
        verified: document.querySelector('[data-testid="icon-verified"]') !== null,
        protected: document.querySelector('[data-testid="icon-lock"]') !== null,
      };
      
      const links = document.querySelectorAll('a[href*="/followers"], a[href*="/following"]');
      links.forEach(link => {
        const text = link.textContent;
        if (link.href.includes('/followers')) info.followers = text;
        else if (link.href.includes('/following')) info.following = text;
      });
      
      return info;
    },
    
    // Restrict user
    restrict: async (username) => {
      log(`Restricting @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}`;
      await sleep(2000);
      
      const moreButton = await waitForElement('[data-testid="userActions"]');
      if (!moreButton) return false;
      
      await clickElement(moreButton);
      await sleep(500);
      
      const menuItems = document.querySelectorAll(SEL.menuItem);
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('restrict')) {
          await clickElement(item);
          log(`Restricted @${username}!`, 'success');
          return true;
        }
      }
      
      return false;
    },
  };

  // ============================================
  // SECTION 4: DIRECT MESSAGES
  // ============================================
  const dm = {
    // Send a DM to user
    send: async (username, message) => {
      log(`Sending DM to @${username}...`, 'action');
      
      window.location.href = `https://x.com/messages`;
      await sleep(2000);
      
      // Click new message button
      const newMsgBtn = await waitForElement('[data-testid="NewDM_Button"]');
      if (newMsgBtn) {
        await clickElement(newMsgBtn);
        await sleep(800);
      }
      
      // Search for user
      const searchInput = await waitForElement('input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.value = username;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(1000);
        
        // Click first result
        const userResult = await waitForElement('[data-testid="TypeaheadUser"]');
        if (userResult) {
          await clickElement(userResult);
          await sleep(500);
          
          // Click next
          const nextBtn = await waitForElement('[data-testid="nextButton"]');
          if (nextBtn) await clickElement(nextBtn);
          await sleep(800);
        }
      }
      
      // Type message
      const msgInput = await waitForElement(SEL.dmTextarea);
      if (msgInput) {
        await typeText(msgInput, message);
        await sleep(300);
        
        const sendBtn = document.querySelector(SEL.dmSendButton);
        if (sendBtn) {
          await clickElement(sendBtn);
          log(`DM sent to @${username}!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Open DM conversation with user
    open: async (username) => {
      log(`Opening DM with @${username}...`, 'action');
      
      window.location.href = `https://x.com/messages`;
      await sleep(2000);
      
      // Search in conversations
      const conversations = document.querySelectorAll('[data-testid="conversation"]');
      for (const conv of conversations) {
        if (conv.textContent.toLowerCase().includes(username.toLowerCase())) {
          await clickElement(conv);
          log(`Opened DM with @${username}`, 'success');
          return true;
        }
      }
      
      // If not found, start new conversation
      return await dm.send(username, '');
    },
    
    // Get all conversations
    getConversations: async () => {
      window.location.href = `https://x.com/messages`;
      await sleep(2000);
      
      const conversations = [];
      const convElements = document.querySelectorAll('[data-testid="conversation"]');
      
      for (const conv of convElements) {
        conversations.push({
          element: conv,
          text: conv.textContent,
        });
      }
      
      return conversations;
    },
    
    // Delete a conversation
    deleteConversation: async (conversationElement) => {
      log('Deleting conversation...', 'action');
      
      // Long press or find menu
      const moreBtn = conversationElement.querySelector('[data-testid="caret"]');
      if (moreBtn) {
        await clickElement(moreBtn);
        await sleep(500);
        
        const menuItems = document.querySelectorAll(SEL.menuItem);
        for (const item of menuItems) {
          if (item.textContent.toLowerCase().includes('delete')) {
            await clickElement(item);
            await sleep(500);
            
            const confirmBtn = await waitForElement(SEL.confirmButton);
            if (confirmBtn) {
              await clickElement(confirmBtn);
              log('Conversation deleted!', 'success');
              return true;
            }
          }
        }
      }
      
      return false;
    },
    
    // Leave a group DM
    leaveGroup: async () => {
      log('Leaving group...', 'action');
      
      const infoBtn = await waitForElement('[data-testid="DMConversationInfoButton"]');
      if (infoBtn) {
        await clickElement(infoBtn);
        await sleep(500);
        
        const menuItems = document.querySelectorAll(SEL.menuItem);
        for (const item of menuItems) {
          if (item.textContent.toLowerCase().includes('leave')) {
            await clickElement(item);
            await sleep(500);
            
            const confirmBtn = await waitForElement(SEL.confirmButton);
            if (confirmBtn) {
              await clickElement(confirmBtn);
              log('Left group!', 'success');
              return true;
            }
          }
        }
      }
      
      return false;
    },
    
    // Create group DM
    createGroup: async (usernames, groupName = null) => {
      log(`Creating group DM with ${usernames.length} users...`, 'action');
      
      window.location.href = `https://x.com/messages`;
      await sleep(2000);
      
      const newMsgBtn = await waitForElement('[data-testid="NewDM_Button"]');
      if (newMsgBtn) await clickElement(newMsgBtn);
      await sleep(800);
      
      const searchInput = await waitForElement('input[placeholder*="Search"]');
      if (!searchInput) return false;
      
      for (const username of usernames) {
        searchInput.value = username;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(1000);
        
        const userResult = await waitForElement('[data-testid="TypeaheadUser"]');
        if (userResult) {
          await clickElement(userResult);
          await sleep(500);
        }
        
        searchInput.value = '';
      }
      
      const nextBtn = await waitForElement('[data-testid="nextButton"]');
      if (nextBtn) {
        await clickElement(nextBtn);
        log('Group created!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Send image in DM
    sendImage: async () => {
      log('Opening image picker...', 'action');
      
      const mediaBtn = document.querySelector('[data-testid="DMImageButton"]');
      if (mediaBtn) {
        await clickElement(mediaBtn);
        log('Image picker opened - select file manually', 'warning');
        return true;
      }
      
      return false;
    },
    
    // Send GIF in DM
    sendGif: async (searchTerm) => {
      log('Opening GIF picker...', 'action');
      
      const gifBtn = document.querySelector('[data-testid="DMGifButton"]');
      if (gifBtn) {
        await clickElement(gifBtn);
        await sleep(500);
        
        if (searchTerm) {
          const gifSearch = await waitForElement('input[placeholder*="Search"]');
          if (gifSearch) {
            gifSearch.value = searchTerm;
            gifSearch.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(1000);
            
            // Click first result
            const gifResult = await waitForElement('[data-testid="gif"]');
            if (gifResult) {
              await clickElement(gifResult);
              log('GIF selected!', 'success');
              return true;
            }
          }
        }
      }
      
      return false;
    },
    
    // React to a message
    react: async (messageElement, emoji) => {
      // Double-click to react
      messageElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await sleep(500);
      
      // Select reaction
      const reactions = document.querySelectorAll('[data-testid="reactionEmoji"]');
      for (const reaction of reactions) {
        if (reaction.textContent.includes(emoji)) {
          await clickElement(reaction);
          log('Reacted!', 'success');
          return true;
        }
      }
      
      return false;
    },
  };

  // ============================================
  // SECTION 5: SEARCH & NAVIGATION
  // ============================================
  const search = {
    // Search for a query
    query: async (query, filter = 'top') => {
      log(`Searching: "${query}"...`, 'action');
      
      const encoded = encodeURIComponent(query);
      const filterParam = filter !== 'top' ? `&f=${filter}` : '';
      window.location.href = `https://x.com/search?q=${encoded}${filterParam}`;
      await sleep(2000);
      
      return true;
    },
    
    // Search filters
    top: async (query) => await search.query(query, 'top'),
    latest: async (query) => await search.query(query, 'live'),
    people: async (query) => await search.query(query, 'user'),
    photos: async (query) => await search.query(query, 'image'),
    videos: async (query) => await search.query(query, 'video'),
    
    // Advanced search operators
    from: async (username) => await search.query(`from:${username}`),
    to: async (username) => await search.query(`to:${username}`),
    mentions: async (username) => await search.query(`@${username}`),
    hashtag: async (tag) => await search.query(`#${tag.replace('#', '')}`),
    
    // Complex search
    advanced: async (options) => {
      const parts = [];
      
      if (options.words) parts.push(options.words);
      if (options.exactPhrase) parts.push(`"${options.exactPhrase}"`);
      if (options.anyWords) parts.push(`(${options.anyWords.split(' ').join(' OR ')})`);
      if (options.excludeWords) parts.push(options.excludeWords.split(' ').map(w => `-${w}`).join(' '));
      if (options.hashtags) parts.push(options.hashtags.map(t => `#${t.replace('#', '')}`).join(' '));
      if (options.from) parts.push(`from:${options.from}`);
      if (options.to) parts.push(`to:${options.to}`);
      if (options.mentioning) parts.push(`@${options.mentioning}`);
      if (options.minReplies) parts.push(`min_replies:${options.minReplies}`);
      if (options.minFaves) parts.push(`min_faves:${options.minFaves}`);
      if (options.minRetweets) parts.push(`min_retweets:${options.minRetweets}`);
      if (options.since) parts.push(`since:${options.since}`);
      if (options.until) parts.push(`until:${options.until}`);
      if (options.lang) parts.push(`lang:${options.lang}`);
      if (options.verified) parts.push('filter:verified');
      if (options.hasMedia) parts.push('filter:media');
      if (options.hasImages) parts.push('filter:images');
      if (options.hasVideos) parts.push('filter:videos');
      if (options.hasLinks) parts.push('filter:links');
      if (options.isReply) parts.push('filter:replies');
      if (options.isRetweet) parts.push('filter:nativeretweets');
      if (options.excludeRetweets) parts.push('-filter:retweets');
      if (options.near) parts.push(`near:${options.near}`);
      if (options.within) parts.push(`within:${options.within}`);
      
      return await search.query(parts.join(' '), options.filter || 'top');
    },
    
    // Get current search results
    getResults: () => {
      return Array.from(document.querySelectorAll(SEL.tweet));
    },
  };

  const nav = {
    // Main navigation
    home: async () => { window.location.href = 'https://x.com/home'; await sleep(2000); },
    explore: async () => { window.location.href = 'https://x.com/explore'; await sleep(2000); },
    notifications: async () => { window.location.href = 'https://x.com/notifications'; await sleep(2000); },
    messages: async () => { window.location.href = 'https://x.com/messages'; await sleep(2000); },
    bookmarks: async () => { window.location.href = 'https://x.com/i/bookmarks'; await sleep(2000); },
    lists: async () => { window.location.href = 'https://x.com/i/lists'; await sleep(2000); },
    communities: async () => { window.location.href = 'https://x.com/i/communities'; await sleep(2000); },
    premium: async () => { window.location.href = 'https://x.com/i/premium_sign_up'; await sleep(2000); },
    profile: async (username) => { window.location.href = `https://x.com/${username || 'me'}`; await sleep(2000); },
    settings: async () => { window.location.href = 'https://x.com/settings'; await sleep(2000); },
    
    // Notification tabs
    notifyAll: async () => { window.location.href = 'https://x.com/notifications'; await sleep(2000); },
    notifyVerified: async () => { window.location.href = 'https://x.com/notifications/verified'; await sleep(2000); },
    notifyMentions: async () => { window.location.href = 'https://x.com/notifications/mentions'; await sleep(2000); },
    
    // Timeline tabs
    forYou: async () => {
      await nav.home();
      const tabs = document.querySelectorAll('[role="tab"]');
      for (const tab of tabs) {
        if (tab.textContent.toLowerCase().includes('for you')) {
          await clickElement(tab);
          return true;
        }
      }
    },
    following: async () => {
      await nav.home();
      const tabs = document.querySelectorAll('[role="tab"]');
      for (const tab of tabs) {
        if (tab.textContent.toLowerCase().includes('following')) {
          await clickElement(tab);
          return true;
        }
      }
    },
    
    // Quick access
    trending: async () => { window.location.href = 'https://x.com/explore/tabs/trending'; await sleep(2000); },
    forYouExplore: async () => { window.location.href = 'https://x.com/explore/tabs/for_you'; await sleep(2000); },
    news: async () => { window.location.href = 'https://x.com/explore/tabs/news'; await sleep(2000); },
    sports: async () => { window.location.href = 'https://x.com/explore/tabs/sports'; await sleep(2000); },
    entertainment: async () => { window.location.href = 'https://x.com/explore/tabs/entertainment'; await sleep(2000); },
    
    // Spaces
    spaces: async () => { window.location.href = 'https://x.com/i/spaces'; await sleep(2000); },
    
    // Scroll
    scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    scrollToBottom: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
    scrollBy: (px) => window.scrollBy({ top: px, behavior: 'smooth' }),
    
    // Back
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => window.location.reload(),
  };

  // ============================================
  // SECTION 6: LISTS MANAGEMENT
  // ============================================
  const lists = {
    // Create a new list
    create: async (name, description = '', isPrivate = false) => {
      log(`Creating list: ${name}...`, 'action');
      
      window.location.href = 'https://x.com/i/lists';
      await sleep(2000);
      
      const createBtn = await waitForElement('[data-testid="createList"]');
      if (createBtn) {
        await clickElement(createBtn);
        await sleep(800);
        
        const nameInput = await waitForElement('input[name="name"]');
        if (nameInput) {
          nameInput.value = name;
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        const descInput = await waitForElement('textarea[name="description"]');
        if (descInput && description) {
          descInput.value = description;
          descInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (isPrivate) {
          const privateToggle = document.querySelector('[data-testid="makePrivate"]');
          if (privateToggle) await clickElement(privateToggle);
        }
        
        await sleep(300);
        const nextBtn = document.querySelector('[data-testid="listCreationNextButton"]');
        if (nextBtn) {
          await clickElement(nextBtn);
          log(`List "${name}" created!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Delete a list
    delete: async (listId) => {
      log('Deleting list...', 'action');
      
      window.location.href = `https://x.com/i/lists/${listId}`;
      await sleep(2000);
      
      const moreBtn = await waitForElement('[data-testid="listsMoreButton"]');
      if (moreBtn) {
        await clickElement(moreBtn);
        await sleep(500);
        
        const menuItems = document.querySelectorAll(SEL.menuItem);
        for (const item of menuItems) {
          if (item.textContent.toLowerCase().includes('delete')) {
            await clickElement(item);
            await sleep(500);
            
            const confirmBtn = await waitForElement(SEL.confirmButton);
            if (confirmBtn) {
              await clickElement(confirmBtn);
              log('List deleted!', 'success');
              return true;
            }
          }
        }
      }
      
      return false;
    },
    
    // Edit list
    edit: async (listId, newName, newDescription) => {
      log('Editing list...', 'action');
      
      window.location.href = `https://x.com/i/lists/${listId}`;
      await sleep(2000);
      
      const editBtn = await waitForElement('[data-testid="editList"]');
      if (editBtn) {
        await clickElement(editBtn);
        await sleep(800);
        
        if (newName) {
          const nameInput = await waitForElement('input[name="name"]');
          if (nameInput) {
            nameInput.value = newName;
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        
        if (newDescription !== undefined) {
          const descInput = await waitForElement('textarea[name="description"]');
          if (descInput) {
            descInput.value = newDescription;
            descInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        
        const saveBtn = document.querySelector('[data-testid="listEditSaveButton"]');
        if (saveBtn) {
          await clickElement(saveBtn);
          log('List updated!', 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Follow a list
    follow: async (listId) => {
      window.location.href = `https://x.com/i/lists/${listId}`;
      await sleep(2000);
      
      const followBtn = await waitForElement('[data-testid="listFollow"]');
      if (followBtn) {
        await clickElement(followBtn);
        log('List followed!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Unfollow a list
    unfollow: async (listId) => {
      window.location.href = `https://x.com/i/lists/${listId}`;
      await sleep(2000);
      
      const unfollowBtn = await waitForElement('[data-testid="listUnfollow"]');
      if (unfollowBtn) {
        await clickElement(unfollowBtn);
        log('List unfollowed!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Pin/unpin list
    pin: async (listId) => {
      window.location.href = `https://x.com/i/lists/${listId}`;
      await sleep(2000);
      
      const moreBtn = await waitForElement('[data-testid="listsMoreButton"]');
      if (moreBtn) {
        await clickElement(moreBtn);
        await sleep(500);
        
        const menuItems = document.querySelectorAll(SEL.menuItem);
        for (const item of menuItems) {
          if (item.textContent.toLowerCase().includes('pin')) {
            await clickElement(item);
            log('List pin toggled!', 'success');
            return true;
          }
        }
      }
      
      return false;
    },
    
    // Get all lists
    getAll: async () => {
      window.location.href = 'https://x.com/i/lists';
      await sleep(2000);
      
      const listItems = document.querySelectorAll('[data-testid="listItem"]');
      return Array.from(listItems).map(item => ({
        element: item,
        text: item.textContent,
      }));
    },
    
    // View list members
    viewMembers: async (listId) => {
      window.location.href = `https://x.com/i/lists/${listId}/members`;
      await sleep(2000);
      return true;
    },
    
    // View list followers
    viewFollowers: async (listId) => {
      window.location.href = `https://x.com/i/lists/${listId}/followers`;
      await sleep(2000);
      return true;
    },
  };

  // ============================================
  // SECTION 7: SETTINGS & PROFILE
  // ============================================
  const settings = {
    // Navigation to settings pages
    account: async () => { window.location.href = 'https://x.com/settings/account'; await sleep(2000); },
    security: async () => { window.location.href = 'https://x.com/settings/security'; await sleep(2000); },
    privacy: async () => { window.location.href = 'https://x.com/settings/privacy_and_safety'; await sleep(2000); },
    notifications: async () => { window.location.href = 'https://x.com/settings/notifications'; await sleep(2000); },
    accessibility: async () => { window.location.href = 'https://x.com/settings/accessibility'; await sleep(2000); },
    monetization: async () => { window.location.href = 'https://x.com/settings/monetization'; await sleep(2000); },
    creatorSubs: async () => { window.location.href = 'https://x.com/settings/manage_subscriptions'; await sleep(2000); },
    premium: async () => { window.location.href = 'https://x.com/settings/premium'; await sleep(2000); },
    
    // Muted/blocked lists
    mutedAccounts: async () => { window.location.href = 'https://x.com/settings/muted/all'; await sleep(2000); },
    mutedWords: async () => { window.location.href = 'https://x.com/settings/muted_keywords'; await sleep(2000); },
    blockedAccounts: async () => { window.location.href = 'https://x.com/settings/blocked/all'; await sleep(2000); },
    
    // Add muted word
    addMutedWord: async (word, options = {}) => {
      log(`Muting word: "${word}"...`, 'action');
      
      window.location.href = 'https://x.com/settings/add_muted_keyword';
      await sleep(2000);
      
      const input = await waitForElement('input[name="keyword"]');
      if (input) {
        input.value = word;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(300);
        
        const saveBtn = document.querySelector('[data-testid="addButton"]');
        if (saveBtn) {
          await clickElement(saveBtn);
          log(`Word "${word}" muted!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Download your data
    downloadData: async () => {
      window.location.href = 'https://x.com/settings/download_your_data';
      await sleep(2000);
      log('Download data page opened', 'success');
      return true;
    },
    
    // Deactivate account page
    deactivate: async () => {
      window.location.href = 'https://x.com/settings/deactivate';
      await sleep(2000);
      log('Deactivate page opened - proceed with caution', 'warning');
      return true;
    },
  };

  const profile = {
    // Edit profile
    edit: async () => {
      const editBtn = await waitForElement(SEL.editProfileButton);
      if (editBtn) {
        await clickElement(editBtn);
        log('Edit profile opened', 'success');
        return true;
      }
      
      // Navigate to profile first
      window.location.href = 'https://x.com/settings/profile';
      await sleep(2000);
      return true;
    },
    
    // Update display name
    updateName: async (newName) => {
      window.location.href = 'https://x.com/settings/profile';
      await sleep(2000);
      
      const nameInput = await waitForElement('input[name="displayName"]');
      if (nameInput) {
        nameInput.value = newName;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const saveBtn = document.querySelector('[data-testid="ProfileSaveButton"]');
        if (saveBtn) {
          await clickElement(saveBtn);
          log(`Name updated to "${newName}"!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Update bio
    updateBio: async (newBio) => {
      window.location.href = 'https://x.com/settings/profile';
      await sleep(2000);
      
      const bioInput = await waitForElement('textarea[name="description"]');
      if (bioInput) {
        bioInput.value = newBio;
        bioInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const saveBtn = document.querySelector('[data-testid="ProfileSaveButton"]');
        if (saveBtn) {
          await clickElement(saveBtn);
          log('Bio updated!', 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Update location
    updateLocation: async (location) => {
      window.location.href = 'https://x.com/settings/profile';
      await sleep(2000);
      
      const locInput = await waitForElement('input[name="location"]');
      if (locInput) {
        locInput.value = location;
        locInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const saveBtn = document.querySelector('[data-testid="ProfileSaveButton"]');
        if (saveBtn) {
          await clickElement(saveBtn);
          log(`Location updated to "${location}"!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Update website
    updateWebsite: async (url) => {
      window.location.href = 'https://x.com/settings/profile';
      await sleep(2000);
      
      const urlInput = await waitForElement('input[name="url"]');
      if (urlInput) {
        urlInput.value = url;
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const saveBtn = document.querySelector('[data-testid="ProfileSaveButton"]');
        if (saveBtn) {
          await clickElement(saveBtn);
          log(`Website updated to "${url}"!`, 'success');
          return true;
        }
      }
      
      return false;
    },
    
    // Open avatar picker
    updateAvatar: async () => {
      window.location.href = 'https://x.com/settings/profile';
      await sleep(2000);
      
      const avatarBtn = document.querySelector('[data-testid="ProfileAvatarInput"]');
      if (avatarBtn) {
        await clickElement(avatarBtn);
        log('Avatar picker opened - select file manually', 'warning');
        return true;
      }
      
      return false;
    },
    
    // Open header picker
    updateHeader: async () => {
      window.location.href = 'https://x.com/settings/profile';
      await sleep(2000);
      
      const headerBtn = document.querySelector('[data-testid="ProfileHeaderInput"]');
      if (headerBtn) {
        await clickElement(headerBtn);
        log('Header picker opened - select file manually', 'warning');
        return true;
      }
      
      return false;
    },
    
    // Switch to professional account
    switchToProfessional: async () => {
      window.location.href = 'https://x.com/i/flow/convert_to_professional';
      await sleep(2000);
      log('Professional account flow opened', 'success');
      return true;
    },
  };

  // ============================================
  // SECTION 8: UTILITIES & HIDDEN FEATURES
  // ============================================
  const utils = {
    // Get current user info
    getCurrentUser: () => {
      const accountSwitcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (accountSwitcher) {
        const text = accountSwitcher.textContent;
        const match = text.match(/@(\w+)/);
        if (match) return match[1];
      }
      return null;
    },
    
    // Check if logged in
    isLoggedIn: () => {
      return document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null;
    },
    
    // Get authentication tokens (for API use - be careful!)
    getTokens: () => {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      return {
        ct0: cookies.ct0, // CSRF token
        authToken: cookies.auth_token,
      };
    },
    
    // Extract tweet ID from URL
    getTweetIdFromUrl: (url) => {
      const match = url?.match(/status\/(\d+)/);
      return match ? match[1] : null;
    },
    
    // Extract username from URL
    getUsernameFromUrl: (url) => {
      const match = url?.match(/x\.com\/(\w+)/);
      return match ? match[1] : null;
    },
    
    // Wait for page load
    waitForPageLoad: async () => {
      await waitForElement(SEL.primaryColumn);
      await sleep(500);
      return true;
    },
    
    // Scroll and load more content
    loadMore: async (times = 3) => {
      for (let i = 0; i < times; i++) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await sleep(2000);
      }
      return true;
    },
    
    // Clear all X data from localStorage
    clearXData: () => {
      Object.keys(localStorage)
        .filter(k => k.includes('twitter') || k.includes('x.com') || k.startsWith('xactions_'))
        .forEach(k => localStorage.removeItem(k));
      log('X data cleared from localStorage', 'success');
    },
    
    // Export bookmarks (scroll through and collect)
    exportBookmarks: async (maxItems = 100) => {
      log('Exporting bookmarks...', 'action');
      
      window.location.href = 'https://x.com/i/bookmarks';
      await sleep(2000);
      
      const bookmarks = [];
      let lastHeight = 0;
      
      while (bookmarks.length < maxItems) {
        const tweets = document.querySelectorAll(SEL.tweet);
        
        tweets.forEach(tweet => {
          const link = tweet.querySelector(SEL.tweetLink)?.href;
          const text = tweet.querySelector(SEL.tweetText)?.textContent;
          
          if (link && !bookmarks.find(b => b.link === link)) {
            bookmarks.push({ link, text: text?.substring(0, 100) });
          }
        });
        
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await sleep(2000);
        
        if (document.body.scrollHeight === lastHeight) break;
        lastHeight = document.body.scrollHeight;
      }
      
      log(`Exported ${bookmarks.length} bookmarks!`, 'success');
      return bookmarks;
    },
    
    // Export likes
    exportLikes: async (username, maxItems = 100) => {
      log(`Exporting likes from @${username}...`, 'action');
      
      window.location.href = `https://x.com/${username}/likes`;
      await sleep(2000);
      
      const likes = [];
      let lastHeight = 0;
      
      while (likes.length < maxItems) {
        const tweets = document.querySelectorAll(SEL.tweet);
        
        tweets.forEach(tweet => {
          const link = tweet.querySelector(SEL.tweetLink)?.href;
          if (link && !likes.includes(link)) {
            likes.push(link);
          }
        });
        
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await sleep(2000);
        
        if (document.body.scrollHeight === lastHeight) break;
        lastHeight = document.body.scrollHeight;
      }
      
      log(`Exported ${likes.length} likes!`, 'success');
      return likes;
    },
    
    // Copy to clipboard
    copyToClipboard: async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        log('Copied to clipboard!', 'success');
        return true;
      } catch (e) {
        log('Clipboard access denied', 'error');
        return false;
      }
    },
    
    // Screenshot tweet (opens in new tab for saving)
    screenshotTweet: async (tweetUrl) => {
      // Use a screenshot service
      const id = utils.getTweetIdFromUrl(tweetUrl);
      if (id) {
        window.open(`https://tweetpik.com/${id}`, '_blank');
        log('Screenshot service opened', 'success');
        return true;
      }
      return false;
    },
    
    // Enable keyboard shortcuts display
    showKeyboardShortcuts: async () => {
      // Press ? to show shortcuts
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
      log('Keyboard shortcuts triggered', 'success');
      return true;
    },
    
    // Developer mode - show hidden elements
    devMode: () => {
      // Show all data-testid attributes
      document.querySelectorAll('[data-testid]').forEach(el => {
        el.style.outline = '1px solid red';
        el.title = el.getAttribute('data-testid');
      });
      log('Dev mode enabled - elements outlined', 'success');
    },
    
    // Get all data-testid selectors on page
    getAllSelectors: () => {
      const selectors = new Set();
      document.querySelectorAll('[data-testid]').forEach(el => {
        selectors.add(el.getAttribute('data-testid'));
      });
      return Array.from(selectors).sort();
    },
  };

  // ============================================
  // SECTION 9: SPACES & COMMUNITIES
  // ============================================
  const spaces = {
    // View live spaces
    browse: async () => {
      window.location.href = 'https://x.com/i/spaces';
      await sleep(2000);
      return true;
    },
    
    // Join a space
    join: async (spaceId) => {
      window.location.href = `https://x.com/i/spaces/${spaceId}`;
      await sleep(2000);
      
      const joinBtn = await waitForElement('[data-testid="SpaceJoinButton"]');
      if (joinBtn) {
        await clickElement(joinBtn);
        log('Joined space!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Leave current space
    leave: async () => {
      const leaveBtn = await waitForElement('[data-testid="SpaceLeaveButton"]');
      if (leaveBtn) {
        await clickElement(leaveBtn);
        log('Left space!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Request to speak
    requestToSpeak: async () => {
      const requestBtn = await waitForElement('[data-testid="SpaceRequestSpeaker"]');
      if (requestBtn) {
        await clickElement(requestBtn);
        log('Requested to speak!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Set reminder for scheduled space
    setReminder: async (spaceId) => {
      window.location.href = `https://x.com/i/spaces/${spaceId}`;
      await sleep(2000);
      
      const reminderBtn = await waitForElement('[data-testid="SpaceReminder"]');
      if (reminderBtn) {
        await clickElement(reminderBtn);
        log('Reminder set!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Share space
    share: async () => {
      const shareBtn = await waitForElement('[data-testid="SpaceShareButton"]');
      if (shareBtn) {
        await clickElement(shareBtn);
        await sleep(500);
        
        const copyBtn = await waitForElement('[data-testid="SpaceCopyLink"]');
        if (copyBtn) {
          await clickElement(copyBtn);
          log('Space link copied!', 'success');
          return true;
        }
      }
      
      return false;
    },
  };

  const communities = {
    // Browse communities
    browse: async () => {
      window.location.href = 'https://x.com/i/communities';
      await sleep(2000);
      return true;
    },
    
    // View a community
    view: async (communityId) => {
      window.location.href = `https://x.com/i/communities/${communityId}`;
      await sleep(2000);
      return true;
    },
    
    // Join a community
    join: async (communityId) => {
      await communities.view(communityId);
      
      const joinBtn = await waitForElement('[data-testid="CommunityJoin"]');
      if (joinBtn) {
        await clickElement(joinBtn);
        log('Joined community!', 'success');
        return true;
      }
      
      return false;
    },
    
    // Leave a community
    leave: async (communityId) => {
      await communities.view(communityId);
      
      const moreBtn = await waitForElement('[data-testid="CommunityActions"]');
      if (moreBtn) {
        await clickElement(moreBtn);
        await sleep(500);
        
        const menuItems = document.querySelectorAll(SEL.menuItem);
        for (const item of menuItems) {
          if (item.textContent.toLowerCase().includes('leave')) {
            await clickElement(item);
            log('Left community!', 'success');
            return true;
          }
        }
      }
      
      return false;
    },
    
    // Post in community
    post: async (communityId, text) => {
      window.location.href = `https://x.com/i/communities/${communityId}`;
      await sleep(2000);
      
      // Click tweet button which will post to community
      const composeBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
      if (composeBtn) {
        await clickElement(composeBtn);
        await sleep(800);
        
        const textarea = await waitForElement(SEL.tweetTextarea);
        if (textarea) {
          await typeText(textarea, text);
          await sleep(500);
          
          const postBtn = document.querySelector(SEL.tweetButton);
          if (postBtn && !postBtn.disabled) {
            await clickElement(postBtn);
            log('Posted to community!', 'success');
            return true;
          }
        }
      }
      
      return false;
    },
  };

  // Expose ALL sections
  log('XActions FULL library loaded!', 'success');
  
  return {
    SEL,
    tweet,
    engage,
    user,
    dm,
    search,
    nav,
    lists,
    settings,
    profile,
    utils,
    spaces,
    communities,
  };
})();

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  📦 XActions Library - COMPLETE (All 9 Sections)                     ║
╠══════════════════════════════════════════════════════════════════════╣
║  ✅ XActions.tweet       - Post, reply, quote, delete, pin, thread   ║
║  ✅ XActions.engage      - Like, RT, bookmark, share, highlight      ║
║  ✅ XActions.user        - Follow, block, mute, lists, restrict      ║
║  ✅ XActions.dm          - Send, group, react, GIFs, delete          ║
║  ✅ XActions.search      - Query, filters, advanced operators        ║
║  ✅ XActions.nav         - Navigation, tabs, scroll, timeline        ║
║  ✅ XActions.lists       - Create, edit, delete, follow, pin         ║
║  ✅ XActions.settings    - Account, privacy, muted words             ║
║  ✅ XActions.profile     - Edit name, bio, location, avatar          ║
║  ✅ XActions.utils       - Tokens, export, dev mode, clipboard       ║
║  ✅ XActions.spaces      - Join, leave, request speaker, share       ║
║  ✅ XActions.communities - Browse, join, leave, post                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  💡 Example: XActions.tweet.post("Hello!")                           ║
║  💡 Example: XActions.user.follow("elonmusk")                        ║
║  💡 Example: XActions.search.advanced({from:"user", minFaves:100})   ║
╚══════════════════════════════════════════════════════════════════════╝
`);
