# Smart Audience Targeting

Use AI to identify and reach your ideal audience by analyzing user profiles, interests, and engagement patterns for precision targeting.

## Overview

Smart targeting leverages AI to build audience segments based on sophisticated criteria beyond simple follower counts. Analyze interests, engagement quality, content preferences, and network connections to find users most likely to engage with your content.

## Use Cases

- **Content Distribution**: Find users interested in specific topics
- **Growth Targeting**: Identify high-value accounts to engage with
- **Campaign Optimization**: Target users most likely to convert
- **Community Building**: Find potential community members
- **Influencer Discovery**: Identify micro-influencers in your niche

## Basic Usage

```python
import asyncio
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async def basic_targeting():
    async with Xeepy() as x:
        ai = ContentGenerator(
            provider="openai",
            api_key="your-api-key",
            model="gpt-4"
        )
        
        # Define target criteria
        targets = await ai.find_audience(
            interests=["machine learning", "Python", "data science"],
            min_followers=500,
            max_followers=50000,
            engagement_rate_min=0.02,
            limit=100
        )
        
        for user in targets:
            print(f"@{user.username}: {user.match_score:.0%} match")
            print(f"  Followers: {user.followers_count}")
            print(f"  Interests: {', '.join(user.detected_interests)}\n")

asyncio.run(basic_targeting())
```

## Interest-Based Targeting

```python
async def interest_targeting():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Analyze users from a seed account's followers
        seed_followers = await x.scrape.followers("industry_leader", limit=500)
        
        # Filter by interests
        matching_users = []
        
        for user in seed_followers:
            # Get user's recent tweets for interest analysis
            try:
                tweets = await x.scrape.tweets(user.username, limit=20)
                
                # AI analyzes interests from content
                interests = await ai.analyze_interests(
                    bio=user.bio,
                    tweets=[t.text for t in tweets]
                )
                
                # Check for target interests
                target_interests = {"AI", "startup", "technology"}
                if interests.primary & target_interests:
                    matching_users.append({
                        "user": user,
                        "interests": interests.primary,
                        "confidence": interests.confidence
                    })
            except:
                continue
        
        print(f"Found {len(matching_users)} matching users")
        for match in matching_users[:10]:
            print(f"@{match['user'].username}: {match['interests']}")

asyncio.run(interest_targeting())
```

## Engagement Quality Scoring

```python
async def engagement_quality_targeting():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Get potential targets
        candidates = await x.scrape.search_users("python developer", limit=200)
        
        scored_users = []
        
        for user in candidates:
            # Calculate engagement quality score
            tweets = await x.scrape.tweets(user.username, limit=20)
            
            if not tweets:
                continue
            
            # Engagement rate
            total_engagement = sum(t.likes + t.retweets + t.reply_count for t in tweets)
            avg_engagement = total_engagement / len(tweets)
            engagement_rate = avg_engagement / max(user.followers_count, 1)
            
            # Reply ratio (shows active engagement)
            reply_tweets = [t for t in tweets if t.is_reply]
            reply_ratio = len(reply_tweets) / len(tweets)
            
            # Quality score
            quality_score = (
                0.4 * min(engagement_rate * 50, 1) +  # Engagement rate
                0.3 * min(reply_ratio * 2, 1) +       # Reply activity
                0.3 * (1 - min(user.followers_count / 100000, 1))  # Not too big
            )
            
            scored_users.append({
                "user": user,
                "quality_score": quality_score,
                "engagement_rate": engagement_rate
            })
        
        # Sort by quality
        scored_users.sort(key=lambda x: x["quality_score"], reverse=True)
        
        print("Top quality targets:")
        for item in scored_users[:20]:
            print(f"@{item['user'].username}: {item['quality_score']:.2f} score, {item['engagement_rate']:.2%} ER")

asyncio.run(engagement_quality_targeting())
```

## Lookalike Audience

```python
async def find_lookalike_audience():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Define seed users (your best followers/customers)
        seed_users = ["user1", "user2", "user3", "user4", "user5"]
        
        # Analyze seed user characteristics
        seed_profiles = []
        for username in seed_users:
            profile = await x.scrape.profile(username)
            tweets = await x.scrape.tweets(username, limit=30)
            
            characteristics = await ai.analyze_user_characteristics(
                profile=profile,
                tweets=[t.text for t in tweets]
            )
            seed_profiles.append(characteristics)
        
        # Build composite profile
        composite = await ai.build_audience_profile(seed_profiles)
        
        print("Ideal Audience Profile:")
        print(f"  Interests: {composite.interests}")
        print(f"  Follower range: {composite.follower_range}")
        print(f"  Content style: {composite.content_style}")
        print(f"  Activity level: {composite.activity_level}")
        
        # Find similar users
        search_terms = composite.search_keywords[:3]
        candidates = []
        
        for term in search_terms:
            users = await x.scrape.search_users(term, limit=100)
            candidates.extend(users)
        
        # Score against composite
        lookalikes = []
        for user in candidates:
            similarity = await ai.calculate_similarity(user, composite)
            if similarity > 0.7:
                lookalikes.append({"user": user, "similarity": similarity})
        
        lookalikes.sort(key=lambda x: x["similarity"], reverse=True)
        print(f"\nFound {len(lookalikes)} lookalike users")

asyncio.run(find_lookalike_audience())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `interests` | list | required | Target interest keywords |
| `min_followers` | int | 0 | Minimum follower count |
| `max_followers` | int | None | Maximum follower count |
| `engagement_rate_min` | float | 0 | Minimum engagement rate |
| `verified_only` | bool | False | Only verified accounts |
| `language` | str | None | Filter by primary language |
| `location` | str | None | Filter by location |

!!! tip "Micro-Influencers"
    For engagement, target accounts with 1k-50k followers. They often have higher engagement rates and more genuine interactions than larger accounts.

!!! warning "Targeting Ethics"
    Use targeting responsibly. Don't spam targeted users. Focus on providing value through genuine engagement.

## Geographic Targeting

```python
async def geographic_targeting():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Search for users in specific locations
        locations = ["San Francisco", "New York", "Austin"]
        
        targeted_users = []
        
        for location in locations:
            users = await x.scrape.search_users(
                f"software engineer {location}",
                limit=50
            )
            
            for user in users:
                # Verify location from profile
                if user.location and location.lower() in user.location.lower():
                    targeted_users.append({
                        "user": user,
                        "location": location
                    })
        
        print(f"Found {len(targeted_users)} location-verified users:")
        for item in targeted_users[:20]:
            print(f"@{item['user'].username} - {item['location']}")

asyncio.run(geographic_targeting())
```

## Industry Targeting

```python
async def industry_targeting():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Define industry keywords
        industry_keywords = {
            "fintech": ["fintech", "payments", "banking tech", "neobank"],
            "healthtech": ["healthtech", "digital health", "medtech", "biotech"],
            "edtech": ["edtech", "e-learning", "online education"]
        }
        
        industry_users = {}
        
        for industry, keywords in industry_keywords.items():
            industry_users[industry] = []
            
            for keyword in keywords:
                users = await x.scrape.search_users(keyword, limit=30)
                
                for user in users:
                    # AI validates industry relevance
                    relevance = await ai.check_industry_relevance(
                        user_bio=user.bio,
                        target_industry=industry
                    )
                    
                    if relevance > 0.7:
                        industry_users[industry].append(user)
        
        for industry, users in industry_users.items():
            print(f"\n{industry.upper()}: {len(users)} users found")

asyncio.run(industry_targeting())
```

## Engagement Potential Scoring

```python
async def score_engagement_potential():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        candidates = await x.scrape.search_users("AI enthusiast", limit=100)
        
        scored = []
        for user in candidates:
            # AI predicts engagement potential
            potential = await ai.predict_engagement_potential(
                profile=user,
                your_content_topics=["machine learning", "tutorials", "Python"]
            )
            
            scored.append({
                "user": user,
                "potential": potential.score,
                "reasoning": potential.reasoning
            })
        
        # Top engagement potential
        scored.sort(key=lambda x: x["potential"], reverse=True)
        
        print("Highest engagement potential:")
        for item in scored[:10]:
            print(f"\n@{item['user'].username}: {item['potential']:.0%}")
            print(f"  {item['reasoning']}")

asyncio.run(score_engagement_potential())
```

## Export Targeting Data

```python
async def export_targets():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        targets = await ai.find_audience(
            interests=["startup", "SaaS", "B2B"],
            min_followers=1000,
            max_followers=20000,
            limit=500
        )
        
        export_data = [{
            "username": t.username,
            "name": t.name,
            "followers": t.followers_count,
            "bio": t.bio,
            "match_score": t.match_score,
            "interests": ", ".join(t.detected_interests)
        } for t in targets]
        
        x.export.to_csv(export_data, "target_audience.csv")
        print(f"Exported {len(export_data)} targeted users")

asyncio.run(export_targets())
```

## Best Practices

1. **Quality Over Quantity**: Target fewer high-quality accounts over many low-quality ones
2. **Validate Interests**: Verify interest signals from multiple sources (bio, tweets, engagement)
3. **Respect Boundaries**: Don't spam targeted users; provide genuine value
4. **Test and Iterate**: Refine targeting criteria based on engagement results
5. **Segment Audiences**: Create different targeting strategies for different goals
6. **Track Results**: Measure conversion from targeted outreach

## Related Guides

- [Audience Insights](../analytics/audience.md)
- [Bot Detection](bot-detection.md)
- [Engagement Analysis](../analytics/engagement.md)
