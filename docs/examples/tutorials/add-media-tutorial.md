# Add Media to Posts -- Tutorial

> Step-by-step guide to adding photos, GIFs, videos, and links to X/Twitter posts using XActions.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- For Node.js usage: `npm install xactions` and a valid session cookie

## Quick Start
1. Navigate to x.com
2. Open DevTools (F12)
3. Use `src/postComposer.js` to post with media
4. Pass the `media` option with a local file path
5. Optionally add `altText` for accessibility

## Supported Media Types

| Type | Formats | Max Size | Max Count |
|------|---------|----------|-----------|
| Photos | JPG, PNG, WebP | 5MB each | Up to 4 per tweet |
| GIFs | GIF | 15MB | 1 per tweet |
| Videos | MP4, MOV | 512MB (free), 8GB (Premium+) | 1 per tweet |
| Links | Any URL | N/A | Automatic preview card |

## Configuration

### Node.js / Puppeteer (`src/postComposer.js`)

```js
import { postTweet } from './src/postComposer.js';

// Post with a photo
await postTweet(page, 'Beautiful sunset today!', {
  media: '/path/to/sunset.jpg',
  altText: 'A golden sunset over the ocean with silhouetted palm trees',
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `media` | `string` | `null` | Absolute path to a local image, GIF, or video file |
| `altText` | `string` | `null` | Accessibility description for the media |

## Step-by-Step Guide

### Uploading Photos (Node.js / Puppeteer)

```js
import { postTweet } from './src/postComposer.js';

// Single photo
await postTweet(page, 'Check this out!', {
  media: '/home/user/photos/landscape.jpg',
  altText: 'Mountain landscape with snow-capped peaks',
});
```

How it works internally:
1. The script finds the hidden file input: `[data-testid="fileInput"]`
2. Calls `uploadFile()` on the input element with the local file path
3. Waits 2 seconds for X to process the upload
4. If `altText` is provided, clicks `[data-testid="altTextInput"]` and types the description

### Uploading Photos (Browser Console)

In the browser console, you cannot use `uploadFile()` directly. Instead, use the file input with DataTransfer:

```js
// First, open the compose dialog and have it ready
// Then trigger the file picker:
const fileInput = document.querySelector('[data-testid="fileInput"]');
fileInput.click();
// This opens the native file picker -- select your image manually
```

Alternatively, you can drag and drop an image onto the compose box.

### Adding GIFs

X has a built-in GIF picker. To use it programmatically:

```js
// Browser console: open the GIF picker
document.querySelector('[aria-label="Add a GIF"]').click();
```

For Puppeteer, you can upload a GIF file the same way as a photo:

```js
await postTweet(page, 'Mood today', {
  media: '/path/to/reaction.gif',
});
```

Note: You can only attach 1 GIF per tweet, and you cannot combine a GIF with photos.

### Uploading Videos

Videos work the same as photos through the file input:

```js
await postTweet(page, 'Watch this demo!', {
  media: '/path/to/demo.mp4',
});
```

Video processing takes longer than photos. The 2-second wait in `postComposer.js` may not be enough for large videos. For larger files, increase the wait time or check for the processing indicator.

### Adding Links

Links are simply included in the tweet text. X automatically generates a preview card:

```js
await postTweet(page, 'Great article on AI agents https://example.com/article');
```

- The URL counts toward your character limit
- X fetches Open Graph metadata from the URL to generate the card
- Preview cards may take a few seconds to appear

### Media in Threads

When creating threads, you can attach media to individual tweets:

```js
import { postThread } from './src/postComposer.js';

await postThread(page, [
  { text: 'Thread about our product launch!', media: '/path/to/hero.jpg' },
  'Here is what we built and why...',
  { text: 'The architecture diagram:', media: '/path/to/diagram.png' },
  'Thanks for reading! Let us know what you think.',
]);
```

## Media Specifications

### Photo Requirements

| Property | Requirement |
|----------|-------------|
| Format | JPG, PNG, WebP |
| Max size | 5MB per image |
| Max images | 4 per tweet |
| Recommended | 1200x675px (16:9) for best display |
| Min size | 4x4 pixels |

### Video Requirements

| Property | Free | Premium | Premium+ |
|----------|------|---------|----------|
| Max length | 2 min 20 sec | 60 min | 3 hours |
| Max file size | 512MB | 2GB | 8GB |
| Format | MP4, MOV | MP4, MOV | MP4, MOV |
| Resolution | Up to 1920x1200 | Up to 1920x1200 | Up to 4K |

### GIF Requirements

| Property | Requirement |
|----------|-------------|
| Format | GIF |
| Max size | 15MB |
| Max per tweet | 1 |
| Cannot combine with | Photos or videos |

## Tips & Tricks

- **Alt text matters**: Always add alt text for accessibility. It also helps with search visibility on X.
- **Image optimization**: Compress images before uploading. Tools like `sharp` or `imagemin` can reduce file sizes.
- **Video thumbnails**: X auto-generates thumbnails. The first frame of your video becomes the preview.
- **Multiple photos**: X supports up to 4 photos per tweet. The Puppeteer `postTweet` currently supports 1 media file -- call `uploadFile()` multiple times for more.
- **Link placement**: Placing a link at the end of the tweet creates the cleanest layout with the preview card below the text.
- **Media + polls**: You cannot attach media and a poll to the same tweet (X limitation).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| File input not found | The selector `[data-testid="fileInput"]` may be hidden. It exists but is not visible in the DOM. |
| Upload seems stuck | Large videos take time to process. Wait for the progress bar to complete. |
| Alt text input not found | Click on the uploaded image thumbnail first -- the alt text button appears on the image preview. |
| Video too long | Free accounts are limited to 2:20. Upgrade to Premium for longer videos. |
| Image appears cropped | X crops images in the timeline. Use 16:9 aspect ratio for best results. |
| GIF not animating | The GIF may exceed size limits. Compress it or reduce the frame count. |

## Related Scripts

- `src/postComposer.js` -- Core posting with media support
- `browser/videoCaptions.js` -- Add captions/subtitles to videos
- `browser/postThread.js` -- Threads with media per tweet
- `src/articlePublisher.js` -- Long-form articles with cover images
