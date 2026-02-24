# Tutorial: Profile Management, Backup & Account Settings with Claude

You are my X/Twitter profile optimization specialist. I want to use XActions to update my profile, back up my account data, manage settings, and optimize my presence for maximum impact.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with profile management, account backup, and settings features — via MCP tools and browser scripts.

## What I Need You To Do

### Part 1: Profile Audit

First, analyze my current profile:

1. **Pull my profile** using `x_get_profile`:
   ```
   "Get my profile for @myusername and give me a detailed audit"
   ```
   Review:
   - Display name — is it memorable and clear?
   - Bio — does it immediately communicate who I am and what I offer?
   - Location — is it set? (Helps with local networking)
   - Website — is it linked? (Drives traffic off-platform)
   - Profile picture — is it professional and recognizable? (Can't check via API, I'll confirm)
   - Banner image — does it reinforce my brand? (Same, I'll confirm)

2. **Rate my profile on a 1-10 scale** based on:
   - Clarity: Can someone understand what I do in 3 seconds?
   - Credibility: Do I look legit?
   - Call-to-action: Is there a reason to follow me?
   - Completeness: Are all fields filled in?

3. **Compare with top profiles in my niche:**
   - Pull profiles of 3-5 leaders in my space
   - How do their bios differ from mine?
   - What patterns do successful bios share?

### Part 2: Profile Optimization

Help me craft an optimized profile:

1. **Update profile** using `x_update_profile`:
   ```
   "Update my profile with: 
   Name: [new display name]
   Bio: [new bio]
   Location: [new location]
   Website: [new website]"
   ```
   Parameters:
   - `name`: Display name (max 50 chars)
   - `bio`: Bio text (max 160 chars)
   - `location`: Location text
   - `website`: Website URL

2. **Bio optimization frameworks:**
   
   **The Formula Bio:**
   > [Role/Identity] | [What you do/build] | [Social proof/credibility] | [CTA or personality]
   > Example: "AI Engineer @BigCo | Building tools that automate X | 50K+ users | Sharing what I learn"

   **The Story Bio:**
   > [Origin] → [Current state] | [What you share]
   > Example: "College dropout → Built a $1M SaaS | Tweeting about startups, code, and the journey"

   **The Value Bio:**
   > [What value followers get] | [Credential]
   > Example: "Daily AI tips that save you 10hrs/week | Former Google ML Engineer | Newsletter: link.com"

   **The Punchy Bio:**
   > [Bold statement] | [Proof] | [CTA]
   > Example: "I help devs 10x their Twitter growth | 0 → 50K in 12 months | Free guide in link ↓"

3. **Bio templates for different niches:**
   - Help me write 3 versions and A/B test them over time

### Part 3: Profile Manager (Puppeteer)

For advanced profile management, the `profileManager` module and `src/updateProfile.js`:

1. **Available functions:**
   - Update display name
   - Update bio
   - Update location
   - Update website
   - Update birth date
   - Upload profile picture (via Puppeteer)
   - Upload banner image (via Puppeteer)

2. **Using `scripts/editProfile.js`** browser script:
   - Navigate to your profile
   - Script opens the edit profile modal
   - Programmatically updates fields
   - Saves changes

### Part 4: Account Backup

Protect your account with full backup using `src/backupAccount.js`:

1. **What's backed up:**
   - Profile information (bio, stats)
   - Tweet history (all your tweets with engagement data)
   - Follower list (all followers with bios)
   - Following list
   - Bookmarks
   - Likes
   - Lists and list members
   - DM conversations (if accessible)

2. **Export formats:**
   - JSON (for programmatic use)
   - CSV (for spreadsheet analysis)

3. **How to run the backup:**
   - Via browser console: paste the backup script
   - Via CLI: `xactions backup --format json`
   - Via MCP: Export individual components

4. **Backup schedule recommendation:**
   - Full backup monthly
   - Follower list weekly (to detect unfollowers)
   - Tweet archive monthly

### Part 5: Download Account Data

Using `src/downloadAccountData.js` for comprehensive data export:

1. **What it downloads:**
   - Your complete Twitter/X data archive
   - Includes everything: tweets, DMs, likes, bookmarks, ads data
   - Similar to X's official data export but faster

2. **Use cases:**
   - Switching platforms
   - Legal/compliance records
   - Personal data backup
   - Analyzing your entire history

### Part 6: QR Code Sharing

Using `src/qrCodeSharing.js`:

1. **Generate QR codes** for your profile
2. **Use cases:**
   - Business cards
   - Conference badges
   - Presentations
   - Physical marketing materials
3. **How it works:**
   - Generates a QR code that links to your X profile
   - Can be saved as an image

### Part 7: Settings & Privacy Management

Using `x_get_settings` and `x_toggle_protected`:

1. **Audit your current settings:**
   ```
   "Show me my current account settings"
   ```
   Review:
   - Is your account public or protected?
   - Who can DM you?
   - Who can tag you in photos?
   - Is your email/phone discoverable?
   - Connected third-party apps

2. **Privacy recommendations:**
   
   **For public figures/creators:**
   - Public account
   - DMs open but filtered
   - Email/phone not discoverable
   - Regular connected app audit
   
   **For personal use:**
   - Consider protected account
   - DMs from followers only
   - Email/phone not discoverable
   - Minimal connected apps
   
   **For businesses:**
   - Public account
   - DMs open for customer service
   - Business email discoverable
   - Authorized connected apps only

3. **Toggle protected mode:**
   ```
   "Make my account private"
   "Make my account public"
   ```

4. **Using `src/settingsManager.js`** and `scripts/manageSettings.js`:
   - Navigate settings programmatically
   - Update privacy preferences
   - Manage connected apps
   - Review security settings

### Part 8: Premium Features Check

Using `x_check_premium`:

1. **Check your subscription:**
   ```
   "Check my premium subscription status"
   ```

2. **Premium features available via XActions:**
   - Edit tweets
   - Longer tweets (up to 25,000 chars)
   - Bookmark folders
   - Custom navigation
   - Articles (Premium+)
   - Creator Studio (Premium+)
   - Analytics dashboard

3. **Using `src/premiumManager.js`** and `scripts/premiumFeatures.js`:
   - Check subscription tier
   - Access premium-only features
   - Manage premium settings

### Part 9: Creator Studio

For monetized accounts, using `x_creator_analytics`:

1. **Creator dashboard:**
   ```
   "Get my creator analytics for the last 28 days"
   ```
   - Revenue data
   - Subscriber count
   - Top-performing content
   - Growth metrics

2. **Using `src/creatorStudio.js`:**
   - Access creator tools
   - Manage Subscriptions
   - Review monetization settings
   - Analyze content performance specific to monetization

### Part 10: Publishing Articles

For Premium+ users, using `x_publish_article`:

1. **Write and publish long-form:**
   ```
   "Publish this article as a draft:
   Title: How to Grow on X/Twitter Without Paid API
   Body: [article content]
   Publish: false"
   ```

2. **Article workflow:**
   - Draft the article with Claude's help
   - Save as draft first
   - Review and edit
   - Publish when ready
   - Promote in a tweet/thread

3. **Using `src/articlePublisher.js`:**
   - Puppeteer-based article creation
   - Supports rich formatting
   - Preview before publishing

### Part 11: Grok AI Integration

If you have access to Grok, using `x_grok_query` and `x_grok_summarize`:

1. **Query Grok:**
   ```
   "Ask Grok: What are the biggest AI trends right now?"
   ```
   Modes:
   - `default`: Standard response
   - `deepsearch`: Deep search for detailed answers
   - `think`: Extended thinking mode

2. **Summarize topics:**
   ```
   "Use Grok to summarize what people on X are saying about [topic]"
   ```

3. **Using `src/grokIntegration.js`:**
   - Access Grok from browser console
   - Send queries and get responses
   - Use in automated workflows

## My Profile Goals
(Replace before pasting)
- My username: YOUR_USERNAME
- My niche: YOUR_NICHE
- Current bio: YOUR_CURRENT_BIO
- What I want my profile to communicate: YOUR_MESSAGE
- Am I a creator/business? Yes/No
- Do I have Premium? Yes/No/Which tier?

Start with Part 1 — audit my current profile and help me optimize it.
