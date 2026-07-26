#!/usr/bin/env node
/**
 * Fleet acceptance gates — READ-ONLY against X (no posting, following or liking).
 *
 * Every gate reports one of:
 *   PASS    — the thing was actually exercised and behaved
 *   FAIL    — the thing was exercised and misbehaved
 *   VACUOUS — the assertion held only because nothing was tested (counts as failure)
 *   SKIP    — preconditions absent (e.g. no proxy configured); NOT a pass
 *
 * Every report read is PROVENANCE-CHECKED by FILE IDENTITY: a gate may only consume
 * a report file that did not exist before it launched its own command. A pre-existing
 * report — however recent, however green, whatever startedAt it claims — is treated as
 * "no report", i.e. VACUOUS/FAIL, never as evidence.
 *
 * Usage: node gates.mjs
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const run = promisify(execFile);

const REPO = path.resolve(import.meta.dirname, '..', '..');
const CLI = `${REPO}/src/cli/index.js`;
const NODE = process.execPath; // whatever node is running this script
const STORE = path.join(os.homedir(), '.xactions', 'accounts.json');
const RUNS = path.join(os.homedir(), '.xactions', 'fleet-runs');

// Never re-parse the store here: the raw JSON parser message quotes cookie material,
// and an uncaught SyntaxError makes Node print the offending source line verbatim.
const { loadAccounts } = await import(`${REPO}/src/orchestrator/accountStore.js`);

const results = [];
const record = (id, name, status, detail) => {
  results.push({ id, name, status, detail });
  const icon = { PASS: '✅', FAIL: '❌', VACUOUS: '⚠️ ', SKIP: '⏭️ ' }[status];
  console.log(`${icon} ${id}  ${name}\n     ${detail}\n`);
};

const listReports = async () =>
  (await fs.readdir(RUNS).catch(() => [])).filter((f) => f.endsWith('.json'));

/**
 * Run the CLI, snapshotting the report directory first.
 *
 * Provenance is established by FILE IDENTITY, not by timestamp: a report that
 * already existed before the command ran can never be mistaken for its output,
 * no matter what `startedAt` it claims. (A timestamp floor is not enough — a
 * report bearing a future date sails straight over it.)
 */
const cli = async (args) => {
  const before = new Set(await listReports());
  try {
    const { stdout, stderr } = await run(NODE, [CLI, ...args], { maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, out: stdout + stderr, before };
  } catch (error) {
    return { code: error.code ?? 1, out: (error.stdout ?? '') + (error.stderr ?? ''), before };
  }
};

/**
 * Return the report THIS invocation created, or null.
 * Only files that did not exist before the command are considered. Also rejects
 * a wrong task, an unparseable file, and a report the runner admitted it could
 * not persist.
 */
const freshReport = async (before, expectedTask) => {
  const created = (await listReports()).filter((f) => !before.has(f)).sort().reverse();
  for (const file of created) {
    let report;
    try {
      report = JSON.parse(await fs.readFile(path.join(RUNS, file), 'utf8'));
    } catch {
      continue; // truncated/corrupt — not evidence
    }
    if (expectedTask && report.taskName !== expectedTask) continue;
    if (report.reportWriteFailed) continue;
    return report;
  }
  return null;
};

const hashStore = async () => {
  const raw = await fs.readFile(STORE, 'utf8');
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(raw).digest('hex');
};

/** A payload counts as real only if it actually contains something. */
const nonEmpty = (d) => {
  if (d == null) return false;
  if (Array.isArray(d)) return d.length > 0;
  if (typeof d === 'object') return Object.keys(d).length > 0;
  return true;
};

console.log('\n=== FLEET ACCEPTANCE GATES (read-only) ===\n');

const backup = `${STORE}.bak-${Date.now()}`;
await fs.copyFile(STORE, backup);
await fs.chmod(backup, 0o600);
console.log(`🔄 Store backed up → ${backup}\n`);

const store = await loadAccounts();
const proxiedHandles = new Set(
  store.filter((a) => a && a.proxyUrl).map((a) => String(a.handle).replace(/^@/, '').toLowerCase())
);

// --- SC-005: module surface -------------------------------------------------
{
  const r = await run(NODE, [
    '-e',
    `import('${REPO}/src/orchestrator/index.js').then(m=>{const need=['runTask','runFleet','TASKS','loadAccounts','makeProxiedFetch'];const have=Object.keys(m);console.log(need.every(k=>have.includes(k))?'OK':'MISSING')})`,
  ]).catch((e) => ({ stdout: String(e.message) }));
  const out = (r.stdout ?? '').trim();
  record('SC-005', 'Barrel exports the 5 contract symbols', out === 'OK' ? 'PASS' : 'FAIL', out || '(no output)');
}

// --- GATE-6: dry-run purity -------------------------------------------------
{
  const before = await hashStore();
  const reportsBefore = (await fs.readdir(RUNS).catch(() => [])).length;
  const { code, out } = await cli(['fleet', 'run', '--task', 'homeTimeline', '--dry-run']);
  const after = await hashStore();
  const reportsAfter = (await fs.readdir(RUNS).catch(() => [])).length;
  const clean = before === after && reportsBefore === reportsAfter && code === 0;
  record('GATE-6', 'Dry run mutates nothing and exits 0', clean ? 'PASS' : 'FAIL',
    `store unchanged: ${before === after} | new reports: ${reportsAfter - reportsBefore} | exit ${code}` +
      (clean ? '' : `\n     ${out.slice(0, 300)}`));
}

// --- SC-001: health bucketing over REAL accounts ----------------------------
let healthReport = null;
let sc001 = 'FAIL';
{
  const t = Date.now();
  const { code, out, before } = await cli(['fleet', 'health']);
  const elapsed = Date.now() - t;
  healthReport = await freshReport(before, 'health');

  if (!healthReport) {
    sc001 = 'FAIL';
    record('SC-001', 'Health bucketing over real accounts', 'FAIL',
      `This run wrote no usable report (exit ${code}). Nothing downstream may rely on it.\n     ${out.slice(-400)}`);
  } else if (code !== 0) {
    sc001 = 'FAIL';
    record('SC-001', 'Health bucketing over real accounts', 'FAIL', `exit ${code}\n     ${out.slice(-400)}`);
  } else if ((healthReport.totals?.alive ?? 0) === 0) {
    sc001 = 'VACUOUS';
    record('SC-001', 'Health bucketing over real accounts', 'VACUOUS',
      `0 accounts came back alive — nothing was actually verified.\n     ` +
        out.split('\n').filter((l) => l.includes('→') || l.includes('parked')).join('\n     '));
  } else {
    sc001 = 'PASS';
    record('SC-001', 'Health bucketing over real accounts', 'PASS',
      `alive ${healthReport.totals.alive} / parked ${healthReport.totals.dead} | exit 0 | ${elapsed}ms (no dispatcher hang)`);
  }
}

// --- SC-003: proxy egress, with a DENOMINATOR -------------------------------
{
  if (proxiedHandles.size === 0) {
    record('SC-003', 'Proxy egress differs from baseline', 'SKIP',
      'No account declares a proxyUrl — the egress gate cannot be exercised. This is NOT a pass.');
  } else if (sc001 !== 'PASS' || !healthReport) {
    record('SC-003', 'Proxy egress differs from baseline', 'VACUOUS',
      'SC-001 did not produce a usable health run, so there is no egress evidence from this invocation.');
  } else {
    const baseline = healthReport.baselineIp ?? null;
    // Denominator: every alive account that owns a proxy MUST have a measured egress IP.
    const aliveProxied = (healthReport.results ?? []).filter(
      (r) => r.ok && !r.skipped && proxiedHandles.has(String(r.handle).toLowerCase())
    );
    const measured = aliveProxied.filter((r) => r.egressIp);
    const unmeasured = aliveProxied.filter((r) => !r.egressIp).map((r) => `@${r.handle}`);
    const leaked = measured.filter((r) => r.egressIp === baseline).map((r) => `@${r.handle}`);
    const distinct = new Set(measured.map((r) => r.egressIp));

    if (!baseline) {
      record('SC-003', 'Proxy egress differs from baseline', 'FAIL', 'No baseline IP recorded — nothing to compare against.');
    } else if (aliveProxied.length === 0) {
      record('SC-003', 'Proxy egress differs from baseline', 'VACUOUS',
        `Baseline ${baseline}, but no proxied account came back alive — no proxy carried a byte.`);
    } else if (leaked.length > 0) {
      record('SC-003', 'Proxy egress differs from baseline', 'FAIL',
        `${leaked.join(', ')} egressed the BASELINE IP ${baseline} — co-location leak.`);
    } else if (unmeasured.length > 0) {
      record('SC-003', 'Proxy egress differs from baseline', 'VACUOUS',
        `${measured.length}/${aliveProxied.length} proxied accounts measured. UNVERIFIED egress: ${unmeasured.join(', ')} — ` +
          `their self-test was inconclusive, so a transparent proxy could not be ruled out. Not a pass.`);
    } else if (distinct.size < measured.length) {
      record('SC-003', 'Proxy egress differs from baseline', 'FAIL',
        `${measured.length} accounts share only ${distinct.size} egress IP(s) — accounts are double-booked on one IP.`);
    } else {
      record('SC-003', 'Proxy egress differs from baseline', 'PASS',
        `baseline ${baseline} | ${measured.length}/${aliveProxied.length} proxied accounts measured | ` +
          `${distinct.size} distinct egress IP(s), none equal to baseline, none shared`);
    }
  }
}

// --- SC-002 + SC-004: the read task actually runs ---------------------------
{
  const t = Date.now();
  const { code, out, before } = await cli(['fleet', 'run', '--task', 'homeTimeline', '--params', '{"limit":5}']);
  const elapsed = Date.now() - t;
  const report = await freshReport(before, 'homeTimeline');
  const tot = report?.totals;

  if (!report) {
    record('SC-002', 'Read task across the fleet', 'FAIL', `This run wrote no usable report | exit ${code}\n     ${out.slice(-300)}`);
  } else if (tot.alive === 0) {
    record('SC-002', 'Read task across the fleet', 'VACUOUS',
      `ok=${tot.ok} equals alive=${tot.alive}, but only because NOTHING RAN. Not a pass.`);
  } else if (tot.ok === tot.alive && tot.fail === 0) {
    const rows = (report.results ?? []).filter((r) => r.ok && !r.skipped);
    const real = rows.filter((r) => nonEmpty(r.data));
    const empty = rows.filter((r) => !nonEmpty(r.data)).map((r) => `@${r.handle}`);
    if (real.length === rows.length && real.length > 0) {
      record('SC-002', 'Read task across the fleet', 'PASS',
        `alive ${tot.alive} | ok ${tot.ok} | fail ${tot.fail} | all ${real.length} account(s) returned non-empty payloads`);
    } else {
      record('SC-002', 'Read task across the fleet', 'VACUOUS',
        `ok===alive but ${empty.length} account(s) returned an EMPTY payload: ${empty.join(', ')}. ` +
          `Either those timelines are genuinely empty or the response shape changed and the parser silently yielded []. Not a pass.`);
    }
  } else {
    const why = (report.results ?? []).filter((r) => !r.ok && !r.skipped).map((r) => `${r.handle}: ${r.reason} — ${r.error}`);
    record('SC-002', 'Read task across the fleet', 'FAIL',
      `alive ${tot.alive} | ok ${tot.ok} | fail ${tot.fail}\n     ${why.join('\n     ')}`);
  }

  const cap = Number.parseInt(process.env.XACTIONS_FLEET_CONCURRENCY ?? '5', 10) || 5;
  if (!report) {
    record('SC-004', 'Concurrency capped, process exits cleanly', 'FAIL', 'no usable report from this run');
  } else {
    const okConc = report.concurrency <= cap;
    record('SC-004', 'Concurrency capped, process exits cleanly', okConc && code === 0 ? 'PASS' : 'FAIL',
      `concurrency ${report.concurrency} <= cap ${cap}: ${okConc} | exit ${code} | wall ${elapsed}ms`);
  }
}

// --- Summary ----------------------------------------------------------------
console.log('='.repeat(74));
const counts = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
console.log(`PASS ${counts.PASS ?? 0}  ·  FAIL ${counts.FAIL ?? 0}  ·  VACUOUS ${counts.VACUOUS ?? 0}  ·  SKIP ${counts.SKIP ?? 0}`);
console.log('='.repeat(74));
for (const r of results) console.log(`${r.status.padEnd(8)} ${r.id}  ${r.name}`);
console.log('');
console.log(`Store backup: ${backup}`);
console.log('SC-006 (write path) is NOT part of this run — it is explicit and separate.\n');

process.exit((counts.FAIL ?? 0) + (counts.VACUOUS ?? 0) > 0 ? 1 : 0);
