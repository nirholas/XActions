// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * MCP presets: a server started for a job by name.
 *
 * Every assertion about what a client sees goes through a real MCP client on
 * the SDK's in-memory transport, so the tool list checked here is the one
 * Claude Desktop or Cursor would be handed.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// A held draft never runs, but an approved one would reach the backend. Point
// Puppeteer at nothing so a mistake fails fast instead of opening x.com.
process.env.PUPPETEER_EXECUTABLE_PATH = '/nonexistent/xactions-test-chrome';

const root = new URL('../..', import.meta.url).pathname;

let server;
let presets;
let groups;
let TOOLS;
let home;

const ENV_KEYS = ['XACTIONS_HOME', 'XACTIONS_MCP_PRESET', 'XACTIONS_MCP_TOOLS', 'XACTIONS_MCP_EXCLUDE', 'XACTIONS_MCP_REQUIRE_APPROVAL', 'XACTIONS_ACTION_CAPS'];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

async function connect(overrides = {}) {
  const srv = server.createMcpServer(overrides);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await srv.connect(serverTransport);
  const client = new Client({ name: 'presets-test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await srv.close(); } };
}

async function listedNames(overrides) {
  const { client, close } = await connect(overrides);
  try {
    const { tools } = await client.listTools();
    return tools.map((t) => t.name);
  } finally {
    await close();
  }
}

/** The names a list of group/tool tokens selects, computed independently of presets.js. */
function namesOf(tokens) {
  const byGroup = groups.buildGroups(TOOLS);
  const out = new Set();
  for (const token of tokens) {
    if (byGroup[token]) byGroup[token].forEach((n) => out.add(n));
    else out.add(token);
  }
  return out;
}

const sorted = (names) => [...names].sort();

beforeAll(async () => {
  server = await import('../../src/mcp/server.js');
  presets = await import('../../src/mcp/presets.js');
  groups = await import('../../src/mcp/tool-groups.js');
  TOOLS = server.TOOLS;
});

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'xactions-presets-'));
  process.env.XACTIONS_HOME = home;
  for (const k of ['XACTIONS_MCP_PRESET', 'XACTIONS_MCP_TOOLS', 'XACTIONS_MCP_EXCLUDE', 'XACTIONS_MCP_REQUIRE_APPROVAL']) delete process.env[k];
});

afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  if (home) rmSync(home, { recursive: true, force: true });
});

describe('preset definitions', () => {
  it('ships the seven presets, each with a one-line audience', () => {
    expect(presets.PRESET_NAMES).toEqual(['research', 'monitor', 'community-manager', 'growth', 'data', 'read-only', 'full']);
    for (const p of presets.PRESETS) {
      expect(typeof p.summary).toBe('string');
      expect(p.summary.length).toBeGreaterThan(10);
      expect(p.summary).not.toMatch(/\n/);
    }
  });

  it('names only groups and tools that exist', () => {
    const byGroup = groups.buildGroups(TOOLS);
    const known = new Set(TOOLS.map((t) => t.name));
    for (const p of presets.PRESETS) {
      for (const token of [...(p.select || []), ...(p.exclude || [])]) {
        expect(Boolean(byGroup[token]) || known.has(token) || token === groups.WRITES_SELECTOR, `${p.name}: ${token}`).toBe(true);
      }
    }
  });

  it('looks presets up case-insensitively and refuses an unknown name with the list', () => {
    expect(presets.getPreset('Research').name).toBe('research');
    expect(presets.getPreset('')).toBeNull();
    expect(presets.getPreset(undefined)).toBeNull();
    expect(() => presets.getPreset('everything')).toThrow(/Unknown MCP preset "everything".*research, monitor, community-manager, growth, data, read-only, full/);
  });
});

describe('each preset serves exactly its tool set', () => {
  const drafts = () => new Set(groups.ALWAYS_AVAILABLE_TOOLS);
  // In approval mode the agent is never offered the tool that approves its own drafts.
  const withoutSelfApproval = (set) => { set.delete('x_approve_draft'); return set; };

  const cases = {
    research: () => new Set([...namesOf(['read', 'analytics']), ...drafts()]),
    monitor: () => withoutSelfApproval(new Set([...namesOf(['read', 'monitoring', 'analytics']), ...drafts()])),
    'community-manager': () => withoutSelfApproval(new Set([...namesOf(['read', 'write', 'dm', 'lists', 'drafts', 'x_detect_unfollowers', 'x_analyze_sentiment']), ...drafts()])),
    growth: () => withoutSelfApproval(new Set([...namesOf(['read', 'write', 'automation', 'persona', 'drafts', 'x_best_time_to_post', 'x_growth_rate']), ...drafts()])),
    data: () => withoutSelfApproval(new Set([...namesOf(['read', 'data', 'graph']), ...drafts()])),
    'read-only': () => new Set(TOOLS.map((t) => t.name).filter((n) => !groups.isWriteTool(n))),
    full: () => withoutSelfApproval(new Set(TOOLS.map((t) => t.name))),
  };

  for (const [name, expected] of Object.entries(cases)) {
    it(name, async () => {
      expect(sorted(await listedNames({ preset: name, tools: '', exclude: '' }))).toEqual(sorted(expected()));
    });
  }

  it('read-only has no tool with a side effect, and every tool without one', async () => {
    const names = await listedNames({ preset: 'read-only', tools: '', exclude: '' });
    expect(names.filter((n) => groups.isWriteTool(n))).toEqual([]);
    expect(names.length).toBe(TOOLS.filter((t) => !groups.isWriteTool(t.name)).length);
  });

  it('measurePreset reports the count and bytes the server actually lists', async () => {
    for (const p of presets.PRESETS) {
      const { client, close } = await connect({ preset: p.name, tools: '', exclude: '' });
      try {
        const { tools } = await client.listTools();
        const size = presets.measurePreset(p, TOOLS);
        expect(size.tools, p.name).toBe(tools.length);
        const listed = new Set(tools.map((t) => t.name));
        expect(size.bytes, p.name).toBe(JSON.stringify(TOOLS.filter((t) => listed.has(t.name))).length);
      } finally {
        await close();
      }
    }
  });
});

describe('default behaviour is unchanged', () => {
  it('no preset and no filter lists every tool in order, x_approve_draft included', async () => {
    expect(await listedNames({ tools: '', exclude: '' })).toEqual(TOOLS.map((t) => t.name));
  });

  it('no preset leaves approval off', async () => {
    // Approval mode hides x_approve_draft; nothing is called, so nothing can post.
    expect(await listedNames({ tools: '', exclude: '' })).toContain('x_approve_draft');
  });
});

describe('composition order: preset, then --tools adds, then --exclude removes', () => {
  it('--tools adds a tool to the preset', async () => {
    const names = await listedNames({ preset: 'research', tools: 'x_post_tweet', exclude: '' });
    expect(names).toContain('x_post_tweet');
    expect(names).toContain('x_get_profile');
    expect(names).toContain('x_best_time_to_post');
  });

  it('--tools adds a group to the preset', async () => {
    const names = await listedNames({ preset: 'research', tools: 'graph', exclude: '' });
    expect(names).toEqual(expect.arrayContaining([...namesOf(['graph'])]));
    expect(names).toContain('x_get_profile');
  });

  it('--tools can add back a tool the preset itself leaves out', async () => {
    const names = await listedNames({ preset: 'read-only', tools: 'x_post_tweet', exclude: '' });
    expect(names).toContain('x_post_tweet');
    expect(names).not.toContain('x_like');
  });

  it('--exclude removes from the preset', async () => {
    const names = await listedNames({ preset: 'research', tools: '', exclude: 'analytics' });
    expect(names.filter((n) => groups.groupOf(n) === 'analytics')).toEqual([]);
    expect(names).toContain('x_get_profile');
  });

  it('--exclude wins over --tools', async () => {
    const names = await listedNames({ preset: 'research', tools: 'x_post_tweet', exclude: 'x_post_tweet' });
    expect(names).not.toContain('x_post_tweet');
  });

  it('--exclude writes strips every write a preset brings', async () => {
    const names = await listedNames({ preset: 'growth', tools: '', exclude: 'writes' });
    expect(names.filter((n) => groups.isWriteTool(n))).toEqual([]);
    expect(names).toContain('x_persona_list');
  });

  it('the draft tools survive any composition', async () => {
    const names = await listedNames({ preset: 'research', tools: '', exclude: 'drafts' });
    expect(names).toEqual(expect.arrayContaining(['x_list_drafts', 'x_discard_draft', 'x_draft_status']));
  });

  it('XACTIONS_MCP_PRESET selects a preset, and the option beats the variable', async () => {
    process.env.XACTIONS_MCP_PRESET = 'data';
    const fromEnv = await listedNames({});
    expect(sorted(fromEnv)).toEqual(sorted(await listedNames({ preset: 'data' })));
    const fromOption = await listedNames({ preset: 'research' });
    expect(fromOption).not.toContain('x_graph_build');
    expect(fromOption).toContain('x_best_time_to_post');
  });

  it('XACTIONS_MCP_TOOLS composes with the preset as the --tools layer', async () => {
    process.env.XACTIONS_MCP_PRESET = 'research';
    process.env.XACTIONS_MCP_TOOLS = 'x_like';
    const names = await listedNames({});
    expect(names).toContain('x_like');
    expect(names).toContain('x_get_profile');
  });

  it('refuses to build a server for an unknown preset', () => {
    expect(() => server.createMcpServer({ preset: 'everything' })).toThrow(/Unknown MCP preset/);
  });
});

describe('approval default', () => {
  // Approval mode hides x_approve_draft from the agent. Checking the listing
  // proves approval is off without calling a write tool that could reach X.
  async function approvalOn(overrides) {
    return !(await listedNames({ tools: '', exclude: '', ...overrides })).includes('x_approve_draft');
  }

  // Only ever called where approval is on: a held draft never runs.
  async function postIsHeld(overrides) {
    const { client, close } = await connect({ tools: '', exclude: '', ...overrides });
    try {
      const result = await client.callTool({ name: 'x_post_tweet', arguments: { text: 'held, never sent' } });
      return JSON.parse(result.content[0].text).held === true;
    } finally {
      await close();
    }
  }

  it('a preset with write tools turns approval on', async () => {
    expect(await postIsHeld({ preset: 'community-manager' })).toBe(true);
    expect(await postIsHeld({ preset: 'growth' })).toBe(true);
    expect(await postIsHeld({ preset: 'full' })).toBe(true);
  });

  it('every preset that includes a write is flagged, and only those', () => {
    const flagged = presets.PRESETS.filter((p) => presets.presetIncludesWrites(p, TOOLS)).map((p) => p.name);
    expect(flagged).toEqual(['monitor', 'community-manager', 'growth', 'data', 'full']);
  });

  it('XACTIONS_MCP_REQUIRE_APPROVAL=0 is an explicit choice and wins', async () => {
    process.env.XACTIONS_MCP_REQUIRE_APPROVAL = '0';
    expect(await approvalOn({ preset: 'community-manager' })).toBe(false);
  });

  it('--no-require-approval (requireApproval: false) wins', async () => {
    expect(await approvalOn({ preset: 'community-manager', requireApproval: false })).toBe(false);
  });

  it('a preset with no write tools leaves approval off', async () => {
    expect(await approvalOn({ preset: 'research' })).toBe(false);
    expect(await approvalOn({ preset: 'read-only' })).toBe(false);
  });

  it('an empty variable, or a .mcpb placeholder left unfilled, is not a choice', async () => {
    process.env.XACTIONS_MCP_REQUIRE_APPROVAL = '';
    expect(await postIsHeld({ preset: 'community-manager' })).toBe(true);
    process.env.XACTIONS_MCP_REQUIRE_APPROVAL = '${user_config.require_approval}';
    expect(await postIsHeld({ preset: 'community-manager' })).toBe(true);
  });

  it('an unfilled .mcpb placeholder is not a preset or a selection either', async () => {
    process.env.XACTIONS_MCP_PRESET = '${user_config.preset}';
    process.env.XACTIONS_MCP_TOOLS = '${user_config.tool_groups}';
    expect(await listedNames({})).toEqual(TOOLS.map((t) => t.name));
  });
});

describe('CLI flags', () => {
  it('parses --preset in both spellings', () => {
    expect(server.parseCliArgs(['--preset', 'research']).preset).toBe('research');
    expect(server.parseCliArgs(['--preset=growth']).preset).toBe('growth');
    expect(server.parseCliArgs([]).preset).toBeUndefined();
  });

  it('parses --list-presets', () => {
    expect(server.parseCliArgs(['--list-presets']).listPresets).toBe(true);
  });
});

describe('documented sizes', () => {
  const DOCS = ['docs/mcp-setup.md', 'AGENTS.md', 'CLAUDE.md', 'README.md'];

  for (const rel of DOCS) {
    it(`${rel} carries the current preset table`, () => {
      const text = readFileSync(join(root, rel), 'utf8');
      const block = presets.extractPresetBlock(text);
      expect(block, `${rel} has no <!-- mcp-presets:start --> block`).not.toBeNull();
      expect(block, `${rel} is stale: run \`node scripts/sync-mcp-presets.mjs\``).toBe(presets.renderPresetTable(TOOLS));
    });
  }
});
