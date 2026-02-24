# Tutorial: Workflow Automation & Account Portability with Claude

You are my X/Twitter workflow architect. I want to use XActions' workflow engine to create automated pipelines, and use account portability tools to export/migrate my data. Help me build powerful multi-step workflows and manage my account data.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit. It includes:
- Workflow engine: `x_workflow_create`, `x_workflow_run`, `x_workflow_list`, `x_workflow_actions`
- Account export: `x_export_account` (profile, tweets, followers, following, bookmarks → JSON/CSV/MD/HTML)
- Account migration: `x_migrate_account` (X → Bluesky or Mastodon)
- Real-time streams: `x_stream_start`, `x_stream_stop`, `x_stream_list`

## What I Need You To Do

### Phase 1: Workflow Automation Engine

Create multi-step automated pipelines:

1. **Create a workflow:**
   ```
   "Create a workflow that scrapes my mentions every hour, analyzes sentiment, and alerts me if sentiment drops below -0.3"
   ```
   Tool: `x_workflow_create`
   
   Parameters:
   - `name`: Workflow name
   - `description`: What it does
   - `trigger`: How it starts
     - `{ type: "manual" }` — Run on demand
     - `{ type: "schedule", cron: "0 * * * *" }` — Cron schedule (every hour)
     - `{ type: "webhook" }` — Triggered by external HTTP call
   - `steps`: Array of step objects

2. **Step types:**
   ```javascript
   // Scrape action
   { action: "scrapeProfile", target: "@elonmusk", output: "profileData" }
   
   // Search action
   { action: "searchTweets", query: "XActions", output: "searchResults" }
   
   // Condition
   { condition: "searchResults.length > 10" }
   
   // Transform
   { action: "analyzeSentiment", input: "searchResults", output: "sentiment" }
   
   // Notify
   { action: "webhook", url: "https://hooks.slack.com/xxx", body: "sentiment" }
   ```

3. **List available actions:**
   ```
   "What actions can I use in workflows?"
   ```
   Tool: `x_workflow_actions`
   - Returns all available step types: scrapers, transforms, AI, utilities

4. **Run a workflow:**
   ```
   "Run the sentiment monitoring workflow"
   ```
   Tool: `x_workflow_run`
   - `workflow`: Name or ID
   - `context`: Optional initial variables
   - Returns: Step-by-step execution logs with results

5. **List workflows:**
   ```
   "Show all my saved workflows"
   ```
   Tool: `x_workflow_list`
   - Shows: name, trigger type, step count, enabled status

### Phase 2: Example Workflows

#### Growth Pipeline
```
"Create a workflow called 'Growth Pipeline' that:
1. Searches for tweets about 'AI tools'
2. Filters for tweets with >50 likes
3. Follows the authors who aren't already following me
4. Likes those tweets
5. Runs daily at 10am"
```

Configuration:
```javascript
{
  name: "Growth Pipeline",
  description: "Find and engage with relevant accounts daily",
  trigger: { type: "schedule", cron: "0 10 * * *" },
  steps: [
    { action: "searchTweets", query: "AI tools min_faves:50", output: "tweets" },
    { action: "extractAuthors", input: "tweets", output: "authors" },
    { action: "filterNotFollowing", input: "authors", output: "newAuthors" },
    { action: "follow", input: "newAuthors", limit: 20 },
    { action: "like", input: "tweets", limit: 20 }
  ]
}
```

#### Content Research
```
"Create a workflow called 'Content Research' that:
1. Gets trending topics
2. Searches each top topic for viral tweets
3. Analyzes sentiment of each topic
4. Outputs a markdown report"
```

#### Competitor Watch
```
"Create a workflow that:
1. Scrapes @competitor's latest 20 tweets
2. Analyzes which ones performed best
3. Identifies topics and formats
4. Generates a competitive insights report
5. Runs weekly on Monday mornings"
```

#### Follower Churn Alert
```
"Create a workflow that:
1. Gets my current followers
2. Compares to yesterday's snapshot
3. Identifies new unfollowers
4. Sends a webhook alert if >5 people unfollowed
5. Runs every 6 hours"
```

### Phase 3: Real-Time Streaming

Set up live event streams:

1. **Start a tweet stream:**
   ```
   "Start streaming new tweets from @elonmusk"
   ```
   Tool: `x_stream_start`
   - `type`: "tweet" — Watch for new tweets
   - `username`: Target account
   - `interval`: Poll interval in seconds (default: 60, minimum: 15)

2. **Start a follower stream:**
   ```
   "Start monitoring my followers for changes"
   ```
   - `type`: "follower" — Detect follow/unfollow events
   
3. **Start a mention stream:**
   ```
   "Stream my mentions in real-time"
   ```
   - `type`: "mention" — Watch for new @mentions

4. **How streams work:**
   - Polls X at your configured interval
   - Compares with previous state
   - Emits new events via Socket.IO
   - Events can trigger webhooks or other actions

5. **List active streams:**
   ```
   "Show all my active streams"
   ```
   Tool: `x_stream_list`
   - Shows: stream ID, type, target, interval, poll count, browser pool info

6. **Stop a stream:**
   ```
   "Stop stream [ID]"
   ```
   Tool: `x_stream_stop`

### Phase 4: Account Export

Export your entire X account:

1. **Full account export:**
   ```
   "Export my entire X account data"
   ```
   Tool: `x_export_account`
   - `username`: Your handle (without @)
   - `formats`: ["json", "csv", "md", "html"] (default: all)
   - `only`: Limit to specific data types
   - `limit`: Max items per phase (default: 500)

2. **What gets exported:**
   - **Profile**: Bio, avatar, header, stats, creation date
   - **Tweets**: All your tweets with engagement data
   - **Followers**: Complete follower list with bios
   - **Following**: Everyone you follow
   - **Bookmarks**: All saved bookmarks
   - **Likes**: Your liked tweets

3. **Export formats:**
   - **JSON**: Machine-readable, full data
   - **CSV**: Spreadsheet-compatible
   - **Markdown**: Human-readable documentation
   - **HTML**: Self-contained archive viewer (open in browser!)

4. **Selective export:**
   ```
   "Export only my tweets and followers as JSON"
   ```
   - `only`: ["tweets", "followers"]
   - `formats`: ["json"]

5. **Resume on failure:**
   - If the export is interrupted (network issue, rate limit), it can resume from where it left off
   - Progress is saved per-phase

6. **Export size considerations:**
   - Large accounts may take a while (thousands of followers)
   - Use `limit` parameter to cap items
   - Export in phases: followers first, then tweets, etc.

### Phase 5: Account Migration

Move your X presence to Bluesky or Mastodon:

1. **Migrate to Bluesky:**
   ```
   "Migrate my X account to Bluesky"
   ```
   Tool: `x_migrate_account`
   - Requires a prior `x_export_account` run
   - Maps X profile to Bluesky equivalents
   - Can migrate: profile, followers (find on Bluesky), posts

2. **Migrate to Mastodon:**
   ```
   "Migrate my X data to Mastodon"
   ```
   - Similar to Bluesky migration
   - Maps to ActivityPub equivalents

3. **Dry run mode:**
   ```
   "Do a dry run migration to Bluesky — don't actually execute"
   ```
   - Preview what would be migrated
   - Shows mapping of X data → target platform
   - No actions taken until you confirm

4. **Migration workflow:**
   ```
   Step 1: "Export my full X account" (x_export_account)
   Step 2: "Show a dry-run migration to Bluesky" (x_migrate_account, dry: true)
   Step 3: Review the mapping
   Step 4: "Execute the migration" (x_migrate_account, dry: false)
   ```

### Phase 6: Data Backup Strategy

Set up regular automated backups:

#### Weekly Backup Workflow
```
"Create a workflow called 'Weekly Backup' that:
1. Exports my profile
2. Exports my latest tweets (limit: 200)
3. Snapshots my followers list
4. Snapshots my following list
5. Exports bookmarks
6. Saves all as JSON
7. Runs every Sunday at 2am"
```

#### Monthly Full Archive
```
"Create a monthly workflow that:
1. Full account export (all formats)
2. Compare follower list with last month's
3. Generate a growth report
4. Archive everything"
```

### Phase 7: Combined Power Workflows

#### Morning Briefing
```
"Create a 'Morning Briefing' workflow:
1. Get my notifications from last 12 hours
2. Analyze sentiment of mentions
3. Get my post analytics from yesterday
4. Check follower count change
5. Search trending topics in my niche
6. Output a markdown briefing
Run at 8am daily"
```

#### Content Calendar
```
"Create a 'Content Calendar' workflow:
1. Research trending topics (x_get_trends)
2. Analyze what performed well last week (x_get_analytics)
3. Search for inspiration (viral tweets in niche)
4. Generate 7 tweet ideas
5. Schedule them across the week
Run every Monday at 9am"
```

#### Engagement Autopilot
```
"Create an 'Engagement Autopilot' workflow:
1. Get my latest 5 tweets
2. For each: check post analytics
3. Auto-bookmark tweets with >100 likes
4. Identify top performing content format
5. Log everything to session
Run every 4 hours"
```

### Phase 8: Stream + Workflow Integration

Combine real-time streams with workflows:

```
"Set up a system where:
1. A mention stream watches for @mybrand mentions
2. Each new mention triggers sentiment analysis
3. Negative mentions (score < -0.3) trigger a Slack webhook
4. Positive mentions get auto-liked
5. Generate a daily reputation report"
```

This combines:
- `x_stream_start` (mention type)
- `x_analyze_sentiment` (per-mention)
- `x_workflow_create` (automation pipeline)
- `x_monitor_reputation` (ongoing tracking)
- `x_reputation_report` (daily output)

## My Workflow Goals
(Replace before pasting)
- Primary workflow I want to build: [describe]
- Do I need account export? Yes/No
- Migration target: Bluesky / Mastodon / Neither
- Streams I want: Tweet / Follower / Mention monitoring
- Schedule: Daily / Weekly / On-demand
- Webhook URL for alerts: [URL or "none"]

Start with Phase 1 — let's build my first workflow.
