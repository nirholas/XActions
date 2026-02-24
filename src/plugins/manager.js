/**
 * XActions Plugin Manager
 * Manages plugin lifecycle: install, uninstall, enable, disable, and hook execution.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import { execSync } from 'child_process';
import {
  readPluginsConfig,
  writePluginsConfig,
  loadPlugin,
  loadAllPlugins,
  validatePlugin,
  isValidPluginName,
  discoverPlugins,
} from './loader.js';

// ============================================================================
// In-Memory Plugin Registry
// ============================================================================

/** @type {Map<string, Object>} Loaded plugin instances keyed by name */
const loadedPlugins = new Map();

/** @type {Object[]} All registered MCP tools from plugins */
const pluginTools = [];

/** @type {Object[]} All registered scrapers from plugins */
const pluginScrapers = [];

/** @type {Object[]} All registered Express routes from plugins */
const pluginRoutes = [];

/** @type {Object[]} All registered browser actions from plugins */
const pluginActions = [];

/** @type {Object[]} All registered hooks from plugins */
const pluginHooks = [];

// ============================================================================
// Plugin Installation
// ============================================================================

/**
 * Install a plugin by npm package name
 * @param {string} name - Package name (e.g., xactions-plugin-analytics)
 * @returns {Promise<Object>} The installed plugin info
 */
export async function installPlugin(name) {
  // Allow local paths (starting with . or /)
  const isLocal = name.startsWith('.') || name.startsWith('/');

  if (!isLocal && !isValidPluginName(name)) {
    throw new Error(
      `Invalid plugin name "${name}". Plugins must be named "xactions-plugin-*" or "@xactions/*".`
    );
  }

  // Install via npm if it's a package name
  if (!isLocal) {
    try {
      execSync(`npm install ${name}`, { stdio: 'pipe', cwd: process.cwd() });
    } catch (error) {
      throw new Error(`Failed to install "${name}": ${error.message}`);
    }
  }

  // Load and validate
  const plugin = await loadPlugin(name);

  // Register in config
  const config = await readPluginsConfig();
  config.plugins[plugin.name] = {
    package: name,
    path: isLocal ? name : undefined,
    version: plugin.version,
    description: plugin.description || '',
    enabled: true,
    installedAt: new Date().toISOString(),
  };
  await writePluginsConfig(config);

  // Load into memory
  await registerPlugin(plugin);

  return {
    name: plugin.name,
    version: plugin.version,
    description: plugin.description,
    actions: plugin.actions?.length || 0,
    scrapers: plugin.scrapers?.length || 0,
    tools: plugin.tools?.length || 0,
    routes: plugin.routes?.length || 0,
  };
}

/**
 * Remove a plugin by name
 * @param {string} name - Plugin name (as declared in plugin.name)
 * @returns {Promise<boolean>}
 */
export async function removePlugin(name) {
  const config = await readPluginsConfig();
  const entry = config.plugins[name];

  if (!entry) {
    throw new Error(`Plugin "${name}" is not installed.`);
  }

  // Unload from memory
  await unregisterPlugin(name);

  // Uninstall npm package if applicable
  if (entry.package && !entry.path) {
    try {
      execSync(`npm uninstall ${entry.package}`, { stdio: 'pipe', cwd: process.cwd() });
    } catch {
      // Non-fatal — config will be cleaned up regardless
    }
  }

  // Remove from config
  delete config.plugins[name];
  await writePluginsConfig(config);

  return true;
}

/**
 * List all registered plugins with their status
 * @returns {Promise<Object[]>}
 */
export async function listPlugins() {
  const config = await readPluginsConfig();
  return Object.entries(config.plugins || {}).map(([name, entry]) => ({
    name,
    version: entry.version,
    description: entry.description,
    enabled: entry.enabled !== false,
    loaded: loadedPlugins.has(name),
    installedAt: entry.installedAt,
  }));
}

/**
 * Enable a plugin
 * @param {string} name
 */
export async function enablePlugin(name) {
  const config = await readPluginsConfig();
  if (!config.plugins[name]) throw new Error(`Plugin "${name}" not found.`);
  config.plugins[name].enabled = true;
  await writePluginsConfig(config);

  // Load it
  const plugin = await loadPlugin(config.plugins[name].path || config.plugins[name].package || name);
  await registerPlugin(plugin);
}

/**
 * Disable a plugin
 * @param {string} name
 */
export async function disablePlugin(name) {
  const config = await readPluginsConfig();
  if (!config.plugins[name]) throw new Error(`Plugin "${name}" not found.`);
  config.plugins[name].enabled = false;
  await writePluginsConfig(config);

  await unregisterPlugin(name);
}

// ============================================================================
// Plugin Registration (in-memory)
// ============================================================================

/**
 * Register a plugin's exports into the in-memory registries
 * @param {Object} plugin - Validated plugin module
 */
async function registerPlugin(plugin) {
  if (loadedPlugins.has(plugin.name)) {
    await unregisterPlugin(plugin.name);
  }

  loadedPlugins.set(plugin.name, plugin);

  // Register tools
  if (plugin.tools?.length) {
    for (const tool of plugin.tools) {
      pluginTools.push({ ...tool, _plugin: plugin.name });
    }
  }

  // Register scrapers
  if (plugin.scrapers?.length) {
    for (const scraper of plugin.scrapers) {
      pluginScrapers.push({ ...scraper, _plugin: plugin.name });
    }
  }

  // Register routes
  if (plugin.routes?.length) {
    for (const route of plugin.routes) {
      pluginRoutes.push({ ...route, _plugin: plugin.name });
    }
  }

  // Register actions
  if (plugin.actions?.length) {
    for (const action of plugin.actions) {
      pluginActions.push({ ...action, _plugin: plugin.name });
    }
  }

  // Register hooks
  if (plugin.hooks) {
    pluginHooks.push({ ...plugin.hooks, _plugin: plugin.name });
  }

  // Call onLoad lifecycle hook
  if (plugin.hooks?.onLoad) {
    try {
      await plugin.hooks.onLoad();
    } catch (error) {
      console.error(`⚠️  Plugin "${plugin.name}" onLoad hook failed: ${error.message}`);
    }
  }
}

/**
 * Unregister a plugin and remove its contributions from memory
 * @param {string} name - Plugin name
 */
async function unregisterPlugin(name) {
  const plugin = loadedPlugins.get(name);
  if (!plugin) return;

  // Call onUnload lifecycle hook
  if (plugin.hooks?.onUnload) {
    try {
      await plugin.hooks.onUnload();
    } catch (error) {
      console.error(`⚠️  Plugin "${name}" onUnload hook failed: ${error.message}`);
    }
  }

  // Remove from all registries
  const removeByPlugin = (arr) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i]._plugin === name) arr.splice(i, 1);
    }
  };

  removeByPlugin(pluginTools);
  removeByPlugin(pluginScrapers);
  removeByPlugin(pluginRoutes);
  removeByPlugin(pluginActions);
  removeByPlugin(pluginHooks);

  loadedPlugins.delete(name);
}

// ============================================================================
// Hook Execution
// ============================================================================

/**
 * Execute a named hook across all loaded plugins
 * @param {string} hookName - Hook name (e.g., 'beforeAction', 'afterAction')
 * @param {Object} context - Context passed to each hook function
 */
export async function executeHook(hookName, context = {}) {
  for (const hooks of pluginHooks) {
    if (typeof hooks[hookName] === 'function') {
      try {
        await hooks[hookName](context);
      } catch (error) {
        console.error(`⚠️  Hook "${hookName}" in plugin "${hooks._plugin}" failed: ${error.message}`);
      }
    }
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the plugin system — load all enabled plugins
 * @returns {Promise<number>} Number of plugins loaded
 */
export async function initializePlugins() {
  const plugins = await loadAllPlugins();

  for (const plugin of plugins) {
    await registerPlugin(plugin);
  }

  return plugins.length;
}

// ============================================================================
// Getters (for integration with MCP, API, scrapers)
// ============================================================================

/** Get all MCP tools contributed by plugins */
export function getPluginTools() {
  return [...pluginTools];
}

/** Get all scrapers contributed by plugins */
export function getPluginScrapers() {
  return [...pluginScrapers];
}

/** Get all Express routes contributed by plugins */
export function getPluginRoutes() {
  return [...pluginRoutes];
}

/** Get all browser actions contributed by plugins */
export function getPluginActions() {
  return [...pluginActions];
}

/** Get a loaded plugin by name */
export function getPlugin(name) {
  return loadedPlugins.get(name);
}

/** Get count of loaded plugins */
export function getLoadedCount() {
  return loadedPlugins.size;
}

export default {
  installPlugin,
  removePlugin,
  listPlugins,
  enablePlugin,
  disablePlugin,
  initializePlugins,
  executeHook,
  getPluginTools,
  getPluginScrapers,
  getPluginRoutes,
  getPluginActions,
  getPlugin,
  getLoadedCount,
};
