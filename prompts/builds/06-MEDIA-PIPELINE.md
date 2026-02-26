# Track 06 — Media Upload Pipeline

> Build a complete media upload system supporting images (JPEG, PNG, GIF, WebP), videos (MP4 up to 512MB), and animated GIFs. Uses Twitter's chunked upload API. Integrates with `sendTweet()` so users can attach media with a single call. This is a feature that `agent-twitter-client` provides and XActions needs.

---

## Research Before Starting

```
src/scrapers/videoDownloader.js     — Existing video downloader (download direction, reverse of what we're building)
src/scrapers/twitter/index.js       — Current sendTweet (if exists) via Puppeteer form fill
src/client/http/HttpClient.js       — HTTP client (Track 03)
src/client/auth/TokenManager.js     — Auth headers (Track 02)
src/postComposer.js                 — Browser-based post composer
```

Study competitor media uploads:
- `agent-twitter-client` — `sendTweet({ text, mediaData: [{ data, mediaType }] })`, chunked upload
- `twikit` — Python: `upload_media()` with chunked/simple modes

### Twitter's Media Upload API

Twitter uses a 3-phase chunked upload at `https://upload.x.com/i/media/upload.json`:

```
Phase 1 — INIT:
  POST /i/media/upload.json
  Body (form-data): command=INIT, total_bytes=<size>, media_type=<mime>, media_category=<category>
  Response: { media_id, media_id_string }

Phase 2 — APPEND (repeat for each chunk):
  POST /i/media/upload.json
  Body (form-data): command=APPEND, media_id=<id>, segment_index=<0,1,2,...>, media_data=<base64_chunk>
  Response: 204 No Content

Phase 3 — FINALIZE:
  POST /i/media/upload.json
  Body (form-data): command=FINALIZE, media_id=<id>
  Response: { media_id, processing_info?: { state, check_after_secs } }

Phase 4 — STATUS (for video/GIF, poll until processing complete):
  GET /i/media/upload.json?command=STATUS&media_id=<id>
  Response: { processing_info: { state: 'succeeded' | 'in_progress' | 'failed', progress_percent } }
```

Media categories: `tweet_image`, `tweet_gif`, `tweet_video`
Max chunk size: 5MB (5 * 1024 * 1024 bytes)
Max image size: 5MB, Max video size: 512MB, Max GIF size: 15MB

---

## Architecture

```
src/client/media/
  MediaUploader.js      ← Core upload orchestrator (INIT/APPEND/FINALIZE/STATUS)
  ChunkReader.js        ← Reads files in chunks (streaming, memory-efficient)
  MediaValidator.js     ← Validates file type, size, dimensions
  ImageProcessor.js     ← Optional image resizing/compression (sharp-free fallback)
  index.js              ← Re-exports + convenience functions
```

---

## Prompts

### Prompt 1: MediaValidator — File Validation

```
Create src/client/media/MediaValidator.js — validates media files before upload.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class MediaValidator with static methods:
  - static validate(filePath) — validates a file for Twitter upload:
    1. Check file exists (fs.stat)
    2. Detect MIME type from file extension and magic bytes (first 8 bytes):
       - JPEG: FF D8 FF
       - PNG: 89 50 4E 47
       - GIF: 47 49 46 38
       - WebP: 52 49 46 46 ... 57 45 42 50
       - MP4: ... 66 74 79 70 (ftyp at offset 4)
    3. Check size limits:
       - Images (JPEG/PNG/WebP): max 5MB
       - GIF: max 15MB
       - Video (MP4): max 512MB
    4. Return: { valid: true, mimeType, fileSize, mediaCategory } or throw ValidationError
  - static validateBuffer(buffer, filename) — same validation but from Buffer
  - static getMediaCategory(mimeType) — returns 'tweet_image' | 'tweet_gif' | 'tweet_video'
  - static getMaxSize(mimeType) — returns max bytes for the MIME type
  - static isSupportedType(mimeType) — returns boolean

Supported MIME types: image/jpeg, image/png, image/gif, image/webp, video/mp4
Custom error: class ValidationError extends Error { field, constraint, actual }

File: src/client/media/MediaValidator.js
```

### Prompt 2: ChunkReader — Memory-Efficient File Chunking

```
Create src/client/media/ChunkReader.js — reads files in chunks for the APPEND phase.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class ChunkReader with:
  - constructor({ chunkSize = 5 * 1024 * 1024 }) — 5MB default chunks
  - async *readChunks(filePath) — AsyncGenerator that yields { index, data: Buffer, isLast } for each chunk
    Uses fs.createReadStream with highWaterMark for memory efficiency
  - async *readChunksFromBuffer(buffer) — same but from a Buffer
  - getChunkCount(fileSize) — returns number of chunks needed
  - static calculateChunkSize(fileSize) — adaptive chunk size:
    - Files < 1MB: single chunk
    - Files 1-10MB: 1MB chunks
    - Files 10-100MB: 5MB chunks
    - Files > 100MB: 5MB chunks (Twitter's max)

The generator must:
- Use Node.js streams (fs.createReadStream) for files > 10MB to avoid loading into memory
- For small files (< 5MB), read the whole file as a single chunk
- Track and yield segment_index (0-based)
- Base64-encode each chunk's data (Twitter APPEND expects base64)

File: src/client/media/ChunkReader.js
```

### Prompt 3: MediaUploader — Core Upload Orchestrator

```
Create src/client/media/MediaUploader.js — orchestrates the INIT → APPEND → FINALIZE → STATUS pipeline.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class MediaUploader with:
  - constructor({ httpClient, tokenManager })
    - httpClient: HttpClient instance (Track 03)
    - tokenManager: for auth headers
  - async upload(source, options = {}) — main upload method:
    source can be:
    - string file path → read from disk
    - Buffer → upload from memory
    - { data: Buffer, mediaType: string } → upload with explicit type
    options: { mediaCategory, altText, onProgress }
    
    Flow:
    1. Validate the media (MediaValidator)
    2. INIT — POST to upload endpoint with total_bytes, media_type, media_category
    3. APPEND — for each chunk from ChunkReader, POST with media_id, segment_index, media_data (base64)
    4. FINALIZE — POST with media_id
    5. If processing_info exists (video/GIF): poll STATUS until state === 'succeeded'
    6. If altText provided: POST metadata (alt text for accessibility)
    7. Return: { mediaId: string, mediaType: string, processingStatus: string }
    
    Call onProgress({ phase, percent, chunk, totalChunks }) during upload.

  - async uploadMultiple(sources, options = {}) — upload multiple files in parallel (max 4)
    Returns array of { mediaId } objects
  - async checkStatus(mediaId) — poll processing status for a video upload
  - async addAltText(mediaId, altText) — set alt text metadata:
    POST https://api.x.com/1.1/media/metadata/create.json
    Body: { media_id: mediaId, alt_text: { text: altText } }

Upload endpoint: https://upload.x.com/i/media/upload.json
Auth: use tokenManager.getHeaders() but with Content-Type: multipart/form-data

Handle errors:
- MediaTooLargeError — file exceeds size limit
- UnsupportedMediaError — unsupported MIME type
- UploadFailedError — server rejected the upload
- ProcessingFailedError — video processing failed after upload

File: src/client/media/MediaUploader.js
```

### Prompt 4: SendTweet with Media — Integration

```
Create src/client/api/tweets.js (or update it if created in Track 01) — add the full tweet creation API including media attachments.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT

Export these functions (each accepts httpClient and tokenManager):

1. async sendTweet(httpClient, { text, mediaIds = [], replyTo = null, quoteTweetId = null }) — creates a tweet:
   POST to CreateTweet GraphQL endpoint
   Variables: {
     tweet_text: text,
     media: { media_entities: mediaIds.map(id => ({ media_id: id, tagged_users: [] })), possibly_sensitive: false },
     reply: replyTo ? { in_reply_to_tweet_id: replyTo, exclude_reply_user_ids: [] } : undefined,
     quote_tweet_id: quoteTweetId || undefined,
   }
   Returns: { id, text, createdAt }

2. async sendTweetWithMedia(httpClient, mediaUploader, { text, media, replyTo, quoteTweetId, altTexts = [] }) — convenience that uploads media then sends tweet:
   media can be: string[] (file paths), Buffer[], or { data, mediaType }[]
   1. Upload all media via mediaUploader.uploadMultiple()
   2. Set alt texts if provided
   3. Call sendTweet with resulting mediaIds
   Returns: { id, text, media: [{ mediaId, type }] }

3. async deleteTweet(httpClient, tweetId)
4. async likeTweet(httpClient, tweetId)
5. async unlikeTweet(httpClient, tweetId)
6. async retweet(httpClient, tweetId)
7. async unretweet(httpClient, tweetId)

Each function builds the correct GraphQL variables and calls httpClient.graphql().
Import query IDs from '../http/graphql.js'.

File: src/client/api/tweets.js
```

### Prompt 5: Media Module Index and Scraper Integration

```
Create src/client/media/index.js — barrel exports and convenience factory.

Export:
  export { MediaUploader } from './MediaUploader.js';
  export { MediaValidator, ValidationError } from './MediaValidator.js';
  export { ChunkReader } from './ChunkReader.js';
  export { sendTweetWithMedia } from '../api/tweets.js';

  export function createMediaUploader(options) {
    // Creates MediaUploader with httpClient and tokenManager
    // Returns configured instance
  }

Then update src/client/Scraper.js — add these methods:
  async sendTweet(text, options = {}) {
    // options: { media, replyTo, quoteTweetId, altTexts }
    // If media provided: use sendTweetWithMedia
    // Otherwise: use sendTweet from api/tweets.js
  }
  async uploadMedia(source, options = {}) {
    // Delegates to mediaUploader.upload()
  }
  async deleteTweet(tweetId) { ... }
  async like(tweetId) { ... }
  async unlike(tweetId) { ... }
  async retweet(tweetId) { ... }
  async unretweet(tweetId) { ... }

Read Scraper.js before editing — add methods, don't rewrite.

Files: src/client/media/index.js, src/client/Scraper.js (update)
```

### Prompt 6: MediaValidator Tests

```
Create tests/client/media/mediaValidator.test.js

Requirements:
- Use vitest
- Create actual test files in temp directory (write real JPEG/PNG/GIF/MP4 magic bytes)

Test cases:
1. validate() accepts valid JPEG file
2. validate() accepts valid PNG file
3. validate() accepts valid GIF file
4. validate() accepts valid WebP file
5. validate() accepts valid MP4 file
6. validate() rejects non-existent file
7. validate() rejects unsupported file type (.txt)
8. validate() rejects image over 5MB
9. validate() rejects GIF over 15MB
10. validate() rejects video over 512MB
11. validateBuffer() works with Buffer input
12. getMediaCategory() returns correct category for each type
13. getMaxSize() returns correct limits
14. isSupportedType() returns true/false correctly
15. Magic byte detection works (file with wrong extension but correct bytes)

Create minimal valid files using Buffer.from() with correct magic bytes.

File: tests/client/media/mediaValidator.test.js
```

### Prompt 7: ChunkReader Tests

```
Create tests/client/media/chunkReader.test.js

Requirements:
- Use vitest
- Create temp files of various sizes

Test cases:
1. readChunks() yields single chunk for small file (< 5MB)
2. readChunks() yields multiple chunks for large file
3. Each chunk has correct index (0-based)
4. Last chunk has isLast = true
5. All chunks concatenated equal original file
6. Chunk data is base64 encoded
7. readChunksFromBuffer() works same as file-based
8. getChunkCount() returns correct count for various sizes
9. calculateChunkSize() returns 5MB for large files
10. calculateChunkSize() returns file size for small files
11. Handles empty file (0 bytes)
12. Handles exactly 5MB file (edge case)
13. Memory efficiency — large file doesn't spike memory (check with process.memoryUsage)
14. Concurrent reads don't interfere
15. File read errors throw properly

Create test files: 1KB, 1MB, 6MB sizes.

File: tests/client/media/chunkReader.test.js
```

### Prompt 8: MediaUploader Tests

```
Create tests/client/media/mediaUploader.test.js

Requirements:
- Use vitest
- Mock HttpClient
- Create real test files with valid magic bytes

Test cases:
1. upload() calls INIT with correct parameters
2. upload() calls APPEND for each chunk with correct segment_index
3. upload() calls FINALIZE with correct media_id
4. upload() returns mediaId on success
5. upload() polls STATUS for video files
6. upload() calls onProgress callback with correct phase/percent
7. uploadMultiple() uploads multiple files in parallel
8. uploadMultiple() returns array of mediaIds
9. upload() throws MediaTooLargeError for oversized file
10. upload() throws UnsupportedMediaError for bad file type
11. upload() throws UploadFailedError on server error
12. upload() throws ProcessingFailedError when video processing fails
13. addAltText() sends correct metadata request
14. checkStatus() returns processing state
15. Handles network error during APPEND (retries chunk)

Mock HttpClient.request() to return realistic upload API responses.

File: tests/client/media/mediaUploader.test.js
```

### Prompt 9: Tweet API Tests

```
Create tests/client/api/tweets.test.js

Requirements:
- Use vitest
- Mock HttpClient

Test cases:
1. sendTweet() calls CreateTweet with correct text
2. sendTweet() includes mediaIds in variables
3. sendTweet() includes replyTo in variables
4. sendTweet() includes quoteTweetId
5. sendTweet() returns { id, text, createdAt }
6. sendTweetWithMedia() uploads media then sends tweet
7. sendTweetWithMedia() sets alt texts
8. deleteTweet() calls DeleteTweet with tweetId
9. likeTweet() calls FavoriteTweet with tweetId
10. unlikeTweet() calls UnfavoriteTweet
11. retweet() calls CreateRetweet
12. unretweet() calls DeleteRetweet
13. sendTweet() throws on API error
14. sendTweetWithMedia() handles upload failure gracefully
15. All functions use correct GraphQL query IDs

File: tests/client/api/tweets.test.js
```

### Prompt 10: Media TypeScript Definitions

```
Create types/client/media.d.ts

Contents:
- interface MediaUploadResult { mediaId: string; mediaType: string; processingStatus: string; }
- interface UploadProgress { phase: 'init' | 'append' | 'finalize' | 'processing'; percent: number; chunk?: number; totalChunks?: number; }
- interface MediaSource { data: Buffer; mediaType: string; }
- class MediaValidator { static validate, validateBuffer, getMediaCategory, getMaxSize, isSupportedType }
- class ValidationError extends Error { field: string; constraint: string; actual: any; }
- class ChunkReader { readChunks, readChunksFromBuffer, getChunkCount; static calculateChunkSize }
- interface Chunk { index: number; data: Buffer; isLast: boolean; }
- class MediaUploader { upload, uploadMultiple, checkStatus, addAltText }
- interface SendTweetOptions { text: string; media?: (string | Buffer | MediaSource)[]; replyTo?: string; quoteTweetId?: string; altTexts?: string[]; }
- interface TweetResult { id: string; text: string; createdAt: string; media?: MediaUploadResult[]; }
- function sendTweet(httpClient: HttpClient, options: SendTweetOptions): Promise<TweetResult>
- function sendTweetWithMedia(httpClient: HttpClient, mediaUploader: MediaUploader, options: SendTweetOptions): Promise<TweetResult>

File: types/client/media.d.ts
```

### Prompt 11: Wire Media into Package Exports

```
1. Update src/index.js — add:
   export { MediaUploader, MediaValidator, ChunkReader, createMediaUploader } from './client/media/index.js';

2. Update package.json exports:
   "./media": "./src/client/media/index.js"

3. Update types/index.d.ts:
   export * from './client/media';

Read existing files first. Only add, don't modify existing exports.
```

### Prompt 12: MCP Tool for Media Upload

```
Add a media upload MCP tool to src/mcp/server.js.

Add to the TOOLS array:
{
  name: 'x_send_tweet_with_media',
  description: 'Send a tweet with media attachments (images, GIFs, videos). Supports up to 4 images, 1 GIF, or 1 video per tweet.',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Tweet text (max 280 chars)' },
      media_paths: { type: 'array', items: { type: 'string' }, description: 'Array of local file paths to attach', maxItems: 4 },
      media_urls: { type: 'array', items: { type: 'string' }, description: 'Array of URLs to download and attach', maxItems: 4 },
      reply_to: { type: 'string', description: 'Tweet ID to reply to' },
      alt_texts: { type: 'array', items: { type: 'string' }, description: 'Alt text for each media item (accessibility)' },
    },
    required: ['text'],
  }
}

Add the handler in the CallToolRequestSchema handler:
case 'x_send_tweet_with_media':
  // If media_urls provided: download each to temp file first
  // Upload all media via MediaUploader
  // Send tweet with mediaIds
  // Return result with tweet ID and media details

Read src/mcp/server.js to find the tool handler pattern. Match the existing code style.
```

### Prompt 13: CLI Command for Media Tweet

```
Add a 'post' command to the CLI that supports media.

Update src/cli/index.js — add a new command:

program
  .command('post <text>')
  .description('Post a tweet with optional media')
  .option('-m, --media <paths...>', 'Media files to attach (images, GIFs, videos)')
  .option('-r, --reply-to <tweetId>', 'Tweet ID to reply to')
  .option('-q, --quote <tweetId>', 'Tweet ID to quote')
  .option('--alt <texts...>', 'Alt text for each media file')
  .option('--dry-run', 'Show what would be posted without actually posting')
  .action(async (text, options) => {
    // 1. Load session cookies
    // 2. If --dry-run: show preview and exit
    // 3. If --media: validate files, upload, collect mediaIds
    // 4. Send tweet with text + mediaIds + replyTo + quote
    // 5. Print tweet URL
  });

Read src/cli/index.js to match existing command patterns.
Add after existing commands — don't rewrite the file.
```

### Prompt 14: Media Upload Examples

```
Create examples/media-upload.js — executable examples of media upload.

Contents:
import { Scraper } from 'xactions';
const scraper = new Scraper();
await scraper.login({ cookies: 'cookies.json' });

// Example 1: Tweet with a single image
await scraper.sendTweet('Check out this photo! 📸', {
  media: ['./photo.jpg'],
  altTexts: ['A beautiful sunset over the ocean'],
});

// Example 2: Tweet with multiple images
await scraper.sendTweet('Photo dump 🧵', {
  media: ['./img1.jpg', './img2.jpg', './img3.png', './img4.webp'],
});

// Example 3: Tweet with video
await scraper.sendTweet('New video! 🎬', {
  media: ['./clip.mp4'],
});

// Example 4: Upload media separately (for reuse)
const { mediaId } = await scraper.uploadMedia('./banner.jpg');
await scraper.sendTweet('Using pre-uploaded media', { mediaIds: [mediaId] });

// Example 5: Tweet with GIF
await scraper.sendTweet('When the tests pass 😎', {
  media: ['./celebration.gif'],
});

// Example 6: Reply with media
await scraper.sendTweet('Here is the screenshot', {
  media: ['./screenshot.png'],
  replyTo: '1234567890',
  altTexts: ['Screenshot of the error message'],
});

// Example 7: Upload from Buffer
import fs from 'fs/promises';
const buffer = await fs.readFile('./photo.jpg');
const result = await scraper.uploadMedia(buffer);

File: examples/media-upload.js
```

### Prompt 15: Media Pipeline Documentation

```
Create docs/media-upload.md — comprehensive media upload documentation.

Structure:
1. Overview — what media types are supported, size limits
2. Quick Start — tweet with image in 5 lines
3. Supported Media Types — table of MIME types, max sizes, dimensions
   | Type | MIME | Max Size | Max Dimensions | Per Tweet |
   |------|------|----------|----------------|-----------|
   | Image | image/jpeg, image/png, image/webp | 5 MB | 4096x4096 | 4 |
   | GIF | image/gif | 15 MB | 1280x1080 | 1 |
   | Video | video/mp4 | 512 MB | 1920x1200 | 1 |
4. Upload Methods — from file path, from Buffer, from URL
5. Alt Text — accessibility best practices, how to set
6. Chunked Upload Internals — INIT/APPEND/FINALIZE/STATUS phases
7. Video Processing — what happens after upload, poll status
8. Progress Tracking — onProgress callback usage
9. Error Handling — validation errors, upload failures, processing failures
10. MCP Tool — using x_send_tweet_with_media from AI agents
11. CLI — using 'xactions post' command
12. API Reference — MediaUploader, MediaValidator, ChunkReader
13. Troubleshooting — common upload errors

File: docs/media-upload.md
```

---

## Validation

```bash
ls src/client/media/{MediaUploader,MediaValidator,ChunkReader,index}.js
ls src/client/api/tweets.js
ls tests/client/media/{mediaValidator,chunkReader,mediaUploader}.test.js
ls tests/client/api/tweets.test.js
ls types/client/media.d.ts
ls docs/media-upload.md
ls examples/media-upload.js

npx vitest run tests/client/media/ tests/client/api/
```
