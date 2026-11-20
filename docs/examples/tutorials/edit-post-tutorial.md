# Edit Posts -- Tutorial

> Step-by-step guide to editing existing posts on X/Twitter using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- **X Premium subscription** (edit is a Premium-only feature)
- The post must be your own and less than 1 hour old

## Quick Start
1. Navigate to the post you want to edit on x.com
2. Open DevTools (F12)
3. Copy the script from `browser/editPost.js`
4. Set `CONFIG.mode = 'edit'`
5. Set `CONFIG.postUrl` and `CONFIG.newText`
6. Paste into Console and press Enter

## Edit Limitations

| Constraint | Value |
|------------|-------|
| Subscription | X Premium required |
| Time window | 1 hour after posting |
| Max edits | 5 edits per post |
| Edit history | Visible to all users |
| Media | Can be modified during edit |
| Engagement | Likes, reposts, and replies are preserved |

## Configuration

```js
const CONFIG = {
  mode: 'edit',
  postUrl: 'https://x.com/yourhandle/status/123456789',
  newText: 'Updated text for this post',

  // Timing
  minDelay: 1000,
  maxDelay: 2000,
  navigationDelay: 3000,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `string` | `'edit'` | Set to `'edit'` for editing posts |
| `postUrl` | `string` | `''` | Full URL of the post to edit |
| `newText` | `string` | `''` | Replacement text for the post |
| `navigationDelay` | `number` | `3000` | Wait time for page/modal to load |

## Step-by-Step Guide

### Editing a Post (Browser Console)

1. Copy `browser/editPost.js`
2. Set your configuration:
   ```js
   const CONFIG = {
     mode: 'edit',
     postUrl: 'https://x.com/nichxbt/status/123456789',
     newText: 'Fixed the typo in this post!',
   };
   ```
3. Paste and run in DevTools

The script performs these steps:

1. **Navigate**: Goes to the post URL if not already there
2. **Find the tweet**: Locates the tweet article element (`article[data-testid="tweet"]`)
3. **Open menu**: Clicks the three-dot menu (`[data-testid="caret"]`) on the tweet
4. **Click Edit**: Finds and clicks "Edit post" (`[data-testid="editTweet"]`)
5. **Clear text**: Selects all existing text with `selectAll`
6. **Type new text**: Inserts the replacement text using `insertText`
7. **Save**: Clicks the save button (`[data-testid="tweetButton"]`)

### How the Edit Flow Works Internally

```js
// From browser/editPost.js -- key steps:

// 1. Find the tweet on the page
const tweet = await waitForElement('article[data-testid="tweet"]');

// 2. Open the three-dot menu
const caret = tweet.querySelector('[data-testid="caret"]');
caret.click();

// 3. Click "Edit post"
const editBtn = await waitForElement('[data-testid="editTweet"]');
editBtn.click();

// 4. Clear and replace text
const textarea = await waitForElement('[data-testid="tweetTextarea_0"]');
textarea.focus();
document.execCommand('selectAll', false, null);
document.execCommand('insertText', false, CONFIG.newText);

// 5. Save
const saveBtn = await waitForElement('[data-testid="tweetButton"]');
saveBtn.click();
```

### Edit History

Every edit is tracked and visible to all users:
- An "Edited" label appears on the post
- Users can click it to see the full edit history
- Each version of the post is preserved with its timestamp

This means you cannot silently fix mistakes -- all versions are public.

### What You Can Edit

- Tweet text content
- Attached media (add, remove, or replace)
- Alt text on images
- Tagged users

### What You Cannot Edit

- Poll options or duration (polls cannot be edited)
- The post's timestamp
- Engagement metrics (likes, reposts carry over)
- Thread structure (cannot add/remove tweets from a thread)

## Tips & Tricks

- **Act fast**: You only have 1 hour from the original post time to make edits
- **5 edit limit**: Each post can only be edited 5 times total, so make your changes count
- **Proofread first**: Since edit history is public, try to get it right in fewer edits
- **No silent fixes**: All versions are visible, so major content changes will be noticed
- **Media edits**: You can swap out images or add/remove media during an edit
- **Edit vs delete and repost**: For major errors within the first few minutes, deleting and reposting may be preferable to editing (no edit history trail)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Edit post" not in menu | You need X Premium. Free accounts cannot edit posts. |
| Edit option grayed out | The 1-hour window has expired. You can no longer edit this post. |
| "5 edits reached" | Each post allows a maximum of 5 edits. No more changes are possible. |
| Caret/menu not found | Make sure you are on the post's direct URL (not in the timeline view). |
| Text not replacing | The `selectAll` + `insertText` method may fail if the editor has changed. Try clearing manually first. |
| Post not yours | You can only edit your own posts. The edit option will not appear for others' posts. |

## Related Scripts

- `browser/editPost.js` (undo mode) -- Undo a recently posted tweet
- `src/postComposer.js` -- Create new posts
- `docs/examples/tutorials/undo-post-tutorial.md` -- Undo post guide
