// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `analyze -o` always writes the file, and `download` resolves targets
 * through the HTTP scraper factory rather than the client Scraper. Offline:
 * both run against in-memory scrapers.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { registerReportCommand } from '../../src/cli/commands/report.js';
import { downloadCommand } from '../../src/cli/commands/download.js';

let logSpy;
let errorSpy;
let dir;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-analyze-dl-'));
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  fs.rmSync(dir, { recursive: true, force: true });
  process.exitCode = 0;
});

function fakeScraper() {
  return {
    async getProfile(username) {
      return { id: '1', username, name: username, followersCount: 1000, followingCount: 10, tweetCount: 500, joined: new Date('2015-01-01') };
    },
    async *getTweets() {
      for (let i = 0; i < 6; i++) {
        yield { id: String(100 + i), text: `post ${i}`, timeParsed: new Date(Date.UTC(2026, 10, 10 + i, 15)), likes: 10 + i, retweets: 1, replies: 1, views: 1000, photos: [], videos: [] };
      }
    },
  };
}

describe('analyze -o', () => {
  for (const flag of ['--json', '--compact']) {
    it(`writes the file when ${flag} is also passed, and prints the data once`, async () => {
      const program = new Command();
      program.exitOverride();
      program.option('--compact').option('--fields <list>');
      const smartOutput = vi.fn(async () => {});
      registerReportCommand(program, { createHttpScraper: async () => fakeScraper(), smartOutput });

      const out = path.join(dir, 'r.json');
      const args = flag === '--compact' ? ['--compact', 'analyze', 'nasa', '-o', out] : ['analyze', 'nasa', '--json', '-o', out];
      await program.parseAsync(['node', 'xactions', ...args]);

      expect(process.exitCode || 0).toBe(0);
      expect(smartOutput).toHaveBeenCalledTimes(1);
      const [data, options, name, extra] = smartOutput.mock.calls[0];
      expect(data[0].identity.username).toBe('nasa');
      expect(options.output).toBe(out);
      expect(name).toBe('report');
      expect(extra).toEqual({ toFile: true });
    });
  }
});

describe('download', () => {
  it('resolves a tweet through the factory methods the media module calls', async () => {
    const scrapers = {
      scrapeTweetById: vi.fn(async (id) => ({
        id,
        author: { id: '7', username: 'nichxbt' },
        createdAt: '2026-08-28T00:00:00Z',
        media: [{ type: 'photo', url: 'https://pbs.twimg.com/media/p.jpg', width: 10, height: 10 }],
      })),
    };
    const createMediaScrapers = vi.fn(async () => scrapers);

    await downloadCommand('https://x.com/nichxbt/status/1234567890', { output: dir, dryRun: true, json: true }, {
      createMediaScrapers,
      loadConfig: async () => ({}),
    });

    expect(createMediaScrapers).toHaveBeenCalledTimes(1);
    expect(scrapers.scrapeTweetById).toHaveBeenCalledWith('1234567890');
    const printed = JSON.parse(logSpy.mock.calls.map((c) => c[0]).find((l) => typeof l === 'string' && l.startsWith('{')));
    expect(printed.found).toBe(1);
    expect(printed.summary.planned).toBe(1);
    expect(process.exitCode || 0).toBe(0);
  });

  it('exits 1 when nothing matched', async () => {
    const scrapers = { scrapeTweetById: async (id) => ({ id, author: { username: 'u' }, media: [] }) };
    await downloadCommand('1234567890', { output: dir, dryRun: true }, { createMediaScrapers: async () => scrapers, loadConfig: async () => ({}) });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No media matched'));
    expect(process.exitCode).toBe(1);
  });

  it('the CLI builds a scraper with every method src/media resolves targets through', async () => {
    const previous = process.env.XACTIONS_HOME;
    process.env.XACTIONS_HOME = dir;
    try {
      const { createMediaScrapers } = await import('../../src/cli/index.js');
      const scrapers = await createMediaScrapers();
      for (const method of ['scrapeMedia', 'scrapeProfile', 'scrapeTweetById', 'searchTweets', 'scrapeCommunityMedia']) {
        expect(typeof scrapers[method], method).toBe('function');
      }
    } finally {
      if (previous === undefined) delete process.env.XACTIONS_HOME;
      else process.env.XACTIONS_HOME = previous;
    }
  });
});
