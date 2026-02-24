# Tutorial: Content Cleanup — Unlike All, Clear Reposts, Delete Tweets with Claude

You are my X/Twitter content cleanup specialist. I want to use XActions to clean up my account — unlike all posts, clear all reposts, delete old tweets, and start with a clean slate. Help me systematically clean my public footprint.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with content cleanup scripts: `src/unlikeAllPosts.js`, `src/clearAllReposts.js`, and more.

## What I Need You To Do

### Part 1: Assess the Damage

Before cleaning, let me understand what's on my account:

1. **Pull my profile stats** using `x_get_profile`:
   - Total tweets (includes retweets, replies)
   - How long I've been on the platform
   - Engagement patterns

2. **Pull my recent tweets** using `x_get_tweets`:
   - Are there old tweets I'm embarrassed about?
   - How many retweets vs original tweets?
   - Any controversial or outdated content?

3. **Check my likes:**
   - Likes are public by default
   - Old likes can be problematic
   - Volume estimate for cleanup

### Part 2: Unlike All Posts

Using `src/unlikeAllPosts.js`:

1. **Navigate to your Likes page:** `x.com/YOUR_USERNAME/likes`
2. **Paste the script in DevTools**
3. **How it works:**
   - Finds all unlike buttons (`[data-testid="unlike"]`) on the page
   - Clicks each one with a delay between clicks
   - Scrolls to load more liked posts
   - Continues until all likes are removed or limit is reached
   - Logs progress: "Unliked 45 posts..."

4. **Configuration:**
   - Set a delay between unlikes (1-2 seconds recommended)
   - Set a batch size to avoid rate limits
   - Can run multiple sessions to clear large like histories

5. **Warning:**
   - This is irreversible — you can't re-like everything easily
   - Can take hours for accounts with thousands of likes
   - Consider exporting liked tweets first using `scripts/scrapeLikes.js`

6. **Export first (recommended):**
   - Run `scripts/scrapeLikes.js` to save all your likes
   - Navigate to likes page
   - Script extracts all liked tweets with metadata
   - Save as JSON/CSV backup
   - THEN run the unlike script

### Part 3: Clear All Reposts

Using `src/clearAllReposts.js`:

1. **Navigate to your profile:** `x.com/YOUR_USERNAME`
2. **Paste the script**
3. **How it works:**
   - Finds retweet indicators on your timeline
   - Clicks the unretweet button (`[data-testid="unretweet"]`)
   - Confirms the action if prompted
   - Scrolls to load more
   - Continues until all reposts are cleared

4. **Why clear reposts:**
   - Old retweets can be outdated or embarrassing
   - Retweets clutter your profile — makes it hard for visitors to see YOUR content
   - Cleaning reposts makes your profile look more curated
   - Some people judge accounts by what they retweet

5. **Selective approach:**
   - Instead of clearing all, modify to only clear:
     - Reposts older than 30/60/90 days
     - Reposts from specific accounts
     - Keep reposts with high engagement

### Part 4: Delete Old Tweets

For the nuclear option — deleting old tweets:

1. **Why delete old tweets:**
   - Outdated opinions that no longer represent you
   - Tweets from a different era of your life/career
   - Privacy concerns
   - Starting fresh with a new brand/direction

2. **Using `x_delete_tweet` via MCP:**
   ```
   "Delete this tweet: [URL]"
   ```
   This deletes specific tweets one at a time.

3. **Selective deletion strategy (recommended):**
   - Export all tweets first: `x_get_tweets` with a high limit
   - Review the list
   - Identify tweets to delete
   - Delete them individually or in small batches

4. **Browser script approach:**
   - Navigate to your profile
   - For each tweet: click ⋯ menu → Delete → Confirm
   - Can be automated with a custom script

5. **Bulk deletion tips:**
   - Request your full Twitter archive from X Settings first
   - This gives you a complete record before deleting
   - Then systematically delete what you don't want public

### Part 5: Clear All Bookmarks

As part of a total cleanup:

1. **Export bookmarks first:** `x_get_bookmarks`
2. **Then clear:** `x_clear_bookmarks` or `src/clearAllBookmarks.js`
3. **Start fresh** with a curated bookmark system

### Part 6: Full Account Reset Workflow

If you want a complete fresh start (without creating a new account):

1. **Step 1: Backup everything**
   - Export tweets
   - Export likes
   - Export bookmarks
   - Export followers/following lists
   - Export DMs
   - Download full account data

2. **Step 2: Clean likes** (unlikeAllPosts.js)
   - Run in multiple sessions
   - 200 unlikes per session, with breaks in between

3. **Step 3: Clean reposts** (clearAllReposts.js)
   - Usually faster than likes

4. **Step 4: Delete old tweets** (selective or all)
   - Consider keeping your best-performing tweets
   - Delete everything before a certain date

5. **Step 5: Leave communities** (leaveAllCommunities.js)
   - Start fresh with intentional community membership

6. **Step 6: Clean following list** (unfollowback / unfollowEveryone)
   - Unfollow non-followers
   - Or unfollow everyone for a truly clean slate

7. **Step 7: Update profile**
   - New bio, new avatar, new banner
   - Fresh start with optimized profile

8. **Step 8: Re-build intentionally**
   - Carefully re-follow accounts that matter
   - Join communities that align with your new direction
   - Start posting fresh content

### Part 7: Ongoing Content Hygiene

Set up a system to keep your account clean going forward:

1. **Monthly cleanup routine:**
   - Clear reposts from the previous month
   - Unlike posts older than 30 days
   - Review and delete any tweets that underperformed or aged poorly
   - Clean bookmarks

2. **Automated hygiene** using the Growth Suite approach:
   - Pair smartUnfollow.js with content cleanup
   - Regular follower audits
   - Bookmark reviews

3. **Content audit schedule:**
   - Every 3 months: Review all tweets from 3 months ago
   - Delete anything that doesn't serve your current brand
   - Keep a lean, curated profile

## My Cleanup Goals
(Replace before pasting)
- What I want to clean: Likes / Reposts / Old tweets / Everything
- Account age: HOW_OLD
- Approximate likes to clear: ROUGH_NUMBER  
- Approximate reposts to clear: ROUGH_NUMBER
- Do I want to delete old tweets? Before what date?
- Have I backed up my data? Yes/No

Start with Part 1 — help me assess what needs cleaning and make a plan.
