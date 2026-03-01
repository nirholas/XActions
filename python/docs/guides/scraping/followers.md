# Followers Scraping

Extract and analyze follower lists with filtering and export options.

## Basic Follower Scraping

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Get followers with limit
    followers = await x.scrape.followers("elonmusk", limit=1000)
    
    print(f"Scraped {len(followers)} followers")
    
    for follower in followers[:10]:
        print(f"@{follower.username}: {follower.followers_count:,} followers")
```

## Follower Data Model

```python
@dataclass
class Follower:
    user_id: str
    username: str
    name: str
    bio: str
    followers_count: int
    following_count: int
    verified: bool
    profile_image_url: str
    followed_at: datetime  # When they followed (if available)
```

## Advanced Scraping Options

### With Filtering

```python
async with Xeepy() as x:
    # Scrape all followers (no limit)
    all_followers = await x.scrape.followers("target_user")
    
    # Filter by follower count
    verified_only = await x.scrape.followers(
        "target_user",
        min_followers=10000,
        verified_only=True
    )
    
    # Filter by account age
    established = await x.scrape.followers(
        "target_user",
        min_account_age_days=365
    )
```

### With Progress Tracking

```python
async def scrape_with_progress(username: str, target: int = 10000):
    """Scrape large follower lists with progress updates"""
    
    async with Xeepy() as x:
        followers = []
        cursor = None
        
        while len(followers) < target:
            batch, cursor = await x.scrape.followers_batch(
                username,
                cursor=cursor,
                batch_size=200
            )
            
            followers.extend(batch)
            progress = min(len(followers) / target * 100, 100)
            print(f"Progress: {progress:.1f}% ({len(followers):,} followers)")
            
            if not cursor:  # No more results
                break
        
        return followers[:target]

followers = await scrape_with_progress("target_user", 50000)
```

### Resumable Scraping

```python
import json

async def resumable_follower_scrape(username: str, state_file: str = None):
    """Resume scraping from where you left off"""
    
    state_file = state_file or f"{username}_followers_state.json"
    
    # Load previous state
    try:
        with open(state_file) as f:
            state = json.load(f)
            followers = state["followers"]
            cursor = state["cursor"]
            print(f"Resuming from {len(followers)} followers")
    except FileNotFoundError:
        followers = []
        cursor = None
    
    async with Xeepy() as x:
        try:
            while True:
                batch, cursor = await x.scrape.followers_batch(
                    username,
                    cursor=cursor,
                    batch_size=200
                )
                
                if not batch:
                    break
                
                followers.extend([{
                    "username": f.username,
                    "name": f.name,
                    "followers_count": f.followers_count
                } for f in batch])
                
                print(f"Total: {len(followers)}")
                
                # Save state periodically
                if len(followers) % 1000 == 0:
                    with open(state_file, "w") as f:
                        json.dump({"followers": followers, "cursor": cursor}, f)
                
        except KeyboardInterrupt:
            print("Interrupted, saving state...")
        finally:
            with open(state_file, "w") as f:
                json.dump({"followers": followers, "cursor": cursor}, f)
    
    return followers
```

## Follower Analysis

### Audience Segmentation

```python
async def segment_followers(username: str, limit: int = 1000):
    """Segment followers by size and characteristics"""
    
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=limit)
        
        segments = {
            "mega_influencers": [],      # 1M+
            "macro_influencers": [],     # 100k-1M
            "micro_influencers": [],     # 10k-100k
            "nano_influencers": [],      # 1k-10k
            "regular_users": [],         # <1k
            "verified_users": [],
            "new_accounts": [],          # <30 days old
        }
        
        for f in followers:
            # By follower count
            if f.followers_count >= 1_000_000:
                segments["mega_influencers"].append(f)
            elif f.followers_count >= 100_000:
                segments["macro_influencers"].append(f)
            elif f.followers_count >= 10_000:
                segments["micro_influencers"].append(f)
            elif f.followers_count >= 1_000:
                segments["nano_influencers"].append(f)
            else:
                segments["regular_users"].append(f)
            
            # Additional segments
            if f.verified:
                segments["verified_users"].append(f)
        
        # Print summary
        print(f"Audience Segmentation for @{username}")
        print("=" * 50)
        
        for segment, users in segments.items():
            pct = len(users) / len(followers) * 100
            print(f"{segment}: {len(users)} ({pct:.1f}%)")
        
        return segments
```

### Geographic Analysis (from bios)

```python
import re
from collections import Counter

async def analyze_follower_locations(username: str, limit: int = 1000):
    """Analyze follower locations from their bios"""
    
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=limit)
        
        # Common location patterns
        cities = Counter()
        countries = Counter()
        
        city_patterns = [
            r'(?i)new york|nyc|manhattan',
            r'(?i)los angeles|la|hollywood',
            r'(?i)san francisco|sf|bay area',
            r'(?i)london|uk',
            r'(?i)toronto|canada',
            r'(?i)paris|france',
            r'(?i)tokyo|japan',
            r'(?i)berlin|germany',
            r'(?i)sydney|australia',
        ]
        
        for f in followers:
            location = f"{f.bio} {f.location}".lower() if f.bio else ""
            
            for pattern in city_patterns:
                if re.search(pattern, location):
                    city = pattern.split('|')[0].replace(r'(?i)', '').title()
                    cities[city] += 1
        
        print("Top Locations in Follower Base:")
        for city, count in cities.most_common(10):
            pct = count / len(followers) * 100
            print(f"  {city}: {count} ({pct:.1f}%)")
        
        return cities
```

### Interest Analysis

```python
async def analyze_follower_interests(username: str, limit: int = 500):
    """Analyze common interests from follower bios"""
    
    interest_keywords = {
        "tech": ["developer", "engineer", "coding", "programmer", "software", "tech", "ai", "ml"],
        "crypto": ["crypto", "bitcoin", "web3", "nft", "blockchain", "defi", "ethereum"],
        "business": ["founder", "ceo", "entrepreneur", "startup", "investor", "vc"],
        "marketing": ["marketing", "growth", "seo", "brand", "content", "social media"],
        "design": ["designer", "ux", "ui", "creative", "art", "visual"],
        "finance": ["finance", "trading", "stocks", "investment", "fintech"],
        "writing": ["writer", "author", "blogger", "journalist", "content creator"],
    }
    
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=limit)
        
        interest_counts = Counter()
        
        for f in followers:
            bio = f.bio.lower() if f.bio else ""
            
            for interest, keywords in interest_keywords.items():
                if any(kw in bio for kw in keywords):
                    interest_counts[interest] += 1
        
        print(f"Interest Distribution for @{username}'s followers:")
        print("=" * 50)
        
        for interest, count in interest_counts.most_common():
            pct = count / len(followers) * 100
            bar = "█" * int(pct / 2)
            print(f"{interest:12} {bar} {pct:.1f}%")
        
        return interest_counts
```

## Comparison Operations

### Find Mutual Followers

```python
async def find_mutual_followers(user1: str, user2: str, limit: int = 1000):
    """Find users who follow both accounts"""
    
    async with Xeepy() as x:
        followers1 = await x.scrape.followers(user1, limit=limit)
        followers2 = await x.scrape.followers(user2, limit=limit)
        
        set1 = {f.username for f in followers1}
        set2 = {f.username for f in followers2}
        
        mutual = set1 & set2
        only_user1 = set1 - set2
        only_user2 = set2 - set1
        
        print(f"Follower Comparison: @{user1} vs @{user2}")
        print("=" * 50)
        print(f"@{user1} followers: {len(set1)}")
        print(f"@{user2} followers: {len(set2)}")
        print(f"Mutual followers: {len(mutual)}")
        print(f"Overlap: {len(mutual) / min(len(set1), len(set2)) * 100:.1f}%")
        
        return {
            "mutual": list(mutual),
            "only_user1": list(only_user1),
            "only_user2": list(only_user2)
        }
```

### Find Influencer Overlap

```python
async def find_influential_shared_followers(accounts: list, limit: int = 500):
    """Find influential users who follow multiple accounts"""
    
    async with Xeepy() as x:
        all_followers = {}
        
        for account in accounts:
            followers = await x.scrape.followers(account, limit=limit)
            for f in followers:
                if f.username not in all_followers:
                    all_followers[f.username] = {
                        "user": f,
                        "follows": []
                    }
                all_followers[f.username]["follows"].append(account)
        
        # Find users following multiple accounts
        multi_followers = {
            username: data
            for username, data in all_followers.items()
            if len(data["follows"]) >= 2
        }
        
        # Sort by follower count
        influential = sorted(
            multi_followers.items(),
            key=lambda x: -x[1]["user"].followers_count
        )
        
        print(f"Influential users following multiple accounts:")
        for username, data in influential[:20]:
            user = data["user"]
            accounts_followed = ", ".join(data["follows"])
            print(f"  @{username} ({user.followers_count:,} followers)")
            print(f"    Follows: {accounts_followed}")
        
        return influential
```

## Export Options

```python
async with Xeepy() as x:
    followers = await x.scrape.followers("target_user", limit=1000)
    
    # Basic export
    x.export.to_csv(followers, "followers.csv")
    x.export.to_json(followers, "followers.json")
    x.export.to_excel(followers, "followers.xlsx")
    
    # Custom fields
    x.export.to_csv(
        followers,
        "followers_simple.csv",
        fields=["username", "followers_count", "bio"]
    )
    
    # With analytics
    x.export.to_csv(
        followers,
        "followers_analyzed.csv",
        fields=["username", "followers_count", "following_count", "ratio"],
        computed_fields={
            "ratio": lambda f: f.followers_count / max(f.following_count, 1)
        }
    )
```

## Best Practices

!!! tip "Large Scrapes"
    - Use resumable scraping for 10k+ followers
    - Save state frequently to handle interruptions
    - Consider overnight runs for massive accounts
    - Use cursor-based pagination

!!! warning "Rate Limits"
    - Built-in rate limiting protects your account
    - Large accounts may take hours to fully scrape
    - Sample smaller sets for quick analysis

!!! info "Data Freshness"
    - Follower data changes constantly
    - Cache results with timestamps
    - Re-scrape periodically for tracking

## Next Steps

[:octicons-arrow-right-24: Following Scraping](following.md) - Scrape who users follow

[:octicons-arrow-right-24: Unfollower Tracking](../monitoring/unfollowers.md) - Detect unfollows

[:octicons-arrow-right-24: Network Analysis](../../cookbook/data-science/network-analysis.md) - Map influence networks
