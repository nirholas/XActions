/**
 * XActions Plugin System
 * 
 * Public API for the XActions plugin architecture.
 * Community members can create npm packages that extend XActions
 * with new scrapers, MCP tools, Express routes, browser actions, and lifecycle hooks.
 * 
 * Plugin Naming Convention:
 *   - npm packages: `xactions-plugin-*` or `@xactions/*`
 *   - Registered in: ~/.xactions/plugins.json
 * 
 * Plugin Interface:
 *   export default {
 *     name: 'my-plugin',
 *     version: '1.0.0',
 *     description: 'What my plugin does',
 *     actions: [],    // Browser console actions
 *     scrapers: [],   // Puppeteer scraper functions
 *     tools: [],      // MCP tool definitions
 *     routes: [],     // Express route handlers
 *     hooks: {        // Lifecycle hooks
 *       onLoad() {},
 *       onUnload() {},
 *       beforeAction(ctx) {},
 *       afterAction(ctx) {},
 *     },
 *   };
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

export {
  readPluginsConfig,
  writePluginsConfig,
  loadPlugin,
  loadAllPlugins,
  validatePlugin,
  isValidPluginName,
  discoverPlugins,
  PLUGINS_FILE,
  CONFIG_DIR,
} from './loader.js';

export {
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
} from './manager.js';

// Re-export manager as default
export { default } from './manager.js';
