# Tutorial: The Complete XActions Browser Automation Framework

You are my browser automation expert. I want to master the XActions automation framework — the core.js module, the actions.js library, and every automation script. Walk me through the entire system from foundation to advanced techniques.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit. The browser automation framework lives in `src/automation/` and consists of:
- **core.js** — Foundation module (paste FIRST, always)
- **actions.js** — Complete actions library (2100+ lines, every X action possible)
- **15 automation scripts** — Each automates a specific workflow

Everything works by pasting into the browser developer console on x.com.

## What I Need You To Do

### Part 1: Understanding the Architecture

Explain the framework's design:

1. **The Module System:**
   - All scripts use `window.XActions` as a namespace
   - `core.js` creates `window.XActions.Core` with shared utilities
   - `actions.js` creates `window.XActions` with ready-to-use functions
   - Individual scripts check for Core and use its utilities
   - This means: **Always paste core.js first**

2. **The Core Foundation (core.js):**
   - **CONFIG**: Timing defaults, rate limits, storage prefix, debug mode
   - **SELECTORS**: All known X DOM selectors (buttons, tweets, users, inputs)
   - **Utilities**: sleep, randomDelay, log, scroll functions
   - **Storage**: localStorage wrapper with JSON serialization
   - **DOM Helpers**: waitForElement, waitForElements, clickElement, typeText
   - **User Extraction**: extractUsername, extractTweetInfo
   - **Rate Limiting**: check, increment, getRemaining (hourly/daily)
   - **Action Queue**: Sequential action execution with delays

3. **The Actions Library (actions.js):**
   Organized into namespaces:
   ```javascript
   XActions.tweet.post("text")      // Post a tweet
   XActions.tweet.reply(el, "text") // Reply to a tweet
   XActions.tweet.quote(el, "text") // Quote tweet
   XActions.tweet.like(el)          // Like a tweet
   XActions.tweet.retweet(el)       // Retweet
   XActions.tweet.bookmark(el)      // Bookmark
   XActions.tweet.delete(el)        // Delete your tweet
   
   XActions.user.follow("username") // Follow a user
   XActions.user.unfollow("username") // Unfollow
   XActions.user.block("username")  // Block
   XActions.user.mute("username")   // Mute
   XActions.user.getInfo("username") // Get user info
   
   XActions.dm.send("username", "message") // Send DM
   XActions.dm.read()               // Read DMs
   
   XActions.search.tweets("query")  // Search tweets
   XActions.search.users("query")   // Search users
   
   XActions.navigate.toProfile("username")
   XActions.navigate.toHome()
   XActions.navigate.toFollowers("username")
   XActions.navigate.toFollowing("username")
   ```

### Part 2: Setting Up — Your First Automation

Walk me through the exact steps:

1. **Open x.com** in your browser (Chrome recommended)
2. **Open Developer Tools:**
   - Windows/Linux: F12 or Ctrl+Shift+I
   - Mac: Cmd+Option+I
3. **Go to the Console tab**
4. **Paste core.js** — you'll see: `✅ XActions Core loaded! Ready for automation scripts.`
5. **Test it:**
   ```javascript
   // Check it loaded
   window.XActions.Core.log('Hello from XActions!', 'success');
   
   // Try a utility  
   await window.XActions.Core.sleep(1000);
   console.log('Slept for 1 second');
   ```

6. **Now paste any automation script** (they all automatically detect core.js)

### Part 3: Every X Selector You Need

The SELECTORS object in core.js — your roadmap to every X UI element:

**Buttons:**
| Selector | Element |
|----------|---------|
| `[data-testid$="-follow"]` | Follow button |
| `[data-testid$="-unfollow"]` | Unfollow button |
| `[data-testid="like"]` | Like button |
| `[data-testid="unlike"]` | Unlike button (already liked) |
| `[data-testid="retweet"]` | Retweet button |
| `[data-testid="unretweet"]` | Unretweet button |
| `[data-testid="reply"]` | Reply button |
| `[data-testid="confirmationSheetConfirm"]` | Confirm dialog button |
| `[data-testid="confirmationSheetCancel"]` | Cancel dialog button |
| `[data-testid="share"]` | Share button |
| `[data-testid="bookmark"]` | Bookmark button |
| `[data-testid="removeBookmark"]` | Remove bookmark |

**Tweet Elements:**
| Selector | Element |
|----------|---------|
| `[data-testid="tweet"]` (or `article`) | Individual tweet |
| `[data-testid="tweetText"]` | Tweet text content |
| `a[href*="/status/"]` | Tweet permalink |
| `[data-testid="caret"]` | Tweet ⋯ menu |

**User Elements:**
| Selector | Element |
|----------|---------|
| `[data-testid="UserCell"]` | User in a list (followers, following, etc.) |
| `[data-testid="UserAvatar-Container"]` | User avatar |
| `[data-testid="User-Name"]` | User display name |
| `[data-testid="userFollowIndicator"]` | "Follows you" badge |

**Input Elements:**
| Selector | Element |
|----------|---------|
| `[data-testid="tweetTextarea_0"]` | Tweet compose box |
| `[data-testid="SearchBox_Search_Input"]` | Search input |
| `[data-testid="dmComposerTextInput"]` | DM input |
| `[data-testid="dmComposerSendButton"]` | DM send button |

**Navigation:**
| Selector | Element |
|----------|---------|
| `[data-testid="primaryColumn"]` | Main content column |
| `[data-testid="sidebarColumn"]` | Sidebar |
| `[data-testid="app-bar-back"]` | Back button |

### Part 4: Complete Script Reference

Walk me through every automation script:

#### 1. autoLiker.js — Auto-Like Posts
- **Paste after:** core.js
- **Run on:** Home feed, profile, or search results
- **Config:** keywords, max likes, retweet option, skip replies/ads
- **Use case:** Boost visibility by liking relevant content

#### 2. autoCommenter.js — Auto-Comment on New Posts
- **Paste after:** core.js
- **Run on:** A user's profile page
- **Config:** comment templates, check interval, max comments, keyword filter
- **Use case:** Never miss a post from important accounts

#### 3. followEngagers.js — Follow Post Likers/Retweeters
- **Paste after:** core.js
- **Run on:** A specific tweet, or provide tweet URLs
- **Config:** mode (likers/retweeters/quoters/all), max follows, filters
- **Use case:** Find and follow people interested in your niche

#### 4. followTargetUsers.js — Follow Followers of Accounts
- **Paste after:** core.js
- **Run on:** Home page (it navigates automatically)
- **Config:** target accounts, list type (followers/following), filters
- **Use case:** Grow by following fans of similar accounts

#### 5. keywordFollow.js — Search & Follow by Keyword
- **Paste after:** core.js
- **Run on:** Search page (x.com/search)
- **Config:** keywords, max follows per keyword, follower count filters, bio filters
- **Use case:** Find and follow people in your exact niche

#### 6. smartUnfollow.js — Time-Based Smart Unfollow
- **Paste after:** core.js
- **Run on:** Your following page (x.com/USERNAME/following)
- **Config:** days to wait, max unfollows, whitelist, dry run mode
- **Use case:** Clean up non-followers after giving them time to follow back

#### 7. growthSuite.js — All-in-One Growth
- **Paste after:** core.js
- **Run on:** Home page
- **Config:** keywords, target accounts, action toggles, limits, filters
- **Use case:** Complete growth automation in one script

#### 8. customerService.js — Customer Service Bot
- **Paste after:** core.js
- **Run on:** Home page
- **Config:** response templates, business hours, monitoring options
- **Use case:** Automate customer service responses

#### 9. multiAccount.js — Multi-Account Manager
- **Paste after:** core.js
- **Run on:** Any page
- **Config:** account list
- **Use case:** Manage multiple X accounts

#### 10. linkScraper.js — Extract Shared Links
- **Paste after:** core.js
- **Run on:** A user's profile
- **Config:** max links to extract
- **Use case:** Find all links someone has shared

#### 11. protectActiveUsers.js — Protect Engaged Users
- **Paste after:** core.js
- **Run on:** Your profile
- **Config:** engagement threshold
- **Use case:** Build a whitelist of users who engage with you

#### 12. quotaSupervisor.js — Rate Limit Manager
- **Paste after:** core.js
- **Auto-loads with any automation**
- **Config:** hourly/daily limits, stochastic delays
- **Use case:** Prevent rate limiting across all scripts

#### 13. sessionLogger.js — Action Tracker
- **Paste after:** core.js
- **Run on:** Any page (background tracker)
- **Config:** retention period, export format
- **Use case:** Log all automation actions for review

### Part 5: Advanced Technique — Chaining Scripts

The power of the framework is chaining scripts together:

**Example 1: Growth + Protection + Tracking**
```
1. Paste core.js
2. Paste sessionLogger.js (starts logging)
3. Paste protectActiveUsers.js (builds whitelist)
4. Paste growthSuite.js (runs the growth automation)
→ All actions are logged, active engagers are protected from unfollow
```

**Example 2: Research + Follow + Engage**
```
1. Paste core.js
2. Paste actions.js (gives you the full XActions API)
3. Navigate to a viral tweet in your niche
4. Paste followEngagers.js (follow the likers)
5. Paste autoLiker.js (like related content)
→ You follow interested users AND engage with their content
```

**Example 3: Track + Follow + Cleanup Cycle**
```
Week 1: Paste core.js + keywordFollow.js → Follow 20 users per day
Week 2: Continue following, all tracked with timestamps
Week 3: Paste core.js + smartUnfollow.js → Unfollow non-followers from Week 1
→ Sustainable growth cycle
```

### Part 6: State & Persistence

How data persists between sessions:

1. **localStorage** — Used by core.js storage system
   - All tracking data (followed users, liked tweets, etc.)
   - Survives browser refresh
   - Persists until manually cleared
   - Prefix: `xactions_` for all keys

2. **sessionStorage** — Used by navigation scripts
   - Tracks processed items during multi-page navigation
   - Cleared when tab closes
   - Used to prevent revisiting communities/pages

3. **How to view stored data:**
   ```javascript
   // See all XActions data
   Object.keys(localStorage).filter(k => k.startsWith('xactions_')).forEach(k => {
     console.log(k, JSON.parse(localStorage.getItem(k)));
   });
   ```

4. **How to clear data:**
   ```javascript
   // Clear all XActions data
   window.XActions.Core.storage.clear();
   ```

### Part 7: Debugging & Safety

1. **Debug mode:** Set `CONFIG.DEBUG = true` in core.js for verbose logging
2. **Dry run:** Most scripts support DRY_RUN mode — preview without acting
3. **Stop running script:** Refresh the page, or set `isRunning = false` in the script's state
4. **Rate limit protection:** Built-in at multiple levels (core, quotaSupervisor, individual scripts)
5. **If something goes wrong:** Refresh the page — all scripts stop immediately

## My Learning Goals
(Replace before pasting)
- My experience level: Beginner / Intermediate / Advanced JavaScript
- What I mainly want to automate: SPECIFIC_TASKS
- How comfortable am I with DevTools: First time / Some experience / Power user

Start with Part 1 — help me understand the architecture, then guide me through my first paste-and-run automation.
