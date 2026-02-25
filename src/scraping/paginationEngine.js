/**
 * XActions Robust Pagination & Retry Engine
 * Smart pagination, retries, deduplication, and dataset storage for scrapers.
 *
 * Kills: Apify (robust pagination, retries, dataset storage)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

const DATA_DIR = path.join(os.homedir(), '.xactions');
const DATASETS_DIR = path.join(DATA_DIR, 'datasets');
const CHECKPOINTS_DIR = path.join(DATA_DIR, 'scrape-checkpoints');

// ============================================================================
// PaginationEngine
// ============================================================================

export class PaginationEngine {
  constructor(options = {}) {
    this.maxPages = options.maxPages || Infinity;
    this.maxItems = options.maxItems || Infinity;
    this.pageTimeout = options.pageTimeout || 30000;
    this.scrollDelay = options.scrollDelay || 1500;
    this.retries = options.retries || 3;
    this.deduplicateBy = options.deduplicateBy || null;
    this.onProgress = options.onProgress || null;
    this.items = [];
    this.seen = new Set();
    this.stats = { total: 0, duplicatesRemoved: 0, pagesScrolled: 0, errorsRecovered: 0, duration: 0 };
  }

  /**
   * Core pagination method — scrolls page and extracts items
   */
  async scrapeWithPagination(page, extractFn, options = {}) {
    const startTime = Date.now();
    const { checkpoint } = options;

    // Resume from checkpoint
    if (checkpoint) {
      try {
        const cpData = JSON.parse(await fsp.readFile(checkpoint, 'utf-8'));
        this.seen = new Set(cpData.seenKeys || []);
        this.stats.pagesScrolled = cpData.pagesScrolled || 0;
        console.log(`🔄 Resuming from checkpoint: ${this.seen.size} items already seen`);
      } catch { /* fresh start */ }
    }

    let consecutiveEmpty = 0;

    while (this.stats.pagesScrolled < this.maxPages && this.items.length < this.maxItems) {
      try {
        // Scroll down
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this._sleep(this.scrollDelay);

        // Extract items
        const newItems = await extractFn(page);
        let addedCount = 0;

        for (const item of newItems) {
          const key = this.deduplicateBy
            ? (typeof this.deduplicateBy === 'function' ? this.deduplicateBy(item) : item[this.deduplicateBy])
            : JSON.stringify(item);

          if (this.seen.has(key)) {
            this.stats.duplicatesRemoved++;
            continue;
          }

          this.seen.add(key);
          this.items.push(item);
          addedCount++;

          if (this.items.length >= this.maxItems) break;
        }

        this.stats.pagesScrolled++;
        this.stats.total = this.items.length;

        // Progress callback
        if (this.onProgress) {
          this.onProgress({ ...this.stats });
        }

        // Stuck detection
        if (addedCount === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 3) {
            console.log('📭 No new items after 3 scrolls — list exhausted');
            break;
          }
        } else {
          consecutiveEmpty = 0;
        }

        // Check for error pages
        const hasError = await page.evaluate(() => {
          const text = document.body?.innerText || '';
          return text.includes('Rate limit') || text.includes('Try again') || text.includes('Something went wrong');
        });

        if (hasError) {
          console.log('⚠️  Error page detected — pausing 60s...');
          this.stats.errorsRecovered++;
          await this._sleep(60000);
        }

      } catch (error) {
        console.error(`⚠️  Scroll error: ${error.message}`);
        this.stats.errorsRecovered++;
        await this._sleep(5000);
      }
    }

    this.stats.duration = Date.now() - startTime;

    return {
      items: this.items,
      stats: { ...this.stats },
    };
  }

  /**
   * Resume from a saved checkpoint
   */
  async resume(checkpointPath) {
    try {
      const data = JSON.parse(await fsp.readFile(checkpointPath, 'utf-8'));
      this.seen = new Set(data.seenKeys || []);
      this.stats.pagesScrolled = data.pagesScrolled || 0;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save checkpoint
   */
  async saveCheckpoint(id) {
    fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
    const cpPath = path.join(CHECKPOINTS_DIR, `${id}.json`);
    await fsp.writeFile(cpPath, JSON.stringify({
      seenKeys: [...this.seen],
      pagesScrolled: this.stats.pagesScrolled,
      itemCount: this.items.length,
      savedAt: new Date().toISOString(),
    }));
    return cpPath;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// RetryPolicy
// ============================================================================

export class RetryPolicy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 2000;
    this.maxDelay = options.maxDelay || 60000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryOn = options.retryOn || ['timeout', 'network-error', 'rate-limit', 'empty-result'];
  }

  /**
   * Execute an async function with retry logic
   */
  async execute(fn) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;

        if (attempt >= this.maxRetries) {
          break;
        }

        const errorType = this._classifyError(error);
        if (!this.retryOn.includes(errorType)) {
          throw error; // Don't retry this type
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          this.maxDelay,
          this.baseDelay * Math.pow(this.backoffMultiplier, attempt) + Math.random() * 500
        );

        console.log(`⚠️  Attempt ${attempt + 1}/${this.maxRetries + 1} failed (${errorType}). Retrying in ${Math.round(delay / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Circuit breaker — all retries exhausted
    const exhaustedError = new Error(`All ${this.maxRetries + 1} attempts failed. Last error: ${lastError?.message}`);
    exhaustedError.attempts = this.maxRetries + 1;
    exhaustedError.lastError = lastError;
    throw exhaustedError;
  }

  _classifyError(error) {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
    if (msg.includes('net::') || msg.includes('network') || msg.includes('econnrefused')) return 'network-error';
    if (msg.includes('rate limit') || msg.includes('429')) return 'rate-limit';
    if (msg.includes('empty') || msg.includes('no results')) return 'empty-result';
    return 'unknown';
  }
}

// ============================================================================
// DatasetStore (Apify-style)
// ============================================================================

export class DatasetStore {
  constructor(name) {
    this.name = name;
    this.dir = path.join(DATASETS_DIR, name);
    this.dataFile = path.join(this.dir, 'data.jsonl');
    this.metaFile = path.join(this.dir, 'meta.json');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  /**
   * Create a new named dataset
   */
  static create(name) {
    return new DatasetStore(name);
  }

  /**
   * Append items to the dataset (JSONL format)
   */
  async pushData(items) {
    const arr = Array.isArray(items) ? items : [items];
    const lines = arr.map(item => JSON.stringify(item)).join('\n') + '\n';
    await fsp.appendFile(this.dataFile, lines);

    // Update metadata
    const meta = await this._getMeta();
    meta.itemCount = (meta.itemCount || 0) + arr.length;
    meta.modifiedAt = new Date().toISOString();
    await this._saveMeta(meta);

    return { added: arr.length, total: meta.itemCount };
  }

  /**
   * Read items with pagination
   */
  async getData({ offset = 0, limit = 100 } = {}) {
    try {
      const content = await fsp.readFile(this.dataFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const items = lines.slice(offset, offset + limit).map(l => JSON.parse(l));
      return { items, total: lines.length, offset, limit };
    } catch {
      return { items: [], total: 0, offset, limit };
    }
  }

  /**
   * Get dataset info
   */
  async getInfo() {
    const meta = await this._getMeta();
    let size = 0;
    try {
      const stat = await fsp.stat(this.dataFile);
      size = stat.size;
    } catch { /* file may not exist yet */ }

    return {
      name: this.name,
      itemCount: meta.itemCount || 0,
      size: `${(size / 1024).toFixed(1)}KB`,
      createdAt: meta.createdAt,
      modifiedAt: meta.modifiedAt,
    };
  }

  /**
   * Export dataset to JSON, CSV, or JSONL
   */
  async export(format = 'json') {
    const { items } = await this.getData({ limit: Infinity });

    if (format === 'jsonl') {
      return items.map(i => JSON.stringify(i)).join('\n');
    }

    if (format === 'csv') {
      if (items.length === 0) return '';
      const allKeys = new Set();
      items.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
      const headers = [...allKeys];
      const lines = [headers.join(',')];
      for (const item of items) {
        lines.push(headers.map(h => {
          const val = item[h];
          if (val === undefined || val === null) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','));
      }
      return lines.join('\n');
    }

    return JSON.stringify(items, null, 2);
  }

  /**
   * Delete the dataset
   */
  async delete() {
    await fsp.rm(this.dir, { recursive: true, force: true });
    return { status: 'deleted', name: this.name };
  }

  // ── Internal ──

  async _getMeta() {
    try { return JSON.parse(await fsp.readFile(this.metaFile, 'utf-8')); } catch { return { createdAt: new Date().toISOString() }; }
  }

  async _saveMeta(meta) {
    await fsp.writeFile(this.metaFile, JSON.stringify(meta, null, 2));
  }
}

/**
 * List all datasets
 */
export async function listDatasets() {
  fs.mkdirSync(DATASETS_DIR, { recursive: true });
  const dirs = await fsp.readdir(DATASETS_DIR);
  const datasets = [];
  for (const dir of dirs) {
    const ds = new DatasetStore(dir);
    datasets.push(await ds.getInfo());
  }
  return datasets;
}

// by nichxbt
