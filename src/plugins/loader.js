/**
 * XActions Plugin Loader
 * Discovers and loads plugins from npm packages and local paths.
 * 
 * Plugins are npm packages named `xactions-plugin-*` or `@xactions/*`.
 * They are registered in ~/.xactions/plugins.json.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

// ============================================================================
// Constants
// ============================================================================

const CONFIG_DIR = path.join(os.homedir(), '.xactions');
const PLUGINS_FILE = path.join(CONFIG_DIR, 'plugins.json');

const PLUGIN_NAME_PATTERNS = [
  /^xactions-plugin-/,
  /^@xactions\//,
];

// ============================================================================
// Plugin Config (persistent registry)
// ============================================================================

/**
 * Read the plugins registry from ~/.xactions/plugins.json
 * @returns {Promise<Object>} The plugins config { plugins: { name: { version, path, enabled } } }
 */
export async function readPluginsConfig() {
  try {
    const data = await fs.readFile(PLUGINS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { plugins: {} };
  }
}

/**
 * Write the plugins registry to ~/.xactions/plugins.json
 * @param {Object} config - The plugins config
 */
export async function writePluginsConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(PLUGINS_FILE, JSON.stringify(config, null, 2));
}

// ============================================================================
// Plugin Validation
// ============================================================================

/**
 * Check if a package name matches the plugin naming convention
 * @param {string} name - Package name
 * @returns {boolean}
 */
export function isValidPluginName(name) {
  return PLUGIN_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Validate a loaded plugin module has the required interface
 * @param {Object} mod - The imported module
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePlugin(mod) {
  const errors = [];

  if (!mod.name || typeof mod.name !== 'string') {
    errors.push('Plugin must export a "name" string');
  }
  if (!mod.version || typeof mod.version !== 'string') {
    errors.push('Plugin must export a "version" string');
  }

  // Optional fields — validate types if present
  if (mod.actions && !Array.isArray(mod.actions)) {
    errors.push('"actions" must be an array');
  }
  if (mod.scrapers && !Array.isArray(mod.scrapers)) {
    errors.push('"scrapers" must be an array');
  }
  if (mod.tools && !Array.isArray(mod.tools)) {
    errors.push('"tools" must be an array');
  }
  if (mod.routes && !Array.isArray(mod.routes)) {
    errors.push('"routes" must be an array');
  }
  if (mod.hooks && typeof mod.hooks !== 'object') {
    errors.push('"hooks" must be an object');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Plugin Loading
// ============================================================================

/**
 * Load a single plugin by name or path
 * @param {string} nameOrPath - npm package name or local file path
 * @returns {Promise<Object>} The loaded and validated plugin module
 */
export async function loadPlugin(nameOrPath) {
  let mod;

  // Try loading as a local path first (absolute or relative)
  if (nameOrPath.startsWith('/') || nameOrPath.startsWith('.') || nameOrPath.startsWith('file://')) {
    const resolved = nameOrPath.startsWith('file://') ? nameOrPath : `file://${path.resolve(nameOrPath)}`;
    mod = await import(resolved);
  } else {
    // Load as npm package — use createRequire to resolve from cwd
    const require = createRequire(path.join(process.cwd(), 'package.json'));
    const resolved = require.resolve(nameOrPath);
    mod = await import(`file://${resolved}`);
  }

  // Handle default export or named exports
  const plugin = mod.default || mod;

  const { valid, errors } = validatePlugin(plugin);
  if (!valid) {
    throw new Error(`Invalid plugin "${nameOrPath}": ${errors.join(', ')}`);
  }

  return plugin;
}

/**
 * Load all enabled plugins from the registry
 * @returns {Promise<Object[]>} Array of loaded plugin modules
 */
export async function loadAllPlugins() {
  const config = await readPluginsConfig();
  const plugins = [];

  for (const [name, entry] of Object.entries(config.plugins || {})) {
    if (entry.enabled === false) continue;

    try {
      const plugin = await loadPlugin(entry.path || name);
      plugins.push(plugin);
    } catch (error) {
      console.error(`⚠️  Failed to load plugin "${name}": ${error.message}`);
    }
  }

  return plugins;
}

/**
 * Discover xactions plugins from node_modules
 * Scans for packages matching the naming convention
 * @returns {Promise<string[]>} Array of discovered plugin package names
 */
export async function discoverPlugins() {
  const discovered = [];
  const nodeModulesDir = path.join(process.cwd(), 'node_modules');

  try {
    const entries = await fs.readdir(nodeModulesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      if (entry.name.startsWith('@xactions')) {
        // Scoped packages: @xactions/*
        const scopedDir = path.join(nodeModulesDir, entry.name);
        const scopedEntries = await fs.readdir(scopedDir, { withFileTypes: true });
        for (const scoped of scopedEntries) {
          if (scoped.isDirectory()) {
            discovered.push(`${entry.name}/${scoped.name}`);
          }
        }
      } else if (entry.name.startsWith('xactions-plugin-')) {
        discovered.push(entry.name);
      }
    }
  } catch {
    // node_modules doesn't exist or not readable — that's fine
  }

  return discovered;
}

export { PLUGINS_FILE, CONFIG_DIR };
