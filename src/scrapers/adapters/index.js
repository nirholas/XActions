/**
 * XActions Scraper Adapter — Registry & Factory
 * 
 * Central registry for all scraper framework adapters.
 * Provides adapter discovery, selection, and auto-fallback.
 * 
 * Usage:
 *   import { getAdapter, setDefaultAdapter } from './adapters/index.js';
 *   
 *   // Use the default (puppeteer) adapter
 *   const adapter = await getAdapter();
 *   
 *   // Use a specific adapter
 *   const adapter = await getAdapter('playwright');
 *   
 *   // Set global default
 *   setDefaultAdapter('playwright');
 *   
 *   // Register a custom adapter
 *   registerAdapter('my-adapter', MyAdapterClass);
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

import { BaseAdapter } from './base.js';

// ============================================================================
// Adapter Registry
// ============================================================================

/** @type {Map<string, { AdapterClass: typeof BaseAdapter, instance: BaseAdapter | null }>} */
const registry = new Map();
let defaultAdapterName = process.env.XACTIONS_SCRAPER_ADAPTER || 'puppeteer';

/**
 * Register a built-in adapter (lazy — only instantiated when requested)
 */
function registerBuiltin(name, importFn) {
  registry.set(name, { importFn, AdapterClass: null, instance: null });
}

// Register built-in adapters
registerBuiltin('puppeteer', () => import('./puppeteer.js'));
registerBuiltin('playwright', () => import('./playwright.js'));
registerBuiltin('cheerio', () => import('./cheerio.js'));
registerBuiltin('crawlee', () => import('./crawlee.js'));
registerBuiltin('got-jsdom', () => import('./got-jsdom.js'));
registerBuiltin('selenium', () => import('./selenium.js'));

// Aliases
registerBuiltin('http', () => import('./cheerio.js'));
registerBuiltin('pw', () => import('./playwright.js'));
registerBuiltin('pptr', () => import('./puppeteer.js'));
registerBuiltin('got', () => import('./got-jsdom.js'));
registerBuiltin('jsdom', () => import('./got-jsdom.js'));
registerBuiltin('apify', () => import('./crawlee.js'));

// ============================================================================
// Public API
// ============================================================================

/**
 * Get an adapter instance by name. Lazy-loads and caches.
 * @param {string} [name] - Adapter name (defaults to global default)
 * @returns {Promise<BaseAdapter>} Adapter instance
 */
export async function getAdapter(name) {
  const adapterName = name || defaultAdapterName;
  const entry = registry.get(adapterName);

  if (!entry) {
    const available = listAdapters().join(', ');
    throw new Error(`Unknown scraper adapter "${adapterName}". Available: ${available}`);
  }

  // Lazy-load the adapter class
  if (!entry.instance) {
    if (entry.importFn) {
      const mod = await entry.importFn();
      const AdapterClass = mod.default || Object.values(mod).find(v => v?.prototype instanceof BaseAdapter);
      entry.AdapterClass = AdapterClass;
      entry.instance = new AdapterClass();
    } else if (entry.AdapterClass) {
      entry.instance = new entry.AdapterClass();
    }
  }

  return entry.instance;
}

/**
 * Get the best available adapter, with fallback chain.
 * Tries: specified → default → puppeteer → playwright → cheerio
 * @param {string} [preferred] - Preferred adapter name
 * @returns {Promise<BaseAdapter>} First available adapter
 */
export async function getAvailableAdapter(preferred) {
  const candidates = [preferred, defaultAdapterName, 'puppeteer', 'playwright', 'crawlee', 'got-jsdom', 'selenium', 'cheerio'].filter(Boolean);
  const tried = new Set();

  for (const name of candidates) {
    if (tried.has(name)) continue;
    tried.add(name);

    try {
      const adapter = await getAdapter(name);
      const check = await adapter.checkDependencies();
      if (check.available) {
        return adapter;
      }
    } catch (e) {
      // Skip unavailable adapters
    }
  }

  throw new Error(
    'No scraper adapter available. Install at least one:\n' +
    '  npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth\n' +
    '  npm install playwright\n' +
    '  npm install crawlee\n' +
    '  npm install got-scraping jsdom\n' +
    '  npm install selenium-webdriver chromedriver\n' +
    '  npm install cheerio'
  );
}

/**
 * Set the global default adapter
 * @param {string} name - Adapter name
 */
export function setDefaultAdapter(name) {
  if (!registry.has(name)) {
    throw new Error(`Unknown adapter "${name}". Available: ${listAdapters().join(', ')}`);
  }
  defaultAdapterName = name;
}

/**
 * Get the current default adapter name
 * @returns {string}
 */
export function getDefaultAdapterName() {
  return defaultAdapterName;
}

/**
 * Register a custom adapter
 * @param {string} name - Unique adapter name
 * @param {typeof BaseAdapter} AdapterClass - Adapter class extending BaseAdapter
 */
export function registerAdapter(name, AdapterClass) {
  if (!(AdapterClass.prototype instanceof BaseAdapter)) {
    throw new Error('Adapter must extend BaseAdapter');
  }
  registry.set(name, { AdapterClass, instance: null, importFn: null });
}

/**
 * List all registered adapter names (excluding aliases)
 * @returns {string[]}
 */
export function listAdapters() {
  return [...new Set([...registry.keys()])];
}

/**
 * Get info about all registered adapters
 * @returns {Promise<Object[]>}
 */
export async function getAdapterInfo() {
  const results = [];
  const seen = new Set();

  for (const [name] of registry) {
    try {
      const adapter = await getAdapter(name);
      // Deduplicate by adapter class name
      if (seen.has(adapter.name)) continue;
      seen.add(adapter.name);

      const deps = await adapter.checkDependencies();
      results.push({
        ...adapter.getInfo(),
        available: deps.available,
        installHint: deps.message || null,
      });
    } catch (e) {
      results.push({
        name,
        available: false,
        error: e.message,
      });
    }
  }

  return results;
}

/**
 * Check which adapters are available on this system
 * @returns {Promise<Object>}
 */
export async function checkAvailability() {
  const status = {};
  const seen = new Set();

  for (const [name] of registry) {
    try {
      const adapter = await getAdapter(name);
      if (seen.has(adapter.name)) continue;
      seen.add(adapter.name);

      const check = await adapter.checkDependencies();
      status[adapter.name] = check;
    } catch (e) {
      status[name] = { available: false, message: e.message };
    }
  }

  return status;
}

// ============================================================================
// Re-exports
// ============================================================================

export { BaseAdapter } from './base.js';

export default {
  getAdapter,
  getAvailableAdapter,
  setDefaultAdapter,
  getDefaultAdapterName,
  registerAdapter,
  listAdapters,
  getAdapterInfo,
  checkAvailability,
  BaseAdapter,
};
