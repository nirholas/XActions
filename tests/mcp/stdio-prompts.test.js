// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * A real client session: the SDK's stdio client spawns `src/mcp/server.js`
 * with a preset, the way Claude Desktop or Cursor launches it, then lists and
 * fetches a prompt and a resource.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = new URL('../..', import.meta.url).pathname;

let home;
let client;
let presets;
let TOOLS;

beforeAll(async () => {
  presets = await import('../../src/mcp/presets.js');
  ({ TOOLS } = await import('../../src/mcp/server.js'));
  home = mkdtempSync(join(tmpdir(), 'xactions-stdio-prompts-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('XACTIONS_')));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, 'src', 'mcp', 'server.js'), '--preset', 'research'],
    env: {
      ...env,
      HOME: home,
      XACTIONS_HOME: join(home, '.xactions'),
      PUPPETEER_EXECUTABLE_PATH: '/nonexistent/xactions-test-chrome',
      MCP_TRANSPORT: 'stdio',
    },
    stderr: 'pipe',
  });
  client = new Client({ name: 'stdio-prompts-test', version: '0.0.0' });
  await client.connect(transport);
}, 60000);

afterAll(async () => {
  await client?.close();
  if (home) rmSync(home, { recursive: true, force: true });
});

describe('xactions-mcp --preset research over stdio', () => {
  it('serves the research tool set', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBe(presets.measurePreset(presets.getPreset('research'), TOOLS).tools);
    expect(tools.map((t) => t.name)).toContain('x_get_profile');
    expect(tools.map((t) => t.name)).not.toContain('x_post_tweet');
  });

  it('lists and fetches a skill prompt', async () => {
    const { prompts } = await client.listPrompts();
    const scraping = prompts.find((p) => p.name === 'twitter-scraping');
    expect(scraping).toBeDefined();
    expect(scraping.arguments.map((a) => a.name)).toEqual(['account']);

    const result = await client.getPrompt({ name: 'twitter-scraping', arguments: { account: 'NASA' } });
    const text = result.messages[0].content.text;
    expect(text.startsWith('Target account: @NASA\n\n')).toBe(true);
    expect(text).toContain('# ');
  });

  it('lists and reads a skill file resource', async () => {
    const { resources } = await client.listResources();
    const uri = 'xactions://skills/twitter-scraping/SKILL.md';
    expect(resources.map((r) => r.uri)).toContain(uri);
    const { contents } = await client.readResource({ uri });
    expect(contents[0].text).toBe(readFileSync(join(root, 'skills', 'twitter-scraping', 'SKILL.md'), 'utf8'));
  });
});
