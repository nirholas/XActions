# Track 06 — Media Upload Pipeline

> agent-twitter-client supports media upload (images, video, GIF) via Twitter's chunked media upload API. XActions has zero media upload support — all posting is text-only. This track adds a complete media pipeline: Buffer-based upload, MIME detection, chunked upload for video, alt-text, and media attachment to tweets.

---

## Research Before Starting

```
src/client/Scraper.js          — Main Scraper class (Track 01)
src/client/http/HttpClient.js  — HTTP client (Track 03)
src/client/auth/               — Auth system (Track 02)
```

Twitter Media Upload API:
```
POST https://upload.twitter.com/1.1/media/upload.json
  - INIT:   media_type, total_bytes, media_category → media_id
  - APPEND: media_id, segment_index, media_data (base64 chunk)
  - FINALIZE: media_id → processing_info (for video)
  - STATUS: media_id → processing state (pending/in_progress/succeeded/failed)

Alt text: POST https://upload.twitter.com/1.1/media/metadata/create.json
  { media_id, alt_text: { text } }

Tweet with media: CreateTweet mutation variables.media.media_entities = [{ media_id, tagged_users: [] }]
```

Limits (as of Jan 2026):
- Images: max 5MB each, max 4 per tweet, formats: JPEG, PNG, GIF, WEBP
- Video: max 512MB, max 1 per tweet, formats: MP4, MOV
- GIF: max 15MB, max 1 per tweet (treated as animated_gif category)
- Chunk size: max 5MB per APPEND call

---

## Prompts

### Prompt 1: MediaFile Model

```
Create src/client/media/MediaFile.js.

Class representing a media file to be uploaded:

class MediaFile {
  constructor(options) {
    this.buffer = options.buffer;         // Buffer — the file data
    this.mimeType = options.mimeType;     // string — auto-detected if not provided
    this.filename = options.filename;     // string — optional
    this.altText = options.altText;       // string — accessibility text (max 1000 chars)
    this.source = options.source;         // 'buffer' | 'file' | 'url'
  }

  static async fromFile(filePath, options = {}) {
    // Read file from disk using fs.promises.readFile
    // Auto-detect MIME type from file content (magic bytes) and extension
    // Return new MediaFile({ buffer, mimeType, filename: path.basename(filePath), ...options })
  }

  static async fromUrl(url, options = {}) {
    // Download file via fetch/http
    // Detect MIME from Content-Type header, fall back to URL extension, fall back to magic bytes
    // Return new MediaFile({ buffer, mimeType, filename, ...options })
  }

  static fromBuffer(buffer, options = {}) {
    // Validate buffer is a Buffer or Uint8Array
    // Detect MIME from magic bytes if not provided
    // Return new MediaFile({ buffer, mimeType: options.mimeType || detected, ...options })
  }

  get size() { return this.buffer.length; }
  get category() {
    // Return Twitter media_category:
    // 'tweet_image' for JPEG/PNG/WEBP
    // 'tweet_gif' for GIF  
    // 'tweet_video' for MP4/MOV
    // 'dm_image', 'dm_gif', 'dm_video' for DM context
  }
  get isImage() { }
  get isVideo() { }
  get isGif() { }
}

MIME detection using magic bytes (first 4-12 bytes):
- JPEG: FF D8 FF
- PNG:  89 50 4E 47
- GIF:  47 49 46 38
- MP4:  XX XX XX XX 66 74 79 70 (ftyp at offset 4)
- WEBP: 52 49 46 46 XX XX XX XX 57 45 42 50

Export MediaFile as default and named.
```

### Prompt 2: Media Validator

```
Create src/client/media/validator.js.

Validate media files against Twitter's limits before uploading.

export function validateMedia(mediaFile, context = 'tweet') {
  const errors = [];
  
  // Size limits
  if (mediaFile.isImage && mediaFile.size > 5 * 1024 * 1024) {
    errors.push(`Image exceeds 5MB limit (${(mediaFile.size / 1024 / 1024).toFixed(1)}MB)`);
  }
  if (mediaFile.isVideo && mediaFile.size > 512 * 1024 * 1024) {
    errors.push(`Video exceeds 512MB limit`);
  }
  if (mediaFile.isGif && mediaFile.size > 15 * 1024 * 1024) {
    errors.push(`GIF exceeds 15MB limit (${(mediaFile.size / 1024 / 1024).toFixed(1)}MB)`);
  }
  
  // MIME type
  const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/quicktime'],
  };
  if (!ALLOWED_TYPES.image.includes(mediaFile.mimeType) && 
      !ALLOWED_TYPES.video.includes(mediaFile.mimeType)) {
    errors.push(`Unsupported media type: ${mediaFile.mimeType}`);
  }
  
  // Alt text
  if (mediaFile.altText && mediaFile.altText.length > 1000) {
    errors.push(`Alt text exceeds 1000 character limit`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateMediaSet(mediaFiles) {
  // Validate tweet-level constraints:
  // max 4 images, OR max 1 video, OR max 1 GIF
  // Cannot mix video/GIF with images
  const errors = [];
  
  const images = mediaFiles.filter(m => m.isImage && !m.isGif);
  const videos = mediaFiles.filter(m => m.isVideo);
  const gifs = mediaFiles.filter(m => m.isGif);
  
  if (images.length > 4) errors.push('Max 4 images per tweet');
  if (videos.length > 1) errors.push('Max 1 video per tweet');
  if (gifs.length > 1) errors.push('Max 1 GIF per tweet');
  if (videos.length > 0 && images.length > 0) errors.push('Cannot mix video and images');
  if (gifs.length > 0 && images.length > 0) errors.push('Cannot mix GIF and images');
  if (gifs.length > 0 && videos.length > 0) errors.push('Cannot mix GIF and video');
  
  // Validate each file individually
  for (const file of mediaFiles) {
    const result = validateMedia(file);
    errors.push(...result.errors);
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Prompt 3: Simple Image Upload (Non-Chunked)

```
Create src/client/media/simpleUpload.js.

For images under 5MB, use the simple (non-chunked) upload API:

export async function simpleUpload(httpClient, mediaFile) {
  // Validate
  const validation = validateMedia(mediaFile);
  if (!validation.valid) throw new MediaValidationError(validation.errors);
  
  // Build multipart form data
  const formData = new FormData();
  // Use Blob from buffer for cross-platform compatibility
  const blob = new Blob([mediaFile.buffer], { type: mediaFile.mimeType });
  formData.append('media_data', mediaFile.buffer.toString('base64'));
  formData.append('media_category', mediaFile.category);
  
  const response = await httpClient.post(
    'https://upload.twitter.com/1.1/media/upload.json',
    formData,
    { 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      // upload.twitter.com uses same auth as api.twitter.com
    }
  );
  
  // Response: { media_id, media_id_string, size, expires_after_secs, image: { image_type, w, h } }
  const mediaId = response.media_id_string;
  
  // Set alt text if provided
  if (mediaFile.altText) {
    await setAltText(httpClient, mediaId, mediaFile.altText);
  }
  
  return {
    mediaId,
    mediaIdString: response.media_id_string,
    size: response.size,
    expiresAt: Date.now() + (response.expires_after_secs * 1000),
    type: response.image?.image_type || mediaFile.mimeType,
    dimensions: response.image ? { width: response.image.w, height: response.image.h } : null,
  };
}

async function setAltText(httpClient, mediaId, text) {
  await httpClient.post(
    'https://upload.twitter.com/1.1/media/metadata/create.json',
    JSON.stringify({ media_id: mediaId, alt_text: { text } }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Prompt 4: Chunked Upload — INIT Phase

```
Create src/client/media/chunkedUpload.js.

Chunked upload is required for video/GIF and large images. Three phases: INIT → APPEND → FINALIZE.

export class ChunkedUploader {
  constructor(httpClient, mediaFile, options = {}) {
    this.httpClient = httpClient;
    this.mediaFile = mediaFile;
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB chunks
    this.mediaId = null;
    this.onProgress = options.onProgress || (() => {});
  }

  async init() {
    const params = new URLSearchParams({
      command: 'INIT',
      total_bytes: String(this.mediaFile.size),
      media_type: this.mediaFile.mimeType,
      media_category: this.mediaFile.category,
    });
    
    // For video, add additional_owners if needed
    // For shared_media (DMs), use media_category: 'dm_video'
    
    const response = await this.httpClient.post(
      'https://upload.twitter.com/1.1/media/upload.json',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    this.mediaId = response.media_id_string;
    this.onProgress({ phase: 'init', mediaId: this.mediaId });
    
    return this.mediaId;
  }
  
  // ... append() and finalize() in next prompts
}

Handle INIT errors:
- 400: Invalid media type or size
- 403: Not authenticated or media upload not allowed
- 413: File too large
```

### Prompt 5: Chunked Upload — APPEND Phase

```
Add the append() method to ChunkedUploader in src/client/media/chunkedUpload.js.

async append() {
  const totalChunks = Math.ceil(this.mediaFile.size / this.chunkSize);
  
  for (let segmentIndex = 0; segmentIndex < totalChunks; segmentIndex++) {
    const start = segmentIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.mediaFile.size);
    const chunk = this.mediaFile.buffer.slice(start, end);
    
    const params = new URLSearchParams({
      command: 'APPEND',
      media_id: this.mediaId,
      segment_index: String(segmentIndex),
    });
    
    // APPEND uses multipart/form-data with the chunk as binary
    const formData = new FormData();
    formData.append('command', 'APPEND');
    formData.append('media_id', this.mediaId);
    formData.append('segment_index', String(segmentIndex));
    formData.append('media_data', chunk.toString('base64'));
    
    await this.httpClient.post(
      'https://upload.twitter.com/1.1/media/upload.json',
      formData
    );
    
    this.onProgress({
      phase: 'append',
      segmentIndex,
      totalChunks,
      bytesUploaded: end,
      totalBytes: this.mediaFile.size,
      percentComplete: Math.round((end / this.mediaFile.size) * 100),
    });
    
    // Small delay between chunks to be safe
    if (segmentIndex < totalChunks - 1) {
      await sleep(500);
    }
  }
}

Handle APPEND errors:
- 400: Invalid segment_index or media_id
- 404: Media ID not found (INIT expired — default 60min window)
- Retry on 5xx up to 3 times with exponential backoff
```

### Prompt 6: Chunked Upload — FINALIZE and STATUS

```
Add finalize() and waitForProcessing() to ChunkedUploader.

async finalize() {
  const params = new URLSearchParams({
    command: 'FINALIZE',
    media_id: this.mediaId,
  });
  
  const response = await this.httpClient.post(
    'https://upload.twitter.com/1.1/media/upload.json',
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  
  this.onProgress({ phase: 'finalize', mediaId: this.mediaId });
  
  // For images, response is immediate — no processing_info
  // For video/GIF, response includes processing_info
  if (response.processing_info) {
    return this.waitForProcessing(response.processing_info);
  }
  
  return {
    mediaId: response.media_id_string,
    size: response.size,
    expiresAt: Date.now() + (response.expires_after_secs * 1000),
  };
}

async waitForProcessing(processingInfo) {
  // processing_info: { state: 'pending'|'in_progress'|'succeeded'|'failed', check_after_secs, progress_percent, error }
  
  let state = processingInfo.state;
  let checkAfter = processingInfo.check_after_secs || 5;
  
  while (state === 'pending' || state === 'in_progress') {
    await sleep(checkAfter * 1000);
    
    const statusResponse = await this.httpClient.get(
      `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${this.mediaId}`
    );
    
    const info = statusResponse.processing_info;
    state = info.state;
    checkAfter = info.check_after_secs || 5;
    
    this.onProgress({
      phase: 'processing',
      state,
      progressPercent: info.progress_percent || 0,
    });
    
    if (state === 'failed') {
      throw new MediaProcessingError(
        `Media processing failed: ${info.error?.message || 'Unknown error'}`,
        { mediaId: this.mediaId, error: info.error }
      );
    }
  }
  
  return {
    mediaId: this.mediaId,
    state: 'succeeded',
  };
}

Full upload flow method:
async upload() {
  await this.init();
  await this.append();
  return this.finalize();
}
```

### Prompt 7: Media Upload Coordinator

```
Create src/client/media/MediaUploader.js.

High-level coordinator that chooses the right upload strategy:

export class MediaUploader {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  async upload(input, options = {}) {
    // Normalize input to MediaFile
    let mediaFile;
    if (input instanceof MediaFile) {
      mediaFile = input;
    } else if (typeof input === 'string') {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        mediaFile = await MediaFile.fromUrl(input, options);
      } else {
        mediaFile = await MediaFile.fromFile(input, options);
      }
    } else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
      mediaFile = MediaFile.fromBuffer(input, options);
    } else {
      throw new TypeError('Input must be a file path, URL, Buffer, or MediaFile');
    }
    
    // Validate
    const validation = validateMedia(mediaFile);
    if (!validation.valid) throw new MediaValidationError(validation.errors);
    
    // Choose upload strategy
    if (mediaFile.isVideo || mediaFile.isGif || mediaFile.size > 5 * 1024 * 1024) {
      // Chunked upload for video, GIF, or large files
      const uploader = new ChunkedUploader(this.httpClient, mediaFile, options);
      return uploader.upload();
    } else {
      // Simple upload for small images
      return simpleUpload(this.httpClient, mediaFile);
    }
  }

  async uploadMultiple(inputs, options = {}) {
    // Upload up to 4 files in parallel (respecting constraints)
    const mediaFiles = await Promise.all(
      inputs.map(input => this.normalizeInput(input, options))
    );
    
    const setValidation = validateMediaSet(mediaFiles);
    if (!setValidation.valid) throw new MediaValidationError(setValidation.errors);
    
    const results = await Promise.all(
      mediaFiles.map(mf => this.upload(mf, options))
    );
    
    return results;
  }
}
```

### Prompt 8: Tweet with Media Integration

```
Update src/client/Scraper.js to support media in sendTweet.

Add to the Scraper class:

async sendTweet(text, options = {}) {
  this.requireAuth();
  
  let mediaIds = [];
  
  // Handle media attachments
  if (options.media && options.media.length > 0) {
    const uploader = new MediaUploader(this.httpClient);
    const results = await uploader.uploadMultiple(options.media, {
      onProgress: options.onMediaProgress,
      altText: options.altText, // string or string[] matching media order
    });
    mediaIds = results.map(r => r.mediaId);
  }
  
  // Handle single mediaId (pre-uploaded)
  if (options.mediaIds) {
    mediaIds = [...mediaIds, ...options.mediaIds];
  }
  
  // Build CreateTweet mutation
  const variables = {
    tweet_text: text,
    dark_request: false,
    media: mediaIds.length > 0 ? {
      media_entities: mediaIds.map(id => ({
        media_id: id,
        tagged_users: options.taggedUsers || [],
      })),
      possibly_sensitive: options.sensitive || false,
    } : undefined,
    reply: options.replyTo ? {
      in_reply_to_tweet_id: options.replyTo,
      exclude_reply_user_ids: [],
    } : undefined,
    quote_tweet_id: options.quoteTweetId || undefined,
  };
  
  const response = await this.httpClient.post(
    `https://x.com/i/api/graphql/${QUERY_IDS.CreateTweet}/CreateTweet`,
    { variables, features: FEATURES, queryId: QUERY_IDS.CreateTweet }
  );
  
  return Tweet.fromGraphQL(response.data.create_tweet.tweet_results.result);
}

// Convenience methods:
async sendTweetWithImages(text, imagePaths, options = {}) {
  return this.sendTweet(text, { ...options, media: imagePaths });
}

async sendTweetWithVideo(text, videoPath, options = {}) {
  return this.sendTweet(text, { ...options, media: [videoPath] });
}
```

### Prompt 9: Image Resize and Optimization

```
Create src/client/media/imageProcessor.js.

Optional image processing before upload (uses sharp if available, falls back to raw buffer):

export async function processImage(mediaFile, options = {}) {
  const { maxWidth = 4096, maxHeight = 4096, quality = 85, format } = options;
  
  // Try to use sharp for processing, fall back gracefully
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    // sharp not installed — return unprocessed
    console.warn('sharp not installed, skipping image optimization. Install with: npm install sharp');
    return mediaFile;
  }
  
  let pipeline = sharp(mediaFile.buffer);
  const metadata = await pipeline.metadata();
  
  // Resize if exceeds max dimensions (preserve aspect ratio)
  if (metadata.width > maxWidth || metadata.height > maxHeight) {
    pipeline = pipeline.resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });
  }
  
  // Convert format if requested
  if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg({ quality });
  } else if (format === 'png') {
    pipeline = pipeline.png({ quality });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality });
  }
  
  // Strip EXIF data (privacy) but preserve orientation
  pipeline = pipeline.rotate(); // auto-rotate based on EXIF then strip
  
  const processedBuffer = await pipeline.toBuffer();
  
  return MediaFile.fromBuffer(processedBuffer, {
    mimeType: format ? `image/${format}` : mediaFile.mimeType,
    altText: mediaFile.altText,
    filename: mediaFile.filename,
  });
}

export async function createThumbnail(mediaFile, size = 150) {
  // Generate square thumbnail for preview purposes
}

export async function getImageDimensions(buffer) {
  // Return { width, height } using magic bytes (no sharp needed)
  // PNG: bytes 16-23 contain width/height as 32-bit big-endian
  // JPEG: parse SOF0 marker
  // GIF: bytes 6-9 contain width/height as 16-bit little-endian
}
```

### Prompt 10: Media Download Utility

```
Create src/client/media/downloader.js.

Download media from tweets (the reverse of upload):

export async function downloadMedia(httpClient, tweet, options = {}) {
  const { outputDir = '.', types = ['photo', 'video', 'animated_gif'] } = options;
  
  const downloads = [];
  
  for (const media of tweet.media) {
    if (!types.includes(media.type)) continue;
    
    let url;
    if (media.type === 'photo') {
      // Get highest quality: append ?format=jpg&name=orig or ?format=png&name=orig
      url = `${media.url}?format=${media.format || 'jpg'}&name=orig`;
    } else if (media.type === 'video' || media.type === 'animated_gif') {
      // Select highest bitrate variant
      const best = media.variants
        .filter(v => v.content_type === 'video/mp4')
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      url = best?.url;
    }
    
    if (!url) continue;
    
    const filename = generateMediaFilename(tweet.id, media, options);
    const filePath = path.join(outputDir, filename);
    
    const response = await httpClient.get(url, { responseType: 'buffer' });
    await fs.promises.writeFile(filePath, response);
    
    downloads.push({ url, filePath, type: media.type, size: response.length });
  }
  
  return downloads;
}

export async function downloadProfileMedia(httpClient, profile) {
  // Download avatar and banner images
  // Avatar: profile.avatarUrl → replace _normal with _400x400 for full size
  // Banner: profile.bannerUrl
}

export function extractVideoUrl(tweet) {
  // Quick utility: return highest bitrate video URL from tweet
  // Used by scripts/videoDownloader.js
}
```

### Prompt 11: Media Error Types

```
Create src/client/media/errors.js.

Specialized error types for media operations:

export class MediaError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'MediaError';
    this.code = options.code;
    this.mediaId = options.mediaId;
  }
}

export class MediaValidationError extends MediaError {
  constructor(errors) {
    super(`Media validation failed: ${errors.join(', ')}`);
    this.name = 'MediaValidationError';
    this.code = 'MEDIA_VALIDATION_FAILED';
    this.validationErrors = errors;
  }
}

export class MediaUploadError extends MediaError {
  constructor(message, options = {}) {
    super(message);
    this.name = 'MediaUploadError';
    this.code = options.code || 'MEDIA_UPLOAD_FAILED';
    this.phase = options.phase; // 'init' | 'append' | 'finalize'
    this.httpStatus = options.httpStatus;
  }
}

export class MediaProcessingError extends MediaError {
  constructor(message, options = {}) {
    super(message);
    this.name = 'MediaProcessingError';
    this.code = 'MEDIA_PROCESSING_FAILED';
    this.processingError = options.error; // Twitter's error object
  }
}

export class MediaSizeError extends MediaValidationError {
  constructor(actual, limit, type) {
    super([`${type} size ${(actual / 1024 / 1024).toFixed(1)}MB exceeds ${(limit / 1024 / 1024).toFixed(0)}MB limit`]);
    this.name = 'MediaSizeError';
    this.code = 'MEDIA_TOO_LARGE';
    this.actualSize = actual;
    this.sizeLimit = limit;
  }
}
```

### Prompt 12: Media Module Index

```
Create src/client/media/index.js.

Clean re-exports for the media module:

export { MediaFile } from './MediaFile.js';
export { MediaUploader } from './MediaUploader.js';
export { ChunkedUploader } from './chunkedUpload.js';
export { simpleUpload, setAltText } from './simpleUpload.js';
export { validateMedia, validateMediaSet } from './validator.js';
export { processImage, createThumbnail, getImageDimensions } from './imageProcessor.js';
export { downloadMedia, downloadProfileMedia, extractVideoUrl } from './downloader.js';
export { MediaError, MediaValidationError, MediaUploadError, MediaProcessingError, MediaSizeError } from './errors.js';

// Type-like constants for reference
export const MEDIA_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,       // 5MB
  VIDEO_MAX_SIZE: 512 * 1024 * 1024,      // 512MB  
  GIF_MAX_SIZE: 15 * 1024 * 1024,         // 15MB
  MAX_IMAGES_PER_TWEET: 4,
  MAX_VIDEOS_PER_TWEET: 1,
  MAX_GIFS_PER_TWEET: 1,
  CHUNK_SIZE: 5 * 1024 * 1024,            // 5MB chunks
  ALT_TEXT_MAX_LENGTH: 1000,
  UPLOAD_EXPIRY_SECONDS: 86400,           // 24 hours
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
};

Update src/client/index.js to export:
export * as media from './media/index.js';
```

### Prompt 13: MCP Media Tools

```
Add media-related MCP tools to src/mcp/local-tools.js:

x_upload_media:
  description: "Upload an image or video for use in tweets"
  params: { filePath: string, altText?: string }
  handler: Upload via MediaUploader, return { mediaId, type, size }

x_send_tweet_with_media:
  description: "Send a tweet with attached images or video"
  params: { text: string, mediaPaths: string[], altTexts?: string[] }
  handler: Upload all media, send tweet with mediaIds

x_download_tweet_media:
  description: "Download all media from a tweet"  
  params: { tweetId: string, outputDir?: string }
  handler: Fetch tweet, download all media to outputDir

x_get_media_info:
  description: "Get information about a media file before uploading"
  params: { filePath: string }
  handler: Return MIME type, size, dimensions, validation result

Each tool:
- Returns MCP-formatted content
- Handles errors with helpful messages
- Validates auth for upload/tweet operations
```

### Prompt 14: CLI Media Commands

```
Add media commands to src/cli/ (Commander.js):

xactions media upload <file> [--alt-text "description"]
  → Upload file, print mediaId
  → Show progress bar for video uploads

xactions media info <file>
  → Show MIME type, dimensions, size, validation result

xactions tweet "text" --media <file1> [<file2>] [--alt-text "desc1" "desc2"]
  → Post tweet with media attachments

xactions media download <tweetUrl> [--output-dir ./media]
  → Download all media from a tweet URL
  → Parse tweet ID from URL

xactions media download-profile <username> [--output-dir ./avatars]
  → Download user avatar and banner

Implementation:
- Use ora for spinners during upload
- Use chalk for colored output  
- Show upload progress with percentage for video
- Parse tweet URLs to extract ID: x.com/user/status/1234
```

### Prompt 15: Media Tests

```
Create tests/client/media.test.js.

15 tests:
1. MediaFile.fromBuffer detects JPEG from magic bytes
2. MediaFile.fromBuffer detects PNG from magic bytes
3. MediaFile.fromBuffer detects GIF from magic bytes
4. MediaFile.fromBuffer detects MP4 from ftyp signature
5. MediaFile.category returns 'tweet_image' for JPEG
6. MediaFile.category returns 'tweet_video' for MP4
7. MediaFile.category returns 'tweet_gif' for GIF
8. validateMedia rejects image over 5MB
9. validateMedia rejects unsupported MIME type
10. validateMediaSet rejects 5 images (max 4)
11. validateMediaSet rejects mixing video + images
12. simpleUpload sends correct form data (mock HTTP)
13. ChunkedUploader splits 12MB file into 3 chunks (5+5+2)
14. ChunkedUploader.waitForProcessing polls until succeeded
15. MediaUploader.upload routes small JPEG to simpleUpload, MP4 to chunkedUpload

Create test fixtures:
- tests/fixtures/media/tiny.jpg — 1x1 pixel JPEG (valid, ~600 bytes)
- tests/fixtures/media/tiny.png — 1x1 pixel PNG (valid, ~68 bytes)  
- tests/fixtures/media/tiny.gif — 1x1 pixel GIF (valid, ~35 bytes)
Generate these in the test setup file using minimal valid binary data (hardcoded byte arrays).
```

---

## Validation

```bash
node -e "import('./src/client/media/index.js').then(m => console.log('✅ Media module loaded'))"
npx vitest run tests/client/media.test.js
```
