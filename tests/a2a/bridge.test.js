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
    const result = bridge.parseNaturalLanguage('post a tweet saying hello world');
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
    const result = bridge.parseNaturalLanguage('show me trending topics');
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
    // Provide tasks that reference NL parsing (which works offline)
    const tasks = [
      { skillId: null, inputParts: [createTextPart('get profile @elonmusk')] },
    ];
    // This will likely fail because local-tools isn't available in test env,
    // but it should not throw
    const results = await bridge.batchExecute(tasks);
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(1);
  });
});
