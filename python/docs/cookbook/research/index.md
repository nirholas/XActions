# Research & Analysis Cookbook

Academic and professional research techniques using X/Twitter data.

---

## 🔬 Academic Research Framework

Build a research-grade data collection system.

```python
"""
Academic Research Framework
Ethical, reproducible Twitter research methodology
"""

import asyncio
import hashlib
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

@dataclass
class ResearchMetadata:
    """Metadata for research dataset."""
    study_id: str
    researcher: str
    institution: str
    irb_approval: Optional[str]
    research_question: str
    data_collection_start: datetime
    data_collection_end: Optional[datetime]
    sampling_method: str
    ethical_considerations: list
    data_processing_notes: list


@dataclass
class DataCollectionLog:
    """Audit log for data collection."""
    timestamp: datetime
    operation: str
    parameters: dict
    records_collected: int
    errors: list
    checksum: str


class AcademicResearcher:
    """Framework for ethical Twitter research."""
    
    def __init__(self, xeepy, metadata: ResearchMetadata):
        self.x = xeepy
        self.metadata = metadata
        self.collection_logs: list[DataCollectionLog] = []
        
        # Setup directories
        self.data_dir = Path(f"research_{metadata.study_id}")
        self.data_dir.mkdir(exist_ok=True)
        (self.data_dir / "raw").mkdir(exist_ok=True)
        (self.data_dir / "processed").mkdir(exist_ok=True)
        (self.data_dir / "logs").mkdir(exist_ok=True)
    
    def _anonymize_user(self, user: dict) -> dict:
        """Anonymize user data for privacy."""
        # Create consistent pseudonym
        user_hash = hashlib.sha256(
            user.get("username", "").encode()
        ).hexdigest()[:12]
        
        return {
            "id_hash": user_hash,
            "follower_range": self._bucket_followers(user.get("followers", 0)),
            "account_age_category": self._categorize_age(user.get("created_at")),
            "verified": user.get("verified", False),
            "bio_length": len(user.get("bio", "") or ""),
            # Remove: username, name, profile_image, etc.
        }
    
    def _bucket_followers(self, count: int) -> str:
        """Bucket follower count for privacy."""
        if count < 100:
            return "<100"
        elif count < 1000:
            return "100-999"
        elif count < 10000:
            return "1K-10K"
        elif count < 100000:
            return "10K-100K"
        else:
            return ">100K"
    
    def _categorize_age(self, created_at) -> str:
        """Categorize account age."""
        if not created_at:
            return "unknown"
        
        age_days = (datetime.now() - created_at).days
        
        if age_days < 90:
            return "new (<3mo)"
        elif age_days < 365:
            return "recent (3mo-1y)"
        elif age_days < 365 * 3:
            return "established (1-3y)"
        else:
            return "veteran (>3y)"
    
    async def collect_conversation_network(
        self,
        seed_tweets: list[str],
        depth: int = 2,
        anonymize: bool = True
    ) -> dict:
        """Collect conversation network from seed tweets."""
        network = {
            "nodes": [],
            "edges": [],
            "tweets": []
        }
        
        visited = set()
        queue = [(url, 0) for url in seed_tweets]
        
        while queue:
            tweet_url, current_depth = queue.pop(0)
            
            if tweet_url in visited or current_depth > depth:
                continue
            
            visited.add(tweet_url)
            
            try:
                replies = await self.x.scrape.replies(tweet_url, limit=100)
                
                for reply in replies.items:
                    # Process tweet
                    tweet_data = {
                        "id_hash": hashlib.sha256(reply.id.encode()).hexdigest()[:12],
                        "text": reply.text if not anonymize else self._anonymize_text(reply.text),
                        "created_at": reply.created_at.isoformat(),
                        "engagement": {
                            "likes": reply.likes or 0,
                            "retweets": reply.retweets or 0,
                            "replies": reply.replies or 0
                        }
                    }
                    
                    if anonymize:
                        tweet_data["author"] = self._anonymize_user(asdict(reply.author))
                    
                    network["tweets"].append(tweet_data)
                    
                    # Add to queue for further exploration
                    if current_depth < depth:
                        queue.append((reply.url, current_depth + 1))
                
            except Exception as e:
                self._log_error("collect_conversation", str(e))
        
        self._log_collection("conversation_network", {
            "seed_tweets": len(seed_tweets),
            "depth": depth
        }, len(network["tweets"]))
        
        return network
    
    def _anonymize_text(self, text: str) -> str:
        """Basic text anonymization."""
        import re
        
        # Remove @mentions
        text = re.sub(r'@\w+', '@[USER]', text)
        
        # Remove URLs
        text = re.sub(r'https?://\S+', '[URL]', text)
        
        # Remove potential names (basic)
        # Note: More sophisticated NER would be needed for production
        
        return text
    
    async def collect_hashtag_sample(
        self,
        hashtag: str,
        sample_size: int,
        sampling_method: str = "chronological"
    ) -> list[dict]:
        """Collect stratified sample from hashtag."""
        tweets = await self.x.scrape.hashtag(
            f"#{hashtag}",
            limit=sample_size * 2  # Oversample for filtering
        )
        
        # Apply sampling method
        if sampling_method == "chronological":
            sample = tweets.items[:sample_size]
        elif sampling_method == "random":
            import random
            sample = random.sample(
                tweets.items,
                min(sample_size, len(tweets.items))
            )
        elif sampling_method == "stratified_engagement":
            # Stratify by engagement level
            sorted_tweets = sorted(
                tweets.items,
                key=lambda t: (t.likes or 0) + (t.retweets or 0)
            )
            
            # Take from each quartile
            quartile_size = len(sorted_tweets) // 4
            sample = []
            for i in range(4):
                start = i * quartile_size
                end = start + (sample_size // 4)
                sample.extend(sorted_tweets[start:end])
        else:
            sample = tweets.items[:sample_size]
        
        self._log_collection("hashtag_sample", {
            "hashtag": hashtag,
            "method": sampling_method
        }, len(sample))
        
        return [self._process_tweet_for_research(t) for t in sample]
    
    def _process_tweet_for_research(self, tweet) -> dict:
        """Process tweet for research use."""
        return {
            "id_hash": hashlib.sha256(tweet.id.encode()).hexdigest()[:12],
            "text": tweet.text,
            "created_at": tweet.created_at.isoformat() if tweet.created_at else None,
            "likes": tweet.likes or 0,
            "retweets": tweet.retweets or 0,
            "replies": tweet.replies or 0,
            "has_media": bool(getattr(tweet, 'media', None)),
            "has_url": 'http' in tweet.text,
            "has_hashtags": '#' in tweet.text,
            "tweet_length": len(tweet.text),
            "author_anonymized": self._anonymize_user(
                asdict(tweet.author) if hasattr(tweet.author, '__dict__') else {}
            )
        }
    
    def _log_collection(self, operation: str, params: dict, count: int):
        """Log data collection operation."""
        log = DataCollectionLog(
            timestamp=datetime.now(),
            operation=operation,
            parameters=params,
            records_collected=count,
            errors=[],
            checksum=hashlib.sha256(
                json.dumps(params, sort_keys=True).encode()
            ).hexdigest()[:16]
        )
        self.collection_logs.append(log)
    
    def _log_error(self, operation: str, error: str):
        """Log collection error."""
        if self.collection_logs:
            self.collection_logs[-1].errors.append(error)
    
    def export_dataset(self, data: list, filename: str):
        """Export dataset with metadata."""
        export = {
            "metadata": asdict(self.metadata),
            "collection_logs": [
                {
                    "timestamp": log.timestamp.isoformat(),
                    "operation": log.operation,
                    "parameters": log.parameters,
                    "records_collected": log.records_collected,
                    "errors": log.errors,
                    "checksum": log.checksum
                }
                for log in self.collection_logs
            ],
            "data": data
        }
        
        filepath = self.data_dir / "processed" / filename
        with open(filepath, 'w') as f:
            json.dump(export, f, indent=2, default=str)
        
        print(f"✅ Dataset exported to {filepath}")
        print(f"   Records: {len(data)}")
        print(f"   Checksum: {hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()[:16]}")


# Usage
async def run_research():
    from xeepy import Xeepy
    
    metadata = ResearchMetadata(
        study_id="twitter_discourse_2024",
        researcher="Dr. Jane Smith",
        institution="University Example",
        irb_approval="IRB-2024-001",
        research_question="How do conversation dynamics differ across topic communities?",
        data_collection_start=datetime.now(),
        data_collection_end=None,
        sampling_method="stratified_engagement",
        ethical_considerations=[
            "Data anonymized before analysis",
            "No individual identification attempted",
            "Public tweets only"
        ],
        data_processing_notes=[]
    )
    
    async with Xeepy() as x:
        researcher = AcademicResearcher(x, metadata)
        
        # Collect data
        sample = await researcher.collect_hashtag_sample(
            "academictwitter",
            sample_size=500,
            sampling_method="stratified_engagement"
        )
        
        # Export
        researcher.export_dataset(sample, "hashtag_sample.json")

asyncio.run(run_research())
```

---

## 📊 Discourse Analysis Toolkit

Analyze public discourse and narratives.

```python
"""
Discourse Analysis Toolkit
Study narratives, framing, and public discourse on Twitter
"""

import asyncio
from collections import Counter, defaultdict
from datetime import datetime
import re

class DiscourseAnalyzer:
    """Analyze Twitter discourse patterns."""
    
    def __init__(self, xeepy):
        self.x = xeepy
    
    async def analyze_framing(
        self,
        topic: str,
        sample_size: int = 500
    ) -> dict:
        """Analyze how a topic is framed in discourse."""
        tweets = await self.x.scrape.search(topic, limit=sample_size)
        
        analysis = {
            "topic": topic,
            "sample_size": len(tweets.items),
            "frames": defaultdict(list),
            "sentiment_distribution": {"positive": 0, "negative": 0, "neutral": 0},
            "key_terms": Counter(),
            "hashtag_clusters": defaultdict(int),
            "source_types": Counter()
        }
        
        for tweet in tweets.items:
            # Extract frames
            frames = self._identify_frames(tweet.text)
            for frame in frames:
                analysis["frames"][frame].append(tweet.text[:100])
            
            # Sentiment
            sentiment = self._simple_sentiment(tweet.text)
            analysis["sentiment_distribution"][sentiment] += 1
            
            # Key terms (bigrams)
            terms = self._extract_key_terms(tweet.text)
            analysis["key_terms"].update(terms)
            
            # Hashtag clusters
            hashtags = re.findall(r'#\w+', tweet.text.lower())
            for tag in hashtags:
                analysis["hashtag_clusters"][tag] += 1
            
            # Source type
            source = self._categorize_source(tweet.author)
            analysis["source_types"][source] += 1
        
        # Convert to serializable
        analysis["frames"] = dict(analysis["frames"])
        analysis["key_terms"] = dict(analysis["key_terms"].most_common(50))
        analysis["hashtag_clusters"] = dict(analysis["hashtag_clusters"])
        analysis["source_types"] = dict(analysis["source_types"])
        
        return analysis
    
    def _identify_frames(self, text: str) -> list[str]:
        """Identify framing patterns in text."""
        frames = []
        text_lower = text.lower()
        
        frame_patterns = {
            "economic": ["cost", "price", "money", "economy", "jobs", "business", "market"],
            "moral": ["right", "wrong", "should", "must", "duty", "responsible"],
            "conflict": ["fight", "battle", "war", "attack", "defend", "opposition"],
            "human_interest": ["story", "people", "family", "children", "personal"],
            "scientific": ["study", "research", "data", "evidence", "expert", "science"],
            "political": ["government", "policy", "politician", "vote", "election"],
            "security": ["safe", "danger", "threat", "protect", "risk", "security"]
        }
        
        for frame, keywords in frame_patterns.items():
            if any(kw in text_lower for kw in keywords):
                frames.append(frame)
        
        return frames if frames else ["unclassified"]
    
    def _simple_sentiment(self, text: str) -> str:
        """Simple sentiment classification."""
        positive = ["good", "great", "excellent", "amazing", "love", "best", "happy", "wonderful"]
        negative = ["bad", "terrible", "awful", "hate", "worst", "sad", "angry", "disappointed"]
        
        text_lower = text.lower()
        pos = sum(1 for w in positive if w in text_lower)
        neg = sum(1 for w in negative if w in text_lower)
        
        if pos > neg:
            return "positive"
        elif neg > pos:
            return "negative"
        return "neutral"
    
    def _extract_key_terms(self, text: str) -> list[str]:
        """Extract meaningful terms."""
        # Remove URLs, mentions
        text = re.sub(r'https?://\S+', '', text)
        text = re.sub(r'@\w+', '', text)
        text = re.sub(r'#', '', text)
        
        # Simple tokenization
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Remove common stopwords
        stopwords = {'the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'but', 'have', 'has'}
        words = [w for w in words if w not in stopwords]
        
        # Create bigrams
        bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]
        
        return bigrams
    
    def _categorize_source(self, author) -> str:
        """Categorize tweet author type."""
        if hasattr(author, 'verified') and author.verified:
            return "verified"
        elif hasattr(author, 'followers_count'):
            if author.followers_count > 100000:
                return "influencer"
            elif author.followers_count > 10000:
                return "micro_influencer"
            elif author.followers_count > 1000:
                return "active_user"
        return "regular_user"
    
    async def track_narrative_evolution(
        self,
        topic: str,
        days: int = 7,
        samples_per_day: int = 100
    ) -> dict:
        """Track how narratives evolve over time."""
        from datetime import timedelta
        
        evolution = {
            "topic": topic,
            "period_days": days,
            "daily_analysis": []
        }
        
        # Note: Would need date-filtered search
        # This is a simplified version
        
        for day_offset in range(days):
            day_data = {
                "day": day_offset,
                "frames": Counter(),
                "sentiment": Counter(),
                "top_terms": []
            }
            
            # In practice, you'd filter by date
            tweets = await self.x.scrape.search(
                topic,
                limit=samples_per_day
            )
            
            for tweet in tweets.items:
                frames = self._identify_frames(tweet.text)
                day_data["frames"].update(frames)
                day_data["sentiment"][self._simple_sentiment(tweet.text)] += 1
            
            day_data["frames"] = dict(day_data["frames"])
            day_data["sentiment"] = dict(day_data["sentiment"])
            
            evolution["daily_analysis"].append(day_data)
        
        return evolution


# Usage
async def analyze_discourse():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        analyzer = DiscourseAnalyzer(x)
        
        # Analyze framing
        analysis = await analyzer.analyze_framing(
            "climate change",
            sample_size=500
        )
        
        print("📊 Discourse Analysis Results")
        print(f"\nSentiment Distribution:")
        for sent, count in analysis["sentiment_distribution"].items():
            pct = (count / analysis["sample_size"]) * 100
            print(f"  {sent}: {pct:.1f}%")
        
        print(f"\nTop Frames:")
        for frame, examples in list(analysis["frames"].items())[:5]:
            print(f"  {frame}: {len(examples)} tweets")
        
        print(f"\nTop Terms:")
        for term, count in list(analysis["key_terms"].items())[:10]:
            print(f"  '{term}': {count}")

asyncio.run(analyze_discourse())
```

---

## 🌐 Network Analysis

Study social network structures and influence.

```python
"""
Social Network Analysis
Study network structures, influence, and information flow
"""

import asyncio
from collections import defaultdict
from dataclasses import dataclass
import json

@dataclass
class NetworkNode:
    """Node in social network."""
    id: str
    label: str
    followers: int = 0
    following: int = 0
    degree: int = 0
    in_degree: int = 0
    out_degree: int = 0
    betweenness: float = 0.0
    community: int = -1


class NetworkAnalyzer:
    """Analyze Twitter social networks."""
    
    def __init__(self, xeepy):
        self.x = xeepy
        self.nodes: dict[str, NetworkNode] = {}
        self.edges: list[tuple] = []
    
    async def build_follower_network(
        self,
        seed_users: list[str],
        depth: int = 1,
        sample_per_user: int = 100
    ) -> dict:
        """Build follower network from seed users."""
        visited = set()
        queue = [(user, 0) for user in seed_users]
        
        while queue:
            username, current_depth = queue.pop(0)
            
            if username in visited or current_depth > depth:
                continue
            
            visited.add(username)
            
            try:
                # Get profile
                profile = await self.x.scrape.profile(username)
                
                # Add node
                self.nodes[username] = NetworkNode(
                    id=username,
                    label=profile.name or username,
                    followers=profile.followers_count,
                    following=profile.following_count
                )
                
                # Get followers
                followers = await self.x.scrape.followers(
                    username,
                    limit=sample_per_user
                )
                
                for follower in followers.items:
                    # Add edge (follower -> user)
                    self.edges.append((follower.username, username))
                    
                    # Add follower node if not exists
                    if follower.username not in self.nodes:
                        self.nodes[follower.username] = NetworkNode(
                            id=follower.username,
                            label=follower.name or follower.username,
                            followers=getattr(follower, 'followers_count', 0),
                            following=getattr(follower, 'following_count', 0)
                        )
                    
                    # Queue for expansion
                    if current_depth < depth:
                        queue.append((follower.username, current_depth + 1))
                
            except Exception as e:
                print(f"Error processing @{username}: {e}")
        
        # Calculate network metrics
        self._calculate_degrees()
        
        return {
            "nodes": [vars(n) for n in self.nodes.values()],
            "edges": [{"source": e[0], "target": e[1]} for e in self.edges],
            "stats": self._network_stats()
        }
    
    def _calculate_degrees(self):
        """Calculate node degrees."""
        in_degrees = defaultdict(int)
        out_degrees = defaultdict(int)
        
        for source, target in self.edges:
            out_degrees[source] += 1
            in_degrees[target] += 1
        
        for username, node in self.nodes.items():
            node.in_degree = in_degrees.get(username, 0)
            node.out_degree = out_degrees.get(username, 0)
            node.degree = node.in_degree + node.out_degree
    
    def _network_stats(self) -> dict:
        """Calculate network-level statistics."""
        if not self.nodes:
            return {}
        
        degrees = [n.degree for n in self.nodes.values()]
        
        return {
            "num_nodes": len(self.nodes),
            "num_edges": len(self.edges),
            "avg_degree": sum(degrees) / len(degrees),
            "max_degree": max(degrees),
            "density": len(self.edges) / (len(self.nodes) * (len(self.nodes) - 1)) if len(self.nodes) > 1 else 0
        }
    
    def find_key_influencers(self, top_n: int = 10) -> list[dict]:
        """Find most influential nodes."""
        # Combine metrics for influence score
        scored = []
        for username, node in self.nodes.items():
            score = (
                node.in_degree * 0.4 +
                (node.followers / 1000) * 0.3 +
                node.degree * 0.3
            )
            scored.append({
                "username": username,
                "influence_score": score,
                "in_degree": node.in_degree,
                "followers": node.followers
            })
        
        return sorted(scored, key=lambda x: x["influence_score"], reverse=True)[:top_n]
    
    def find_bridges(self) -> list[str]:
        """Find bridge nodes connecting communities."""
        # Simple heuristic: nodes with high degree but connecting to many unique nodes
        bridges = []
        
        for username, node in self.nodes.items():
            if node.out_degree > 5 and node.in_degree > 5:
                # Check if connects to diverse set
                connections = set()
                for src, tgt in self.edges:
                    if src == username:
                        connections.add(tgt)
                    if tgt == username:
                        connections.add(src)
                
                if len(connections) > node.degree * 0.7:
                    bridges.append(username)
        
        return bridges
    
    def export_for_gephi(self, filename: str):
        """Export network for Gephi visualization."""
        # Export nodes
        nodes_csv = "Id,Label,Followers,Following,Degree\n"
        for username, node in self.nodes.items():
            nodes_csv += f"{username},{node.label},{node.followers},{node.following},{node.degree}\n"
        
        with open(f"{filename}_nodes.csv", "w") as f:
            f.write(nodes_csv)
        
        # Export edges
        edges_csv = "Source,Target\n"
        for source, target in self.edges:
            edges_csv += f"{source},{target}\n"
        
        with open(f"{filename}_edges.csv", "w") as f:
            f.write(edges_csv)
        
        print(f"✅ Exported to {filename}_nodes.csv and {filename}_edges.csv")


# Usage
async def analyze_network():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        analyzer = NetworkAnalyzer(x)
        
        # Build network
        network = await analyzer.build_follower_network(
            ["user1", "user2"],
            depth=1,
            sample_per_user=50
        )
        
        print(f"📊 Network Statistics:")
        print(f"   Nodes: {network['stats']['num_nodes']}")
        print(f"   Edges: {network['stats']['num_edges']}")
        print(f"   Density: {network['stats']['density']:.4f}")
        
        # Find influencers
        influencers = analyzer.find_key_influencers(10)
        print(f"\n🌟 Top Influencers:")
        for inf in influencers:
            print(f"   @{inf['username']}: score={inf['influence_score']:.2f}")
        
        # Export for visualization
        analyzer.export_for_gephi("twitter_network")

asyncio.run(analyze_network())
```

---

## 📈 Trend Detection & Analysis

Detect and analyze emerging trends.

```python
"""
Trend Detection System
Identify and analyze emerging trends in real-time
"""

import asyncio
from collections import Counter, defaultdict
from datetime import datetime, timedelta
import re

class TrendDetector:
    """Detect emerging trends on Twitter."""
    
    def __init__(self, xeepy):
        self.x = xeepy
        self.baseline_terms = Counter()
        self.current_terms = Counter()
        self.trend_history = []
    
    async def capture_baseline(
        self,
        topics: list[str],
        sample_size: int = 500
    ):
        """Capture baseline term frequencies."""
        all_terms = Counter()
        
        for topic in topics:
            tweets = await self.x.scrape.search(topic, limit=sample_size)
            
            for tweet in tweets.items:
                terms = self._extract_terms(tweet.text)
                all_terms.update(terms)
        
        self.baseline_terms = all_terms
        print(f"📊 Baseline captured: {len(all_terms)} unique terms")
    
    async def detect_emerging(
        self,
        topics: list[str],
        sample_size: int = 500,
        threshold: float = 2.0
    ) -> list[dict]:
        """Detect terms emerging above baseline."""
        current = Counter()
        
        for topic in topics:
            tweets = await self.x.scrape.search(topic, limit=sample_size)
            
            for tweet in tweets.items:
                terms = self._extract_terms(tweet.text)
                current.update(terms)
        
        self.current_terms = current
        
        # Find emerging terms
        emerging = []
        for term, count in current.most_common(100):
            baseline_count = self.baseline_terms.get(term, 1)
            ratio = count / baseline_count
            
            if ratio >= threshold and count >= 5:
                emerging.append({
                    "term": term,
                    "current_count": count,
                    "baseline_count": baseline_count,
                    "emergence_ratio": ratio
                })
        
        # Sort by emergence ratio
        emerging.sort(key=lambda x: x["emergence_ratio"], reverse=True)
        
        return emerging[:20]
    
    def _extract_terms(self, text: str) -> list[str]:
        """Extract meaningful terms from text."""
        # Clean
        text = re.sub(r'https?://\S+', '', text)
        text = re.sub(r'@\w+', '', text)
        
        # Extract hashtags
        hashtags = re.findall(r'#(\w+)', text.lower())
        
        # Extract words (3+ chars)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Simple stopword filter
        stopwords = {'the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'but', 'have', 'has', 'you', 'your'}
        words = [w for w in words if w not in stopwords]
        
        # Combine
        return hashtags + words
    
    async def analyze_trend(self, trend_term: str) -> dict:
        """Deep analysis of a specific trend."""
        tweets = await self.x.scrape.search(trend_term, limit=200)
        
        analysis = {
            "term": trend_term,
            "sample_size": len(tweets.items),
            "sentiment": {"positive": 0, "negative": 0, "neutral": 0},
            "co_occurring_hashtags": Counter(),
            "top_users": Counter(),
            "engagement_stats": {
                "total_likes": 0,
                "total_retweets": 0,
                "avg_engagement": 0
            },
            "sample_tweets": []
        }
        
        total_engagement = 0
        
        for tweet in tweets.items:
            # Sentiment
            sentiment = self._simple_sentiment(tweet.text)
            analysis["sentiment"][sentiment] += 1
            
            # Co-occurring hashtags
            hashtags = re.findall(r'#\w+', tweet.text.lower())
            for tag in hashtags:
                if tag.lower() != f"#{trend_term.lower()}":
                    analysis["co_occurring_hashtags"][tag] += 1
            
            # Top users
            analysis["top_users"][tweet.author.username] += 1
            
            # Engagement
            engagement = (tweet.likes or 0) + (tweet.retweets or 0)
            total_engagement += engagement
            analysis["engagement_stats"]["total_likes"] += tweet.likes or 0
            analysis["engagement_stats"]["total_retweets"] += tweet.retweets or 0
        
        if tweets.items:
            analysis["engagement_stats"]["avg_engagement"] = total_engagement / len(tweets.items)
        
        # Get top examples
        sorted_tweets = sorted(
            tweets.items,
            key=lambda t: (t.likes or 0) + (t.retweets or 0),
            reverse=True
        )
        analysis["sample_tweets"] = [
            {"text": t.text[:200], "engagement": (t.likes or 0) + (t.retweets or 0)}
            for t in sorted_tweets[:5]
        ]
        
        # Convert counters
        analysis["co_occurring_hashtags"] = dict(
            analysis["co_occurring_hashtags"].most_common(10)
        )
        analysis["top_users"] = dict(
            analysis["top_users"].most_common(10)
        )
        
        return analysis
    
    def _simple_sentiment(self, text: str) -> str:
        """Simple sentiment classification."""
        positive = ["good", "great", "love", "amazing", "best", "happy", "excited"]
        negative = ["bad", "terrible", "hate", "worst", "sad", "angry", "disappointed"]
        
        text_lower = text.lower()
        pos = sum(1 for w in positive if w in text_lower)
        neg = sum(1 for w in negative if w in text_lower)
        
        if pos > neg:
            return "positive"
        elif neg > pos:
            return "negative"
        return "neutral"


# Usage
async def detect_trends():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        detector = TrendDetector(x)
        
        # Capture baseline
        topics = ["technology", "AI", "startup"]
        await detector.capture_baseline(topics, sample_size=200)
        
        # Wait and detect emerging
        await asyncio.sleep(5)
        
        emerging = await detector.detect_emerging(topics, threshold=1.5)
        
        print("📈 Emerging Trends:")
        for trend in emerging[:10]:
            print(f"   '{trend['term']}': {trend['emergence_ratio']:.1f}x increase")
        
        # Analyze top trend
        if emerging:
            analysis = await detector.analyze_trend(emerging[0]["term"])
            print(f"\n🔍 Trend Analysis: {analysis['term']}")
            print(f"   Sentiment: {analysis['sentiment']}")
            print(f"   Avg Engagement: {analysis['engagement_stats']['avg_engagement']:.1f}")

asyncio.run(detect_trends())
```

---

## Next Steps

- [Business Recipes](../business/index.md) - Business applications
- [Data Science Recipes](../data-science/index.md) - ML and analytics
- [Academic Resources](../../community/index.md) - Community support
