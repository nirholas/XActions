# Tutorial: Auto-Liker & Auto-Commenter — Engagement Automation with Claude

You are my X/Twitter engagement automation specialist. I want to use XActions to automatically like and comment on relevant content to boost my visibility and build relationships in my niche. Help me set up smart, targeted engagement that doesn't look spammy.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter automation toolkit. The auto-liker (`src/automation/autoLiker.js`) and auto-commenter (`src/automation/autoCommenter.js`) are browser console scripts that automate engagement with configurable filters.

## What I Need You To Do

### Part 1: Strategic Engagement Planning

Before setting up automation, help me plan:

1. **Who should I engage with?**
   - My target audience (who I want to attract)
   - Influencers in my niche (whose audience overlaps mine)
   - Accounts I want to build relationships with

2. **What content should I engage with?**
   - Topics relevant to my niche
   - Keywords to filter for
   - Types of content (original posts, threads, images)
   - Content to avoid (ads, spam, political)

3. **How much engagement?**
   - Likes per day: 20-50 (safe range)
   - Comments per day: 5-15 (quality over quantity)
   - Retweets per day: 5-10

### Part 2: Auto-Liker Setup

Walk me through setting up the auto-liker in browser console:

1. **Navigate to X home feed** (or a specific profile/search)
2. **Paste `core.js`** — the foundation module
3. **Configure `autoLiker.js`:**

   ```javascript
   const OPTIONS = {
     // What to like
     LIKE_ALL: false,                    // Never set true unless you want chaos
     KEYWORDS: ['AI', 'startups', 'building in public'], // Only like matching posts
     FROM_USERS: [],                     // Only from specific users (empty = anyone)
     
     // Limits (conservative to start)
     MAX_LIKES: 20,                      // Max likes this session
     MAX_SCROLL_DEPTH: 50,               // How far to scroll
     
     // Behavior
     ALSO_RETWEET: false,                // Also retweet? (use sparingly)
     MIN_DELAY: 2000,                    // 2 seconds minimum between likes
     MAX_DELAY: 5000,                    // 5 seconds max (random within range)
     
     // Filters
     SKIP_REPLIES: true,                 // Skip reply tweets
     SKIP_ADS: true,                     // Skip promoted content
     MIN_LIKES_ON_POST: 0,               // Only like posts with X+ existing likes
   };
   ```

4. **How it works step by step:**
   - Finds all visible tweets on the page
   - For each tweet, checks if it matches keywords
   - Skips already-liked tweets, replies, and ads
   - Tracks liked tweets in localStorage to avoid duplicate likes
   - Clicks the like button with human-like random delays
   - Scrolls down to load more tweets
   - Stops when MAX_LIKES is reached
   - Respects the daily rate limit (200 likes/day built into core.js)

5. **Paste the script and monitor the console** — you'll see:
   ```
   ✅ [10:30:15] Liked tweet #1
   ✅ [10:30:19] Liked tweet #2
   ⚠️ [10:30:23] Skipped (already liked)
   ✅ [10:30:27] Liked tweet #3
   ...
   ⚠️ [10:35:00] Reached max likes (20)
   ```

### Part 3: Advanced Auto-Liker Strategies

Teach me different auto-liker configurations:

#### Strategy A: Feed Engagement
```javascript
// Like relevant posts in your timeline
LIKE_ALL: false,
KEYWORDS: ['your', 'niche', 'keywords'],
FROM_USERS: [],           // Anyone in your feed
SKIP_REPLIES: true,
MAX_LIKES: 30,
```
Use: Daily, on your home feed. Builds visibility in the algorithm.

#### Strategy B: Target Account Engagement
```javascript
// Like everything from specific accounts you want to connect with
LIKE_ALL: false,
KEYWORDS: [],              // No keyword filter
FROM_USERS: ['naval', 'paulg', 'elonmusk'],
SKIP_REPLIES: false,       // Like their replies too — shows real interest
MAX_LIKES: 10,
```
Use: On a target user's profile. Builds relationship through consistent engagement.

#### Strategy C: Niche Domination
```javascript
// Like a LOT of posts in your niche from search results
LIKE_ALL: false,
KEYWORDS: ['solidity', 'smart contracts', 'defi'],
MIN_LIKES_ON_POST: 5,     // Only like posts that already have engagement
ALSO_RETWEET: false,
MAX_LIKES: 50,
```
Use: On search results page for your niche keywords.

#### Strategy D: Support Network
```javascript
// Like posts from your closest supporters
FROM_USERS: ['friend1', 'friend2', 'friend3', 'mentor1'],
LIKE_ALL: true,            // Like everything they post
SKIP_REPLIES: true,
MAX_LIKES: 20,
```
Use: Daily reciprocation with your closest network.

### Part 4: Auto-Commenter Setup

Walk me through the auto-commenter:

1. **Navigate to the target user's profile** (x.com/USERNAME)
2. **Paste `core.js`**, then configure `autoCommenter.js`:

   ```javascript
   const OPTIONS = {
     // Comment pool — randomly picked for each comment
     COMMENTS: [
       '🔥',
       'Great point!',
       'This is so true 👏',
       'Interesting take!',
       'Love this perspective',
       '💯',
       'Facts!',
     ],
     
     // Monitoring
     CHECK_INTERVAL_SECONDS: 60,    // Check for new posts every 60 seconds
     MAX_COMMENTS_PER_SESSION: 5,   // Don't comment more than 5 times
     
     // Behavior
     ONLY_ORIGINAL_TWEETS: true,    // Skip replies and retweets
     REQUIRE_KEYWORD: false,        // Only comment if keywords match
     KEYWORDS: [],                  // Keywords to match
     
     // Safety
     MIN_POST_AGE_SECONDS: 30,      // Don't comment on brand-new posts (looks bot-like)
     MAX_POST_AGE_MINUTES: 30,      // Don't comment on old posts
   };
   ```

3. **How it works:**
   - Monitors the user's profile for new tweets
   - When a new tweet is detected, waits the minimum age
   - Picks a random comment from the COMMENTS array
   - Clicks the reply button on the tweet
   - Types the comment in the reply textarea
   - Clicks the post button
   - Saves the tweet ID so it won't comment twice
   - Waits until next check interval

4. **Critical warnings:**
   - Generic comments like "Nice!" can get you flagged as a bot
   - Customize comments to be relevant to the person's content
   - 5 comments per session is the safe max
   - Never run on more than 2-3 profiles simultaneously
   - Mix in manual, genuine replies alongside automated ones

### Part 5: Writing Effective Comment Templates

Help me write comment templates that are engaging but not spammy:

1. **Niche-specific comments** (much better than generic ones):
   - **For tech accounts:** "This is a great architecture decision. Have you considered [related topic]?"
   - **For business accounts:** "Solid strategy. The market is definitely moving this direction."
   - **For educational accounts:** "Really clear explanation. Saving this for reference 🔖"
   - **For hot takes:** "Interesting perspective — I see it differently but respect the logic."

2. **Comment formats that work:**
   - **Add value:** Share a relevant insight, not just agreement
   - **Ask a question:** Drives conversation and makes them reply to you
   - **Share experience:** "I tried this and found that..."
   - **Emoji reaction + one line:** Quick but human-feeling

3. **Comments to AVOID:**
   - "Nice post!" / "Great!" / "👍" (too generic)
   - Self-promotion ("Check out my profile")
   - Copy-paste the same comment everywhere
   - Anything that reads obviously automated

### Part 6: MCP Auto-Like Approach

If using Claude via MCP, walk me through the `x_auto_like` tool:

1. **Auto-like by keywords:**
   ```
   "Auto-like 20 tweets about 'machine learning' in my feed"
   ```
   Parameters:
   - `keywords`: Array of filter words (empty = like all)
   - `maxLikes`: Maximum number of likes

2. **Manual engagement via MCP:**
   ```
   "Like this tweet: [URL]"
   "Search for tweets about 'startup funding' and like the top 10"
   "Get the latest 5 tweets from @elonmusk and like them all"
   ```

3. **Reply via MCP using `x_reply`:**
   ```
   "Reply to [URL] with: Great insight! I'd add that [your take]"
   ```

### Part 7: Engagement Metrics & Optimization

Track and optimize your engagement strategy:

1. **Using `sessionLogger.js`:**
   - Tracks all likes, comments, retweets
   - Shows engagement-to-follower conversion rate
   - Identifies which types of engagement drive the most profile visits

2. **Key metrics to watch:**
   - Profile visits per engagement session
   - New followers gained after engagement sessions
   - Engagement reciprocation rate (how many people engage back)
   - Best time for engagement sessions

3. **Iterate:**
   - Which keywords lead to the most follow-backs?
   - Which accounts are most responsive to your engagement?
   - Are comments or likes more effective for your goals?

### Part 8: Safety & Rate Limits

Keep it safe to avoid account restrictions:

1. **Built-in protections in core.js:**
   - `MAX_ACTIONS_PER_HOUR: 50`
   - `MAX_LIKES_PER_DAY: 200`
   - Random delays between 2-5 seconds
   
2. **Additional safety from `quotaSupervisor.js`:**
   - Stochastic delays (random intervals that look human)
   - Hourly and daily quotas
   - Automatic pause when limits approach

3. **Best practices:**
   - Start slow: 10-15 likes/day for the first week
   - Gradually increase to 30-50/day
   - Never exceed 100 likes/day even if limits allow it
   - Mix automated and manual engagement
   - Take breaks — don't run automation 24/7
   - Vary your session times

## My Engagement Strategy
(Replace before pasting)
- Accounts I want to build relationships with: @account1, @account2
- My niche keywords: keyword1, keyword2, keyword3
- My daily engagement budget: X likes, Y comments
- My goal: More visibility / Build relationships / Grow followers

Start with Part 1 — help me create my engagement strategy before we set up any automation.
