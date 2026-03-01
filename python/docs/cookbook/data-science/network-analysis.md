# Network Analysis

Map influence networks, find key connectors, and understand community structure.

## Influence Network Mapping

```python
import asyncio
from xeepy import Xeepy
from dataclasses import dataclass
from collections import defaultdict
import json

@dataclass
class NetworkNode:
    username: str
    followers: int
    following: int
    influence_score: float
    connections: list
    cluster: str = None

class InfluenceNetwork:
    """Map and analyze influence networks"""
    
    def __init__(self):
        self.nodes = {}
        self.edges = []
    
    async def build_network(
        self,
        seed_users: list,
        depth: int = 2,
        max_connections: int = 50
    ):
        """
        Build influence network starting from seed users.
        
        depth=1: Direct connections only
        depth=2: Friends of friends
        """
        
        async with Xeepy() as x:
            to_process = [(u, 0) for u in seed_users]
            processed = set()
            
            while to_process:
                username, current_depth = to_process.pop(0)
                
                if username in processed or current_depth > depth:
                    continue
                
                processed.add(username)
                print(f"Processing @{username} (depth {current_depth})")
                
                try:
                    # Get profile
                    profile = await x.scrape.profile(username)
                    
                    # Get who they follow (their influencers)
                    following = await x.scrape.following(username, limit=max_connections)
                    
                    # Calculate influence score
                    influence_score = self._calculate_influence(profile)
                    
                    # Create node
                    self.nodes[username] = NetworkNode(
                        username=username,
                        followers=profile.followers_count,
                        following=profile.following_count,
                        influence_score=influence_score,
                        connections=[f.username for f in following]
                    )
                    
                    # Create edges
                    for followed in following:
                        self.edges.append({
                            "source": username,
                            "target": followed.username,
                            "type": "follows"
                        })
                        
                        # Add to processing queue
                        if current_depth < depth and followed.username not in processed:
                            to_process.append((followed.username, current_depth + 1))
                    
                    await asyncio.sleep(1)  # Rate limiting
                    
                except Exception as e:
                    print(f"  Error: {e}")
        
        return self
    
    def _calculate_influence(self, profile) -> float:
        """Calculate influence score 0-100"""
        
        # Follower count (log scale)
        import math
        follower_score = min(math.log10(profile.followers_count + 1) * 20, 40)
        
        # Follower/following ratio
        ratio = profile.followers_count / max(profile.following_count, 1)
        ratio_score = min(ratio * 10, 30)
        
        # Engagement (if available)
        engagement_score = 20  # Default
        
        # Verification bonus
        verified_score = 10 if profile.verified else 0
        
        return min(follower_score + ratio_score + engagement_score + verified_score, 100)
    
    def find_key_connectors(self, top_n: int = 10):
        """
        Find bridge nodes - people who connect different clusters.
        High betweenness centrality = key connector.
        """
        
        # Simple approach: count unique connections
        connection_diversity = {}
        
        for username, node in self.nodes.items():
            # Count how many different people this user connects
            connections = set(node.connections)
            
            # Add reverse connections
            for edge in self.edges:
                if edge["target"] == username:
                    connections.add(edge["source"])
            
            connection_diversity[username] = {
                "total_connections": len(connections),
                "unique_ratio": len(connections) / max(node.following, 1),
                "influence": node.influence_score
            }
        
        # Score = connections * influence
        scored = {
            u: data["total_connections"] * data["influence"] / 100
            for u, data in connection_diversity.items()
        }
        
        return sorted(scored.items(), key=lambda x: -x[1])[:top_n]
    
    def find_clusters(self):
        """Identify community clusters"""
        
        # Simple clustering: group by shared connections
        from collections import Counter
        
        clusters = {}
        
        for username, node in self.nodes.items():
            # Find most common connections among this user's network
            connection_counts = Counter()
            
            for connected in node.connections:
                if connected in self.nodes:
                    for their_connection in self.nodes[connected].connections:
                        connection_counts[their_connection] += 1
            
            # Cluster = most connected hub
            if connection_counts:
                cluster_center = connection_counts.most_common(1)[0][0]
                clusters[username] = cluster_center
        
        # Group by cluster
        cluster_groups = defaultdict(list)
        for user, cluster in clusters.items():
            cluster_groups[cluster].append(user)
        
        return dict(cluster_groups)
    
    def find_hidden_influencers(self, min_connections: int = 5):
        """
        Find users who are followed by many influential people
        but aren't famous themselves.
        """
        
        # Count how many times each user is followed
        followed_by = defaultdict(list)
        
        for edge in self.edges:
            target = edge["target"]
            source = edge["source"]
            
            if source in self.nodes:
                followed_by[target].append({
                    "username": source,
                    "influence": self.nodes[source].influence_score
                })
        
        # Score: sum of followers' influence / own follower count
        hidden_scores = {}
        
        for username, followers_data in followed_by.items():
            if len(followers_data) < min_connections:
                continue
            
            total_influence = sum(f["influence"] for f in followers_data)
            avg_influence = total_influence / len(followers_data)
            
            # If user is in our network, compare to their own influence
            if username in self.nodes:
                own_influence = self.nodes[username].influence_score
                # Hidden = followed by influential people but low own influence
                if own_influence < avg_influence:
                    hidden_scores[username] = {
                        "followers_influence": avg_influence,
                        "own_influence": own_influence,
                        "hidden_score": avg_influence - own_influence,
                        "influential_followers": [f["username"] for f in followers_data if f["influence"] > 50]
                    }
        
        return sorted(hidden_scores.items(), key=lambda x: -x[1]["hidden_score"])
    
    def export_for_visualization(self, filename: str = "network.json"):
        """Export for D3.js or Gephi visualization"""
        
        export_data = {
            "nodes": [
                {
                    "id": username,
                    "label": username,
                    "followers": node.followers,
                    "influence": node.influence_score,
                    "size": node.influence_score / 10
                }
                for username, node in self.nodes.items()
            ],
            "edges": self.edges
        }
        
        with open(filename, "w") as f:
            json.dump(export_data, f, indent=2)
        
        return filename

# Usage
async def map_influence_network():
    network = InfluenceNetwork()
    
    # Start from key accounts in your niche
    await network.build_network(
        seed_users=["influencer1", "influencer2", "competitor"],
        depth=2,
        max_connections=30
    )
    
    print("\n" + "="*60)
    print("🕸️ NETWORK ANALYSIS RESULTS")
    print("="*60)
    
    print(f"\nNodes: {len(network.nodes)}")
    print(f"Edges: {len(network.edges)}")
    
    # Key connectors
    print("\n🔗 KEY CONNECTORS (Bridge Nodes):")
    for user, score in network.find_key_connectors(5):
        print(f"   @{user}: {score:.1f}")
    
    # Hidden influencers
    print("\n🔍 HIDDEN INFLUENCERS:")
    for user, data in network.find_hidden_influencers()[:5]:
        print(f"   @{user}:")
        print(f"      Own influence: {data['own_influence']:.1f}")
        print(f"      Followers' avg influence: {data['followers_influence']:.1f}")
        print(f"      Followed by: {', '.join(data['influential_followers'][:3])}")
    
    # Clusters
    print("\n📊 COMMUNITY CLUSTERS:")
    clusters = network.find_clusters()
    for center, members in sorted(clusters.items(), key=lambda x: -len(x[1]))[:5]:
        print(f"   @{center} cluster: {len(members)} members")
    
    # Export
    network.export_for_visualization("network_data.json")
    print("\n✅ Exported to network_data.json for visualization")

asyncio.run(map_influence_network())
```

## Find Your Ideal Audience Network

```python
async def find_ideal_audience_network(
    your_username: str,
    ideal_profiles: list,  # Usernames of your best followers/customers
    expansion_depth: int = 2
):
    """
    Find more people like your best followers by mapping their network.
    
    Strategy:
    1. Take your best followers
    2. See who they follow
    3. Find common patterns
    4. Discover similar users
    """
    
    async with Xeepy() as x:
        # Step 1: Map ideal profiles
        common_follows = defaultdict(list)  # Who do ideal customers follow?
        
        for ideal_user in ideal_profiles:
            print(f"Analyzing @{ideal_user}...")
            
            following = await x.scrape.following(ideal_user, limit=100)
            
            for followed in following:
                common_follows[followed.username].append(ideal_user)
        
        # Step 2: Find accounts followed by multiple ideal customers
        # These are likely influencers in your ideal audience
        shared_interests = sorted(
            [(user, followers) for user, followers in common_follows.items()
             if len(followers) >= 2],
            key=lambda x: -len(x[1])
        )
        
        print("\n🎯 ACCOUNTS FOLLOWED BY MULTIPLE IDEAL CUSTOMERS:")
        for account, followers in shared_interests[:10]:
            profile = await x.scrape.profile(account)
            print(f"   @{account} ({profile.followers_count:,} followers)")
            print(f"      Followed by: {', '.join(followers)}")
        
        # Step 3: Find followers of shared interests who aren't your followers yet
        your_followers = {f.username for f in await x.scrape.followers(your_username, limit=1000)}
        
        potential_audience = defaultdict(int)
        
        for account, _ in shared_interests[:5]:
            followers = await x.scrape.followers(account, limit=200)
            
            for follower in followers:
                if follower.username not in your_followers:
                    potential_audience[follower.username] += 1
        
        # Step 4: Rank by overlap (followed multiple shared interests)
        lookalikes = sorted(
            [(user, count) for user, count in potential_audience.items()],
            key=lambda x: -x[1]
        )
        
        print("\n👥 LOOKALIKE AUDIENCE (follow these users!):")
        for user, overlap_score in lookalikes[:20]:
            profile = await x.scrape.profile(user)
            print(f"   @{user} (score: {overlap_score}, followers: {profile.followers_count:,})")
        
        return [user for user, _ in lookalikes[:100]]

asyncio.run(find_ideal_audience_network(
    your_username="your_username",
    ideal_profiles=["best_customer1", "best_customer2", "best_customer3"]
))
```

## Competitive Network Analysis

```python
async def competitive_network_analysis(your_username: str, competitor: str):
    """
    Analyze network overlap and unique advantages vs competitor.
    """
    
    async with Xeepy() as x:
        print(f"Comparing @{your_username} vs @{competitor}")
        
        # Get followers
        your_followers = {f.username for f in await x.scrape.followers(your_username, limit=1000)}
        their_followers = {f.username for f in await x.scrape.followers(competitor, limit=1000)}
        
        # Calculate overlaps
        shared = your_followers & their_followers
        only_yours = your_followers - their_followers
        only_theirs = their_followers - your_followers
        
        print(f"\n📊 AUDIENCE OVERLAP ANALYSIS")
        print("="*50)
        print(f"Your followers:       {len(your_followers):,}")
        print(f"Their followers:      {len(their_followers):,}")
        print(f"Shared audience:      {len(shared):,} ({len(shared)/len(your_followers)*100:.1f}%)")
        print(f"Unique to you:        {len(only_yours):,}")
        print(f"Unique to competitor: {len(only_theirs):,}")
        
        # Analyze unique competitor followers (opportunity)
        print(f"\n🎯 OPPORTUNITY: {len(only_theirs):,} users follow competitor but not you")
        print("   Sample accounts:")
        
        for username in list(only_theirs)[:10]:
            try:
                profile = await x.scrape.profile(username)
                print(f"   @{username}: {profile.followers_count:,} followers - {profile.bio[:50] if profile.bio else 'No bio'}...")
            except:
                pass
        
        return {
            "shared": list(shared),
            "only_yours": list(only_yours),
            "only_theirs": list(only_theirs),
            "overlap_percentage": len(shared) / len(your_followers) * 100
        }

asyncio.run(competitive_network_analysis("your_username", "competitor"))
```

## Engagement Network

```python
async def engagement_network(tweet_url: str):
    """
    Map the network of people who engaged with a specific tweet.
    Useful for understanding viral spread patterns.
    """
    
    async with Xeepy() as x:
        print(f"Analyzing engagement network for:\n{tweet_url}\n")
        
        # Get engagers
        likers = await x.scrape.likers(tweet_url, limit=200)
        retweeters = await x.scrape.retweeters(tweet_url, limit=200)
        
        # Combine and deduplicate
        all_engagers = {}
        
        for user in likers:
            all_engagers[user.username] = {"type": ["like"], "user": user}
        
        for user in retweeters:
            if user.username in all_engagers:
                all_engagers[user.username]["type"].append("retweet")
            else:
                all_engagers[user.username] = {"type": ["retweet"], "user": user}
        
        print(f"Total engagers: {len(all_engagers)}")
        print(f"Likers: {len(likers)}")
        print(f"Retweeters: {len(retweeters)}")
        
        # Analyze engager network
        # Who follows who among engagers?
        engager_connections = defaultdict(list)
        
        for username, data in list(all_engagers.items())[:50]:  # Sample for performance
            following = await x.scrape.following(username, limit=100)
            
            for followed in following:
                if followed.username in all_engagers:
                    engager_connections[username].append(followed.username)
        
        # Find super-connectors (people connected to many other engagers)
        connector_scores = {
            user: len(connections)
            for user, connections in engager_connections.items()
        }
        
        print("\n🔗 SUPER-CONNECTORS (amplified spread):")
        for user, score in sorted(connector_scores.items(), key=lambda x: -x[1])[:10]:
            data = all_engagers[user]
            print(f"   @{user}: connected to {score} other engagers")
            print(f"      Engagement: {', '.join(data['type'])}")
            print(f"      Followers: {data['user'].followers_count:,}")
        
        # Find engagement clusters
        print("\n📊 ENGAGEMENT CLUSTERS:")
        
        # Group by follower count
        tiers = {
            "mega (100k+)": [],
            "macro (10k-100k)": [],
            "micro (1k-10k)": [],
            "nano (<1k)": []
        }
        
        for username, data in all_engagers.items():
            followers = data["user"].followers_count
            if followers >= 100000:
                tiers["mega (100k+)"].append(username)
            elif followers >= 10000:
                tiers["macro (10k-100k)"].append(username)
            elif followers >= 1000:
                tiers["micro (1k-10k)"].append(username)
            else:
                tiers["nano (<1k)"].append(username)
        
        for tier, users in tiers.items():
            if users:
                total_reach = sum(all_engagers[u]["user"].followers_count for u in users)
                print(f"   {tier}: {len(users)} users, {total_reach:,} total reach")

asyncio.run(engagement_network("https://x.com/user/status/123"))
```

## Network Visualization

Generate visualizations using your data:

```python
async def generate_network_viz_data(seed_users: list):
    """Generate D3.js compatible network visualization data"""
    
    network = InfluenceNetwork()
    await network.build_network(seed_users, depth=2, max_connections=30)
    
    # Generate HTML visualization
    html_template = """
<!DOCTYPE html>
<html>
<head>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { margin: 0; overflow: hidden; }
        .node { cursor: pointer; }
        .link { stroke: #999; stroke-opacity: 0.6; }
        .label { font: 10px sans-serif; pointer-events: none; }
    </style>
</head>
<body>
    <script>
        const data = NETWORK_DATA;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const svg = d3.select("body").append("svg")
            .attr("width", width)
            .attr("height", height);
        
        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.edges).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));
        
        const link = svg.append("g")
            .selectAll("line")
            .data(data.edges)
            .join("line")
            .attr("class", "link");
        
        const node = svg.append("g")
            .selectAll("circle")
            .data(data.nodes)
            .join("circle")
            .attr("class", "node")
            .attr("r", d => Math.sqrt(d.influence) * 2)
            .attr("fill", d => d3.interpolateViridis(d.influence / 100))
            .call(drag(simulation));
        
        const label = svg.append("g")
            .selectAll("text")
            .data(data.nodes)
            .join("text")
            .attr("class", "label")
            .text(d => "@" + d.label);
        
        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            node.attr("cx", d => d.x).attr("cy", d => d.y);
            label.attr("x", d => d.x + 10).attr("y", d => d.y + 3);
        });
        
        function drag(simulation) {
            return d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null; d.fy = null;
                });
        }
    </script>
</body>
</html>
"""
    
    # Export network data
    network_json = network.export_for_visualization("network_data.json")
    
    # Read and embed in HTML
    with open(network_json) as f:
        data = f.read()
    
    html = html_template.replace("NETWORK_DATA", data)
    
    with open("network_visualization.html", "w") as f:
        f.write(html)
    
    print("✅ Visualization saved to network_visualization.html")
    print("   Open in browser to view interactive network map")

asyncio.run(generate_network_viz_data(["user1", "user2", "user3"]))
```

## Best Practices

!!! tip "Network Analysis Tips"
    - Start with 3-5 seed users for manageable networks
    - Depth 2 gives good insights without overwhelming data
    - Focus on connection patterns, not just follower counts
    - Look for hidden influencers (high influence followers, low profile)
    - Export to Gephi for advanced analysis

!!! warning "Rate Limiting"
    Network analysis requires many API calls. Use:
    - Aggressive rate limiting
    - Caching of profile data
    - Sampling for large networks
    - Background processing for deep analysis

## Next Steps

[:octicons-arrow-right-24: Trend Prediction](trend-prediction.md) - Predict emerging trends

[:octicons-arrow-right-24: Influencer Mapping](../business/influencer-mapping.md) - Find influencers to partner with

[:octicons-arrow-right-24: Sentiment Dashboard](sentiment-dashboard.md) - Combine with sentiment analysis
