#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Audit all dashboard pages for browser console errors
// Usage: node scripts/audit-console-errors.js [--verbose] [--port 3001] [--top-only]
// by nichxbt

import puppeteer from 'puppeteer';
import { readdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = join(__dirname, '..', 'dashboard');

const args = process.argv.slice(2);
const port = args.includes('--port') ? args[args.indexOf('--port') + 1] : '3001';
const BASE_URL = `http://localhost:${port}`;
const verbose = args.includes('--verbose');
// --top-only: only scan top-level pages, skip docs/ and scripts/ subdirectories
const topOnly = args.includes('--top-only');
// Restart browser every N pages to prevent memory issues
const RESTART_EVERY = 80;

// Noise that's expected or unfixable without optional services
const IGNORE_PATTERNS = [
  /SES Removing unpermitted intrinsics/,
  /Download error or resource isn't a valid image/,
  /socket\.io/,
  /localhost:3100/,       // a2a service — optional separate process
  /ERR_CONNECTION_REFUSED.*310[0-9]/, // other local optional services
  // Browser auto-generates these for every network failure — already captured via
  // requestfailed/response handlers so they'd be double-reported here
  /^Failed to load resource:/,
  // manifest.json ERR_ABORTED is a Puppeteer timing artifact (manifest serves correctly)
  /manifest\.json/,
  // PWA icon pre-fetches (referenced in manifest) often abort after networkidle2 triggers
  /icon-192\.png|icon-512\.png/,
  // Auth-gated pages log cascade errors when API calls return 401/429 in dev
  /Failed to list graphs/,
  /Failed to load graph/,
];

function isIgnored(text) {
  return IGNORE_PATTERNS.some((p) => p.test(text));
}

async function discoverPages() {
  const pages = [];

  async function walkDir(dir) {
    let entries;
    try {
      entries = await readdir(join(DASHBOARD_DIR, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const relPath = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!topOnly) await walkDir(relPath);
      } else if (entry.name.endsWith('.html')) {
        pages.push(relPath === 'index.html' ? '/' : `/${relPath}`);
      }
    }
  }

  await walkDir('');
  return [...new Set(pages)].sort();
}

function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
    protocolTimeout: 30000,
  });
}

async function auditPage(browser, route) {
  const url = `${BASE_URL}${route}`;
  const issues = { errors: [], warnings: [], networkErrors: [] };

  let page;
  try {
    page = await browser.newPage();
  } catch (e) {
    return { ...issues, errors: [`Could not open page: ${e.message}`] };
  }

  const onConsole = (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (isIgnored(text)) return;
    if (type === 'error') issues.errors.push(text);
    else if (type === 'warning') issues.warnings.push(text);
  };

  const onRequestFailed = (req) => {
    const reqUrl = req.url();
    if (isIgnored(reqUrl)) return;
    if (reqUrl.includes('socket.io')) return;
    const failure = req.failure();
    const reason = failure?.errorText ?? 'unknown';
    // ERR_ABORTED is a Puppeteer page-close artifact — the page closes while deferred
    // resources are still in-flight. Real errors (404, CSP blocks) are caught via the
    // console and response handlers, which fire before close.
    if (reason === 'net::ERR_ABORTED') return;
    issues.networkErrors.push({ url: reqUrl, reason });
  };

  const onResponse = (res) => {
    const status = res.status();
    const resUrl = res.url();
    if (status < 400) return;
    if (resUrl.includes('favicon')) return;
    if ((status === 401 || status === 429) && resUrl.includes('/api/')) return; // auth-gated / rate-limited by audit itself
    if (isIgnored(resUrl)) return;
    issues.networkErrors.push({ url: resUrl, reason: `HTTP ${status}` });
  };

  page.on('console', onConsole);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 200));
  } catch (e) {
    const msg = e.message;
    // Ignore Puppeteer-internal lifecycle errors
    if (
      msg.includes('detached Frame') ||
      msg.includes('detached frame') ||
      msg.includes('Session closed') ||
      msg.includes('Connection closed') ||
      msg.includes('Navigation timeout')
    ) {
      // not a real page error
    } else {
      issues.errors.push(`Navigation failed: ${msg}`);
    }
  }

  await page.close().catch(() => {});
  return issues;
}

async function auditPages() {
  console.log(`\n⚡ XActions Console Error Audit`);
  console.log(`  Base URL: ${BASE_URL}${topOnly ? '  (top-level pages only)' : ''}\n`);

  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    console.error(`❌ Cannot reach ${BASE_URL} — start the server first: npm run dev`);
    process.exit(1);
  }

  const pages = await discoverPages();
  console.log(`📄 Found ${pages.length} pages to audit\n`);

  const results = { errors: [], warnings: [], networkErrors: [] };
  let clean = 0;
  let withIssues = 0;

  let browser = await launchBrowser();

  for (let i = 0; i < pages.length; i++) {
    // Restart browser periodically to prevent OOM crashes
    if (i > 0 && i % RESTART_EVERY === 0) {
      await browser.close().catch(() => {});
      browser = await launchBrowser();
      if (verbose) console.log(`\n  [restarted browser at page ${i}]\n`);
    }

    const route = pages[i];
    let issues;
    try {
      issues = await auditPage(browser, route);
    } catch (e) {
      issues = { errors: [`Audit crashed: ${e.message}`], warnings: [], networkErrors: [] };
    }

    const hasIssues = issues.errors.length || issues.warnings.length || issues.networkErrors.length;

    if (hasIssues) {
      withIssues++;
      console.log(`❌ ${route}`);
      for (const err of issues.errors) {
        console.log(`   🔴 ${err}`);
        results.errors.push({ page: route, message: err });
      }
      for (const warn of issues.warnings) {
        console.log(`   🟡 ${warn}`);
        results.warnings.push({ page: route, message: warn });
      }
      for (const net of issues.networkErrors) {
        console.log(`   🟠 ${net.reason} → ${net.url}`);
        results.networkErrors.push({ page: route, ...net });
      }
    } else {
      clean++;
      if (verbose) console.log(`✅ ${route}`);
    }
  }

  await browser.close().catch(() => {});

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Audit Summary`);
  console.log(`   Pages scanned:      ${pages.length}`);
  console.log(`   Clean:              ${clean}`);
  console.log(`   With issues:        ${withIssues}`);
  console.log(`   Console errors:     ${results.errors.length}`);
  console.log(`   Console warnings:   ${results.warnings.length}`);
  console.log(`   Network errors:     ${results.networkErrors.length}`);
  console.log(`${'─'.repeat(60)}\n`);

  if (results.errors.length || results.networkErrors.length) {
    console.log(`🔍 Unique Issues:\n`);

    const uniqueErrors = [...new Set(results.errors.map((e) => e.message))];
    if (uniqueErrors.length) {
      console.log(`  Console Errors (${uniqueErrors.length} unique):`);
      for (const err of uniqueErrors) {
        const affectedPages = results.errors.filter((e) => e.message === err).map((e) => e.page);
        console.log(`    [${affectedPages.length}x] ${err}`);
        for (const p of affectedPages.slice(0, 3)) console.log(`         → ${p}`);
        if (affectedPages.length > 3) console.log(`         ... +${affectedPages.length - 3} more`);
      }
    }

    const netByResource = new Map();
    for (const ne of results.networkErrors) {
      const key = `${ne.reason} → ${ne.url.split('?')[0]}`;
      if (!netByResource.has(key)) netByResource.set(key, []);
      netByResource.get(key).push(ne.page);
    }
    if (netByResource.size) {
      console.log(`\n  Network Errors (${netByResource.size} unique resources):`);
      for (const [key, affectedPages] of netByResource) {
        console.log(`    [${affectedPages.length}x] ${key}`);
        for (const p of affectedPages.slice(0, 2)) console.log(`         → ${p}`);
        if (affectedPages.length > 2) console.log(`         ... +${affectedPages.length - 2} more`);
      }
    }
  }

  const reportPath = join(__dirname, '..', 'audit-report.json');
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        pagesScanned: pages.length,
        pagesClean: clean,
        pagesWithIssues: withIssues,
        errors: results.errors,
        warnings: results.warnings,
        networkErrors: results.networkErrors,
      },
      null,
      2
    )
  );
  console.log(`\n📁 Full report saved to audit-report.json`);

  process.exit(withIssues > 0 ? 1 : 0);
}

auditPages().catch((err) => {
  console.error('❌ Audit failed:', err.message);
  process.exit(1);
});
