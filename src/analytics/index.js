/**
 * XActions Analytics — Unified Entry Point
 * 
 * Re-exports all analytics modules for convenient importing.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

export { analyzeSentiment, analyzeBatch, aggregateResults } from './sentiment.js';
export { createMonitor, stopMonitor, getMonitor, getMonitorHistory, listMonitors, removeMonitor, stopAll } from './reputation.js';
export { checkAlerts, getAlerts, clearAlerts } from './alerts.js';
export { generateReport } from './reports.js';
export { analyzeTweetPriceCorrelation, alignTweetsWithPrices, computeCorrelationStats, fetchCoinGeckoPrices, fetchGeckoTerminalPrices } from './priceCorrelation.js';
