// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
// XActions — MCP Facebook Tools Contract Tests (Story 3.2)
// by nichxbt

import { describe, it, expect, beforeAll } from 'vitest';

let TOOLS;

beforeAll(async () => {
  const mod = await import('../../src/mcp/server.js');
  TOOLS = mod.TOOLS;
});

const findTool = (name) => TOOLS.find((t) => t.name === name);
const getPlatformEnum = (toolName) =>
  findTool(toolName)?.inputSchema?.properties?.platform?.enum ?? [];

// ============================================================================
// AC4a — Additive enum check: facebook present, originals intact
// ============================================================================

describe('MCP scrape tool platform enums — additive facebook extension', () => {
  const MULTI_PLATFORM_TOOLS = [
    'x_get_profile',
    'x_get_followers',
    'x_get_following',
    'x_get_tweets',
    'x_search_tweets',
  ];

  const ORIGINAL_VALUES = ['twitter', 'bluesky', 'mastodon', 'threads'];

  for (const toolName of MULTI_PLATFORM_TOOLS) {
    it(`${toolName}: original platform values still present`, () => {
      const en = getPlatformEnum(toolName);
      for (const val of ORIGINAL_VALUES) {
        expect(en, `${toolName} missing original enum value "${val}"`).toContain(val);
      }
    });

    it(`${toolName}: facebook added to platform enum`, () => {
      const en = getPlatformEnum(toolName);
      expect(en).toContain('facebook');
    });

    it(`${toolName}: fb alias added to platform enum`, () => {
      const en = getPlatformEnum(toolName);
      expect(en).toContain('fb');
    });
  }
});

// ============================================================================
// AC4b — x_facebook_automate schema check
// ============================================================================

describe('x_facebook_automate tool schema', () => {
  it('tool is registered in TOOLS array', () => {
    expect(findTool('x_facebook_automate')).toBeDefined();
  });

  it('has action enum with like, comment, post', () => {
    const actionEnum = findTool('x_facebook_automate')
      ?.inputSchema?.properties?.action?.enum ?? [];
    expect(actionEnum).toContain('like');
    expect(actionEnum).toContain('comment');
    expect(actionEnum).toContain('post');
  });

  it('has urls array field', () => {
    const urls = findTool('x_facebook_automate')?.inputSchema?.properties?.urls;
    expect(urls).toBeDefined();
    expect(urls.type).toBe('array');
  });

  it('has text string field', () => {
    const text = findTool('x_facebook_automate')?.inputSchema?.properties?.text;
    expect(text).toBeDefined();
    expect(text.type).toBe('string');
  });

  it('has dryRun boolean field', () => {
    const dryRun = findTool('x_facebook_automate')?.inputSchema?.properties?.dryRun;
    expect(dryRun).toBeDefined();
    expect(dryRun.type).toBe('boolean');
  });

  it('has authCookie object field with c_user and xs', () => {
    const authCookie = findTool('x_facebook_automate')?.inputSchema?.properties?.authCookie;
    expect(authCookie).toBeDefined();
    expect(authCookie.type).toBe('object');
    expect(authCookie.properties).toHaveProperty('c_user');
    expect(authCookie.properties).toHaveProperty('xs');
  });

  it('has maxBatch number field', () => {
    const maxBatch = findTool('x_facebook_automate')?.inputSchema?.properties?.maxBatch;
    expect(maxBatch).toBeDefined();
    expect(maxBatch.type).toBe('number');
  });

  it('requires action field', () => {
    const required = findTool('x_facebook_automate')?.inputSchema?.required ?? [];
    expect(required).toContain('action');
  });

  it('requires authCookie field', () => {
    const required = findTool('x_facebook_automate')?.inputSchema?.required ?? [];
    expect(required).toContain('authCookie');
  });
});

// ============================================================================
// AC4c — No tool name removed (additive check)
// ============================================================================

describe('no existing MCP tool removed', () => {
  const REQUIRED_TOOLS = [
    'x_get_profile', 'x_get_followers', 'x_get_following',
    'x_get_tweets', 'x_search_tweets', 'x_list_platforms',
  ];

  for (const toolName of REQUIRED_TOOLS) {
    it(`${toolName} still exists`, () => {
      expect(findTool(toolName), `Tool "${toolName}" was removed!`).toBeDefined();
    });
  }
});
