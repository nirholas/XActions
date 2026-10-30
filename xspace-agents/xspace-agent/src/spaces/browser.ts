// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§82]

import vanillaPuppeteer from "puppeteer";
import { addExtra } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "node:fs";
import path from "node:path";
import type { Browser, CookieData, Page } from "puppeteer";
import { config } from "../config.js";
import { createChildLogger } from "../utils/logger.js";
import type { BrowserInstance } from "../types.js";

const log = createChildLogger("browser");

// Wrap the puppeteer this package installs, rather than letting puppeteer-extra
// require() it: puppeteer 25 is ESM-only.
const puppeteer = addExtra(vanillaPuppeteer);
puppeteer.use(StealthPlugin());

const AUDIO_FILE = "/tmp/xspace-agent-silent.wav";

// Embedded silent WAV — generated once and cached on disk.
function ensureSilentWav(): string {
  if (fs.existsSync(AUDIO_FILE)) return AUDIO_FILE;

  const sampleRate = 48000;
  const numSamples = sampleRate; // 1 second
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(AUDIO_FILE, buffer);
  log.info("Silent WAV created at %s", AUDIO_FILE);
  return AUDIO_FILE;
}

function getCookiePath(): string {
  return path.resolve(config.cookiePath);
}

export async function launch(): Promise<BrowserInstance> {
  const audioFile = ensureSilentWav();

  const browser = await puppeteer.launch({
    headless: config.headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${audioFile}`,
      "--autoplay-policy=no-user-gesture-required",
      "--disable-features=WebRtcHideLocalIpsWithMdns",
      "--window-size=1280,720",
    ],
    defaultViewport: { width: 1280, height: 720 },
  }) as unknown as Browser;

  const page = (await browser.newPage()) as Page;
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  // Restore cookies. Puppeteer 25 deprecates the page-level cookie API, so
  // cookies are set on the browser, which shares them with every page.
  const cookiePath = getCookiePath();
  if (fs.existsSync(cookiePath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf8")) as CookieData[];
      await browser.setCookie(...cookies);
      log.info("Restored saved cookies from %s", cookiePath);
    } catch (e) {
      log.warn("Failed to restore cookies: %s", (e as Error).message);
    }
  }

  return { browser, page };
}

export async function saveCookies(page: Page): Promise<void> {
  const cookiePath = getCookiePath();
  const cookies = await page.browser().cookies();
  fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
  log.info("Cookies saved to %s", cookiePath);
}

export async function closeBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
    log.info("Browser closed");
  } catch (e) {
    log.warn("Error closing browser: %s", (e as Error).message);
  }
}

/**
 * Check if the browser/page is still responsive.
 */
export async function isHealthy(page: Page): Promise<boolean> {
  try {
    await page.evaluate(() => true);
    return true;
  } catch {
    return false;
  }
}
