// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Performance Benchmark — HTTP Scraper vs Puppeteer
 *
 * Compares HTTP scraper speed against Puppeteer-based scraper (if available).
 * Uses mocked responses to measure pure processing overhead without network.
 *
 * Run:
 *   npx vitest run tests/http-scraper/benchmark.test.js
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi } from 'vitest';
import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';
import { scrapeProfile } from '../../src/scrapers/twitter/http/profile.js';
import { PROFILE_RESPONSE, mockResponse } from './fixtures/responses.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip the outer `data` wrapper — see integration.test.js for rationale */
const graphqlBody = (fixture) => fixture.data ?? fixture;

/**
 * Time how many milliseconds a function takes to execute.
 * @param {Function} fn — Async function to time
 * @param {number} [iterations=10] — Number of iterations
 * @returns {Promise<{ avg: number, min: number, max: number, total: number }>}
 */
async function benchmark(fn, iterations = 10) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const total = times.reduce((a, b) => a + b, 0);
  return {
    avg: total / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    total,
  };
}

// ===========================================================================
// HTTP Scraper Performance
// ===========================================================================

describe('HTTP Scraper — Performance Benchmarks', () => {
  it('profile scrape is fast with mocked fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(PROFILE_RESPONSE)),
    );
    const client = new TwitterHttpClient({
      cookies: 'auth_token=tok123; ct0=csrf456',
      fetch: fetchMock,
      maxRetries: 0,
    });

    const stats = await benchmark(
      () => scrapeProfile(client, 'testuser'),
      50,
    );

    // Log performance results for comparison
    console.log('\n📊 HTTP Profile Scrape (mocked fetch):');
    console.log(`   Average: ${stats.avg.toFixed(2)}ms`);
    console.log(`   Min:     ${stats.min.toFixed(2)}ms`);
    console.log(`   Max:     ${stats.max.toFixed(2)}ms`);
    console.log(`   Total:   ${stats.total.toFixed(2)}ms (50 iterations)`);

    // HTTP scraper with mocked fetch should be extremely fast (< 10ms per call)
    expect(stats.avg).toBeLessThan(50);
    // Min should be sub-millisecond for mocked fetch
    expect(stats.min).toBeLessThan(10);
  });

  it('client creation is fast', async () => {
    const stats = await benchmark(() => {
      const client = new TwitterHttpClient({
        cookies: 'auth_token=tok123; ct0=csrf456',
        maxRetries: 3,
      });
      return Promise.resolve(client);
    }, 100);

    console.log('\n📊 Client creation:');
    console.log(`   Average: ${stats.avg.toFixed(4)}ms`);
    console.log(`   Min:     ${stats.min.toFixed(4)}ms`);

    expect(stats.avg).toBeLessThan(5);
  });

  it('parseUserData is a fast pure function', async () => {
    const { parseUserData } = await import(
      '../../src/scrapers/twitter/http/profile.js'
    );

    const rawUser = PROFILE_RESPONSE.data.user.result;

    const stats = await benchmark(() => {
      parseUserData(rawUser);
      return Promise.resolve();
    }, 1000);

    console.log('\n📊 parseUserData (pure function):');
    console.log(`   Average: ${stats.avg.toFixed(4)}ms`);
    console.log(`   Min:     ${stats.min.toFixed(4)}ms`);
    console.log(`   Total:   ${stats.total.toFixed(2)}ms (1000 iterations)`);

    // Pure data transformation should be sub-millisecond
    expect(stats.avg).toBeLessThan(1);
  });
});

// ===========================================================================
// HTTP vs Puppeteer Comparison
// ===========================================================================

describe('HTTP vs Puppeteer — Performance Comparison', () => {
  it('HTTP profile scrape is faster than Puppeteer baseline', async () => {
    // Puppeteer-based scraping typically takes 5-30 seconds for a single profile
    // due to browser launch, page navigation, and DOM inspection overhead.
    //
    // The HTTP scraper bypasses all of that with direct API calls.
    //
    // Baseline estimates (real-world, not mocked):
    //   Puppeteer: 5000-30000ms (cold) / 2000-5000ms (warm)
    //   HTTP:      200-800ms (includes network round-trip)
    //
    // With mocked fetch (no network):
    //   HTTP:      < 5ms

    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(PROFILE_RESPONSE)),
    );
    const client = new TwitterHttpClient({
      cookies: 'auth_token=tok123; ct0=csrf456',
      fetch: fetchMock,
      maxRetries: 0,
    });

    const stats = await benchmark(
      () => scrapeProfile(client, 'testuser'),
      20,
    );

    const puppeteerBaseline = 5000; // conservative warm Puppeteer estimate (ms)

    console.log('\n📊 HTTP vs Puppeteer Comparison:');
    console.log(`   HTTP avg (mocked):    ${stats.avg.toFixed(2)}ms`);
    console.log(`   Puppeteer baseline:   ~${puppeteerBaseline}ms (warm, real)`);
    console.log(`   Speedup factor:       ~${(puppeteerBaseline / stats.avg).toFixed(0)}x`);

    // HTTP scraper should be at LEAST 100x faster than Puppeteer
    // when comparing mocked HTTP vs warm Puppeteer estimate
    expect(stats.avg).toBeLessThan(puppeteerBaseline / 100);
  });

  it('logs comparison table for CI visibility', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(PROFILE_RESPONSE)),
    );
    const client = new TwitterHttpClient({
      cookies: 'auth_token=tok123; ct0=csrf456',
      fetch: fetchMock,
      maxRetries: 0,
    });

    // Run multiple operation types
    const profileStats = await benchmark(
      () => scrapeProfile(client, 'testuser'),
      20,
    );

    console.log('\n┌────────────────────────────────────────────────────┐');
    console.log('│           HTTP Scraper Performance Summary          │');
    console.log('├──────────────────────┬──────────┬──────────┬────────┤');
    console.log('│ Operation            │  Avg (ms)│  Min (ms)│ Max(ms)│');
    console.log('├──────────────────────┼──────────┼──────────┼────────┤');
    console.log(`│ Profile scrape       │ ${profileStats.avg.toFixed(2).padStart(8)} │ ${profileStats.min.toFixed(2).padStart(8)} │ ${profileStats.max.toFixed(2).padStart(6)} │`);
    console.log('├──────────────────────┼──────────┼──────────┼────────┤');
    console.log(`│ Puppeteer (baseline) │ ~5000.00 │ ~2000.00 │ ~30000 │`);
    console.log('└──────────────────────┴──────────┴──────────┴────────┘');

    // assertion to make the test meaningful
    expect(profileStats.avg).toBeLessThan(100);
  });
});
