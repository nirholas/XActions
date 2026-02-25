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

// Competitive features (09-A, 09-B, 09-C)
export { saveAccountSnapshot, saveTweetSnapshot, saveDailyEngagement, getAccountHistory, getTweetHistory, getGrowthRate, compareAccounts, exportHistory } from './historyStore.js';
export { startAutoSnapshot, stopAutoSnapshot, listActiveSnapshots, stopAllSnapshots } from './autoSnapshot.js';
export { analyzeOverlap, multiOverlap, findSimilarAudience, getAudienceInsights } from './audienceOverlap.js';
export { syncFollowers, tagContact, untagContact, addNote, scoreContact, autoScore, searchContacts, filterContacts, createSegment, getSegment, listSegments, bulkTag, getContactTimeline, exportSegment } from './followerCRM.js';
