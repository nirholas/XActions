// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The skills as MCP prompts, and the skill files, browser script manifest and
 * session status as MCP resources.
 *
 * Expected values are read from skills/ here, independently of the module
 * under test, so a loader that drops a file or rewrites a body fails.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

process.env.PUPPETEER_EXECUTABLE_PATH = '/nonexistent/xactions-test-chrome';

const root = new URL('../..', import.meta.url).pathname;
const skillsDir = join(root, 'skills');

let server;
let groups;
let TOOLS;
let home;
let scratch;

const ENV_KEYS = ['HOME', 'XACTIONS_HOME', 'XACTIONS_MCP_PRESET', 'XACTIONS_MCP_TOOLS', 'XACTIONS_MCP_EXCLUDE', 'XACTIONS_MCP_REQUIRE_APPROVAL'];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

async function connect(overrides = {}) {
  const srv = server.createMcpServer({ tools: '', exclude: '', preset: '', ...overrides });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await srv.connect(serverTransport);
  const client = new Client({ name: 'prompts-test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await srv.close(); } };
}

/** The skills on disk: id, frontmatter, body, and the MCP tools the body names. */
function skillsOnDisk() {
  const index = JSON.parse(readFileSync(join(skillsDir, 'index.json'), 'utf8'));
  const known = new Set(TOOLS.map((t) => t.name));
  return index.skills.map((entry) => {
    const text = readFileSync(join(skillsDir, entry.id, 'SKILL.md'), 'utf8');
    const end = text.indexOf('\n---', 4);
    const front = text.slice(4, end);
    const body = text.slice(text.indexOf('\n', end + 1) + 1);
    const field = (k) => (new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(front) || [])[1];
    const args = (/^\s+arguments:\s*(.*)$/m.exec(front) || [])[1];
    return {
      id: entry.id,
      name: field('name'),
      description: field('description'),
      body,
      arguments: args ? args.replace(/["']/g, '').split(/\s+/).filter(Boolean) : [],
      tools: [...new Set(body.match(/\bx_[a-z0-9_]+\b/g) || [])].filter((n) => known.has(n)),
    };
  });
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]));
}

beforeAll(async () => {
  server = await import('../../src/mcp/server.js');
  groups = await import('../../src/mcp/tool-groups.js');
  TOOLS = server.TOOLS;
});

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'xactions-prompts-'));
  scratch = mkdtempSync(join(tmpdir(), 'xactions-prompts-scratch-'));
  process.env.HOME = home;
  process.env.XACTIONS_HOME = join(home, '.xactions');
  for (const k of ['XACTIONS_MCP_PRESET', 'XACTIONS_MCP_TOOLS', 'XACTIONS_MCP_EXCLUDE', 'XACTIONS_MCP_REQUIRE_APPROVAL']) delete process.env[k];
});

afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  if (home) rmSync(home, { recursive: true, force: true });
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

describe('prompts/list', () => {
  it('lists every skill when every tool is loaded, with name and description from SKILL.md', async () => {
    const { client, close } = await connect();
    try {
      const { prompts } = await client.listPrompts();
      const disk = skillsOnDisk();
      expect(prompts.map((p) => p.name).sort()).toEqual(disk.map((s) => s.name).sort());
      for (const skill of disk) {
        const prompt = prompts.find((p) => p.name === skill.name);
        expect(prompt.description).toBe(skill.description);
        expect((prompt.arguments || []).map((a) => a.name)).toEqual(skill.arguments);
        for (const arg of prompt.arguments || []) expect(arg.required).toBe(false);
      }
    } finally {
      await close();
    }
  });

  it('gives a target account or topic argument to the skills that take one', async () => {
    const { client, close } = await connect();
    try {
      const { prompts } = await client.listPrompts();
      const args = (name) => (prompts.find((p) => p.name === name).arguments || []).map((a) => a.name);
      expect(args('competitor-intelligence')).toEqual(['account']);
      expect(args('lead-generation')).toEqual(['topic']);
      expect(args('business-ads')).toEqual(['account', 'topic']);
      expect(args('settings-privacy')).toEqual([]);
    } finally {
      await close();
    }
  });

  it('lists only the skills whose tools the filter loads', async () => {
    const { client, close } = await connect({ preset: 'research' });
    try {
      const { prompts } = await client.listPrompts();
      const { tools } = await client.listTools();
      const loaded = new Set([...tools.map((t) => t.name), ...groups.ALWAYS_AVAILABLE_TOOLS]);
      const expected = skillsOnDisk().filter((s) => s.tools.every((n) => loaded.has(n))).map((s) => s.name);
      expect(prompts.map((p) => p.name).sort()).toEqual(expected.sort());
      // Named tools outside research: x_bookmark (write), x_engage (automation), grok (ai).
      expect(prompts.map((p) => p.name)).not.toContain('bookmarks-management');
      expect(prompts.map((p) => p.name)).not.toContain('engagement-interaction');
      expect(prompts.map((p) => p.name)).not.toContain('grok-ai');
      expect(prompts.map((p) => p.name)).toContain('competitor-intelligence');
      // A skill that names no MCP tool needs none loaded.
      expect(prompts.map((p) => p.name)).toContain('follower-monitoring');
    } finally {
      await close();
    }
  });
});

describe('prompts/get', () => {
  it('returns the skill body as one user message', async () => {
    const { client, close } = await connect();
    try {
      const skill = skillsOnDisk().find((s) => s.id === 'follower-monitoring');
      const result = await client.getPrompt({ name: 'follower-monitoring', arguments: {} });
      expect(result.description).toBe(skill.description);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
      expect(result.messages[0].content.text.startsWith(skill.body)).toBe(true);
    } finally {
      await close();
    }
  });

  it('puts the target account and topic ahead of the skill', async () => {
    const { client, close } = await connect();
    try {
      const skill = skillsOnDisk().find((s) => s.id === 'business-ads');
      const result = await client.getPrompt({ name: 'business-ads', arguments: { account: '@nasa', topic: 'launch windows' } });
      const text = result.messages[0].content.text;
      expect(text).toMatch(/^Target account: @nasa\nTopic: launch windows\n\n/);
      expect(text).toContain(skill.body);
    } finally {
      await close();
    }
  });

  it('points at the reference files a skill relies on, as resources', async () => {
    const { client, close } = await connect();
    try {
      const result = await client.getPrompt({ name: 'algorithm-cultivation', arguments: {} });
      const text = result.messages[0].content.text;
      expect(text).toContain('xactions://skills/algorithm-cultivation/references/persona-engine.md');
      const { resources } = await client.listResources();
      expect(resources.map((r) => r.uri)).toContain('xactions://skills/algorithm-cultivation/references/persona-engine.md');
    } finally {
      await close();
    }
  });

  it('refuses an unknown prompt with InvalidParams', async () => {
    const { client, close } = await connect();
    try {
      await expect(client.getPrompt({ name: 'no-such-skill', arguments: {} })).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
    } finally {
      await close();
    }
  });

  it('refuses a prompt the filter hides, and says which tools it needs', async () => {
    const { client, close } = await connect({ preset: 'research' });
    try {
      await expect(client.getPrompt({ name: 'engagement-interaction', arguments: {} }))
        .rejects.toMatchObject({ code: ErrorCode.InvalidParams, message: expect.stringContaining('x_engage') });
    } finally {
      await close();
    }
  });
});

describe('resources/list and resources/read', () => {
  it('lists every skill file, the skills index and the session status', async () => {
    const { client, close } = await connect();
    try {
      const { resources } = await client.listResources();
      const uris = resources.map((r) => r.uri);
      const expectedSkillFiles = skillsOnDisk().flatMap((s) => filesUnder(join(skillsDir, s.id)).map((f) => `xactions://skills/${relative(skillsDir, f).split('\\').join('/')}`));
      expect(uris).toEqual(expect.arrayContaining([...expectedSkillFiles, 'xactions://skills/index.json', 'xactions://status', 'xactions://status/live']));
      for (const r of resources) {
        expect(r.name).toBeTruthy();
        expect(r.mimeType).toBeTruthy();
      }
      const skillMd = resources.find((r) => r.uri === 'xactions://skills/follower-monitoring/SKILL.md');
      expect(skillMd.mimeType).toBe('text/markdown');
      expect(skillMd.size).toBe(statSync(join(skillsDir, 'follower-monitoring', 'SKILL.md')).size);
    } finally {
      await close();
    }
  });

  it('reads a skill file byte for byte', async () => {
    const { client, close } = await connect();
    try {
      const uri = 'xactions://skills/algorithm-cultivation/references/persona-engine.md';
      const { contents } = await client.readResource({ uri });
      expect(contents).toEqual([{ uri, mimeType: 'text/markdown', text: readFileSync(join(skillsDir, 'algorithm-cultivation', 'references', 'persona-engine.md'), 'utf8') }]);
    } finally {
      await close();
    }
  });

  it('reads the skills index as JSON', async () => {
    const { client, close } = await connect();
    try {
      const { contents } = await client.readResource({ uri: 'xactions://skills/index.json' });
      expect(contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(contents[0].text).skills.length).toBe(skillsOnDisk().length);
    } finally {
      await close();
    }
  });

  it('serves the browser script manifest only when it exists', async () => {
    const missing = join(scratch, 'browser', 'index.json');
    const absent = await connect({ scriptManifestPath: missing });
    try {
      const { resources } = await absent.client.listResources();
      expect(resources.map((r) => r.uri)).not.toContain('xactions://browser-scripts/index.json');
      await expect(absent.client.readResource({ uri: 'xactions://browser-scripts/index.json' })).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
    } finally {
      await absent.close();
    }

    mkdirSync(join(scratch, 'browser'), { recursive: true });
    const manifest = JSON.stringify({ scripts: [{ id: 'unfollowback', path: 'browser/unfollowback.js' }] });
    writeFileSync(missing, manifest);
    const present = await connect({ scriptManifestPath: missing });
    try {
      const { resources } = await present.client.listResources();
      const entry = resources.find((r) => r.uri === 'xactions://browser-scripts/index.json');
      expect(entry.mimeType).toBe('application/json');
      const { contents } = await present.client.readResource({ uri: entry.uri });
      expect(contents[0].text).toBe(manifest);
    } finally {
      await present.close();
    }
  });

  it('reads the session status as doctor JSON, with the running server and no cookie values', async () => {
    mkdirSync(process.env.XACTIONS_HOME, { recursive: true });
    writeFileSync(join(process.env.XACTIONS_HOME, 'cookies.json'), JSON.stringify([
      { name: 'auth_token', value: 'secret-auth-token-value' },
      { name: 'ct0', value: 'secret-ct0-value' },
    ]));
    const { client, close } = await connect({ preset: 'research' });
    try {
      const { contents } = await client.readResource({ uri: 'xactions://status' });
      expect(contents[0].mimeType).toBe('application/json');
      expect(contents[0].text).not.toContain('secret-auth-token-value');
      expect(contents[0].text).not.toContain('secret-ct0-value');
      const status = JSON.parse(contents[0].text);
      expect(status.offline).toBe(true);
      expect(status.server).toMatchObject({ preset: 'research', requireApproval: false });
      expect(status.server.tools).toBe((await client.listTools()).tools.length);
      const checks = status.sections.flatMap((s) => s.checks);
      expect(checks.find((c) => c.name === 'Session saved')).toMatchObject({ status: 'ok' });
      for (const c of checks) expect(['ok', 'warn', 'fail']).toContain(c.status);
      expect(Object.keys(status.summary).sort()).toEqual(['fail', 'ok', 'warn']);
    } finally {
      await close();
    }
  });

  it('refuses an unknown or escaping URI with InvalidParams', async () => {
    const { client, close } = await connect();
    try {
      for (const uri of ['xactions://skills/no-such/SKILL.md', 'xactions://skills/../package.json', 'file:///etc/passwd']) {
        await expect(client.readResource({ uri })).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      }
    } finally {
      await close();
    }
  });
});

describe('capabilities', () => {
  it('declares prompts and resources when there are some', async () => {
    const { client, close } = await connect();
    try {
      const caps = client.getServerCapabilities();
      expect(caps.prompts).toBeDefined();
      expect(caps.resources).toBeDefined();
      expect(caps.tools).toBeDefined();
    } finally {
      await close();
    }
  });

  it('leaves prompts undeclared when no skill is available', async () => {
    const empty = join(scratch, 'no-skills');
    mkdirSync(empty, { recursive: true });
    const { client, close } = await connect({ skillsDir: empty });
    try {
      expect(client.getServerCapabilities().prompts).toBeUndefined();
      // The session status is always there, so resources stay declared.
      expect(client.getServerCapabilities().resources).toBeDefined();
    } finally {
      await close();
    }
  });
});
