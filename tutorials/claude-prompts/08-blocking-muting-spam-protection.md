# Tutorial: Mass Block, Unblock, Mute & Spam Protection with Claude

You are my X/Twitter safety and moderation expert. I want to use XActions to block bots, mute noisy accounts, manage muted words, report spam, and keep my timeline clean. Help me set up comprehensive account protection.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with blocking, muting, and moderation features — both via MCP tools and browser console scripts.

## What I Need You To Do

### Part 1: Bot Detection & Mass Blocking

Help me identify and block bot/spam accounts:

1. **Audit my followers for bots** using `x_get_followers`:
   - Pull my followers list
   - Identify suspicious accounts based on:
     - No profile picture (default avatar)
     - No bio or generic bio
     - Following thousands, very few followers
     - Account created recently
     - Username looks auto-generated (random letters/numbers)
   - Present a list of suspected bots

2. **Mass block bots** using the `blockBots.js` browser script:
   - Navigate to follower list
   - Paste core.js, then blockBots.js
   - The script identifies and blocks suspected bot accounts
   - Configurable detection criteria

3. **Using MCP to block** — Block accounts one by one with targeted approach:
   ```
   "Block these accounts: @bot1, @bot2, @bot3"
   ```

4. **Block list from notification spam:**
   - Use `x_get_notifications` to check for spam notifications
   - Identify patterns (accounts that mass-like old tweets, spam DMs)
   - Mass block the offenders

### Part 2: Mass Block Script

Walk me through `src/massBlock.js`:

1. **Use case:** Block a list of specific accounts or block based on criteria
2. **Navigate to the account you want to block** or use a prepared list
3. **How it works:**
   - Takes a list of usernames to block
   - Navigates to each profile
   - Clicks the ⋯ menu → Block
   - Confirms the block
   - Waits between blocks to avoid rate limits
   - Logs all blocks

4. **Common blocking scenarios:**
   - Block all accounts from a harassment campaign
   - Block accounts that follow a specific spam account
   - Block accounts that reply with scams/spam to your tweets

### Part 3: Mass Unblock

When you've overblocked or want to start fresh, use `src/massUnblock.js`:

1. **Check your blocked list** using `x_get_blocked`:
   ```
   "Show me all my blocked accounts"
   ```

2. **Review and selectively unblock:**
   - Some blocks are deserved, some might have been mistakes
   - The script can unblock in bulk

3. **Full reset:** Unblock everyone and start with a clean slate

### Part 4: Muting Users

For accounts you don't want to block but don't want to see:

1. **Mute via MCP** using `x_mute_user`:
   ```
   "Mute these accounts: @annoying1, @annoying2"
   ```

2. **Mass unmute** using `x_unmute_user` or `src/massUnmute.js`:
   ```
   "Unmute @user1"
   ```
   Or bulk unmute when your mute list gets too long

3. **When to mute vs block:**
   - **Mute:** You don't want to see their content but don't want drama. They won't know.
   - **Block:** You want them completely cut off. They'll see they're blocked.
   - **Hide reply:** You want to hide a specific reply without blocking

### Part 5: Keyword Muting

Control your timeline with `src/muteByKeywords.js` and `src/manageMutedWords.js`:

1. **Mute specific keywords/phrases:**
   - Words that trigger you or cause negative experiences
   - Spoilers for shows/events
   - Political topics you want to avoid
   - Spam phrases

2. **Configure `muteByKeywords.js`:**
   - Navigate to Settings → Privacy → Muted → Muted words
   - Or use the script to add muted words programmatically
   - Set duration: Forever, 24 hours, 7 days, 30 days

3. **Manage muted words with `manageMutedWords.js`:**
   - View all currently muted words
   - Add new words in bulk
   - Remove words that are no longer relevant
   - Export your mute list

4. **Smart muting strategies:**
   - Mute during major events you don't care about (sports, elections, awards)
   - Mute spam patterns ("DM me", "check my pinned", "airdrop")
   - Mute negative trigger words
   - Unmute after events pass

### Part 6: Report Spam

For accounts actively spamming or harassing, use `src/reportSpam.js`:

1. **How it works:**
   - Identifies spam accounts from your mentions/notifications
   - Reports them to X for review
   - Optionally blocks after reporting

2. **What qualifies for reporting:**
   - Crypto scam replies
   - Impersonation accounts
   - Accounts posting harmful content
   - Mass-spam accounts

3. **Using MCP to monitor for spam:**
   ```
   "Check my recent notifications for spam patterns"
   "Search for recent replies to my tweets — are there any spam accounts?"
   ```

### Part 7: Removing Unwanted Followers

Use `src/removeFollowers.js` to remove followers you don't want:

1. **Why remove followers?**
   - Bot followers that hurt your engagement rate
   - Toxic accounts you don't want associated with your profile
   - Ex-employees, ex-partners, or people you want to distance from

2. **How it works:**
   - Block then immediately unblock — this removes them as a follower
   - They won't get a notification
   - They can follow you again unless you keep them blocked

3. **Follower cleanup strategy:**
   - Audit followers monthly
   - Remove obvious bots
   - Remove inactive accounts (improve engagement metrics)
   - Keep your follower quality high

### Part 8: MCP Tools for Safety

Quick reference for MCP-based moderation:

1. **Block:** Use MCP tools or script
2. **Mute user:** `x_mute_user`
   ```
   "Mute @username"
   ```
3. **Unmute user:** `x_unmute_user`
   ```
   "Unmute @username"
   ```
4. **Get blocked list:** `x_get_blocked`
   ```
   "Show me my blocked accounts"
   ```
5. **Privacy toggle:** `x_toggle_protected`
   ```
   "Make my account private"
   "Make my account public"
   ```
6. **Settings check:** `x_get_settings`
   ```
   "Show me my current privacy settings"
   ```

### Part 9: Proactive Protection Setup

Set up ongoing protection:

1. **Brand monitoring** using `x_brand_monitor`:
   ```
   "Monitor mentions of my username for negative sentiment"
   ```
   - Catch harassment early
   - Identify coordinated attacks
   - Block offending accounts quickly

2. **Notification filtering** using `x_get_notifications`:
   - Regular checks for spam patterns
   - Auto-identify new bot followers
   - Track unusual activity spikes

3. **Privacy lockdown checklist:**
   - Review who can DM you
   - Review who can tag you in photos
   - Check if email/phone is discoverable
   - Review connected apps
   - Use `x_get_settings` to audit everything

### Part 10: Emergency Response

If you're being harassed or brigaded:

1. **Immediate actions:**
   - Toggle account to protected: `x_toggle_protected` with `enabled: true`
   - This stops new followers and hides your tweets from non-followers

2. **Block the source:**
   - Block the main instigator(s)
   - Block accounts replying with harassment

3. **Report to X:**
   - Use reportSpam.js for mass reporting
   - Document everything (screenshot before blocking)

4. **Recovery:**
   - Wait for the storm to pass
   - Unprotect account when ready
   - Review and update your block/mute lists
   - Consider adjusting privacy settings long-term

## My Safety Needs
(Replace before pasting)
- Am I being harassed? Yes/No
- Estimated bot followers: ROUGH_NUMBER
- Keywords I want to mute: keyword1, keyword2
- Accounts to block: @acc1, @acc2 (or "help me identify them")
- Privacy level: Open, Moderate, Strict

Start with Part 1 — help me audit my followers for bots and clean up my account.
