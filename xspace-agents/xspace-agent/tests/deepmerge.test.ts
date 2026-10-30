// SPDX-License-Identifier: Apache-2.0

/**
 * deepmerge <= 4.3.1 lets an own "__proto__" key (any JSON.parse output)
 * replace the prototype of the merged result (GHSA-gcqx-w48m-w2h4, no upstream
 * fix). puppeteer-extra and its user-preferences plugin pull it in, so
 * package.json overrides it with the patched copy in ../vendor/deepmerge.
 */

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";

const require = createRequire(import.meta.url);
const consumers = ["puppeteer-extra", "puppeteer-extra-plugin-user-preferences"];
const fromConsumer = (name: string) =>
  createRequire(require.resolve(name, { paths: [require.resolve("puppeteer-extra-plugin-stealth")] }));

type Merge = (target: object, source: object) => Record<string, unknown>;

describe("deepmerge as puppeteer-extra loads it", () => {
  it.each(consumers)("%s resolves the vendored copy", (name) => {
    expect(realpathSync(fromConsumer(name).resolve("deepmerge"))).toMatch(/vendor[\\/]deepmerge[\\/]index\.js$/);
  });

  it("does not let a parsed __proto__ key poison the result", () => {
    const deepmerge = fromConsumer("puppeteer-extra")("deepmerge") as Merge;
    const fromTarget = deepmerge(JSON.parse('{"__proto__": {"polluted": 1}, "keep": 1}'), {});
    const fromSource = deepmerge({ a: 1 }, JSON.parse('{"__proto__": {"polluted": 1}}'));
    for (const out of [fromTarget, fromSource]) {
      expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
      expect(out["polluted"]).toBeUndefined();
    }
    expect(fromTarget["keep"]).toBe(1);
  });

  it("still deep-merges ordinary objects", () => {
    const deepmerge = fromConsumer("puppeteer-extra")("deepmerge") as Merge;
    expect(deepmerge({ a: { b: 1 }, list: [1] }, { a: { c: 2 }, list: [2] })).toEqual({ a: { b: 1, c: 2 }, list: [1, 2] });
  });
});
