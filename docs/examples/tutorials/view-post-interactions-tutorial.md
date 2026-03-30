# View Post Interactions -- Tutorial

> Step-by-step guide to viewing who liked, reposted, quoted, and bookmarked a post on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to any tweet page on x.com (or any x.com page)
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `src/postInteractions.js`
4. Paste into the console and press Enter
5. Call functions via `window.XActions.postInteractions.<function>(url)`

## Configuration

```js
const CONFIG = {
  scrollDelay: 2000,
  actionDelay: 1500,
  navigationDelay: 3000,
  maxScrollAttempts: 50,
  maxEmptyScrolls: 5,
  maxUsers: 500,
  autoExport: true,       // Auto-download results as JSON
  saveToSession: true,    // Save to sessionStorage
};
```

## Available Functions

After pasting the script, a menu is displayed:

| Function | Description |
|----------|-------------|
| `.viewLikes(url)` | Scrape users who liked a post |
| `.viewReposts(url)` | Scrape users who reposted |
| `.viewQuotes(url)` | Scrape quote tweets with text |
| `.viewEditHistory(url)` | View all versions of an edited post |
| `.embedPost(url)` | Get embed HTML, copy to clipboard |
| `.copyLink(url?)` | Copy permanent link to clipboard |
| `.notInterested(url?)` | Mark "Not interested in this post" |
| `.translatePost(url?)` | Click "Translate post" if available |
| `.viewSourceLabel(url?)` | Extract source / "Posted via" label |
| `.muteConversation(url?)` | Mute a conversation thread |
| `.reportPost(url, cat?)` | Report post (spam, abuse, etc.) |
| `.requestCommunityNote(url)` | Request a Community Note |
| `.openCommunityNotes()` | Open Community Notes dashboard |
| `.writeCommunityNote(url)` | Write a Community Note on a post |

Functions marked with `url?` are optional -- if omitted and you are on a tweet page, the current tweet is used.

## Step-by-Step Guide

### View Who Liked a Post

**Step 1:** Paste `src/postInteractions.js` into the console.

**Step 2:** Call `viewLikes` with a tweet URL:

```js
await XActions.postInteractions.viewLikes('https://x.com/nichxbt/status/123456789');
```

**Step 3:** The script navigates to the likes page and scrapes all users:

```
Navigating to likes page...
Scraping likes...
Found 50 likes so far...
Found 100 likes so far...
Reached end of likes list.
Scraped 142 likes.

| Username    | Name          | Bio                          | Verified |
|-------------|---------------|------------------------------|----------|
| @user1      | User One      | AI researcher at...          |          |
| @user2      | User Two      | Building cool things         | check    |
```

**Step 4:** Results are auto-exported as JSON and saved to sessionStorage:

```js
// Retrieve later:
JSON.parse(sessionStorage.getItem('xactions_post_likes'));
```

### View Who Reposted

```js
await XActions.postInteractions.viewReposts('https://x.com/nichxbt/status/123456789');
```

Same output format as viewLikes. Results saved to `xactions_post_reposts`.

### View Quote Tweets

```js
await XActions.postInteractions.viewQuotes('https://x.com/nichxbt/status/123456789');
```

This scrapes the quote tweets page and returns each quote with its text:

```
Scraping quote tweets...
Found 12 quotes so far...
Scraped 18 quote tweets.

| User     | Text                                    | Time       |
|----------|-----------------------------------------|------------|
| @quoter1 | This is such a great take...            | 2026-03-28 |
| @quoter2 | I disagree with the premise but...      | 2026-03-29 |
```

Results saved to `xactions_post_quotes`.

### View Edit History

```js
await XActions.postInteractions.viewEditHistory('https://x.com/user/status/123456789');
```

Shows all versions of an edited post:

```
Found 3 version(s) of this post.

Version 1 (Mar 28, 2026):
  Original text here with a typo

Version 2 (Mar 28, 2026):
  Original text here without the typo

Version 3 (Mar 29, 2026):
  Updated text with new information added
```

### Get Embed Code

```js
await XActions.postInteractions.embedPost('https://x.com/nichxbt/status/123456789');
```

Fetches the embed HTML via the oEmbed API and copies it to your clipboard:

```
Fetching embed code via oEmbed API...
Embed HTML copied to clipboard!

<blockquote class="twitter-tweet">...</blockquote>
<script async src="https://platform.twitter.com/widgets.js"></script>
```

### Copy Post Link

```js
// With URL:
await XActions.postInteractions.copyLink('https://x.com/nichxbt/status/123456789');

// Or if you're on the tweet page:
await XActions.postInteractions.copyLink();
```

### Other Actions

**Mark "Not Interested":**

```js
await XActions.postInteractions.notInterested('https://x.com/user/status/123');
```

**Translate a post:**

```js
await XActions.postInteractions.translatePost('https://x.com/user/status/123');
```

**Mute a conversation:**

```js
await XActions.postInteractions.muteConversation('https://x.com/user/status/123');
```

**Report a post:**

```js
await XActions.postInteractions.reportPost('https://x.com/user/status/123', 'spam');
// Categories: spam, abuse, harmful, misleading, violence, privacy, hateful, self-harm, illegal
```

**Community Notes:**

```js
// Open the Community Notes dashboard
await XActions.postInteractions.openCommunityNotes();

// Request a Community Note on a tweet
await XActions.postInteractions.requestCommunityNote('https://x.com/user/status/123');

// Write a Community Note
await XActions.postInteractions.writeCommunityNote('https://x.com/user/status/123');
```

## Tips & Tricks

- **All scraping functions auto-export.** JSON files are downloaded automatically when `autoExport: true`.
- **SessionStorage keys** for each function: `xactions_post_likes`, `xactions_post_reposts`, `xactions_post_quotes`, `xactions_edit_history`, `xactions_embed_html`.
- **Functions with `url?`** (optional URL) work on the current page if you are already viewing a tweet.
- **`maxUsers: 500`** caps the scraping to avoid excessive scrolling. Increase for popular posts.
- **The embed function uses the oEmbed API** (`publish.twitter.com`) which works without any authentication.
- **viewQuotes scrapes the actual quote tweet text**, not just the users -- useful for sentiment analysis.
- **Use `console.table()`** to display results in a nice table format. The script does this automatically.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid tweet URL" | Use the full format: `https://x.com/username/status/1234567890` |
| "No tweet found on this page" | Navigate to a tweet page or pass a URL argument |
| Scraping stops early | Increase `maxScrollAttempts` and `maxUsers` |
| "Translate post" not found | The post may already be in your language |
| "Not interested" not in menu | Not all tweets show this option |
| Community Note features fail | Requires Community Notes contributor enrollment |
| "Could not copy to clipboard" | Clipboard requires user gesture. Copy from console output. |

## Related Scripts

- `src/shareEmbed.js` -- Bulk copy links and embed codes
- `src/bookmarkOrganizer.js` -- Export and categorize bookmarks
- `src/reportSpam.js` -- Report multiple spam accounts
