# XActions v3.5.0: Complete Feature Inventory

> Every surface this repository ships, with the file that implements each one.
> Package: `xactions` on npm | Author: nichxbt ([@nichxbt](https://x.com/nichxbt))
> Apache-2.0 | Node.js >= 20 (CI runs 20, 22 and 24) | Vitest suite runs offline

The counted tables below (MCP tools, CLI commands, skills) are transcribed from
the code that defines them: `src/mcp/server.js`, `src/cli/help-groups.js` and
`skills/index.json`. `npm run docs:audit` recomputes those counts from the same
sources on every run and fails on a number that has drifted, so a stale figure
here is a build failure rather than a surprise for a reader.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Browser Console Scripts (`src/`)](#2-browser-console-scripts)
3. [Automation Framework (`src/automation/`)](#3-automation-framework)
4. [Scrapers (`src/scrapers/`)](#4-scrapers)
5. [Puppeteer Manager Modules (`src/*.js` ES exports)](#5-puppeteer-manager-modules)
6. [MCP Server (`src/mcp/`)](#6-mcp-server)
7. [CLI (`src/cli/`)](#7-cli)
8. [DevTools Console Scripts (`scripts/twitter/`)](#8-devtools-console-scripts)
9. [Skills Reference (`skills/`)](#9-skills-reference)
10. [API Backend (`api/`)](#10-api-backend)
11. [Transport and sessions (`src/scrapers/twitter/http/`)](#11-transport-and-sessions)
12. [Delivery: streams, notifications, webhooks](#12-delivery-streams-notifications-webhooks)
13. [Portability: the X archive, export, migrate](#13-portability-the-x-archive-export-migrate)

---

## 1. Architecture Overview

XActions delivers features through **5 delivery modes**:

| Mode | How it Works | Free? |
|------|-------------|-------|
| **Browser Console Scripts** | IIFE: paste into x.com DevTools | Yes |
| **Automation Framework** | Browser scripts with dependency on `core.js` | Yes |
| **Puppeteer Managers** | ES module exports, run via Node.js | Yes |
| **MCP Server** | Model Context Protocol for AI agents (Claude, GPT), over stdio or Streamable HTTP | Local=Free, Remote=Paid (x402) |
| **CLI** | Commander.js terminal interface | Yes |

Most public reads no longer need Puppeteer at all: `src/scrapers/twitter/http/`
talks to X's internal GraphQL API with a guest token, discovers its query IDs
from x.com's own bundles, and signs every request with an
`x-client-transaction-id` header. Puppeteer is the fallback for the surfaces
that genuinely need a browser.

**Key Dependencies:** puppeteer + puppeteer-extra-plugin-stealth, @modelcontextprotocol/sdk, commander, chalk, ora, inquirer, express, prisma, bull, redis, socket.io, stripe

**Package Exports** (all 15, from `package.json`):

| Specifier | Resolves to |
|-----------|-------------|
| `xactions` | `src/index.js` |
| `xactions/scrapers` | `src/scrapers/index.js` |
| `xactions/scrapers/twitter` | `src/scrapers/twitter/index.js` |
| `xactions/scrapers/twitter/http` | `src/scrapers/twitter/http/index.js` |
| `xactions/scrapers/bluesky` | `src/scrapers/bluesky/index.js` |
| `xactions/scrapers/mastodon` | `src/scrapers/mastodon/index.js` |
| `xactions/scrapers/threads` | `src/scrapers/threads/index.js` |
| `xactions/streaming` | `src/streaming/index.js` |
| `xactions/analytics` | `src/analytics/index.js` |
| `xactions/plugins` | `src/plugins/index.js` |
| `xactions/mcp` | `src/mcp/server.js` |
| `xactions/cli` | `src/cli/index.js` |
| `xactions/client` | `src/client/index.js` |
| `xactions/spaces` | `src/spaces/agent.js` |
| `xactions/portability` | `src/portability/index.js` |

**Binaries:** `xactions` (CLI), `xactions-mcp` (MCP server), `xactions-agent`
(thought leader agent).

---

## 2. Browser Console Scripts

> **How to use:** Navigate to the listed x.com page → Open DevTools (F12) → Console tab → Paste entire script → Enter

### 2.1 Unfollow Management

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 1 | `src/unfollowEveryone.js` | Unfollow ALL accounts you follow | `x.com/USERNAME/following` | Retry limit: 3, auto-scroll |
| 2 | `src/unfollowback.js` | Unfollow users who DON'T follow you back | `x.com/USERNAME/following` | Filters via `userFollowIndicator` selector |
| 3 | `src/unfollowWDFBLog.js` | Unfollow non-followers WITH logging + downloadable .txt report | `x.com/USERNAME/following` | Creates downloadable .txt file |

### 2.2 Content Cleanup

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 4 | `src/unlikeAllPosts.js` | Unlike all your liked posts | `x.com/USERNAME/likes` | `maxUnlikes`, `minDelay`, `maxDelay` |
| 5 | `src/clearAllReposts.js` | Remove all your retweets | `x.com/USERNAME` | `maxUnretweets`, `minDelay`, `maxDelay` |
| 6 | `src/clearAllBookmarks.js` | Clear all bookmarks (tries bulk clear first, then one-by-one) | `x.com/i/bookmarks` | None |

### 2.3 Blocking & Muting

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 7 | `src/massBlock.js` | Block a list of usernames | Any x.com page | `usersToBlock[]`, `dryRun` |
| 8 | `src/massUnblock.js` | Unblock ALL blocked users | `x.com/settings/blocked/all` | Auto-scroll + confirm |
| 9 | `src/massUnmute.js` | Unmute ALL muted users | `x.com/settings/muted/all` | Auto-scroll |
| 10 | `src/muteByKeywords.js` | Mute users whose posts contain specific keywords | Any timeline/search | `keywords[]`, `caseSensitive`, `maxMutes` |
| 11 | `src/manageMutedWords.js` | Bulk-add muted words/phrases to X settings | `x.com/settings/muted_keywords` | `wordsToMute[]`, `duration` (forever/24h/7d/30d), `muteFrom`, `dryRun` |
| 12 | `src/blockBots.js` | Detect and block bot accounts using heuristics | `x.com/USERNAME/followers` | `dryRun`, `maxBlocks`; heuristics: default avatar, high-digit username, no bio, 0 followers; exports JSON report |
| 13 | `src/reportSpam.js` | Report accounts for spam/abuse | Any x.com page | `usersToReport[]`, `reason` (spam/abuse/fake), `dryRun`, `blockAfterReport` |

### 2.4 Follower Monitoring

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 14 | `src/detectUnfollowers.js` | Detect who unfollowed you (snapshot comparison via localStorage) | `x.com/USERNAME/followers` | Persists snapshots between sessions |
| 15 | `src/newFollowersAlert.js` | Track new followers over time, welcome message templates | `x.com/USERNAME/followers` | localStorage snapshots, shows gained/lost |
| 16 | `src/continuousMonitor.js` | Auto-refresh monitoring with browser notifications + sound | `x.com/USERNAME/followers` or `/following` | `CHECK_INTERVAL_MINUTES` (default 5), browser notification API |
| 17 | `src/monitorAccount.js` | Monitor ANY public account's follower/following changes | `x.com/TARGET/followers` or `/following` | localStorage snapshots, downloads change reports |
| 18 | `src/auditFollowers.js` | Audit follower quality: categorize as legitimate/suspicious/fake | `x.com/USERNAME/followers` | Heuristics: avatar, bio, username patterns; exports JSON audit report |
| 19 | `src/removeFollowers.js` | Remove specific followers via soft-block (block+unblock) | `x.com/USERNAME/followers` | `usersToRemove[]` or `removeAll`, `dryRun` |

### 2.5 Analytics

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 20 | `src/engagementAnalytics.js` | Analyze engagement metrics per post (likes, RT, replies, views) | `x.com/USERNAME` | Calculates averages, best posting times; exports JSON |
| 21 | `src/bestTimeToPost.js` | Find optimal posting times using hour×day engagement matrix | `x.com/USERNAME` | Recommends best day+hour combos; exports JSON |
| 22 | `src/hashtagAnalytics.js` | Analyze hashtag performance (posts, users, peak hours) | `x.com/search?q=%23HASHTAG` | `MIN_POSTS`, tracks unique users, top contributors; exports JSON |
| 23 | `src/competitorAnalysis.js` | Compare multiple accounts' metrics side by side | Any x.com page | `accounts[]`: navigates to each, scrapes followers/engagement; exports JSON |

### 2.6 Content Creation

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 24 | `src/postThread.js` | Post multi-tweet threads | `x.com` (home) | `thread[]` of strings, `dryRun`; validates 280 char limit |
| 25 | `src/schedulePosts.js` | Schedule future posts using X's native scheduler | `x.com` (home) | `posts[]` with `text` + `scheduledFor` datetime (Premium feature) |
| 26 | `src/createPoll.js` | Create poll tweets | `x.com` (home) | `question`, `options` (2–4, max 25 chars), `durationDays/Hours/Minutes`, `dryRun` |
| 27 | `src/autoRepost.js` | Auto-retweet by keyword/user filters | `x.com/home` or `/search` | `keywords[]`, `fromUsers[]`, `maxReposts`, `minLikes` threshold, `skipReplies` |

### 2.7 Direct Messages

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 28 | `src/sendDirectMessage.js` | Send personalized DMs with template variables | `x.com/messages` | `targetUsers[]`, `messageTemplate` with `{username}` placeholder, `skipIfAlreadyMessaged`, `dryRun`; localStorage history |

### 2.8 Communities

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 29 | `src/joinCommunities.js` | Join communities by keyword filter | `x.com/i/communities/suggested` | `keywords[]`, `maxJoins`, `dryRun` |
| 30 | `src/leaveAllCommunities.js` | Leave ALL joined communities (recursive navigation) | `x.com/USERNAME/communities` | sessionStorage tracking of left communities |

### 2.9 Lists & Profile

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 31 | `src/listManager.js` | Create/manage X Lists: create, add users, export members | Any x.com or list page | `createList(name, description, private)`, `addUsers`, `exportMembers` |
| 32 | `src/updateProfile.js` | Update bio, name, location, website | Profile page | `displayName` (50 chars), `bio` (160 chars), `location`, `website`, `autoSave` |

### 2.10 Data Export & Backup

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 33 | `src/backupAccount.js` | Export full account data as JSON (profile, tweets, likes, bookmarks, following, followers) | `x.com/USERNAME` | Navigates each section, scrolls+collects |
| 34 | `src/downloadAccountData.js` | Trigger X's official data archive download | `x.com/settings/download_your_data` | Clicks Request/Download button, monitors status |
| 35 | `src/qrCodeSharing.js` | Generate QR code for any profile | Any x.com or profile | Uses qrserver.com API, shows overlay, auto-downloads PNG |
| 36 | `src/bookmarkOrganizer.js` | Categorize bookmarks by keyword categories | `x.com/i/bookmarks` | Auto-categorizes (Tech, News, Crypto, etc.); exports JSON/CSV |
| 37 | `src/scrapeSpaces.js` | Find live/scheduled X Spaces from search/timeline | Search or timeline | Extracts spaceId, title, host, status; reports live/scheduled/ended |

---

## 3. Automation Framework

> **How to use:** Paste `core.js` into DevTools first (it defines selectors, utilities, rate limiting). Then paste any automation script.

### 3.1 Foundation

| # | File | What It Does | Key Exports |
|---|------|-------------|-------------|
| 1 | `src/automation/core.js` | Foundation: CONFIG, SELECTORS, utilities, storage, DOM helpers, rate limiting, action queue | `CONFIG`, `SELECTORS`, `sleep()`, `randomDelay()`, `log()`, `scrollTo()`, `waitForElement()`, `clickElement()`, `typeText()`, `extractUsername()`, `extractTweetInfo()`, rate limit system, `actionQueue` |
| 2 | `src/automation/actions.js` (2116 lines) | Complete X/Twitter actions library | Exposes `window.XActions` with: **tweet** (post, reply, quote, like, unlike, retweet, unretweet, bookmark, unbookmark, delete, pin, hide reply), **user** (follow, unfollow, block, unblock, mute, unmute), **dm** (send, getConversations), **search**, **navigation** |

### 3.2 Auto-Engagement

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 3 | `src/automation/autoLiker.js` | Timeline auto-liker with keyword/user filtering | Home feed or profile | `LIKE_ALL`, `KEYWORDS[]`, `FROM_USERS[]`, `MAX_LIKES`, `ALSO_RETWEET`, `SKIP_REPLIES`, `SKIP_ADS`, `MIN_LIKES_ON_POST`; persists liked IDs in localStorage |
| 4 | `src/automation/autoCommenter.js` (288 lines) | Auto-comment on new posts with random message selection | `x.com/USERNAME` | `COMMENTS[]`, `CHECK_INTERVAL_SECONDS`, `ONLY_ORIGINAL_TWEETS`, `MIN/MAX_POST_AGE` |

### 3.3 Follow Automation

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 5 | `src/automation/followEngagers.js` (360 lines) | Follow users who engage with specific posts | Tweet engagement page | `MODE` (likers/retweeters/quoters/all), `TARGET_POSTS[]`, `FILTERS` (min/max followers, skip protected/verified), `INTERACT_AFTER_FOLLOW` |
| 6 | `src/automation/followTargetUsers.js` (374 lines) | Follow followers/following of target accounts | `x.com/TARGET/followers` or `/following` | `TARGET_ACCOUNTS[]`, `LIST_TYPE`, `FILTERS` (followers range, ratio, bio keywords), `INTERACT_AFTER_FOLLOW` with likes |
| 7 | `src/automation/keywordFollow.js` (255 lines) | Search keywords and follow matching users | Search results | `KEYWORDS[]`, filters (`MIN/MAX_FOLLOWERS`, `MUST_HAVE_BIO`, `BIO_KEYWORDS`); localStorage tracking for smart unfollow |
| 8 | `src/automation/smartUnfollow.js` (269 lines) | Time-based unfollow for non-followers after grace period | `x.com/USERNAME/following` | `DAYS_TO_WAIT` (default 3), `WHITELIST[]`, `DRY_RUN`, `ONLY_TRACKED`; reads keywordFollow tracking data |

### 3.4 Growth & Business

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 9 | `src/automation/growthSuite.js` (368 lines) | All-in-one growth: keyword following + auto-liking + smart unfollowing | Various | `STRATEGY` config with targeting (keywords, target accounts), actions toggle, limits, timing, filters |
| 9b | `src/automation/algorithmTrainer.js` (570+ lines) | 24/7 algorithm training engine: trains X algorithm for your niches via autonomous browsing, searching, engaging | Any x.com | `NICHES.topics[]` (search terms + comments per niche), `PERSONA.INTENSITY` (chill/normal/active), cycle/daily limits, 8 phases (search top/latest, people follow, home feed, influencer visits, own profile, explore, idle dwell), `stopTrainer()` / `trainerStatus()` / `trainerReset()` |
| 10 | `src/automation/customerService.js` (511 lines) | Customer service bot: monitors mentions/DMs/replies, auto-responds | Notifications/DMs | `BRAND_KEYWORDS[]`, response template categories (greeting, issue, feedback, faq, escalation), `BUSINESS_HOURS` with timezone |
| 11 | `src/automation/multiAccount.js` (456 lines) | Multi-account manager with rotation | Any x.com | `addAccount()`, `removeAccount()`, `switchAccount()`, `getNextAccount()` rotation; localStorage storage, per-account stats |

### 3.5 Safety & Utilities

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 12 | `src/automation/protectActiveUsers.js` (375 lines) | Build protected list of engaged users to prevent unfollowing them | `x.com/USERNAME` | `POSTS_TO_SCAN`, `ENGAGEMENT_TYPES` (likers, repliers, retweeters, quoters), `LOOKBACK_DAYS`, `MIN_ENGAGEMENTS`; saves to localStorage |
| 13 | `src/automation/quotaSupervisor.js` (361 lines) | Rate limiting system for all automations | Any | `QUOTAS` config: hourly/daily limits for likes, follows, unfollows, comments, DMs; sleep behavior; stochastic variance (15%) |
| 14 | `src/automation/sessionLogger.js` (442 lines) | Action logging and analytics: tracks all automation actions | Any | Per-session stats, exportable reports (JSON/CSV), `LOG_RETENTION_DAYS` |
| 15 | `src/automation/linkScraper.js` (291 lines) | Extract all links shared by a user | `x.com/USERNAME` | `INCLUDE_TWITTER_LINKS`, `INCLUDE_MEDIA`, `DOMAINS_ONLY[]`, `EXCLUDE_DOMAINS[]` |

---

## 4. Scrapers

> **How to use (Puppeteer library):** `import { createBrowser, scrapeProfile } from 'xactions/scrapers'`
> **How to use (browser scripts):** Paste into DevTools on the listed page

### 4.1 Puppeteer Scraper Library

| # | File | Exported Functions | Parameters |
|---|------|--------------------|------------|
| 1 | `src/scrapers/index.js` (919 lines) | `createBrowser()`, `createPage(browser)`, `loginWithCookie(page, cookie)`, `scrapeProfile(page, username)`, `scrapeFollowers(page, username, options)`, `scrapeFollowing(page, username, options)`, `scrapeTweets(page, username, options)`, `scrapeThread(page, tweetUrl)`, `scrapeMedia(page, username, options)`, `scrapeHashtag(page, hashtag, options)`, `searchTweets(page, query, options)`, `exportToCSV(data, filename)`, `exportToJSON(data, filename)` | Common options: `limit`, `onProgress`, `includeReplies`, `filter` (latest/top/people/photos/videos) |

### 4.2 Browser Console Scrapers

| # | File | What It Does | Page Required | Key Config |
|---|------|-------------|---------------|------------|
| 2 | `src/scrapers/bookmarkExporter.js` (194 lines) | Export bookmarks to JSON/CSV | `x.com/i/bookmarks` | `MAX_BOOKMARKS`, `FORMAT` (json/csv/both); extracts text, engagement, images, links |
| 3 | `src/scrapers/threadUnroller.js` (171 lines) | Save a thread as text, markdown, or JSON | Any tweet in a thread | `FORMAT` (text/markdown/json), `INCLUDE_MEDIA`, `INCLUDE_STATS`; filters to thread author |
| 4 | `src/scrapers/videoDownloader.js` (361 lines) | Download videos from tweets | Tweet with video | Methods: React state/props extraction, page data scanning for `video.twimg.com` URLs; shows quality options, auto-downloads highest |
| 5 | `src/scrapers/viralTweets.js` (175 lines) | Find top-performing tweets by engagement thresholds | Search or profile | `MIN_LIKES` (100), `MIN_RETWEETS` (10), `SORT_BY` (likes/retweets/replies/views); exports results |

---

## 5. Puppeteer Manager Modules

> **How to use:** `import { functionName } from 'xactions'`: these are ES module exports from `src/index.js`. All take a Puppeteer `page` as first argument.

### 5.1 Profile & Settings

| # | Module | Exported Functions |
|---|--------|--------------------|
| 1 | `src/profileManager.js` (269 lines) | `getProfile(page, username)`, `filterPosts(page, username, sort, options)`, `updateProfile(page, updates)`, `uploadAvatar(page, imagePath)`, `uploadHeader(page, imagePath)` |
| 2 | `src/settingsManager.js` (261 lines) | `getSettings(page)`, `toggleProtectedAccount(page, protect)`, `getBlockedAccounts(page, options)`, `getMutedAccounts(page, options)`, `requestDataDownload(page)`, `setContentPreferences(page, preferences)` |
| 3 | `src/premiumManager.js` (231 lines) | `checkPremiumStatus(page, username)`, `getTierFeatures(tier)`, `compareTiers(tier1, tier2)`, `checkRevenueEligibility(page, username)` |

### 5.2 Content Creation & Management

| # | Module | Exported Functions |
|---|--------|--------------------|
| 4 | `src/postComposer.js` (375 lines) | `postTweet(page, text, options)`, `postThread(page, tweets)`, `createPoll(page, question, choices, options)`, `schedulePost(page, text, scheduledTime)`, `quotePost(page, postUrl, commentary)`, `repost(page, postUrl)`, `deletePost(page, postUrl)` |
| 5 | `src/articlePublisher.js` (175 lines) | `publishArticle(page, article)`, `saveDraft(page, article)`, `getArticles(page, username)`, `getArticleAnalytics(page, articleUrl)` |
| 6 | `src/pollCreator.js` (164 lines) | `createPoll(page, question, choices, options)`, `getPollResults(page, tweetUrl)` |

### 5.3 Engagement & Interaction

| # | Module | Exported Functions |
|---|--------|--------------------|
| 7 | `src/engagementManager.js` (272 lines) | `likeTweet(page, tweetUrl)`, `unlikeTweet(page, tweetUrl)`, `replyToTweet(page, tweetUrl, replyText, options)`, `bookmarkTweet(page, tweetUrl)`, `unbookmarkTweet(page, tweetUrl)`, `hideReply(page, replyUrl)`, `autoLikeByKeyword(page, options)`, `getEngagementAnalytics(page, tweetUrl)` |
| 8 | `src/dmManager.js` (200 lines) | `sendDM(page, username, message)`, `getConversations(page, options)`, `exportConversation(page, conversationUrl, options)`, `getMessageRequests(page)`, `updateDMSettings(page, settings)` |
| 9 | `src/notificationManager.js` (171 lines) | `getNotifications(page, options)`, `muteUser(page, username)`, `unmuteUser(page, username)`, `muteWord(page, word, options)`, `getNotificationSettings(page)` |

### 5.4 Discovery & Search

| # | Module | Exported Functions |
|---|--------|--------------------|
| 10 | `src/discoveryExplore.js` (213 lines) | `searchTweets(page, query, options)`, `getTrends(page, options)`, `getExploreFeed(page, options)`, `followTopic(page, topicName)`, `advancedSearch(page, filters)` |
| 11 | `src/bookmarkManager.js` (146 lines) | `getBookmarks(page, options)`, `createFolder(page, folderName)`, `clearAllBookmarks(page)` |

### 5.5 Spaces & Communities

| # | Module | Exported Functions |
|---|--------|--------------------|
| 12 | `src/spacesManager.js` (175 lines) | `getLiveSpaces(page, options)`, `getScheduledSpaces(page, username)`, `scrapeSpace(page, spaceUrl)`, `createEvent(page, event)` |

### 5.6 Analytics & Business

| # | Module | Exported Functions |
|---|--------|--------------------|
| 13 | `src/creatorStudio.js` (182 lines) | `getAccountAnalytics(page, options)`, `getPostAnalytics(page, postUrl)`, `getRevenue(page)`, `getSubscribers(page, options)`, `getCreatorDashboard(page)` |
| 14 | `src/businessTools.js` (194 lines) | `monitorBrandMentions(page, brandName, options)`, `getAudienceInsights(page, username, options)`, `analyzeCompetitors(page, competitors)` |

### 5.7 AI Integration

| # | Module | Exported Functions |
|---|--------|--------------------|
| 15 | `src/grokIntegration.js` (152 lines) | `queryGrok(page, query, options)`, `generateImage(page, prompt)`, `summarize(page, topic)`, `analyzePost(page, postText)` |

---

## 6. MCP Server

> **How to use:** `npx xactions-mcp` or configure in Claude Desktop / Cursor settings
> **Config:** `XACTIONS_MODE` (local|remote), `XACTIONS_SESSION_COOKIE`, `X402_PRIVATE_KEY`, `X402_NETWORK`

### 6.1 Server Architecture

| File | Role | Lines |
|------|------|-------|
| `src/mcp/server.js` | The server: tool definitions, routing, stdio and Streamable HTTP transports | 4745 |
| `src/mcp/local-tools.js` | Local implementations behind the tools | 1703 |
| `src/mcp/tool-groups.js` | Group membership, allowlist and denylist parsing, write classification | 420 |
| `src/mcp/x402-client.js` | x402 payment client for the remote API (USDC on Solana or Base) | 803 |
| `src/mcp/x402-mcp.js` | x402 tool surface exposed in remote mode | 438 |
| `src/mcp/action-caps.js` | Per-account daily action caps, persisted under `XACTIONS_HOME` | 360 |
| `src/mcp/drafts.js` | The draft-approval gate: every write held for a human | 205 |

**Transports.** stdio by default. `--http` (or `MCP_TRANSPORT=http`) serves
Streamable HTTP on `/mcp` for remote and hosted clients; set
`XACTIONS_MCP_TOKEN` to require `Authorization: Bearer <token>` on it.

**Tool groups.** `XACTIONS_MCP_TOOLS` (allowlist) and `XACTIONS_MCP_EXCLUDE`
(denylist), or `--tools` and `--exclude` on the command line, filter the
advertised list by group. A filtered tool is neither advertised nor callable,
so the schema cost drops with it. Groups: `read`, `write`, `dm`, `lists`,
`spaces`, `analytics`, `ai`, `grok`, `automation`, `monitoring`, `workflows`,
`persona`, `graph`, `data`, `x402`, `drafts`, `auth`.

**Approval gate.** `XACTIONS_MCP_REQUIRE_APPROVAL=1` turns every write tool
into a draft. Release or bin drafts with the `x_list_drafts`,
`x_approve_draft`, `x_discard_draft` and `x_draft_status` tools, or from the
shell with `xactions drafts list|show|approve|discard`.

**Daily caps.** Independent of the gate and always on. Every write is charged
against a rolling 24 hour per-account budget written to `action-ledger.json`
under `XACTIONS_HOME` (default `~/.xactions`), so it survives a restart, and a
call that would exceed it is refused before anything reaches X.

**Bundle.** `node scripts/build-mcpb.mjs` produces the `.mcpb` a user drags
onto Claude Desktop > Settings > Extensions; it prompts for the session cookie
and tool groups at install time.

### 6.2 Complete MCP Tool List (154 tools)

Grouped by tool group, alphabetical within each group. "Write" marks the tools
the approval gate holds and the daily caps charge.

| # | Tool | Group | Write | Required args | What it does |
|---|------|-------|-------|---------------|--------------|
| 1 | `x_approve_draft` | drafts |  | `id` | Approve a pending draft and execute the stored tool call exactly as it was submitted. Returns the tool result and marks the draft executed; a draft that already ran is refused so nothing is posted twice. |
| 2 | `x_discard_draft` | drafts |  | `id` | Delete a draft without executing it. Use this to reject a held write, or to clean up drafts that have already been executed or failed. |
| 3 | `x_draft_status` | drafts |  | `id` | Show one draft in full: the tool, the arguments it will run with, its current state, and the result or error if it has already been approved. |
| 4 | `x_list_drafts` | drafts |  | none | List tool calls held as drafts by the approval gate (XACTIONS_MCP_REQUIRE_APPROVAL). Each draft records the tool, its arguments, when it was created, and whether it is still pending, has been executed, or failed. Newest first. |
| 5 | `x_login` | auth |  | `cookie` | Login to X/Twitter using a session cookie (auth_token). Required before some operations. |
| 6 | `x_export_dms` | dm |  | none | Export the authenticated account's direct messages as structured JSON, including sender, text, and timestamps. |
| 7 | `x_get_conversations` | dm |  | none | List the authenticated account's direct-message conversations with participants and the latest message preview. |
| 8 | `x_send_dm` | dm | yes | `username`, `message` | Send a direct message to an X/Twitter user. |
| 9 | `x_get_list_members` | lists |  | `listUrl` | Get members of a specific X/Twitter list. |
| 10 | `x_get_lists` | lists |  | none | List the X Lists the authenticated account owns or follows, with names, member counts, and URLs. |
| 11 | `x_get_spaces` | spaces |  | none | Discover X Spaces (live audio rooms) by state and topic: live now, scheduled, or recently ended. |
| 12 | `x_scrape_space` | spaces |  | `url` | Scrape metadata and speakers from a specific Space. |
| 13 | `x_space_join` | spaces | yes | `url` | Join an X Space with an AI voice agent that listens, transcribes, and speaks autonomously. Requires xspace-agent installed and AI API key configured. |
| 14 | `x_space_leave` | spaces |  | none | Leave the currently active X Space and get a summary of the session. |
| 15 | `x_space_status` | spaces |  | none | Get the status of the currently active X Space agent, including duration, transcription count, and recent events. |
| 16 | `x_space_transcript` | spaces |  | none | Get recent transcriptions from the active X Space session. |
| 17 | `x_grok_analyze_image` | grok |  | none | Analyze an image using Grok's multimodal vision capabilities. Extract text, describe content, identify objects, or answer questions about images in tweets. |
| 18 | `x_grok_query` | grok |  | `query` | Query Grok AI on X/Twitter. Requires Premium access. |
| 19 | `x_grok_summarize` | grok |  | `topic` | Use Grok to summarize a topic from X/Twitter posts. |
| 20 | `x_persona_create` | persona |  | `name`, `preset` | Create a new persona for algorithm building and automated account growth. A persona defines niche, topics, engagement strategy, activity patterns, and LLM voice settings. Use presets for quick setup. |
| 21 | `x_persona_delete` | persona |  | `personaId` | Delete a saved persona and all its stored state. |
| 22 | `x_persona_edit` | persona |  | `personaId` | Edit an existing persona configuration (topics, search terms, target accounts, strategy, activity pattern). |
| 23 | `x_persona_list` | persona |  | none | List all saved personas with their stats (sessions, follows, likes, comments, last active). |
| 24 | `x_persona_presets` | persona |  | none | List all available niche presets, engagement strategies, and activity patterns for persona creation. |
| 25 | `x_persona_run` | persona | yes | `personaId` | Start the 24/7 Algorithm Builder for a persona. Launches headless Puppeteer with LLM-powered engagement (search, like, comment, follow, post). Requires auth token and OPENROUTER_API_KEY for AI comments. |
| 26 | `x_persona_status` | persona |  | `personaId` | Get detailed status and lifetime stats for a specific persona. |
| 27 | `x_graph_analyze` | graph |  | `graphId` | Analyze a built social graph. Returns: mutual connections, bridge accounts (betweenness centrality), clusters (label propagation), influence ranking (PageRank), ghost followers, orbit analysis (inner circle vs periphery). |
| 28 | `x_graph_build` | graph |  | `username` | Build a social network graph by crawling an account's followers and following. Maps relationships, identifies clusters, bridge accounts, and influence scores. Returns a graph ID for further analysis. |
| 29 | `x_graph_list` | graph |  | none | List all saved social graphs with their seed account, node/edge counts, and status. |
| 30 | `x_graph_recommendations` | graph |  | `graphId` | Get actionable recommendations from a graph: who to follow, who to engage with, competitors to watch, safe accounts to unfollow. |
| 31 | `x_bookmark` | write | yes | `url` | Save a tweet to the authenticated account's private bookmarks by its URL so it can be found later. |
| 32 | `x_clear_bookmarks` | write | yes | none | Clear all bookmarks. This cannot be undone. |
| 33 | `x_create_poll` | write | yes | `question`, `options` | Create a poll tweet with a question, two to four options, and a duration in minutes (default 24 hours). |
| 34 | `x_delete_tweet` | write | yes | `url` | Permanently delete one of the authenticated account's tweets by its URL. This cannot be undone. |
| 35 | `x_follow` | write | yes | `username` | Follow an X/Twitter account by username. Requires an authenticated session (XACTIONS_SESSION_COOKIE). |
| 36 | `x_like` | write | yes | `url` | Like a tweet by its URL from the authenticated account. Idempotent: liking an already-liked tweet is a no-op. |
| 37 | `x_mute_user` | write | yes | `username` | Mute an account by username so its posts stop appearing in the authenticated user's timeline and notifications. |
| 38 | `x_post_thread` | write | yes | `tweets` | Publish a multi-tweet thread from an ordered list of texts. Each entry becomes a reply to the previous one. |
| 39 | `x_post_tweet` | write | yes | `text` | Publish a new tweet from the authenticated account. Returns the posted tweet URL when X reports success. |
| 40 | `x_publish_article` | write | yes | `title`, `body` | Publish a long-form article (requires Premium+). |
| 41 | `x_quote_tweet` | write | yes | `tweetUrl`, `text` | Quote tweet: retweet with your own comment/text added. |
| 42 | `x_reply` | write | yes | `url`, `text` | Reply to a tweet by its URL with the given text. The reply is posted from the authenticated account. |
| 43 | `x_retweet` | write | yes | `url` | Retweet (repost) a tweet by its URL from the authenticated account, without adding a quote comment. |
| 44 | `x_schedule_post` | write | yes | `text`, `scheduledAt` | Schedule a tweet for future posting (requires Premium). |
| 45 | `x_toggle_protected` | write | yes | `enabled` | Toggle protected (private) account mode. |
| 46 | `x_unfollow` | write | yes | `username` | Unfollow an X/Twitter account by username. Requires an authenticated session (XACTIONS_SESSION_COOKIE). |
| 47 | `x_unfollow_non_followers` | write | yes | `username` | Bulk unfollow accounts that don't follow you back. |
| 48 | `x_unmute_user` | write | yes | `username` | Unmute a previously muted account by username, restoring its posts to the authenticated user's timeline. |
| 49 | `x_update_profile` | write | yes | none | Update your X/Twitter profile fields (name, bio, location, website). |
| 50 | `x_auto_comment` | automation | yes | `query`, `comment` | Auto-comment on tweets matching a search query. Can use AI-generated or template comments. |
| 51 | `x_auto_follow` | automation | yes | `source`, `query` | Auto-follow users matching criteria. Specify a source (hashtag, keyword, or target account followers) and optional filters. |
| 52 | `x_auto_like` | automation | yes | none | Auto-like tweets matching keywords in your feed. |
| 53 | `x_auto_retweet` | automation | yes | `query` | Auto-retweet tweets matching a search query or from specific accounts. |
| 54 | `x_bulk_execute` | automation | yes | `usernames`, `action` | Execute bulk follow/unfollow/block/mute from a list of usernames. |
| 55 | `x_engage` | automation | yes | none | Sweep a feed and engage every post on it: like, repost, and reply across a profile, a search, or a list. Replies come from your templates or from an LLM given a plain-language brief. Defaults to a dry run; pass dryRun: false to act. Progress is saved per feed, so a second call skips what the first already did. |
| 56 | `x_follow_engagers` | automation | yes | `username` | Follow people who engage with a specific account (likers, retweeters, repliers). Great for finding active users in a niche. |
| 57 | `x_smart_unfollow` | automation | yes | `criteria` | Smart unfollow based on criteria: inactive accounts, spam/bot accounts, accounts that never engage with you, or accounts outside your niche. |
| 58 | `x_unfollow_all` | automation | yes | `confirm` | Mass unfollow everyone you follow. Nuclear option: unfollows ALL accounts. Use with caution. |
| 59 | `x_brand_monitor` | monitoring |  | `brand` | Monitor brand mentions with sentiment analysis. |
| 60 | `x_follower_alerts` | monitoring |  | `username` | Set up alerts for follower changes. Get notified when notable accounts follow/unfollow you, when you hit milestones, or when there are unusual changes. |
| 61 | `x_monitor_account` | monitoring |  | `username` | Start monitoring an account for changes: new tweets, bio updates, follower surges, and profile changes. Get real-time alerts. |
| 62 | `x_monitor_keyword` | monitoring |  | `keywords` | Monitor X for tweets containing specific keywords. Get alerts when new tweets match. Useful for brand monitoring, trend tracking, or competitor alerts. |
| 63 | `x_monitor_reputation` | monitoring |  | `action` | Start monitoring sentiment for a username or keyword over time. Scrapes mentions periodically, analyzes sentiment, computes rolling averages, detects anomalies, and can trigger webhook alerts. |
| 64 | `x_notify_send` | monitoring | yes | `message` | Send a notification to all configured channels (Slack, Discord, Telegram, Email). |
| 65 | `x_notify_test` | monitoring |  | `channel` | Send a test notification to a specific channel. |
| 66 | `x_stream_history` | monitoring |  | `streamId` | Get recent events from a stream. Optionally filter by event type. |
| 67 | `x_stream_list` | monitoring |  | none | List all active real-time streams with status, poll/event counts, errors, and browser pool info. |
| 68 | `x_stream_pause` | monitoring |  | `streamId` | Pause an active stream (stops polling but retains state). Resume later with x_stream_resume. |
| 69 | `x_stream_resume` | monitoring |  | `streamId` | Resume a paused stream. Clears backoff and starts polling again immediately. |
| 70 | `x_stream_start` | monitoring |  | `type`, `username` | Start a real-time stream that polls an X/Twitter account and pushes new events. Types: tweet (new tweets), follower (follow/unfollow events), mention (new mentions). Events are emitted via Socket.IO. Rejects duplicates (same type + username). |
| 71 | `x_stream_status` | monitoring |  | `streamId` | Get detailed status for a single stream including poll count, event count, errors, and backoff info. |
| 72 | `x_stream_stop` | monitoring |  | `streamId` | Stop an active real-time stream by its ID. Removes all state and history. |
| 73 | `x_track_engagement` | monitoring |  | none | Track engagement metrics for a tweet or account over time. Returns time-series data showing likes, retweets, replies, and impressions growth. |
| 74 | `x_rss_add` | workflows |  | `name`, `url` | Subscribe to an RSS or Atom feed URL so new entries can be turned into tweet drafts by x_rss_check. |
| 75 | `x_rss_check` | workflows |  | none | Poll the subscribed RSS feeds for entries published since the last check and stage them as tweet drafts. |
| 76 | `x_rss_drafts` | workflows |  | none | List the tweet drafts generated from RSS feed entries, ready for review, editing, or posting. |
| 77 | `x_schedule_add` | workflows | yes | `name`, `cron` | Queue a tweet to be posted later at the given ISO timestamp by the local scheduler. Returns the scheduled job id. |
| 78 | `x_schedule_list` | workflows |  | none | List every tweet queued in the local scheduler with its id, text, scheduled time, and status. |
| 79 | `x_schedule_remove` | workflows |  | `name` | Cancel a queued tweet in the local scheduler by its job id so it is never posted. |
| 80 | `x_workflow_actions` | workflows |  | none | List all available actions that can be used in workflow steps (scrapers, transforms, AI, utilities). |
| 81 | `x_workflow_create` | workflows |  | `name`, `steps` | Create a new automation workflow. Workflows chain multiple actions (scrape, filter, summarize, etc.) into pipelines with triggers and conditions. |
| 82 | `x_workflow_list` | workflows |  | none | List all saved workflows with their trigger type, step count, and enabled status. |
| 83 | `x_workflow_run` | workflows | yes | `workflow` | Run a workflow by ID or name. Returns execution results with step-by-step logs. |
| 84 | `x_analyze_voice` | ai |  | `username` | Analyze a user's writing style/voice from their tweets. Returns tone, vocabulary patterns, emoji usage, avg length, and a voice profile. Requires OPENROUTER_API_KEY for full analysis. |
| 85 | `x_generate_tweet` | ai |  | `username`, `topic` | Generate a tweet in the style of a user. First analyzes their voice, then generates content matching their tone. Requires OPENROUTER_API_KEY. |
| 86 | `x_generate_variations` | ai |  | `text` | Generate alternative versions of a tweet. |
| 87 | `x_optimize_tweet` | ai |  | `text` | AI-optimize a tweet for maximum engagement. |
| 88 | `x_predict_performance` | ai |  | `text` | Predict how well a tweet will perform (score, strengths, weaknesses). |
| 89 | `x_rewrite_tweet` | ai |  | `username`, `text` | Rewrite/improve an existing tweet to be more engaging, shorter, add a hook, etc. Uses a voice profile for style matching. Requires OPENROUTER_API_KEY. |
| 90 | `x_suggest_hashtags` | ai |  | `text` | Suggest relevant hashtags for a draft tweet based on its topic, current trends, and the account's niche. |
| 91 | `x_summarize_thread` | ai |  | `url` | AI-powered summarization of a Twitter/X thread. Unrolls the thread and generates a concise summary. Requires OPENROUTER_API_KEY. |
| 92 | `x_convert_format` | data |  | `data`, `from`, `to` | Convert data between Apify/Phantombuster/CSV formats. |
| 93 | `x_crm_search` | data |  | `query` | Search CRM contacts by username or display name. |
| 94 | `x_crm_segment` | data |  | `name` | Group the local CRM into segments by tag, follower count, or engagement level and return each segment's contacts. |
| 95 | `x_crm_sync` | data |  | `username` | Sync followers of a username into the CRM database. |
| 96 | `x_crm_tag` | data |  | `username`, `tag` | Attach one or more tags to a contact in the local CRM so it can be found later with x_crm_search or grouped by x_crm_segment. |
| 97 | `x_dataset_get` | data |  | `name` | Get items from a dataset with pagination. |
| 98 | `x_dataset_list` | data |  | none | List the locally saved datasets (exports, scrapes, snapshots) with their names, row counts, and timestamps. |
| 99 | `x_diff_exports` | data |  | `dirA`, `dirB` | Compare two account exports to find new/lost followers, deleted tweets, and engagement changes. Generates a diff report in JSON and Markdown. |
| 100 | `x_export_account` | data |  | `username` | Export a Twitter account: profile, tweets, followers, following, bookmarks. Outputs JSON, CSV, Markdown, and a self-contained HTML archive viewer. Supports resume-on-failure. |
| 101 | `x_import_data` | data |  | `data` | Import data from Apify, Phantombuster, or CSV format. |
| 102 | `x_migrate_account` | data | yes | `username`, `platform` | Migrate exported Twitter data to Bluesky or Mastodon. Supports dry-run mode to preview actions without executing. Requires a prior export. |
| 103 | `x_team_create` | data |  | `name`, `owner` | Create a named team workspace for shared accounts, roles, and audit history across several operators. |
| 104 | `x_team_members` | data |  | `teamId` | List the members of a team workspace with their roles and when they were added. |
| 105 | `x_account_report` | analytics |  | `username` | Full account report for one or more public X accounts, computed from public data with no login: engagement rate, median interactions per post, posting cadence, content mix (original vs reply vs repost, media and link share), best hour and weekday by median engagement, top posts, top hashtags, and plain-language observations. Pass an array of usernames to get a side-by-side comparison as well. Use this instead of fetching a profile and a timeline separately when the question is about how an account is performing. |
| 106 | `x_analyze_sentiment` | analytics |  | none | Analyze the sentiment of text. Returns a score (-1 to 1), label (positive/neutral/negative), confidence, and key sentiment-bearing words. Uses a built-in rule-based analyzer by default (zero dependencies), or optionally an LLM via OpenRouter for nuanced analysis. |
| 107 | `x_audience_insights` | analytics |  | `username` | Get detailed audience demographics and interests for an account. Analyzes followers to determine top locations, active hours, interests, and audience quality. |
| 108 | `x_audience_overlap` | analytics |  | `username1`, `username2` | Analyze follower overlap between two Twitter accounts. |
| 109 | `x_best_time_to_post` | analytics |  | `username` | Analyze a user's tweet history to determine the best times and days to post for maximum engagement. |
| 110 | `x_check_premium` | analytics |  | none | Check premium subscription status and available features. |
| 111 | `x_compare_accounts` | analytics |  | `usernames`, `metric` | Compare multiple accounts on a metric over time. |
| 112 | `x_competitor_analysis` | analytics |  | `handles` | Compare metrics across competitor accounts. |
| 113 | `x_creator_analytics` | analytics |  | none | Get creator dashboard analytics including revenue and subscribers. |
| 114 | `x_crypto_analyze` | analytics |  | `query` | Analyze crypto/token sentiment on X. Scrapes tweets about a coin/token and returns sentiment score, volume, key influencer opinions, and price correlation. |
| 115 | `x_detect_bots` | analytics |  | `username` | Detect bot/spam accounts using heuristic and AI analysis. Checks posting patterns, bio, followers ratio, account age, and tweet content. |
| 116 | `x_detect_unfollowers` | analytics |  | `username` | Get current followers for comparison. Run periodically to detect unfollowers. |
| 117 | `x_engagement_report` | analytics |  | `username` | Generate a comprehensive engagement analytics report. Includes engagement rate, best performing content, optimal posting times, and growth trends. |
| 118 | `x_evergreen_analyze` | analytics |  | `username` | Find top-performing evergreen tweets that can be recycled. |
| 119 | `x_find_influencers` | analytics |  | `niche` | Find influencers in a specific niche or topic. Returns accounts ranked by engagement rate, niche relevance, and audience quality. |
| 120 | `x_get_analytics` | analytics |  | none | Fetch the authenticated account's analytics dashboard: impressions, engagements, profile visits, and follower change for the period. |
| 121 | `x_get_post_analytics` | analytics |  | `url` | Get detailed analytics for a specific post. |
| 122 | `x_growth_rate` | analytics |  | `username` | Calculate follower growth rate for an account over N days. |
| 123 | `x_history_get` | analytics |  | `username` | Get account history / time-series snapshots for a username. Returns followers, following, tweet count over time. |
| 124 | `x_history_snapshot` | analytics |  | `username` | Take a snapshot of account metrics right now and save to history. |
| 125 | `x_reputation_report` | analytics |  | `username` | Generate a reputation report for a monitored username. Shows sentiment distribution, top positive/negative mentions, timeline data, keyword frequency, and alerts. Requires an active monitor for the target. |
| 126 | `x_smart_target` | analytics |  | `username` | Find ideal accounts to engage with for growth. Uses AI to analyze your niche and find users most likely to follow back or engage. |
| 127 | `x_action_budget` | read |  | none | Report the remaining daily action budget for the active account: for each action class (post, reply, like, repost, follow, unfollow, dm, block, mute, delete) the cap, how many actions were used in the rolling 24 hour window, how many remain, and when the next slot frees. Caps persist across restarts and are set by XACTIONS_ACTION_CAPS or ~/.xactions/action-caps.json. |
| 128 | `x_ask` | read |  | `question` | Ask how to do something with XActions and get an answer grounded in the toolkit's own documentation, skills, browser scripts and repository, with sources and the exact runnable action (browser script, CLI command or MCP tool). Use this before guessing at a workflow, inventing a script name, or telling a user something is unsupported: it is the toolkit describing itself. Needs no API key. |
| 129 | `x_download_video` | read |  | `tweetUrl` | Download the video attached to a tweet and return the local file path plus the resolved media URL and metadata. |
| 130 | `x_get_blocked` | read |  | none | List the accounts the authenticated user has blocked, with usernames and display names. |
| 131 | `x_get_bookmarks` | read |  | none | List the authenticated account's saved bookmarks, newest first, up to the requested limit. |
| 132 | `x_get_explore` | read |  | none | Scrape the Explore feed for trending content. |
| 133 | `x_get_followers` | read |  | `username` | Scrape followers for an account. Supports Twitter, Bluesky, Mastodon, and Threads. |
| 134 | `x_get_following` | read |  | `username` | Scrape accounts that a user is following. Supports Twitter, Bluesky, Mastodon, and Threads. |
| 135 | `x_get_hashtag` | read |  | `hashtag` | Scrape tweets containing a specific hashtag. More focused than general search: returns trending metrics and top contributors. |
| 136 | `x_get_likers` | read |  | `tweetUrl` | Get the list of users who liked a specific tweet. Useful for finding engaged audiences. |
| 137 | `x_get_likes` | read |  | `username` | Scrape tweets that a user has liked. Shows what content a user engages with. |
| 138 | `x_get_media` | read |  | `username` | Scrape all media (images, videos, GIFs) from a user profile. Returns direct download URLs. |
| 139 | `x_get_mentions` | read |  | `username` | Scrape tweets that mention a specific user. Includes replies, quote tweets, and direct mentions. |
| 140 | `x_get_non_followers` | read |  | `username` | Get accounts you follow that do not follow you back. |
| 141 | `x_get_notifications` | read |  | none | Scrape your recent notifications with type classification. |
| 142 | `x_get_profile` | read |  | `username` | Get profile information for a user including bio, follower count, etc. Supports Twitter, Bluesky, Threads, and Mastodon. |
| 143 | `x_get_quote_tweets` | read |  | `tweetUrl` | Get all quote tweets of a specific tweet. Shows how people are commenting on/sharing a tweet. |
| 144 | `x_get_recommendations` | read |  | none | Get "Who to follow" recommendations based on a user or topic. Useful for discovering accounts in a niche. |
| 145 | `x_get_replies` | read |  | `tweetUrl` | Scrape replies to a specific tweet. Returns reply text, author, timestamp, likes, and nested reply chains. |
| 146 | `x_get_retweeters` | read |  | `tweetUrl` | Get the list of users who retweeted a specific tweet. |
| 147 | `x_get_settings` | read |  | none | Get a snapshot of your account settings and privacy configuration. |
| 148 | `x_get_thread` | read |  | `url` | Unroll and scrape an entire Twitter/X thread given the URL of the first tweet. |
| 149 | `x_get_trends` | read |  | none | Get current trending topics on X/Twitter. |
| 150 | `x_get_tweets` | read |  | `username` | Scrape recent tweets/posts from a user profile. Supports Twitter, Bluesky, Mastodon, and Threads. |
| 151 | `x_list_platforms` | read |  | none | List all supported social media platforms (Twitter, Bluesky, Mastodon, Threads) and their capabilities. |
| 152 | `x_search_tweets` | read |  | `query` | Search for tweets/posts matching a query. Supports Twitter, Bluesky, Mastodon, and Threads. |


---

## 7. CLI

> **How to use:** `npx xactions <command>`, or `npm run cli -- <command>` from a clone.
> **Auth:** stored under `~/.xactions` (override with `XACTIONS_HOME`).

56 commands, grouped by task exactly as `xactions` with no arguments prints
them, plus 85 subcommands. Two more are registered but ungrouped: `completion`,
which prints a shell completion script generated from the live command tree,
and `ask`.

### Global output flags

Every read command takes these:

| Flag | Effect |
|------|--------|
| `--compact` | One record per line as tab-separated `key=value` pairs, essential fields only, no colours or spinners |
| `--fields <list>` | With `--compact`, the exact columns to print, in the order named |
| `--json` | The full structured object on stdout and nothing else; it outranks `--output`, so a pipe is never turned into a file write |

`--compact` wins when both it and `--json` are passed.

### Logging in

| Command | What it does |
|---------|--------------|
| `xactions connect` | Log in through a real browser and capture the session. No DevTools. |
| `xactions login` | Paste an `auth_token` cookie |
| `xactions login --from-browser [browser]` | Read x.com cookies from an installed chrome, chromium, brave, edge, arc or firefox profile |
| `xactions login --cookies-file <path>` | Import a Netscape `cookies.txt`, a Cookie-Editor or EditThisCookie JSON export, a Playwright or Puppeteer `storageState`, or a raw `auth_token=...; ct0=...` string |
| `xactions doctor` | What works right now: guest tier, saved session, query-ID cache, installed skills, with the fix beside each failure |

Public reads need no account at all: `profile`, `tweets`, `thread`, `media`,
`analyze`, `hashtag`. Search, `followers`, `following`, `non-followers`, likes,
bookmarks and DMs need a session.

### Every command

### Start here

| # | Command | What it does | Subcommands |
|---|---------|--------------|-------------|
| 1 | `quickstart` | Guided first run: what works now, and what logging in unlocks | none |
| 2 | `doctor` | Check the install, the guest tier, the saved session, the query-ID cache and the MCP server | none |
| 3 | `connect` | Log in through a real browser and capture the session. No DevTools needed. | none |
| 4 | `login` | Set up authentication with session cookie | none |
| 5 | `logout` | Remove saved authentication | none |
| 6 | `mcp-config` | Generate MCP server config for Claude Desktop, Cursor, Windsurf, etc. | none |
| 7 | `skills` | List, install and remove the bundled agent skills (Claude Code, Cursor, Codex, Windsurf) | `list`, `show`, `install`, `uninstall` |
| 8 | `drafts` | Review, approve or discard MCP write calls held by approval mode | `list`, `show`, `approve`, `discard`, `clear` |
| 9 | `info` | Show XActions information | none |

### Read an account

| # | Command | What it does | Subcommands |
|---|---------|--------------|-------------|
| 10 | `profile` | Get profile information for a user | none |
| 11 | `tweets` | Scrape tweets from a user | none |
| 12 | `thread` | Scrape a full tweet thread | none |
| 13 | `media` | Scrape media from a user | none |
| 14 | `analyze` | Account report: engagement rate, cadence, content mix, best posting hour. No login needed. | none |
| 15 | `report` | Generate a reputation report for a monitored username | none |
| 16 | `history` | View account history over time | none |
| 17 | `snapshot` | Start auto-snapshotting an account | none |

### Followers and audience

| # | Command | What it does | Subcommands |
|---|---------|--------------|-------------|
| 18 | `followers` | Scrape followers for a user | none |
| 19 | `following` | Scrape accounts a user is following | none |
| 20 | `non-followers` | Find accounts that don't follow back | none |
| 21 | `audience` | Analyze follower overlap between two accounts | none |
| 22 | `crm` | Follower CRM: tags, scores, segments | `sync`, `tag`, `search`, `score`, `segment` |
| 23 | `graph` | Build and analyze social network graphs | `build`, `analyze`, `recommend`, `export`, `list`, `delete` |

### Search and monitor

| # | Command | What it does | Subcommands |
|---|---------|--------------|-------------|
| 24 | `search` | Search for tweets | none |
| 25 | `hashtag` | Scrape tweets for a hashtag | none |
| 26 | `scrape` | Multi-platform scrape: profile, followers, following, tweets, search, hashtag, trending | none |
| 27 | `platforms` | List supported social media platforms | none |
| 28 | `monitor` | Start monitoring sentiment for a username or keyword | none |
| 29 | `sentiment` | Analyze sentiment of text or tweet content | none |
| 30 | `reputation` | AI risk-score an account's posts (professional, hostile, legal, spam) and print a reputation report | none |
| 31 | `rss` | RSS feed monitoring & auto-posting | `add`, `list`, `check`, `drafts` |
| 32 | `stream` | Real-time event streaming for X/Twitter accounts | `start`, `stop`, `list`, `history`, `pause`, `resume`, `status`, `stop-all` |

### Write and grow

| # | Command | What it does | Subcommands |
|---|---------|--------------|-------------|
| 33 | `engage` | Like, repost, and reply across a profile, a search, or a list, with template or AI-written comments | none |
| 34 | `ai` | AI Tweet Writer: analyze voice, generate & rewrite tweets | `analyze`, `generate`, `rewrite`, `calendar` |
| 35 | `optimize` | AI-optimize a tweet for engagement | none |
| 36 | `hashtags` | Suggest hashtags for tweet text | none |
| 37 | `predict` | Predict tweet performance | none |
| 38 | `variations` | Generate tweet variations | none |
| 39 | `evergreen` | Find and recycle top-performing evergreen tweets | none |
| 40 | `persona` | Manage personas for algorithm building & automated growth | `create`, `list`, `run`, `status`, `delete`, `edit` |
| 41 | `schedule` | Cron-based task scheduler | `add`, `list`, `remove`, `run` |
| 42 | `bulk` | Bulk follow/unfollow/block/mute/scrape from CSV/JSON/TXT | none |

### Automate

| # | Command | What it does | Subcommands |
|---|---------|--------------|-------------|
| 43 | `workflow` | Manage and run automation workflows | `create`, `run`, `list`, `delete`, `actions`, `runs` |
| 44 | `agent` | 24/7 LLM-powered thought leadership agent | `start`, `test`, `login`, `setup`, `status`, `report` |
| 45 | `notify` | Notification hub: Email, Slack, Discord, Telegram | `test`, `send`, `configure` |
| 46 | `plugin` | Manage XActions plugins | `install`, `remove`, `list`, `enable`, `disable`, `discover` |
| 47 | `team` | Team & multi-user management | `create`, `invite`, `members`, `activity` |
| 48 | `dataset` | Manage scraping datasets (Apify-style) | `list`, `export`, `delete` |

### Move data

| # | Command | What it does | Subcommands |
|---|---------|--------------|-------------|
| 49 | `export` | Export a Twitter account (profile, tweets, followers, following, bookmarks) | none |
| 50 | `export-data` | Export data in external tool format | none |
| 51 | `archive` | Read the X data export zip: summary, export to files, migrate elsewhere | `summary`, `export`, `migrate` |
| 52 | `import` | Import data from Apify, Phantombuster, or CSV | none |
| 53 | `convert` | Convert between Apify/Phantombuster/CSV formats | none |
| 54 | `migrate` | Migrate Twitter data to Bluesky or Mastodon | none |
| 55 | `diff` | Compare two account exports and show changes | none |

### Low level

| # | Command | What it does | Subcommands |
|---|---------|--------------|-------------|
| 56 | `client` | HTTP-only Twitter client (fast, no browser needed) | `login`, `profile`, `tweet`, `search`, `post`, `followers`, `trends`, `whoami` |


---

## 8. DevTools Console Scripts

> `scripts/` holds 95 browser console scripts you paste into DevTools on x.com,
> and `scripts/twitter/` holds 110 standalone `.js` variants of the same ideas.
> The full catalogue with a description and the page each one runs on is
> generated from the script headers themselves into
> [browser-scripts.md](browser-scripts.md) by `npm run docs:scripts`. A
> hand-kept list of a hundred files is a list that is wrong within a month, so
> this section covers only what is unique to `scripts/twitter/`.

### 8.1 Scripts UNIQUE to `scripts/twitter/` (not in `src/`)

| # | File | What It Does | Page Required |
|---|------|-------------|---------------|
| 1 | `blacklist.js` (293 lines) | Manage a blacklist: users to never follow/like/RT | Any x.com page |
| 2 | `whitelist.js` (270 lines) | Manage a whitelist: protected users to never unfollow/block | Any x.com page |
| 3 | `filter-manager.js` (394 lines) | Configure filters (follower count, age, language, bio keywords, verified, default pic, tweet count) | Any x.com page |
| 4 | `rate-limiter.js` (388 lines) | Rate limiting utility: tracks actions per hour/day, enforces quotas, cooldowns | Any (paste first) |
| 5 | `block-by-keywords.js` (203 lines) | Block users with specific keywords in their bio | Followers/following page |
| 6 | `block-by-ratio.js` (235 lines) | Block accounts by follower/following ratio (spam detection) | `x.com/USERNAME/followers` |
| 7 | `comment-by-hashtag.js` (289 lines) | Search hashtags and auto-comment with custom messages | `x.com` (logged in) |
| 8 | `comment-by-location.js` (348 lines) | Search by location and auto-comment on matching tweets | `x.com` (logged in) |
| 9 | `interact-by-hashtag.js` (315 lines) | Like + RT + follow users posting with specific hashtags | Any x.com page |
| 10 | `interact-by-place.js` (267 lines) | Like + follow users from specific locations (great for local business) | Any x.com page |
| 11 | `interact-by-users.js` (321 lines) | Full interaction suite for target users: like, reply, RT, follow | Any x.com page |
| 12 | `interact-with-likers.js` (258 lines) | Follow users who liked specific tweets (competitor audience building) | Tweet likes page |
| 13 | `like-by-feed.js` (277 lines) | Auto-like tweets from home timeline | `x.com/home` |
| 14 | `like-by-hashtag.js` (265 lines) | Auto-like tweets containing specific hashtags | Search page |
| 15 | `like-by-location.js` (296 lines) | Auto-like tweets from specific geographic locations (uses `near:` operator) | `x.com` |
| 16 | `like-by-user.js` (328 lines) | Auto-like all tweets from a specific user's profile | `x.com/USERNAME` |
| 17 | `like-user-replies.js` (357 lines) | Auto-like replies/comments on a specific tweet | Tweet page (`x.com/user/status/xxx`) |
| 18 | `find-fake-followers.js` (359 lines) | Advanced fake/bot follower detection with scoring system | `x.com/USERNAME/followers` |
| 19 | `followers-growth-tracker.js` (278 lines) | Track follower growth over time with historical data in localStorage | Any profile page |
| 20 | `profile-stats.js` (308 lines) | Comprehensive profile statistics dashboard | Any profile page |
| 21 | `unlike-old.js` (246 lines) | Unlike tweets older than N days | `x.com/USERNAME/likes` |
| 22 | `leave-community.js` (123 lines) | Leave a specific community by ID | Community page |
| 23 | `update-banner.js` (161 lines) | Helper for updating profile banner image | `x.com/USERNAME` |
| 24 | `update-bio.js` (147 lines) | Update profile bio text | `x.com/settings/profile` |
| 25 | `update-profile-picture.js` (162 lines) | Helper for updating profile picture | `x.com/USERNAME` |
| 26 | `scrape-profile-posts.js` (887 lines) | Advanced tweet scraper with filtering, analytics, multi-format export | Any profile page |
| 27 | `scraper-toolbox.js` (1309 lines) | Interactive scraper control panel: GraphQL capture (exact counts, full long-post text), start/pause/stop, live filters, user exclusions, 5 export formats + clipboard | Any timeline (profile, search, list, likes, bookmarks, home) |

### 8.2 Scripts that MIRROR `src/` features (shared as standalone versions)

`unfollow-everyone.js`, `unfollow-non-followers.js`, `unfollow-with-log.js`, `smart-unfollow.js`, `detect-unfollowers.js`, `monitor-account.js`, `continuous-monitor.js`, `new-followers-alert.js`, `auto-liker.js`, `auto-commenter.js`, `follow-engagers.js`, `follow-target-users.js`, `keyword-follow.js`, `protect-active-users.js`, `growth-suite.js`, `multi-account.js`, `audit-followers.js`, `block-bots.js`, `mass-block.js`, `mass-unblock.js`, `mass-unmute.js`, `mute-by-keywords.js`, `report-spam.js`, `clear-all-bookmarks.js`, `clear-all-likes.js`, `clear-all-retweets.js`, `leave-all-communities.js`, `join-communities.js`, `send-direct-message.js`, `backup-account.js`, `best-time-to-post.js`, `competitor-analysis.js`, `engagement-analytics.js`, `hashtag-analytics.js`, `bookmark-exporter.js`, `thread-unroller.js`, `video-downloader.js`, `viral-tweets-scraper.js`, `link-scraper.js`

---

## 9. Skills Reference (`skills/`)

50 skills, one directory each, following the
[Agent Skills specification](https://agentskills.io/specification): a `SKILL.md`
with `name` and `description` frontmatter, plus `references/` where a skill
needs more than one file. Each names the exact script, page and arguments for
its job, and the mistakes to avoid.

```bash
xactions skills list                            # every skill and where it is installed
xactions skills show follower-monitoring        # read one without installing it
xactions skills install --all --global          # ~/.claude/skills/<id>/
xactions skills install --all --target cursor   # or project, codex, windsurf
```

The machine-readable index is [`skills/index.json`](../skills/index.json), and
the narrative catalogue is [skills.md](skills.md).

| # | Skill | What it covers |
|---|-------|----------------|
| 1 | [`a2a-multi-agent/`](../skills/a2a-multi-agent/SKILL.md) | Agent-to-Agent protocol integration for multi-agent workflows. |
| 2 | [`account-backup/`](../skills/account-backup/SKILL.md) | Export and backup X/Twitter account data: tweets, likes, bookmarks, followers, and following. |
| 3 | [`account-tools/`](../skills/account-tools/SKILL.md) | Miscellaneous account utilities: view join date, login history, connected accounts, appeal suspensions. |
| 4 | [`algorithm-cultivation/`](../skills/algorithm-cultivation/SKILL.md) | Trains feed algorithm for niche content, runs 24/7 LLM-powered thought leader engagement. |
| 5 | [`analytics-insights/`](../skills/analytics-insights/SKILL.md) | Analyze engagement, hashtags, competitors, best posting times, follower demographics, tweet performance. |
| 6 | [`articles-longform/`](../skills/articles-longform/SKILL.md) | Compose, preview, publish, and manage long-form Articles on X/Twitter (Premium+ feature). |
| 7 | [`billing-management/`](../skills/billing-management/SKILL.md) | Manage XActions subscriptions and billing via Stripe checkout. |
| 8 | [`blocking-muting-management/`](../skills/blocking-muting-management/SKILL.md) | Mass block, unblock, mute, unmute with bot detection. |
| 9 | [`bookmarks-management/`](../skills/bookmarks-management/SKILL.md) | Organize, export, and bulk-clear bookmarks with auto-tagging. |
| 10 | [`business-ads/`](../skills/business-ads/SKILL.md) | Brand monitoring, audience insights, competitor analysis, and ad campaign management. |
| 11 | [`community-health-monitoring/`](../skills/community-health-monitoring/SKILL.md) | Audit follower quality, engagement authenticity, unfollower patterns, and network efficiency. |
| 12 | [`community-management/`](../skills/community-management/SKILL.md) | Bulk-join/leave X communities, manage memberships. |
| 13 | [`community-notes/`](../skills/community-notes/SKILL.md) | View, write, rate, and browse Community Notes on posts. |
| 14 | [`competitor-intelligence/`](../skills/competitor-intelligence/SKILL.md) | Analyze competitor profiles, content strategy, audience, and engagement patterns. |
| 15 | [`content-cleanup/`](../skills/content-cleanup/SKILL.md) | Mass unlike, clear reposts/retweets, delete tweets, clear bookmarks and history. |
| 16 | [`content-posting/`](../skills/content-posting/SKILL.md) | Post tweets, threads, polls; schedule posts; create reposts programmatically. |
| 17 | [`content-repurposing/`](../skills/content-repurposing/SKILL.md) | Identify top tweets and generate repurposed threads, carousels, and variations. |
| 18 | [`creator-monetization/`](../skills/creator-monetization/SKILL.md) | Ad revenue analytics, subscription management, and creator monetization features. |
| 19 | [`crm-management/`](../skills/crm-management/SKILL.md) | Tag, segment, and track followers and contacts with a built-in CRM. |
| 20 | [`delegate-access/`](../skills/delegate-access/SKILL.md) | Add, remove, and manage delegate accounts that can post/like on your behalf. |
| 21 | [`direct-messages/`](../skills/direct-messages/SKILL.md) | Send, manage, and automate DMs with personalized bulk messaging and templates. |
| 22 | [`discovery-explore/`](../skills/discovery-explore/SKILL.md) | Trending topics, content search, account discovery, and explore page automation. |
| 23 | [`engagement-interaction/`](../skills/engagement-interaction/SKILL.md) | Auto-like, unlike, reply, bookmark, hide replies, and bulk engagement actions. |
| 24 | [`follower-monitoring/`](../skills/follower-monitoring/SKILL.md) | Detect unfollowers, track follower changes, and set up continuous monitoring. |
| 25 | [`graph-analysis/`](../skills/graph-analysis/SKILL.md) | Analyze follower/following network graphs: clusters, influencers, bridges, audience segments. |
| 26 | [`grok-ai/`](../skills/grok-ai/SKILL.md) | Grok AI chat, image generation, tweet analysis, and content creation. |
| 27 | [`growth-automation/`](../skills/growth-automation/SKILL.md) | Auto-like by keyword/user, auto-follow engagers, keyword-based following for organic growth. |
| 28 | [`lead-generation/`](../skills/lead-generation/SKILL.md) | Find and qualify B2B leads from X conversations using keyword search and profile analysis. |
| 29 | [`lists-management/`](../skills/lists-management/SKILL.md) | Create, populate, and export X/Twitter lists with bulk member management. |
| 30 | [`media-studio/`](../skills/media-studio/SKILL.md) | Navigate X Media Studio, upload media, manage library, view media analytics. |
| 31 | [`notifications-management/`](../skills/notifications-management/SKILL.md) | Filter, bulk-manage, and scrape notifications; auto-respond to mentions. |
| 32 | [`post-editing/`](../skills/post-editing/SKILL.md) | Edit existing posts or undo a recently posted tweet (Premium feature). |
| 33 | [`premium-subscriptions/`](../skills/premium-subscriptions/SKILL.md) | Detect Premium plan, verify feature access, and manage subscription features. |
| 34 | [`profile-management/`](../skills/profile-management/SKILL.md) | Update bio, avatar, header image, display name, location, website, and pinned tweet. |
| 35 | [`reputation-audit/`](../skills/reputation-audit/SKILL.md) | AI risk-scores your own posts (professional, hostile, legal, spam), produces a 0-100 reputation score with a shareable card, and offers one-click cleanup of what it flags. |
| 36 | [`saved-searches/`](../skills/saved-searches/SKILL.md) | Create, manage, and run saved searches on X/Twitter. |
| 37 | [`settings-privacy/`](../skills/settings-privacy/SKILL.md) | Manage protected tweets, muted words, connected apps, and notification preferences. |
| 38 | [`spaces-live/`](../skills/spaces-live/SKILL.md) | Join X Spaces, scrape metadata, discover live rooms, and schedule Spaces. |
| 39 | [`teams-management/`](../skills/teams-management/SKILL.md) | Create teams, invite members, assign roles, and collaborate on automation. |
| 40 | [`timeline-viewing/`](../skills/timeline-viewing/SKILL.md) | Switch timelines (For You/Following), auto-scroll, and scrape timeline data. |
| 41 | [`topic-management/`](../skills/topic-management/SKILL.md) | Browse, follow, and unfollow X Topics; manage followed topics. |
| 42 | [`twitter-scraping/`](../skills/twitter-scraping/SKILL.md) | Scrape profiles, followers, tweets, media, and bookmarks without API access. |
| 43 | [`unfollow-management/`](../skills/unfollow-management/SKILL.md) | Mass unfollow everyone, only non-followers, with smart time-based rules and whitelists. |
| 44 | [`video-downloading/`](../skills/video-downloading/SKILL.md) | Download videos and GIFs from X/Twitter posts: single video, batch, or via CLI. |
| 45 | [`viral-thread-generation/`](../skills/viral-thread-generation/SKILL.md) | Research trending topics and generate high-engagement thread content. |
| 46 | [`webhooks/`](../skills/webhooks/SKILL.md) | Create, manage, and test webhooks for automation job notifications. |
| 47 | [`x-pro-management/`](../skills/x-pro-management/SKILL.md) | Navigate X Pro (TweetDeck), set up monitoring columns, manage multi-column view. |
| 48 | [`x402-payments/`](../skills/x402-payments/SKILL.md) | Enable x402 crypto payment protocol for XActions API access: multi-chain, multi-currency. |
| 49 | [`xactions-cli/`](../skills/xactions-cli/SKILL.md) | Command-line interface for scraping, MCP server config, and automation: `npm install -g xactions`. |
| 50 | [`xactions-mcp-server/`](../skills/xactions-mcp-server/SKILL.md) | Driving the XActions MCP server from an AI agent: scrape, post, engage, analyze. (The tool count in this skill's own `description` field is stale; `src/mcp/server.js` is authoritative.) |


---

## 10. API Backend (`api/`)

> Express.js SaaS backend for the web dashboard.

| Directory | Contents |
|-----------|----------|
| `api/server.js` | Express entry point |
| `api/routes/` | 40 route modules |
| `api/services/` | Business logic |
| `api/middleware/` | Auth, rate limiting |
| `api/config/` | Configuration |
| `api/realtime/` | Socket.io for real-time features |
| `api/utils/` | Utility functions |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.js` | Database seeding |

---

## 11. Transport and sessions

> The layer under every read. `src/scrapers/twitter/http/` talks to X's internal
> GraphQL API directly, so a profile or a timeline needs no browser and no account.

| File | What it does |
|------|--------------|
| `queryIds.js` | Discovers X's GraphQL query IDs from x.com's own JavaScript bundles and caches them. A rotated ID self-heals instead of turning every read into a 404. `xactions doctor` reports the cache age. |
| `transactionId.js` | Computes the `x-client-transaction-id` header the way x.com's own web client computes it, so requests look like the client's. Adapted from Lami's x-client-transaction-id (MIT); see [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md). |
| `guest.js` | Guest-token acquisition for reads that need no login |
| `accountPool.js` | Several sessions in a SQLite database at `$XACTIONS_HOME/accounts.db`, each with cookies, an optional proxy, lock state and a per-operation rate-limit window read from X's own `x-rate-limit-remaining` and `x-rate-limit-reset` headers. `createPooledClient(pool)` looks like one client and rotates on a 429 or a spent window; a 401 or 403 locks the account. State survives restarts and is shared between processes on the machine. |
| `checkpoint.js` | One small JSON file written atomically after every page: `{ cursor, count, updatedAt, meta }`. A `--limit 50000` scrape that dies at page 400 restarts from the saved cursor with the collected count subtracted from the limit. Files live under `$XACTIONS_HOME/checkpoints/`. |
| `paging.js` | Cursor pagination shared by every paginated read |
| `client.js` | The low-level HTTP client: headers, CSRF, retries, error mapping |
| `playwright-session.js` | Browser-assisted login when a session must be captured interactively |
| `errors.js` | Typed errors, so an empty result is raised rather than reported as a zero |

**Session sources.** `xactions connect` drives a real browser.
`xactions login --from-browser [chrome\|chromium\|brave\|edge\|arc\|firefox]`
reads x.com cookies out of an installed browser profile.
`xactions login --cookies-file <path>` imports a Netscape `cookies.txt`, a
Cookie-Editor or EditThisCookie JSON export, a Playwright or Puppeteer
`storageState`, or a raw `auth_token=...; ct0=...` string. Prefer a full jar
over a bare `auth_token`: it carries the `ct0` every write needs.

---

## 12. Delivery: streams, notifications, webhooks

| File | What it does |
|------|--------------|
| `src/streaming/tweetStream.js` | Poll an account for new posts, deduplicated, persistent across restarts |
| `src/streaming/followerStream.js` | Follower gains and losses as they happen |
| `src/streaming/mentionStream.js` | Mentions of a keyword or handle |
| `src/streaming/streamManager.js` | Start, stop, pause, resume, list and inspect streams; behind `xactions stream` and the `x_stream_*` tools |
| `src/streaming/livePipeline.js` | x.com's own event pipeline: engagement counters, DM conversation updates and typing indicators, pushed rather than polled, with subscriptions changed mid-session. It is a streaming GET whose body is newline-delimited JSON, not a WebSocket: the endpoint answers an `Upgrade` request with an ordinary HTTP/2 response and never a 101. Needs a logged-in session; a guest token fails fast. |
| `src/streaming/browserPool.js` | Shared browser instances for the streams that still need one |
| `src/notifications/notifier.js` | Multi-channel sender: email, Slack, Discord, Telegram |
| `src/notifications/webhook.js` | Signed outbound webhooks. Every delivery carries `X-XActions-Signature` (`sha256=<hex HMAC-SHA256 of the raw body>`), `X-XActions-Timestamp`, `X-XActions-Event` and `X-XActions-Delivery` (a uuid stable across retries). Secret from `XACTIONS_WEBHOOK_SECRET` or the channel config; without one the delivery still carries the other three headers, unsigned. Three attempts with exponential backoff and jitter (5xx, 429 and network errors retry; any other 4xx is final), the last 500 deliveries recorded in `$XACTIONS_HOME/webhook-deliveries.json` and replayable with `replayDelivery(id)`. Receivers verify with `verifyWebhookSignature(rawBody, headers, secret)`, exported from the package root; the comparison is constant-time. |

---

## 13. Portability: the X archive, export, migrate

| File | What it does |
|------|--------------|
| `src/portability/twitter-archive.js` | Reads the official X data export zip (the GDPR archive): counts, date range, busiest year, top hashtags and mentions |
| `src/portability/exporter.js` | Writes an account or an archive out as JSON, CSV, Markdown and an HTML viewer |
| `src/portability/archive-viewer.js` | The browsable HTML view of an archive |
| `src/portability/importer.js` | Imports Apify, Phantombuster and CSV exports |
| `src/portability/differ.js` | Compares two exports and reports what changed |

```bash
xactions archive summary ~/Downloads/twitter-2026.zip
xactions archive export  ~/Downloads/twitter-2026.zip --out ./archive
xactions archive migrate ~/Downloads/twitter-2026.zip --to bluesky --execute
xactions export YOUR_USERNAME --format json,csv,md,html
xactions diff exports/january exports/february
```

Migration targets Bluesky and Mastodon, and is a dry run unless `--execute` is
passed. Full guide: [portability.md](portability.md).

---

## Quick Stats

Every figure below is a count of files or of declarations in the code, so it can
be rechecked rather than believed. `npm run docs:audit` recomputes the starred
rows on every run and fails the build when one has drifted.

| Category | Count | Where it comes from |
|----------|-------|---------------------|
| MCP tools * | 152 | the `TOOLS` array in `src/mcp/server.js` |
| CLI commands * | 56 | the `GROUPS` arrays in `src/cli/help-groups.js`, which is what `xactions --help` prints |
| CLI subcommands | 85 | the subcommands registered under those commands |
| Agent skills * | 50 | directories under `skills/`, indexed in `skills/index.json` |
| API route modules * | 40 | `.js` files in `api/routes/` |
| Browser console scripts | 95 | files in `scripts/` carrying a "Paste in DevTools" header, catalogued in [browser-scripts.md](browser-scripts.md) |
| Standalone console variants | 110 | `.js` files in `scripts/twitter/` |
| Library modules at `src/` top level | 131 | `.js` files directly in `src/` |
| Automation framework modules | 20 | `.js` files in `src/automation/` |
| Scraper modules | 6 | `.js` files directly in `src/scrapers/`, plus the platform subdirectories |
| MCP server modules | 11 | `.js` files in `src/mcp/` |
| Tests | 1720 passing on 2026-08-28 | `npm test` (Vitest), offline. This one is not audited, so read it as a snapshot, not a contract |

Counts marked * move whenever a tool, command, skill or route lands. Re-run
`npm run docs:audit` after any such change; it names the file and line of every
number that no longer matches the tree.

---

## X/Twitter DOM Selectors Reference

Used across all scripts. The maintained set, kept current, is [dom-selectors.md](dom-selectors.md); the table below is the subset these scripts rely on:

| Element | Selector |
|---------|----------|
| Unfollow button | `[data-testid$="-unfollow"]` |
| Confirmation button | `[data-testid="confirmationSheetConfirm"]` |
| Back button | `[data-testid="app-bar-back"]` |
| Follow indicator | `[data-testid="userFollowIndicator"]` |
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| Like button | `[data-testid="like"]` |
| Unlike button | `[data-testid="unlike"]` |
| Retweet button | `[data-testid="retweet"]` |
| Reply button | `[data-testid="reply"]` |
| User cell | `[data-testid="UserCell"]` |
| User description | `[data-testid="UserDescription"]` |
| Video player | `[data-testid="videoPlayer"]` |
| Tweet photo | `[data-testid="tweetPhoto"]` |
| Quote tweet | `[data-testid="quoteTweet"]` |
| Social context (RT) | `[data-testid="socialContext"]` |
| Joined (community) | `button[aria-label^="Joined"]` |
| Community links | `a[href^="/i/communities/"]` |
