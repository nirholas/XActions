// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The paste-ready half of `xactions doctor`: `--report` renders the facts a
 * bug report needs as Markdown, and `--issue` turns that into a prefilled
 * new-issue link.
 *
 * Past issues about packaging, install and start-up were each settled by the
 * same handful of facts: the version, how it was installed, the Node version,
 * the platform. Asking for them costs a round trip; this puts them in the
 * first message. Everything goes through redact.js on the way out, and nothing
 * here sends anything anywhere: the link is printed, and opened only when the
 * user asks.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { collectSecrets, scrub } from './redact.js';

/** Issue form the link opens; its doctor report field has this id. */
export const BUG_FORM = 'bug_report.yml';
export const REPORT_FIELD = 'doctor-report';

/** GitHub refuses longer new-issue URLs, so the link stays under this. */
export const MAX_URL_LENGTH = 8000;

/**
 * @typedef {object} ReportCheck
 * @property {string} id
 * @property {string} group
 * @property {string} name
 * @property {'ok'|'warn'|'fail'} status
 * @property {string} detail
 * @property {string|null} fix
 * @property {Record<string, any>} [facts] - Structured values the summary reads
 * @property {string[]} [secrets] - Values this check learned that must be redacted
 */

/**
 * @typedef {object} ReportState
 * @property {string} version
 * @property {{label: string, root?: string}} install
 * @property {{version: string, engines: string}} node
 * @property {{platform: string, release: string, arch: string}} os
 * @property {Array<{name: string, present: boolean, version: string|null}>} optionalDeps
 * @property {Record<string, string|undefined>} env
 * @property {string} homedir
 * @property {string} username
 * @property {string} hostname
 * @property {string[]} sessionValues - Every saved cookie and config value
 * @property {ReportCheck[]} checks
 */

/**
 * Every string value in a parsed JSON document.
 * @param {unknown} node
 * @param {string[]} [out]
 * @returns {string[]}
 */
function stringsIn(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => stringsIn(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => stringsIn(n, out));
  return out;
}

/**
 * Every value in the saved cookie jar and config file, so the report can
 * remove them wherever an error message happened to quote one. Read-only; a
 * missing or unreadable file contributes nothing.
 * @param {string} home - The XActions home directory
 * @returns {Promise<string[]>}
 */
export async function readSessionSecrets(home) {
  const values = [];
  for (const file of ['cookies.json', 'config.json']) {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(home, file), 'utf-8'));
      if (file === 'cookies.json' && Array.isArray(parsed)) {
        for (const cookie of parsed) if (typeof cookie?.value === 'string') values.push(cookie.value);
      } else {
        values.push(...stringsIn(parsed));
      }
    } catch {
      // Absent or unreadable: nothing saved there to leak.
    }
  }
  return values;
}

/**
 * One Markdown table cell: no pipes, no line breaks.
 * @param {string} text
 * @returns {string}
 */
function cell(text) {
  return String(text ?? '').replace(/\|/g, '\\|').replace(/\s*\r?\n+\s*/g, ' ').trim();
}

/**
 * @param {ReportCheck[]} checks
 * @param {string} id
 * @returns {ReportCheck|undefined}
 */
function byId(checks, id) {
  return checks.find((c) => c.id === id);
}

/**
 * @param {ReportCheck[]} checks
 * @returns {string}
 */
function guestSummary(checks) {
  const parts = [
    { label: 'profile', check: byId(checks, 'guest-profile') },
    { label: 'timeline', check: byId(checks, 'guest-timeline') },
  ].filter((p) => p.check);
  if (parts.length === 0) return 'not run';
  if (parts.every((p) => p.check?.status === 'ok')) return 'ok';
  const worst = parts.some((p) => p.check?.status === 'fail') ? 'fail' : 'warn';
  return `${worst} (${parts.map((p) => `${p.label} ${p.check?.status}`).join(', ')})`;
}

/**
 * @param {ReportCheck[]} checks
 * @returns {string}
 */
function sessionSummary(checks) {
  const saved = byId(checks, 'session-saved')?.facts;
  if (!saved?.saved) return 'none saved';
  const parts = [saved.ct0 ? 'saved, carries ct0' : 'saved, no ct0'];
  if (saved.source) parts.push(`in ${saved.source}`);
  const live = byId(checks, 'session-valid');
  if (live) parts.push(`authenticates: ${live.status}`);
  return parts.join('; ');
}

/**
 * @param {ReportCheck[]} checks
 * @returns {string}
 */
function queryIdSummary(checks) {
  const facts = byId(checks, 'query-ids')?.facts;
  if (!facts) return 'unknown';
  if (!facts.cached) return 'none cached, pinned table in use';
  return `${facts.count} IDs, ${facts.age}${facts.stale ? ', stale' : ''}`;
}

/**
 * @param {ReportCheck[]} checks
 * @returns {string}
 */
function mcpSummary(checks) {
  const check = byId(checks, 'mcp');
  if (!check) return 'not run';
  return check.status === 'ok' && check.facts?.tools ? `ok, ${check.facts.tools} tools` : check.status;
}

/**
 * What to remove from this report, and the public facts to leave alone.
 * @param {ReportState} state
 * @returns {import('./redact.js').Secret[]}
 */
function secretsFor(state) {
  return collectSecrets({
    env: state.env,
    homedir: state.homedir,
    username: state.username,
    hostname: state.hostname,
    values: [...(state.sessionValues || []), ...state.checks.flatMap((c) => c.secrets || [])],
    keep: [
      'xactions',
      state.version,
      state.install.label,
      state.node.version,
      state.node.engines,
      state.os.platform,
      state.os.release,
      state.os.arch,
      ...state.optionalDeps.flatMap((d) => [d.name, d.version]),
    ],
  });
}

/**
 * The Markdown a user pastes into an issue, with everything private removed.
 * @param {ReportState} state
 * @returns {string}
 */
export function renderReport(state) {
  const { checks } = state;
  const present = state.optionalDeps.filter((d) => d.present);
  const missing = state.optionalDeps.filter((d) => !d.present);
  const counts = { ok: 0, warn: 0, fail: 0 };
  for (const check of checks) counts[check.status] += 1;

  const rows = [
    ['xactions', state.version],
    ['Install', state.install.label],
    ['Node', `${state.node.version} (package needs ${state.node.engines})`],
    ['OS', `${state.os.platform} ${state.os.release}, ${state.os.arch}`],
    ['Optional packages present', present.map((d) => `${d.name} ${d.version || ''}`.trim()).join(', ') || 'none'],
    ['Optional packages missing', missing.map((d) => d.name).join(', ') || 'none'],
    ['Guest tier', guestSummary(checks)],
    ['Session', sessionSummary(checks)],
    ['Query-ID cache', queryIdSummary(checks)],
    ['MCP self-test', mcpSummary(checks)],
    ['Skills installed', String(byId(checks, 'skills')?.facts?.total ?? 'unknown')],
    ['Checks', `${counts.ok} ok, ${counts.warn} warn, ${counts.fail} fail`],
  ];

  const lines = [
    '### xactions doctor report',
    '',
    '| | |',
    '|---|---|',
    ...rows.map(([k, v]) => `| ${cell(k)} | ${cell(v)} |`),
    '',
    '<details><summary>All checks</summary>',
    '',
    '| Check | Status | Detail |',
    '|---|---|---|',
    ...checks.map((c) => `| \`${c.id}\` | ${c.status} | ${cell(c.detail)} |`),
    '',
    '</details>',
    '',
    '<sub>From `xactions doctor --report`. Cookies, tokens, usernames, account ids, proxy URLs, home paths and environment values are removed.</sub>',
  ];

  return scrub(lines.join('\n'), secretsFor(state));
}

/**
 * Issue title: the first failing check, or a bare prefix to complete.
 * @param {ReportState} state
 * @returns {string}
 */
export function reportTitle(state) {
  const failed = state.checks.find((c) => c.status === 'fail');
  if (!failed) return '[bug] ';
  const detail = scrub(cell(failed.detail), secretsFor(state));
  const short = detail.length > 80 ? `${detail.slice(0, 77)}...` : detail;
  return `[bug] ${failed.id}: ${short}`;
}

/**
 * A new-issue link on the bug form with the title and the report filled in.
 * Issue forms ignore `body`, so the report goes in the form's own field.
 * When the whole report will not fit, the link carries the summary table, or
 * failing that a note asking for a paste, and the printed report is the copy
 * to use.
 * @param {{bugsUrl: string, title: string, report: string}} options
 * @returns {string}
 */
export function issueUrl({ bugsUrl, title, report }) {
  const base = `${bugsUrl.replace(/\/+$/, '')}/new`;
  const build = (body) => {
    const params = new URLSearchParams({ template: BUG_FORM, title, [REPORT_FIELD]: body });
    return `${base}?${params.toString()}`;
  };
  const note = 'The full report was too long for a link. Paste the report `xactions doctor --report` printed.';
  const candidates = [report];
  const cut = report.indexOf('<details>');
  if (cut > 0) candidates.push(`${report.slice(0, cut).trimEnd()}\n\n${note}`);
  candidates.push(note);
  for (const body of candidates) {
    const url = build(body);
    if (url.length <= MAX_URL_LENGTH) return url;
  }
  return build(note);
}
