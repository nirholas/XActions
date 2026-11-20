// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Per-feed sweep progress, on disk.
 *
 * A sweep that cannot resume is a sweep you dare not stop. Every post that
 * was liked, reposted, or replied to is recorded under the feed it came from,
 * so the next run over the same profile, search, or list skips what is done
 * and finishes what failed. State lives beside the CLI's other config in
 * `~/.xactions/engage/`, one file per feed.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';
import { xactionsHome } from '../utils/savedSession.js';

/** Default home for sweep state, matching the CLI's config directory. */
export const DEFAULT_CONFIG_DIR = xactionsHome();

/**
 * Where one feed's progress file lives.
 *
 * @param {string} configDir - Usually ~/.xactions
 * @param {string} stateKey - From resolveSource().stateKey, e.g. "profile-nasa"
 * @returns {string}
 */
export function statePath(configDir, stateKey) {
  const safe = String(stateKey).toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'sweep';
  return path.join(configDir, 'engage', `${safe}.json`);
}

/**
 * Open (or create) the progress record for one feed.
 *
 * @param {object} [opts]
 * @param {string} [opts.configDir] - Defaults to ~/.xactions
 * @param {string} opts.stateKey - From resolveSource().stateKey
 * @param {boolean} [opts.enabled=true] - False makes every method a no-op, for --no-resume
 * @param {boolean} [opts.reset=false] - Forget what was recorded before
 * @returns {Promise<{ file: string, done: Record<string, object>, priorCount: number, save: Function, clear: Function }>}
 */
export async function createEngageState({ configDir = DEFAULT_CONFIG_DIR, stateKey, enabled = true, reset = false } = {}) {
  if (!stateKey) throw new Error('createEngageState needs a stateKey');
  const file = statePath(configDir, stateKey);

  if (!enabled) {
    return { file, done: {}, priorCount: 0, save: async () => {}, clear: async () => {} };
  }

  let done = {};
  if (!reset) {
    try {
      const parsed = JSON.parse(await fs.readFile(file, 'utf-8'));
      if (parsed && typeof parsed.done === 'object' && parsed.done) done = parsed.done;
    } catch {
      // No file yet, or it was hand-edited into something unreadable: start clean
      // rather than refusing to run.
    }
  }

  const write = async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({ stateKey, updatedAt: new Date().toISOString(), done }, null, 2));
  };

  if (reset) await write();

  return {
    file,
    done,
    priorCount: Object.keys(done).length,
    /** Persist the current record set. Safe to call after every post. */
    save: write,
    /** Forget everything recorded for this feed. */
    clear: async () => {
      done = {};
      await write();
    },
  };
}
