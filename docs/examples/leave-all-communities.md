# 🚪 Leave All Communities

Leave ALL X Communities you've joined with one script.

---

## 📋 What It Does

This script automates leaving every X Community you're a member of:

1. **Scans your communities** - Finds all communities you've joined
2. **Enters each community** - Navigates to the community page
3. **Clicks "Joined" button** - Initiates the leave process
4. **Confirms leaving** - Clicks the confirmation button
5. **Returns to list** - Goes back and repeats until done
6. **Tracks progress** - Remembers which communities were left to avoid loops

**Use cases:**
- Clean up your X account
- Leave all communities before account deletion
- Privacy reset
- Start fresh with communities

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/YOUR_USERNAME/communities`
2. Open browser console (F12 → Console tab)
3. Paste the script below and press Enter
4. Watch it leave each community automatically

```javascript
// ============================================
// XActions - Leave All Communities
// Author: nichxbt (@nichxbt)
// Go to: x.com/YOUR_USERNAME/communities
// Open console (F12), paste this
// ============================================

(() => {
  const $communityLinks = 'a[href^="/i/communities/"]';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  const $communitiesNav = 'a[aria-label="Communities"]';

  // Track communities we've already left
  const getLeftCommunities = () => {
    try {
      return JSON.parse(sessionStorage.getItem('xactions_left_ids') || '[]');
    } catch { return []; }
  };
  
  const markAsLeft = (id) => {
    const left = getLeftCommunities();
    if (!left.includes(id)) {
      left.push(id);
      sessionStorage.setItem('xactions_left_ids', JSON.stringify(left));
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const getCommunityId = () => {
    const leftAlready = getLeftCommunities();
    const links = document.querySelectorAll($communityLinks);
    
    for (const link of links) {
      const match = link.href.match(/\/i\/communities\/(\d+)/);
      if (match && !leftAlready.includes(match[1])) {
        return { id: match[1], element: link };
      }
    }
    return null;
  };

  const run = async () => {
    const leftCount = getLeftCommunities().length;
    console.log(`🚀 LEAVE ALL COMMUNITIES (Left so far: ${leftCount})`);
    console.log(`📋 Already processed: ${getLeftCommunities().join(', ') || 'none'}`);
    
    await sleep(1500);
    
    // Check if we're on a community page (has Joined button)
    const joinedBtn = document.querySelector($joinedButton);
    
    if (joinedBtn) {
      // Get current community ID from URL
      const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
      const currentId = urlMatch ? urlMatch[1] : null;
      
      console.log(`📍 INSIDE COMMUNITY ${currentId}, CLICKING JOINED...`);
      joinedBtn.click();
      await sleep(1000);
      
      const confirmBtn = document.querySelector($confirmButton);
      if (confirmBtn) {
        console.log('✅ CONFIRMING LEAVE...');
        confirmBtn.click();
        
        // Mark this community as left
        if (currentId) {
          markAsLeft(currentId);
          console.log(`📝 MARKED ${currentId} AS LEFT`);
        }
        
        await sleep(1500);
      }
      
      // Click Communities nav link to go back
      const communitiesLink = document.querySelector($communitiesNav);
      if (communitiesLink) {
        console.log('⬅️ GOING BACK TO COMMUNITIES...');
        communitiesLink.click();
        await sleep(2500);
        return run();
      }
    }
    
    // We're on communities list - find next community (not already left)
    const community = getCommunityId();
    
    if (community) {
      console.log(`🏠 ENTERING COMMUNITY ${community.id}...`);
      community.element.click();
      await sleep(2500);
      return run();
    } else {
      // No more communities found
      const total = getLeftCommunities().length;
      console.log(`🎉 DONE! LEFT ${total} COMMUNITIES TOTAL`);
      console.log(`IDs: ${getLeftCommunities().join(', ')}`);
      sessionStorage.removeItem('xactions_left_ids');
    }
  };

  run();
})();
```

---

## 🔍 How It Works

1. **Community Detection**: Finds links matching `/i/communities/{id}` pattern
2. **State Tracking**: Uses `sessionStorage` to remember which communities have been left
3. **Navigation**: Clicks into each community, then uses the sidebar "Communities" link to return
4. **Leave Flow**: Clicks "Joined" button → Clicks "Leave" confirmation
5. **Loop Prevention**: Skips any community ID already in the processed list

---

## ⚠️ Notes

- The script runs automatically once pasted
- Progress is shown in the console
- If the script stops, just paste and run again (it remembers progress)
- Closing the tab clears the progress tracker (uses sessionStorage)
- Works on both x.com and twitter.com

---

## 🔗 Related Scripts

- [Unfollow Everyone](unfollow-everyone.md) - Unfollow all accounts
- [Unfollow Non-Followers](unfollow-non-followers.md) - Only unfollow those who don't follow back
- [Smart Unfollow](smart-unfollow.md) - Unfollow based on activity
