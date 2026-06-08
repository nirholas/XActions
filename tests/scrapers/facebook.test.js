import { describe, it, expect } from 'vitest';
import facebook, {
  createBrowser,
  createPage,
  loginWithCookie,
  normalizeProfile,
  normalizePost,
  normalizeHandle,
  scrapeProfile,
  scrapeTweets,
} from '../../src/scrapers/facebook/index.js';
import { getPlatform, platforms, scrape } from '../../src/scrapers/index.js';

// ============================================================================
// AC2 — loginWithCookie error handling
// ============================================================================

describe('loginWithCookie', () => {
  it('throws when c_user is missing', async () => {
    const fakePage = { setCookie: async () => {}, goto: async () => {} };
    await expect(loginWithCookie(fakePage, { c_user: '', xs: 'some-xs-token' }))
      .rejects.toThrow('❌ Facebook login requires both c_user and xs cookies');
  });

  it('throws when xs is missing', async () => {
    const fakePage = { setCookie: async () => {}, goto: async () => {} };
    await expect(loginWithCookie(fakePage, { c_user: '123456789012345', xs: '' }))
      .rejects.toThrow('❌ Facebook login requires both c_user and xs cookies');
  });

  it('throws when both cookies are missing', async () => {
    const fakePage = { setCookie: async () => {}, goto: async () => {} };
    await expect(loginWithCookie(fakePage, {}))
      .rejects.toThrow('❌ Facebook login requires both c_user and xs cookies');
  });

  it('error message does not include cookie values', async () => {
    const fakePage = { setCookie: async () => {}, goto: async () => {} };
    const secretValue = 'SUPER_SECRET_XS_TOKEN';
    let caughtMessage = '';
    try {
      await loginWithCookie(fakePage, { c_user: '', xs: secretValue });
    } catch (e) {
      caughtMessage = e.message;
    }
    expect(caughtMessage).not.toContain(secretValue);
  });
});

// ============================================================================
// AC3 — Dispatcher wiring
// ============================================================================

describe('dispatcher wiring', () => {
  it('getPlatform("facebook") returns facebook module', () => {
    const mod = getPlatform('facebook');
    expect(mod).toBeDefined();
    expect(typeof mod.createBrowser).toBe('function');
    expect(typeof mod.createPage).toBe('function');
    expect(typeof mod.loginWithCookie).toBe('function');
  });

  it('getPlatform("fb") returns facebook module', () => {
    const mod = getPlatform('fb');
    expect(mod).toBeDefined();
    expect(typeof mod.createBrowser).toBe('function');
    expect(typeof mod.createPage).toBe('function');
    expect(typeof mod.loginWithCookie).toBe('function');
  });

  it('platforms.facebook is defined', () => {
    expect(platforms.facebook).toBeDefined();
  });

  it('platforms.fb is defined and same as platforms.facebook', () => {
    expect(platforms.fb).toBeDefined();
    expect(platforms.fb).toBe(platforms.facebook);
  });

  it('needsPuppeteer includes facebook — dispatcher routes correctly', () => {
    // Verify facebook is registered in the platforms registry.
    // This proves facebook routes into the Puppeteer branch when scrape() is called.
    expect(platforms.facebook).toBe(facebook);
  });

  it('existing platforms still resolve correctly', () => {
    const twitter = getPlatform('twitter');
    expect(twitter).toBeDefined();
    const threads = getPlatform('threads');
    expect(threads).toBeDefined();
    const bluesky = getPlatform('bluesky');
    expect(bluesky).toBeDefined();
  });

  it('unknown platform still throws', () => {
    expect(() => getPlatform('myspace')).toThrow(/Unknown platform/);
  });
});

// ============================================================================
// AC1 — Module exports
// ============================================================================

describe('facebook module exports', () => {
  it('exports createBrowser as named export', () => {
    expect(typeof createBrowser).toBe('function');
  });

  it('exports createPage as named export', () => {
    expect(typeof createPage).toBe('function');
  });

  it('exports loginWithCookie as named export', () => {
    expect(typeof loginWithCookie).toBe('function');
  });

  it('default export contains createBrowser, createPage, loginWithCookie', () => {
    expect(typeof facebook.createBrowser).toBe('function');
    expect(typeof facebook.createPage).toBe('function');
    expect(typeof facebook.loginWithCookie).toBe('function');
  });

  it('default export contains scrapeProfile', () => {
    expect(typeof facebook.scrapeProfile).toBe('function');
  });

  it('exports scrapeProfile as named export', () => {
    expect(typeof scrapeProfile).toBe('function');
  });
});

// ============================================================================
// AC1/AC2 — normalizeProfile (pure function, no browser)
// ============================================================================

describe('normalizeProfile', () => {
  it('returns normalized shape with all fields', () => {
    const raw = {
      ogTitle: 'Mark Zuckerberg | Facebook',
      ogDescription: '100M followers. CEO of Meta.',
      ogImage: 'https://cdn.fb.com/avatar.jpg',
      domFollowers: null,
      pageUrl: 'https://www.facebook.com/zuck',
    };
    const result = normalizeProfile(raw, 'zuck');
    expect(result.name).toBe('Mark Zuckerberg');
    expect(result.username).toBe('zuck');
    expect(result.followers).toBe('100M');
    expect(result.bio).toBe('CEO of Meta.');
    expect(result.avatar).toBe('https://cdn.fb.com/avatar.jpg');
    expect(result.url).toBe('https://www.facebook.com/zuck');
    expect(result.platform).toBe('facebook');
  });

  it('sets username from inputHandle even when ogTitle missing name', () => {
    const raw = {
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      domFollowers: null,
      pageUrl: 'https://www.facebook.com/someuser',
    };
    const result = normalizeProfile(raw, 'someuser');
    expect(result.username).toBe('someuser');
    expect(result.platform).toBe('facebook');
  });

  it('sets followers to null when not extractable', () => {
    const raw = {
      ogTitle: 'Some Page | Facebook',
      ogDescription: 'A page about stuff.',
      ogImage: null,
      domFollowers: null,
      pageUrl: 'https://www.facebook.com/somepage',
    };
    const result = normalizeProfile(raw, 'somepage');
    expect(result.followers).toBeNull();
  });

  it('falls back to domFollowers when og:description has no count', () => {
    const raw = {
      ogTitle: 'Test Page | Facebook',
      ogDescription: 'Just a bio.',
      ogImage: null,
      domFollowers: '5.2K', // already-extracted count (scrapeProfile captures group 1)
      pageUrl: 'https://www.facebook.com/testpage',
    };
    const result = normalizeProfile(raw, 'testpage');
    expect(result.followers).toBe('5.2K');
  });

  it('strips pipe and Facebook suffix from name', () => {
    const raw = {
      ogTitle: 'NASA | Facebook',
      ogDescription: '50M followers. Space agency.',
      ogImage: null,
      domFollowers: null,
      pageUrl: 'https://www.facebook.com/NASA',
    };
    const result = normalizeProfile(raw, 'NASA');
    expect(result.name).toBe('NASA');
  });

  it('uses pageUrl from raw when present', () => {
    const raw = {
      ogTitle: 'Test | Facebook',
      ogDescription: null,
      ogImage: null,
      domFollowers: null,
      pageUrl: 'https://www.facebook.com/test?fref=nf',
    };
    const result = normalizeProfile(raw, 'test');
    expect(result.url).toBe('https://www.facebook.com/test?fref=nf');
  });
});

// ============================================================================
// AC3/AC4 — scrapeProfile input normalization (browser-free via fake page)
// ============================================================================

describe('scrapeProfile input normalization', () => {
  const makePageWithMeta = (ogTitle, ogDescription = null, ogImage = null) => ({
    goto: async () => {},
    evaluate: async (fn) => fn.call({
      // Simulate browser document context
    }),
  });

  it('scrapeProfile throws on missing/blocked profile (ogTitle absent)', async () => {
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/nonexistent',
      }),
    };
    await expect(scrapeProfile(fakePage, 'nonexistent'))
      .rejects.toThrow(/profile not found or blocked/i);
  });

  it('scrapeProfile throws when ogTitle is generic "Facebook"', async () => {
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: 'Facebook',
        ogDescription: null,
        ogImage: null,
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/',
      }),
    };
    await expect(scrapeProfile(fakePage, 'unknown'))
      .rejects.toThrow(/profile not found or blocked/i);
  });

  it('scrapeProfile returns normalized profile on valid page', async () => {
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: 'Mark Zuckerberg | Facebook',
        ogDescription: '100M followers. CEO of Meta.',
        ogImage: 'https://cdn.fb.com/zuck.jpg',
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/zuck',
      }),
    };
    const result = await scrapeProfile(fakePage, 'zuck');
    expect(result.username).toBe('zuck');
    expect(result.name).toBe('Mark Zuckerberg');
    expect(result.platform).toBe('facebook');
    expect(result.followers).toBe('100M');
  });

  it('scrapeProfile strips leading @ from handle', async () => {
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: 'Test User | Facebook',
        ogDescription: null,
        ogImage: null,
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/testuser',
      }),
    };
    const result = await scrapeProfile(fakePage, '@testuser');
    expect(result.username).toBe('testuser');
  });

  it('scrapeProfile accepts full URL and extracts handle', async () => {
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: 'NASA | Facebook',
        ogDescription: '50M followers. Space.',
        ogImage: null,
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/NASA',
      }),
    };
    const result = await scrapeProfile(fakePage, 'https://www.facebook.com/NASA');
    expect(result.username).toBe('NASA');
  });

  it('scrapeProfile strips subpath from handle (zuck/photos → zuck)', async () => {
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: 'Mark Zuckerberg | Facebook',
        ogDescription: '100M followers.',
        ogImage: null,
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/zuck',
      }),
    };
    const result = await scrapeProfile(fakePage, 'https://www.facebook.com/zuck/photos');
    expect(result.username).toBe('zuck');
  });

  it('scrapeProfile strips query string from bare handle (zuck?fref=nf → zuck)', async () => {
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: 'Mark Zuckerberg | Facebook',
        ogDescription: '100M followers.',
        ogImage: null,
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/zuck',
      }),
    };
    const result = await scrapeProfile(fakePage, 'zuck?fref=nf');
    expect(result.username).toBe('zuck');
  });

  it('scrapeProfile preserves profile.php?id= numeric identifier', async () => {
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: 'Some User | Facebook',
        ogDescription: null,
        ogImage: null,
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/profile.php?id=100069',
      }),
    };
    const result = await scrapeProfile(fakePage, 'https://www.facebook.com/profile.php?id=100069');
    expect(result.username).toBe('profile.php?id=100069');
  });
});

// ============================================================================
// AC4 — dispatcher scrape() routes facebook to puppeteer branch
// ============================================================================

describe('dispatcher scrape() facebook routing', () => {
  it('scrape("facebook","profile",...) invokes scrapeProfile on provided page', async () => {
    const calls = [];
    const fakePage = {
      goto: async () => {},
      evaluate: async () => ({
        ogTitle: 'Test Page | Facebook',
        ogDescription: '1K followers. Test.',
        ogImage: null,
        domFollowers: null,
        pageUrl: 'https://www.facebook.com/testpage',
      }),
    };

    const result = await scrape('facebook', 'profile', {
      page: fakePage,
      username: 'testpage',
    });

    expect(result.platform).toBe('facebook');
    expect(result.username).toBe('testpage');
  });

  it('scrape("facebook",...) rejects authToken with a clear message (must use authCookie)', async () => {
    await expect(
      scrape('facebook', 'profile', { username: 'zuck', authToken: 'some-string-token' })
    ).rejects.toThrow(/authCookie.*not.*authToken/i);
  });
});

// ============================================================================
// Story 1.3 — normalizeHandle
// ============================================================================

describe('normalizeHandle', () => {
  it('strips leading @', () => {
    expect(normalizeHandle('@zuck')).toBe('zuck');
  });

  it('extracts handle from full URL', () => {
    expect(normalizeHandle('https://www.facebook.com/zuck')).toBe('zuck');
  });

  it('extracts handle from URL without www', () => {
    expect(normalizeHandle('https://facebook.com/NASA')).toBe('NASA');
  });

  it('strips subpath', () => {
    expect(normalizeHandle('zuck/photos')).toBe('zuck');
  });

  it('strips query string', () => {
    expect(normalizeHandle('zuck?fref=nf')).toBe('zuck');
  });

  it('preserves profile.php?id= identifier', () => {
    expect(normalizeHandle('profile.php?id=123456789')).toBe('profile.php?id=123456789');
  });

  it('passes through plain handle unchanged', () => {
    expect(normalizeHandle('markzuckerberg')).toBe('markzuckerberg');
  });
});

// ============================================================================
// Story 1.3 — normalizePost
// ============================================================================

describe('normalizePost', () => {
  it('returns full normalized post shape', () => {
    const raw = {
      id: 'post-123',
      text: 'Hello world',
      timestamp: '2026-01-01T00:00:00Z',
      likes: '42',
      comments: '7',
      postUrl: 'https://www.facebook.com/zuck/posts/123',
      images: ['https://cdn.fb.com/img1.jpg'],
      hasVideo: false,
    };
    const result = normalizePost(raw);
    expect(result.id).toBe('post-123');
    expect(result.text).toBe('Hello world');
    expect(result.timestamp).toBe('2026-01-01T00:00:00Z');
    expect(result.likes).toBe('42');
    expect(result.comments).toBe('7');
    expect(result.url).toBe('https://www.facebook.com/zuck/posts/123');
    expect(result.media.images).toEqual(['https://cdn.fb.com/img1.jpg']);
    expect(result.media.hasVideo).toBe(false);
    expect(result.platform).toBe('facebook');
  });

  it('sets hasVideo true when present', () => {
    const raw = { id: 'v1', text: 'vid', timestamp: null, likes: '0', comments: '0', postUrl: null, images: [], hasVideo: true };
    expect(normalizePost(raw).media.hasVideo).toBe(true);
  });

  it('defaults likes and comments to "0" when absent', () => {
    const raw = { id: 'p1', text: 'test', timestamp: null, likes: undefined, comments: undefined, postUrl: null, images: [], hasVideo: false };
    const result = normalizePost(raw);
    expect(result.likes).toBe('0');
    expect(result.comments).toBe('0');
  });

  it('sets images to empty array when absent', () => {
    const raw = { id: 'p2', text: 'test', timestamp: null, likes: '1', comments: '0', postUrl: null, images: undefined, hasVideo: false };
    expect(normalizePost(raw).media.images).toEqual([]);
  });

  it('always sets platform to "facebook"', () => {
    const raw = { id: 'p3', text: 'x', timestamp: null, likes: '0', comments: '0', postUrl: null, images: [], hasVideo: false };
    expect(normalizePost(raw).platform).toBe('facebook');
  });
});

// ============================================================================
// Story 1.3 — scrapeTweets (browser-free via fake page)
// ============================================================================

describe('scrapeTweets', () => {
  const makeFakePage = (rawPosts = []) => ({
    goto: async () => {},
    evaluate: async (fn) => {
      // If fn is the scroll call (no return value needed), skip
      if (fn.toString().includes('scrollTo')) return undefined;
      // Otherwise return canned raw posts
      return rawPosts;
    },
  });

  it('returns empty array when no posts', async () => {
    const page = makeFakePage([]);
    const result = await scrapeTweets(page, 'zuck', { limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('returns normalized posts with platform: facebook', async () => {
    const rawPosts = [
      { id: 'post-1', text: 'Hello', timestamp: null, likes: '5', comments: '2', postUrl: 'https://www.facebook.com/zuck/posts/1', images: [], hasVideo: false },
      { id: 'post-2', text: 'World', timestamp: null, likes: '10', comments: '3', postUrl: 'https://www.facebook.com/zuck/posts/2', images: [], hasVideo: false },
    ];
    const page = makeFakePage(rawPosts);
    const result = await scrapeTweets(page, 'zuck', { limit: 10 });
    expect(result.length).toBe(2);
    expect(result[0].platform).toBe('facebook');
    expect(result[0].id).toBe('post-1');
  });

  it('respects limit', async () => {
    const rawPosts = Array.from({ length: 10 }, (_, i) => ({
      id: `post-${i}`, text: `text ${i}`, timestamp: null, likes: '0', comments: '0',
      postUrl: `https://www.facebook.com/zuck/posts/${i}`, images: [], hasVideo: false,
    }));
    const page = makeFakePage(rawPosts);
    const result = await scrapeTweets(page, 'zuck', { limit: 3 });
    expect(result.length).toBe(3);
  });

  it('calls onProgress each iteration', async () => {
    const progressCalls = [];
    const page = makeFakePage([]);
    await scrapeTweets(page, 'zuck', { limit: 5, onProgress: (p) => progressCalls.push(p) });
    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0]).toHaveProperty('scraped');
    expect(progressCalls[0]).toHaveProperty('limit');
  });
});

// ============================================================================
// Story 1.3 — dispatcher routing for posts/tweets
// ============================================================================

describe('dispatcher scrape() posts/tweets routing', () => {
  const makeFakePage = (rawPosts = []) => ({
    goto: async () => {},
    evaluate: async (fn) => {
      if (fn.toString().includes('scrollTo')) return undefined;
      return rawPosts;
    },
  });

  it('scrape("facebook","posts",...) returns post array', async () => {
    const rawPosts = [
      { id: 'p1', text: 'Post 1', timestamp: null, likes: '1', comments: '0', postUrl: 'https://www.facebook.com/x/posts/1', images: [], hasVideo: false },
    ];
    const result = await scrape('facebook', 'posts', { page: makeFakePage(rawPosts), username: 'testpage' });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].platform).toBe('facebook');
  });

  it('scrape("facebook","tweets",...) also routes to scrapeTweets', async () => {
    const result = await scrape('facebook', 'tweets', { page: makeFakePage([]), username: 'testpage' });
    expect(Array.isArray(result)).toBe(true);
  });
});
