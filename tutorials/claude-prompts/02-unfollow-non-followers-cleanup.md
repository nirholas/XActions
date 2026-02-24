# Tutorial: Unfollow Non-Followers & Follower Cleanup with Claude

You are my X/Twitter account manager. I want to clean up my following list using XActions. Help me identify who doesn't follow me back and strategically unfollow them. Be methodical and give me full control over the process.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter automation toolkit. It has both an MCP server (for Claude Desktop) and browser console scripts for follower management.

## What I Need You To Do

### Phase 1: Audit My Following List

First, help me understand the state of my account:

1. **Get my profile stats** using `x_get_profile` for my username
   - Show me: followers count, following count, follower-to-following ratio
   - Tell me if my ratio is healthy (generally, following >> followers looks spammy)

2. **Find non-followers** using `x_get_non_followers` for my username
   - This will show everyone I follow who doesn't follow me back
   - Present the results as a clean list: username, display name, bio
   - Tell me the total count and what percentage of my following list doesn't follow back

3. **Categorize the non-followers** into groups:
   - **Celebrities/Influencers** (100K+ followers) — might want to keep following these
   - **News/Media accounts** — I probably follow these for content, not follow-backs
   - **Inactive accounts** — haven't posted in months  
   - **Likely bots** — no bio, suspicious patterns
   - **Regular users who just don't follow back** — prime unfollow candidates

### Phase 2: Smart Unfollow Strategy

Help me create an unfollow plan:

1. **Build a whitelist** — Ask me which accounts I want to NEVER unfollow regardless (favorite creators, friends, family, news sources)

2. **Suggest an unfollow order** — Start with:
   - Obvious bots and spam accounts first
   - Inactive accounts next
   - Then regular non-followers
   - Celebrities/influencers last (or keep them)

3. **Execute unfollows in batches** using `x_unfollow` or the bulk `x_unfollow_non_followers` tool:
   - Use `dryRun: true` first to preview what would happen
   - Then do it for real in batches of 20-30
   - Wait between batches to avoid rate limits
   - Give me a running count: "Unfollowed 23/150 non-followers"

### Phase 3: Browser Console Script Alternative

If I prefer the browser console method, walk me through the XActions unfollowback script:

1. Have me navigate to `https://x.com/MY_USERNAME/following`
2. Tell me to open DevTools (F12 or Cmd+Option+I)
3. Give me the script to paste. The standard XActions unfollow script uses these selectors:
   - `[data-testid$="-unfollow"]` for unfollow buttons
   - `[data-testid="confirmationSheetConfirm"]` for the confirmation dialog
   - `[data-testid="userFollowIndicator"]` to detect who follows you back

4. Explain what the script does step by step:
   - Scrolls through the following list
   - Identifies users without the "Follows you" indicator
   - Clicks unfollow, then confirms
   - Waits 1-2 seconds between each to avoid rate limits
   - Logs each unfollow to the console

### Phase 4: Detect Unfollowers Over Time

Set me up with ongoing unfollower detection:

1. **Using MCP:** Run `x_detect_unfollowers` periodically to snapshot my followers list
   - Compare snapshots to find who unfollowed me
   - Show me: "Since last check, 3 people unfollowed you: @user1, @user2, @user3"

2. **Using browser script** (`src/detectUnfollowers.js`):
   - Explain how it stores follower snapshots in localStorage
   - How to compare snapshots to detect changes
   - Setting up the `newFollowersAlert.js` for real-time monitoring

3. **Using the continuous monitor** (`src/continuousMonitor.js`):
   - Explain how it runs continuously checking for new followers/unfollowers
   - How to configure check intervals
   - How to set up alerts

### Phase 5: Smart Unfollow with Tracking

For ongoing follow management, walk me through the automation framework:

1. **Paste `core.js`** (the foundation module) into browser console first
2. **Then paste `smartUnfollow.js`** which provides:
   - Time-based unfollowing (unfollow after X days if no follow-back)
   - Whitelist support
   - Dry run mode to preview
   - Integration with follow tracking data from `keywordFollow.js`
   
   Key config options to explain:
   ```javascript
   DAYS_TO_WAIT: 3,        // Days before unfollowing
   MAX_UNFOLLOWS: 50,      // Per session limit
   WHITELIST: [],           // Protected accounts
   DRY_RUN: false,          // Preview mode
   ONLY_TRACKED: true,      // Only unfollow previously tracked follows
   ```

3. **Explain the complete workflow:**
   - Follow people with `keywordFollow.js` (tracks who you followed and when)
   - Wait 3 days (configurable)
   - Run `smartUnfollow.js` to clean up non-followers automatically
   - Repeat for continuous, sustainable growth

### Phase 6: Follower Audit Deep Dive

Help me audit the quality of my followers using `x_get_followers`:

1. Scrape my followers list
2. Analyze patterns:
   - What percentage have bios?
   - What's the average follower count?
   - Any obvious bot accounts? (no avatar, no bio, following thousands)
   - What niches/interests do they represent?
3. Suggest who I should engage with more to retain good followers
4. Suggest using `removeFollowers.js` to remove bot/spam followers

### Phase 7: Results Summary

After the cleanup, show me:
- **Before vs After** comparison of my following count
- **New follower-to-following ratio**
- **Quality score** of remaining following list
- **Recommendations** for maintaining a healthy ratio going forward

## Important Notes
- Rate limits: Stay under 50 unfollows per hour to be safe
- Delays: Always wait 2-3 seconds between actions
- Reversibility: Following someone back is easy, so err on the side of unfollowing
- The `auth_token` cookie is needed for authenticated operations

## My Account Details
(Replace these before pasting)
- My username: YOUR_USERNAME
- Accounts to never unfollow: [list your must-keeps]
- My goal ratio: I want to follow fewer people than follow me

Walk me through this entire process step by step. Start with Phase 1 and check in with me before moving to each next phase.
