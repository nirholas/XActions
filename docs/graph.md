# Social Graph — Network Analysis & Visualization

> Map your X/Twitter social network, analyze influence, find clusters, and get actionable follow/engage recommendations — no API fees.

## Overview

XActions Social Graph crawls your network N degrees deep and runs graph algorithms on the result:

- **Build** — Crawl followers/following from a seed account, creating a graph of nodes (accounts) and edges (follow relationships)
- **Analyze** — Compute mutual connections, bridge accounts, clusters, influence scores, ghost followers, and orbit analysis
- **Recommend** — Get actionable suggestions: who to follow, who to engage with, competitors to watch, accounts safe to unfollow
- **Visualize** — Export to D3.js (interactive force-directed), GEXF (Gephi), or self-contained HTML

Available via: **CLI**, **API**, **MCP tools** (for AI agents).

---

## Quick Start

### Build a graph (CLI)

```bash
# Crawl 2 degrees deep from @nichxbt
unfollowx graph build @nichxbt --depth 2 --auth-token YOUR_TOKEN

# Limit scope (useful for large accounts)
unfollowx graph build @nichxbt --depth 1 --max-nodes 200 --auth-token YOUR_TOKEN
```

### Analyze

```bash
unfollowx graph analyze <graphId>
```

Outputs: mutual connections, bridge accounts, clusters, influence ranking, ghost followers, orbits.

### Get recommendations

```bash
unfollowx graph recommend <graphId>
```

Outputs: follow suggestions, engagement targets, competitor watch list, safe-to-unfollow list.

### Export

```bash
# Interactive HTML (self-contained)
unfollowx graph export <graphId> --format html

# D3.js JSON (for custom visualizations)
unfollowx graph export <graphId> --format d3

# GEXF (open in Gephi for advanced analysis)
unfollowx graph export <graphId> --format gexf
```

### List & delete

```bash
unfollowx graph list
unfollowx graph delete <graphId>
```

---

## Architecture

```
src/graph/
├── builder.js         → Graph crawling & data structure (nodes, edges)
├── analyzer.js        → Graph algorithms (mutual, bridges, clusters, influence, ghosts, orbits)
├── visualizer.js      → Export to D3.js, GEXF, and interactive HTML
├── recommendations.js → Actionable insights from analysis
└── index.js           → Barrel re-exports + persistence (saveGraph, loadGraph)

api/routes/graph.js    → REST API endpoints
```

### Data Flow

```
buildGraph(seedUsername, { depth, maxNodes })
   ├─ Scrape seed profile
   ├─ Scrape followers (depth 0)
   ├─ Scrape following (depth 0)
   └─ Recurse for depth 1..N
        ↓
analyzeGraph(graph)
   ├─ findMutualConnections()    → A↔B pairs
   ├─ findBridgeAccounts()       → Accounts connecting subgraphs
   ├─ detectClusters()           → Community detection
   ├─ computeInfluenceScores()   → PageRank-style scoring
   ├─ findGhostFollowers()       → Inactive/fake followers
   └─ analyzeOrbits()            → Inner/outer circle mapping
        ↓
getRecommendations(graph, username)
   ├─ followSuggestions     → Well-connected accounts you don't follow
   ├─ engageSuggestions     → High-influence accounts to engage with
   ├─ competitorWatch       → Similar accounts competing for your audience
   └─ safeToUnfollow        → Low-value follows safe to remove
        ↓
toD3() / toGEXF() / toHTML() → Visualization output
```

---

## API Reference

### Build a graph

```http
POST /api/graph/build
Content-Type: application/json

{
  "username": "nichxbt",
  "depth": 2,
  "maxFollowers": 500,
  "maxFollowing": 500,
  "maxNodes": 500,
  "authToken": "your_auth_token"
}
```

**Response:** `{ id: "graph_uuid", status: "crawling", seed: "nichxbt" }`

### Other endpoints

```http
GET  /api/graph                     # List all saved graphs
GET  /api/graph/:id                 # Get graph data
GET  /api/graph/:id/analysis        # Get computed metrics
GET  /api/graph/:id/recommendations # Get follow/engage suggestions
GET  /api/graph/:id/visualization   # D3 JSON (default)
GET  /api/graph/:id/visualization?format=gexf  # GEXF
GET  /api/graph/:id/visualization?format=html  # Interactive HTML
DELETE /api/graph/:id               # Delete a graph
```

---

## MCP Tools (AI Agents)

| Tool | Description |
|------|-------------|
| `x_graph_build` | Build a social graph from a seed account |
| `x_graph_analyze` | Run analysis algorithms on a graph |
| `x_graph_recommendations` | Get actionable follow/engage/unfollow suggestions |
| `x_graph_list` | List all saved graphs |

### Example (Claude Desktop)

> "Build my social graph 2 levels deep and tell me who I should engage with more"

The agent calls `x_graph_build`, waits for completion, then `x_graph_recommendations`.

---

## Analysis Algorithms

### Mutual Connections

Finds all pairs where A follows B **and** B follows A. These are your strongest connections — they've committed to a two-way relationship.

### Bridge Accounts

Accounts that connect otherwise disconnected subgraphs in your network. Following and engaging with bridge accounts gives you exposure to multiple communities.

### Clusters

Community detection algorithm that groups accounts into clusters based on follow patterns. Reveals the distinct sub-communities in your network (e.g., "crypto devs", "marketing folks", "VCs").

### Influence Scores

PageRank-inspired scoring that accounts for both follower count and network position. An account with 1K followers who are all highly followed themselves scores higher than an account with 10K followers who are all inactive.

### Ghost Followers

Followers who show signs of being inactive, fake, or bot accounts. Useful for auditing follower quality.

### Orbit Analysis

Maps your followers into concentric orbits:
- **Inner orbit** — Mutual follows who engage frequently
- **Middle orbit** — One-way follows with some interaction
- **Outer orbit** — Follows with minimal engagement

---

## Visualization Formats

| Format | Best For | Output |
|--------|----------|--------|
| **D3.js** | Custom web apps, embedding | JSON with nodes + links arrays |
| **GEXF** | Advanced analysis in Gephi | XML file |
| **HTML** | Quick sharing, presentations | Self-contained interactive HTML with force-directed layout |

### D3.js Node Properties

```json
{
  "id": "nichxbt",
  "name": "nich",
  "followers": 25000,
  "following": 1200,
  "bio": "Building @XActions",
  "verified": true,
  "depth": 0,
  "influence": 0.87,
  "cluster": 2,
  "isSeed": true
}
```

---

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `depth` | `2` | How many degrees to crawl from the seed |
| `maxFollowers` | `500` | Max followers to fetch per account |
| `maxFollowing` | `500` | Max following to fetch per account |
| `maxNodes` | `500` | Maximum total nodes in the graph |
| `authToken` | — | X/Twitter auth token (required) |

### Storage

Graphs are persisted to `~/.xactions/graphs/` as JSON files. Use `graph list` to see saved graphs and `graph delete` to clean up.

---

## Tips

- **Start with depth 1** for large accounts (>10K followers) — depth 2 can generate thousands of nodes
- **Use `maxNodes`** to cap graph size — 500 nodes is usually enough for meaningful analysis
- **Export to HTML** for sharing with non-technical teammates
- **Export to GEXF** if you want Gephi's advanced layout algorithms and filtering
- **Re-build periodically** to track how your network evolves over time
