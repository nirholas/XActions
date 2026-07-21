// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/a2a/bridge.js
 * @author nich (@nichxbt)
 */

import { createBridge } from '../../src/a2a/bridge.js';
import { createTextPart, createDataPart } from '../../src/a2a/types.js';

describe('createBridge', () => {
  it('returns an object with execute, parseNaturalLanguage, batchExecute', () => {
    const bridge = createBridge({ mode: 'local' });
    expect(typeof bridge.execute).toBe('function');
    expect(typeof bridge.parseNaturalLanguage).toBe('function');
    expect(typeof bridge.batchExecute).toBe('function');
  });
});

describe('parseNaturalLanguage', () => {
  let bridge;
  beforeEach(() => {
    bridge = createBridge({ mode: 'local' });
  });

  it('extracts profile lookup', () => {
    const result = bridge.parseNaturalLanguage('get profile for elonmusk');
    expect(result).toBeDefined();
    expect(result.tool).toContain('profile');
  });

  it('extracts follower scrape', () => {
    const result = bridge.parseNaturalLanguage('scrape followers of @nichxbt');
    expect(result).toBeDefined();
    expect(result.tool).toContain('follower');
  });

  it('extracts tweet posting', () => {
    const result = bridge.parseNaturalLanguage('post a tweet saying "hello world"');
    expect(result).toBeDefined();
    expect(result.tool).toContain('tweet');
  });

  it('returns null for unrecognized text', () => {
    const result = bridge.parseNaturalLanguage('asdfgh jklzxcv');
    expect(result).toBeNull();
  });

  it('extracts unfollow command', () => {
    const result = bridge.parseNaturalLanguage('unfollow @someuser');
    expect(result).toBeDefined();
  });

  it('extracts tweet scraping', () => {
    const result = bridge.parseNaturalLanguage('get tweets from @nichxbt');
    expect(result).toBeDefined();
    expect(result.tool).toContain('tweet');
  });

  it('extracts trending request', () => {
    // Pattern requires "show trending" or "show the trending" or "what's trending"
    const result = bridge.parseNaturalLanguage('show the trending topics');
    expect(result).toBeDefined();
    expect(result.tool).toContain('trend');
  });

  it('handles username with and without @', () => {
    const a = bridge.parseNaturalLanguage('get profile for nichxbt');
    const b = bridge.parseNaturalLanguage('get profile for @nichxbt');
    expect(a?.params?.username).toBe('nichxbt');
    expect(b?.params?.username).toBe('nichxbt');
  });
});

describe('execute (remote mode)', () => {
  it('refuses unknown skills gracefully', async () => {
    const bridge = createBridge({ mode: 'remote', apiUrl: 'http://localhost:99999' });
    const result = await bridge.execute('xactions.nonexistent', [createTextPart('test')]);
    // Should either fail gracefully or return an error artifact
    expect(result).toBeDefined();
    expect(result.success === false || result.error).toBeTruthy();
  });
});

describe('batchExecute', () => {
  it('executes multiple tasks sequentially', async () => {
    const bridge = createBridge({ mode: 'local' });
    // batchExecute takes { tool, params } objects
    const tasks = [
      { tool: 'x_get_profile', params: { username: 'elonmusk' } },
    ];
    // This will likely fail because local-tools isn't available in test env,
    // but it should not throw — it returns an array of step results
    const result = await bridge.batchExecute(tasks);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});
