// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Browser liveness checks across the Puppeteer API shapes they have to cope
 * with: the pre-25 `isConnected()` method, the 25 `connected` getter, a dead
 * child process, and an object that exposes neither.
 */

import { describe, it, expect } from 'vitest';
import { isBrowserConnected, isPageUsable } from '../../src/utils/browserState.js';

describe('isBrowserConnected', () => {
  it('is false for nothing at all', () => {
    expect(isBrowserConnected(null)).toBe(false);
    expect(isBrowserConnected(undefined)).toBe(false);
    expect(isBrowserConnected('browser')).toBe(false);
  });

  it('is false for an object that carries no browser API', () => {
    expect(isBrowserConnected({})).toBe(false);
    expect(isBrowserConnected({ isOpen: true })).toBe(false);
  });

  it('reads the pre-25 isConnected() method', () => {
    expect(isBrowserConnected({ isConnected: () => true })).toBe(true);
    expect(isBrowserConnected({ isConnected: () => false })).toBe(false);
  });

  it('reads the Puppeteer 25 connected getter', () => {
    expect(isBrowserConnected({ connected: true })).toBe(true);
    expect(isBrowserConnected({ connected: false })).toBe(false);
  });

  it('returns false rather than throwing when the check itself throws', () => {
    const browser = {
      isConnected() {
        throw new Error('Protocol error (Browser.close): Session closed. Most likely the browser has already closed.');
      },
    };
    expect(isBrowserConnected(browser)).toBe(false);
  });

  it('falls back to the launched child process', () => {
    expect(isBrowserConnected({ process: () => ({ exitCode: null }) })).toBe(true);
    expect(isBrowserConnected({ process: () => ({ exitCode: 1 }) })).toBe(false);
    expect(isBrowserConnected({ process: () => null, newPage: () => {} })).toBe(true);
  });

  it('treats an object that can still open a page as usable', () => {
    expect(isBrowserConnected({ newPage: async () => ({}) })).toBe(true);
  });

  it('does not call isConnected as a bare property', () => {
    // The bug that started this: a value that is truthy but not callable.
    expect(isBrowserConnected({ isConnected: true })).toBe(true);
    expect(isBrowserConnected({ isConnected: false })).toBe(false);
  });
});

describe('isPageUsable', () => {
  it('is false for nothing', () => {
    expect(isPageUsable(null)).toBe(false);
    expect(isPageUsable(undefined)).toBe(false);
  });

  it('is false once the page reports itself closed', () => {
    expect(isPageUsable({ isClosed: () => true, goto: () => {} })).toBe(false);
    expect(isPageUsable({ isClosed: () => false, goto: () => {} })).toBe(true);
  });

  it('is false for an object that cannot navigate', () => {
    expect(isPageUsable({ isClosed: () => false })).toBe(false);
  });
});
