# Profile Scraping

Get detailed user profile information including bios, stats, and metadata.

## Basic Profile Scraping

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Get single profile
    profile = await x.scrape.profile("elonmusk")
    
    print(f"Name: {profile.name}")
    print(f"Username: @{profile.username}")
    print(f"Bio: {profile.bio}")
    print(f"Followers: {profile.followers_count:,}")
    print(f"Following: {profile.following_count:,}")
    print(f"Tweets: {profile.tweets_count:,}")
    print(f"Verified: {profile.verified}")
    print(f"Created: {profile.created_at}")
    print(f"Location: {profile.location}")
    print(f"Website: {profile.website}")
```

## Profile Data Model

```python
@dataclass
class UserProfile:
    user_id: str
    username: str
    name: str
    bio: str
    location: str
    website: str
    created_at: datetime
    followers_count: int
    following_count: int
    tweets_count: int
    likes_count: int
    verified: bool
    profile_image_url: str
    profile_banner_url: str
    pinned_tweet_id: str
    is_protected: bool
```

## Batch Profile Scraping

```python
async def scrape_multiple_profiles(usernames: list):
    """Scrape profiles for multiple users"""
    
    async with Xeepy() as x:
        profiles = []
        
        for username in usernames:
            try:
                profile = await x.scrape.profile(username)
                profiles.append(profile)
                print(f"✓ @{username}")
            except Exception as e:
                print(f"✗ @{username}: {e}")
        
        # Export to CSV
        x.export.to_csv(profiles, "profiles.csv")
        
        return profiles

# Usage
usernames = ["user1", "user2", "user3", "user4"]
profiles = await scrape_multiple_profiles(usernames)
```

## Profile Analysis

### Follower-to-Following Ratio

```python
async def analyze_profile_quality(username: str):
    """Calculate engagement and influence metrics"""
    
    async with Xeepy() as x:
        profile = await x.scrape.profile(username)
        
        # Follower/following ratio
        ratio = profile.followers_count / max(profile.following_count, 1)
        
        # Account age
        age_days = (datetime.now() - profile.created_at).days
        
        # Growth rate (followers per day)
        growth_rate = profile.followers_count / max(age_days, 1)
        
        # Engagement estimate
        tweets_per_day = profile.tweets_count / max(age_days, 1)
        
        analysis = {
            "username": username,
            "followers": profile.followers_count,
            "following": profile.following_count,
            "ratio": round(ratio, 2),
            "account_age_days": age_days,
            "followers_per_day": round(growth_rate, 2),
            "tweets_per_day": round(tweets_per_day, 2),
            "quality_score": min(ratio * 10, 100)  # Simple score
        }
        
        return analysis

# Usage
analysis = await analyze_profile_quality("target_user")
print(f"Quality Score: {analysis['quality_score']}")
```

### Detect Bot/Fake Accounts

```python
async def detect_suspicious_profile(username: str):
    """Flag potentially fake or bot accounts"""
    
    async with Xeepy() as x:
        profile = await x.scrape.profile(username)
        
        red_flags = []
        score = 0
        
        # Check account age
        age_days = (datetime.now() - profile.created_at).days
        if age_days < 30:
            red_flags.append("Account less than 30 days old")
            score += 20
        
        # Check ratio
        ratio = profile.followers_count / max(profile.following_count, 1)
        if ratio < 0.1:
            red_flags.append("Very low follower ratio")
            score += 25
        
        # Check tweet count
        if profile.tweets_count < 10 and age_days > 30:
            red_flags.append("Very few tweets for account age")
            score += 15
        
        # Check for default profile
        if not profile.bio or len(profile.bio) < 10:
            red_flags.append("Missing or minimal bio")
            score += 10
        
        if not profile.profile_banner_url:
            red_flags.append("No profile banner")
            score += 10
        
        # Check for suspicious patterns
        if profile.following_count > 5000 and profile.followers_count < 100:
            red_flags.append("Mass following with few followers")
            score += 30
        
        return {
            "username": username,
            "suspicion_score": score,
            "red_flags": red_flags,
            "likely_bot": score >= 50
        }

# Check a list of users
async def audit_followers(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=100)
        
        suspicious = []
        for follower in followers:
            result = await detect_suspicious_profile(follower.username)
            if result["likely_bot"]:
                suspicious.append(result)
        
        print(f"Found {len(suspicious)} suspicious accounts out of {len(followers)}")
        return suspicious
```

## Profile Comparison

```python
async def compare_profiles(usernames: list):
    """Compare multiple profiles side by side"""
    
    async with Xeepy() as x:
        profiles = []
        
        for username in usernames:
            profile = await x.scrape.profile(username)
            profiles.append({
                "username": username,
                "followers": profile.followers_count,
                "following": profile.following_count,
                "tweets": profile.tweets_count,
                "ratio": profile.followers_count / max(profile.following_count, 1),
                "age_days": (datetime.now() - profile.created_at).days
            })
        
        # Print comparison table
        print(f"{'Username':<20} {'Followers':>12} {'Following':>12} {'Ratio':>8}")
        print("-" * 60)
        
        for p in sorted(profiles, key=lambda x: -x["followers"]):
            print(f"@{p['username']:<19} {p['followers']:>12,} {p['following']:>12,} {p['ratio']:>8.1f}")
        
        return profiles

# Compare competitors
await compare_profiles(["competitor1", "competitor2", "your_account"])
```

## Profile Changes Tracking

```python
import json
from datetime import datetime

async def track_profile_changes(username: str, history_file: str = None):
    """Track changes to a profile over time"""
    
    history_file = history_file or f"{username}_history.json"
    
    async with Xeepy() as x:
        profile = await x.scrape.profile(username)
        
        current = {
            "timestamp": datetime.now().isoformat(),
            "followers": profile.followers_count,
            "following": profile.following_count,
            "tweets": profile.tweets_count,
            "bio": profile.bio,
            "name": profile.name
        }
        
        # Load history
        try:
            with open(history_file) as f:
                history = json.load(f)
        except FileNotFoundError:
            history = []
        
        # Check for changes
        if history:
            last = history[-1]
            
            changes = []
            if current["followers"] != last["followers"]:
                diff = current["followers"] - last["followers"]
                changes.append(f"Followers: {'+' if diff > 0 else ''}{diff}")
            
            if current["following"] != last["following"]:
                diff = current["following"] - last["following"]
                changes.append(f"Following: {'+' if diff > 0 else ''}{diff}")
            
            if current["bio"] != last["bio"]:
                changes.append("Bio changed")
            
            if current["name"] != last["name"]:
                changes.append(f"Name: {last['name']} → {current['name']}")
            
            if changes:
                print(f"Changes detected for @{username}:")
                for change in changes:
                    print(f"  • {change}")
        
        # Save current state
        history.append(current)
        with open(history_file, "w") as f:
            json.dump(history, f, indent=2)
        
        return current

# Run periodically (e.g., via cron)
await track_profile_changes("competitor")
```

## Export Options

```python
async with Xeepy() as x:
    profiles = []
    for user in ["user1", "user2", "user3"]:
        profiles.append(await x.scrape.profile(user))
    
    # Export to various formats
    x.export.to_csv(profiles, "profiles.csv")
    x.export.to_json(profiles, "profiles.json")
    x.export.to_excel(profiles, "profiles.xlsx")
    
    # Custom fields only
    x.export.to_csv(
        profiles,
        "profiles_simple.csv",
        fields=["username", "followers_count", "bio"]
    )
```

## Best Practices

!!! tip "Efficiency Tips"
    - Cache profiles to avoid repeated requests
    - Batch similar operations together
    - Use GraphQL API for bulk operations (faster)

!!! warning "Privacy Considerations"
    - Respect protected/private accounts
    - Don't scrape personal information excessively
    - Follow X's Terms of Service
    - Use data responsibly

## Next Steps

[:octicons-arrow-right-24: Followers Scraping](followers.md) - Get follower lists

[:octicons-arrow-right-24: Bot Detection](../ai/bot-detection.md) - AI-powered fake account detection

[:octicons-arrow-right-24: Competitive Analysis](../../cookbook/business/competitor-intel.md) - Profile comparison techniques
