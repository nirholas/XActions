/**
 * Tests for src/scrapers/twitter/http/media.js
 *
 * Uses vitest with mocked fetch / client — no real network requests.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mimeFromExtension,
  mimeFromBuffer,
  resolveInput,
  uploadChunked,
  pollProcessingStatus,
  uploadMedia,
  uploadImage,
  uploadVideo,
  uploadGif,
  setAltText,
  scrapeMedia,
  downloadMedia,
  getVideoUrl,
  parseMediaEntity,
} from '../../src/scrapers/twitter/http/media.js';

// ---------------------------------------------------------------------------
// Client mock factory
// ---------------------------------------------------------------------------

function createMockClient({ authenticated = true } = {}) {
  const calls = [];

  return {
    _calls: calls,
    isAuthenticated: vi.fn(() => authenticated),
    AuthError: Error,

    rest: vi.fn(async (url, opts = {}) => {
      calls.push({ type: 'rest', url, opts });

      // Route by command in form / multipart / params
      const command =
        opts.form?.command ?? opts.multipart?.command ?? opts.params?.command;

      if (command === 'INIT') {
        return { media_id_string: '1234567890', media_id: 1234567890 };
      }
      if (command === 'APPEND') {
        return null; // APPEND returns nothing on success
      }
      if (command === 'FINALIZE') {
        return { media_id_string: '1234567890', media_key: '3_1234567890' };
      }
      if (command === 'STATUS') {
        return { processing_info: { state: 'succeeded', progress_percent: 100 } };
      }

      // metadata/create
      if (url.includes('metadata/create')) {
        return {};
      }

      return {};
    }),

    graphql: vi.fn(async (queryId, opName, variables) => {
      calls.push({ type: 'graphql', queryId, opName, variables });

      if (opName === 'UserByScreenName') {
        return {
          data: {
            user: {
              result: {
                __typename: 'User',
                rest_id: '44196397',
                legacy: { screen_name: variables.screen_name },
              },
            },
          },
        };
      }

      if (opName === 'UserMedia') {
        return buildUserMediaResponse(variables.cursor);
      }

      if (opName === 'TweetResultByRestId') {
        return buildTweetWithVideoResponse();
      }

      return {};
    }),
  };
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function buildUserMediaResponse(cursor) {
  // First page has tweets + a bottom cursor; second page is empty
  if (cursor === 'page2cursor') {
    return {
      data: {
        user: {
          result: {
            timeline_v2: {
              timeline: {
                instructions: [
                  {
                    entries: [], // no more results
                  },
                ],
              },
            },
          },
        },
      },
    };
  }

  return {
    data: {
      user: {
        result: {
          timeline_v2: {
            timeline: {
              instructions: [
                {
                  entries: [
                    {
                      entryId: 'tweet-111',
                      content: {
                        itemContent: {
                          tweet_results: {
                            result: {
                              __typename: 'Tweet',
                              rest_id: '111',
                              legacy: {
                                id_str: '111',
                                extended_entities: {
                                  media: [
                                    {
                                      type: 'photo',
                                      media_url_https: 'https://pbs.twimg.com/media/abc.jpg',
                                      original_info: { width: 1200, height: 800 },
                                      ext_alt_text: 'A cat',
                                    },
                                  ],
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    {
                      entryId: 'tweet-222',
                      content: {
                        itemContent: {
                          tweet_results: {
                            result: {
                              __typename: 'Tweet',
                              rest_id: '222',
                              legacy: {
                                id_str: '222',
                                extended_entities: {
                                  media: [
                                    {
                                      type: 'video',
                                      media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/vid.jpg',
                                      original_info: { width: 1920, height: 1080 },
                                      ext_alt_text: null,
                                      video_info: {
                                        variants: [
                                          { bitrate: 832000, content_type: 'video/mp4', url: 'https://video.twimg.com/low.mp4' },
                                          { bitrate: 2176000, content_type: 'video/mp4', url: 'https://video.twimg.com/high.mp4' },
                                          { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/playlist.m3u8' },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    {
                      entryId: 'cursor-bottom-12345',
                      content: { value: 'page2cursor' },
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
  };
}

function buildTweetWithVideoResponse() {
  return {
    data: {
      tweetResult: {
        result: {
          __typename: 'Tweet',
          rest_id: '999',
          legacy: {
            id_str: '999',
            extended_entities: {
              media: [
                {
                  type: 'video',
                  media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/thumb.jpg',
                  original_info: { width: 1920, height: 1080 },
                  video_info: {
                    aspect_ratio: [16, 9],
                    variants: [
                      { bitrate: 256000, content_type: 'video/mp4', url: 'https://video.twimg.com/240p.mp4' },
                      { bitrate: 832000, content_type: 'video/mp4', url: 'https://video.twimg.com/480p.mp4' },
                      { bitrate: 2176000, content_type: 'video/mp4', url: 'https://video.twimg.com/720p.mp4' },
                      { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/pl.m3u8' },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('media — MIME detection', () => {
  it('detects MIME from common file extensions', () => {
    expect(mimeFromExtension('.jpg')).toBe('image/jpeg');
    expect(mimeFromExtension('.JPEG')).toBe('image/jpeg');
    expect(mimeFromExtension('.png')).toBe('image/png');
    expect(mimeFromExtension('.gif')).toBe('image/gif');
    expect(mimeFromExtension('.webp')).toBe('image/webp');
    expect(mimeFromExtension('.mp4')).toBe('video/mp4');
    expect(mimeFromExtension('.mov')).toBe('video/quicktime');
    expect(mimeFromExtension('.txt')).toBeNull();
  });

  it('detects MIME from buffer magic bytes', () => {
    // JPEG
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(mimeFromBuffer(jpeg)).toBe('image/jpeg');

    // PNG
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(mimeFromBuffer(png)).toBe('image/png');

    // GIF
    const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(mimeFromBuffer(gif)).toBe('image/gif');

    // Unknown
    const unknown = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(mimeFromBuffer(unknown)).toBeNull();

    // Too short
    expect(mimeFromBuffer(Buffer.from([0xff]))).toBeNull();
    expect(mimeFromBuffer(null)).toBeNull();
  });
});

describe('media — INIT request format', () => {
  it('sends correct INIT form data', async () => {
    const client = createMockClient();
    const buffer = Buffer.alloc(1024, 0x42);

    await uploadChunked(client, buffer, 'image/jpeg', 'tweet_image');

    const initCall = client._calls.find(
      (c) => c.type === 'rest' && c.opts.form?.command === 'INIT',
    );
    expect(initCall).toBeDefined();
    expect(initCall.opts.method).toBe('POST');
    expect(initCall.opts.form).toEqual({
      command: 'INIT',
      total_bytes: '1024',
      media_type: 'image/jpeg',
      media_category: 'tweet_image',
    });
  });
});

describe('media — APPEND chunking', () => {
  it('splits a 10 MB file into 2 chunks', async () => {
    const client = createMockClient();
    const tenMB = 10 * 1024 * 1024;
    const buffer = Buffer.alloc(tenMB, 0xab);

    await uploadChunked(client, buffer, 'video/mp4', 'tweet_video');

    const appendCalls = client._calls.filter(
      (c) => c.type === 'rest' && c.opts.multipart?.command === 'APPEND',
    );

    expect(appendCalls).toHaveLength(2);
    expect(appendCalls[0].opts.multipart.segment_index).toBe('0');
    expect(appendCalls[1].opts.multipart.segment_index).toBe('1');
  });

  it('sends a single chunk for a small file', async () => {
    const client = createMockClient();
    const buffer = Buffer.alloc(1000, 0xcd);

    await uploadChunked(client, buffer, 'image/png', 'tweet_image');

    const appendCalls = client._calls.filter(
      (c) => c.type === 'rest' && c.opts.multipart?.command === 'APPEND',
    );
    expect(appendCalls).toHaveLength(1);
  });

  it('reports progress during APPEND', async () => {
    const client = createMockClient();
    const buffer = Buffer.alloc(10 * 1024 * 1024, 0x00);
    const progressEvents = [];

    await uploadChunked(client, buffer, 'video/mp4', 'tweet_video', {
      onProgress: (info) => progressEvents.push(info),
    });

    const appendEvents = progressEvents.filter((e) => e.phase === 'append');
    expect(appendEvents).toHaveLength(2);
    expect(appendEvents[0].percent).toBe(50);
    expect(appendEvents[1].percent).toBe(100);
  });
});

describe('media — FINALIZE request', () => {
  it('sends correct FINALIZE form data', async () => {
    const client = createMockClient();
    const buffer = Buffer.alloc(256, 0x00);

    const result = await uploadChunked(client, buffer, 'image/jpeg', 'tweet_image');

    const finalizeCall = client._calls.find(
      (c) => c.type === 'rest' && c.opts.form?.command === 'FINALIZE',
    );
    expect(finalizeCall).toBeDefined();
    expect(finalizeCall.opts.form).toEqual({
      command: 'FINALIZE',
      media_id: '1234567890',
    });
    expect(result.mediaId).toBe('1234567890');
    expect(result.mediaKey).toBe('3_1234567890');
  });
});

describe('media — video processing status polling', () => {
  it('polls until succeeded', async () => {
    let callCount = 0;
    const client = createMockClient();
    // Override rest to simulate pending → succeeded
    client.rest = vi.fn(async (url, opts) => {
      const command = opts.form?.command ?? opts.multipart?.command ?? opts.params?.command;

      if (command === 'INIT') return { media_id_string: '555' };
      if (command === 'APPEND') return null;
      if (command === 'FINALIZE') {
        return {
          media_id_string: '555',
          media_key: '3_555',
          processing_info: { state: 'pending', check_after_secs: 0 },
        };
      }
      if (command === 'STATUS') {
        callCount++;
        if (callCount < 3) {
          return {
            processing_info: {
              state: 'in_progress',
              progress_percent: callCount * 33,
              check_after_secs: 0,
            },
          };
        }
        return {
          processing_info: { state: 'succeeded', progress_percent: 100 },
        };
      }
      return {};
    });

    const result = await uploadChunked(client, Buffer.alloc(100), 'video/mp4', 'tweet_video');
    expect(result.mediaId).toBe('555');

    // Should have polled STATUS multiple times
    const statusCalls = client.rest.mock.calls.filter(
      ([, opts]) => opts.params?.command === 'STATUS',
    );
    expect(statusCalls.length).toBeGreaterThanOrEqual(3);
  });

  it('throws on processing failure', async () => {
    const client = createMockClient();
    client.rest = vi.fn(async (url, opts) => {
      const command = opts.form?.command ?? opts.multipart?.command ?? opts.params?.command;
      if (command === 'STATUS') {
        return {
          processing_info: {
            state: 'failed',
            error: { message: 'InvalidMedia: unsupported codec' },
          },
        };
      }
      return {};
    });

    await expect(pollProcessingStatus(client, '999')).rejects.toThrow(
      /Media processing failed.*unsupported codec/,
    );
  });
});

describe('media — alt text setting', () => {
  it('sends correct body to metadata/create', async () => {
    const client = createMockClient();

    await setAltText(client, '1234567890', 'A sunset over mountains');

    const call = client._calls.find((c) =>
      c.url?.includes('metadata/create'),
    );
    expect(call).toBeDefined();
    expect(call.opts.method).toBe('POST');

    const body = JSON.parse(call.opts.body);
    expect(body).toEqual({
      media_id: '1234567890',
      alt_text: { text: 'A sunset over mountains' },
    });
  });

  it('requires authentication', async () => {
    const client = createMockClient({ authenticated: false });

    await expect(setAltText(client, '123', 'text')).rejects.toThrow(
      /Authentication required/,
    );
  });
});

describe('media — getVideoUrl sorts by bitrate descending', () => {
  it('returns highest bitrate MP4 variant', async () => {
    const client = createMockClient();

    const result = await getVideoUrl(client, '999');

    expect(result).not.toBeNull();
    expect(result.url).toBe('https://video.twimg.com/720p.mp4');
    expect(result.bitrate).toBe(2176000);
    expect(result.contentType).toBe('video/mp4');
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it('filters out non-MP4 variants (m3u8)', async () => {
    const client = createMockClient();
    const result = await getVideoUrl(client, '999');

    // m3u8 should not be selected
    expect(result.url).not.toContain('m3u8');
  });

  it('returns null for tweets without video', async () => {
    const client = createMockClient();
    client.graphql = vi.fn(async () => ({
      data: {
        tweetResult: {
          result: {
            __typename: 'Tweet',
            rest_id: '888',
            legacy: {
              id_str: '888',
              extended_entities: {
                media: [{ type: 'photo', media_url_https: 'https://pbs.twimg.com/photo.jpg' }],
              },
            },
          },
        },
      },
    }));

    const result = await getVideoUrl(client, '888');
    expect(result).toBeNull();
  });
});

describe('media — scrapeMedia pagination', () => {
  it('scrapes media from user media tab', async () => {
    const client = createMockClient();

    const items = await scrapeMedia(client, 'testuser', { limit: 10 });

    // Should have resolved username first
    const userCall = client._calls.find((c) => c.opName === 'UserByScreenName');
    expect(userCall).toBeDefined();

    // Should have results from the fixture
    expect(items.length).toBeGreaterThanOrEqual(2);

    // First item is a photo
    const photo = items.find((m) => m.mediaType === 'photo');
    expect(photo).toBeDefined();
    expect(photo.tweetId).toBe('111');
    expect(photo.url).toContain('abc.jpg');
    expect(photo.altText).toBe('A cat');
    expect(photo.width).toBe(1200);

    // Second item is a video — url should be highest bitrate mp4
    const video = items.find((m) => m.mediaType === 'video');
    expect(video).toBeDefined();
    expect(video.tweetId).toBe('222');
    expect(video.url).toBe('https://video.twimg.com/high.mp4');
  });

  it('paginates using cursor', async () => {
    const client = createMockClient();

    await scrapeMedia(client, 'testuser', { limit: 100 });

    // Should have called UserMedia at least twice (1st page + 2nd empty page)
    const mediaCalls = client._calls.filter((c) => c.opName === 'UserMedia');
    expect(mediaCalls.length).toBeGreaterThanOrEqual(2);

    // Second call should include cursor
    expect(mediaCalls[1].variables.cursor).toBe('page2cursor');
  });

  it('throws for unavailable users', async () => {
    const client = createMockClient();
    client.graphql = vi.fn(async (qid, opName) => {
      if (opName === 'UserByScreenName') {
        return {
          data: {
            user: {
              result: { __typename: 'UserUnavailable' },
            },
          },
        };
      }
      return {};
    });

    await expect(scrapeMedia(client, 'deleted_user')).rejects.toThrow(
      /not found or unavailable/,
    );
  });
});

describe('media — parseMediaEntity', () => {
  it('parses a photo entity', () => {
    const entity = {
      type: 'photo',
      media_url_https: 'https://pbs.twimg.com/media/abc.jpg',
      original_info: { width: 1200, height: 800 },
      ext_alt_text: 'Cat photo',
    };

    const result = parseMediaEntity(entity, '100');
    expect(result.tweetId).toBe('100');
    expect(result.mediaType).toBe('photo');
    expect(result.url).toContain('abc.jpg');
    expect(result.url).toContain('name=orig');
    expect(result.width).toBe(1200);
    expect(result.height).toBe(800);
    expect(result.altText).toBe('Cat photo');
  });

  it('parses a video entity and picks highest bitrate', () => {
    const entity = {
      type: 'video',
      media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/thumb.jpg',
      original_info: { width: 1920, height: 1080 },
      ext_alt_text: null,
      video_info: {
        variants: [
          { bitrate: 256000, content_type: 'video/mp4', url: 'https://video.twimg.com/low.mp4' },
          { bitrate: 2176000, content_type: 'video/mp4', url: 'https://video.twimg.com/high.mp4' },
          { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/pl.m3u8' },
        ],
      },
    };

    const result = parseMediaEntity(entity, '200');
    expect(result.mediaType).toBe('video');
    expect(result.url).toBe('https://video.twimg.com/high.mp4');
    expect(result.thumbnailUrl).toBe('https://pbs.twimg.com/ext_tw_video_thumb/thumb.jpg');
    expect(result.altText).toBeNull();
  });
});

describe('media — uploadImage size validation', () => {
  it('rejects images over 5 MB', async () => {
    const client = createMockClient();
    const tooBig = Buffer.alloc(6 * 1024 * 1024, 0xff);
    // Add JPEG magic bytes
    tooBig[0] = 0xff;
    tooBig[1] = 0xd8;
    tooBig[2] = 0xff;

    await expect(uploadImage(client, tooBig)).rejects.toThrow(/5 MB limit/);
  });
});

describe('media — uploadGif sets correct category', () => {
  it('uploads with tweet_gif category', async () => {
    const client = createMockClient();
    // GIF magic bytes + padding
    const gifBuf = Buffer.alloc(1024);
    gifBuf[0] = 0x47; // G
    gifBuf[1] = 0x49; // I
    gifBuf[2] = 0x46; // F
    gifBuf[3] = 0x38; // 8

    await uploadGif(client, gifBuf);

    const initCall = client._calls.find(
      (c) => c.type === 'rest' && c.opts.form?.command === 'INIT',
    );
    expect(initCall.opts.form.media_category).toBe('tweet_gif');
    expect(initCall.opts.form.media_type).toBe('image/gif');
  });

  it('rejects GIFs over 15 MB', async () => {
    const client = createMockClient();
    const tooBig = Buffer.alloc(16 * 1024 * 1024);
    tooBig[0] = 0x47;
    tooBig[1] = 0x49;
    tooBig[2] = 0x46;
    tooBig[3] = 0x38;

    await expect(uploadGif(client, tooBig)).rejects.toThrow(/15 MB limit/);
  });
});

describe('media — authentication enforcement', () => {
  it('uploadMedia requires auth', async () => {
    const client = createMockClient({ authenticated: false });
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    await expect(uploadMedia(client, buf, { mediaType: 'image/jpeg' })).rejects.toThrow(
      /Authentication required/,
    );
  });

  it('uploadVideo requires auth', async () => {
    const client = createMockClient({ authenticated: false });
    const buf = Buffer.alloc(100);
    await expect(uploadVideo(client, buf, { mediaType: 'video/mp4' })).rejects.toThrow(
      /Authentication required/,
    );
  });
});
