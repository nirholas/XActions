// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/graph/visualizer.js toHTML escaping.
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { toHTML } from '../../src/graph/visualizer.js';

function graphWith(bio, seed = 'seeduser') {
  return {
    seed,
    nodes: new Map([
      [seed, { username: seed, name: 'Seed', bio: 'hello', followers: 10, following: 5 }],
      ['other', { username: 'other', name: 'Other', bio, followers: '<img src=x onerror=alert(2)>', following: 1 }],
    ]),
    edges: [{ source: seed, target: 'other', type: 'follows', weight: 1 }],
    metadata: {},
  };
}

describe('toHTML', () => {
  it('cannot be broken out of its inline script by a bio', () => {
    const html = toHTML(graphWith('</script><script>alert(1)</script>'));
    // The only closing script tags are the two the template itself writes.
    expect(html.match(/<\/script>/gi)).toHaveLength(2);
    expect(html).not.toContain('<script>alert(1)');
    // The data still round-trips to the original bio.
    const json = html.match(/const graphData = (.*);\n/)[1];
    expect(JSON.parse(json).nodes.find((n) => n.id === 'other').bio).toBe('</script><script>alert(1)</script>');
  });

  it('escapes the seed handle in the title and heading', () => {
    const html = toHTML(graphWith('bio', '<b>x</b>'));
    expect(html).toContain('<title>Social Graph: @&lt;b&gt;x&lt;/b&gt; — XActions</title>');
    expect(html).toContain('<h2>📊 @&lt;b&gt;x&lt;/b&gt;</h2>');
  });

  it('keeps follower counts numeric so the tooltip HTML cannot carry markup', () => {
    const html = toHTML(graphWith('bio'));
    const json = html.match(/const graphData = (.*);\n/)[1];
    expect(JSON.parse(json).nodes.find((n) => n.id === 'other').followers).toBe(0);
  });
});

describe('graph storage', () => {
  it('saves graphs under XACTIONS_HOME, resolved at call time', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const { saveGraph, list } = await import('../../src/graph/index.js');
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-graph-home-'));
    const saved = process.env.XACTIONS_HOME;
    process.env.XACTIONS_HOME = home;
    try {
      await saveGraph({ ...graphWith('bio'), id: 'g-test' });
      expect(fs.existsSync(path.join(home, 'graphs', 'g-test.json'))).toBe(true);
      expect((await list()).map((g) => g.id)).toContain('g-test');
    } finally {
      if (saved === undefined) delete process.env.XACTIONS_HOME; else process.env.XACTIONS_HOME = saved;
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});
