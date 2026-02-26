# Build 05: Real-Time Social Graph Intelligence

> **Project**: XActions Graph Intelligence — Live social graph analysis, bot detection, influence mapping, engagement pod detection  
> **Status**: New Build  
> **Priority**: #5 — Unique analytics capability nobody else offers  
> **Author**: XActions Team  

---

## Executive Summary

Nobody is doing live social graph analysis well. XActions already has a graph module (`src/graph/` — builder, analyzer, visualizer, recommendations) with functions for building social graphs, detecting clusters, computing influence scores, and finding ghost followers. This build transforms it into a **real-time social graph intelligence platform** — detecting bot networks, mapping influence cascades, identifying engagement pods, tracking follower velocity anomalies, and providing actionable network insights.

## Technical Context

### Existing Graph Infrastructure
- **Builder**: `src/graph/builder.js` — `buildGraph()` with depth-based crawling
- **Analyzer**: `src/graph/analyzer.js` — `analyzeGraph()`, `findMutualConnections()`, `findBridgeAccounts()`, `detectClusters()`, `computeInfluenceScores()`, `findGhostFollowers()`, `analyzeOrbits()`
- **Visualizer**: `src/graph/visualizer.js` — `toD3()`, `toGEXF()`, `toHTML()`
- **Recommendations**: `src/graph/recommendations.js` — `getRecommendations()`
- **Storage**: JSON files in `~/.xactions/graphs/`
- **Scrapers**: `src/scrapers/twitter/` — Follower/following/tweet data collection

### Architecture Plan

```
┌──────────────────────────────────────────────────────┐
│          XActions Social Graph Intelligence           │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │         Real-Time Data Collection                │ │
│  │  Follower streams • Tweet streams • Profile     │ │
│  │  Change detection • Hashtag monitoring          │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────────────────▼───────────────────────────────┐ │
│  │         Graph Database (SQLite + JSON)           │ │
│  │  Nodes (profiles) • Edges (follows/interactions)│ │
│  │  Temporal data • Engagement metrics             │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────┬───────────┼───────────┬──────────────┐      │
│  │     │           │           │              │      │
│  ▼     ▼           ▼           ▼              ▼      │
│ Bot    Influence  Engagement  Community    Anomaly    │
│ Detect Mapping    Pod Detect  Detection   Detection  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │         Intelligence Reports                     │ │
│  │  Network health • Follower quality • Growth     │ │
│  │  Influence path • Competitor comparison          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │         Interactive Visualization                │ │
│  │  D3.js graph • Heatmaps • Timeline charts       │ │
│  │  Real-time dashboard                            │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Key Files to Create
```
src/graph/
  (existing: builder.js, analyzer.js, visualizer.js, recommendations.js, index.js)
  database.js           — SQLite-based graph storage
  collector.js          — Real-time data collection pipeline
  botDetector.js        — Bot and fake account detection
  influenceMapper.js    — Influence cascade and path mapping
  podDetector.js        — Engagement pod/ring detection
  anomalyDetector.js    — Follower velocity and pattern anomalies
  communityDetector.js  — Community/cluster identification
  networkHealth.js      — Network quality scoring
  temporalAnalysis.js   — Time-series graph analysis
  reportGenerator.js    — Intelligence report generation
  realtimeMonitor.js    — Continuous monitoring system
  enhancedVisualizer.js — Interactive D3.js visualizations
tests/graph/
  database.test.js
  botDetector.test.js
  influenceMapper.test.js
  podDetector.test.js
  anomalyDetector.test.js
  integration.test.js
```

---

## Agent Build Prompts

---

### Prompt 1: Graph Database — SQLite Storage Layer

```
You are building the graph database for XActions Social Graph Intelligence.

Create file: src/graph/database.js

This replaces the current JSON file storage with a proper SQLite-based graph database for efficient querying of social network data.

Context:
- Current storage: JSON files in ~/.xactions/graphs/ (from src/graph/index.js)
- Use better-sqlite3 (synchronous SQLite for Node.js) — add to package.json
- Must handle millions of nodes and edges efficiently

Build:

1. GraphDatabase class:
   constructor(options):
     - dbPath: string (default ~/.xactions/graph.db)
     - Create tables on first run

2. Schema:
   Tables:
   
   nodes (profiles):
     id TEXT PRIMARY KEY,          -- Twitter user ID
     username TEXT UNIQUE,
     displayName TEXT,
     bio TEXT,
     followersCount INTEGER,
     followingCount INTEGER,
     tweetCount INTEGER,
     verified BOOLEAN,
     createdAt TEXT,               -- Account creation date
     avatarUrl TEXT,
     location TEXT,
     lastScraped TEXT,             -- When we last updated this node
     metadata TEXT                 -- JSON for additional data
   
   edges (relationships):
     sourceId TEXT,
     targetId TEXT,
     type TEXT,                    -- 'follows', 'mentioned', 'replied', 'liked', 'retweeted'
     weight REAL DEFAULT 1.0,      -- Interaction strength
     firstSeen TEXT,               -- When we first saw this edge
     lastSeen TEXT,                -- Last confirmation
     metadata TEXT,
     PRIMARY KEY (sourceId, targetId, type)
   
   snapshots (temporal data):
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     nodeId TEXT,
     metric TEXT,                  -- 'followers', 'following', 'tweets'
     value INTEGER,
     capturedAt TEXT
   
   interactions (engagement data):
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     sourceId TEXT,                -- Who performed the action
     targetId TEXT,                -- Who was the target
     tweetId TEXT,
     type TEXT,                    -- 'like', 'reply', 'repost', 'quote', 'mention'
     content TEXT,
     performedAt TEXT
   
   bot_scores:
     nodeId TEXT PRIMARY KEY,
     score REAL,                   -- 0-100, higher = more likely bot
     factors TEXT,                 -- JSON: { noAvatar: true, lowTweets: true, ... }
     computedAt TEXT
   
   influence_scores:
     nodeId TEXT PRIMARY KEY,
     score REAL,                   -- 0-100
     reach INTEGER,
     engagement REAL,
     authority REAL,
     computedAt TEXT
   
   Indexes:
     CREATE INDEX idx_edges_source ON edges(sourceId);
     CREATE INDEX idx_edges_target ON edges(targetId);
     CREATE INDEX idx_edges_type ON edges(type);
     CREATE INDEX idx_snapshots_node ON snapshots(nodeId, capturedAt);
     CREATE INDEX idx_interactions_source ON interactions(sourceId);
     CREATE INDEX idx_interactions_target ON interactions(targetId);
     CREATE INDEX idx_nodes_username ON nodes(username);

3. CRUD operations:
   - upsertNode(node) — Insert or update a profile node
   - upsertEdge(edge) — Insert or update a relationship edge
   - addSnapshot(nodeId, metric, value) — Record a metric snapshot
   - addInteraction(interaction) — Record an engagement interaction
   
   - getNode(idOrUsername) — Get a node by ID or username
   - getEdges(nodeId, type?, direction?) — Get edges for a node
   - getFollowers(nodeId) — Get all followers (incoming 'follows' edges)
   - getFollowing(nodeId) — Get all following (outgoing 'follows' edges)
   - getMutualFollowers(nodeA, nodeB) — Get mutual connections
   - getInteractions(nodeId, type?, since?) — Get engagement interactions
   - getSnapshots(nodeId, metric, dateRange?) — Get temporal snapshots

4. Graph queries:
   - getShortestPath(sourceId, targetId) — BFS shortest path between two nodes
   - getNeighborhood(nodeId, depth) — Get all nodes within N hops
   - getCommonFollowers(nodeIds[]) — Find followers common to multiple accounts
   - getDegreeDistribution() — Distribution of follower counts
   - getEdgeCount(type?) — Total edge count by type
   - getNodeCount() — Total node count
   - getGrowthRate(nodeId, metric, days) — Calculate growth rate over period

5. Maintenance:
   - compactDatabase() — Optimize and vacuum
   - pruneStaleEdges(olderThan) — Remove edges not seen since date
   - getStats() — Database statistics: node count, edge count, size on disk
   - exportToJSON() — Export entire graph as JSON
   - importFromJSON(data) — Import graph data

Author: @author nich (@nichxbt)
```

---

### Prompt 2: Real-Time Data Collector

```
You are building the real-time data collection pipeline for XActions Social Graph Intelligence.

Create file: src/graph/collector.js

This continuously collects social graph data by scraping X/Twitter and feeding it into the graph database.

Build:

1. GraphCollector class:
   constructor(options):
     - db: GraphDatabase instance
     - scraper: XActions scraper (from src/scrapers/twitter/)
     - authToken: string
     - rateLimit: { followersPerHour: 100, profilesPerHour: 200 }
     - pollingInterval: number (default 3600000 — 1 hour)

2. Profile collection:
   - collectProfile(username) — Scrape and store a profile:
     a. Scrape profile data
     b. Upsert node in database
     c. Record follower/following count snapshot
     d. Return the node
   
   - collectProfiles(usernames) — Batch collection with rate limiting
   
   - collectFollowers(username, limit?) — Scrape followers and store edges:
     a. Scrape follower list
     b. Upsert each follower as a node (basic data)
     c. Create 'follows' edges from follower → target
     d. Record snapshot of follower count
   
   - collectFollowing(username, limit?) — Same for following list
   
   - collectMutualConnections(username) — Scrape both followers and following, identify mutuals

3. Engagement collection:
   - collectTweetEngagement(tweetUrl) — Scrape who liked, retweeted, replied:
     a. Scrape likes list
     b. Scrape retweet list
     c. Scrape replies
     d. Store as interactions in database
   
   - collectRecentEngagement(username, tweetCount) — Scrape recent tweets and their engagement:
     a. Get last N tweets
     b. For each tweet: collect engagement
     c. Build interaction edges
   
   - collectMentions(username) — Find and store mentions of a user

4. Continuous monitoring:
   - startMonitoring(targets, options) — Begin continuous data collection:
     targets: Array<{ username, collectFollowers: boolean, collectEngagement: boolean }>
     options: { interval, depth }
     
     Loop:
     a. Collect profiles for all targets
     b. Compare to previous data: detect changes
     c. Emit events: 'follower_gained', 'follower_lost', 'engagement_spike'
     d. Sleep for interval
     e. Repeat
   
   - stopMonitoring()
   - getMonitoringStatus() — Current targets, last collection time, change count

5. Differential collection:
   - detectChanges(username) — Compare current state to last known state:
     Return: {
       newFollowers: string[],
       lostFollowers: string[],
       followerCountChange: number,
       followingCountChange: number,
       newTweets: number
     }
   
   - collectDiff(username) — Only collect what changed since last scrape

6. Data pipeline:
   - ingest(rawData, source) — Process raw scraped data into graph database:
     Normalize data format from different scrapers (Twitter, Bluesky, Mastodon)
     Deduplicate nodes and edges
     Update timestamps

Author: @author nich (@nichxbt)
```

---

### Prompt 3: Bot Detection Engine

```
You are building the bot detection engine for XActions Social Graph Intelligence.

Create file: src/graph/botDetector.js

This detects bot accounts, fake followers, and inauthentic accounts using heuristic signals — no ML model required.

Build:

1. BotDetector class:
   constructor(options):
     - db: GraphDatabase instance
     - thresholds: object (configurable scoring thresholds)

2. Bot scoring (0-100, higher = more likely bot):
   - scoreAccount(nodeId) — Calculate comprehensive bot score:
     
     Signal weights and scoring:
     
     PROFILE SIGNALS (max 35 points):
       - No avatar (default egg/person): +10
       - No bio: +8
       - Bio contains suspicious patterns (spam links, crypto scam, follow4follow): +7
       - Username is random alphanumeric (e.g., user839472): +5
       - Display name matches username exactly: +3
       - Location is empty: +2
     
     ACTIVITY SIGNALS (max 30 points):
       - Tweet count < 5: +10
       - Tweet count > 100,000 (spam bot): +8
       - Account created in last 30 days: +7
       - Only reposts, no original tweets: +5
     
     RATIO SIGNALS (max 20 points):
       - Following/followers ratio > 10: +10 (follows many, followed by few)
       - Following/followers ratio > 5: +5
       - Following > 5000 and followers < 100: +8
       - Followers exactly round number (1000, 5000): +2
     
     BEHAVIORAL SIGNALS (max 15 points):
       - Follows/unfollows in rapid bursts: +8
       - Posts identical content repeatedly: +4
       - All engagement at specific hours (not human patterns): +3
     
     Return: { 
       score: number,
       classification: 'human' | 'suspicious' | 'likely_bot' | 'definite_bot',
       factors: { [factorName]: { score: number, detail: string } },
       confidence: number (0-1)
     }
     
     Classification thresholds:
       0-25: 'human'
       25-50: 'suspicious'
       50-75: 'likely_bot'
       75-100: 'definite_bot'

3. Batch analysis:
   - analyzeFollowers(username) — Score all followers:
     a. Get follower list from database
     b. Score each follower
     c. Return: {
         total: number,
         humans: number,
         suspicious: number,
         likelyBots: number,
         definiteBots: number,
         botPercentage: number,
         worstOffenders: Array<{ username, score, factors }>,
         qualityScore: number (0-100, inverse of bot percentage)
       }
   
   - getFollowerQuality(username) — Quick quality score:
     Sample 100 followers, return estimated quality score

4. Bot network detection:
   - detectBotNetwork(seedAccounts) — Find coordinated bot clusters:
     Algorithm:
     a. For each seed: get followers
     b. Find accounts that follow multiple seeds (co-followers)
     c. Score co-followers for bot likelihood
     d. If many co-followers are bots, flag as coordinated network
     e. Find additional network members by shared following patterns
     Return: { 
       networks: Array<{ accounts: string[], botScore: number, pattern: string }>,
       totalBots: number,
       networkCount: number
     }
   
   - findFakeFollowerSellers() — Detect accounts that sell fake followers:
     Signal: Many of their followers are bots, rapid follower growth, suspicious bio

5. Temporal bot detection:
   - detectFollowerBurst(username) — Detect unnatural follower spikes:
     Analyze snapshots: if follower count jumps > 20% in 24h, flag as purchased followers
   
   - detectChurn(username) — Detect follow/unfollow cycling:
     Pattern: followers gained then lost quickly (follow4follow bots)

6. Persistence:
   - Store all bot scores in database (bot_scores table)
   - Cache scores for 24 hours (re-compute on demand)
   - getScoreHistory(nodeId) — Track bot score over time

Author: @author nich (@nichxbt)
```

---

### Prompt 4: Influence Mapping Engine

```
You are building the influence mapping engine for XActions Social Graph Intelligence.

Create file: src/graph/influenceMapper.js

This maps influence paths, cascades, and power structures within the social graph.

Build:

1. InfluenceMapper class:
   constructor(options):
     - db: GraphDatabase instance

2. Influence scoring:
   - computeInfluenceScore(nodeId) — Calculate multi-dimensional influence:
     Components:
     
     REACH (30%):
       Follower count normalized (log scale)
       Second-degree reach: followers of followers (sampled)
     
     ENGAGEMENT (30%):
       Average likes per tweet
       Average replies per tweet
       Engagement rate: (likes + replies + reposts) / followers
     
     AUTHORITY (20%):
       Verified status
       Account age
       Quality of followers (percentage that are real accounts)
       Followed by other influential accounts
     
     ACTIVITY (20%):
       Posting frequency
       Consistency (regular posting schedule)
       Content diversity (not just reposts)
     
     Final score: weighted average, 0-100
     Store in influence_scores table

3. Influence paths:
   - findInfluencePath(sourceId, targetId) — Find shortest influence path:
     How can source reach target? Through which intermediate accounts?
     BFS on the graph, weighted by influence scores
     Return: { path: [nodeId1, nodeId2, ...], hops: number, pathStrength: number }
   
   - findInfluencers(nodeId, depth) — Find who influences this account:
     Walk backwards through the graph: who are their most influential followers?
     Return ranked list of influencers
   
   - findInfluenced(nodeId, depth) — Find who this account influences:
     Walk forward: which of their followers are most active engagers?

4. Influence cascades:
   - trackCascade(tweetId) — Track how a tweet spreads through the network:
     a. Get reposters and quoters
     b. For each reposter: get their followers who then engaged
     c. Build cascade tree: original → reposter1 → [their followers who retweeted]
     d. Calculate cascade metrics: depth, breadth, velocity
     Return: {
       originNode: string,
       tree: CascadeNode[],
       totalReach: number,
       depth: number,
       velocity: number (reposts per hour),
       topAmplifiers: Array<{ nodeId, contributedReach }>
     }

5. Power structure mapping:
   - mapPowerStructure(communityAccounts) — Identify hierarchy:
     Algorithm:
     a. Build subgraph of community accounts
     b. Compute PageRank-like centrality:
        For each node: score = sum(incoming_edge_weight * source_influence) / total_edges
        Iterate until convergence (or max 20 iterations)
     c. Rank by centrality score
     d. Identify tiers: leader (top 5%), influencer (top 20%), active (top 50%), passive (bottom 50%)
     Return: { tiers: { leaders: [], influencers: [], active: [], passive: [] }, hierarchyScore: number }
   
   - findBridgeAccounts(communityA, communityB) — Find accounts that bridge two communities:
     Accounts followed by many in both groups

6. Influence comparison:
   - compareInfluence(accounts) — Compare influence metrics across accounts:
     Return table: { [username]: { reach, engagement, authority, activity, overall } }
   
   - findCompetitorAdvantage(myAccount, competitor) — What does competitor have that I don't?
     Compare: follower overlap, unique followers, engagement patterns, content strategy differences

Author: @author nich (@nichxbt)
```

---

### Prompt 5: Engagement Pod Detection

```
You are building the engagement pod detection system for XActions.

Create file: src/graph/podDetector.js

Engagement pods are groups of accounts that artificially boost each other's engagement. This detects them through interaction pattern analysis.

Build:

1. PodDetector class:
   constructor(options):
     - db: GraphDatabase instance
     - minPodSize: number (default 3)
     - minInteractionFrequency: number (default 5 interactions in 7 days)

2. Pod detection algorithms:
   
   - detectPods(username) — Find pods the user may be part of or affected by:
     Algorithm:
     a. Get recent interactions (likes, replies, reposts) for the user's tweets
     b. Count interaction frequency per engager
     c. Find "super-engagers": accounts that interact with >80% of tweets
     d. For each super-engager: check if they have similar super-engager patterns with other accounts
     e. If a group of accounts all super-engage with each other → pod detected
     
     Return: {
       pods: Array<{
         members: string[],
         podScore: number (0-100, confidence of being a pod),
         avgInteractionsPerDay: number,
         pattern: 'mutual_engagement' | 'one_way_boost' | 'rotating_engagement',
         detectedFrom: string (which signal triggered detection),
         evidence: Array<{ member1, member2, interactionCount, period }>
       }>,
       totalPods: number,
       engagementInflation: number (estimated % of engagement from pods)
     }
   
   - detectEngagementRing(accounts) — Check if a set of accounts form an engagement ring:
     Criteria:
     a. Most members like most of each other's tweets
     b. Engagement times are clustered (within minutes of posting)
     c. Members engage with each other much more than with outsiders
     Return: { isRing: boolean, confidence: number, evidence }

3. Pattern analysis:
   - analyzeEngagementTiming(username) — Check for suspicious timing patterns:
     a. Get timestamps of all engagement on the user's tweets
     b. Calculate time between tweet posting and engagement
     c. Natural pattern: gradual engagement over hours
     d. Pod pattern: burst of engagement in first 5-15 minutes
     e. Bot pattern: engagement at exactly regular intervals
     Return: { pattern: 'natural' | 'pod_boost' | 'bot_engagement', evidence }
   
   - analyzeReciprocity(username, engagers) — Measure engagement reciprocity:
     For each engager: does the user engage back at similar frequency?
     High reciprocity in a small group = likely pod

4. Engagement authenticity scoring:
   - scoreEngagementAuthenticity(tweetUrl) — Score how authentic a tweet's engagement is:
     Factors:
     - Percentage of engagers who are real accounts (not bots)
     - Engagement timing distribution (natural vs artificial)
     - Engager diversity (broad audience vs small pod)
     - Engagement depth (likes only vs likes + replies + reposts)
     Return: { authenticityScore: number (0-100), fakeEngagement: number (%), factors }
   
   - getAccountAuthenticityReport(username) — Overall engagement authenticity:
     Analyze last 50 tweets
     Return: { avgAuthenticity, trendDirection, worstTweets, podInflation }

5. Visualization helpers:
   - getPodGraph(podMembers) — Generate interaction graph data for visualization
   - getEngagementHeatmap(username) — Time-of-day × day-of-week engagement heatmap data

Author: @author nich (@nichxbt)
```

---

### Prompt 6: Anomaly Detection

```
You are building the anomaly detection system for XActions Social Graph Intelligence.

Create file: src/graph/anomalyDetector.js

This detects unusual patterns in follower growth, engagement, and account behavior that may indicate purchased followers, bot attacks, or shadowbans.

Build:

1. AnomalyDetector class:
   constructor(options):
     - db: GraphDatabase instance
     - sensitivityLevel: 'low' | 'medium' | 'high' (default 'medium')

2. Follower anomalies:
   - detectFollowerAnomalies(username) — Comprehensive follower analysis:
     
     SPIKE DETECTION:
       a. Get follower count snapshots over time
       b. Calculate daily/hourly growth rate
       c. Compute moving average and standard deviation
       d. Flag days where growth > 3 standard deviations above mean
       e. Classify spikes:
          - 'purchased_followers': sudden large gain with high bot percentage
          - 'viral_tweet': spike correlates with a high-engagement tweet
          - 'press_mention': spike from external event (not correlating with own tweets)
          - 'follow_back_campaign': spike with corresponding following increase
     
     DROP DETECTION:
       a. Flag significant follower drops (>5% in 24h)
       b. Classify: 'twitter_purge', 'mass_unfollow', 'account_suspension'
     
     VELOCITY ANOMALIES:
       a. Compare current growth rate to historical average
       b. Flag acceleration or deceleration beyond normal variance
     
     Return: {
       anomalies: Array<{
         type: string,
         severity: 'info' | 'warning' | 'critical',
         date: string,
         details: string,
         metric: { expected: number, actual: number, deviation: number }
       }>,
       healthScore: number (0-100, higher = more normal),
       growthTrend: 'accelerating' | 'steady' | 'decelerating' | 'volatile'
     }

3. Engagement anomalies:
   - detectEngagementAnomalies(username) — Engagement pattern analysis:
     
     a. Calculate typical engagement rate per tweet
     b. Flag tweets with engagement > 5x average (potential viral OR pod boost)
     c. Detect engagement rate decline (potential shadowban signal)
     d. Detect sudden engagement increase (new pod or bought engagement)
     e. Compare engagement rate to similar-sized accounts (is it realistic?)
     
     Return: {
       anomalies: Array<AnomalyEvent>,
       engagementHealth: number,
       shadowbanRisk: 'none' | 'low' | 'medium' | 'high',
       engagementTrend: string
     }

4. Account behavior anomalies:
   - detectBehaviorAnomalies(username) — Account behavior patterns:
     
     POSTING PATTERN:
       Normal: Regular posting schedule
       Anomaly: Sudden burst of 50 tweets in 1 hour (automation gone wrong?)
       Anomaly: Complete posting silence for days then sudden activity
     
     FOLLOW PATTERN:
       Normal: Steady follow rate
       Anomaly: Following 100+ accounts in an hour (aggressive follow-back strategy)
       Anomaly: Mass unfollow (100+ in an hour)
     
     ENGAGEMENT PATTERN:
       Normal: Varied engagement across accounts
       Anomaly: Liking 100+ tweets in an hour (bot behavior)
       Anomaly: Only engaging with specific accounts (pod behavior)

5. Comparative anomaly detection:
   - compareToBaseline(username, peerAccounts) — Compare to peer group:
     a. Establish baseline metrics from peer accounts (similar niche, similar size)
     b. Flag metrics where target deviates significantly from peers
     c. Flag: follower/engagement ratio, posting frequency, growth rate, bot follower %
     Return: { deviations: Array<{ metric, peerAvg, targetValue, zScore }> }

6. Alerting:
   - setAlertThresholds(thresholds) — Configure when to alert:
     { followerDropPercent, engagementDropPercent, botFollowerPercent, shadowbanSignals }
   - checkAlerts(username) — Run all checks and return triggered alerts

Author: @author nich (@nichxbt)
```

---

### Prompt 7: Community Detection

```
You are building the community detection system for XActions Social Graph Intelligence.

Create file: src/graph/communityDetector.js

This identifies natural communities, sub-groups, and clusters within the social graph.

Build:

1. CommunityDetector class:
   constructor(options):
     - db: GraphDatabase instance
     - minCommunitySize: number (default 5)

2. Community detection algorithms:
   
   - detectCommunities(centerNode, depth) — Find communities around an account:
     Algorithm (Label Propagation):
     a. Get neighborhood graph (all nodes within depth hops)
     b. Assign each node a unique label
     c. Iterate:
        For each node: adopt the most common label among its neighbors
        Weight by edge strength (more interactions = stronger connection)
     d. Repeat until labels stabilize (or max 50 iterations)
     e. Nodes with same label = same community
     
     Return: {
       communities: Array<{
         id: string,
         label: string (generated from common keywords in member bios),
         members: Array<{ nodeId, username, role: 'core' | 'peripheral' }>,
         size: number,
         density: number (internal connections / possible connections),
         topics: string[] (extracted from member bios and tweets),
         keyMembers: string[] (highest influence in the community)
       }>,
       modularity: number (quality of community partition, 0-1),
       overlapping: Array<{ nodeId, communities: string[] }> (members in multiple communities)
     }

3. Community characterization:
   - characterizeCommunity(communityMembers) — Describe a community:
     a. Extract common bio keywords
     b. Analyze common topics from recent tweets
     c. Identify common followed accounts (shared interests)
     d. Calculate demographics: avg follower count, avg tweet count, avg account age
     e. Identify tone/style from tweets
     Return: {
       name: string (auto-generated),
       description: string,
       keywords: string[],
       avgFollowers: number,
       topSharedFollows: string[],
       activityLevel: 'high' | 'medium' | 'low',
       sentiment: 'positive' | 'neutral' | 'negative'
     }

4. Community comparison:
   - compareCommunities(commA, commB) — Compare two communities:
     Return: {
       overlap: { accounts: string[], percentage: number },
       uniqueToA: string[],
       uniqueToB: string[],
       topicSimilarity: number,
       sizeDifference: number,
       bridgeAccounts: string[] (in both communities)
     }
   
   - findYourCommunity(username) — Which communities does this user belong to?

5. Community evolution:
   - trackCommunityChanges(community, period) — How has the community changed?
     Compare snapshots over time:
     Members joined, members left, density change, topic shifts
   
   - predictCommunityGrowth(community) — Based on recent trends, estimate future size

6. Niche discovery:
   - discoverNiches(username) — Find unexplored niches:
     a. Analyze user's current community
     b. Find adjacent communities (connected but distinct)
     c. Identify niches where the user has few connections but high potential
     Return: Array<{ niche, potentialFollowers, competition, entryPoints }>

Author: @author nich (@nichxbt)
```

---

### Prompt 8: Network Health Scoring

```
You are building the network health scoring system for XActions.

Create file: src/graph/networkHealth.js

This provides a comprehensive health score for any account's social network.

Build:

1. NetworkHealth class:
   constructor(options):
     - db: GraphDatabase instance
     - botDetector: BotDetector instance
     - anomalyDetector: AnomalyDetector instance
     - podDetector: PodDetector instance

2. Health score computation:
   - computeHealthScore(username) — Overall network health (0-100):
     
     Components:
     
     FOLLOWER QUALITY (25 points):
       Base: 25 * (1 - botPercentage/100)
       Penalty for >30% bot followers
       Bonus for high-influence followers
     
     ENGAGEMENT AUTHENTICITY (25 points):
       Base from engagement authenticity score
       Penalty for detected pods
       Bonus for organic engagement patterns
     
     GROWTH HEALTH (20 points):
       Penalty for suspicious spikes
       Bonus for steady, consistent growth
       Penalty for high churn (gain then lose followers quickly)
     
     NETWORK DIVERSITY (15 points):
       Number of distinct communities engaged with
       Penalty for only engaging with small, closed groups
       Bonus for cross-community connections
     
     CONTENT HEALTH (15 points):
       Engagement rate vs account size (is it realistic?)
       Posting consistency
       Reply/conversation ratio
     
     Return: {
       overall: number (0-100),
       grade: 'A' | 'B' | 'C' | 'D' | 'F',
       components: {
         followerQuality: { score, details },
         engagementAuthenticity: { score, details },
         growthHealth: { score, details },
         networkDiversity: { score, details },
         contentHealth: { score, details }
       },
       recommendations: string[],
       comparedTo: { percentile: number, inNiche: string }
     }

3. Peer benchmarking:
   - benchmarkAgainstPeers(username, peerGroup) — Compare to similar accounts:
     Return: { metric: { yours, peerAvg, peerBest, percentile } per metric }
   
   - findPeerGroup(username) — Auto-detect peer group:
     Find accounts with similar follower count, niche, and posting style

4. Health monitoring over time:
   - trackHealth(username) — Record health score snapshot
   - getHealthHistory(username, period) — Health score over time
   - detectHealthDecline(username) — Alert if health score drops

5. Actionable recommendations:
   - getRecommendations(healthReport) — Turn health score into actions:
     Low follower quality → "Run bot cleanup with: xactions workflow run block-bots.yml"
     Low engagement → "Focus on these communities: [...]"
     Low diversity → "Engage with accounts from these adjacent niches: [...]"
     Growth anomaly → "Investigate recent follower spike on [date]"

Author: @author nich (@nichxbt)
```

---

### Prompt 9: Intelligence Report Generator

```
You are building the intelligence report generator for XActions.

Create file: src/graph/reportGenerator.js

This produces comprehensive, human-readable intelligence reports from graph analysis.

Build:

1. ReportGenerator class:
   constructor(options):
     - db: GraphDatabase
     - all detector/analyzer instances

2. Report types:
   
   - generateAccountReport(username) — Complete account network intelligence:
     Sections:
     a. Executive Summary: health grade, key findings, action items
     b. Follower Analysis: total, growth rate, quality score, bot percentage, top followers
     c. Engagement Analysis: rate, authenticity, pod detection results, timing patterns
     d. Network Map: communities detected, influence position, bridge connections
     e. Growth Analysis: velocity, anomalies detected, trend prediction
     f. Competitor Comparison: if competitors configured, side-by-side metrics
     g. Recommendations: prioritized list of actions
     
     Format: Markdown with tables, bullet points, and data summaries
   
   - generateCompetitorReport(myUsername, competitors) — Competitive intelligence:
     a. Side-by-side metrics table
     b. Follower overlap analysis (Venn diagram data)
     c. Content strategy comparison
     d. Engagement comparison
     e. Audience quality comparison
     f. Growth rate comparison
     g. Opportunities: what competitors do that you don't
   
   - generateCommunityReport(username) — Community landscape:
     a. Communities the user belongs to
     b. Community characteristics
     c. User's role in each community
     d. Adjacent communities to explore
     e. Key accounts in each community
   
   - generateBotReport(username) — Bot and fake follower analysis:
     a. Overall bot percentage
     b. Bot score distribution chart data
     c. Worst offenders list
     d. Bot network detection results
     e. Cleanup recommendations

3. Report output formats:
   - toMarkdown(report) — Full markdown document
   - toHTML(report) — Styled HTML report
   - toJSON(report) — Structured JSON data
   - toTweetThread(report) — Condensed into a tweet thread (key findings only)

4. Scheduled reports:
   - scheduleReport(username, type, cron) — Schedule periodic report generation
   - Store reports to ~/.xactions/reports/{username}/{date}-{type}.md

Author: @author nich (@nichxbt)
```

---

### Prompt 10: Enhanced Interactive Visualizer

```
You are building the enhanced interactive visualizer for XActions Social Graph Intelligence.

Create file: src/graph/enhancedVisualizer.js

This generates rich, interactive D3.js-based visualizations of social graph data.

Build:

1. Generate self-contained HTML pages with embedded D3.js visualizations:
   
   - generateNetworkGraph(graphData, options) — Interactive force-directed graph:
     params: nodes, edges, communities, highlightNodes
     Features:
     - Force-directed layout (D3 force simulation)
     - Nodes sized by follower count (log scale)
     - Nodes colored by community
     - Edge thickness by interaction weight
     - Hover: show profile info tooltip
     - Click: highlight connections
     - Zoom and pan
     - Search: find node by username
     - Filter: toggle communities, node types, edge types
     - Export as PNG/SVG
     Return: HTML string (self-contained, works offline)
   
   - generateInfluenceMap(influenceData) — Hierarchical influence visualization:
     Tree layout showing influence hierarchy
     Levels: leaders → influencers → active → passive
     Color by influence score
   
   - generateGrowthChart(snapshots) — Time-series chart:
     Line chart of follower/engagement growth over time
     Annotations for detected anomalies
     Comparison lines for multiple accounts
   
   - generateEngagementHeatmap(engagementData) — Heatmap:
     24h × 7days grid showing engagement intensity
     Color scale: cold (low) to hot (high)
     Highlight peak engagement times
   
   - generateBotMap(botData) — Bot distribution visualization:
     Scatter plot: follower count vs bot score
     Color by classification (human/suspicious/bot)
     Quadrant analysis
   
   - generateCommunityMap(communityData) — Community bubble chart:
     Circles sized by community size
     Colored by topic/niche
     Overlap shown as intersections
     Click to explore members
   
   - generateComparisonRadar(accounts, metrics) — Radar/spider chart:
     Multi-dimensional comparison of accounts
     Axes: reach, engagement, authority, growth, authenticity

2. Dashboard page:
   Create dashboard/graph-intelligence.html:
   - Input: enter username to analyze
   - Tabs: Network | Influence | Growth | Bots | Communities | Reports
   - Each tab loads the appropriate visualization
   - Real-time updates when monitoring is active
   - Export buttons for each visualization

3. All visualizations must:
   - Be self-contained HTML (include D3.js from CDN)
   - Work offline (inline the data)
   - Be responsive (resize with window)
   - Support dark theme (match XActions dashboard)
   - Have proper legends and labels

Author: @author nich (@nichxbt)
```

---

### Prompt 11: Real-Time Monitor

```
You are building the real-time social graph monitor for XActions.

Create file: src/graph/realtimeMonitor.js

This provides continuous monitoring of social graph changes with alerts and event streaming.

Build:

1. RealtimeMonitor class:
   constructor(options):
     - collector: GraphCollector
     - db: GraphDatabase
     - botDetector, anomalyDetector, podDetector, networkHealth

2. Monitoring modes:
   - monitorAccount(username, options) — Monitor a single account:
     options: {
       checkInterval: '5m' | '15m' | '1h' | '6h',
       alerts: { followerDrop, engagementDrop, newBot, anomaly },
       collectDepth: 1 | 2 (how deep to scrape connections)
     }
     
     Each check cycle:
     a. Collect latest data (profile, counts)
     b. Compare to last check
     c. Run bot detection on new followers
     d. Run anomaly detection
     e. Update health score
     f. Emit events for any changes
     g. Generate alerts if thresholds exceeded
   
   - monitorCompetitors(myUsername, competitors, options) — Monitor competitors
   - monitorCommunity(accounts, options) — Monitor a community
   - stopMonitoring(monitorId)
   - listActiveMonitors()

3. Event system:
   - Events emitted:
     'follower.gained' — { username, follower, botScore, timestamp }
     'follower.lost' — { username, follower, wasBot, timestamp }
     'engagement.spike' — { username, tweetUrl, metric, value, threshold }
     'engagement.drop' — { username, metric, previousAvg, current }
     'bot.detected' — { username, botAccount, score, factors }
     'anomaly.detected' — { username, type, severity, details }
     'health.changed' — { username, previousScore, currentScore, delta }
     'community.changed' — { username, membersJoined, membersLeft }
     'competitor.change' — { competitor, metric, change }
   
   - on(event, callback) — Subscribe to events
   - off(event, callback) — Unsubscribe

4. Alert delivery:
   - Alerts config: { type, threshold, action }
   - Actions: 'log', 'console', 'webhook', 'file'
   - webhook: POST alert JSON to a URL
   - file: append to ~/.xactions/alerts.jsonl

5. Continuous intelligence:
   - getLatestIntelligence(username) — Get the most recent analysis results:
     { healthScore, recentAnomalies, botFollowerChange, engagementTrend, newCommunities }
   
   - getDailyDigest(username) — Generate daily summary of all changes

Author: @author nich (@nichxbt)
```

---

### Prompt 12: Temporal Analysis

```
You are building the temporal analysis system for XActions Social Graph Intelligence.

Create file: src/graph/temporalAnalysis.js

This analyzes how the social graph changes over time — growth patterns, relationship evolution, seasonal trends.

Build:

1. TemporalAnalyzer class:
   constructor(options):
     - db: GraphDatabase instance

2. Growth analysis:
   - analyzeGrowth(username, period) — Detailed growth analysis:
     period: '7d' | '30d' | '90d' | '1y'
     Return: {
       metrics: {
         followers: { start, end, change, changePercent, avgDaily },
         following: { same },
         tweets: { same },
         engagement: { avgLikes: { start, end, change } }
       },
       growthPhases: Array<{ dateRange, rate, classification: 'accelerating'|'steady'|'declining' }>,
       bestDay: { date, gained },
       worstDay: { date, lost },
       projections: { followers30d, followers90d, followers1y }
     }
   
   - projectGrowth(username, targetDate) — Predict future metrics:
     Use linear regression on historical snapshots
     Return: { projectedFollowers, confidence, assumedGrowthRate }

3. Relationship evolution:
   - analyzeRelationshipLifecycle(username) — How relationships form and dissolve:
     a. Average follower retention time
     b. Churn rate (% of followers lost per month)
     c. Most stable followers (longest duration)
     d. Most volatile connections
   
   - getConnectionAge(username) — Distribution of how long followers have been following:
     Buckets: <1week, 1week-1month, 1-3months, 3-6months, 6-12months, >1year

4. Seasonal/cyclical patterns:
   - detectSeasonalPatterns(username) — Find recurring patterns:
     a. Day-of-week engagement patterns (best and worst days)
     b. Time-of-day patterns (peak hours)
     c. Monthly trends (seasonal content performance)
     d. Correlate with events (holidays, product launches)
   
   - getBestPostingTimes(username) — Optimal posting schedule:
     Based on historical engagement by hour and day
     Return: Array<{ day, hour, avgEngagement, confidence }>

5. Trend detection:
   - detectTrends(username, metric) — Detect trends in any metric:
     Method: Moving average crossover (short MA crossing long MA)
     Return: { trend: 'up'|'down'|'flat', strength, sincdate, projection }
   
   - detectBreakpoints(username, metric) — Find points where trend changed:
     Return: Array<{ date, beforeTrend, afterTrend, possibleCause }>

Author: @author nich (@nichxbt)
```

---

### Prompt 13: Graph Module Entry Point and CLI

```
You are building the updated entry point and CLI for XActions Social Graph Intelligence.

Update file: src/graph/index.js to add all new modules.

Build:

1. Re-export everything:
   - Existing: builder, analyzer, visualizer, recommendations
   - New: database, collector, botDetector, influenceMapper, podDetector,
     anomalyDetector, communityDetector, networkHealth, temporalAnalysis,
     reportGenerator, realtimeMonitor, enhancedVisualizer

2. createGraphIntelligence(options) — All-in-one factory:
   options: {
     dbPath: string,
     authToken: string,
     autoCollect: boolean,
     monitorInterval: string
   }
   
   Returns: {
     db, collector, botDetector, influenceMapper, podDetector,
     anomalyDetector, communityDetector, health, temporal,
     reports, monitor, visualizer,
     
     // Convenience:
     analyze(username) — Full analysis, return health report
     detectBots(username) — Bot analysis
     detectPods(username) — Pod detection
     mapInfluence(username) — Influence mapping
     generateReport(username) — Full report
     startMonitoring(username) — Begin real-time monitoring
   }

3. CLI commands:
   - xactions graph analyze <username> — Full network analysis
   - xactions graph bots <username> — Bot detection report
   - xactions graph pods <username> — Engagement pod detection
   - xactions graph influence <username> — Influence mapping
   - xactions graph health <username> — Network health score
   - xactions graph communities <username> — Community detection
   - xactions graph compare <user1> <user2> [...] — Compare accounts
   - xactions graph monitor <username> — Start real-time monitoring
   - xactions graph report <username> [--type account|competitor|community|bot]
   - xactions graph visualize <username> [--type network|influence|growth|heatmap]
   - xactions graph export <username> [--format json|csv|gexf]

Author: @author nich (@nichxbt)
```

---

### Prompt 14: Complete Test Suite

```
You are building the test suite for XActions Social Graph Intelligence.

Create test files using vitest:

1. tests/graph/database.test.js:
   - Test table creation on first run
   - Test upsertNode creates and updates nodes
   - Test upsertEdge creates relationships
   - Test getFollowers returns correct nodes
   - Test getMutualFollowers finds mutual connections
   - Test addSnapshot records temporal data
   - Test getShortestPath finds correct path
   - Test getNeighborhood returns correct depth
   - Test compactDatabase doesn't lose data
   - Test large dataset handling (1000+ nodes)

2. tests/graph/botDetector.test.js:
   - Test scoreAccount assigns 0 for real-looking account
   - Test scoreAccount assigns >75 for obvious bot (no avatar, no bio, 0 tweets)
   - Test classification thresholds are correct
   - Test analyzeFollowers returns correct percentages
   - Test detectBotNetwork finds coordinated accounts
   - Test temporal bot detection catches follower bursts
   - Test scoring factors are all applied correctly

3. tests/graph/influenceMapper.test.js:
   - Test computeInfluenceScore returns 0-100
   - Test findInfluencePath finds shortest path
   - Test findInfluencers returns ranked list
   - Test trackCascade builds correct tree
   - Test mapPowerStructure identifies tiers
   - Test compareInfluence produces comparison table

4. tests/graph/podDetector.test.js:
   - Test detectPods finds mutual engagement group
   - Test does not flag normal engagement as pod
   - Test analyzeEngagementTiming classifies patterns correctly
   - Test analyzeReciprocity detects high reciprocity
   - Test scoreEngagementAuthenticity for authentic tweet
   - Test scoreEngagementAuthenticity for pod-boosted tweet

5. tests/graph/anomalyDetector.test.js:
   - Test detectFollowerAnomalies catches spike
   - Test detects follower drop
   - Test does not flag normal growth
   - Test detectEngagementAnomalies catches sudden drop
   - Test detectBehaviorAnomalies catches posting burst
   - Test compareToBaseline identifies outliers

6. tests/graph/integration.test.js:
   - Full pipeline: collect → store → analyze → detect bots → generate report
   - Test health score computation end-to-end
   - Test community detection on sample graph
   - Test report generation produces valid markdown
   - Mock all scraping calls

Each file: minimum 8 test cases. Use in-memory SQLite for database tests.
Author: @author nich (@nichxbt)
```

---

### Prompt 15: Documentation and Skill File

```
You are writing the complete documentation for XActions Social Graph Intelligence.

Create these files:

1. skills/social-graph-intelligence/SKILL.md:
   - Title: Social Graph Intelligence — Network Analysis and Detection
   - Description: Bot detection, influence mapping, engagement pod detection, anomaly detection
   - Quick Start: 3 commands to analyze an account
   - Features overview with examples
   - Configuration
   - CLI reference
   - Use cases: 5 real scenarios
   - Troubleshooting

2. docs/graph-intelligence.md:
   Complete technical documentation:
   - Architecture with diagram
   - Database schema reference
   - Bot detection: how it works, scoring formula, tuning thresholds
   - Influence mapping: PageRank-like algorithm explained
   - Pod detection: algorithms and evidence gathering
   - Anomaly detection: statistical methods used
   - Community detection: Label Propagation algorithm
   - Network health: scoring formula breakdown
   - Temporal analysis: trend detection methods
   - Report types and customization
   - Visualization types
   - Real-time monitoring setup
   - API reference for every function
   - Code examples for each analysis type
   - Performance: handling large graphs
   - Privacy considerations

3. docs/graph-api-reference.md:
   API reference for every public function in the graph module

4. dashboard/graph-intelligence.html:
   Interactive dashboard page:
   - Username input
   - Health score gauge
   - Bot percentage bar
   - Community visualization (D3 force graph, embedded)
   - Growth chart (last 30 days)
   - Engagement heatmap
   - Anomaly timeline
   - Pod detection results
   - Export report button
   - Start monitoring button

All content uses real code paths and algorithms from the implementation.
Author: @author nich (@nichxbt)
```

---

## Success Criteria

- [ ] SQLite graph database stores nodes, edges, and temporal data
- [ ] Real-time data collection pipeline feeds the database
- [ ] Bot detection scores accounts accurately (verified against known bots)
- [ ] Influence mapping computes scores and finds paths
- [ ] Pod detection identifies mutual engagement groups
- [ ] Anomaly detection catches follower spikes and drops
- [ ] Community detection finds natural clusters
- [ ] Network health score works end-to-end
- [ ] Intelligence reports generate valid markdown
- [ ] Interactive D3.js visualizations render correctly
- [ ] Real-time monitor with event streaming works
- [ ] Full test suite passes with vitest
- [ ] Dashboard provides useful insights
- [ ] Documentation is complete
