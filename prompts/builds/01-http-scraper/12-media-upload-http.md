# Build 01-12 — Media Upload via HTTP

> **Agent Role:** Implementer  
> **Depends on:** 02-client, 03-auth  
> **Creates:** `src/scrapers/twitter/http/media.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement Twitter's chunked media upload API for images, videos, and GIFs. Also implement media scraping for downloading media from tweets.

---

## File: `src/scrapers/twitter/http/media.js`

### Upload Functions

1. **`async uploadMedia(client, filePath, options = {})`**
   - Twitter's 3-step chunked upload flow:
     1. **INIT** — `POST https://upload.x.com/i/media/upload.json` with `command=INIT`, `total_bytes`, `media_type`
     2. **APPEND** — `POST` with `command=APPEND`, `media_id`, `segment_index`, binary chunk data
     3. **FINALIZE** — `POST` with `command=FINALIZE`, `media_id`
   - For videos, also poll **STATUS** until processing completes
   - Options: `{ mediaType: 'image/jpeg', altText: '' }`
   - Returns `{ mediaId: string, mediaKey: string }`

2. **`async uploadImage(client, imagePathOrBuffer, options = {})`**
   - Convenience wrapper for image upload
   - Auto-detects MIME type from file extension or buffer magic bytes
   - Supports: JPEG, PNG, GIF, WebP
   - Max size: 5MB for images
   - Returns `{ mediaId }`

3. **`async uploadVideo(client, videoPathOrBuffer, options = {})`**
   - Chunked upload with progress reporting
   - Supports: MP4, MOV
   - Max size: 512MB
   - Chunks: 5MB per chunk
   - Poll processing status until `succeeded` or `failed`
   - Options: `{ onProgress: ({ phase, percent }) => {} }`
   - Returns `{ mediaId }`

4. **`async uploadGif(client, gifPathOrBuffer)`**
   - Upload as `image/gif` with `media_category: 'tweet_gif'`
   - Max size: 15MB

5. **`async setAltText(client, mediaId, altText)`**
   - `POST /1.1/media/metadata/create.json`
   - Set alt text for accessibility
   - Body: `{ media_id: mediaId, alt_text: { text: altText } }`

### Download/Scrape Functions

6. **`async scrapeMedia(client, username, options = {})`**
   - GraphQL query: `UserMedia` — user's media tab
   - Return array of media objects:
     ```javascript
     {
       tweetId: string,
       mediaType: 'photo'|'video'|'animated_gif',
       url: string,           // Full-size image URL or video URL
       thumbnailUrl: string,
       width: number,
       height: number,
       altText: string|null,
     }
     ```

7. **`async downloadMedia(url, destPath)`**
   - Download a media file to disk
   - Stream to avoid memory issues with large videos
   - Show download progress

8. **`async getVideoUrl(client, tweetId)`**
   - Extract highest-quality video URL from a tweet
   - Parse `video_info.variants` and sort by bitrate
   - Return `{ url, bitrate, contentType, width, height }`

### Chunked Upload Implementation Details

```javascript
async uploadChunked(client, buffer, mediaType, category) {
  // INIT
  const initResp = await client.rest('/1.1/media/upload.json', {
    method: 'POST',
    form: {
      command: 'INIT',
      total_bytes: buffer.length,
      media_type: mediaType,
      media_category: category, // 'tweet_image', 'tweet_video', 'tweet_gif'
    },
  });
  const mediaId = initResp.media_id_string;

  // APPEND (chunked)
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  for (let i = 0; i * CHUNK_SIZE < buffer.length; i++) {
    const chunk = buffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await client.rest('/1.1/media/upload.json', {
      method: 'POST',
      multipart: {
        command: 'APPEND',
        media_id: mediaId,
        segment_index: i,
        media_data: chunk.toString('base64'), // or binary form-data
      },
    });
  }

  // FINALIZE
  const finalResp = await client.rest('/1.1/media/upload.json', {
    method: 'POST',
    form: { command: 'FINALIZE', media_id: mediaId },
  });

  // STATUS poll for video
  if (finalResp.processing_info) {
    await this.pollProcessingStatus(client, mediaId);
  }

  return { mediaId, mediaKey: finalResp.media_key };
}
```

---

## Test File: `tests/http-scraper/media.test.js`

1. Test INIT request format
2. Test APPEND chunking (10MB file splits into 2 chunks)
3. Test FINALIZE request
4. Test video processing status polling
5. Test MIME type detection from file extension
6. Test alt text setting
7. Test `getVideoUrl` sorts by bitrate descending
8. Test `scrapeMedia` pagination

---

## Acceptance Criteria

- [ ] Image upload works end-to-end (INIT → APPEND → FINALIZE)
- [ ] Video upload handles large files chunked with progress
- [ ] GIF upload sets correct media_category
- [ ] Alt text can be set on uploaded media
- [ ] Video URL extraction picks highest quality
- [ ] Media scraping paginates through user's media tab
- [ ] All tests pass
