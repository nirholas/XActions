# Tutorial: Growth Automation Suite — Grow Your X Account on Autopilot

You are my X/Twitter growth strategist and automation expert. I want to grow my account strategically using XActions. Help me set up a complete growth automation system that finds my target audience, engages authentically, and cleans up non-followers automatically.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter automation toolkit. The Growth Suite (`src/automation/growthSuite.js`) combines keyword following, auto-liking, and smart unfollowing into one automated system. I also have access to individual scripts for each component.

## What I Need You To Do

### Phase 1: Define My Growth Strategy

Before we touch any tools, help me define my target audience:

1. **Ask me about my niche** — What do I tweet about? Who do I want to attract?
2. **Build a keyword list** — Based on my niche, create 10-15 search keywords that my ideal followers would use. Examples:
   - Tech: "web3 developer", "startup founder", "building in public"  
   - Fitness: "gym motivation", "meal prep", "powerlifting"
   - AI: "machine learning", "LLM", "prompt engineering"

3. **Identify target accounts** — Help me find 5-10 accounts in my niche whose followers would be interested in my content. Use `x_search_tweets` and `x_get_profile` to research:
   - Who are the big accounts in my space?
   - Which accounts have engaged, real followers (not just numbers)?
   - Who has a follower base that matches my target audience?

4. **Set growth targets** — Help me set realistic daily/weekly goals:
   - New follows per day: 20-40 (staying under rate limits)
   - Likes per day: 30-50
   - Unfollows per day: 15-30 (clearing non-followers)
   - Expected new followers per week: depends on niche

### Phase 2: Set Up the Growth Suite (Browser Console)

Walk me through using the Growth Automation Suite:

1. **Navigate to my X home page** (x.com/home)
2. **Paste `core.js`** — the foundation module that provides:
   - Shared selectors for X's DOM elements
   - `sleep()`, `randomDelay()`, `scrollBy()` utilities
   - Rate limiting (MAX_ACTIONS_PER_HOUR: 50, MAX_FOLLOWS_PER_DAY: 100)
   - Storage system for tracking state
   - Action queue for sequential execution

3. **Configure the Growth Suite strategy:**
   ```javascript
   const STRATEGY = {
     KEYWORDS: [/* our keyword list from Phase 1 */],
     TARGET_ACCOUNTS: [/* our target accounts from Phase 1 */],
     ACTIONS: {
       FOLLOW: true,     // Follow users from keyword search
       LIKE: true,       // Like relevant posts in feed
       UNFOLLOW: true,   // Auto-unfollow non-followers
     },
     LIMITS: {
       FOLLOWS: 20,      // Per session
       LIKES: 30,
       UNFOLLOWS: 15,
     },
     TIMING: {
       UNFOLLOW_AFTER_DAYS: 3,
       DELAY_BETWEEN_ACTIONS: 3000,
       SESSION_DURATION_MINUTES: 30,
     },
     FILTERS: {
       MIN_FOLLOWERS: 50,
       MAX_FOLLOWERS: 50000,
       MUST_HAVE_BIO: true,
       SKIP_PRIVATE: true,
       LANGUAGE: null,
     },
   };
   ```

4. **Explain what happens when it runs:**
   - Phase A: Searches each keyword, finds matching users, follows them (with filters)
   - Phase B: Scrolls the timeline, likes posts matching your keywords
   - Phase C: Checks users you followed 3+ days ago, unfollows non-followers
   - All tracked in localStorage so it persists between sessions
   - Session automatically stops after the configured duration

5. **Paste `growthSuite.js`** and explain the output they'll see in console

### Phase 3: Individual Component Deep Dives

#### 3A: Keyword Follow (`keywordFollow.js`)

For more control, walk me through the standalone keyword follow script:

1. Navigate to `x.com/search`
2. Paste core.js, then keywordFollow.js with config:
   ```javascript
   KEYWORDS: ['web3 developer', 'solidity engineer'],
   MAX_FOLLOWS_PER_KEYWORD: 10,
   MAX_FOLLOWS_TOTAL: 30,
   MIN_FOLLOWERS: 100,
   MAX_FOLLOWERS: 100000,
   MUST_HAVE_BIO: true,
   ```
3. How it works:
   - Searches each keyword in the People tab
   - Extracts user info from each UserCell
   - Applies filters (follower count, bio, etc.)
   - Clicks follow with random delays
   - Tracks who was followed AND when (critical for smart unfollow later)
   - Saves all data to localStorage

#### 3B: Follow Engagers (`followEngagers.js`)

Walk me through following people who engage with specific posts:

1. Find a viral tweet in my niche
2. Navigate to that tweet
3. Paste core.js, then followEngagers.js with config:
   ```javascript
   MODE: 'likers',           // 'likers', 'retweeters', 'quoters', or 'all'
   TARGET_POSTS: [],          // Leave empty to use current page
   MAX_FOLLOWS_PER_POST: 15,
   TOTAL_MAX_FOLLOWS: 30,
   FILTERS: {
     MIN_FOLLOWERS: 50,
     SKIP_PROTECTED: true,
   },
   INTERACT_AFTER_FOLLOW: false, // Set true to also like their posts
   ```
4. Why this is powerful: People who liked/retweeted a post in your niche are pre-qualified — they're already interested in your type of content

#### 3C: Follow Target Users' Followers (`followTargetUsers.js`)

Walk me through following the followers of specific accounts:

1. How to choose good target accounts (engaged communities, not huge celebrity accounts)
2. Configure:
   ```javascript
   TARGET_ACCOUNTS: ['naval', 'paulg'],
   LIST_TYPE: 'followers',    // or 'following'
   MAX_FOLLOWS_PER_ACCOUNT: 20,
   TOTAL_MAX_FOLLOWS: 50,
   FILTERS: {
     MIN_FOLLOWERS: 100,
     MAX_FOLLOWERS: 50000,
     MIN_RATIO: 0.1,
     MUST_HAVE_BIO: true,
     BIO_KEYWORDS: ['founder', 'developer', 'building'],
   },
   INTERACT_AFTER_FOLLOW: false,
   ```
3. How it navigates to each target account's followers/following page, scrolls, extracts users, applies filters, and follows

#### 3D: Auto-Liker (`autoLiker.js`)

Walk me through the auto-liker for feed engagement:

1. Navigate to home feed or a specific profile
2. Configure:
   ```javascript
   LIKE_ALL: false,
   KEYWORDS: ['web3', 'crypto', 'AI'],
   FROM_USERS: [],
   MAX_LIKES: 20,
   ALSO_RETWEET: false,
   SKIP_REPLIES: true,
   SKIP_ADS: true,
   MIN_DELAY: 2000,
   MAX_DELAY: 5000,
   ```
3. How it scrolls through tweets, checks for keyword matches, skips already-liked and ads, clicks like with natural delays

### Phase 4: MCP Server Approach (No Browser Console Needed)

If I prefer using Claude directly, walk me through doing growth automation via MCP:

1. **Research phase:**
   ```
   "Search for tweets about 'building in public' and show me the most engaged authors"
   "Get the followers of @ycombinator — show me the first 100"
   "Get profile info for these 5 accounts: [list]"
   ```

2. **Follow phase:**
   ```
   "Follow these users: @user1, @user2, @user3"
   "Search for tweets about 'machine learning engineer' and follow the top 10 most active authors"
   ```

3. **Engage phase:**
   ```
   "Like the top 5 tweets from @user1"
   "Search for recent tweets about 'AI tools' and like the top 20"
   ```

4. **Cleanup phase:**
   ```
   "Find my non-followers — who doesn't follow me back?"
   "Preview unfollowing all non-followers (dry run)"
   "Unfollow the first 30 non-followers"
   ```

### Phase 5: Protect Active Engagers

Before unfollowing, help me protect valuable connections using `protectActiveUsers.js`:

1. How it identifies users who actively engage with your content
2. How to merge the protection list into smart unfollow's whitelist
3. Using the `quotaSupervisor.js` to manage rate limits across all scripts

### Phase 6: Track Everything with Session Logger

Set up `sessionLogger.js` to monitor all automation:

1. Paste core.js, then sessionLogger.js
2. It automatically tracks: follows, unfollows, likes, comments, retweets
3. How to export reports: JSON or CSV
4. How to review session stats:
   - Actions per session
   - Error rates
   - Daily/weekly trends
5. Using this data to optimize your growth strategy

### Phase 7: Daily Workflow

Help me create a sustainable daily routine:

**Morning (10 min):**
1. Run keywordFollow.js with 3-5 keywords → follow 20 new targeted users
2. Run autoLiker.js on your feed → like 20 posts to boost visibility

**Midday (5 min):**
3. Find a viral tweet in your niche → run followEngagers.js on its likers
4. Like/reply to posts from people who followed you today

**Evening (5 min):**
5. Run smartUnfollow.js → clean up 3+ day old non-followers
6. Check session logger stats for the day

**Weekly:**
7. Review growth metrics (new followers, follower ratio, engagement rate)
8. Adjust keywords and target accounts based on results
9. Run follower audit to check quality

## My Niche & Goals
(Replace before pasting)
- My niche: YOUR_NICHE
- My username: YOUR_USERNAME  
- Target audience: WHO_YOU_WANT_TO_ATTRACT
- Current follower count: CURRENT_COUNT
- Goal: FOLLOWER_GOAL by WHEN

Start with Phase 1 — help me define my strategy before we set up any automation.
