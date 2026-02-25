# Social Graph

Map and analyze X/Twitter social networks. Build graphs from seed accounts, detect clusters, find mutual connections, identify influencers, and get actionable follow/engage recommendations.

---

## Quick Start

### CLI

```bash
# Build a graph from a seed account (2 degrees deep, max 500 accounts)
xactions graph build --username elonmusk --depth 2 --max-nodes 500

# List saved graphs
xactions graph list

# Analyze a graph
xactions graph analyze <graph-id>

# Get follow recommendations
xactions graph recommend <graph-id>

# Export visualization
xactions graph visualize <graph-id> --format html
```

### Node.js

```js
import * as graph from 'xactions/graph';

// Build graph from seed user
const g = await graph.build('elonmusk', { depth: 2, maxNodes: 500 });
console.log(g.id); // graph ID

// Analyze
const analysis = graph.analyze(g, 'elonmusk');
console.log(analysis.mutualConnections);
console.log(analysis.clusters);
console.log(analysis.influenceRanking);

// Get recommendations
const recs = graph.recommend(g, 'elonmusk');
console.log(recs.followSuggestions);
console.log(recs.engageSuggestions);
console.log(recs.safeToUnfollow);

// Export
const html = graph.visualize(g, 'html');
const d3 = graph.visualize(g, 'd3');
const gexf = graph.visualize(g, 'gexf');
```

---

## Dashboard

Open `dashboard/graph.html` for the interactive visualization interface. Features:

- Force-directed graph layout (D3.js)
- Color-coded clusters
- Node sizing by influence score
- Click nodes to view profile details
- Filter by connection type (mutual, one-way, ghost)

---

## API Endpoints

### Build a Graph

```
POST /api/graph/build
```

```json
{
  "username": "elonmusk",
  "depth": 2,
  "maxNodes": 500
}
```

For large graphs (500+ nodes), the build runs in the background and emits a `graph:complete` Socket.IO event when done.

### List Graphs

```
GET /api/graph
```

Returns an array of saved graph metadata (ID, seed user, node count, created date).

### Get Graph Data

```
GET /api/graph/:id
```

Returns full graph with nodes and edges.

### Get Analysis

```
GET /api/graph/:id/analysis
```

Returns:

```json
{
  "mutualConnections": [...],
  "clusters": [...],
  "influenceRanking": [...],
  "bridgeAccounts": [...],
  "ghostFollowers": [...],
  "orbits": { "innerCircle": [...], "outerCircle": [...] }
}
```

### Get Recommendations

```
GET /api/graph/:id/recommendations
```

Returns:

```json
{
  "followSuggestions": [...],
  "engageSuggestions": [...],
  "competitorWatch": [...],
  "safeToUnfollow": [...]
}
```

### Get Visualization

```
GET /api/graph/:id/visualization?format=d3
```

Formats: `d3` (JSON for D3.js), `gexf` (XML for Gephi), `html` (standalone page).

### Delete Graph

```
DELETE /api/graph/:id
```

---

## Analysis Algorithms

### Mutual Connections

Finds all A↔B pairs where both users follow each other. These represent your strongest connections.

### Cluster Detection

Groups accounts into communities based on follow patterns. Useful for identifying niches within your network.

### Bridge Accounts

Identifies nodes that connect otherwise separate clusters. Following/engaging bridge accounts expands your reach across communities.

### Influence Scoring

Computes an influence score for each node based on follower count, mutual connections, and cluster centrality.

### Ghost Followers

Detects inactive or low-engagement followers — accounts that follow you but never interact.

### Orbit Analysis

Categorizes your network into concentric circles:
- **Inner circle** — mutual connections with high engagement
- **Outer circle** — one-way follows and periphery accounts

---

## Graph Persistence

Graphs are saved to `~/.xactions/graphs/` as JSON files. Each graph contains:

```json
{
  "id": "graph-elonmusk-1706000000",
  "seed": "elonmusk",
  "createdAt": "2026-01-23T12:00:00Z",
  "nodes": { "elonmusk": { "followers": 200000000, ... } },
  "edges": [
    { "source": "elonmusk", "target": "jack", "type": "follows", "weight": 1 }
  ]
}
```

### Functions

| Function | Description |
|----------|-------------|
| `buildGraph(username, options)` | Crawl and build the graph |
| `serializeGraph(graph)` | Convert Map-based graph to JSON |
| `deserializeGraph(data)` | Restore from JSON |
| `saveGraph(graph)` | Write to disk |
| `loadGraph(graphId)` | Read from disk |

---

## Export Formats

### D3.js

```json
{
  "nodes": [
    { "id": "elonmusk", "group": 1, "influence": 0.95 }
  ],
  "links": [
    { "source": "elonmusk", "target": "jack", "type": "follows" }
  ]
}
```

### GEXF (Gephi)

Standard GEXF XML format for import into [Gephi](https://gephi.org/) for advanced network analysis.

### HTML

Standalone HTML file with D3.js force-directed visualization — open in any browser.

---

## MCP Tools

Available via the MCP server for AI agents:

| Tool | Description |
|------|-------------|
| `x_graph_build` | Build a social graph |
| `x_graph_list` | List saved graphs |
| `x_graph_analyze` | Run analysis |
| `x_graph_recommend` | Get recommendations |
| `x_graph_visualize` | Export visualization |
