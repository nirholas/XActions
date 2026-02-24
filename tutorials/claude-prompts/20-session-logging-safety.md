# Tutorial: Session Logging, Quota Tracking & Safety with Claude

You are my X/Twitter automation safety expert. I want to use XActions' session logging and quota management tools to track all my automation activity, stay within rate limits, and generate analytics reports. Help me set up comprehensive tracking so I never get rate-limited or suspended.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit. It includes:
- `src/automation/sessionLogger.js` — Track all actions with reports
- `src/automation/quotaSupervisor.js` — Monitor and enforce rate limits
- `src/automation/protectActiveUsers.js` — Safety guardrails for unfollowing
- Built-in rate limiting in `core.js` — CONFIG.RATE_LIMITS

## What I Need You To Do

### Phase 1: Session Logger

Track every action your automation performs:

1. **How to activate:**
   - Navigate to x.com
   - Paste `core.js` in DevTools
   - Paste `sessionLogger.js`
   - It starts logging immediately

2. **What gets tracked per action:**
   ```javascript
   {
     timestamp: 1704067200000,
     action: 'follow',       // follow, unfollow, like, comment, retweet, dm
     target: '@username',     // Who/what was the target
     details: {},             // Additional context
     page: 'https://x.com/...',  // Page URL when action occurred
   }
   ```

3. **Session metadata:**
   - Unique session ID
   - Start time and end time
   - User agent
   - Starting page
   - Running stats (follows, unfollows, likes, comments, retweets, DMs, errors)

4. **Configuration:**
   ```javascript
   const CONFIG = {
     LOG_RETENTION_DAYS: 30,     // How long to keep logs
     SAVE_INTERVAL_SECONDS: 30,  // Auto-save frequency
     TRACK_ACTIONS: ['follow', 'unfollow', 'like', 'unlike', 'comment', 'retweet', 'dm'],
     EXPORT_FORMAT: 'json',      // 'json' or 'csv'
   };
   ```

5. **Runtime commands:**

   | Command | Description |
   |---------|-------------|
   | `stats()` | All-time statistics report |
   | `todayStats()` | Today's activity only |
   | `weekStats()` | This week's activity |
   | `dailyStats()` | Day-by-day breakdown (last 7 days) |
   | `sessionStats()` | Current session info |
   | `exportLogs()` | Download all logs as JSON |
   | `exportLogs('today')` | Export today's logs |
   | `exportLogs('week')` | Export this week's logs |

6. **Report output:**
   ```
   ╔═══════════════════════════════════════════════╗
   ║  📊 XActions Analytics - All Time              ║
   ╠═══════════════════════════════════════════════╣
   ║  Sessions: 42                                  ║
   ║  Total Duration: 18h 30m                       ║
   ╠───────────────────────────────────────────────╣
   ║  ACTIONS                                       ║
   ║    Follows:   234    │  Unfollows:  189        ║
   ║    Likes:     567    │  Comments:   45         ║
   ║    Retweets:  78     │  DMs:        12        ║
   ╠───────────────────────────────────────────────╣
   ║  Net Follow Change: +45                        ║
   ║  Errors: 3                                     ║
   ╚═══════════════════════════════════════════════╝
   ```

7. **Daily breakdown:**
   ```
   📅 Daily Activity (Last 7 Days):
   ──────────────────────────────────────────────
   Date           | Follows | Unfollows | Likes | Comments
   ──────────────────────────────────────────────
   1/15/2025      | 34      | 28        | 89    | 5
   1/14/2025      | 41      | 35        | 102   | 8
   1/13/2025      | 28      | 22        | 67    | 3
   ```

### Phase 2: Export & Analyze Logs

1. **Export as JSON:**
   ```javascript
   exportLogs('all')    // Downloads xactions-logs-all-{timestamp}.json
   exportLogs('today')  // Just today
   exportLogs('week')   // Last 7 days
   ```

   JSON structure:
   ```json
   {
     "exportDate": "2025-01-15T12:00:00.000Z",
     "period": "all",
     "sessions": [...],
     "summary": {
       "sessions": 42,
       "follows": 234,
       "unfollows": 189,
       "likes": 567,
       "netFollows": 45,
       "totalDuration": 66600000
     }
   }
   ```

2. **Export as CSV:**
   ```javascript
   // Call from console
   XActions.Logger.exportCSV()
   ```
   Downloads a CSV with columns: `timestamp, action, target, page`

3. **Analyze exported data:**
   After exporting, ask Claude:
   ```
   "Here's my XActions log export [paste JSON]. Analyze my activity:
   - Am I approaching any rate limits?
   - What's my follow-to-unfollow ratio?
   - What time of day am I most active?
   - Any patterns in errors?"
   ```

### Phase 3: Rate Limits & Safety

X/Twitter's rate limits (approximate — they change):

| Action | Safe Limit | Risky | XActions Default |
|--------|-----------|-------|-----------------|
| Follows/day | 100 | >200 | 100 |
| Unfollows/day | 100 | >200 | 100 |
| Likes/day | 200 | >500 | 200 |
| Tweets/day | 50 | >100 | 50 |
| DMs/day | 50 | >100 | 50 |
| Follows/hour | 15-20 | >30 | 50/hr |

**XActions built-in limits** (from `core.js`):
```javascript
CONFIG.RATE_LIMITS = {
  ACTIONS_PER_HOUR: 50,      // Any action type
  FOLLOWS_PER_DAY: 100,      // Follow actions
  LIKES_PER_DAY: 200,        // Like actions
}
```

**Best practices:**
1. **Start slow** — Begin with 50% of limits for new accounts
2. **Vary timing** — Use `randomDelay()` between actions (built into XActions)
3. **Take breaks** — Don't run automation 24/7
4. **Mix actions** — Don't just follow; like, comment, and engage naturally
5. **Monitor for warnings** — If you see CAPTCHAs or temporary locks, stop immediately

### Phase 4: Quota Supervisor

The `quotaSupervisor.js` script monitors your automation quotas:

1. **How to use:**
   - Paste `core.js`
   - Paste `quotaSupervisor.js`
   - It wraps around other automation scripts

2. **What it does:**
   - Tracks action counts per type per time period
   - Warns when approaching limits
   - Blocks actions when limits reached
   - Provides quota status reports

3. **Integration with other scripts:**
   When running autoLiker, growthSuite, etc., the quota supervisor intercepts action calls and enforces limits globally.

### Phase 5: Protect Active Users

The `protectActiveUsers.js` prevents unfollowing people who actively engage with you:

1. **How it works:**
   - Before unfollowing someone, checks their recent interactions
   - Protects users who:
     - Recently liked your tweets
     - Recently replied to you
     - Recently retweeted you
     - Are in your whitelist
   - Prevents accidentally unfollowing valuable connections

2. **Integration:**
   - Works alongside `smartUnfollow.js`
   - Adds safety layer to mass unfollow operations
   - Configurable protection criteria

### Phase 6: Safety Monitoring Workflow

Complete safety workflow combining all tools:

**Before running automation:**
```
1. Paste core.js
2. Paste sessionLogger.js
3. Paste quotaSupervisor.js (if available)
4. Now paste your automation script (e.g., autoLiker.js)
```

**During automation:**
```
- Run stats() periodically to check activity
- Watch for any error messages
- If you see rate limit warnings, run stopAutoLike() or equivalent
```

**After automation:**
```
1. Run stats() for final count
2. Run dailyStats() to see the full picture
3. Export logs: exportLogs('today')
4. End session: XActions.Logger.endSession()
```

**Regular audits (weekly):**
```
1. Export week's logs
2. Review in Claude:
   "Analyze this week's XActions activity. 
    Am I within safe limits?
    Any patterns that could trigger X's anti-spam?"
3. Adjust CONFIG values if needed
```

### Phase 7: MCP-Based Monitoring

If using XActions via MCP instead of browser scripts:

1. **Check analytics:**
   ```
   "Show my account analytics for the last 7 days"
   ```
   Tool: `x_get_analytics`

2. **Post analytics:**
   ```
   "Show analytics for my last 10 posts"
   ```
   Tool: `x_get_post_analytics`

3. **Review activity:**
   ```
   "How many people have I followed/unfollowed this week?"
   "Show my follower growth trend"
   ```

### Phase 8: Creating a Safety Checklist

Before any automation session:

- [ ] Session logger loaded
- [ ] Rate limits configured conservatively
- [ ] Whitelist populated (for unfollow operations)
- [ ] `requireApproval: true` for new templates
- [ ] Random delays configured (`randomDelay()` between actions)
- [ ] Business hours set (if applicable)
- [ ] Export logs from last session reviewed
- [ ] No existing CAPTCHAs or account warnings

**Signs to stop immediately:**
- CAPTCHA challenges appearing
- "Suspicious activity" warnings
- Account temporarily locked
- Actions failing silently
- Unusual error rates in session stats

## My Safety Configuration
(Replace before pasting)
- Account age: New / Established (>6 months) / Old (>1 year)
- Current follower count: [number]
- Daily automation goals: [follows/likes/unfollows per day]
- Hours per day running automation: [number]
- Risk tolerance: Conservative / Moderate / Aggressive

Help me configure safe rate limits for my account and set up the full monitoring stack.
