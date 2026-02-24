/**
 * XActions Social Graph — Main Entry Point
 *
 * Usage:
 *   import graph from './graph/index.js';
 *
 *   const result = await graph.build('@username', { depth: 2, authToken: '...' });
 *   const analysis = graph.analyze(result);
 *   const recommendations = graph.recommend(result, '@username');
 *   const html = graph.visualize(result, 'html');
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import {
  buildGraph,
  serializeGraph,
  deserializeGraph,
} from './builder.js';

import {
  analyzeGraph,
  findMutualConnections,
  getMutualConnectionsFor,
  findBridgeAccounts,
  detectClusters,
  computeInfluenceScores,
  getInfluenceRanking,
  findGhostFollowers,
  analyzeOrbits,
} from './analyzer.js';

import { toD3, toGEXF, toHTML } from './visualizer.js';
import { getRecommendations } from './recommendations.js';

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ============================================================================
// Storage
// ============================================================================

const GRAPHS_DIR = path.join(os.homedir(), '.xactions', 'graphs');

async function ensureDir() {
  await fs.mkdir(GRAPHS_DIR, { recursive: true });
}

/**
 * Save a graph to disk
 */
async function saveGraph(graph) {
  await ensureDir();
  const data = serializeGraph(graph);
  const filePath = path.join(GRAPHS_DIR, `${data.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return data;
}

/**
 * Load a graph from disk by ID
 */
async function loadGraph(graphId) {
  try {
    const filePath = path.join(GRAPHS_DIR, `${graphId}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    return deserializeGraph(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * List all saved graphs
 */
async function listGraphs() {
  await ensureDir();
  try {
    const files = await fs.readdir(GRAPHS_DIR);
    const graphs = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(GRAPHS_DIR, file), 'utf-8');
        const data = JSON.parse(raw);
        graphs.push({
          id: data.id,
          seed: data.seed,
          nodesCount: data.nodes?.length || 0,
          edgesCount: data.edges?.length || 0,
          status: data.metadata?.status || 'unknown',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } catch {}
    }
    return graphs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch {
    return [];
  }
}

/**
 * Delete a saved graph
 */
async function deleteGraph(graphId) {
  try {
    await fs.unlink(path.join(GRAPHS_DIR, `${graphId}.json`));
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// High-Level API
// ============================================================================

/**
 * Build a social graph and save it
 */
async function build(username, options = {}) {
  const graph = await buildGraph(username, options);
  const saved = await saveGraph(graph);
  return saved;
}

/**
 * Get a saved graph (deserialized with Map nodes for analysis)
 */
async function get(graphId) {
  return loadGraph(graphId);
}

/**
 * List all graphs
 */
async function list() {
  return listGraphs();
}

/**
 * Run analysis on a graph
 */
function analyze(graph, seedUsername) {
  return analyzeGraph(graph, seedUsername);
}

/**
 * Get recommendations from a graph
 */
function recommend(graph, username) {
  return getRecommendations(graph, username);
}

/**
 * Visualize a graph in the specified format
 * @param {object} graph - Deserialized graph (nodes as Map)
 * @param {'d3'|'gexf'|'html'} format
 */
function visualize(graph, format = 'd3') {
  switch (format) {
    case 'gexf':
    case 'gephi':
      return toGEXF(graph);
    case 'html':
      return toHTML(graph);
    case 'd3':
    default:
      return toD3(graph);
  }
}

// ============================================================================
// Export
// ============================================================================

const graphModule = {
  // High-level API
  build,
  get,
  list,
  delete: deleteGraph,
  analyze,
  recommend,
  visualize,
  save: saveGraph,

  // Low-level (re-exported for advanced use)
  buildGraph,
  serializeGraph,
  deserializeGraph,
  analyzeGraph,
  findMutualConnections,
  getMutualConnectionsFor,
  findBridgeAccounts,
  detectClusters,
  computeInfluenceScores,
  getInfluenceRanking,
  findGhostFollowers,
  analyzeOrbits,
  getRecommendations,
  toD3,
  toGEXF,
  toHTML,
};

export {
  build,
  get,
  list,
  deleteGraph,
  analyze,
  recommend,
  visualize,
  saveGraph,
  buildGraph,
  serializeGraph,
  deserializeGraph,
  analyzeGraph,
  findMutualConnections,
  getMutualConnectionsFor,
  findBridgeAccounts,
  detectClusters,
  computeInfluenceScores,
  getInfluenceRanking,
  findGhostFollowers,
  analyzeOrbits,
  getRecommendations,
  toD3,
  toGEXF,
  toHTML,
};

export default graphModule;
