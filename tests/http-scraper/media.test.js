// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for src/scrapers/twitter/http/media.js
 *
 * Uses vitest with mocked fetch / client — no real network requests.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  mimeFromExtension,
  mimeFromBuffer,
  uploadChunked,
  pollProcessingStatus,
  uploadMedia,
  uploadImage,
  uploadVideo,
  uploadGif,
  setAltText,
  scrapeMedia,
  getVideoUrl,
  parseMediaEntity,
} from '../../src/scrapers/twitter/http/media.js';
import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';

// ---------------------------------------------------------------------------
// Client mock factory
// ---------------------------------------------------------------------------

/** The string fields of a request, from a form, multipart, JSON body or query. */
function fieldsOf(url, opts = {}) {
  const body = opts.body;
  if (body instanceof URLSearchParams || body instanceof FormData) {
    return Object.fromEntries([...body.entries()].filter(([, v]) => typeof v === 'string'));
  }
  const query = new URL(url).searchParams;
  if (query.has('command')) return Object.fromEntries(query);
  return body && typeof body === 'object' ? body : {};
}

function createMockClient({ authenticated = true } = {}) {
  const calls = [];

  return {
    _calls: calls,
    isAuthenticated: vi.fn(() => authenticated),
    AuthError: Error,

    request: vi.fn(async (url, opts = {}) => {
      const fields = fieldsOf(url, opts);
      calls.push({ type: 'request', url, opts, fields });
      const command = fields.command;

      if (command === 'INIT') {
        return { media_id_string: '1234567890', media_id: 1234567890 };
      }
      if (command === 'APPEND') {
        return {}; // APPEND answers with an empty body
      }
      if (command === 'FINALIZE') {
        return { media_id_string: '1234567890', media_key: '3_1234567890' };
      }
      if (command === 'STATUS') {
        return { processing_info: { state: 'succeeded', progress_percent: 100 } };
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
      (c) => c.fields.command === 'INIT',
    );
    expect(initCall).toBeDefined();
    expect(initCall.opts.method).toBe('POST');
    expect(initCall.fields).toEqual({
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
      (c) => c.fields.command === 'APPEND',
    );

    expect(appendCalls).toHaveLength(2);
    expect(appendCalls[0].fields.segment_index).toBe('0');
    expect(appendCalls[1].fields.segment_index).toBe('1');
  });

  it('sends a single chunk for a small file', async () => {
    const client = createMockClient();
    const buffer = Buffer.alloc(1000, 0xcd);

    await uploadChunked(client, buffer, 'image/png', 'tweet_image');

    const appendCalls = client._calls.filter(
      (c) => c.fields.command === 'APPEND',
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
      (c) => c.fields.command === 'FINALIZE',
    );
    expect(finalizeCall).toBeDefined();
    expect(finalizeCall.fields).toEqual({
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
    // Override request to simulate pending, then succeeded
    client.request = vi.fn(async (url, opts) => {
      const command = fieldsOf(url, opts).command;

      if (command === 'INIT') return { media_id_string: '555' };
      if (command === 'APPEND') return {};
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
    const statusCalls = client.request.mock.calls.filter(
      ([url, opts]) => fieldsOf(url, opts).command === 'STATUS',
    );
    expect(statusCalls.length).toBeGreaterThanOrEqual(3);
  });

  it('throws on processing failure', async () => {
    const client = createMockClient();
    client.request = vi.fn(async (url, opts) => {
      const command = fieldsOf(url, opts).command;
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

describe('media upload on the wire, through a real client', () => {
  /**
   * The upload once went through client.rest() with options rest() ignores,
   * against a URL rest() prefixed with the REST base, so no upload could
   * work while every mock-based test passed. This one drives the real client
   * and checks what fetch receives.
   */
  it('sends a form INIT, multipart APPENDs, accepts the empty APPEND body, and FINALIZEs', async () => {
    const requests = [];
    const reply = (status, text) => ({ status, ok: status < 300, headers: { get: () => null }, text: async () => text });
    const fetch = async (url, init) => {
      requests.push({ url, init });
      const fields = init.body instanceof FormData
        ? Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : v]))
        : Object.fromEntries(new URLSearchParams(init.body || new URL(url).search));
      if (fields.command === 'INIT') return reply(202, JSON.stringify({ media_id_string: '42' }));
      if (fields.command === 'APPEND') return reply(204, '');
      if (fields.command === 'FINALIZE') return reply(201, JSON.stringify({ media_id_string: '42', media_key: '3_42' }));
      if (url.includes('metadata/create')) return reply(200, '');
      throw new Error(`unplanned request ${url}`);
    };
    const client = new TwitterHttpClient({ cookies: 'auth_token=t; ct0=c', fetch, maxRetries: 0, transactionId: false });

    const buffer = Buffer.alloc(6 * 1024 * 1024, 7);
    const result = await uploadChunked(client, buffer, 'image/png', 'dm_image');
    await setAltText(client, '42', 'a chart');

    expect(result).toEqual({ mediaId: '42', mediaKey: '3_42', expiresAfterSecs: null });
    const [init, append0, append1, finalize, alt] = requests;
    expect(init.url).toBe('https://upload.x.com/i/media/upload.json');
    expect(init.init.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(new URLSearchParams(init.init.body).get('media_category')).toBe('dm_image');
    expect(append0.init.body).toBeInstanceOf(FormData);
    expect(append0.init.headers['content-type']).toBeUndefined();
    expect(append0.init.body.get('segment_index')).toBe('0');
    expect(append1.init.body.get('segment_index')).toBe('1');
    expect(append0.init.body.get('media').size + append1.init.body.get('media').size).toBe(buffer.length);
    expect(new URLSearchParams(finalize.init.body).get('command')).toBe('FINALIZE');
    expect(JSON.parse(alt.init.body)).toEqual({ media_id: '42', alt_text: { text: 'a chart' } });
    expect(requests).toHaveLength(5); // nothing was retried
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

    expect(call.opts.body).toEqual({
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
      (c) => c.fields.command === 'INIT',
    );
    expect(initCall.fields.media_category).toBe('tweet_gif');
    expect(initCall.fields.media_type).toBe('image/gif');
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
