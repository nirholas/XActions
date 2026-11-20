// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Draft store for the MCP approval gate.
 *
 * When XACTIONS_MCP_REQUIRE_APPROVAL is set, a write tool call is not run.
 * It is recorded here as a draft `{id, tool, args, createdAt}` and the
 * caller gets the id back. A human (or a second, trusted agent) then lists,
 * approves, or discards the draft. Approval replays the stored call through
 * the executor the server hands in, so an approved draft runs exactly the
 * code path the original call would have.
 *
 * Storage is a single JSON file, `mcp-drafts.json`, under XACTIONS_HOME
 * (default `~/.xactions`). The path is resolved on every call rather than at
 * import time so a process can point XACTIONS_HOME somewhere else after the
 * module has loaded (tests do this with a temp directory).
 *
 * The module has no MCP dependency on purpose: the CLI can import
 * list/approve/discard directly to offer `xactions drafts ...` later.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { withFileLock } from '../utils/fileLock.js';

export const DRAFTS_FILENAME = 'mcp-drafts.json';

/** @typedef {'pending' | 'running' | 'executed' | 'failed'} DraftStatus */

/**
 * @typedef {object} Draft
 * @property {string} id
 * @property {string} tool
 * @property {object} args
 * @property {string} createdAt ISO timestamp
 * @property {DraftStatus} status
 * @property {string} [executedAt]
 * @property {unknown} [result] set when status is "executed"
 * @property {string} [error] set when status is "failed"
 */

/**
 * Directory that holds XActions state. Honours XACTIONS_HOME.
 * @returns {string}
 */
export function getXactionsHome() {
  return process.env.XACTIONS_HOME || join(homedir(), '.xactions');
}

/**
 * Absolute path of the drafts file.
 * @returns {string}
 */
export function getDraftsPath() {
  return join(getXactionsHome(), DRAFTS_FILENAME);
}

/**
 * Read every draft from disk. A missing file is an empty store; a corrupt
 * file is an error the caller should see rather than silently losing drafts.
 * @returns {Draft[]}
 */
function readStore() {
  const file = getDraftsPath();
  if (!existsSync(file)) return [];
  const raw = readFileSync(file, 'utf8');
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Draft store at ${file} is not a JSON array`);
  }
  return parsed;
}

/**
 * Write the store atomically (write to a sibling temp file, then rename) so
 * a crash mid-write cannot leave a half-written file behind.
 * @param {Draft[]} drafts
 */
function writeStore(drafts) {
  const file = getDraftsPath();
  mkdirSync(getXactionsHome(), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(drafts, null, 2) + '\n', 'utf8');
  renameSync(tmp, file);
}

/**
 * Read, change and write the store under the cross-process lock, so a draft
 * created or discarded by one process is never overwritten by another.
 * @template T
 * @param {(drafts: Draft[]) => T} change mutates the array it is handed
 * @returns {T}
 */
function updateStore(change) {
  return withFileLock(getDraftsPath(), () => {
    const drafts = readStore();
    const result = change(drafts);
    writeStore(drafts);
    return result;
  });
}

/**
 * Store a new pending draft.
 * @param {string} tool
 * @param {object} [args]
 * @returns {Draft}
 */
export function createDraft(tool, args = {}) {
  if (typeof tool !== 'string' || !tool) {
    throw new Error('createDraft: tool name is required');
  }
  const draft = {
    id: randomUUID().slice(0, 8),
    tool,
    args: args ?? {},
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  updateStore((drafts) => drafts.push(draft));
  return draft;
}

/**
 * List drafts, newest first. Filter by status when given.
 * @param {{ status?: DraftStatus | 'all' }} [options]
 * @returns {Draft[]}
 */
export function listDrafts({ status = 'all' } = {}) {
  const drafts = readStore();
  const selected = status === 'all' ? drafts : drafts.filter((d) => d.status === status);
  return selected.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Fetch one draft by id.
 * @param {string} id
 * @returns {Draft | null}
 */
export function getDraft(id) {
  return readStore().find((d) => d.id === id) || null;
}

/**
 * Remove a draft from the store. Works on any status.
 * @param {string} id
 * @returns {Draft} the removed draft
 */
export function discardDraft(id) {
  return updateStore((drafts) => {
    const idx = drafts.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error(`No draft with id "${id}"`);
    return drafts.splice(idx, 1)[0];
  });
}

/**
 * Whether a tool's return value reports a failure without having thrown.
 *
 * Browser tools say `{ success: false, message }`; the handlers in server.js
 * say `{ error: "..." }` (a missing argument, no API key, a monitor that does
 * not exist). Both are failures, and treating the second as a success let an
 * agent count a refused call as done.
 *
 * @param {unknown} result
 * @returns {boolean}
 */
export function reportsFailure(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
  const { success, error } = /** @type {{ success?: unknown, error?: unknown }} */ (result);
  if (success === false) return true;
  return success !== true && typeof error === 'string' && error.length > 0;
}

/**
 * Execute a pending draft through the supplied executor and record the
 * outcome on the draft. The executor receives `(tool, args)` and is the
 * same dispatch the live tool call would have used.
 *
 * The draft is claimed (marked "running") under the store lock before the
 * executor is called, so a second approve, in this process or another, is
 * refused rather than posting twice. The outcome is then written back to
 * that one draft in a fresh read of the store, so drafts created or
 * discarded while the action ran are kept as they are. A process that dies
 * mid-run leaves the draft "running": safer than a retry that might repeat
 * the action, and `discardDraft` still removes it.
 *
 * @param {string} id
 * @param {(tool: string, args: object) => Promise<unknown>} execute
 * @returns {Promise<Draft>} the updated draft
 */
export async function approveDraft(id, execute) {
  if (typeof execute !== 'function') {
    throw new Error('approveDraft: an executor function is required');
  }
  const claimed = updateStore((drafts) => {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) throw new Error(`No draft with id "${id}"`);
    if (draft.status !== 'pending') {
      throw new Error(`Draft "${id}" is ${draft.status}; only pending drafts can be approved`);
    }
    draft.status = 'running';
    return { ...draft };
  });

  const outcome = {};
  try {
    const result = await execute(claimed.tool, claimed.args);
    // Many tools report a failure as `{ success: false }` or `{ error }`
    // rather than throwing; that is a failed draft, not an executed one.
    if (reportsFailure(result)) {
      outcome.status = 'failed';
      outcome.error = String(result.message || result.error || `${claimed.tool} reported failure`);
      outcome.result = result;
    } else {
      outcome.status = 'executed';
      outcome.result = result === undefined ? null : result;
    }
  } catch (error) {
    outcome.status = 'failed';
    outcome.error = error?.message || String(error);
  }
  outcome.executedAt = new Date().toISOString();

  return updateStore((drafts) => {
    const draft = drafts.find((d) => d.id === id);
    const finished = { ...claimed, ...outcome };
    if (outcome.status === 'executed') delete finished.error;
    else if (outcome.result === undefined) delete finished.result;
    // Discarded while it ran: report the outcome without resurrecting it.
    if (!draft) return finished;
    for (const key of Object.keys(draft)) delete draft[key];
    Object.assign(draft, finished);
    return { ...draft };
  });
}

/**
 * Remove every draft that is not pending. Returns how many were dropped.
 * @returns {number}
 */
export function pruneDrafts() {
  return updateStore((drafts) => {
    const before = drafts.length;
    // A running draft is still in flight; dropping it would lose its outcome.
    const keep = drafts.filter((d) => d.status === 'pending' || d.status === 'running');
    drafts.splice(0, drafts.length, ...keep);
    return before - keep.length;
  });
}

export default {
  DRAFTS_FILENAME,
  getXactionsHome,
  getDraftsPath,
  createDraft,
  listDrafts,
  getDraft,
  discardDraft,
  approveDraft,
  pruneDrafts,
};
