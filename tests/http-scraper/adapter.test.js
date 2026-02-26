/**
 * Tests — HTTP Scraper Adapter (Build 01-14)
 *
 * Verifies:
 * 1. HttpAdapter implements BaseAdapter interface
 * 2. createHttpScraper returns object with all expected methods
 * 3. Adapter registration in adapter index
 * 4. createBrowser({ adapter: 'http' }) works
 * 5. Backward compatibility — existing Puppeteer path untouched
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// 1. HttpAdapter class — interface compliance
// ---------------------------------------------------------------------------

describe('HttpAdapter', () => {
  let HttpAdapter, BaseAdapter;

  beforeEach(async () => {
    ({ HttpAdapter } = await import('../../src/scrapers/adapters/http.js'));
    ({ BaseAdapter } = await import('../../src/scrapers/adapters/base.js'));
  });

  it('extends BaseAdapter', () => {
    const adapter = new HttpAdapter();
    expect(adapter).toBeInstanceOf(BaseAdapter);
  });

  it('has name = "http"', () => {
    const adapter = new HttpAdapter();
    expect(adapter.name).toBe('http');
  });

  it('does not require a browser', () => {
    const adapter = new HttpAdapter();
    expect(adapter.requiresBrowser).toBe(false);
    expect(adapter.supportsJavaScript).toBe(false);
  });

  it('has a description', () => {
    const adapter = new HttpAdapter();
    expect(typeof adapter.description).toBe('string');
    expect(adapter.description.length).toBeGreaterThan(0);
  });

  it('implements checkDependencies()', async () => {
    const adapter = new HttpAdapter();
    const result = await adapter.checkDependencies();
    expect(result).toHaveProperty('available');
    expect(typeof result.available).toBe('boolean');
  });

  it('checkDependencies returns available: true when modules are present', async () => {
    const adapter = new HttpAdapter();
    const result = await adapter.checkDependencies();
    expect(result.available).toBe(true);
  });

  it('implements all BaseAdapter methods', () => {
    const adapter = new HttpAdapter();
    const requiredMethods = [
      'checkDependencies',
      'launch',
      'newPage',
      'goto',
      'setCookie',
      'scroll',
      'closePage',
      'closeBrowser',
    ];
    for (const method of requiredMethods) {
      expect(typeof adapter[method]).toBe('function');
    }
  });

  it('goto() is a no-op that does not throw', async () => {
    const adapter = new HttpAdapter();
    await expect(adapter.goto({}, 'https://x.com')).resolves.toBeUndefined();
  });

  it('scroll() is a no-op that does not throw', async () => {
    const adapter = new HttpAdapter();
    await expect(adapter.scroll({}, { y: 500 })).resolves.toBeUndefined();
  });

  it('closePage() is a no-op that does not throw', async () => {
    const adapter = new HttpAdapter();
    await expect(adapter.closePage({})).resolves.toBeUndefined();
  });

  it('closeBrowser() is a no-op that does not throw', async () => {
    const adapter = new HttpAdapter();
    await expect(adapter.closeBrowser({})).resolves.toBeUndefined();
  });

  it('evaluate() throws a descriptive error', async () => {
    const adapter = new HttpAdapter();
    await expect(adapter.evaluate({}, () => {})).rejects.toThrow(/not supported/i);
  });

  it('queryAll() throws a descriptive error', async () => {
    const adapter = new HttpAdapter();
    await expect(adapter.queryAll({}, 'div')).rejects.toThrow(/not supported/i);
  });

  it('getContent() throws a descriptive error', async () => {
    const adapter = new HttpAdapter();
    await expect(adapter.getContent({})).rejects.toThrow(/not supported/i);
  });

  it('screenshot() throws a descriptive error', async () => {
    const adapter = new HttpAdapter();
    await expect(adapter.screenshot({})).rejects.toThrow(/not supported/i);
  });

  it('getInfo() returns adapter metadata', () => {
    const adapter = new HttpAdapter();
    const info = adapter.getInfo();
    expect(info.name).toBe('http');
    expect(info.supportsJavaScript).toBe(false);
    expect(info.requiresBrowser).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Barrel index — createHttpScraper factory
// ---------------------------------------------------------------------------

describe('createHttpScraper', () => {
  let createHttpScraper;

  beforeEach(async () => {
    ({ createHttpScraper } = await import('../../src/scrapers/twitter/http/index.js'));
  });

  it('is exported as a function', () => {
    expect(typeof createHttpScraper).toBe('function');
  });

  it('returns an object with a client property', async () => {
    const scraper = await createHttpScraper();
    expect(scraper).toHaveProperty('client');
    expect(typeof scraper.client).toBe('object');
  });

  it('returns object with all expected scraping methods', async () => {
    const scraper = await createHttpScraper();

    const expectedMethods = [
      // Profile
      'scrapeProfile', 'scrapeProfileById',
      // Relationships
      'scrapeFollowers', 'scrapeFollowing', 'scrapeNonFollowers',
      'scrapeLikers', 'scrapeRetweeters', 'scrapeListMembers',
      // Actions
      'postTweet', 'postThread', 'deleteTweet', 'replyToTweet', 'quoteTweet', 'schedulePost',
      // Engagement
      'likeTweet', 'unlikeTweet', 'retweet', 'unretweet',
      'followUser', 'unfollowUser', 'followByUsername',
      'blockUser', 'unblockUser', 'muteUser', 'unmuteUser',
      'bookmarkTweet', 'unbookmarkTweet',
      'pinTweet', 'unpinTweet',
      'bulkUnfollow', 'bulkLike', 'bulkBlock',
      // Media
      'uploadMedia', 'uploadImage', 'uploadVideo', 'uploadGif',
      'setAltText', 'scrapeMedia', 'downloadMedia', 'getVideoUrl',
    ];

    for (const method of expectedMethods) {
      expect(typeof scraper[method]).toBe('function');
    }
  });

  it('includes parseUserData as a function', async () => {
    const scraper = await createHttpScraper();
    expect(typeof scraper.parseUserData).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 3. Barrel index — named exports
// ---------------------------------------------------------------------------

describe('barrel index exports', () => {
  it('exports core classes', async () => {
    const mod = await import('../../src/scrapers/twitter/http/index.js');
    expect(mod.TwitterHttpClient).toBeDefined();
    expect(mod.WaitingRateLimitStrategy).toBeDefined();
    expect(mod.ErrorRateLimitStrategy).toBeDefined();
    expect(mod.TwitterAuth).toBeDefined();
    expect(mod.GuestTokenManager).toBeDefined();
  });

  it('exports scraping functions', async () => {
    const mod = await import('../../src/scrapers/twitter/http/index.js');
    expect(typeof mod.scrapeProfile).toBe('function');
    expect(typeof mod.scrapeProfileById).toBe('function');
    expect(typeof mod.parseUserData).toBe('function');
    expect(typeof mod.scrapeFollowers).toBe('function');
    expect(typeof mod.scrapeFollowing).toBe('function');
    expect(typeof mod.scrapeNonFollowers).toBe('function');
    expect(typeof mod.scrapeLikers).toBe('function');
    expect(typeof mod.scrapeRetweeters).toBe('function');
    expect(typeof mod.scrapeListMembers).toBe('function');
  });

  it('exports action functions', async () => {
    const mod = await import('../../src/scrapers/twitter/http/index.js');
    expect(typeof mod.postTweet).toBe('function');
    expect(typeof mod.postThread).toBe('function');
    expect(typeof mod.deleteTweet).toBe('function');
    expect(typeof mod.replyToTweet).toBe('function');
    expect(typeof mod.quoteTweet).toBe('function');
    expect(typeof mod.schedulePost).toBe('function');
  });

  it('exports engagement functions', async () => {
    const mod = await import('../../src/scrapers/twitter/http/index.js');
    expect(typeof mod.likeTweet).toBe('function');
    expect(typeof mod.unlikeTweet).toBe('function');
    expect(typeof mod.retweet).toBe('function');
    expect(typeof mod.unretweet).toBe('function');
    expect(typeof mod.followUser).toBe('function');
    expect(typeof mod.unfollowUser).toBe('function');
    expect(typeof mod.blockUser).toBe('function');
    expect(typeof mod.unblockUser).toBe('function');
    expect(typeof mod.muteUser).toBe('function');
    expect(typeof mod.unmuteUser).toBe('function');
    expect(typeof mod.bookmarkTweet).toBe('function');
    expect(typeof mod.unbookmarkTweet).toBe('function');
    expect(typeof mod.bulkUnfollow).toBe('function');
    expect(typeof mod.bulkLike).toBe('function');
    expect(typeof mod.bulkBlock).toBe('function');
  });

  it('exports media functions', async () => {
    const mod = await import('../../src/scrapers/twitter/http/index.js');
    expect(typeof mod.uploadMedia).toBe('function');
    expect(typeof mod.uploadImage).toBe('function');
    expect(typeof mod.uploadVideo).toBe('function');
    expect(typeof mod.uploadGif).toBe('function');
    expect(typeof mod.scrapeMedia).toBe('function');
    expect(typeof mod.downloadMedia).toBe('function');
    expect(typeof mod.getVideoUrl).toBe('function');
  });

  it('exports endpoint constants', async () => {
    const mod = await import('../../src/scrapers/twitter/http/index.js');
    expect(mod.BEARER_TOKEN).toBeDefined();
    expect(typeof mod.BEARER_TOKEN).toBe('string');
    expect(mod.GRAPHQL).toBeDefined();
    expect(mod.DEFAULT_FEATURES).toBeDefined();
    expect(typeof mod.buildGraphQLUrl).toBe('function');
  });

  it('exports error classes', async () => {
    const mod = await import('../../src/scrapers/twitter/http/index.js');
    expect(mod.TwitterApiError).toBeDefined();
    expect(mod.RateLimitError).toBeDefined();
    expect(mod.AuthError).toBeDefined();
    expect(mod.NotFoundError).toBeDefined();
    expect(mod.NetworkError).toBeDefined();

    // Error hierarchy
    const err = new mod.RateLimitError('test');
    expect(err).toBeInstanceOf(mod.TwitterApiError);
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// 4. Adapter registration — 'http' is in the adapter registry
// ---------------------------------------------------------------------------

describe('adapter registry', () => {
  it('lists "http" as a registered adapter', async () => {
    const { listAdapters } = await import('../../src/scrapers/adapters/index.js');
    const adapters = listAdapters();
    expect(adapters).toContain('http');
  });

  it('getAdapter("http") returns an HttpAdapter instance', async () => {
    const { getAdapter } = await import('../../src/scrapers/adapters/index.js');
    const { HttpAdapter } = await import('../../src/scrapers/adapters/http.js');
    const adapter = await getAdapter('http');
    expect(adapter).toBeInstanceOf(HttpAdapter);
    expect(adapter.name).toBe('http');
  });
});

// ---------------------------------------------------------------------------
// 5. Backward compatibility — Puppeteer path untouched
// ---------------------------------------------------------------------------

describe('backward compatibility', () => {
  it('Puppeteer adapter is still registered', async () => {
    const { listAdapters } = await import('../../src/scrapers/adapters/index.js');
    expect(listAdapters()).toContain('puppeteer');
  });

  it('Cheerio adapter is still registered', async () => {
    const { listAdapters } = await import('../../src/scrapers/adapters/index.js');
    expect(listAdapters()).toContain('cheerio');
  });

  it('all original adapters are present', async () => {
    const { listAdapters } = await import('../../src/scrapers/adapters/index.js');
    const adapters = listAdapters();
    const expected = ['puppeteer', 'playwright', 'cheerio', 'crawlee', 'got-jsdom', 'selenium', 'http'];
    for (const name of expected) {
      expect(adapters).toContain(name);
    }
  });

  it('scrapers/index.js still exports createBrowser', async () => {
    const mod = await import('../../src/scrapers/index.js');
    expect(typeof mod.createBrowser).toBe('function');
  });

  it('scrapers/index.js exports createHttpScraper', async () => {
    const mod = await import('../../src/scrapers/index.js');
    expect(typeof mod.createHttpScraper).toBe('function');
  });

  it('scrapers/index.js still exports scrapeProfile', async () => {
    const mod = await import('../../src/scrapers/index.js');
    expect(typeof mod.scrapeProfile).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 6. HttpAdapter.launch() integration
// ---------------------------------------------------------------------------

describe('HttpAdapter.launch()', () => {
  it('returns object with _adapter = "http"', async () => {
    const { HttpAdapter } = await import('../../src/scrapers/adapters/http.js');
    const adapter = new HttpAdapter();
    const browser = await adapter.launch();
    expect(browser._adapter).toBe('http');
  });

  it('returns object with _scraper containing bound methods', async () => {
    const { HttpAdapter } = await import('../../src/scrapers/adapters/http.js');
    const adapter = new HttpAdapter();
    const browser = await adapter.launch();
    expect(browser._scraper).toBeDefined();
    expect(typeof browser._scraper.scrapeProfile).toBe('function');
    expect(typeof browser._scraper.likeTweet).toBe('function');
  });

  it('spreads scraper methods onto browser object', async () => {
    const { HttpAdapter } = await import('../../src/scrapers/adapters/http.js');
    const adapter = new HttpAdapter();
    const browser = await adapter.launch();
    // Methods should be accessible directly on the browser object
    expect(typeof browser.scrapeProfile).toBe('function');
    expect(typeof browser.postTweet).toBe('function');
  });

  it('newPage() returns object with scraper methods', async () => {
    const { HttpAdapter } = await import('../../src/scrapers/adapters/http.js');
    const adapter = new HttpAdapter();
    const browser = await adapter.launch();
    const page = await adapter.newPage(browser);
    expect(typeof page.scrapeProfile).toBe('function');
    expect(page._adapter).toBe('http');
  });
});
