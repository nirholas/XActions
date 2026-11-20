// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The read commands' output contract, end to end and offline.
 *
 * AGENTS.md promises, for every read command:
 *
 * - `--compact` prints one tab-separated `key=value` record per line, with
 *   the default columns for that record kind;
 * - `--fields` narrows and orders those columns;
 * - `--compact` wins over `--json`;
 * - an empty result is an error with a non-zero exit, never "0 results".
 *
 * Each command runs in-process through the exported commander program, all
 * the way down to the real HTTP clients and their GraphQL parsers. Only the
 * transport is replaced: both clients (src/client's Scraper and the HTTP
 * scraper's TwitterHttpClient) are handed a fetch that answers from the
 * captured X payloads in tests/http-scraper/fixtures. The global fetch
 * throws, so nothing can reach X. `hashtag` still drives Puppeteer, so its
 * browser layer is replaced with records in the DOM scraper's shape.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CommanderError } from 'commander';

import * as F from '../http-scraper/fixtures/responses.js';
import { DEFAULT_FIELDS } from '../../src/utils/output.js';

/**
 * The fake transport. `routes` maps a GraphQL operation name to the payload
 * served for its first page; a request carrying a cursor gets an empty page,
 * so pagination ends deterministically. `empty` names operations that answer
 * with no data at all, and `missing` handles whose profile lookup is empty.
 */
const transport = vi.hoisted(() => {
  const state = { routes: {}, empty: new Set(), missing: new Set(), requests: [] };
  state.fetch = async (input) => {
    const url = String(input);
    state.requests.push(url);
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.includes('guest/activate')) return json({ guest_token: '1700000000000000000' });
    const op = url.match(/\/graphql\/[^/]+\/(\w+)/)?.[1];
    if (!op) return new Response('', { status: 404 });
    const decoded = decodeURIComponent(url);
    const handle = decoded.match(/"screen_name":"([^"]+)"/)?.[1];
    if (state.empty.has(op) || (handle && state.missing.has(handle.toLowerCase()))) return json({ data: {} });
    if (decoded.includes('"cursor"')) return json({ data: {} });
    const body = state.routes[op];
    return body ? json(body) : json({ errors: [{ message: `no fixture for ${op}` }] }, 404);
  };
  return state;
});

/** Records `hashtag` gets back from the (replaced) Puppeteer scraper. */
const browser = vi.hoisted(() => ({ records: [], closed: 0 }));

vi.mock('../../src/client/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  class FixtureScraper extends actual.Scraper {
    constructor(options = {}) {
      super({ ...options, fetch: transport.fetch, transactionId: false });
    }
  }
  return { ...actual, Scraper: FixtureScraper };
});

vi.mock('../../src/scrapers/twitter/http/client.js', async (importOriginal) => {
  const actual = await importOriginal();
  class FixtureHttpClient extends actual.TwitterHttpClient {
    constructor(options = {}) {
      super({ ...options, fetch: transport.fetch, transactionId: false });
    }
  }
  return { ...actual, TwitterHttpClient: FixtureHttpClient };
});

vi.mock('../../src/scrapers/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  const fakes = {
    createBrowser: async () => ({ close: async () => { browser.closed++; } }),
    createPage: async () => ({}),
    loginWithCookie: async () => {},
    scrapeHashtag: async (_page, _tag, { limit } = {}) => browser.records.slice(0, limit),
  };
  return { ...actual, ...fakes, default: { ...actual.default, ...fakes } };
});

// The CLI resolves XACTIONS_HOME (config, brief cache) when it is imported.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-cli-read-'));
process.env.HOME = home;
process.env.XACTIONS_HOME = path.join(home, 'xh');
process.env.FORCE_COLOR = '0';
delete process.env.TWITTER_AUTH_TOKEN;

let program;
let stdout = '';
let stderr = '';

/**
 * Run one CLI invocation in-process and collect what it printed.
 * @param {string[]} argv
 * @returns {Promise<{ code: number, stdout: string, stderr: string, lines: string[] }>}
 */
async function cli(argv) {
  stdout = '';
  stderr = '';
  process.exitCode = undefined;
  let code;
  try {
    await program.parseAsync(argv, { from: 'user' });
    code = process.exitCode ?? 0;
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
    code = error.exitCode;
  }
  process.exitCode = undefined;
  return { code, stdout, stderr, lines: stdout.split('\n').filter(Boolean) };
}

/** Parse one compact line into ordered [key, value] pairs. */
function cells(line) {
  return line.split('\t').map((cell) => {
    const eq = cell.indexOf('=');
    return [cell.slice(0, eq), cell.slice(eq + 1)];
  });
}

/** Column names of a compact line, in order. */
const keysOf = (line) => cells(line).map(([k]) => k);

/**
 * Shared assertions for a `--compact` result: exit 0, one well-formed record
 * per line, nothing on stdout that is not a record, columns drawn from the
 * kind's defaults in their default order.
 */
function expectCompact(result, kind, { records, columns }) {
  expect(result.code, result.stderr).toBe(0);
  expect(result.stdout.endsWith('\n')).toBe(true);
  expect(result.lines).toHaveLength(records);
  for (const line of result.lines) {
    expect(line).not.toMatch(/\x1b\[/);
    for (const [key] of cells(line)) expect(key).toMatch(/^[A-Za-z]+$/);
    expect(keysOf(line)).toEqual(columns);
  }
  // Whatever the record carried, the columns are a subsequence of the defaults.
  const defaults = DEFAULT_FIELDS[kind];
  expect(columns.every((c, i) => defaults.indexOf(c) > (i ? defaults.indexOf(columns[i - 1]) : -1))).toBe(true);
}

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url) => {
    throw new Error(`network access in an offline CLI test: ${url}`);
  });
  ({ program } = await import('../../src/cli/index.js'));
  for (const cmd of [program, ...program.commands]) cmd.exitOverride();
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code}) called during an in-process CLI test`);
  });
});

/**
 * A captured page with its cursor entries removed, so it reads as the last
 * page. The client waits one to two seconds before following a cursor (a
 * courtesy delay toward X); serving single pages keeps each test well under a
 * second without touching timers.
 */
function lastPage(value) {
  if (Array.isArray(value)) {
    return value.filter((v) => !(typeof v?.entryId === 'string' && v.entryId.startsWith('cursor-'))).map(lastPage);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, lastPage(v)]));
  }
  return value;
}

const PAGES = {
  UserByScreenName: F.PROFILE_RESPONSE,
  UserTweets: lastPage(F.TWEETS_RESPONSE),
  UserTweetsAndReplies: lastPage(F.TWEETS_RESPONSE),
  UserMedia: lastPage(F.TWEETS_RESPONSE),
  Followers: lastPage(F.FOLLOWERS_RESPONSE),
  Following: lastPage(F.FOLLOWING_RESPONSE),
  SearchTimeline: lastPage(F.SEARCH_RESPONSE),
  TweetDetail: F.THREAD_RESPONSE,
};

beforeEach(() => {
  transport.routes = { ...PAGES };
  transport.empty = new Set();
  transport.missing = new Set();
  transport.requests = [];
  browser.records = [];
  browser.closed = 0;
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => { stdout += String(chunk); return true; });
  vi.spyOn(console, 'log').mockImplementation((...args) => { stdout += `${args.join(' ')}\n`; });
  vi.spyOn(console, 'error').mockImplementation((...args) => { stderr += `${args.join(' ')}\n`; });
  vi.spyOn(console, 'warn').mockImplementation((...args) => { stderr += `${args.join(' ')}\n`; });
});

afterEach(() => {
  vi.mocked(process.stdout.write).mockRestore();
  vi.mocked(console.log).mockRestore();
  vi.mocked(console.error).mockRestore();
  vi.mocked(console.warn).mockRestore();
  process.exitCode = undefined;
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});

describe('profile', () => {
  it('--compact prints one profile record with every default column', async () => {
    const result = await cli(['profile', 'testuser', '--compact']);
    expectCompact(result, 'profile', { records: 1, columns: DEFAULT_FIELDS.profile });
    expect(Object.fromEntries(cells(result.lines[0]))).toMatchObject({ id: '1890123456', username: 'testuser', followers: '24500' });
  });

  it('--fields narrows and orders the columns', async () => {
    const result = await cli(['profile', 'testuser', '--compact', '--fields', 'followers,username']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['followers=24500\tusername=testuser']);
  });

  it('--compact wins over --json', async () => {
    const both = await cli(['profile', 'testuser', '--json', '--compact']);
    const compact = await cli(['profile', 'testuser', '--compact']);
    expect(both.stdout).toBe(compact.stdout);
    expect(() => JSON.parse(both.stdout)).toThrow();
  });

  it('--json alone prints the profile object and nothing else', async () => {
    const result = await cli(['profile', 'testuser', '--json']);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ id: '1890123456', username: 'testuser' });
  });

  it('a profile X returns nothing for is an error, not an empty record', async () => {
    transport.missing.add('ghost');
    const result = await cli(['profile', 'ghost', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/ghost/);
  });
});

describe('tweets', () => {
  it('--compact prints one tweet per line with the default tweet columns', async () => {
    const result = await cli(['tweets', 'testuser', '--limit', '10', '--compact']);
    expectCompact(result, 'tweet', { records: 3, columns: DEFAULT_FIELDS.tweet });
    expect(result.lines.map((l) => Object.fromEntries(cells(l)).id)).toEqual([
      '1800000000000000001',
      '1800000000000000002',
      '1800000000000000003',
    ]);
  });

  it('--limit caps the records printed', async () => {
    const result = await cli(['tweets', 'testuser', '--limit', '2', '--compact']);
    expect(result.code).toBe(0);
    expect(result.lines).toHaveLength(2);
  });

  it('--fields reaches a field outside the defaults, in the order given', async () => {
    const result = await cli(['tweets', 'testuser', '--limit', '10', '--compact', '--fields', 'likes,id,permanentUrl']);
    expect(result.code).toBe(0);
    for (const line of result.lines) expect(keysOf(line)).toEqual(['likes', 'id', 'permanentUrl']);
    expect(result.lines[0]).toMatch(/^likes=\d+\tid=1800000000000000001\tpermanentUrl=https:\/\/(x|twitter)\.com\//);
  });

  it('--compact wins over --json, and --json alone is a JSON array', async () => {
    const both = await cli(['tweets', 'testuser', '--limit', '10', '--compact', '--json']);
    expect(both.lines).toHaveLength(3);
    expect(both.lines[0].startsWith('id=')).toBe(true);
    const json = await cli(['tweets', 'testuser', '--limit', '10', '--json']);
    expect(json.code).toBe(0);
    const parsed = JSON.parse(json.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
  });

  it('an empty timeline exits 1 with an explanation, not "0 results"', async () => {
    transport.empty.add('UserTweets');
    const result = await cli(['tweets', 'testuser', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/No tweets for @testuser returned/);
    expect(result.stderr).toMatch(/xactions login/);
  });

  it('--replies reads the tweets-and-replies timeline', async () => {
    const result = await cli(['tweets', 'testuser', '--replies', '--limit', '10', '--compact']);
    expect(result.code).toBe(0);
    expect(transport.requests.some((u) => u.includes('/UserTweetsAndReplies'))).toBe(true);
  });
});

describe('search', () => {
  it('--compact prints tweet records', async () => {
    const result = await cli(['search', 'ai agents', '--limit', '10', '--compact']);
    expectCompact(result, 'tweet', { records: 3, columns: DEFAULT_FIELDS.tweet });
  });

  it('--fields narrows search results too', async () => {
    const result = await cli(['search', 'ai agents', '--limit', '10', '--compact', '--fields', 'username,id']);
    expect(result.code).toBe(0);
    for (const line of result.lines) expect(line).toMatch(/^username=[^\t]+\tid=\d+$/);
  });

  it('--compact wins over --json', async () => {
    const both = await cli(['search', 'ai agents', '--limit', '10', '--compact', '--json']);
    const compact = await cli(['search', 'ai agents', '--limit', '10', '--compact']);
    expect(both.stdout).toBe(compact.stdout);
  });

  it('--filter people searches accounts, and an empty answer is an error naming accounts', async () => {
    // The captured SearchTimeline page holds tweets, not users, so a people
    // search over it finds no accounts.
    const result = await cli(['search', 'ai agents', '--filter', 'people', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/No accounts for "ai agents" returned/);
  });

  it('no results at all exits 1', async () => {
    transport.empty.add('SearchTimeline');
    const result = await cli(['search', 'nothing here', '--json']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/No results for "nothing here" returned/);
  });
});

describe('followers and following', () => {
  it('followers --compact prints user records with the default user columns', async () => {
    const result = await cli(['followers', 'testuser', '--limit', '10', '--compact']);
    expectCompact(result, 'user', { records: 5, columns: DEFAULT_FIELDS.user });
    expect(result.lines.map((l) => Object.fromEntries(cells(l)).username)).toEqual([
      'alice_dev',
      'bob_codes',
      'carol_ml',
      'dave_ops',
      'eve_sec',
    ]);
  });

  it('followers --fields and --compact over --json', async () => {
    const result = await cli(['followers', 'testuser', '--limit', '10', '--json', '--compact', '--fields', 'username']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['username=alice_dev', 'username=bob_codes', 'username=carol_ml', 'username=dave_ops', 'username=eve_sec']);
  });

  it('followers --json alone is the array', async () => {
    const result = await cli(['followers', 'testuser', '--limit', '10', '--json']);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).map((u) => u.username)).toHaveLength(5);
  });

  it('an empty follower list exits 1', async () => {
    transport.empty.add('Followers');
    const result = await cli(['followers', 'testuser', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/No followers for @testuser returned/);
  });

  it('following --compact prints the accounts followed', async () => {
    const result = await cli(['following', 'testuser', '--limit', '10', '--compact', '--fields', 'username']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['username=alice_dev', 'username=carol_ml', 'username=frank_ai', 'username=grace_ui']);
  });

  it('non-followers is the following list minus the followers', async () => {
    const result = await cli(['non-followers', 'testuser', '--limit', '10', '--compact', '--fields', 'username']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['username=frank_ai', 'username=grace_ui']);
  });

  it('non-followers refuses to report everyone when the follower list came back empty', async () => {
    transport.empty.add('Followers');
    const result = await cli(['non-followers', 'testuser', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/No followers of @testuser returned/);
  });
});

describe('thread', () => {
  it('--compact prints the root and the author\'s replies as tweet records', async () => {
    const result = await cli(['thread', 'https://x.com/testuser/status/1810000000000000001', '--compact']);
    expectCompact(result, 'tweet', { records: 3, columns: DEFAULT_FIELDS.tweet });
    expect(result.lines.map((l) => Object.fromEntries(cells(l)).id)).toEqual([
      '1810000000000000001',
      '1810000000000000002',
      '1810000000000000003',
    ]);
  });

  it('--fields and --compact over --json', async () => {
    const result = await cli(['thread', '1810000000000000001', '--json', '--compact', '--fields', 'id']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['id=1810000000000000001', 'id=1810000000000000002', 'id=1810000000000000003']);
  });

  it('a URL with no tweet id exits 1 before any request', async () => {
    const result = await cli(['thread', 'https://x.com/testuser', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/Could not find a tweet id/);
    expect(transport.requests).toEqual([]);
  });

  it('a thread X returns nothing for exits 1', async () => {
    transport.empty.add('TweetDetail');
    const result = await cli(['thread', '1810000000000000001', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
  });
});

describe('media', () => {
  it('--compact prints media records with type, url and tweetUrl', async () => {
    const result = await cli(['media', 'testuser', '--limit', '10', '--compact']);
    expectCompact(result, 'media', { records: 1, columns: DEFAULT_FIELDS.media });
    expect(result.lines[0]).toBe(
      'type=photo\turl=https://pbs.twimg.com/media/FakeImg1.jpg?format=jpg&name=orig\ttweetUrl=https://x.com/testuser/status/1800000000000000002',
    );
  });

  it('--fields reaches the extra media fields', async () => {
    const result = await cli(['media', '@testuser', '--compact', '--fields', 'width,height,type']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['width=1920\theight=1080\ttype=photo']);
  });

  it('--compact wins over --json', async () => {
    const result = await cli(['media', 'testuser', '--json', '--compact']);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].startsWith('type=photo')).toBe(true);
  });

  it('an account with no media exits 1', async () => {
    transport.empty.add('UserMedia');
    const result = await cli(['media', 'testuser', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/No media items returned/);
  });
});

describe('hashtag', () => {
  /** Records in the shape the Puppeteer search scraper returns. */
  const domTweet = (id, likes) => ({
    id,
    text: `post ${id} about #agents\nsecond line`,
    author: 'testuser',
    timestamp: '2026-08-27T10:00:00.000Z',
    likes,
    retweets: 1,
    replies: 2,
    views: 300,
    url: `https://x.com/testuser/status/${id}`,
    platform: 'twitter',
  });

  it('--compact prints DOM-scraped tweets with the default tweet columns', async () => {
    browser.records = [domTweet('1900000000000000001', 5), domTweet('1900000000000000002', 9)];
    const result = await cli(['hashtag', 'agents', '--compact']);
    expectCompact(result, 'tweet', { records: 2, columns: DEFAULT_FIELDS.tweet });
    expect(result.lines[0]).toBe(
      'id=1900000000000000001\tusername=testuser\tdate=2026-08-27T10:00:00.000Z\tlikes=5\tretweets=1\treplies=2\tviews=300\ttext=post 1900000000000000001 about #agents second line',
    );
    expect(browser.closed).toBe(1);
  });

  it('--fields, and --compact over --json', async () => {
    browser.records = [domTweet('1900000000000000001', 5)];
    const result = await cli(['hashtag', '#agents', '--json', '--compact', '--fields', 'url,likes']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['url=https://x.com/testuser/status/1900000000000000001\tlikes=5']);
  });

  it('no posts for the tag exits 1 and still closes the browser', async () => {
    browser.records = [];
    const result = await cli(['hashtag', 'agents', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/No tweets for #agents returned/);
    expect(browser.closed).toBe(1);
  });
});

describe('analyze', () => {
  it('--compact prints one report record per account with the report columns', async () => {
    const result = await cli(['analyze', 'testuser', '--compact']);
    expectCompact(result, 'report', { records: 1, columns: DEFAULT_FIELDS.report });
    expect(Object.fromEntries(cells(result.lines[0]))).toMatchObject({ username: 'testuser', followers: '24500' });
  });

  it('several accounts give one line each, and --fields orders them', async () => {
    const result = await cli(['analyze', 'testuser', '@testuser', '--compact', '--fields', 'followers,username']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['followers=24500\tusername=testuser', 'followers=24500\tusername=testuser']);
  });

  it('--compact wins over --json, and --json alone is the report object', async () => {
    const both = await cli(['analyze', 'testuser', '--json', '--compact']);
    expect(both.lines).toHaveLength(1);
    expect(both.lines[0].startsWith('username=testuser')).toBe(true);
    const json = await cli(['analyze', 'testuser', '--json']);
    expect(JSON.parse(json.stdout)).toMatchObject({ identity: { username: 'testuser' } });
  });

  it('an account X has no profile for exits 1', async () => {
    transport.missing.add('ghost');
    const result = await cli(['analyze', 'ghost', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
  });
});

describe('brief', () => {
  it('--compact prints one brief row per account with the brief columns', async () => {
    const result = await cli(['brief', 'testuser', '--refresh', '--compact']);
    expectCompact(result, 'brief', { records: 1, columns: DEFAULT_FIELDS.brief });
    expect(Object.fromEntries(cells(result.lines[0]))).toMatchObject({ username: 'testuser', followers: '24500', topicPosts: '0' });
  });

  it('--fields orders the columns, and --compact wins over --json', async () => {
    const result = await cli(['brief', 'testuser', '--refresh', '--json', '--compact', '--fields', 'followers,username']);
    expect(result.code).toBe(0);
    expect(result.lines).toEqual(['followers=24500\tusername=testuser']);
  });

  it('exits 2 and reports the failure on stderr when some accounts could not be read', async () => {
    transport.missing.add('ghost');
    const result = await cli(['brief', 'testuser', 'ghost', '--refresh', '--compact', '--fields', 'username']);
    expect(result.code).toBe(2);
    expect(result.lines).toEqual(['username=testuser']);
    expect(result.stderr).toMatch(/failed\tusername=ghost\terror=/);
  });

  it('exits 1 when no account could be read', async () => {
    transport.missing.add('ghost');
    const result = await cli(['brief', 'ghost', '--refresh', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/Could not read any of the accounts/);
  });

  it('exits 1 when given no accounts, before any request', async () => {
    const result = await cli(['brief', '--compact']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/No accounts given/);
    expect(transport.requests).toEqual([]);
  });
});
