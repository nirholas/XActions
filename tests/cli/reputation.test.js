// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions — `xactions reputation` tests
// by nichxbt

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';

import { registerReputationCommand } from '../../src/cli/commands/reputation.js';
import { GROUPS } from '../../src/cli/help-groups.js';

const tweet = (id, extra = {}) => ({ id, text: `post ${id}`, fullText: `post ${id}`, username: 'nasa', isRetweet: false, isReply: false, photos: [], videos: [], ...extra });

function fakeScraper(tweets) {
  return {
    async *getTweets() {
      for (const t of tweets) yield t;
    },
    async *getTweetsAndReplies() {
      for (const t of tweets) yield t;
    },
  };
}

const CLEAN_JSON = JSON.stringify({
  professional: { score: 5, reason: 'ordinary update' },
  hostile: { score: 0, reason: 'no target' },
  legal: { score: 0, reason: 'no claims' },
  spam: { score: 5, reason: 'plain post' },
});
const FLAGGED_JSON = JSON.stringify({
  professional: { score: 90, reason: 'insults a named coworker' },
  hostile: { score: 85, reason: 'direct personal attack' },
  legal: { score: 10, reason: 'no explicit threat' },
  spam: { score: 0, reason: 'not spam' },
});

function stubFetch(replies) {
  let i = 0;
  const original = globalThis.fetch;
  globalThis.fetch = vi.fn(async (url, init) => {
    const body = JSON.parse(init.body);
    const content = replies[Math.min(i, replies.length - 1)];
    i++;
    return { ok: true, status: 200, json: async () => ({ model: body.model, choices: [{ message: { content } }] }) };
  });
  return () => { globalThis.fetch = original; };
}

let logSpy;
let errorSpy;
let restoreFetch;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
  if (restoreFetch) { restoreFetch(); restoreFetch = null; }
});

describe('registerReputationCommand', () => {
  it('registers the command with its flags and lands in Search and monitor', () => {
    const program = new Command();
    registerReputationCommand(program, { createHttpScraper: async () => fakeScraper([]), loadConfig: async () => ({}) });
    const cmd = program.commands.find((c) => c.name() === 'reputation');
    expect(cmd).toBeDefined();
    const flags = cmd.options.map((o) => o.long);
    for (const flag of ['--replies', '--reposts', '--limit', '--dimensions', '--custom-question', '--provider', '--model', '--api-key', '--json']) {
      expect(flags).toContain(flag);
    }
    const group = GROUPS.find((g) => g.commands.includes('reputation'));
    expect(group?.title).toBe('Search and monitor');
  });
});

describe('xactions reputation (full run)', () => {
  it('scores posts and prints a JSON report with a real grade and flagged posts', async () => {
    restoreFetch = stubFetch([CLEAN_JSON, FLAGGED_JSON]);
    const program = new Command();
    program.exitOverride();
    registerReputationCommand(program, {
      createHttpScraper: async () => fakeScraper([tweet('1'), tweet('2', { text: 'Fire that idiot from accounting' })]),
      loadConfig: async () => ({}),
    });

    await program.parseAsync(['node', 'xactions', 'reputation', 'nasa', '--provider', 'xai', '--api-key', 'test-key', '--json']);

    expect(errorSpy).not.toHaveBeenCalled();
    const printed = logSpy.mock.calls.map((c) => c[0]).find((line) => typeof line === 'string' && line.trim().startsWith('{'));
    expect(printed).toBeTruthy();
    const report = JSON.parse(printed);
    expect(report.username).toBe('nasa');
    expect(report.report.scanned).toBe(2);
    expect(report.report.verdictCounts.flagged).toBe(1);
    expect(report.scores).toHaveLength(2);
  });

  it('rejects an unknown --dimensions value before making any request', async () => {
    const program = new Command();
    program.exitOverride();
    const createHttpScraper = vi.fn(async () => fakeScraper([]));
    registerReputationCommand(program, { createHttpScraper, loadConfig: async () => ({}) });

    await program.parseAsync(['node', 'xactions', 'reputation', 'nasa', '--dimensions', 'foo,hostile']);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown dimension'));
    expect(createHttpScraper).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('fails with the model error instead of a clean A+ when every scoring call fails', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 401, text: async () => 'invalid api key' }));
    restoreFetch = () => { globalThis.fetch = original; };
    const program = new Command();
    program.exitOverride();
    registerReputationCommand(program, {
      createHttpScraper: async () => fakeScraper([tweet('1'), tweet('2')]),
      loadConfig: async () => ({}),
    });

    await program.parseAsync(['node', 'xactions', 'reputation', 'nasa', '--provider', 'xai', '--api-key', 'bad-key', '--json']);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('invalid api key'));
    const printed = logSpy.mock.calls.map((c) => c[0]).find((line) => typeof line === 'string' && line.trim().startsWith('{'));
    const body = JSON.parse(printed);
    expect(body.report).toBeNull();
    expect(body.error).toMatch(/No post could be scored/);
    expect(logSpy.mock.calls.flat().join('\n')).not.toContain('reads clean');
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('reports no posts found with a clear, actionable message', async () => {
    const program = new Command();
    program.exitOverride();
    registerReputationCommand(program, { createHttpScraper: async () => fakeScraper([]), loadConfig: async () => ({}) });

    await program.parseAsync(['node', 'xactions', 'reputation', 'nasa']);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No posts found for @nasa'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });
});
