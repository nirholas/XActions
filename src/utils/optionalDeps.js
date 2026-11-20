// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Packages a feature loads the first time it is used, rather than at startup.
 *
 * `npm install xactions` installs what the CLI, the MCP server and the HTTP
 * scrapers need. A few features need more:
 *
 * - The browser stack (`puppeteer`, `puppeteer-extra`,
 *   `puppeteer-extra-plugin-stealth`) is in `optionalDependencies`. It installs
 *   by default, but `npm install xactions --omit=optional` leaves it out, as
 *   does an install where Chromium's download failed. Every HTTP read works
 *   without it; `xactions connect` and the browser-driven write tools do not.
 * - `bull`, `nodemailer` and `exceljs` are optional peer dependencies: they are
 *   never installed for you, and only poll-transport streams, email
 *   notifications and the Excel plugin use them.
 *
 * Nothing on the startup path of the CLI or the MCP server imports one of
 * these statically, so a missing one costs only the feature that needs it, and
 * that feature fails with the install command rather than a bare
 * ERR_MODULE_NOT_FOUND.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

/** The install command for the whole browser stack. */
export const BROWSER_INSTALL = 'npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth';

/**
 * Thrown when a feature needs a package that is not installed.
 */
export class MissingDependencyError extends Error {
  /**
   * @param {string} pkg - The package that could not be found
   * @param {string} feature - What needed it, as the start of a sentence
   * @param {string} install - The command that installs it
   */
  constructor(pkg, feature, install) {
    super(`${feature} needs the "${pkg}" package, which is not installed. Install it with: ${install}`);
    this.name = 'MissingDependencyError';
    this.code = 'XACTIONS_MISSING_DEPENDENCY';
    this.package = pkg;
    this.install = install;
  }
}

/**
 * The package name of a bare specifier: `@scope/pkg/sub` -> `@scope/pkg`.
 * @param {string} specifier
 * @returns {string}
 */
function packageName(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Did this import fail because `pkg` itself is absent? A package that is
 * installed but broken, or one that is missing one of its own dependencies,
 * is a different failure and keeps its original error.
 * @param {unknown} err
 * @param {string} pkg
 * @returns {boolean}
 */
export function isMissingPackage(err, pkg) {
  const code = /** @type {{code?: string}} */ (err)?.code;
  if (code !== 'ERR_MODULE_NOT_FOUND' && code !== 'MODULE_NOT_FOUND') return false;
  // Node names the package ('bull'); Vite's resolver, under Vitest, names the
  // whole specifier ('viem/chains').
  const message = String(/** @type {Error} */ (err).message);
  return message.includes(`'${pkg}'`) || message.includes(`'${pkg}/`);
}

/**
 * Import an optional package, or explain how to install it.
 *
 * @param {string} specifier - A bare specifier, such as `bull` or `viem/chains`
 * @param {object} options
 * @param {string} options.feature - What needs it, e.g. "Email notifications"
 * @param {string} [options.install] - The install command (default: `npm install <package>`)
 * @returns {Promise<any>} The module namespace
 * @throws {MissingDependencyError} When the package is not installed
 */
export async function importOptional(specifier, { feature, install } = {}) {
  const pkg = packageName(specifier);
  try {
    return await import(specifier);
  } catch (err) {
    if (isMissingPackage(err, pkg)) {
      throw new MissingDependencyError(pkg, feature || 'This feature', install || `npm install ${pkg}`);
    }
    throw err;
  }
}

/** @type {Promise<any> | null} */
let stealthPuppeteer = null;

/**
 * Puppeteer wrapped by puppeteer-extra with the stealth plugin registered,
 * loaded once and shared by every module that launches a browser.
 *
 * `puppeteer-core` stands in for `puppeteer` when only the core is installed
 * (with `PUPPETEER_EXECUTABLE_PATH` pointing at a system Chromium), which is
 * what puppeteer-extra itself falls back to.
 *
 * @param {string} [feature] - What needs the browser, for the error message
 * @returns {Promise<import('puppeteer').PuppeteerNode>} Exposes `launch()`, `connect()` and `use()`
 * @throws {MissingDependencyError} When any part of the browser stack is not installed
 */
export function loadStealthPuppeteer(feature = 'Browser automation') {
  if (!stealthPuppeteer) {
    stealthPuppeteer = (async () => {
      const options = { feature, install: BROWSER_INSTALL };
      const { addExtra } = await importOptional('puppeteer-extra', options);
      const { default: StealthPlugin } = await importOptional('puppeteer-extra-plugin-stealth', options);
      let vanilla;
      try {
        vanilla = (await import('puppeteer')).default;
      } catch (err) {
        if (!isMissingPackage(err, 'puppeteer')) throw err;
        try {
          vanilla = (await import('puppeteer-core')).default;
        } catch (coreErr) {
          if (!isMissingPackage(coreErr, 'puppeteer-core')) throw coreErr;
          throw new MissingDependencyError('puppeteer', feature, BROWSER_INSTALL);
        }
      }
      const puppeteer = addExtra(vanilla);
      puppeteer.use(StealthPlugin());
      return puppeteer;
    })().catch((err) => {
      // Do not cache a failure: the user may install the package and retry
      // in the same long-lived MCP process.
      stealthPuppeteer = null;
      throw err;
    });
  }
  return stealthPuppeteer;
}
