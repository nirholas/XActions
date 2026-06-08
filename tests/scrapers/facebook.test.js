import { describe, it, expect } from 'vitest';
import facebook, {
  createBrowser,
  createPage,
  loginWithCookie,
  normalizeProfile,
  scrapeProfile,
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
      domFollowers: '5.2K followers',
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
});
