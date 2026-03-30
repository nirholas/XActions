#!/usr/bin/env node
// Audit all dashboard pages for browser console errors
// Usage: node scripts/audit-console-errors.js [--verbose] [--port 3001]
// by nichxbt

import puppeteer from 'puppeteer';
import { readdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = join(__dirname, '..', 'dashboard');

// Parse args
const args = process.argv.slice(2);
const port = args.includes('--port') ? args[args.indexOf('--port') + 1] : '3001';
const BASE_URL = `http://localhost:${port}`;
const verbose = args.includes('--verbose');

async function discoverPages() {
  const pages = [];

  async function walkDir(dir) {
    const entries = await readdir(join(DASHBOARD_DIR, dir), { withFileTypes: true });
    for (const entry of entries) {
      const relPath = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walkDir(relPath);
      } else if (entry.name.endsWith('.html')) {
        const route = relPath === 'index.html' ? '/' : `/${relPath}`;
        pages.push(route);
      }
    }
  }

  await walkDir('');
  return [...new Set(pages)].sort();
}

async function auditPages() {
  console.log(`\n⚡ XActions Console Error Audit`);
  console.log(`  Base URL: ${BASE_URL}\n`);

  // Check if server is running
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    console.error(`❌ Cannot reach ${BASE_URL} — start the server first: npm run dev`);
    process.exit(1);
  }

  const pages = await discoverPages();
  console.log(`📄 Found ${pages.length} pages to audit\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 30000,
  });

  const results = { errors: [], warnings: [], networkErrors: [] };
  let pagesWithIssues = 0;
  let pagesClean = 0;
  let pagesSkipped = 0;

  // Reuse a single page to avoid memory/connection pressure
  const page = await browser.newPage();

  for (const route of pages) {
    const url = `${BASE_URL}${route}`;
    const pageIssues = { errors: [], warnings: [], networkErrors: [] };

    // Set up listeners fresh each navigation
    const onConsole = (msg) => {
      const type = msg.type();
      const text = msg.text();

      // Skip noisy but harmless messages
      if (text.includes('SES Removing unpermitted intrinsics')) return;
      if (text.includes('Download error or resource')) return;
      if (text.includes('the server responded with a status of')) return; // captured via response listener

      if (type === 'error') {
        pageIssues.errors.push(text);
      } else if (type === 'warning') {
        pageIssues.warnings.push(text);
      }
    };

    const onRequestFailed = (req) => {
      const failure = req.failure();
      pageIssues.networkErrors.push({
        url: req.url(),
        reason: failure ? failure.errorText : 'unknown',
      });
    };

    const onResponse = (res) => {
      const status = res.status();
      const resUrl = res.url();
      if (status >= 400 && !resUrl.includes('favicon')) {
        pageIssues.networkErrors.push({ url: resUrl, reason: `HTTP ${status}` });
      }
    };

    page.on('console', onConsole);
    page.on('requestfailed', onRequestFailed);
    page.on('response', onResponse);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      // Only report if it's not a simple timeout on networkidle
      if (!e.message.includes('Navigation timeout')) {
        pageIssues.errors.push(`Navigation failed: ${e.message}`);
      } else {
        // Page loaded but had lingering requests — still check for errors
      }
    }

    // Remove listeners before next page
    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);

    const hasIssues =
      pageIssues.errors.length || pageIssues.warnings.length || pageIssues.networkErrors.length;

    if (hasIssues) {
      pagesWithIssues++;
      console.log(`❌ ${route}`);
      for (const err of pageIssues.errors) {
        console.log(`   🔴 ERROR: ${err}`);
        results.errors.push({ page: route, message: err });
      }
      for (const warn of pageIssues.warnings) {
        console.log(`   🟡 WARN:  ${warn}`);
        results.warnings.push({ page: route, message: warn });
      }
      for (const net of pageIssues.networkErrors) {
        console.log(`   🟠 NET:   ${net.reason} → ${net.url}`);
        results.networkErrors.push({ page: route, ...net });
      }
    } else {
      pagesClean++;
      if (verbose) console.log(`✅ ${route}`);
    }
  }

  await browser.close();

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Audit Summary`);
  console.log(`   Pages scanned:      ${pages.length}`);
  console.log(`   Clean:              ${pagesClean}`);
  console.log(`   With issues:        ${pagesWithIssues}`);
  console.log(`   Console errors:     ${results.errors.length}`);
  console.log(`   Console warnings:   ${results.warnings.length}`);
  console.log(`   Network errors:     ${results.networkErrors.length}`);
  console.log(`${'─'.repeat(60)}\n`);

  // Deduplicated error report
  if (results.errors.length || results.networkErrors.length) {
    console.log(`🔍 Unique Issues:\n`);

    const uniqueErrors = [...new Set(results.errors.map((e) => e.message))];
    if (uniqueErrors.length) {
      console.log(`  Console Errors (${uniqueErrors.length} unique):`);
      for (const err of uniqueErrors) {
        const affectedPages = results.errors.filter((e) => e.message === err).map((e) => e.page);
        console.log(`    [${affectedPages.length}x] ${err}`);
        if (affectedPages.length <= 5) {
          for (const p of affectedPages) console.log(`         → ${p}`);
        } else {
          for (const p of affectedPages.slice(0, 3)) console.log(`         → ${p}`);
          console.log(`         ... and ${affectedPages.length - 3} more`);
        }
      }
    }

    // Group network errors by the resource URL (strip query strings for dedup)
    const netByResource = new Map();
    for (const ne of results.networkErrors) {
      const resourceUrl = ne.url.split('?')[0];
      const key = `${ne.reason} → ${resourceUrl}`;
      if (!netByResource.has(key)) netByResource.set(key, []);
      netByResource.get(key).push(ne.page);
    }
    if (netByResource.size) {
      console.log(`\n  Network Errors (${netByResource.size} unique resources):`);
      for (const [key, affectedPages] of netByResource) {
        console.log(`    [${affectedPages.length}x] ${key}`);
        if (affectedPages.length <= 3) {
          for (const p of affectedPages) console.log(`         → ${p}`);
        } else {
          console.log(`         → ${affectedPages[0]}, ${affectedPages[1]}, ... +${affectedPages.length - 2} more`);
        }
      }
    }
  }

  // Write JSON report
  const reportPath = join(__dirname, '..', 'audit-report.json');
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        pagesScanned: pages.length,
        pagesClean,
        pagesWithIssues,
        errors: results.errors,
        warnings: results.warnings,
        networkErrors: results.networkErrors,
      },
      null,
      2
    )
  );
  console.log(`\n📁 Full report saved to audit-report.json`);

  process.exit(pagesWithIssues > 0 ? 1 : 0);
}

auditPages().catch((err) => {
  console.error('❌ Audit failed:', err.message);
  process.exit(1);
});
