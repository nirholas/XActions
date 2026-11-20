// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - compact output formatter tests. Pure functions, no network.

import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

import {
  DEFAULT_FIELDS,
  createSpinner,
  flattenRecord,
  flattenReport,
  formatCompact,
  formatValue,
  isMachineOutput,
  parseFields,
  resolveOutputMode,
} from '../../src/utils/output.js';

/** A tweet as the HTTP client's Tweet model shapes it. */
const clientTweet = {
  id: '1',
  text: 'Hello\nworld\twith\ttabs',
  username: 'nasa',
  timeParsed: new Date('2026-08-27T10:00:00.000Z'),
  timestamp: 1787784000000,
  likes: 10,
  retweets: 2,
  replies: 1,
  views: 500,
  permanentUrl: 'https://x.com/nasa/status/1',
  photos: [{ url: 'https://pbs.twimg.com/a.jpg' }],
};

/** The same tweet as the GraphQL parser shapes it. */
const parsedTweet = {
  id: '1',
  text: 'Hello world',
  author: { username: 'nasa', name: 'NASA', verified: true },
  metrics: { likes: 10, retweets: 2, replies: 1, views: 500 },
  createdAt: '2026-08-27T10:00:00.000Z',
};

describe('output', () => {
  describe('parseFields', () => {
    it('splits a comma list and trims', () => {
      expect(parseFields(' id, text ,likes,')).toEqual(['id', 'text', 'likes']);
    });
    it('returns null for nothing', () => {
      expect(parseFields(undefined)).toBeNull();
      expect(parseFields('')).toBeNull();
      expect(parseFields(' , ')).toBeNull();
    });
  });

  describe('flattenRecord', () => {
    it('maps both tweet shapes to the same vocabulary', () => {
      const a = flattenRecord(clientTweet);
      const b = flattenRecord(parsedTweet);
      for (const key of ['id', 'username', 'likes', 'retweets', 'replies', 'views', 'date']) {
        expect(a[key]).toEqual(b[key]);
      }
      expect(a.date).toBe('2026-08-27T10:00:00.000Z');
      expect(b.verified).toBe(true);
    });

    it('maps both profile shapes', () => {
      expect(flattenRecord({ username: 'a', followersCount: 5, followingCount: 2, tweetCount: 9 })).toMatchObject({ followers: 5, following: 2, tweets: 9 });
      expect(flattenRecord({ username: 'a', followers: 5, following: 2, tweets: 9 })).toMatchObject({ followers: 5, following: 2, tweets: 9 });
    });

    it('drops undefined fields and nested objects but keeps extra primitives', () => {
      const flat = flattenRecord(clientTweet);
      expect(flat).not.toHaveProperty('photos');
      expect(flat).not.toHaveProperty('followers');
      expect(flat).toHaveProperty('permanentUrl');
    });

    it('turns epoch milliseconds into ISO', () => {
      expect(flattenRecord({ timestamp: Date.UTC(2026, 7, 27) }).date).toBe('2026-08-27T00:00:00.000Z');
    });
  });

  describe('formatValue', () => {
    it('collapses newlines and tabs into single spaces', () => {
      expect(formatValue('a\n\nb\tc')).toBe('a b c');
    });
    it('serialises objects and blanks null', () => {
      expect(formatValue({ a: 1 })).toBe('{"a":1}');
      expect(formatValue(null)).toBe('');
    });
  });

  describe('formatCompact', () => {
    it('prints one record per line with the default tweet columns', () => {
      const out = formatCompact([clientTweet, parsedTweet], { kind: 'tweet' });
      const lines = out.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(
        'id=1\tusername=nasa\tdate=2026-08-27T10:00:00.000Z\tlikes=10\tretweets=2\treplies=1\tviews=500\ttext=Hello world with tabs',
      );
      expect(lines[0].split('\t').map((c) => c.split('=')[0])).toEqual(DEFAULT_FIELDS.tweet);
    });

    it('honours --fields in the order given and reaches raw fields', () => {
      const out = formatCompact(clientTweet, { kind: 'tweet', fields: 'likes,id,permanentUrl' });
      expect(out).toBe('likes=10\tid=1\tpermanentUrl=https://x.com/nasa/status/1');
    });

    it('skips a requested field a record lacks rather than printing empty', () => {
      expect(formatCompact({ id: '1' }, { kind: 'tweet', fields: ['id', 'views'] })).toBe('id=1');
    });

    it('accepts a single record', () => {
      expect(formatCompact({ username: 'nasa', followers: 1 }, { kind: 'profile' })).toBe('username=nasa\tfollowers=1');
    });

    it('never emits ANSI escapes', () => {
      const out = formatCompact([clientTweet], { kind: 'tweet' });
      // eslint-disable-next-line no-control-regex -- matches ANSI escape sequences
      expect(out).not.toMatch(/\[/);
    });

    it('flattens an account report', () => {
      const report = {
        identity: { username: 'nasa', name: 'NASA' },
        audience: { followers: 100, following: 10 },
        output: { postsPerDay: 2.5 },
        engagement: { rate: 0.01, medianPerOriginal: 40 },
        mix: { mediaShare: 90 },
        timing: { bestHourUTC: 14, bestWeekday: 'Tuesday' },
      };
      expect(flattenReport(report)).toMatchObject({ username: 'nasa', engagementRate: 0.01, bestHourUTC: 14 });
      expect(formatCompact(report, { kind: 'report' })).toBe(
        'username=nasa\tfollowers=100\tfollowing=10\tpostsPerDay=2.5\tengagementRate=0.01\tmedianEngagement=40\tmediaShare=90\tbestHourUTC=14\tbestWeekday=Tuesday',
      );
    });
  });

  describe('resolveOutputMode', () => {
    it('reads --compact and --fields from the root and --json from the command', () => {
      const program = new Command().option('--compact').option('--fields <list>');
      program.command('tweets <u>').action(() => {});
      program.parse(['tweets', 'nasa', '--compact', '--fields', 'id,text'], { from: 'user' });
      expect(resolveOutputMode(program, { json: true })).toEqual({ json: true, compact: true, fields: ['id', 'text'] });
      expect(resolveOutputMode(program, {})).toMatchObject({ json: false, compact: true });
    });
  });

  describe('spinner silence', () => {
    it('is machine output only when a machine flag is set and stdout is not a TTY', () => {
      expect(isMachineOutput({ json: true }, { isTTY: false })).toBe(true);
      expect(isMachineOutput({ compact: true }, { isTTY: false })).toBe(true);
      expect(isMachineOutput({ json: true }, { isTTY: true })).toBe(false);
      expect(isMachineOutput({}, { isTTY: false })).toBe(false);
    });

    it('creates a silent spinner under vitest (stdout is a pipe) when --compact is set', () => {
      const spinner = createSpinner('working', { compact: true });
      expect(spinner.isSilent).toBe(true);
      spinner.stop();
      const loud = createSpinner('working', {});
      expect(loud.isSilent).toBe(false);
      loud.stop();
    });
  });
});
