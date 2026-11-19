// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * A Puppeteer-shaped page over the current jsdom document.
 *
 * The functions the MCP browser tools hand to `evaluate`, `waitForFunction`
 * and `ElementHandle.evaluate` are the parts that read X's DOM, so these run
 * them for real against a document the test builds. Only the transport is
 * replaced: there is no serialisation, and `keyboard.type` writes into the
 * element that was last clicked, which is what focus does in a browser.
 *
 * Import from a test file that runs under `@vitest-environment jsdom`.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

const tick = () => new Promise((r) => setTimeout(r, 5));

class TimeoutError extends Error {}

/**
 * @param {object} [options]
 * @param {(el: Element) => void} [options.onClick] runs after a handle click
 * @param {(text: string, target: Element|null) => void} [options.onType]
 *   replaces the default keyboard behaviour (append to the clicked element)
 * @param {number} [options.timeoutScale=1] shrink every wait (tests stay fast)
 */
export function jsdomPage({ onClick, onType, timeoutScale = 1 } = {}) {
  let focused = null;
  const log = { goto: [], clicks: [], typed: [] };

  const wrap = (el) => {
    if (!el) return null;
    const handle = {
      el,
      asElement: () => handle,
      dispose: async () => {},
      click: async () => {
        focused = el;
        log.clicks.push(el);
        el.click();
        onClick?.(el);
      },
      evaluate: async (fn, ...args) => fn(el, ...args),
      type: async (text) => {
        focused = el;
        el.textContent += text;
      },
    };
    return handle;
  };

  const poll = async (check, timeout) => {
    const deadline = Date.now() + timeout * timeoutScale;
    for (;;) {
      const value = await check();
      if (value) return value;
      if (Date.now() > deadline) throw new TimeoutError(`waited ${timeout}ms`);
      await tick();
    }
  };

  return {
    log,
    goto: async (url, opts) => {
      log.goto.push({ url, opts });
      return { status: () => 200 };
    },
    url: () => window.location.href,
    $: async (sel) => wrap(document.querySelector(sel)),
    $$: async (sel) => Array.from(document.querySelectorAll(sel)).map(wrap),
    evaluate: async (fn, ...args) => fn(...args),
    evaluateHandle: async (fn, ...args) => {
      const el = fn(...args);
      return el ? wrap(el) : { asElement: () => null, dispose: async () => {} };
    },
    waitForSelector: async (sel, { timeout = 30000 } = {}) =>
      poll(() => wrap(document.querySelector(sel)), timeout),
    waitForFunction: async (fn, { timeout = 30000 } = {}, ...args) => {
      const value = await poll(() => fn(...args), timeout);
      return { jsonValue: async () => value, dispose: async () => {} };
    },
    keyboard: {
      type: async (text) => {
        log.typed.push(text);
        if (onType) return onType(text, focused);
        if (focused) focused.textContent += text;
      },
    },
  };
}
