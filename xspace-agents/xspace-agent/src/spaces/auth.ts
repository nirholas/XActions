// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§69]

import type { CookieData, Page } from "puppeteer";
import type { EventEmitter } from "node:events";
import { config } from "../config.js";
import { saveCookies } from "./browser.js";
import { SELECTORS } from "./selectors.js";
import { createChildLogger } from "../utils/logger.js";

const log = createChildLogger("auth");

async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto(SELECTORS.HOME_URL, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });
    const url = page.url();
    return url.includes("/home") && !url.includes("/login");
  } catch {
    return false;
  }
}

export async function login(page: Page, emitter: EventEmitter): Promise<boolean> {
  // Check saved cookies
  if (await isLoggedIn(page)) {
    log.info("Already logged in via cookies");
    emitter.emit("status", "logged-in");
    return true;
  }

  // Fast path: inject auth_token cookie
  if (config.xAuthToken) {
    log.info("Logging in via X_AUTH_TOKEN cookie");
    emitter.emit("status", "logging-in");

    const cookies: CookieData[] = [
      {
        name: "auth_token",
        value: config.xAuthToken,
        domain: ".x.com",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "None",
      },
    ];
    if (config.xCt0) {
      cookies.push({
        name: "ct0",
        value: config.xCt0,
        domain: ".x.com",
        path: "/",
        secure: false,
        httpOnly: false,
        sameSite: "Lax",
      });
    }
    await page.browser().setCookie(...cookies);

    const ok = await isLoggedIn(page);
    if (!ok) {
      if (config.xUsername && config.xPassword) {
        log.warn("auth_token is invalid or expired — falling back to username/password login");
      } else {
        throw new Error(
          "X_AUTH_TOKEN is invalid or expired — get a fresh one from your browser",
        );
      }
    } else {
      log.info("Login successful via auth_token");
      await saveCookies(page);
      emitter.emit("status", "logged-in");
      return true;
    }
  }

  // Form login
  if (!config.xUsername || !config.xPassword) {
    throw new Error(
      "Set X_AUTH_TOKEN (recommended) or X_USERNAME + X_PASSWORD in .env",
    );
  }

  log.info("Logging in via browser form as: %s", config.xUsername);
  emitter.emit("status", "logging-in");

  await page.goto("https://x.com/i/flow/login", {
    waitUntil: "networkidle2",
    timeout: config.browserTimeout,
  });
  await delay(2000);

  // Step 1: Username
  await page.waitForSelector(SELECTORS.LOGIN_USERNAME_INPUT, {
    timeout: 15000,
  });
  await delay(500);
  await page.type(SELECTORS.LOGIN_USERNAME_INPUT, config.xUsername, {
    delay: randomDelay(),
  });
  await delay(500);
  await clickButtonByText(page, "Next");
  await delay(2000);

  // Step 2: Email/phone verification (if X asks)
  const verifyInput = await page.$(SELECTORS.VERIFY_INPUT);
  if (verifyInput) {
    log.info("Verification step — entering email/phone");
    const val = config.xEmail || config.xUsername;
    await verifyInput.type(val, { delay: randomDelay() });
    await delay(500);
    const verifyNext = await page.$(SELECTORS.VERIFY_NEXT_BUTTON);
    if (verifyNext) await verifyNext.click();
    await delay(2000);
  }

  // Step 3: Password
  let passwordInput;
  try {
    passwordInput = await page.waitForSelector(SELECTORS.LOGIN_PASSWORD_INPUT, {
      timeout: 15000,
    });
  } catch {
    await page.screenshot({ path: "/tmp/x-login-step3.png" });
    throw new Error(
      "Password field not found — X may be blocking the login. Try setting X_AUTH_TOKEN instead.",
    );
  }
  await delay(500);
  await passwordInput!.type(config.xPassword, { delay: randomDelay() });
  await delay(500);

  // Click Log in
  const loginBtn = await page.$(SELECTORS.LOGIN_SUBMIT_BUTTON);
  if (loginBtn) {
    await loginBtn.click();
  } else {
    await clickButtonByText(page, "Log in");
  }
  await delay(3000);

  // 2FA
  const twoFaInput = await page.$(SELECTORS.VERIFY_INPUT);
  if (twoFaInput && page.url().includes("two_factor")) {
    log.info("2FA required — waiting for code from admin panel");
    emitter.emit("2fa-required", {});

    const code = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("2FA timeout (120s)")),
        120000,
      );
      emitter.once("2fa-code", (c: string) => {
        clearTimeout(timeout);
        resolve(c);
      });
    });

    await twoFaInput.type(code, { delay: 50 });
    const verifyBtn = await page.$(SELECTORS.VERIFY_NEXT_BUTTON);
    if (verifyBtn) await verifyBtn.click();
    await delay(3000);
  }

  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    await page.screenshot({ path: "/tmp/x-login-failed.png" });
    throw new Error(
      "Login failed — screenshot at /tmp/x-login-failed.png. Consider using X_AUTH_TOKEN instead.",
    );
  }

  log.info("Login successful!");
  await saveCookies(page);
  emitter.emit("status", "logged-in");
  return true;
}

async function clickButtonByText(page: Page, text: string): Promise<boolean> {
  const buttons = await page.$$('button[role="button"], [role="button"]');
  for (const btn of buttons) {
    const t = await page.evaluate(
      (el) => el.textContent?.trim() ?? "",
      btn,
    );
    if (t.includes(text)) {
      await btn.click();
      return true;
    }
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay(): number {
  return 30 + Math.random() * 70;
}
