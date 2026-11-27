# Browser Scripts

The zero-install surface. Copy a script, paste it into your browser's DevTools
console on x.com, and it runs against the page you already have open, using the
session you are already logged into.

No `npm install`, no API key, no cookie extraction, no server. This is the
fastest way to try XActions, and for one-off cleanup jobs it is often the right
tool rather than a fallback.

---

## How to run one

1. Open the page the script expects (each one names it in the catalog below).
   For most, that is `https://x.com/YOUR_USERNAME/following`.
2. Open DevTools:
   - **Windows/Linux** — <kbd>F12</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>
   - **macOS** — <kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>I</kbd>
3. Click the **Console** tab.
4. Paste the whole script and press <kbd>Enter</kbd>.

The first time you paste into a console, Chrome asks you to type `allow
pasting`. That is a browser safety feature, not something XActions can skip.

> **Read what you paste.** These scripts act as you, on your account. Every one
> in this repo is short enough to read end to end before you run it, and that is
> deliberate. Never paste a console script from anywhere without reading it.

---

## Start in dry-run

Most scripts that change your account have a `dryRun` option at the top of
their `CONFIG` block, and the catalog below shows which ones and whether it is
on by default. In dry-run mode a script walks the page, logs exactly what it
*would* do, and changes nothing:

```js
const CONFIG = {
  maxUnfollows: Infinity,   // Cap total unfollows (set to e.g. 50 for testing)
  whitelist: [],            // Usernames to never unfollow (without @)
  dryRun: true,             // Preview without acting — SET FALSE TO RUN
  delay: 2000,              // ms between unfollows
  scrollDelay: 2000,        // ms to wait after scroll
  maxEmptyScrolls: 6,       // Give up after N scrolls with no new users
  exportOnComplete: true,   // Auto-download JSON results
};
```

Run it once as-is, read the output, then set `dryRun: false` and run it again.
Skipping this step is how people unfollow accounts they meant to keep.

### The settings worth changing

| Setting | Why you would change it |
|---------|-------------------------|
| `dryRun` | `true` to preview, `false` to act. Always preview first. |
| `whitelist` | Usernames to never touch. Add friends, clients, and your alt account before a bulk run. |
| `maxUnfollows` | Cap the run. Start at `50` to see how X reacts to your account before letting it loose. |
| `delay` | Milliseconds between actions. Lower is faster and likelier to hit a rate limit. See below. |
| `exportOnComplete` | Downloads a JSON record of everything the script did. Keep this on. |

---

## Rate limits, and not getting locked out

X does not publish its automation limits, and they differ by account age,
follower count, and verification status. What holds in practice:

- **Keep `delay` at 2000ms or higher.** The defaults in this repo are chosen to
  look like a fast human rather than a script.
- **Stay under a few hundred write actions per day.** Unfollows, follows, likes,
  and deletes all draw on the same budget.
- **Stop when actions start failing silently.** A button that no longer responds
  means you are being throttled. Continuing turns a soft throttle into a
  temporary lock.
- **Spread big jobs over days.** A 5,000-account cleanup is a week of runs, not
  an afternoon.

Scripts print their progress as they go. If the count stops climbing while the
page keeps scrolling, stop the run.

### Stopping a run

Reload the page. Every script is scoped to the page it runs on and holds no
state elsewhere, so a refresh ends it immediately. Scripts with
`exportOnComplete` write their JSON when they finish normally, so a run you
abort early will not produce one.

---

## Sweeping a whole profile

[`engageProfile.js`](../browser/engageProfile.js) is the one to reach for when
you want to like, repost, and reply to everything an account has posted. It
opens a floating panel, walks the profile to the end, verifies each action
against the DOM, rests every 20 posts, backs off when X pushes back, and
remembers what it did so a reload resumes. Replies come from your templates or
from an LLM given a one-line brief; Grok works straight from the console, other
providers need the extension. Details in [engage.md](engage.md).

## Command line and library alternatives

The same jobs are available with more control from the CLI and the Node.js
library, which stream results, resume, and export to CSV or Google Sheets:

```bash
npx xactions profile nasa
npx xactions non-followers YOUR_USERNAME
npx xactions tweets nasa --limit 200 --output tweets.csv
```

See the [CLI reference](cli-reference.md), the [examples](../examples/), and the
[getting started guide](getting-started.md).

---

## The catalog

Every script has one file in [`browser/`](../browser/), and
[`browser/index.json`](../browser/index.json) describes all of them in a form a
program can read: id, title, description, category, the page to run it on,
whether it writes, whether it supports a dry run and its default, whether it
needs [`core.js`](../browser/core.js) pasted first, its `CONFIG` options with
types and defaults, and the older paths it replaces. "Writes" below means
running it with its default options changes your account.

<!-- AUTOGEN:SCRIPTS start -->

_208 scripts. Generated by `npm run docs:scripts` from [`browser/index.json`](../browser/index.json), which `npm run browser:build` reads from the header of each file in [`browser/`](../browser/). 247 older paths in `scripts/`, `scripts/twitter/` and `src/automation/` are generated copies of these files, kept so saved links still work._

### Post

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`articlePublisher`](../browser/articlePublisher.js) | Fill in a long-form X Article and save it as a draft, publish it, or leave it filled for you to review (Premium+). | `x.com/compose/article` | yes | on by default |
| [`contentRepurposer`](../browser/contentRepurposer.js) | Turn your existing posts into thread, summary, tweet storm, blog outline and quote-post drafts, exported as JSON. | `x.com/<you>` |  |  |
| [`createPoll`](../browser/createPoll.js) | Compose and post a poll tweet with 2 to 4 options and a custom duration, dry run by default. | `x.com/compose/post` or `x.com/home` | yes | on by default |
| [`editPost`](../browser/editPost.js) | Edit a recent post, or undo a post during the undo window. | `x.com/<you>/status/<id>` | yes |  |
| [`mediaStudio`](../browser/mediaStudio.js) | Upload, organize and publish media in Media Studio on studio.x.com. | `x.com/*` | yes |  |
| [`mentionUsers`](../browser/mentionUsers.js) | Compose posts that mention a list of users. | `x.com/*` | yes |  |
| [`postAdvanced`](../browser/postAdvanced.js) | Advanced post features: drafts, scheduling, media, polls, location and reply settings. | `x.com/*` | yes |  |
| [`postComposer`](../browser/postComposer.js) | Compose and post a tweet, a reply, a thread or a poll from your logged-in session, with a dry run by default. | `x.com/home` or `x.com/compose/post` | yes | on by default |
| [`postThread`](../browser/postThread.js) | Compose and post a thread of connected tweets in one pass, with length checks and a dry run by default. | `x.com/home` or `x.com/compose/post` | yes | on by default |
| [`quoteTweet`](../browser/quoteTweet.js) | Quote the post you are viewing with your own text. | `x.com/<username>/status/<id>` | yes | on by default |
| [`schedulePosts`](../browser/schedulePosts.js) | Queue one or more posts in X's native scheduler, setting each date and time in the Schedule dialog, dry run by default. | `x.com/home` or `x.com/compose/post` | yes | on by default |
| [`shareEmbed`](../browser/shareEmbed.js) | Copy post links and embed codes, one post or in bulk. | `x.com/*` |  |  |
| [`textFormatting`](../browser/textFormatting.js) | Format post text with Unicode bold, italic and other styles. | `x.com/compose/post` |  |  |
| [`threadComposer`](../browser/threadComposer.js) | Compose, preview and publish a multi-post thread with character counts, numbering, saved drafts and a dry run by default. | `x.com/*` | yes | on by default |
| [`verifiedOnly`](../browser/verifiedOnly.js) | Set who can reply to a new post to verified accounts only. | `x.com/*` | yes |  |
| [`videoCaptions`](../browser/videoCaptions.js) | Upload caption files to your videos. | `x.com/*` | yes |  |

### Scrape and Export

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`backupAccount`](../browser/backupAccount.js) | Back up your visible profile, tweets, likes, bookmarks, following and followers as a JSON download. | `x.com/<you>` or `x.com/<you>/likes` or `x.com/i/bookmarks` or `x.com/<you>/following` or `x.com/<you>/followers` |  |  |
| [`bookmarkExporter`](../browser/bookmarkExporter.js) | Export all your bookmarks to JSON and CSV, with optional full metadata and a summary. | `x.com/i/bookmarks` |  |  |
| [`bookmarkOrganizer`](../browser/bookmarkOrganizer.js) | Scan your bookmarks, sort them into keyword categories and export them as JSON or CSV. | `x.com/i/bookmarks` |  |  |
| [`exportToCSV`](../browser/exportToCSV.js) | Turn any scraped data array into a downloadable CSV file. | `x.com/*` |  |  |
| [`linkScraper`](../browser/linkScraper.js) | Scroll a user's profile and collect every external link they shared, grouped by domain, with JSON and text downloads. | `x.com/<username>` |  |  |
| [`manageBookmarks`](../browser/manageBookmarks.js) | Export your bookmarks as JSON or CSV, or clear all of them with the built-in Clear All button. | `x.com/i/bookmarks` |  |  |
| [`scrapeCashtagSearch`](../browser/scrapeCashtagSearch.js) | Scrape cashtag search results with sentiment, for stock and crypto ticker mentions. | `x.com/search?q=<query>` |  |  |
| [`scrapeExplore`](../browser/scrapeExplore.js) | Scrape trending topics, search results, or the Explore page's trends and posts, and export them as JSON. | `x.com/explore` or `x.com/explore/tabs/trending` |  |  |
| [`scrapeFollowers`](../browser/scrapeFollowers.js) | Scroll the followers list of any profile and export every follower (handle, name, bio, verified, follows-you) to JSON and CSV. | `x.com/<username>/followers` |  |  |
| [`scrapeFollowing`](../browser/scrapeFollowing.js) | Scroll the following list of any profile and export everyone it follows (handle, name, bio, verified, follows-you) to JSON and CSV. | `x.com/<username>/following` |  |  |
| [`scrapeHashtag`](../browser/scrapeHashtag.js) | Scroll a hashtag's live results and export every post (text, author, counts, media) to JSON and CSV. | `x.com/search?q=%23<query>&f=live` or `x.com/hashtag/<query>` |  |  |
| [`scrapeLikers`](../browser/scrapeLikers.js) | Scroll the Likes view of a post and export every user who liked it (handle, name, bio, verified, follows-you) to JSON and CSV. | `x.com/<username>/status/<id>/likes` |  |  |
| [`scrapeLikes`](../browser/scrapeLikes.js) | Scroll a user's Likes timeline and export the posts they liked (url, author, text, counts) to JSON and CSV. | `x.com/<you>/likes` or `x.com/<username>/likes` |  |  |
| [`scrapeMedia`](../browser/scrapeMedia.js) | Collect every image, video and GIF URL from a profile's Media tab and export them as JSON, CSV and a URL list. | `x.com/<username>/media` |  |  |
| [`scrapeNotifications`](../browser/scrapeNotifications.js) | Export your notifications feed (type, actor handles, text, timestamp) to JSON and CSV, with a breakdown by type and top interactors. | `x.com/notifications` |  |  |
| [`scrapeProfile`](../browser/scrapeProfile.js) | Read a profile's name, bio, location, website, join date, counts, verified badge and images, and download them as JSON. | `x.com/<username>` |  |  |
| [`scrapeProfilePosts`](../browser/scrapeProfilePosts.js) | Scrape every post from a profile with filters, analytics and JSON, CSV and Markdown exports. | `x.com/<username>` |  |  |
| [`scrapeProfileWithReplies`](../browser/scrapeProfileWithReplies.js) | Scrape a profile's posts from the With replies tab, then open each post and collect the replies other users left, with JSON, CSV, Markdown, text and HTML export. | `x.com/<username>/with_replies` or `x.com/<username>` |  |  |
| [`scrapeReplies`](../browser/scrapeReplies.js) | Scroll the conversation under an open post and export every reply (author, text, counts) to JSON and CSV. | `x.com/<username>/status/<id>` |  |  |
| [`scrapeRetweeters`](../browser/scrapeRetweeters.js) | Scroll a post's Reposts and Quotes tabs and export everyone who reposted or quote-tweeted it, each tagged repost or quote, to JSON and CSV. | `x.com/<username>/status/<id>/retweets` or `x.com/<username>/status/<id>/quotes` |  |  |
| [`scraperToolbox`](../browser/scraperToolbox.js) | On-page scraping control panel with start, pause and stop, live filters and one-click exports. | `x.com/*` |  |  |
| [`scrapeSearch`](../browser/scrapeSearch.js) | Scroll the current X search results and export every post (text, author, counts, media) to JSON and CSV. | `x.com/search?q=<query>&f=live` or `x.com/search?q=<query>` |  |  |
| [`threadUnroller`](../browser/threadUnroller.js) | Collect every post the author wrote in a thread and save it as markdown, plain text or JSON. | `x.com/<username>/status/<id>` |  |  |
| [`timelineScraper`](../browser/timelineScraper.js) | Scrape posts from the home timeline and other feeds. | `x.com/home` |  |  |
| [`timelineViewer`](../browser/timelineViewer.js) | Switch between the For you and Following timelines and collect the posts shown. | `x.com/home` |  |  |
| [`videoDownloader`](../browser/videoDownloader.js) | Find every video or GIF URL on a post, pick a quality and download it, with batch and metadata helpers. | `x.com/<username>/status/<id>` |  |  |
| [`viralTweetsScraper`](../browser/viralTweetsScraper.js) | Find the top-performing posts on a search or profile by like, repost and reply thresholds, sorted and exported to JSON and CSV. | `x.com/search?q=<query>` or `x.com/<username>` |  |  |

### Analytics

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`accountHealthMonitor`](../browser/accountHealthMonitor.js) | Score your account from 0 to 100 across engagement, profile, content, growth and risk, with recommendations. | `x.com/<you>` |  |  |
| [`audienceDemographics`](../browser/audienceDemographics.js) | Profile your followers by niche, verification, avatar and bio quality, bot likelihood and top bio keywords, with a JSON export. | `x.com/<you>/followers` |  |  |
| [`audienceOverlap`](../browser/audienceOverlap.js) | Compare two accounts' followers, or two pasted handle lists, to find shared and unique audiences and the overlap percentage. | `x.com/<username>/followers` or `x.com/*` |  |  |
| [`auditFollowers`](../browser/auditFollowers.js) | Scan your followers list and score each account as legitimate, suspicious or likely fake, with an optional audience quality report. | `x.com/<you>/followers` |  |  |
| [`bestTimeToPost`](../browser/bestTimeToPost.js) | Analyze a profile's posting history and engagement to find the best days and hours to post. | `x.com/<you>` or `x.com/<username>` |  |  |
| [`businessAnalytics`](../browser/businessAnalytics.js) | Brand monitoring for businesses: mentions, engagement trends and sentiment. | `x.com/*` |  |  |
| [`businessTools`](../browser/businessTools.js) | Brand mention monitoring, competitor analysis and audience insights for business accounts. | `x.com/search?q=<query>` |  |  |
| [`competitorAnalysis`](../browser/competitorAnalysis.js) | Compare engagement, follower counts and posting patterns of several accounts, or deep-analyze the profile you are on. | `x.com/<username>` or `x.com/*` |  |  |
| [`contentCalendar`](../browser/contentCalendar.js) | Analyze your posting pattern by day and hour, find gaps and the best times to post, and keep a local queue of planned tweets. | `x.com/<you>` |  |  |
| [`creatorStudio`](../browser/creatorStudio.js) | Creator analytics: subscriptions, tips, Super Follows revenue and audience. | `x.com/<you>` |  |  |
| [`engagementAnalytics`](../browser/engagementAnalytics.js) | Analyze likes, retweets, replies, views and best posting times across a profile's recent posts. | `x.com/<username>` |  |  |
| [`engagementLeaderboard`](../browser/engagementLeaderboard.js) | Rank who replies to your posts most, sort them into engagement tiers and export a VIP list. | `x.com/<you>` |  |  |
| [`findFakeFollowers`](../browser/findFakeFollowers.js) | Identify likely fake or bot followers in your audience. | `x.com/<you>/followers` |  |  |
| [`followerGrowthTracker`](../browser/followerGrowthTracker.js) | Snapshot a profile's follower count on each run and report growth, velocity, projections and a trendline from the saved history. | `x.com/<username>` |  |  |
| [`followRatioManager`](../browser/followRatioManager.js) | Grade your followers to following ratio, track it over time and plan how to reach a target ratio. | `x.com/<you>` |  |  |
| [`hashtagAnalytics`](../browser/hashtagAnalytics.js) | Analyze a hashtag search, your own posts or any timeline: totals, top posts and contributors, peak hour, and which hashtags drive engagement. | `x.com/search?q=<query>` or `x.com/<you>` or `x.com/home` |  |  |
| [`profileStats`](../browser/profileStats.js) | Comprehensive statistics for any profile. | `x.com/<username>` |  |  |
| [`reputationAudit`](../browser/reputationAudit.js) | AI-score your own posts for professional, hostile, legal and spam risk, then optionally delete what was flagged. | `x.com/<you>` | yes | on by default |
| [`scrapeAnalytics`](../browser/scrapeAnalytics.js) | Scrape account and post analytics: impressions, engagement rates and audience. | `x.com/i/account_analytics` |  |  |
| [`sentimentAnalyzer`](../browser/sentimentAnalyzer.js) | Score the sentiment of posts on any timeline, search or profile with a weighted lexicon, and report the distribution, extremes, emotional words and toxicity. | `x.com/*` or `x.com/search?q=<query>` |  |  |
| [`tweetABTester`](../browser/tweetABTester.js) | Track the engagement of two posted tweet variants over time and pick a winner, with tests saved in localStorage. | `x.com/*` |  |  |
| [`tweetPerformance`](../browser/tweetPerformance.js) | Rank your recent posts by engagement, rate and views, and break down what performs by media, content type, length, hashtags and hour. | `x.com/<you>` or `x.com/<username>` |  |  |
| [`tweetPriceCorrelation`](../browser/tweetPriceCorrelation.js) | Correlate how often an account posts with token or stock price movements. | `x.com/<username>` |  |  |
| [`tweetScheduleOptimizer`](../browser/tweetScheduleOptimizer.js) | Score your past posts by day and hour, weighting engagement, replies and reposts, and build a personalized weekly posting schedule. | `x.com/<you>` |  |  |
| [`viewAnalytics`](../browser/viewAnalytics.js) | Open the analytics pages and scrape overview and per-post metrics (Premium). | `x.com/*` |  |  |
| [`viralTweetDetector`](../browser/viralTweetDetector.js) | Scan a timeline or search and rank posts going viral by engagement rate and velocity (engagement per hour), with a JSON export. | `x.com/home` or `x.com/search?q=<query>&f=live` or `x.com/explore` |  |  |

### Monitor

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`continuousMonitor`](../browser/continuousMonitor.js) | Re-check a followers or following list on a timer and alert you to every follow and unfollow. | `x.com/<username>/followers` or `x.com/<username>/following` |  |  |
| [`detectUnfollowers`](../browser/detectUnfollowers.js) | Snapshot your followers and, on the next run, list who unfollowed you and who is new. | `x.com/<you>/followers` |  |  |
| [`keywordMonitor`](../browser/keywordMonitor.js) | Watch a search for keyword mentions, flag new ones, rank top mentioners and keep a history with optional auto-refresh. | `x.com/search?q=<query>&f=live` or `x.com/home` |  |  |
| [`monitorAccount`](../browser/monitorAccount.js) | Snapshot a public account's followers or following list and report who was added or removed since the last run. | `x.com/<username>/followers` or `x.com/<username>/following` |  |  |
| [`newFollowersAlert`](../browser/newFollowersAlert.js) | Compare your followers with the last snapshot to list new followers and unfollowers, with welcome message templates. | `x.com/<you>/followers` |  |  |
| [`notificationManager`](../browser/notificationManager.js) | Scrape a categorized summary of your notifications and export it, or mark all notifications as read. | `x.com/notifications` or `x.com/notifications/mentions` |  |  |
| [`trendingTopicMonitor`](../browser/trendingTopicMonitor.js) | Capture the current trends with post counts and niches, flag watched keywords, compare against past snapshots and optionally re-scan on an interval. | `x.com/explore/tabs/trending` or `x.com/explore` |  |  |

### Grow

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`algorithmBuilder`](../browser/algorithmBuilder.js) | Train the X algorithm around your niche with human-paced search, like, reply, repost and follow cycles, with a dry run and daily caps. | `x.com/home` | yes | on by default |
| [`algorithmTrainer`](../browser/algorithmTrainer.js) | Cycle through training phases (search, like, follow, comment) to teach the algorithm your niche. Paste [`core.js`](../browser/core.js) first. | `x.com/home` | yes |  |
| [`autoPlugReplies`](../browser/autoPlugReplies.js) | Reply to your own tweets that pass a like threshold with a plug message (link, CTA, product pitch). | `x.com/<you>` | yes | on by default |
| [`followAccount`](../browser/followAccount.js) | Follow accounts by username, or the accounts on screen that match your filters. | `x.com/*` | yes |  |
| [`followBack`](../browser/followBack.js) | Follow every account that follows you but that you do not follow back yet. | `x.com/<you>/followers` | yes |  |
| [`followEngagers`](../browser/followEngagers.js) | Follow the people who liked, reposted or quoted a post, or the recent posts on a profile, with filters and a cap. | `x.com/<username>/status/<id>` or `x.com/<username>` | yes |  |
| [`followerTools`](../browser/followerTools.js) | Follower tools: remove, soft-block, compare and export followers. | `x.com/<you>/followers` | yes |  |
| [`followTargetUsers`](../browser/followTargetUsers.js) | Follow the followers or following of target accounts, filtered by follower count, bio and account type, with a total cap. | `x.com/<username>/followers` or `x.com/<username>/following` or `x.com/home` | yes |  |
| [`growthSuite`](../browser/growthSuite.js) | All-in-one growth automation: keyword follow, feed likes and unfollowing non-followers after a grace period, with per-session caps. | `x.com/home` | yes |  |
| [`keywordFollow`](../browser/keywordFollow.js) | Search People results for each keyword and follow the users that pass bio, follower count and account filters, with a cap. | `x.com/search?q=<query>&f=user` or `x.com/*` | yes |  |
| [`naturalFlow`](../browser/naturalFlow.js) | Simulate a natural browsing session: scroll, like, reply, repost, follow and check notifications at a human pace. | `x.com/home` | yes |  |
| [`thoughtLeaderCultivator`](../browser/thoughtLeaderCultivator.js) | Train the algorithm for your niche by simulating natural browsing: read, like and bookmark. | `x.com/home` | yes |  |

### Engage

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`autoCommenter`](../browser/autoCommenter.js) | Watch a user's profile for new posts and reply to them with a random comment from your list, with an age window and a cap. | `x.com/<username>` | yes |  |
| [`autoEngage`](../browser/autoEngage.js) | Like, reply, bookmark and repost matching posts in one pass over a feed. | `x.com/home` | yes |  |
| [`autoLiker`](../browser/autoLiker.js) | Like posts in your timeline or on a profile that match keywords or authors, with a per-run and a daily cap. | `x.com/home` or `x.com/<username>` | yes |  |
| [`autoReply`](../browser/autoReply.js) | Reply automatically to timeline or search tweets that match keyword triggers, dry run by default. | `x.com/home` or `x.com/search?q=<query>&f=live` | yes | on by default |
| [`autoReplyMentions`](../browser/autoReplyMentions.js) | Reply to your recent mentions with rotating templates so no mention goes unanswered. | `x.com/notifications/mentions` | yes |  |
| [`autoRepost`](../browser/autoRepost.js) | Repost timeline or search posts that match keywords, authors, likes and media filters, dry run by default. | `x.com/home` or `x.com/search?q=<query>&f=live` | yes | on by default |
| [`commentByHashtag`](../browser/commentByHashtag.js) | Find posts with specific hashtags and comment on them from your templates. | `x.com/search?q=<query>&f=live` | yes |  |
| [`commentByLocation`](../browser/commentByLocation.js) | Find posts from specific locations and comment on them from your templates. | `x.com/search?q=<query>&f=live` | yes |  |
| [`communityNotes`](../browser/communityNotes.js) | View Community Notes on posts and rate or contribute notes. | `x.com/home` | yes | on by default |
| [`customerService`](../browser/customerService.js) | Watch mentions and reply to customer questions from keyword rules. Paste [`core.js`](../browser/core.js) first. | `x.com/notifications` | yes |  |
| [`engagementBooster`](../browser/engagementBooster.js) | Like, reply, retweet, bookmark and follow matching tweets from a floating panel, with scoring, drip scheduling and undo. | `x.com/home` or `x.com/search?q=<query>` or `x.com/<username>` | yes | on by default |
| [`engagementManager`](../browser/engagementManager.js) | Like, unlike, reply to and bookmark the posts on screen. | `x.com/home` | yes |  |
| [`engageProfile`](../browser/engageProfile.js) | Like, repost and comment on every post of one profile, with comments from your templates or from an LLM. | `x.com/<username>` | yes | on by default |
| [`interactByHashtag`](../browser/interactByHashtag.js) | Like, follow and reply on posts that contain specific hashtags. | `x.com/search?q=<query>&f=live` | yes |  |
| [`interactByPlace`](../browser/interactByPlace.js) | Like, follow and reply on posts from specific locations. | `x.com/search?q=<query>&f=live` | yes |  |
| [`interactByUsers`](../browser/interactByUsers.js) | Like, follow and reply to the posts of specific users. | `x.com/<username>` | yes |  |
| [`interactWithLikers`](../browser/interactWithLikers.js) | Engage the users who liked a specific post. | `x.com/<username>/status/<id>/likes` | yes |  |
| [`keywordLiker`](../browser/keywordLiker.js) | Like only posts containing keywords you enter in a prompt box. | `x.com/home` | yes | off by default |
| [`likeByFeed`](../browser/likeByFeed.js) | Like posts as it scrolls your home timeline. | `x.com/home` | yes |  |
| [`likeByHashtag`](../browser/likeByHashtag.js) | Like posts containing specific hashtags. | `x.com/search?q=<query>&f=live` | yes |  |
| [`likeByLocation`](../browser/likeByLocation.js) | Like posts from specific geographic locations. | `x.com/search?q=<query>&f=live` | yes |  |
| [`likeByUser`](../browser/likeByUser.js) | Like the posts on one user profile. | `x.com/<username>` | yes |  |
| [`likePost`](../browser/likePost.js) | Like specific posts by URL, or the posts on screen that match keywords. | `x.com/*` | yes |  |
| [`likeUserReplies`](../browser/likeUserReplies.js) | Like the replies under a specific post. | `x.com/<username>/status/<id>` | yes |  |
| [`multiAccountTimelineLiker`](../browser/multiAccountTimelineLiker.js) | Like the whole timeline of several accounts in sequence. | `x.com/<username>` | yes | off by default |
| [`postInteractions`](../browser/postInteractions.js) | Post interaction tools: like, repost, bookmark, share, mute and report a post. | `x.com/*` | yes |  |
| [`quoteTweetAutomation`](../browser/quoteTweetAutomation.js) | Quote-post tweets from a timeline or search with rotating templates, keyword and engagement filters, a dry run and long delays. | `x.com/search?q=<query>` or `x.com/home` or `x.com/<username>` | yes | on by default |
| [`repostPost`](../browser/repostPost.js) | Repost specific posts by URL, or the posts on screen that match keywords. | `x.com/*` | yes |  |
| [`voteInPolls`](../browser/voteInPolls.js) | Vote in the polls in a timeline or search as it scrolls, with a fixed or random option. | `x.com/search?q=<query>&f=live` | yes |  |

### Clean Up

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`bulkDeleteTweets`](../browser/bulkDeleteTweets.js) | Delete your own posts by age, keyword, type or engagement, with a dry run, a cap and a countdown. | `x.com/<you>` | yes | off by default |
| [`clearAllBookmarks`](../browser/clearAllBookmarks.js) | Remove your bookmarked posts one by one or with the built-in Clear All button, with keyword keep-filters, a cap, a dry run, rate-limit cooldowns and a JSON log. | `x.com/i/bookmarks` | yes | on by default |
| [`clearAllReposts`](../browser/clearAllReposts.js) | Undo the reposts on your profile, with a keyword skip list, a cap, a dry run and a JSON export. | `x.com/<you>` | yes | on by default |
| [`massUnblock`](../browser/massUnblock.js) | Unblock all or selected accounts on your blocked list, with a keep-blocked list, a cap and a dry run by default. | `x.com/settings/blocked/all` | yes | on by default |
| [`massUnmute`](../browser/massUnmute.js) | Unmute every account on your muted list, or only the ones you name, with a keep-muted list, a cap and a dry run by default. | `x.com/settings/muted/all` | yes | on by default |
| [`protectActiveUsers`](../browser/protectActiveUsers.js) | Scan your recent posts for likers, repliers, reposters and quoters and save them as a protected list that smart unfollow never touches. | `x.com/<you>` |  |  |
| [`removeFollowers`](../browser/removeFollowers.js) | Remove specific, all or low-quality followers with X's native Remove this follower, with an optional soft-block fallback. | `x.com/<you>/followers` | yes | on by default |
| [`searchSweep`](../browser/searchSweep.js) | Delete, like, repost or reply to every post an X search returns. | `x.com/search?q=<query>` | yes | on by default |
| [`smartUnfollow`](../browser/smartUnfollow.js) | Unfollow accounts that did not follow you back within a grace period, with a whitelist, a dry run and a cap. | `x.com/<you>/following` or `x.com/<you>/followers` | yes | off by default |
| [`unfollowback`](../browser/unfollowback.js) | Unfollow accounts that do not follow you back, with a whitelist, a dry run, rate-limit cooldowns and a JSON export. | `x.com/<you>/following` | yes | on by default |
| [`unfollowEveryone`](../browser/unfollowEveryone.js) | Unfollow every account you follow, with a whitelist, a cap, a start confirmation and a JSON export. | `x.com/<you>/following` | yes | off by default |
| [`unfollowWDFBLog`](../browser/unfollowWDFBLog.js) | Unfollow accounts that don't follow you back and download a JSON, CSV or text log of every account, with a dry run and a whitelist. | `x.com/<you>/following` | yes | on by default |
| [`unlikeAllPosts`](../browser/unlikeAllPosts.js) | Unlike the posts in your Likes tab, with keyword filters, a cap, a confirmation and a dry run by default. | `x.com/<you>/likes` | yes | on by default |
| [`unlikeOld`](../browser/unlikeOld.js) | Remove likes older than a number of days you set. | `x.com/<you>/likes` | yes |  |

### Safety

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`blockBots`](../browser/blockBots.js) | Detect likely bot accounts in a follower or user list by heuristics and block them, dry run by default. | `x.com/<you>/followers` or `x.com/<username>/followers` | yes | on by default |
| [`blockByKeywords`](../browser/blockByKeywords.js) | Block users whose bio contains keywords you set. | `x.com/<you>/followers` | yes | on by default |
| [`blockByRatio`](../browser/blockByRatio.js) | Block accounts by follower to following ratio. | `x.com/<you>/followers` | yes | on by default |
| [`blockListManager`](../browser/blockListManager.js) | Import, export and share block lists. | `x.com/settings/blocked/all` | yes |  |
| [`blockListTransfer`](../browser/blockListTransfer.js) | Export your block list to JSON, import and block a list of users, or block the followers of an account. | `x.com/settings/blocked/all` | yes | on by default |
| [`manageMutedWords`](../browser/manageMutedWords.js) | Add, remove, or list your muted words and phrases on X in bulk, with a dry run for add and remove. | `x.com/settings/muted_keywords` |  | on by default |
| [`massBlock`](../browser/massBlock.js) | Block a list of usernames, or every user cell visible on the page, with a whitelist, a cap and a dry run that is on by default. | `x.com/*` or `x.com/<username>/followers` | yes | on by default |
| [`muteByKeywords`](../browser/muteByKeywords.js) | Mute users whose posts (on a timeline or search) or bios (on a followers list) contain keywords you set, dry run by default. | `x.com/home` or `x.com/search?q=<query>&f=live` or `x.com/<you>/followers` | yes | on by default |
| [`reportSpam`](../browser/reportSpam.js) | Report a list of spam or bot accounts, or scan a user list for spam signals and report the matches, dry run by default. | `x.com/*` or `x.com/<you>/followers` | yes | on by default |
| [`shadowbanChecker`](../browser/shadowbanChecker.js) | Run heuristic shadowban checks (suggestion ban, search ban, ghost ban, media visibility) for your account or any handle. | `x.com/*` |  |  |

### Lists

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`addToList`](../browser/addToList.js) | Add a batch of users to one of your Lists through its Manage members search, rate-limited. | `x.com/i/lists/<id>` | yes | on by default |
| [`advancedLists`](../browser/advancedLists.js) | Advanced List management: create, copy, pin, follow and export Lists. | `x.com/i/lists` | yes |  |
| [`followList`](../browser/followList.js) | Follow or unfollow Lists and pin them to your timeline. | `x.com/i/lists` | yes | on by default |
| [`followListMembers`](../browser/followListMembers.js) | Follow every member of a List, skipping accounts you already follow, rate-limited. | `x.com/i/lists/<id>/members` | yes |  |
| [`listManager`](../browser/listManager.js) | Create, rename or delete your X Lists, add users to a list, and export your lists or a list's members, dry run by default. | `x.com/<you>/lists` or `x.com/i/lists/<id>/members` | yes | on by default |
| [`scrapeList`](../browser/scrapeList.js) | Export an X List's timeline posts, or its members, to JSON and CSV. | `x.com/i/lists/<id>/members` or `x.com/i/lists/<id>` |  |  |

### Communities

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`communityManager`](../browser/communityManager.js) | Community management: join, leave, post, moderate and export Communities. | `x.com/i/communities` | yes |  |
| [`createCommunity`](../browser/createCommunity.js) | Create a new Community with a name, description and rules. | `x.com/i/communities` | yes | on by default |
| [`joinCommunities`](../browser/joinCommunities.js) | Join X communities found by keyword on the suggested page, or from a list of community IDs, dry run by default. | `x.com/i/communities/suggested` or `x.com/i/communities/<id>` | yes | on by default |
| [`leaveAllCommunities`](../browser/leaveAllCommunities.js) | Leave every X Community you have joined, with a whitelist, a cap, a dry run and progress that survives reloads. | `x.com/<you>/communities` | yes | on by default |
| [`leaveCommunity`](../browser/leaveCommunity.js) | Leave one Community by name or ID. | `x.com/i/communities` | yes |  |
| [`manageCommunity`](../browser/manageCommunity.js) | Manage Community members, roles, settings and rules. | `x.com/i/communities/<id>` | yes | on by default |

### Messages

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`advancedDM`](../browser/advancedDM.js) | Advanced direct message features: reactions, search, pinning, requests and exports. | `x.com/messages` | yes |  |
| [`autoReplyDms`](../browser/autoReplyDms.js) | Auto-reply to unread DM conversations with a single message template. | `x.com/messages` | yes |  |
| [`bulkDm`](../browser/bulkDm.js) | Send a personalized DM to a list of users from one message template. | `x.com/messages` | yes |  |
| [`dmCalls`](../browser/dmCalls.js) | Open a DM conversation and start an audio or video call. | `x.com/messages` | yes | on by default |
| [`dmManager`](../browser/dmManager.js) | Send DMs, export conversations and manage message requests. | `x.com/messages` | yes | on by default |
| [`encryptedDM`](../browser/encryptedDM.js) | Turn on encrypted DMs and send encrypted messages. | `x.com/messages` | yes | on by default |
| [`groupDM`](../browser/groupDM.js) | Create group DM conversations and send messages to them. | `x.com/messages` | yes | on by default |
| [`scrapeDMs`](../browser/scrapeDMs.js) | Export the open DM conversation (sender, text, timestamp, direction) as JSON, CSV or text, or list your inbox conversations. | `x.com/messages/<id>` or `x.com/messages` |  |  |
| [`sendDirectMessage`](../browser/sendDirectMessage.js) | Send a personalized DM to each user in a list, with a per-session cap, long delays, sent-history skipping and a dry run by default. | `x.com/messages` | yes | on by default |
| [`welcomeNewFollowers`](../browser/welcomeNewFollowers.js) | Detect followers who are new since the last run and draft a personalized welcome DM for each, with a dry run, a cap and long delays. | `x.com/<you>/followers` |  | on by default |

### Spaces

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`advancedSpaces`](../browser/advancedSpaces.js) | Join, leave, speak, co-host, record, caption, react in and end Spaces. | `x.com/*` | yes |  |
| [`hostSpace`](../browser/hostSpace.js) | Start a new Space with a title, topic and settings. | `x.com/home` | yes | on by default |
| [`joinSpace`](../browser/joinSpace.js) | Find and join live Spaces by topic, keyword or host. | `x.com/search?q=<query>` | yes | on by default |
| [`scrapeSpaces`](../browser/scrapeSpaces.js) | List the Spaces on a profile, search or timeline (live, scheduled, ended), or capture the open Space's title, host, listeners and speakers. | `x.com/<username>` or `x.com/search?q=<query>&f=live` or `x.com/i/spaces/<id>` |  |  |

### Profile and Settings

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`accountMisc`](../browser/accountMisc.js) | Account utilities: join date, login history, connected accounts, account age, and a JSON account summary. | `x.com/*` |  |  |
| [`accountSettings`](../browser/accountSettings.js) | Toggle common privacy and safety settings (protected posts, DMs, tagging, discoverability) from one script. | `x.com/settings` | yes |  |
| [`advancedNotifications`](../browser/advancedNotifications.js) | Clear notifications and configure email, push, desktop and verified-only notification settings. | `x.com/settings/notifications` | yes |  |
| [`advancedProfile`](../browser/advancedProfile.js) | Advanced profile management: header, avatar, pinned post, professional profile and profile export. | `x.com/<you>` | yes |  |
| [`advancedSettings`](../browser/advancedSettings.js) | Advanced settings and privacy management across the settings pages. | `x.com/settings` | yes |  |
| [`delegateAccess`](../browser/delegateAccess.js) | Open the delegate settings and list the accounts that can act for you. | `x.com/*` |  |  |
| [`downloadAccountData`](../browser/downloadAccountData.js) | Request X's official data archive, report its status, and download it when it is ready. | `x.com/settings/download_your_data` |  |  |
| [`idVerification`](../browser/idVerification.js) | Start ID verification, check its status and manage documents. | `x.com/*` | yes |  |
| [`multiAccount`](../browser/multiAccount.js) | Keep a local list of your X accounts with status, rotation, usage stats, import and export, from the console. | `x.com/*` |  |  |
| [`pinTweetManager`](../browser/pinTweetManager.js) | Pin your best-performing post, pin a post by URL or status id, or unpin your pinned post, with a dry run. | `x.com/<you>` or `x.com/<you>/status/<id>` | yes | on by default |
| [`qrCodeSharing`](../browser/qrCodeSharing.js) | Generate a shareable QR code for any X profile, shown in an overlay and downloadable as a PNG. | `x.com/<username>` or `x.com/*` |  |  |
| [`savedSearchManager`](../browser/savedSearchManager.js) | Save, list, run and delete saved searches. | `x.com/*` | yes |  |
| [`saveSearch`](../browser/saveSearch.js) | Save the current search query, list saved searches, or delete one. | `x.com/search?q=<query>` | yes | on by default |
| [`settingsManager`](../browser/settingsManager.js) | Export and audit the settings pages and toggle states on x.com/settings, or toggle protected posts, dry run by default. | `x.com/settings` or `x.com/settings/audience_and_tagging` |  | on by default |
| [`topicManager`](../browser/topicManager.js) | Browse, follow and unfollow Topics. | `x.com/i/topics` | yes | on by default |
| [`updateBanner`](../browser/updateBanner.js) | Guided helper for changing your profile banner. | `x.com/settings/profile` | yes |  |
| [`updateProfile`](../browser/updateProfile.js) | Update your display name, bio, location, website and birthdate in the Edit profile form, dry run by default. | `x.com/<you>` or `x.com/settings/profile` | yes | on by default |
| [`updateProfilePicture`](../browser/updateProfilePicture.js) | Guided helper for changing your profile picture. | `x.com/settings/profile` | yes |  |
| [`uploadContacts`](../browser/uploadContacts.js) | Open the contact upload page, start a contact upload, or disconnect synced contacts. | `x.com/*` | yes | on by default |

### Premium and Business

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`adCampaignManager`](../browser/adCampaignManager.js) | Create, review and manage ad campaigns on ads.x.com. | `x.com/*` | yes |  |
| [`adsManager`](../browser/adsManager.js) | Scan your ad campaigns and find posts worth boosting. | `x.com/*` |  |  |
| [`advancedCreator`](../browser/advancedCreator.js) | Creator monetization tools: subscriptions, revenue sharing and Media Studio helpers. | `x.com/*` | yes |  |
| [`advancedPremium`](../browser/advancedPremium.js) | Premium features: change or cancel a tier, gift Premium, reader mode, undo timer and verified-only replies. | `x.com/*` | yes |  |
| [`creatorSubscriptions`](../browser/creatorSubscriptions.js) | Review creator subscriptions, subscribers and revenue sharing. | `x.com/*` |  |  |
| [`premiumGifting`](../browser/premiumGifting.js) | Open the flow for gifting Premium to another account. | `x.com/*` |  |  |
| [`premiumManager`](../browser/premiumManager.js) | Detect your X Premium tier from on-page signals, list its features and what the next tier adds, and export the result. | `x.com/*` |  |  |
| [`subscribePremium`](../browser/subscribePremium.js) | Open the Premium subscription page and show the plans. | `x.com/*` |  |  |
| [`xPro`](../browser/xPro.js) | Open X Pro (TweetDeck) and add search columns. | `x.com/*` | yes |  |
| [`xProManager`](../browser/xProManager.js) | X Pro (TweetDeck) automation: decks, columns and layouts. | `x.com/*` | yes |  |

### AI

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`advancedGrok`](../browser/advancedGrok.js) | Advanced Grok features: prompts, image generation, conversation history and exports. | `x.com/i/grok` |  |  |
| [`grokIntegration`](../browser/grokIntegration.js) | Send prompts to Grok and collect its responses. | `x.com/i/grok` |  |  |
| [`personaEngine`](../browser/personaEngine.js) | Analyze your posting style and build a persona profile for the algorithm builder. | `x.com/<you>` |  |  |

### Automation Suite

| Script | What it does | Run it on | Writes | Dry run |
|--------|--------------|-----------|--------|---------|
| [`actions`](../browser/actions.js) | Library of X actions (like, follow, post, DM, lists and more) on window.XActions for the other automation scripts. Paste [`core.js`](../browser/core.js) first. | `x.com/*` | yes |  |
| [`blacklist`](../browser/blacklist.js) | Keep a list of users the other automation scripts skip. | `x.com/*` |  |  |
| [`controlPanel`](../browser/controlPanel.js) | Floating control panel that starts, stops and monitors the automation scripts. Paste [`core.js`](../browser/core.js) first. | `x.com/*` | yes |  |
| [`core`](../browser/core.js) | Shared config, selectors, storage, logging and rate limiting that the automation scripts load from window.XActions.Core. | `x.com/*` |  |  |
| [`filterManager`](../browser/filterManager.js) | Configure the shared filters the automation scripts apply. | `x.com/*` |  |  |
| [`quotaSupervisor`](../browser/quotaSupervisor.js) | Watch the action quotas of running automations and pause them before X limits the account. Paste [`core.js`](../browser/core.js) first. | `x.com/*` |  |  |
| [`rateLimiter`](../browser/rateLimiter.js) | Rate limiting and quota helper shared by the action scripts. | `x.com/*` |  |  |
| [`sessionLogger`](../browser/sessionLogger.js) | Log what the automation scripts did in a session and export the analytics. Paste [`core.js`](../browser/core.js) first. | `x.com/*` |  |  |
| [`whitelist`](../browser/whitelist.js) | Keep a list of users the other automation scripts never act on. | `x.com/*` |  |  |

<!-- AUTOGEN:SCRIPTS end -->

---

## Writing your own

Browser scripts in this repo follow one shape, and matching it keeps the
catalog above accurate (it is generated from these headers). Put the file in
`browser/`, with these tags in its first doc block:

```js
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        myScript.js
 * @title       My Script
 * @description One sentence describing what it does.
 * @category    cleanup
 * @page        x.com/home
 * @writes      true
 */
(() => {
  const CONFIG = {
    dryRun: true,
    delay: 2000,
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ... your logic
})();
```

Rules that keep a script safe to publish:

- Wrap everything in an IIFE so it cannot collide with page globals.
- Put every tunable value in a `CONFIG` object at the top, not inline.
- Default `dryRun` to `true` for anything that writes.
- Never hardcode a delay below 1000ms.
- Log progress. A silent script is indistinguishable from a hung one.

`@category` is one of the `categories` ids in `browser/index.json`. `@page`
takes `<you>`, `<username>`, `<id>` and `<query>` placeholders, and
alternatives joined by ` or `. When a script replaces an older file, list that
path in `@aliases` (comma separated) and the build keeps it as a generated copy.

Then rebuild the manifest and the catalog:

```bash
npm run browser:build
npm run docs:scripts
```

See [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Related

- [Getting Started](getting-started.md) — install the CLI and library
- [CLI Reference](cli-reference.md) — the same operations from a terminal
- [Troubleshooting](troubleshooting.md) — when a script finds nothing
- [Examples](../examples/) — runnable Node.js programs
