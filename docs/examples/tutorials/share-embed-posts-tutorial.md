# Share & Embed Posts -- Tutorial

> Step-by-step guide to copying post links and getting embed codes on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to any timeline, profile, or search page on x.com
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `browser/shareEmbed.js`
4. Edit the `CONFIG` section (mode, URLs)
5. Paste into the console and press Enter

## Configuration

### Mode Selection

```js
const CONFIG = {
  mode: 'bulkCopy',  // 'copyLinks', 'embedSingle', or 'bulkCopy'
};
```

- **`copyLinks`**: Copy links for specific posts from a URL list
- **`embedSingle`**: Get the embed code for a single post
- **`bulkCopy`**: Scroll the timeline and collect all visible post links

### Mode-Specific Settings

#### copyLinks Mode

```js
postUrls: [
  'https://x.com/nichxbt/status/123456789',
  'https://x.com/openai/status/987654321',
],
```

#### embedSingle Mode

```js
embedUrl: 'https://x.com/nichxbt/status/123456789',
```

#### bulkCopy Mode

```js
maxPosts: 50,
maxScrollAttempts: 20,
```

### Full CONFIG Reference

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | `'bulkCopy'` | Operation mode |
| `postUrls` | `[]` | URLs for copyLinks mode |
| `embedUrl` | `''` | URL for embedSingle mode |
| `maxPosts` | `50` | Max posts to collect in bulkCopy mode |
| `maxScrollAttempts` | `20` | Max scrolls before stopping |
| `scrollDelay` | `2000` | Delay between scrolls |

## Step-by-Step Guide

### Copy Links for Specific Posts

**Step 1:** Set mode and add your URLs:

```js
const CONFIG = {
  mode: 'copyLinks',
  postUrls: [
    'https://x.com/nichxbt/status/123456789',
    'https://x.com/openai/status/987654321',
  ],
};
```

**Step 2:** Paste the script. All URLs are copied to your clipboard:

```
3 links copied to clipboard!
```

If clipboard access is denied, the links are printed in the console.

### Get Embed Code for a Post

**Step 1:** Set mode to `embedSingle` with the post URL:

```js
const CONFIG = {
  mode: 'embedSingle',
  embedUrl: 'https://x.com/nichxbt/status/123456789',
};
```

**Step 2:** Paste the script. It opens the share menu and clicks "Embed post":

```
Embed dialog opened!
Direct embed URL: https://publish.twitter.com/?url=...
```

**Step 3:** Copy the embed HTML from the dialog, or visit the `publish.twitter.com` URL for the full embed code.

The embed HTML looks like:

```html
<blockquote class="twitter-tweet">
  <p lang="en" dir="ltr">Your tweet text here</p>
  &mdash; Author (@username) <a href="https://x.com/username/status/123">March 30, 2026</a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
```

### Bulk Copy Links from Timeline

**Step 1:** Navigate to any page with a feed of posts (home timeline, profile, search results, list).

**Step 2:** Set mode to `bulkCopy`:

```js
const CONFIG = {
  mode: 'bulkCopy',
  maxPosts: 100,
  maxScrollAttempts: 30,
};
```

**Step 3:** Paste the script. It scrolls the page and collects all post URLs:

```
Collected 25 links so far...
Collected 50 links so far...
Collected 78 links so far...

78 links copied to clipboard!
Saved to sessionStorage (key: "xactions_bulk_links")

Collected Links:
  1. https://x.com/user1/status/111
  2. https://x.com/user2/status/222
  ...
```

**Step 4:** Links are also saved to sessionStorage. Retrieve them later:

```js
JSON.parse(sessionStorage.getItem('xactions_bulk_links'));
```

## Tips & Tricks

- **Bulk copy from search results** is great for content curation. Search for a topic, then bulk-copy all the post links.
- **The embed URL fallback** (`publish.twitter.com`) always works even if the in-page embed dialog fails.
- **Links are saved to sessionStorage** under `xactions_bulk_links`, so you can access them programmatically.
- **Clipboard access** requires the page to have focus. If copying fails, the links are still printed in the console.
- **Use bulk copy on a profile page** to quickly get all recent post URLs from a specific user.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Clipboard access denied" | Links are still printed in the console. Copy from there. |
| "Share button not found" | X may have changed the share button selector. |
| "Embed option not found" | Some posts may not support embedding. Use the `publish.twitter.com` URL. |
| Bulk copy stops early | Increase `maxScrollAttempts` |
| Missing some posts | Increase `scrollDelay` to give the page more time to load |

## Related Scripts

- `src/bookmarkManager.js` -- Bookmark management
- `browser/postInteractions.js` -- View likes, reposts, quotes on a post
- `browser/pinTweetManager.js` -- Pin/unpin posts on your profile
