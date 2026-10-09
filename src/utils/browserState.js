// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Browser liveness checks that survive a Puppeteer major bump.
 *
 * Puppeteer 25 replaced `browser.isConnected()` with the `browser.connected`
 * getter, so every `browser.isConnected()` call in the tree started throwing
 * `browser.isConnected is not a function` on the second use of a browser —
 * the first call short-circuited on `!browser` and never reached the method.
 * These helpers ask for the state through whichever API the object actually
 * carries, and never throw for an object that carries neither.
 *
 * @module utils/browserState
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/**
 * Is this browser object still attached to a live browser?
 *
 * Order of evidence: the old `isConnected()` method, the Puppeteer 25
 * `connected` getter, the child process that launched it, and finally a
 * duck-typed `newPage` (an object that can still open pages is treated as
 * usable; anything else is not).
 *
 * @param {object|null|undefined} browser
 * @returns {boolean}
 */
export function isBrowserConnected(browser) {
  if (!browser || typeof browser !== 'object') return false;

  try {
    if (typeof browser.isConnected === 'function') return browser.isConnected() === true;
    if (typeof browser.isConnected === 'boolean') return browser.isConnected;
    if (typeof browser.connected === 'boolean') return browser.connected;
  } catch {
    return false;
  }

  try {
    const proc = typeof browser.process === 'function' ? browser.process() : undefined;
    if (proc && typeof proc === 'object') {
      return proc.exitCode === null || proc.exitCode === undefined;
    }
  } catch {
    return false;
  }

  return typeof browser.newPage === 'function';
}

/**
 * Is this page object still open and capable of navigating?
 *
 * @param {object|null|undefined} page
 * @returns {boolean}
 */
export function isPageUsable(page) {
  if (!page || typeof page !== 'object') return false;
  try {
    if (typeof page.isClosed === 'function' && page.isClosed() === true) return false;
  } catch {
    return false;
  }
  return typeof page.goto === 'function';
}
