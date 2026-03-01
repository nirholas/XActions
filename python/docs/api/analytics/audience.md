# AudienceAnalytics

Analyze audience demographics, interests, and behavior.

## Import

```python
from xeepy.analytics.audience import AudienceAnalytics
```

## Class Signature

```python
class AudienceAnalytics:
    def __init__(
        self,
        browser_manager: BrowserManager,
        storage: Optional[Storage] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_manager` | `BrowserManager` | Required | Browser manager instance |
| `storage` | `Optional[Storage]` | `None` | Storage for historical data |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `analyze(username)` | `AudienceAnalysis` | Full audience analysis |
| `demographics(username)` | `Demographics` | Audience demographics |
| `interests(username)` | `InterestAnalysis` | Audience interests |
| `quality_score(username)` | `QualityReport` | Follower quality |
| `active_followers(username)` | `List[User]` | Most engaged followers |

### `analyze`

```python
async def analyze(
    self,
    username: Optional[str] = None,
    sample_size: int = 500
) -> AudienceAnalysis
```

Comprehensive audience analysis.

**Parameters:**
- `username`: Account to analyze
- `sample_size`: Number of followers to sample

### `quality_score`

```python
async def quality_score(
    self,
    username: Optional[str] = None
) -> QualityReport
```

Calculate follower quality score.

### `active_followers`

```python
async def active_followers(
    self,
    username: Optional[str] = None,
    limit: int = 100
) -> List[User]
```

Get most engaged followers.

## AudienceAnalysis Object

```python
@dataclass
class AudienceAnalysis:
    username: str                    # Account analyzed
    total_followers: int             # Total follower count
    sample_size: int                 # Followers sampled
    demographics: Demographics       # Demographic data
    interests: InterestAnalysis      # Interest data
    quality_score: float             # 0-100 quality score
    active_percentage: float         # % of active followers
    influencer_followers: int        # Followers with 10K+
    verified_followers: int          # Verified followers
```

## Demographics Object

```python
@dataclass
class Demographics:
    locations: Dict[str, float]      # Location distribution
    languages: Dict[str, float]      # Language distribution
    account_ages: Dict[str, float]   # Account age distribution
    follower_ranges: Dict[str, float] # Follower count ranges
```

## InterestAnalysis Object

```python
@dataclass
class InterestAnalysis:
    top_interests: List[str]         # Common interests
    common_hashtags: List[str]       # Frequently used hashtags
    common_follows: List[str]        # Commonly followed accounts
    bio_keywords: Dict[str, int]     # Common bio keywords
```

## QualityReport Object

```python
@dataclass
class QualityReport:
    overall_score: float             # 0-100 score
    real_followers: float            # % real accounts
    active_followers: float          # % active (posted recently)
    engaged_followers: float         # % who engage
    bot_score: float                 # Estimated bot %
    suspicious_accounts: int         # Suspicious count
```

## Usage Examples

### Full Audience Analysis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        analysis = await x.analytics.audience("username")
        
        print(f"=== Audience Analysis ===")
        print(f"Total followers: {analysis.total_followers:,}")
        print(f"Quality score: {analysis.quality_score:.0f}/100")
        print(f"Active followers: {analysis.active_percentage:.1f}%")
        print(f"Influencer followers (10K+): {analysis.influencer_followers:,}")
        print(f"Verified followers: {analysis.verified_followers:,}")

asyncio.run(main())
```

### Demographic Breakdown

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        demo = await x.analytics.audience_demographics("username")
        
        print(f"=== Demographics ===")
        
        print(f"\nTop locations:")
        for loc, pct in list(demo.locations.items())[:5]:
            print(f"  {loc}: {pct:.1f}%")
        
        print(f"\nLanguages:")
        for lang, pct in list(demo.languages.items())[:5]:
            print(f"  {lang}: {pct:.1f}%")
        
        print(f"\nFollower ranges:")
        for range_name, pct in demo.follower_ranges.items():
            print(f"  {range_name}: {pct:.1f}%")

asyncio.run(main())
```

### Interest Analysis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        interests = await x.analytics.audience_interests("username")
        
        print(f"=== Audience Interests ===")
        
        print(f"\nTop interests:")
        for interest in interests.top_interests[:10]:
            print(f"  - {interest}")
        
        print(f"\nCommon hashtags:")
        for hashtag in interests.common_hashtags[:10]:
            print(f"  - {hashtag}")
        
        print(f"\nAlso follow:")
        for account in interests.common_follows[:10]:
            print(f"  - @{account}")

asyncio.run(main())
```

### Follower Quality Score

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        quality = await x.analytics.audience_quality("username")
        
        print(f"=== Follower Quality Report ===")
        print(f"Overall score: {quality.overall_score:.0f}/100")
        print(f"Real followers: {quality.real_followers:.1f}%")
        print(f"Active followers: {quality.active_followers:.1f}%")
        print(f"Engaged followers: {quality.engaged_followers:.1f}%")
        print(f"Estimated bots: {quality.bot_score:.1f}%")
        print(f"Suspicious accounts: {quality.suspicious_accounts:,}")
        
        if quality.overall_score >= 80:
            print("\n✓ High quality audience!")
        elif quality.overall_score >= 60:
            print("\n⚠️ Moderate quality, room for improvement")
        else:
            print("\n❌ Low quality, consider cleaning followers")

asyncio.run(main())
```

### Find Active Followers

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        active = await x.analytics.active_followers("username", limit=50)
        
        print(f"=== Most Active Followers ===")
        for user in active:
            print(f"@{user.username}")
            print(f"  Followers: {user.followers_count:,}")
            print(f"  Engagement score: {user.engagement_score:.1f}")

asyncio.run(main())
```

### Find Influential Followers

```python
from xeepy import Xeepy

async def find_influencers(username: str, min_followers: int = 10000):
    async with Xeepy() as x:
        analysis = await x.analytics.audience(username, sample_size=1000)
        followers = await x.scrape.followers(username, limit=1000)
        
        influencers = [
            f for f in followers.items
            if f.followers_count >= min_followers
        ]
        
        influencers.sort(key=lambda f: f.followers_count, reverse=True)
        
        print(f"Found {len(influencers)} influential followers:")
        for user in influencers[:20]:
            verified = "✓" if user.is_verified else ""
            print(f"  @{user.username} {verified} - {user.followers_count:,} followers")

asyncio.run(find_influencers("myaccount"))
```

### Export Audience Report

```python
from xeepy import Xeepy

async def export_audience_report(username: str):
    async with Xeepy() as x:
        analysis = await x.analytics.audience(username)
        
        report = {
            "username": username,
            "total_followers": analysis.total_followers,
            "quality_score": analysis.quality_score,
            "active_percentage": analysis.active_percentage,
            "demographics": {
                "locations": analysis.demographics.locations,
                "languages": analysis.demographics.languages
            },
            "interests": {
                "top_interests": analysis.interests.top_interests[:20],
                "common_hashtags": analysis.interests.common_hashtags[:20],
                "also_follow": analysis.interests.common_follows[:20]
            }
        }
        
        x.export.to_json([report], f"audience_{username}.json")
        print(f"Audience report exported")

asyncio.run(export_audience_report("myaccount"))
```

### Compare Audience Overlap

```python
from xeepy import Xeepy

async def compare_audiences(account1: str, account2: str):
    async with Xeepy() as x:
        followers1 = await x.scrape.followers(account1, limit=2000)
        followers2 = await x.scrape.followers(account2, limit=2000)
        
        set1 = {f.username for f in followers1.items}
        set2 = {f.username for f in followers2.items}
        
        overlap = set1.intersection(set2)
        
        print(f"Audience Overlap Analysis")
        print(f"@{account1} followers: {len(set1):,}")
        print(f"@{account2} followers: {len(set2):,}")
        print(f"Overlap: {len(overlap):,}")
        print(f"Overlap %: {len(overlap) / len(set1) * 100:.1f}%")

asyncio.run(compare_audiences("account1", "account2"))
```

## See Also

- [GrowthAnalytics](growth.md) - Growth analysis
- [CompetitorAnalytics](competitors.md) - Competitor analysis
- [FollowersScraper](../scrapers/followers.md) - Get followers
