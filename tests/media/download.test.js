// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The engine is driven against a real HTTP server, not a stubbed fetch: the
 * behaviours worth testing here (Range resume, a 429 retry, a truncated
 * stream) only exist at the protocol level.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { openArchive, hashBytes, identityKey } from '../../src/media/archive.js';
import { downloadAll, downloadItem } from '../../src/media/download.js';
import { renderTemplate, resolveWithin, cdnBasename, extensionFor } from '../../src/media/template.js';
import { parseTarget, originalImageUrl, originalBannerUrl, applyFilters, itemsFromTweet } from '../../src/media/sources.js';

const servers = [];
afterAll(() => servers.forEach((s) => s.close()));

function listen(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    servers.push(server);
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

const PHOTO = Buffer.from('a-photo-worth-keeping'.repeat(40));

function item(overrides = {}) {
  return {
    kind: 'media',
    mediaType: 'photo',
    tweetId: '1234567890',
    username: 'nichxbt',
    userId: '42',
    createdAt: '2026-08-28T09:05:03.000Z',
    num: 1,
    width: 1200,
    height: 800,
    ...overrides,
  };
}

let outputDir;
beforeEach(async () => {
  outputDir = await mkdtemp(join(tmpdir(), 'xactions-media-'));
});

describe('media templates', () => {
  it('renders the default layout and X\'s own CDN name', () => {
    const it1 = item({ url: 'https://pbs.twimg.com/media/Go6lFkVWsAAQwOo.jpg?format=jpg&name=orig' });
    expect(renderTemplate('{username}/{tweet_id}_{num}.{ext}', it1)).toBe('nichxbt/1234567890_1.jpg');
    // gallery-dl cannot do this one (mikf/gallery-dl#7695).
    expect(renderTemplate('{date}_{media_filename}.{ext}', it1)).toBe('2026-08-28_Go6lFkVWsAAQwOo.jpg');
    expect(cdnBasename(it1.url)).toBe('Go6lFkVWsAAQwOo');
  });

  it('picks the extension from the format query, the path, then the type', () => {
    expect(extensionFor(item({ url: 'https://x/i.jpg?format=png&name=orig' }))).toBe('png');
    expect(extensionFor(item({ url: 'https://x/vid/720x1280/a.mp4?tag=12', mediaType: 'video' }))).toBe('mp4');
    expect(extensionFor(item({ url: 'https://x/no-extension', mediaType: 'photo' }))).toBe('jpg');
  });

  it('rejects a typo instead of silently collapsing every file onto one name', () => {
    expect(() => renderTemplate('{tweetid}.{ext}', item({ url: 'https://x/a.jpg' }))).toThrow(/Unknown template key/);
  });

  it('never lets a template escape the output directory', () => {
    // The invariant is the resolved path, not the spelling: `..` inside a
    // single segment is an ordinary filename, `..` as a whole segment is not.
    for (const username of ['../../etc/passwd', '..', '/absolute', 'a/b/../..']) {
      const rendered = renderTemplate('{username}.{ext}', item({ url: 'https://x/a.jpg', username }));
      expect(rendered.split(sep)).not.toContain('..');
      const resolved = resolveWithin('/out', rendered);
      expect(resolved.startsWith(`/out${sep}`)).toBe(true);
    }
    expect(() => resolveWithin('/out', '../escape.jpg')).toThrow(/Refusing to write outside/);
    expect(() => resolveWithin('/out', `..${sep}..${sep}etc${sep}passwd`)).toThrow(/Refusing to write outside/);
  });
});

describe('media targets', () => {
  it('understands every form a person would type', () => {
    expect(parseTarget('@nichxbt')).toEqual({ kind: 'profile', value: 'nichxbt' });
    expect(parseTarget('nichxbt:avatar')).toEqual({ kind: 'avatar', value: 'nichxbt' });
    expect(parseTarget('nichxbt:banner')).toEqual({ kind: 'banner', value: 'nichxbt' });
    expect(parseTarget('@nichxbt:all')).toEqual({ kind: 'profile', value: 'nichxbt', modifier: 'all' });
    expect(parseTarget('https://x.com/nichxbt/status/1234567890')).toEqual({ kind: 'tweet', value: '1234567890' });
    expect(parseTarget('1234567890123')).toEqual({ kind: 'tweet', value: '1234567890123' });
    expect(parseTarget('search:from:nichxbt filter:images')).toEqual({ kind: 'search', value: 'from:nichxbt filter:images' });
    expect(() => parseTarget('')).toThrow(/target is required/);
    expect(() => parseTarget('not a handle!!')).toThrow(/recognise/);
  });

  it('asks the CDN for the original avatar, not the 48px thumbnail', () => {
    expect(originalImageUrl('https://pbs.twimg.com/profile_images/1/a_normal.jpg')).toBe('https://pbs.twimg.com/profile_images/1/a.jpg');
    expect(originalImageUrl('https://pbs.twimg.com/profile_images/1/a_400x400.jpg')).toBe('https://pbs.twimg.com/profile_images/1/a.jpg');
    expect(originalBannerUrl('https://pbs.twimg.com/profile_banners/1/2')).toBe('https://pbs.twimg.com/profile_banners/1/2/1500x500');
  });

  it('filters by media type and date', () => {
    const items = [
      item({ mediaType: 'photo', createdAt: '2026-01-01T00:00:00Z' }),
      item({ mediaType: 'video', createdAt: '2026-06-01T00:00:00Z' }),
      item({ mediaType: 'animated_gif', createdAt: '2026-08-01T00:00:00Z' }),
    ];
    expect(applyFilters(items, { types: ['video'] })).toHaveLength(1);
    expect(applyFilters(items, { types: ['gif'] })[0].mediaType).toBe('animated_gif');
    expect(applyFilters(items, { since: new Date('2026-05-01') })).toHaveLength(2);
    expect(applyFilters(items, { until: new Date('2026-05-01') })).toHaveLength(1);
  });

  it('reads the media of a tweet as parseTweetData returns it', () => {
    const items = itemsFromTweet({
      id: '1000',
      author: { id: '7', username: 'nichxbt' },
      createdAt: '2026-08-28T00:00:00Z',
      media: [
        { type: 'photo', url: 'https://pbs.twimg.com/media/p.jpg', width: 1200, height: 800, videoUrl: null },
        { type: 'video', url: 'https://pbs.twimg.com/thumb.jpg', width: 720, height: 1280, videoUrl: 'https://video.twimg.com/v/720x1280/v.mp4' },
      ],
    });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ mediaType: 'photo', url: 'https://pbs.twimg.com/media/p.jpg?format=jpg&name=orig', tweetId: '1000', username: 'nichxbt', num: 1 });
    expect(items[1]).toMatchObject({ mediaType: 'video', url: 'https://video.twimg.com/v/720x1280/v.mp4', num: 2 });
  });

  it('numbers the media inside one tweet so four photos do not overwrite each other', () => {
    const items = itemsFromTweet({
      id: '999',
      username: 'nichxbt',
      createdAt: '2026-08-28T00:00:00Z',
      media: [
        { type: 'photo', media_url_https: 'https://pbs.twimg.com/media/a.jpg' },
        { type: 'photo', media_url_https: 'https://pbs.twimg.com/media/b.jpg' },
      ],
    });
    expect(items.map((i) => i.num)).toEqual([1, 2]);
    expect(new Set(items.map((i) => renderTemplate('{tweet_id}_{num}.{ext}', i))).size).toBe(2);
  });
});

describe('media archive', () => {
  it('skips what it already has and survives a truncated last line', async () => {
    const path = join(outputDir, 'archive.jsonl');
    const archive = await openArchive(path);
    await archive.record({ item: item(), hash: 'abc', path: '/tmp/a.jpg', bytes: 10, url: 'https://x/a.jpg' });
    expect(archive.has(item())).toBe(true);
    expect(archive.has(item({ num: 2 }))).toBe(false);

    // A run killed mid-write leaves a half-line; it must cost one re-download,
    // not the whole archive.
    await writeFile(path, `${(await readFile(path, 'utf8')).trim()}\n{"id":"broke`, 'utf8');
    const reopened = await openArchive(path);
    expect(reopened.has(item())).toBe(true);
    expect(reopened.size).toBe(1);
  });

  it('keys on identity, so changing the filename template does not re-download', () => {
    expect(identityKey(item())).toBe(identityKey({ ...item(), url: 'https://different' }));
    expect(identityKey(item())).not.toBe(identityKey(item({ num: 2 })));
  });
});

describe('download engine', () => {
  it('writes a file, records it, and skips it on the next run', async () => {
    const base = await listen((req, res) => { res.writeHead(200, { 'content-length': PHOTO.length }); res.end(PHOTO); });
    const archive = await openArchive(join(outputDir, 'a.jsonl'));
    const ctx = { outputDir, template: '{username}/{tweet_id}_{num}.{ext}', archive };
    const target = item({ url: `${base}/media/Go6lFkVWsAAQwOo.jpg` });

    const first = await downloadItem(target, ctx);
    expect(first.outcome).toBe('downloaded');
    expect(first.bytes).toBe(PHOTO.length);
    expect(first.hash).toBe(hashBytes(PHOTO));
    expect((await readFile(first.path)).equals(PHOTO)).toBe(true);

    const second = await downloadItem(target, ctx);
    expect(second.outcome).toBe('skipped');
  });

  it('leaves no truncated file behind when the stream dies', async () => {
    const base = await listen((req, res) => {
      res.writeHead(200, { 'content-length': String(PHOTO.length) });
      res.write(PHOTO.subarray(0, 20));
      setTimeout(() => res.destroy(), 20);
    });
    const result = await downloadItem(item({ url: `${base}/a.jpg` }), { outputDir, retries: 0 });
    expect(result.outcome).toBe('failed');
    // The partial bytes stay in .part; the real name never appears half-written.
    await expect(stat(result.path)).rejects.toThrow();
  }, 20000);

  it('resumes from a .part file with a Range request instead of starting over', async () => {
    const ranges = [];
    const base = await listen((req, res) => {
      ranges.push(req.headers.range || null);
      const match = /bytes=(\d+)-/.exec(req.headers.range || '');
      if (match) {
        const from = Number(match[1]);
        res.writeHead(206, { 'content-range': `bytes ${from}-${PHOTO.length - 1}/${PHOTO.length}` });
        res.end(PHOTO.subarray(from));
        return;
      }
      res.writeHead(200).end(PHOTO);
    });
    const relative = 'nichxbt/1234567890_1.jpg';
    await mkdir(join(outputDir, 'nichxbt'), { recursive: true });
    await writeFile(join(outputDir, `${relative}.part`), PHOTO.subarray(0, 30));

    const result = await downloadItem(item({ url: `${base}/a.jpg` }), { outputDir, template: '{username}/{tweet_id}_{num}.{ext}' });
    expect(result.outcome).toBe('downloaded');
    expect(ranges[0]).toBe('bytes=30-');
    expect((await readFile(result.path)).equals(PHOTO)).toBe(true);
  });

  it('retries a 429 and gives up on a 404', async () => {
    let hits = 0;
    const base = await listen((req, res) => {
      if (req.url.startsWith('/flaky')) {
        hits++;
        if (hits < 3) { res.writeHead(429).end('slow down'); return; }
        res.writeHead(200).end(PHOTO);
        return;
      }
      res.writeHead(404).end('gone');
    });
    const ok = await downloadItem(item({ url: `${base}/flaky.jpg` }), { outputDir, retries: 3 });
    expect(ok.outcome).toBe('downloaded');
    expect(hits).toBe(3);

    let notFoundAttempts = 0;
    const missing = await downloadItem(item({ url: `${base}/missing.jpg`, num: 2 }), {
      outputDir,
      retries: 3,
      onProgress: () => { notFoundAttempts++; },
    });
    expect(missing.outcome).toBe('failed');
    expect(missing.reason).toContain('404');
    expect(notFoundAttempts).toBe(0);
  }, 20000);

  it('hard-links identical bytes reached through different URLs', async () => {
    // gallery-dl's archive "does not deduplicate across different source URLs
    // pointing to the same image". This does.
    const base = await listen((req, res) => { res.writeHead(200).end(PHOTO); });
    const archive = await openArchive(join(outputDir, 'a.jsonl'));
    const ctx = { outputDir, template: '{tweet_id}_{num}.{ext}', archive };

    const original = await downloadItem(item({ url: `${base}/original.jpg` }), ctx);
    const viaRetweet = await downloadItem(item({ url: `${base}/retweeted.jpg`, tweetId: '5555' }), ctx);

    expect(original.outcome).toBe('downloaded');
    expect(viaRetweet.outcome).toBe('deduped');
    expect((await readFile(viaRetweet.path)).equals(PHOTO)).toBe(true);
    const [a, b] = await Promise.all([stat(original.path), stat(viaRetweet.path)]);
    expect(b.ino).toBe(a.ino);
  });

  it('keeps the downloaded file when the dedupe link cannot be made', async () => {
    const base = await listen((req, res) => { res.writeHead(200).end(PHOTO); });
    const archive = await openArchive(join(outputDir, 'a.jsonl'));
    const ctx = { outputDir, template: '{tweet_id}_{num}.{ext}', archive };

    const original = await downloadItem(item({ url: `${base}/original.jpg` }), ctx);
    // The twin vanishes, so link() fails with ENOENT.
    await rm(original.path);
    const second = await downloadItem(item({ url: `${base}/again.jpg`, tweetId: '7777' }), ctx);

    expect(second.outcome).toBe('downloaded');
    expect((await readFile(second.path)).equals(PHOTO)).toBe(true);
  });

  it('treats the timeout as idle time, so a slow but steady body completes', async () => {
    const base = await listen((req, res) => {
      res.writeHead(200, { 'content-length': String(PHOTO.length) });
      let offset = 0;
      const tick = setInterval(() => {
        res.write(PHOTO.subarray(offset, offset + 100));
        offset += 100;
        if (offset >= PHOTO.length) { clearInterval(tick); res.end(); }
      }, 60);
    });
    // Whole body takes ~540 ms; no gap is longer than 60 ms.
    const result = await downloadItem(item({ url: `${base}/slow.jpg` }), { outputDir, timeoutMs: 300, retries: 0 });
    expect(result.outcome).toBe('downloaded');
    expect((await readFile(result.path)).equals(PHOTO)).toBe(true);
  }, 20000);

  it('retries a stalled body and resumes it with a Range request', async () => {
    const ranges = [];
    const base = await listen((req, res) => {
      ranges.push(req.headers.range || null);
      const match = /bytes=(\d+)-/.exec(req.headers.range || '');
      if (match) {
        const from = Number(match[1]);
        res.writeHead(206, { 'content-range': `bytes ${from}-${PHOTO.length - 1}/${PHOTO.length}` });
        res.end(PHOTO.subarray(from));
        return;
      }
      res.writeHead(200, { 'content-length': String(PHOTO.length) });
      res.write(PHOTO.subarray(0, 50));
      // ...and then nothing: the connection stays open but silent.
    });
    const result = await downloadItem(item({ url: `${base}/stall.jpg` }), { outputDir, timeoutMs: 200, retries: 2 });
    expect(result.outcome).toBe('downloaded');
    expect(ranges).toEqual([null, 'bytes=50-']);
    expect((await readFile(result.path)).equals(PHOTO)).toBe(true);
  }, 20000);

  it('runs a batch through a pool and reports every outcome honestly', async () => {
    const base = await listen((req, res) => {
      if (req.url.includes('bad')) { res.writeHead(404).end(); return; }
      res.writeHead(200).end(PHOTO);
    });
    const items = [
      item({ url: `${base}/1.jpg`, num: 1 }),
      item({ url: `${base}/2.jpg`, num: 2 }),
      item({ url: `${base}/bad.jpg`, num: 3 }),
    ];
    const seen = [];
    const { results, summary } = await downloadAll(items, {
      outputDir,
      template: '{tweet_id}_{num}.{ext}',
      concurrency: 3,
      retries: 0,
      onResult: (r) => seen.push(r.outcome),
    });
    expect(results).toHaveLength(3);
    expect(summary.downloaded).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.bytes).toBe(PHOTO.length * 2);
    expect(seen).toHaveLength(3);
  }, 20000);

  it('plans without writing anything in dry-run', async () => {
    const base = await listen((req, res) => { res.writeHead(200).end(PHOTO); });
    const result = await downloadItem(item({ url: `${base}/a.jpg` }), { outputDir, dryRun: true });
    expect(result.outcome).toBe('planned');
    await expect(stat(result.path)).rejects.toThrow();
  });
});

describe('end to end: a target becomes files on disk', () => {
  it('walks a profile, saves every photo, and re-runs incrementally', async () => {
    const base = await listen((req, res) => { res.writeHead(200).end(PHOTO); });

    // A stand-in for createHttpScraper(): the engine only ever calls these,
    // so the pipeline below is the real one, with X replaced by a local CDN.
    const scrapers = {
      scrapeProfile: async () => ({
        username: 'nichxbt',
        id: '42',
        avatar: `${base}/profile_images/1/face_normal.jpg`,
        header: `${base}/profile_banners/42/17`,
      }),
      scrapeMedia: async () => [
        { tweetId: '111', username: 'nichxbt', userId: '42', createdAt: '2026-08-01T00:00:00Z', mediaType: 'photo', url: `${base}/media/AAA.jpg`, num: 1, width: 1200, height: 800 },
        { tweetId: '222', username: 'nichxbt', userId: '42', createdAt: '2026-08-02T00:00:00Z', mediaType: 'video', url: `${base}/vid/BBB.mp4`, num: 1, width: 1280, height: 720 },
      ],
    };

    const { downloadMediaFor } = await import('../../src/media/index.js');
    const opts = {
      scrapers,
      outputDir,
      template: '{username}/{kind}/{date}_{media_filename}.{ext}',
      archivePath: join(outputDir, 'archive.jsonl'),
    };

    const first = await downloadMediaFor('@nichxbt:all', opts);
    expect(first.target).toEqual({ kind: 'profile', value: 'nichxbt', modifier: 'all' });
    // Two timeline items plus the avatar and the banner.
    expect(first.items).toHaveLength(4);
    const paths = first.results.map((r) => r.relativePath.split(sep).join('/')).sort();
    expect(paths).toContain('nichxbt/avatar/0000-00-00_face.jpg');
    expect(paths).toContain('nichxbt/media/2026-08-01_AAA.jpg');
    expect(paths).toContain('nichxbt/media/2026-08-02_BBB.mp4');
    // Every file is identical here, so one is stored and the rest are linked.
    expect(first.summary.downloaded + first.summary.deduped).toBe(4);
    expect(first.summary.failed).toBe(0);

    const second = await downloadMediaFor('@nichxbt:all', opts);
    expect(second.summary.skipped).toBe(4);
    expect(second.summary.downloaded).toBe(0);
  }, 30000);

  it('asks the CDN for the original avatar, not the thumbnail it was given', async () => {
    const requested = [];
    const base = await listen((req, res) => { requested.push(req.url); res.writeHead(200).end(PHOTO); });
    const scrapers = {
      scrapeProfile: async () => ({ username: 'nichxbt', id: '42', avatar: `${base}/profile_images/1/face_normal.jpg`, header: null }),
    };
    const { downloadMediaFor } = await import('../../src/media/index.js');
    await downloadMediaFor('@nichxbt:avatar', { scrapers, outputDir, template: '{username}.{ext}' });
    expect(requested).toEqual(['/profile_images/1/face.jpg']);
  });
});
