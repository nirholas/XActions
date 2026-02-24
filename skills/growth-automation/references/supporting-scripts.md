# Supporting Automation Scripts

All require `src/automation/core.js` pasted first.

## Quota Supervisor — `src/automation/quotaSupervisor.js`

Rate limiting supervisor. Enforces hourly and daily quotas per action type (follow, like, unfollow, etc.). Includes stochastic variance and automatic sleep behavior when limits are approached. **Paste before other automation scripts** for safety.

## Session Logger — `src/automation/sessionLogger.js`

Tracks all automation actions with timestamps. Generates summary reports. Exports data to JSON or CSV. Useful for measuring automation effectiveness and auditing.

## Multi-Account Manager — `src/automation/multiAccount.js`

Manages multiple X accounts with rotation. Tracks account status: active, paused, limited, or suspended. Rotates between accounts to distribute actions.

## Customer Service Bot — `src/automation/customerService.js`

Monitors mentions and DMs for incoming messages. Auto-responds using configurable response templates. Supports business hours configuration (only responds during set hours).

## Protect Active Users — `src/automation/protectActiveUsers.js`

Scans your posts for users who actively engage (like, retweet, reply). Adds them to a protected list that `smartUnfollow.js` respects — prevents unfollowing your most engaged followers.

## Actions Library — `src/automation/actions.js`

Complete DOM actions library (~2100 lines). Provides namespaced functions:

- `XActions.tweet.post()`, `XActions.tweet.like()`, `XActions.tweet.retweet()`
- `XActions.user.follow()`, `XActions.user.unfollow()`
- `XActions.dm.send()`
- `XActions.bookmark.add()`

Used internally by other automation scripts. Can also be used standalone after pasting `core.js`.

## Link Scraper — `src/automation/linkScraper.js`

Extracts all links shared by a user from their timeline. Filters by domain. Auto-downloads results as a file.
