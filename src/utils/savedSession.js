// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The saved X session, read once and shared by the paths that need it.
 *
 * Every read command resolves a session from `~/.xactions`, but the browser
 * path only ever looked at `XACTIONS_SESSION_COOKIE` in the environment. Run
 * `xactions bulk follow` from a shell where nobody exported that variable and
 * Puppeteer drove x.com logged out: the anonymous shell X now serves has no
 * `data-testid` in it at all, so the follow button never matched, no follow
 * happened, and the caller was told the follow succeeded.
 *
 * @module utils/savedSession
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Where sessions live, honouring `XACTIONS_HOME` and staying out of the real
 * home directory while the test suite runs.
 *
 * @param {string} [override]
 * @returns {string}
 */
export function sessionDir(override) {
  if (override) return override;
  if (process.env.XACTIONS_HOME) return process.env.XACTIONS_HOME;
  if (process.env.VITEST) return path.join(os.tmpdir(), `xactions-vitest-${process.pid}`);
  return path.join(os.homedir(), '.xactions');
}

/**
 * Read the session the CLI already saved.
 *
 * The environment wins when it is set, so an operator can still point one run
 * at a different account. Otherwise the cookie jar written by `xactions
 * connect` / `xactions login` is used, falling back to the two tokens those
 * commands mirror into `config.json`.
 *
 * @param {{dir?: string, env?: NodeJS.ProcessEnv}} [options]
 * @returns {Promise<{authToken: string, ct0: string|null, source: string}|null>}
 */
export async function loadSavedSession(options = {}) {
  const env = options.env || process.env;
  if (env.XACTIONS_SESSION_COOKIE) {
    return {
      authToken: env.XACTIONS_SESSION_COOKIE,
      ct0: env.XACTIONS_CSRF_TOKEN || null,
      source: 'environment',
    };
  }

  const dir = sessionDir(options.dir);

  try {
    const jar = JSON.parse(await fs.readFile(path.join(dir, 'cookies.json'), 'utf-8'));
    if (Array.isArray(jar)) {
      const cookies = Object.fromEntries(
        jar.filter((c) => c && c.name && c.value).map((c) => [c.name, c.value]),
      );
      if (cookies.auth_token) {
        return { authToken: cookies.auth_token, ct0: cookies.ct0 || null, source: 'cookies.json' };
      }
    }
  } catch {
    // No jar, or a jar this build did not write — fall through to config.json.
  }

  try {
    const config = JSON.parse(await fs.readFile(path.join(dir, 'config.json'), 'utf-8'));
    if (config.authToken) {
      return { authToken: config.authToken, ct0: config.csrfToken || null, source: 'config.json' };
    }
  } catch {
    // Nothing saved at all: the caller keeps the guest tier.
  }

  return null;
}
