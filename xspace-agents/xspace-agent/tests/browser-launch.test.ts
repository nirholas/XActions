// SPDX-License-Identifier: Apache-2.0

// Launches the real browser through puppeteer-extra and the stealth plugin, so a
// puppeteer major that breaks the wrapper or the cookie API fails here rather
// than when an agent tries to join a Space. Skipped when puppeteer has no
// browser downloaded (`npx puppeteer browsers install chrome`).

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";

const executable = await puppeteer.executablePath();
const hasBrowser = fs.existsSync(executable);

describe.skipIf(!hasBrowser)("browser launch", () => {
  let dir: string;
  let server: Server;
  let origin: string;
  let browserModule: typeof import("../src/spaces/browser.js");
  const open: Browser[] = [];

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "xspace-browser-"));
    vi.stubEnv("COOKIE_PATH", path.join(dir, "cookies.json"));
    vi.stubEnv("HEADLESS", "true");
    vi.resetModules();
    browserModule = await import("../src/spaces/browser.js");

    server = createServer((req, res) => {
      res.setHeader("content-type", "text/html");
      if (req.url === "/set") res.setHeader("set-cookie", "session=abc123; Path=/; HttpOnly");
      res.end(`<p>${req.headers.cookie ?? ""}</p>`);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    for (const browser of open.splice(0)) await browserModule.closeBrowser(browser);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(dir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("launches with the stealth plugin applied", async () => {
    const { browser, page } = await browserModule.launch();
    open.push(browser);
    await page.goto(`${origin}/`);
    expect(await page.evaluate(() => navigator.webdriver)).toBe(false);
    expect(await page.evaluate(() => navigator.userAgent)).not.toMatch(/Headless/);
    expect(await browserModule.isHealthy(page)).toBe(true);
  }, 60000);

  it("saves cookies and restores them on the next launch", async () => {
    const first = await browserModule.launch();
    open.push(first.browser);
    await first.page.goto(`${origin}/set`);
    await browserModule.saveCookies(first.page);
    await browserModule.closeBrowser(open.pop()!);

    const saved = JSON.parse(fs.readFileSync(path.join(dir, "cookies.json"), "utf8")) as Array<{ name: string; value: string }>;
    expect(saved).toEqual(expect.arrayContaining([expect.objectContaining({ name: "session", value: "abc123" })]));

    const second = await browserModule.launch();
    open.push(second.browser);
    await second.page.goto(`${origin}/`);
    expect(await second.page.$eval("p", (el) => el.textContent)).toBe("session=abc123");
  }, 60000);
});
