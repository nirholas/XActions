---
name: graph-analysis
description: Analyze follower/following network graphs — find clusters, influencers, bridges, and audience segments using graph algorithms. Use when users want to understand the network structure of their X audience or competitor's audience.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Graph Analysis

API-powered network graph analysis for X/Twitter follower relationships.

## Entry Points

| Goal | Route | Method |
|------|-------|--------|
| Build a network graph | `POST /api/graph/build` | REST API |
| Get graph data | `GET /api/graph/:id` | REST API |
| Run graph algorithms | `POST /api/graph/:id/analyze` | REST API |
| Export graph | `GET /api/graph/:id/export` | REST API |
| Visualize graph | `GET /api/graph/:id/visualize` | REST API |

## API Usage

### Build a network graph

```bash
POST /api/graph/build
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "nichxbt",
  "depth": 1,          // 1 = direct followers, 2 = followers of followers
  "maxNodes": 500      // Limit graph size
}
```

### Run graph algorithms

```bash
POST /api/graph/:id/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "algorithm": "pagerank"  // "pagerank" | "betweenness" | "community" | "influencers"
}
```

## Available Algorithms

| Algorithm | Description |
|-----------|-------------|
| `pagerank` | Rank nodes by influence (like Google's PageRank) |
| `betweenness` | Find bridge accounts connecting different clusters |
| `community` | Detect communities/clusters within the network |
| `influencers` | Identify top influencers by degree centrality |

## Use Cases

| Goal | Approach |
|------|----------|
| Find bridge accounts for cross-audience reach | `algorithm: "betweenness"` |
| Identify communities in your follower base | `algorithm: "community"` |
| Find most influential followers | `algorithm: "influencers"` |
| Rank followers by network influence | `algorithm: "pagerank"` |

## Notes

- Graph building is async and may take several minutes for large networks
- `depth: 2` creates much larger graphs — use `maxNodes` to limit
- Export formats: JSON (node/edge list), GraphML, CSV
- Visualization returns an interactive D3.js-powered HTML page

## Related Skills

- **analytics-insights** — Analyze your own engagement metrics
- **audience-demographics** — Understand follower demographics
- **competitor-intelligence** — Analyze competitor audiences
- **crm-management** — Manage individual relationships within the graph
