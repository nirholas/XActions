// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§72]

import type { Page, ElementHandle } from "puppeteer";
import type { EventEmitter } from "node:events";
import { SELECTORS, resolveSelectors } from "./selectors.js";
import { config } from "../config.js";
import { createChildLogger } from "../utils/logger.js";
import type { SpaceUIState, SelectorChain } from "../types.js";

const log = createChildLogger("space-ui");

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Try CSS selectors first (primary + fallbacks), then text/aria-label matching.
 */
async function findElement(
  page: Page,
  chain: SelectorChain,
): Promise<ElementHandle | null> {
  for (const selector of resolveSelectors(chain)) {
    try {
      const el = await page.$(selector);
      if (el) return el;
    } catch {
      // selector may be invalid, try next
    }
  }

  // Fall back to text/aria-label search
  if (chain.textOptions.length > 0) {
    return findButton(page, chain.textOptions);
  }
  return null;
}

async function findButton(
  page: Page,
  textOptions: string[],
): Promise<ElementHandle | null> {
  for (const text of textOptions) {
    const btn = await page.evaluateHandle((t: string) => {
      const buttons = [
        ...document.querySelectorAll(
          'button, [role="button"], div[role="button"]',
        ),
      ];
      return (
        buttons.find((b) => {
          const content = b.textContent?.trim() ?? "";
          const label = b.getAttribute("aria-label") ?? "";
          return (
            content.toLowerCase().includes(t.toLowerCase()) ||
            label.toLowerCase().includes(t.toLowerCase())
          );
        }) ?? null
      );
    }, text);

    const el = btn.asElement() as ElementHandle<Element> | null;
    if (el) return el;
  }
  return null;
}

/**
 * Force-click an element — X often sets buttons to disabled even when the Space is live.
 */
async function forceClick(page: Page, el: ElementHandle): Promise<void> {
  await page.evaluate((e) => {
    (e as HTMLElement).removeAttribute("disabled");
    e.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  }, el);
}

export async function joinSpace(
  page: Page,
  spaceUrl: string,
  emitter: EventEmitter,
): Promise<boolean> {
  log.info("Navigating to Space: %s", spaceUrl);
  emitter.emit("status", "joining-space");

  await page.goto(spaceUrl, {
    waitUntil: "domcontentloaded",
    timeout: config.spaceJoinTimeout,
  });
  await delay(4000);

  // Check if Space has ended
  const ended = await page.evaluate(() => {
    return (
      document.body.innerText.includes("This Space has ended") ||
      document.body.innerText.includes("Space ended")
    );
  });
  if (ended) throw new Error("This Space has already ended");

  // Click join button
  const joinBtn = await findElement(page, SELECTORS.spaceJoin);
  if (joinBtn) {
    await forceClick(page, joinBtn);
    log.info("Clicked join button");
    await delay(3000);
  } else {
    // Last resort: find any join-like button
    const forced = await page.evaluateHandle(() => {
      const candidates = [
        ...document.querySelectorAll('button, [role="button"]'),
      ];
      return (
        candidates.find((b) => {
          const label = (
            b.getAttribute("aria-label") ??
            b.textContent ??
            ""
          ).toLowerCase();
          return (
            label.includes("listen") ||
            label.includes("join") ||
            label.includes("tune in") ||
            label.includes("start listening")
          );
        }) ?? null
      );
    });
    const forcedEl = forced.asElement() as ElementHandle<Element> | null;
    if (forcedEl) {
      await forceClick(page, forcedEl);
      log.info("Force-clicked fallback join button");
      await delay(3000);
    } else {
      log.warn("No join button found — may already be in Space");
    }
  }

  emitter.emit("status", "in-space-as-listener");
  return true;
}

/**
 * Returns "granted" if already a speaker, "requested" if request was sent, false if failed.
 */
export async function requestSpeaker(
  page: Page,
  emitter: EventEmitter,
): Promise<"granted" | "requested" | false> {
  log.info("Requesting to speak...");
  emitter.emit("status", "requesting-speaker");

  // Check if already a speaker (mic button present)
  const micBtn = await findElement(page, SELECTORS.spaceMic);
  if (micBtn) {
    log.info("Already a speaker (mic button found)");
    emitter.emit("status", "speaker");
    return "granted";
  }

  const speakBtn = await findElement(page, SELECTORS.spaceRequestSpeak);
  if (speakBtn) {
    await speakBtn.click();
    log.info("Speaker request sent");
    emitter.emit("status", "speaker-requested");
    return "requested";
  }

  log.warn("Could not find request-to-speak button");
  return false;
}

export async function unmute(
  page: Page,
  emitter: EventEmitter,
): Promise<boolean> {
  log.info("Unmuting...");

  let unmuteBtn: ElementHandle | null = null;
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    const handle = await page.evaluateHandle(() => {
      const btns = [
        ...document.querySelectorAll(
          'button[role="button"], [role="button"]',
        ),
      ];
      return (
        btns.find((b) => {
          const label = (b.getAttribute("aria-label") ?? "").toLowerCase();
          const text = (b.textContent ?? "").trim().toLowerCase();
          return (
            label === "unmute" ||
            label.includes("turn on mic") ||
            text === "unmute" ||
            label.includes("start speaking")
          );
        }) ?? null
      );
    });

    const el = handle.asElement() as ElementHandle<Element> | null;
    if (el) {
      unmuteBtn = el;
      break;
    }
    await delay(1000);
  }

  if (unmuteBtn) {
    await forceClick(page, unmuteBtn);
    await delay(500);
    log.info("Unmuted successfully");
    emitter.emit("status", "speaking");
    return true;
  }

  // Debug: dump buttons on page
  const btns = await page.evaluate(() =>
    [...document.querySelectorAll('button, [role="button"]')]
      .map((b) => ({
        label: b.getAttribute("aria-label"),
        text: b.textContent?.trim().slice(0, 40),
        testid: b.getAttribute("data-testid"),
      }))
      .filter((b) => b.label || b.text),
  );
  log.warn("Could not find unmute button. Buttons: %j", btns.slice(0, 20));
  await page.screenshot({ path: "/tmp/x-unmute-debug.png" });
  return false;
}

export async function waitForSpeakerAccess(
  page: Page,
  emitter: EventEmitter,
): Promise<boolean> {
  log.info("Waiting for host to accept speaker request...");

  try {
    await page.waitForSelector('button[aria-label="Unmute"]', {
      timeout: config.speakerWaitTimeout,
    });
  } catch {
    const ended = await page.evaluate(
      () =>
        document.body.innerText.includes("This Space has ended") ||
        document.body.innerText.includes("Space ended"),
    );
    if (ended) throw new Error("Space ended while waiting for speaker access");
    throw new Error("Timed out waiting for speaker access");
  }

  log.info("Speaker access granted — unmuting...");
  emitter.emit("status", "speaker");

  const unmuteBtn = await page.$('button[aria-label="Unmute"]');
  if (unmuteBtn) {
    await forceClick(page, unmuteBtn);
    await delay(500);
    log.info("Unmuted");
    emitter.emit("status", "speaking");
  }

  return true;
}

export async function leaveSpace(
  page: Page,
  emitter: EventEmitter,
): Promise<void> {
  log.info("Leaving Space...");

  const leaveBtn = await findElement(page, SELECTORS.spaceLeave);
  if (leaveBtn) {
    await leaveBtn.click();
    await delay(1000);

    // Confirm leave if prompted
    const confirmBtn = await findButton(page, ["Leave", "Yes"]);
    if (confirmBtn) await confirmBtn.click();
    await delay(1000);
  }

  emitter.emit("status", "left-space");
  log.info("Left Space");
}

export async function getSpaceState(page: Page): Promise<SpaceUIState> {
  return page.evaluate(() => {
    const text = document.body.innerText;
    return {
      isLive:
        text.includes("LIVE") ||
        !!document.querySelector('[data-testid="SpaceLiveIndicator"]'),
      hasEnded:
        text.includes("This Space has ended") ||
        text.includes("Space ended"),
      isSpeaker: !!document.querySelector(
        'button[aria-label*="Mute"], button[aria-label*="unmute"], button[aria-label*="Unmute"]',
      ),
      speakerCount: document.querySelectorAll(
        '[data-testid="SpaceSpeakerAvatar"]',
      ).length,
    };
  });
}
