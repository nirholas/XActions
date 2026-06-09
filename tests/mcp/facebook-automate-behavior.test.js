// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
// XActions — executeFacebookAutomateTool behavior tests (Story 3.2 / AC3.7-3.8)
// by nichxbt
//
// Covers pre-browser guards that fire before createBrowser is called:
//   - Hard auth guard (AC3.7): missing / empty / whitespace authCookie
//   - Fail-fast arg validation (AC3.8): urls for like/comment, text for comment/post
//   - dryRun strict gate (schema-level): field is non-required boolean → omitting defaults to dry-run
//
// No real browser is launched — all tested paths throw before the first await
// that touches Puppeteer.

import { describe, it, expect } from 'vitest';
import { executeFacebookAutomateTool } from '../../src/mcp/server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_AUTH = { c_user: 'u_12345', xs: 'xs_token_abc' };
const VALID_URLS  = ['https://www.facebook.com/photo?fbid=123456789'];

// ---------------------------------------------------------------------------
// Auth guard (AC3.7) — mirrors CLI hard-guard from Story 3.1
// ---------------------------------------------------------------------------

describe('executeFacebookAutomateTool — auth guard', () => {
  it('throws when authCookie is entirely absent', async () => {
    await expect(
      executeFacebookAutomateTool({ action: 'like', urls: VALID_URLS })
    ).rejects.toThrow(/requires authCookie/i);
  });

  it('throws when authCookie is null', async () => {
    await expect(
      executeFacebookAutomateTool({ action: 'like', urls: VALID_URLS, authCookie: null })
    ).rejects.toThrow(/requires authCookie/i);
  });

  it('throws when authCookie is an empty object', async () => {
    await expect(
      executeFacebookAutomateTool({ action: 'like', urls: VALID_URLS, authCookie: {} })
    ).rejects.toThrow(/requires authCookie/i);
  });

  it('throws when c_user is an empty string', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'like', urls: VALID_URLS,
        authCookie: { c_user: '', xs: 'xs_token' },
      })
    ).rejects.toThrow(/requires authCookie/i);
  });

  it('throws when c_user is whitespace-only', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'like', urls: VALID_URLS,
        authCookie: { c_user: '   ', xs: 'xs_token' },
      })
    ).rejects.toThrow(/requires authCookie/i);
  });

  it('throws when xs is an empty string', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'like', urls: VALID_URLS,
        authCookie: { c_user: 'u_12345', xs: '' },
      })
    ).rejects.toThrow(/requires authCookie/i);
  });

  it('throws when xs is whitespace-only', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'like', urls: VALID_URLS,
        authCookie: { c_user: 'u_12345', xs: '   ' },
      })
    ).rejects.toThrow(/requires authCookie/i);
  });
});

// ---------------------------------------------------------------------------
// Arg validation — like action (AC3.8)
// ---------------------------------------------------------------------------

describe('executeFacebookAutomateTool — arg validation: like', () => {
  it('throws when urls is an empty array', async () => {
    await expect(
      executeFacebookAutomateTool({ action: 'like', urls: [], authCookie: VALID_AUTH })
    ).rejects.toThrow(/requires at least one URL/i);
  });

  it('throws when urls is absent (destructure default [])', async () => {
    await expect(
      executeFacebookAutomateTool({ action: 'like', authCookie: VALID_AUTH })
    ).rejects.toThrow(/requires at least one URL/i);
  });

  it('throws when urls is a plain string instead of an array', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'like',
        urls: 'https://www.facebook.com/photo?fbid=123456789',
        authCookie: VALID_AUTH,
      })
    ).rejects.toThrow(/requires at least one URL/i);
  });
});

// ---------------------------------------------------------------------------
// Arg validation — comment action (AC3.8)
// ---------------------------------------------------------------------------

describe('executeFacebookAutomateTool — arg validation: comment', () => {
  it('throws when urls is empty', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'comment', urls: [], text: 'Great post!', authCookie: VALID_AUTH,
      })
    ).rejects.toThrow(/requires at least one URL/i);
  });

  it('throws when text is absent (destructure default empty string)', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'comment', urls: VALID_URLS, authCookie: VALID_AUTH,
      })
    ).rejects.toThrow(/requires non-empty text/i);
  });

  it('throws when text is an empty string', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'comment', urls: VALID_URLS, text: '', authCookie: VALID_AUTH,
      })
    ).rejects.toThrow(/requires non-empty text/i);
  });

  it('throws when text is whitespace-only', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'comment', urls: VALID_URLS, text: '   ', authCookie: VALID_AUTH,
      })
    ).rejects.toThrow(/requires non-empty text/i);
  });
});

// ---------------------------------------------------------------------------
// Arg validation — post action (AC3.8)
// ---------------------------------------------------------------------------

describe('executeFacebookAutomateTool — arg validation: post', () => {
  it('throws when text is absent', async () => {
    await expect(
      executeFacebookAutomateTool({ action: 'post', authCookie: VALID_AUTH })
    ).rejects.toThrow(/requires non-empty text/i);
  });

  it('throws when text is whitespace-only', async () => {
    await expect(
      executeFacebookAutomateTool({
        action: 'post', text: '\t\n  ', authCookie: VALID_AUTH,
      })
    ).rejects.toThrow(/requires non-empty text/i);
  });
});

// ---------------------------------------------------------------------------
// dryRun strict gate — schema-level verification (AC3.6)
//
// Full runtime verification (unset dryRun → resolvedDryRun=true → no real write)
// requires an authenticated Facebook session and a live browser.
// The schema and handler logic are verified here at the contract level:
//   - Schema: dryRun is a boolean field (not required) → omitting it defaults to dry-run
//   - Handler: `dryRun === false ? false : true` — only explicit false enables real writes
// ---------------------------------------------------------------------------

describe('executeFacebookAutomateTool — dryRun strict gate (schema / contract)', () => {
  it('dryRun field in x_facebook_automate schema is boolean type', async () => {
    const { TOOLS } = await import('../../src/mcp/server.js');
    const tool = TOOLS.find((t) => t.name === 'x_facebook_automate');
    expect(tool?.inputSchema?.properties?.dryRun?.type).toBe('boolean');
  });

  it('dryRun is NOT in required array — omitting it defaults to dry-run behavior', async () => {
    const { TOOLS } = await import('../../src/mcp/server.js');
    const tool = TOOLS.find((t) => t.name === 'x_facebook_automate');
    const required = tool?.inputSchema?.required ?? [];
    expect(required).not.toContain('dryRun');
  });
});
