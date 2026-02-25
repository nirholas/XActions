# Social Graph System

> Build, analyze, and visualize social network graphs from X/Twitter follower relationships. Discover clusters, bridges, influencers, ghost followers, and get actionable growth recommendations.

## Overview

The graph system crawls follower/following relationships and constructs a social network graph that can be:

- **Analyzed** — Find clusters (label propagation), bridges (betweenness centrality), influence scores (PageRank), ghost followers, mutual connections
- **Visualized** — Export as interactive HTML (force-directed D3.js), GEXF (Gephi), or D3 JSON
- **Queried** — Get follow/unfollow/engage recommendations based on graph structure
- **Persisted** — Saved to `~/.xactions/graphs/` for reuse

## Quick Start

### CLI

```bash
# Build a graph (depth 1 = followers + following)
xactions graph build @username --depth 1

# Build deeper graph (followers of followers)
xactions graph build @username --depth 2 --max 500

# Analyze an existing graph
xactions graph analyze <graph-id>

# Get recommendations
xactions graph recommend <graph-id> --for @username

# Export as HTML visualization
xactions graph export <graph-id> --format html --output graph.html

# List saved graphs
xactions graph list

# Delete a graph
xactions graph delete <graph-id>
```

### Node.js API

```javascript
import graph from './src/graph/index.js';

// Build a graph
const result = await graph.build('@username', {
  depth: 2,
  maxPerLevel: 500,
  authToken: 'your-auth-token',
});

// Analyze it
const analysis = graph.analyze(result);
console.log(analysis.clusters);      // Community clusters
console.log(analysis.bridges);       // Bridge accounts
console.log(analysis.influence);     // PageRank scores
console.log(analysis.ghostFollowers); // Inactive followers

// Get recommendations
const recs = graph.recommend(result, '@username');
console.log(recs.followSuggestions);
console.log(recs.engageSuggestions);
console.log(recs.safeUnfollows);

// Visualize
const html = graph.visualize(result, 'html');
const d3json = graph.visualize(result, 'd3');
const gexf = graph.visualize(result, 'gexf');
```

### MCP Tools

```
x_graph_build      — Build a social graph for a user
x_graph_analyze    — Run analysis on an existing graph
x_graph_recommendations — Get follow/unfollow/engage suggestions
x_graph_list       — List all saved graphs
```

## Architecture

```
src/graph/
├── index.js            → Unified facade (build, analyze, recommend, visualize)
├── builder.js          → Graph construction from follower data
├── analyzer.js         → Graph analysis algorithms
├── recommendations.js  → Actionable suggestions from graph data
└── visualizer.js       → Export to D3 JSON, GEXF, HTML
```

## Modules

### builder.js — Graph Construction

Crawls X.com follower/following relationships to build a directed graph.

```javascript
import { buildGraph, serializeGraph, deserializeGraph } from './builder.js';

const graph = await buildGraph('@username', {
  depth: 2,          // How many levels deep to crawl
  maxPerLevel: 500,  // Max users per level
  authToken: '...',  // X.com auth token
});

// Serialize for storage
const data = serializeGraph(graph);

// Deserialize from storage
const restored = deserializeGraph(data);
```

**Graph structure:**
- **Nodes:** User accounts with metadata (handle, name, followers count, verified status)
- **Edges:** Directed follow relationships (A follows B)
- **Depth:** Level 1 = direct connections, Level 2 = connections of connections

### analyzer.js — Analysis Algorithms

| Function | Algorithm | What It Finds |
|----------|-----------|---------------|
| `detectClusters(graph)` | Label Propagation | Community groups (e.g., "AI Twitter", "Startup Twitter") |
| `findBridgeAccounts(graph)` | Betweenness Centrality | Accounts that connect separate communities |
| `computeInfluenceScores(graph)` | PageRank | Most influential accounts in the network |
| `getInfluenceRanking(graph)` | Sorted PageRank | Top-N most influential accounts |
| `findMutualConnections(graph)` | Set Intersection | All mutual follow pairs |
| `getMutualConnectionsFor(graph, user)` | Set Intersection | Mutual followers for a specific user |
| `findGhostFollowers(graph)` | Activity Heuristics | Followers who never engage |
| `analyzeOrbits(graph, user)` | BFS + Classification | Orbit analysis (inner circle, outer circle, periphery) |
| `analyzeGraph(graph)` | All of the above | Full analysis in one call |

```javascript
import { analyzeGraph } from './analyzer.js';

const analysis = analyzeGraph(graph);

// Clusters
analysis.clusters.forEach(cluster => {
  console.log(`Cluster "${cluster.label}": ${cluster.members.length} members`);
});

// Top influencers
analysis.influence.ranking.slice(0, 10).forEach(({ user, score }) => {
  console.log(`${user}: ${score.toFixed(4)}`);
});

// Bridge accounts (valuable for cross-community reach)
analysis.bridges.forEach(({ user, score }) => {
  console.log(`Bridge: ${user} (centrality: ${score.toFixed(4)})`);
});

// Ghost followers
console.log(`${analysis.ghostFollowers.length} ghost followers detected`);
```

### recommendations.js — Actionable Suggestions

Generates four types of recommendations from graph data:

| Type | Description |
|------|-------------|
| **Follow suggestions** | Accounts with many mutual connections you don't follow yet |
| **Engage suggestions** | High-influence accounts in your network worth engaging with |
| **Competitor watch** | Accounts with similar follower patterns |
| **Safe unfollows** | Accounts with low mutual connections and low influence |

```javascript
import { getRecommendations } from './recommendations.js';

const recs = getRecommendations(graph, '@username');

recs.followSuggestions     // [{ user, reason, mutualCount, score }]
recs.engageSuggestions     // [{ user, reason, influenceScore }]
recs.competitorWatch       // [{ user, reason, overlapScore }]
recs.safeUnfollows         // [{ user, reason, riskScore }]
```

### visualizer.js — Export & Visualization

| Format | Function | Output |
|--------|----------|--------|
| D3 JSON | `toD3(graph)` | `{ nodes: [...], links: [...] }` for D3.js force-directed graphs |
| GEXF | `toGEXF(graph)` | Gephi-compatible XML format |
| HTML | `toHTML(graph)` | Standalone HTML page with interactive force-directed visualization |

```javascript
import { toD3, toGEXF, toHTML } from './visualizer.js';

// Interactive HTML page
const html = toHTML(graph);
fs.writeFileSync('my-graph.html', html);

// Gephi import
const gexf = toGEXF(graph);
fs.writeFileSync('my-graph.gexf', gexf);

// Raw D3 data for custom viz
const d3data = toD3(graph);
```

### index.js — Unified Facade

High-level API with file-based persistence:

```javascript
import graph from './graph/index.js';

// Build + auto-save
const result = await graph.build('@user', { depth: 1, authToken: '...' });

// List all saved graphs
const graphs = await graph.list();

// Load a saved graph
const loaded = await graph.get(graphId);

// Analyze
const analysis = graph.analyze(loaded);

// Recommendations
const recs = graph.recommend(loaded, '@user');

// Visualize
const html = graph.visualize(loaded, 'html');

// Delete
await graph.delete(graphId);
```

Graphs are stored as JSON in `~/.xactions/graphs/`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/graph/build` | Build a new graph |
| `GET` | `/api/graph/` | List all graphs |
| `GET` | `/api/graph/:id` | Get a specific graph |
| `GET` | `/api/graph/:id/analysis` | Get analysis for a graph |
| `GET` | `/api/graph/:id/recommendations` | Get recommendations |
| `GET` | `/api/graph/:id/visualization` | Get HTML visualization |
| `DELETE` | `/api/graph/:id` | Delete a graph |

## Dashboard

The graph visualization is available at `/graph.html` in the web dashboard, providing an interactive force-directed layout powered by D3.js.

## Performance Notes

- Depth 1 graphs are fast (minutes) — recommended for most use cases
- Depth 2 graphs can take 30+ minutes for accounts with many followers
- Use `--max` to limit crawl size for large accounts
- Graphs are cached on disk; re-analysis is instant
