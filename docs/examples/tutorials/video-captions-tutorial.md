# Upload Video Captions -- Tutorial

> Step-by-step guide to adding captions and subtitles to video tweets using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- A video already uploaded in the tweet compose dialog
- Caption content in SRT or VTT format

## Quick Start
1. Navigate to x.com
2. Open the tweet composer and upload a video
3. Wait for the video to finish processing
4. Open DevTools (F12)
5. Copy the script from `browser/videoCaptions.js`
6. Edit the CONFIG section with your caption content
7. Paste into Console and press Enter

## Configuration

```js
const CONFIG = {
  // Raw caption text in SRT or VTT format
  captionText: '',

  // Caption language
  language: 'en',
  languageLabel: 'English',

  // Optional tweet text to include
  tweetText: '',

  // Timing
  minDelay: 1000,
  maxDelay: 2000,
  uploadWaitTime: 5000,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `captionText` | `string` | `''` | Raw caption text in SRT or VTT format |
| `language` | `string` | `'en'` | Language code (e.g., `'en'`, `'es'`, `'fr'`, `'ja'`) |
| `languageLabel` | `string` | `'English'` | Display name for the language |
| `tweetText` | `string` | `''` | Text to include with the video tweet |
| `uploadWaitTime` | `number` | `5000` | Milliseconds to wait for video processing |

## Caption Formats

### SRT Format

SRT (SubRip) is the most common caption format. Each entry has an index, time range, and text:

```
1
00:00:00,000 --> 00:00:05,000
Welcome to this tutorial on XActions.

2
00:00:05,000 --> 00:00:10,000
Today we will learn about browser automation.

3
00:00:10,000 --> 00:00:15,000
Let's get started!
```

Rules:
- Each caption block starts with a sequence number
- Timestamps use `HH:MM:SS,mmm` format (comma for milliseconds)
- A blank line separates each block
- Blocks are numbered sequentially starting from 1

### VTT Format

WebVTT is the web-native caption format. It starts with a `WEBVTT` header:

```
WEBVTT

00:00:00.000 --> 00:00:05.000
Welcome to this tutorial on XActions.

00:00:05.000 --> 00:00:10.000
Today we will learn about browser automation.

00:00:10.000 --> 00:00:15.000
Let's get started!
```

Rules:
- Must start with `WEBVTT` on the first line
- Timestamps use `HH:MM:SS.mmm` format (period for milliseconds)
- Sequence numbers are optional
- Supports styling tags like `<b>bold</b>` and `<i>italic</i>`

## Step-by-Step Guide

### 1. Prepare Your Caption Content

Write your captions in SRT or VTT format. Set them in the CONFIG:

```js
const CONFIG = {
  captionText: `1
00:00:00,000 --> 00:00:03,000
This is the first caption.

2
00:00:03,000 --> 00:00:06,000
And here is the second one.

3
00:00:06,000 --> 00:00:10,000
The video wraps up here.`,

  language: 'en',
  languageLabel: 'English',
  tweetText: 'Check out this video with captions!',
};
```

### 2. Upload Your Video

Before running the caption script:
1. Click the compose button on x.com
2. Click the media icon and select your video file
3. Wait for the video to finish processing (the progress bar completes)

### 3. Run the Caption Script

Paste `browser/videoCaptions.js` into the DevTools console. The script will:

1. Verify the compose dialog is open (`[data-testid="tweetTextarea_0"]`)
2. Check that media attachments exist (`[data-testid="attachments"]`)
3. Look for the "Add captions" button (`[data-testid="addCaptions"]`)
4. Detect the caption format (SRT vs VTT) from the content
5. Create a caption file blob with the correct MIME type
6. Upload via the caption file input (`[data-testid="captionFileInput"]`)
7. Optionally add tweet text to the compose box

### 4. Review and Post

After the script runs:
- Verify the caption indicator appears on the video preview
- Review the tweet text
- Click "Post" to publish

## How Caption Upload Works Internally

The script creates an in-memory file using the Blob API:

```js
// The script detects the format
const format = captionContent.trim().startsWith('WEBVTT') ? 'vtt' : 'srt';

// Creates a File object
const mimeType = format === 'vtt' ? 'text/vtt' : 'application/x-subrip';
const blob = new Blob([captionContent], { type: mimeType });
const file = new File([blob], `captions_en.srt`, { type: mimeType });

// Uploads via DataTransfer API
const dataTransfer = new DataTransfer();
dataTransfer.items.add(file);
captionInput.files = dataTransfer.files;
captionInput.dispatchEvent(new Event('change', { bubbles: true }));
```

If the primary caption input is not found, the script falls back to searching all file inputs for one that accepts `.srt` or `.vtt` files.

## Multiple Languages

To add captions in multiple languages, run the script multiple times with different language settings:

```js
// First run: English
CONFIG.captionText = '...English captions...';
CONFIG.language = 'en';
CONFIG.languageLabel = 'English';

// Second run: Spanish
CONFIG.captionText = '...Spanish captions...';
CONFIG.language = 'es';
CONFIG.languageLabel = 'Spanish';
```

## Tips & Tricks

- **Upload video first**: The script checks for media attachments before attempting caption upload. Always upload the video and wait for processing first.
- **SRT is safest**: While both formats are supported, SRT has wider compatibility.
- **Timing accuracy**: Align caption timestamps closely with speech for the best viewer experience.
- **Keep captions short**: Aim for 1-2 lines per caption block and no more than 42 characters per line for readability.
- **Sample captions**: If `captionText` is empty, the script generates sample SRT content as a placeholder.
- **Caption tools**: Use tools like Subtitle Edit or Aegisub to create professional caption files.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Compose dialog not found" | Open the tweet composer before running the script. Click the Post button or navigate to x.com/compose/tweet. |
| "No media attachments detected" | Upload a video first and wait for it to finish processing before running the caption script. |
| "Add captions button not found" | The caption option may not be available for all video types. Try clicking on the video thumbnail to access settings. |
| "Could not find caption file input" | The caption upload UI may have changed. Try uploading captions manually through the X interface. |
| Captions not showing on playback | Verify your timestamp format is correct. SRT uses commas (`00:00:00,000`), VTT uses periods (`00:00:00.000`). |

## Related Scripts

- `src/postComposer.js` -- Post tweets with video media
- `browser/postThread.js` -- Post threads with video content
- `docs/examples/tutorials/add-media-tutorial.md` -- General media upload guide
- `docs/examples/tutorials/alt-text-tutorial.md` -- Adding image descriptions
