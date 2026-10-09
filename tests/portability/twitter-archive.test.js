// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - Twitter archive importer tests
// by nichxbt

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs, createWriteStream } from 'fs';
import os from 'os';
import path from 'path';
import { ZipArchive } from 'archiver';

import {
  importTwitterArchive,
  exportArchive,
  summarizeArchive,
  formatArchiveReport,
  openArchiveMedia,
  parseArchiveFile,
  ALL_SECTIONS,
  ARCHIVE_SOURCE,
  migrate,
} from '../../src/portability/index.js';

// ----------------------------------------------------------------------------
// Synthetic archive fixture
// ----------------------------------------------------------------------------

function ytd(name, part, records) {
  return `window.YTD.${name}.part${part} = ${JSON.stringify(records, null, 2)}`;
}

function tweet(id, text, createdAt, extra = {}) {
  return {
    tweet: {
      id_str: id,
      id,
      full_text: text,
      created_at: createdAt,
      favorite_count: String(extra.likes ?? 0),
      retweet_count: String(extra.retweets ?? 0),
      lang: 'en',
      source: '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
      entities: {
        hashtags: (extra.hashtags || []).map((h) => ({ text: h })),
        user_mentions: (extra.mentions || []).map((m, i) => ({ screen_name: m, name: m, id_str: String(100 + i) })),
        urls: extra.url ? [{ url: 't.co/x', expanded_url: extra.url }] : [],
        media: extra.media || [],
      },
      ...(extra.media ? { extended_entities: { media: extra.media } } : {}),
      ...(extra.replyTo ? {
        in_reply_to_status_id_str: extra.replyTo.tweetId,
        in_reply_to_user_id_str: extra.replyTo.userId,
        in_reply_to_screen_name: extra.replyTo.username,
      } : {}),
    },
  };
}

const PHOTO = {
  id_str: '9001',
  type: 'photo',
  media_url_https: 'https://pbs.twimg.com/media/abc.jpg',
  expanded_url: 'https://x.com/nichxbt/status/3/photo/1',
};

const VIDEO = {
  id_str: '9002',
  type: 'video',
  media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/def.jpg',
  video_info: {
    variants: [
      { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/pl.m3u8' },
      { content_type: 'video/mp4', bitrate: 832000, url: 'https://video.twimg.com/low.mp4' },
      { content_type: 'video/mp4', bitrate: 2176000, url: 'https://video.twimg.com/high.mp4' },
    ],
  },
};

/**
 * Write a synthetic archive folder. `withDms` and `withLists` toggle optional
 * sections so missing-section handling gets exercised.
 */
async function writeFixture(root, { withDms = true, withLists = true, withBlocks = true } = {}) {
  const data = path.join(root, 'data');
  await fs.mkdir(path.join(data, 'tweets_media'), { recursive: true });
  const w = (name, body) => fs.writeFile(path.join(data, name), body);

  await w('account.js', ytd('account', 0, [{
    account: {
      email: 'nich@example.com',
      createdVia: 'web',
      username: 'nichxbt',
      accountId: '42',
      createdAt: '2019-03-01T10:00:00.000Z',
      accountDisplayName: 'nich',
    },
  }]));
  await w('profile.js', ytd('profile', 0, [{
    profile: {
      description: { bio: 'Builds XActions', website: 'https://xactions.app', location: 'Internet' },
      avatarMediaUrl: 'https://pbs.twimg.com/profile_images/1/avatar.jpg',
      headerMediaUrl: 'https://pbs.twimg.com/profile_banners/42/1',
    },
  }]));

  // Multi-part tweets: tweets.js (part0) + tweets-part1.js (part1)
  await w('tweets.js', ytd('tweets', 0, [
    tweet('3', 'Shipping #xactions with @alice today', 'Wed Jun 05 12:00:00 +0000 2024', {
      likes: 12, retweets: 3, hashtags: ['xactions'], mentions: ['alice'], media: [PHOTO],
    }),
    tweet('1', 'Hello world #firstpost', 'Mon Jan 01 00:00:00 +0000 2024', { hashtags: ['firstpost'] }),
  ]));
  await w('tweets-part1.js', ytd('tweets', 1, [
    tweet('2', '@bob thanks! #xactions', 'Tue Feb 20 09:30:00 +0000 2024', {
      hashtags: ['xactions'], mentions: ['bob'], replyTo: { tweetId: '1000', userId: '7', username: 'bob' },
    }),
    tweet('4', 'RT @alice: great tool #xactions', 'Sat Mar 15 08:00:00 +0000 2025', { hashtags: ['xactions'], mentions: ['alice'] }),
    tweet('5', 'a video', 'Sun Mar 16 08:00:00 +0000 2025', { media: [VIDEO], url: 'https://xactions.app' }),
  ]));
  await w('tweet-headers.js', ytd('tweet_headers', 0, [{ tweet: { tweet_id: '1', user_id: '42', created_at: 'Mon Jan 01 00:00:00 +0000 2024' } }]));

  await w('like.js', ytd('like', 0, [
    { like: { tweetId: '555', fullText: 'liked this', expandedUrl: 'https://twitter.com/i/web/status/555' } },
    { like: { tweetId: '556', fullText: 'and this', expandedUrl: 'https://twitter.com/i/web/status/556' } },
  ]));
  await w('following.js', ytd('following', 0, [
    { following: { accountId: '7', userLink: 'https://twitter.com/intent/user?user_id=7' } },
    { following: { accountId: '8', userLink: 'https://twitter.com/intent/user?user_id=8' } },
    { following: { accountId: '9', userLink: 'https://twitter.com/intent/user?user_id=9' } },
  ]));
  await w('follower.js', ytd('follower', 0, [
    { follower: { accountId: '7', userLink: 'https://twitter.com/intent/user?user_id=7' } },
  ]));
  if (withBlocks) {
    await w('block.js', ytd('block', 0, [{ blocking: { accountId: '666', userLink: 'https://twitter.com/intent/user?user_id=666' } }]));
    await w('mute.js', ytd('mute', 0, [{ muting: { accountId: '667', userLink: 'https://twitter.com/intent/user?user_id=667' } }]));
  }
  if (withDms) {
    await w('direct-messages.js', ytd('direct-messages', 0, [{
      dmConversation: {
        conversationId: '42-7',
        messages: [
          { messageCreate: { id: 'm2', senderId: '7', recipientId: '42', text: 'hi back', createdAt: '2024-02-01T10:01:00.000Z', mediaUrls: [], urls: [] } },
          { messageCreate: { id: 'm1', senderId: '42', recipientId: '7', text: 'hi', createdAt: '2024-02-01T10:00:00.000Z', mediaUrls: [], urls: [{ url: 't.co/y', expanded: 'https://xactions.app' }] } },
        ],
      },
    }]));
    await w('direct-messages-group.js', ytd('direct-messages-group', 0, [{
      dmConversation: {
        conversationId: 'g1',
        messages: [
          { participantsJoin: { initiatingUserId: '42', userIds: ['7', '8'], createdAt: '2024-03-01T10:00:00.000Z' } },
          { messageCreate: { id: 'g1m1', senderId: '8', text: 'group hello', createdAt: '2024-03-01T10:05:00.000Z', mediaUrls: ['https://ton.twitter.com/dm/g1/1/pic.jpg'] } },
        ],
      },
    }]));
  }
  if (withLists) {
    await w('lists-created.js', ytd('lists-created', 0, [{ userListInfo: { url: 'https://twitter.com/i/lists/1', name: 'Builders' } }]));
    await w('lists-member.js', ytd('lists-member', 0, [{ userListInfo: { url: 'https://twitter.com/i/lists/2', name: 'Tools' } }]));
    await w('lists-subscribed.js', ytd('lists-subscribed', 0, []));
  }
  await fs.writeFile(path.join(data, 'tweets_media', '3-9001.jpg'), Buffer.from('not really a jpeg'));
  await fs.writeFile(path.join(root, 'Your archive.html'), '<html></html>');
}

function zipFolder(folder, zipPath) {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(zipPath);
    const zip = new ZipArchive({ zlib: { level: 6 } });
    out.on('close', resolve);
    zip.on('error', reject);
    zip.pipe(out);
    // Real archives are rooted one folder deep in the zip; mirror that.
    zip.directory(folder, 'twitter-2026-01-01-abc');
    zip.finalize();
  });
}

// ----------------------------------------------------------------------------

let tmp;
let folder;
let zipPath;

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-archive-'));
  folder = path.join(tmp, 'extracted');
  await writeFixture(folder);
  zipPath = path.join(tmp, 'archive.zip');
  await zipFolder(folder, zipPath);
});

afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('parseArchiveFile', () => {
  it('strips the window.YTD prefix and reads the part number', () => {
    const { part, records } = parseArchiveFile('window.YTD.like.part3 = [{"like":{"tweetId":"1"}}]');
    expect(part).toBe(3);
    expect(records).toEqual([{ like: { tweetId: '1' } }]);
  });

  it('tolerates a BOM and a trailing semicolon', () => {
    const { records } = parseArchiveFile('﻿window.YTD.account.part0 = [{"account":{}}];');
    expect(records).toHaveLength(1);
  });

  it('rejects files without the prefix', () => {
    expect(() => parseArchiveFile('[1,2,3]')).toThrow(/window\.YTD/);
  });
});

describe('importTwitterArchive (folder)', () => {
  let result;
  beforeAll(async () => {
    result = await importTwitterArchive(folder);
  });

  it('tags the result with the twitterArchive source', () => {
    expect(result.source).toBe(ARCHIVE_SOURCE);
    expect(result.format).toBe('folder');
    expect(result.sections.present).toEqual(ALL_SECTIONS);
    expect(result.sections.missing).toEqual([]);
  });

  it('reads account and profile', () => {
    expect(result.account).toMatchObject({ id: '42', username: 'nichxbt', name: 'nich', createdVia: 'web' });
    expect(result.account.createdAt).toBe('2019-03-01T10:00:00.000Z');
    expect(result.profile).toMatchObject({ username: 'nichxbt', bio: 'Builds XActions', website: 'https://xactions.app', location: 'Internet' });
  });

  it('merges multi-part tweet files in part order and sorts by date', () => {
    expect(result.tweets.map((t) => t.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(result.files.filter((f) => f.section === 'tweets').map((f) => f.part).sort()).toEqual([0, 1]);
  });

  it('normalises tweets with the exporter-compatible flat fields', () => {
    const t = result.tweets.find((x) => x.id === '3');
    expect(t.text).toBe('Shipping #xactions with @alice today');
    expect(t.createdAt).toBe('2024-06-05T12:00:00.000Z');
    expect(t.timestamp).toBe(t.createdAt);
    expect(t.url).toBe('https://x.com/nichxbt/status/3');
    expect(t.likes).toBe(12);
    expect(t.retweets).toBe(3);
    expect(t.metrics).toEqual({ likes: 12, retweets: 3 });
    expect(t.hashtags).toEqual(['xactions']);
    expect(t.mentions[0]).toMatchObject({ username: 'alice' });
    expect(t.source).toBe('Twitter Web App');
    expect(t.inReplyTo).toBeNull();
    expect(t.retweeted).toBe(false);
  });

  it('captures replies and retweets', () => {
    const reply = result.tweets.find((x) => x.id === '2');
    expect(reply.inReplyTo).toEqual({ tweetId: '1000', userId: '7', username: 'bob' });
    const rt = result.tweets.find((x) => x.id === '4');
    expect(rt.retweeted).toBe(true);
  });

  it('links media entities to files in tweets_media and picks the best mp4', () => {
    const photo = result.tweets.find((x) => x.id === '3').media[0];
    expect(photo).toMatchObject({ id: '9001', type: 'photo', url: 'https://pbs.twimg.com/media/abc.jpg', file: 'data/tweets_media/3-9001.jpg' });
    const video = result.tweets.find((x) => x.id === '5').media[0];
    expect(video.type).toBe('video');
    expect(video.url).toBe('https://video.twimg.com/high.mp4');
    expect(result.media).toHaveLength(1);
    expect(result.media[0]).toMatchObject({ tweetId: '3', kind: 'tweet', size: 17 });
  });

  it('reads likes, follow graph, blocks and mutes as id records', () => {
    expect(result.likes).toHaveLength(2);
    expect(result.likes[0]).toEqual({ id: '555', text: 'liked this', url: 'https://twitter.com/i/web/status/555' });
    expect(result.following.map((u) => u.id)).toEqual(['7', '8', '9']);
    expect(result.followers.map((u) => u.id)).toEqual(['7']);
    expect(result.blocks[0].id).toBe('666');
    expect(result.mutes[0].id).toBe('667');
  });

  it('groups DMs per conversation, sorted oldest-first inside, newest conversation first', () => {
    expect(result.dms).toHaveLength(2);
    const [group, direct] = result.dms;
    expect(group.kind).toBe('group');
    expect(group.participants.sort()).toEqual(['42', '7', '8']);
    expect(group.events[0].type).toBe('participantsJoin');
    expect(group.messages[0].media).toEqual(['https://ton.twitter.com/dm/g1/1/pic.jpg']);
    expect(direct.id).toBe('42-7');
    expect(direct.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(direct.messages[0].links).toEqual(['https://xactions.app']);
    expect(direct.firstMessageAt).toBe('2024-02-01T10:00:00.000Z');
    expect(direct.lastMessageAt).toBe('2024-02-01T10:01:00.000Z');
  });

  it('reads created and member lists', () => {
    expect(result.lists).toEqual([
      { kind: 'created', name: 'Builders', url: 'https://twitter.com/i/lists/1', description: null },
      { kind: 'member', name: 'Tools', url: 'https://twitter.com/i/lists/2', description: null },
    ]);
  });

  it('opens a media file as a stream', async () => {
    const stream = await openArchiveMedia(result, result.media[0].path);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    expect(Buffer.concat(chunks).toString()).toBe('not really a jpeg');
  });
});

describe('importTwitterArchive (zip)', () => {
  it('produces the same data as the folder, streamed entry by entry', async () => {
    const seen = [];
    const zipped = await importTwitterArchive(zipPath, { onProgress: (p) => seen.push(p) });
    const plain = await importTwitterArchive(folder);
    expect(zipped.format).toBe('zip');
    const strip = (r) => ({ ...r, archivePath: null, importedAt: null, format: null, files: r.files.map((f) => f.section + f.part).sort() });
    expect(strip(zipped)).toEqual(strip(plain));
    expect(seen.some((p) => p.phase === 'scan' && p.total > 0)).toBe(true);
    expect(seen.some((p) => p.phase === 'tweets' && p.records === 2)).toBe(true);
    expect(seen.some((p) => p.phase === 'dms')).toBe(true);
  });

  it('opens media straight out of the zip', async () => {
    const zipped = await importTwitterArchive(zipPath, { sections: ['media'] });
    const stream = await openArchiveMedia(zipped, zipped.media[0].path);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    expect(Buffer.concat(chunks).toString()).toBe('not really a jpeg');
  });
});

describe('sections and missing data', () => {
  it('only loads the requested sections', async () => {
    const r = await importTwitterArchive(folder, { sections: ['tweets', 'likes'] });
    expect(r.tweets).toHaveLength(5);
    expect(r.likes).toHaveLength(2);
    expect(r.following).toEqual([]);
    expect(r.dms).toEqual([]);
    expect(r.media).toEqual([]);
    expect(r.account).toBeNull();
    expect(r.tweets[0].url).toBe('https://x.com/i/status/1');
    expect(r.sections).toEqual({ present: ['tweets', 'likes'], missing: [] });
  });

  it('rejects unknown section names', async () => {
    await expect(importTwitterArchive(folder, { sections: ['bookmarks'] })).rejects.toThrow(/Unknown archive section/);
  });

  it('reports optional sections that the archive does not contain', async () => {
    const dir = path.join(tmp, 'partial');
    await writeFixture(dir, { withDms: false, withLists: false, withBlocks: false });
    const r = await importTwitterArchive(dir);
    expect(r.dms).toEqual([]);
    expect(r.lists).toEqual([]);
    expect(r.blocks).toEqual([]);
    expect(r.mutes).toEqual([]);
    expect(r.sections.missing).toEqual(['blocks', 'mutes', 'dms', 'lists']);
    expect(r.tweets).toHaveLength(5);
  });

  it('fails clearly on a path with no archive data', async () => {
    const empty = path.join(tmp, 'empty');
    await fs.mkdir(empty, { recursive: true });
    await expect(importTwitterArchive(empty)).rejects.toThrow(/No Twitter archive data/);
    await expect(importTwitterArchive(path.join(tmp, 'nope'))).rejects.toThrow(/Archive not found/);
  });
});

describe('summarizeArchive', () => {
  it('counts, ranges, top tags and busiest year', async () => {
    const r = await importTwitterArchive(folder);
    const s = summarizeArchive(r);
    expect(s.username).toBe('nichxbt');
    expect(s.counts).toMatchObject({
      tweets: 5, replies: 1, retweets: 1, original: 3, withMedia: 2,
      likes: 2, following: 3, followers: 1, blocks: 1, mutes: 1,
      dmConversations: 2, dmMessages: 3, lists: 2, mediaFiles: 1,
    });
    expect(s.engagement).toEqual({ likesReceived: 12, retweetsReceived: 3 });
    expect(s.dateRange).toEqual({ first: '2024-01-01T00:00:00.000Z', last: '2025-03-16T08:00:00.000Z' });
    expect(s.tweetsPerYear).toEqual({ 2024: 3, 2025: 2 });
    expect(s.busiestYear).toEqual({ year: '2024', tweets: 3 });
    expect(s.topHashtags[0]).toEqual({ value: 'xactions', count: 3 });
    expect(s.topMentions[0]).toEqual({ value: 'alice', count: 2 });

    const report = formatArchiveReport(s);
    expect(report).toContain('X archive for @nichxbt');
    expect(report).toContain('Tweets       5 (3 original, 1 replies, 1 retweets, 2 with media)');
    expect(report).toContain('#xactions  3');
    expect(report).toContain('Busiest year 2024');
  });

  it('handles an archive with no tweets', () => {
    const s = summarizeArchive({ source: ARCHIVE_SOURCE, tweets: [], dms: [], sections: { present: [], missing: [] } });
    expect(s.dateRange).toBeNull();
    expect(s.busiestYear).toBeNull();
    expect(formatArchiveReport(s)).toContain('Tweets       0');
  });
});

describe('exportArchive', () => {
  it('writes JSON, CSV, Markdown and the HTML viewer in the exportAccount layout', async () => {
    const r = await importTwitterArchive(zipPath);
    const outDir = path.join(tmp, 'export');
    const { dir, files, counts } = await exportArchive(r, { outputDir: outDir });
    expect(dir).toBe(outDir);
    expect(counts.tweets).toBe(5);
    for (const f of ['profile.json', 'tweets.json', 'tweets.csv', 'tweets.md', 'following.json', 'following.csv', 'dms.json', 'dms.csv', 'lists.md', 'index.html', 'summary.json']) {
      expect(files).toContain(f);
    }

    const tweets = JSON.parse(await fs.readFile(path.join(outDir, 'tweets.json'), 'utf-8'));
    expect(tweets).toHaveLength(5);

    const csv = await fs.readFile(path.join(outDir, 'tweets.csv'), 'utf-8');
    const [header, ...rows] = csv.split('\n');
    expect(header.split(',')).toContain('inReplyTo');
    expect(rows).toHaveLength(5);
    expect(csv).toContain('"{""tweetId"":""1000""');

    const dmsCsv = await fs.readFile(path.join(outDir, 'dms.csv'), 'utf-8');
    expect(dmsCsv.split('\n')).toHaveLength(4);
    expect(dmsCsv.startsWith('conversationId,kind,id,senderId')).toBe(true);

    const profile = JSON.parse(await fs.readFile(path.join(outDir, 'profile.json'), 'utf-8'));
    expect(profile).toMatchObject({ username: 'nichxbt', followers: 1, following: 3, bio: 'Builds XActions' });

    const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf-8');
    expect(html).toContain('@nichxbt');
    expect(html).toContain('Shipping #xactions');
  });

  it('feeds migrate() through source: twitterArchive', async () => {
    const outDir = path.join(tmp, 'migrate');
    const summary = await migrate({ platform: 'bluesky', source: 'twitterArchive', archivePath: zipPath, exportDir: outDir, dryRun: true });
    expect(summary.tweets.total).toBe(5);
    expect(summary.follows.total).toBe(3);
    expect(summary.actions.filter((a) => a.type === 'create_post')).toHaveLength(5);
    await expect(fs.access(path.join(outDir, 'tweets.json'))).resolves.toBeUndefined();
  });
});
