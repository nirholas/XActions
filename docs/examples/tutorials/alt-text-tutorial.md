# Add Image Descriptions (ALT Text) -- Tutorial

> Step-by-step guide to adding accessibility descriptions (alt text) to images in X/Twitter posts using XActions.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- For Node.js usage: `npm install xactions` and a valid session cookie

## Quick Start
1. Navigate to x.com
2. Open DevTools (F12)
3. Use `src/postComposer.js` with the `altText` option
4. Alt text is added automatically after media upload

## Why Alt Text Matters

- **Accessibility**: Screen readers use alt text to describe images to visually impaired users
- **Search**: Alt text helps X index your content for search results
- **Engagement**: Posts with alt text reach a wider audience
- **Best practice**: Many communities and organizations require alt text on all images

## Configuration

### Node.js / Puppeteer (`src/postComposer.js`)

```js
import { postTweet } from './src/postComposer.js';

await postTweet(page, 'Beautiful architecture in Barcelona!', {
  media: '/path/to/gaudi-building.jpg',
  altText: 'The facade of Casa Batllo by Antoni Gaudi, featuring colorful mosaic tiles and organic bone-like balcony railings',
});
```

The `altText` option is passed alongside `media`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `media` | `string` | `null` | Path to the image file |
| `altText` | `string` | `null` | Descriptive text for the image (max 1000 chars) |

### Browser Console (Manual)

After uploading an image in the compose dialog:

```js
// Wait for the image to upload, then find and click the ALT text input
const altInput = document.querySelector('[data-testid="altTextInput"]');
if (altInput) {
  altInput.click();
  // Type your description
  document.execCommand('insertText', false, 'Description of the image');
}
```

## Step-by-Step Guide

### How Alt Text Works in postComposer.js

When you pass `altText` to `postTweet`, here is what happens:

1. The script uploads the media file via `[data-testid="fileInput"]`
2. It waits 2 seconds for X to process the upload
3. It clicks the alt text input (`[data-testid="altTextInput"]`)
4. It types the description text
5. The alt text is saved with the image

```js
// From src/postComposer.js -- the relevant section:
if (media) {
  const fileInput = await page.$(SELECTORS.mediaInput);
  if (fileInput) {
    await fileInput.uploadFile(media);
    await sleep(2000);

    // Add alt text if provided
    if (altText) {
      try {
        await page.click(SELECTORS.altTextInput);
        await page.keyboard.type(altText);
        await sleep(500);
      } catch (e) {
        console.log('Warning: Alt text input not found');
      }
    }
  }
}
```

### Adding Alt Text Manually (Browser Console)

If you are composing a tweet manually and want to add alt text:

1. Open the compose dialog and upload an image
2. Look for the "ALT" badge or "Add description" button on the image thumbnail
3. Click it to open the alt text editor
4. Type your description (up to 1000 characters)
5. Save and post

To do this via the console:

```js
// Step 1: Find the ALT button on the uploaded image
const altButton = document.querySelector('[data-testid="altTextInput"]')
  || document.querySelector('[aria-label="Add description"]')
  || document.querySelector('button[data-testid="altText"]');

if (altButton) {
  altButton.click();

  // Step 2: Wait and type
  setTimeout(() => {
    const input = document.querySelector('[data-testid="altTextInput"]')
      || document.activeElement;
    if (input) {
      input.focus();
      document.execCommand('insertText', false, 'Your image description here');
    }
  }, 500);
}
```

## Writing Good Alt Text

### Do

- **Be specific**: "A golden retriever puppy sitting on a red couch" is better than "A dog"
- **Describe the content**: What is in the image? What is happening?
- **Include relevant text**: If the image contains text (screenshots, charts), include that text
- **Mention context**: Colors, positions, actions, and emotions when relevant
- **Keep it concise**: 1-2 sentences for simple images, more for complex ones

### Do Not

- Start with "Image of" or "Picture of" -- screen readers already announce it as an image
- Include irrelevant details that do not add meaning
- Use alt text for hashtags or promotional content
- Leave it blank when the image conveys information

### Examples

| Image | Bad Alt Text | Good Alt Text |
|-------|-------------|---------------|
| Product screenshot | "Screenshot" | "Dashboard showing 45% increase in monthly active users with a line chart trending upward from January to March" |
| Infographic | "Infographic" | "Comparison table: React has 225k GitHub stars, Vue has 208k, Angular has 96k, Svelte has 79k" |
| Meme | "Funny meme" | "Drake meme: top panel shows Drake rejecting 'writing tests after the code', bottom panel shows Drake approving 'writing tests before the code'" |
| Chart | "Chart" | "Bar chart showing JavaScript at 65%, Python at 48%, and Rust at 12% developer usage in 2026" |

## Alt Text Limits

| Property | Value |
|----------|-------|
| Max characters | 1,000 |
| Min characters | None (but should be meaningful) |
| Supported on | Photos, GIFs |
| Not supported on | Videos (use captions instead), links |

## Tips & Tricks

- **Always add alt text**: It takes seconds and makes your content accessible to millions of users
- **Describe charts and data**: Screen readers cannot interpret visual data -- describe the key takeaways
- **For screenshots**: Include the important text content visible in the screenshot
- **For memes**: Describe the meme format and the text on it
- **Multiple images**: Add alt text to each image individually
- **Use the fallback**: If `[data-testid="altTextInput"]` is not found, the alt text step is skipped gracefully with a warning

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Alt text input not found | The alt text button appears on the image thumbnail after upload. You may need to click the image first. |
| Alt text not saving | Make sure you click outside the input or press Tab after typing to confirm the text. |
| Character limit exceeded | Alt text is limited to 1,000 characters. Shorten your description. |
| Alt text on GIFs | GIFs from X's built-in GIF picker have pre-set alt text. Custom GIFs need manual alt text. |
| Multiple images | Each image has its own alt text. Click on each thumbnail individually. |

## Related Scripts

- `src/postComposer.js` -- Post with media and alt text
- `browser/videoCaptions.js` -- Add captions to videos (the video equivalent of alt text)
- `docs/examples/tutorials/add-media-tutorial.md` -- General media upload guide
- `docs/examples/tutorials/post-content-tutorial.md` -- Complete posting guide
