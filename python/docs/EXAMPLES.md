# 📚 Code Examples

Complete, copy-paste-ready examples for every Xeepy feature.

---

## Table of Contents

1. [Scraping Examples](#-scraping-examples)
2. [Unfollow Examples](#-unfollow-examples)
3. [Follow Examples](#-follow-examples)
4. [Engagement Examples](#-engagement-examples)
5. [Monitoring Examples](#-monitoring-examples)
6. [AI Examples](#-ai-examples)
7. [Advanced Workflows](#-advanced-workflows)

---

## 📊 Scraping Examples

### Get Tweet Replies (Original Repo Feature!)

```python
"""
Get all replies to a specific tweet.
This is what the original repo was meant to do!
"""
import asyncio
from xeepy import Xeepy

async def get_replies():
    async with Xeepy() as x:
        replies = await x.scrape.replies(
            tweet_url="https://x.com/elonmusk/status/1234567890",
            limit=200
        )
        
        print(f"Found {len(replies)} replies\n")
        
        for reply in replies[:10]:
            print(f"@{reply.username} ({reply.likes} likes)")
            print(f"  {reply.text[:100]}...")
            print()
        
        # Export to CSV (like original repo)
        x.export.to_csv(replies, "replies_clean.csv")
        print("Exported to replies_clean.csv")

asyncio.run(get_replies())
```

### Scrape User Profile

```python
"""
Get detailed profile information for any user.
"""
import asyncio
from xeepy import Xeepy

async def get_profile():
    async with Xeepy() as x:
        profile = await x.scrape.profile("elonmusk")
        
        print(f"Name: {profile.display_name}")
        print(f"Username: @{profile.username}")
        print(f"Bio: {profile.bio}")
        print(f"Location: {profile.location}")
        print(f"Followers: {profile.followers_count:,}")
        print(f"Following: {profile.following_count:,}")
        print(f"Tweets: {profile.tweets_count:,}")
        print(f"Joined: {profile.joined_date}")
        print(f"Verified: {profile.is_verified}")
        
        # Export
        x.export.to_json(profile, "profile.json")

asyncio.run(get_profile())
```

### Scrape Followers

```python
"""
Get a user's complete followers list.
"""
import asyncio
from xeepy import Xeepy

async def get_followers():
    async with Xeepy() as x:
        followers = await x.scrape.followers(
            username="python",
            limit=500,
            on_progress=lambda p: print(f"Progress: {p}%")
        )
        
        print(f"Found {len(followers)} followers")
        
        # Filter by criteria
        quality_followers = [
            f for f in followers 
            if f.followers_count > 100 and f.bio
        ]
        print(f"Quality followers: {len(quality_followers)}")
        
        # Export
        x.export.to_csv(followers, "followers.csv")
        x.export.to_json(followers, "followers.json")

asyncio.run(get_followers())
```

### Scrape User Tweets

```python
"""
Get tweets from a user's timeline.
"""
import asyncio
from xeepy import Xeepy

async def get_tweets():
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(
            username="python",
            limit=100,
            include_replies=False,
            include_retweets=False
        )
        
        print(f"Found {len(tweets)} tweets\n")
        
        # Sort by engagement
        tweets.sort(key=lambda t: t.likes + t.retweets, reverse=True)
        
        print("Top 5 tweets by engagement:")
        for i, tweet in enumerate(tweets[:5], 1):
            print(f"\n{i}. {tweet.text[:80]}...")
            print(f"   ❤️ {tweet.likes} | 🔄 {tweet.retweets} | 💬 {tweet.replies}")

asyncio.run(get_tweets())
```

### Search Tweets

```python
"""
Search for tweets matching a query.
"""
import asyncio
from xeepy import Xeepy

async def search_tweets():
    async with Xeepy() as x:
        # Basic search
        results = await x.scrape.search(
            query="Python tutorial",
            limit=50,
            filter="latest"  # "top", "latest", "people", "media"
        )
        
        print(f"Found {len(results)} tweets")
        
        # Advanced search
        results = await x.scrape.search(
            query="from:python lang:en min_faves:100",
            limit=50
        )
        
        for tweet in results[:5]:
            print(f"@{tweet.author.username}: {tweet.text[:60]}...")

asyncio.run(search_tweets())
```

### Scrape Hashtag

```python
"""
Get tweets containing a specific hashtag.
"""
import asyncio
from xeepy import Xeepy

async def scrape_hashtag():
    async with Xeepy() as x:
        tweets = await x.scrape.hashtag(
            hashtag="Python",
            limit=100,
            filter="latest"
        )
        
        # Analyze hashtag usage
        users = {}
        for tweet in tweets:
            users[tweet.author.username] = users.get(tweet.author.username, 0) + 1
        
        print("Top users in #Python:")
        for user, count in sorted(users.items(), key=lambda x: -x[1])[:10]:
            print(f"  @{user}: {count} tweets")

asyncio.run(scrape_hashtag())
```

### Scrape Thread

```python
"""
Unroll and extract a complete thread.
"""
import asyncio
from xeepy import Xeepy

async def scrape_thread():
    async with Xeepy() as x:
        thread = await x.scrape.thread(
            "https://x.com/user/status/1234567890"
        )
        
        print(f"Thread by @{thread.author.username}")
        print(f"Total tweets: {len(thread.tweets)}\n")
        
        for i, tweet in enumerate(thread.tweets, 1):
            print(f"{i}/{len(thread.tweets)}: {tweet.text}")
            print()

asyncio.run(scrape_thread())
```

---

## 🔄 Unfollow Examples

### Unfollow Non-Followers

```python
"""
Unfollow everyone who doesn't follow you back.
The most requested feature!
"""
import asyncio
from xeepy import Xeepy

async def unfollow_non_followers():
    async with Xeepy() as x:
        # Step 1: Preview (dry run)
        preview = await x.unfollow.non_followers(
            max_unfollows=100,
            whitelist=[
                "friend1",
                "important_brand",
                "mom"
            ],
            min_followers=10000,  # Keep if they have 10k+ followers
            dry_run=True
        )
        
        print(f"Would unfollow {len(preview.unfollowed_users)} users:")
        for user in preview.unfollowed_users[:10]:
            print(f"  - @{user}")
        
        # Step 2: Confirm and execute
        if input("\nProceed? (y/n): ").lower() == "y":
            result = await x.unfollow.non_followers(
                max_unfollows=100,
                whitelist=["friend1", "important_brand", "mom"],
                dry_run=False
            )
            
            print(f"\n✅ Unfollowed {result.success_count} users")
            print(f"❌ Failed: {result.failed_count}")
            
            # Save list of unfollowed users
            with open("unfollowed.txt", "w") as f:
                for user in result.unfollowed_users:
                    f.write(f"{user}\n")

asyncio.run(unfollow_non_followers())
```

### Unfollow Everyone (Nuclear Option)

```python
"""
⚠️ WARNING: This unfollows EVERYONE!
Use with extreme caution.
"""
import asyncio
from xeepy import Xeepy

async def unfollow_everyone():
    async with Xeepy() as x:
        # ALWAYS do dry run first
        preview = await x.unfollow.everyone(
            max_unfollows=500,
            export_before=True,  # Save following list first
            dry_run=True
        )
        
        print(f"⚠️ Would unfollow {len(preview.unfollowed_users)} users")
        print("Following list saved to: following_backup.json")
        
        confirm = input("\n⚠️ TYPE 'unfollow everyone' TO CONFIRM: ")
        if confirm == "unfollow everyone":
            result = await x.unfollow.everyone(dry_run=False)
            print(f"Unfollowed {result.success_count} users")

asyncio.run(unfollow_everyone())
```

### Smart Unfollow (Time-Based)

```python
"""
Unfollow users who didn't follow back within X days.
"""
import asyncio
from xeepy import Xeepy

async def smart_unfollow():
    async with Xeepy() as x:
        result = await x.unfollow.smart(
            days_threshold=3,  # Unfollow if no follow-back in 3 days
            max_unfollows=25,
            check_engagement=True,  # Keep if they engaged with you
            whitelist=["important_people"]
        )
        
        print(f"Unfollowed {result.success_count} users who didn't follow back")
        
        # Show stats
        stats = await x.storage.get_follow_stats()
        print(f"\nFollow-back rate: {stats.follow_back_rate:.1%}")

asyncio.run(smart_unfollow())
```

---

## ➕ Follow Examples

### Follow by Keywords

```python
"""
Follow users who tweet about specific topics.
"""
import asyncio
from xeepy import Xeepy
from xeepy.actions.follow import FollowFilters

async def follow_by_keyword():
    async with Xeepy() as x:
        result = await x.follow.by_keyword(
            keywords=["Python", "machine learning", "data science"],
            max_follows=25,
            filters=FollowFilters(
                min_followers=100,
                max_followers=50000,
                min_tweets=50,
                must_have_bio=True,
                must_have_profile_pic=True
            )
        )
        
        print(f"✅ Followed {result.success_count} users")
        print(f"⏭️ Skipped {result.skipped_count} (didn't match filters)")
        
        for user in result.followed_users:
            print(f"  + @{user}")

asyncio.run(follow_by_keyword())
```

### Follow Target's Followers

```python
"""
Follow the followers of a competitor/influencer.
"""
import asyncio
from xeepy import Xeepy

async def follow_competitors_followers():
    async with Xeepy() as x:
        result = await x.follow.followers_of(
            target_username="python",  # Follow @python's followers
            max_follows=30,
            mode="followers",  # or "following"
            skip_mutual=True,  # Skip if already following
            filters=FollowFilters(
                min_followers=50,
                must_have_bio=True
            )
        )
        
        print(f"Followed {result.success_count} of @python's followers")

asyncio.run(follow_competitors_followers())
```

### Follow Engagers

```python
"""
Follow users who engaged with specific tweets.
These are highly relevant users!
"""
import asyncio
from xeepy import Xeepy

async def follow_engagers():
    async with Xeepy() as x:
        result = await x.follow.engagers(
            tweet_urls=[
                "https://x.com/user/status/123",
                "https://x.com/user/status/456"
            ],
            engagement_type="likers",  # "likers", "retweeters", "commenters", "all"
            max_follows=25
        )
        
        print(f"Followed {result.success_count} users who engaged")

asyncio.run(follow_engagers())
```

---

## 💜 Engagement Examples

### Auto-Like by Keywords

```python
"""
Automatically like tweets containing specific keywords.
"""
import asyncio
from xeepy import Xeepy
from xeepy.actions.engagement import AutoLikeConfig

async def auto_like():
    async with Xeepy() as x:
        result = await x.engage.auto_like(
            config=AutoLikeConfig(
                keywords=["Python", "coding", "developer"],
                hashtags=["100DaysOfCode"],
                min_likes=5,
                max_likes=1000,
                exclude_retweets=True,
                max_likes_per_session=50
            ),
            duration_minutes=15
        )
        
        print(f"Liked {result.success_count} tweets!")

asyncio.run(auto_like())
```

### Like by User

```python
"""
Like all recent tweets from specific users.
"""
import asyncio
from xeepy import Xeepy

async def like_user_tweets():
    async with Xeepy() as x:
        for username in ["friend1", "mentor", "favorite_account"]:
            result = await x.engage.like_user(
                username=username,
                max_likes=5
            )
            print(f"Liked {result.success_count} tweets from @{username}")

asyncio.run(like_user_tweets())
```

### Auto-Comment with Templates

```python
"""
Automatically comment using templates.
"""
import asyncio
from xeepy import Xeepy
from xeepy.actions.engagement import AutoCommentConfig
from xeepy.templates import CommentTemplates

async def auto_comment():
    async with Xeepy() as x:
        result = await x.engage.auto_comment(
            config=AutoCommentConfig(
                keywords=["shipped", "launched", "released"],
                templates=CommentTemplates.APPRECIATION,
                max_comments_per_session=5,
                review_before_post=True  # Show preview
            ),
            duration_minutes=30
        )

asyncio.run(auto_comment())
```

### Bookmark Management

```python
"""
Manage your bookmarks - add, remove, export.
"""
import asyncio
from xeepy import Xeepy

async def manage_bookmarks():
    async with Xeepy() as x:
        # Add bookmark
        await x.engage.bookmark("https://x.com/user/status/123")
        
        # Export all bookmarks
        count = await x.engage.export_bookmarks(
            filepath="my_bookmarks.json",
            include_content=True
        )
        print(f"Exported {count} bookmarks")
        
        # Remove bookmark
        await x.engage.remove_bookmark("https://x.com/user/status/123")

asyncio.run(manage_bookmarks())
```

---

## 📈 Monitoring Examples

### Detect Unfollowers

```python
"""
Find out who unfollowed you.
"""
import asyncio
from xeepy import Xeepy

async def detect_unfollowers():
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        print(f"📊 Follower Report")
        print(f"   Before: {report.total_followers_before:,}")
        print(f"   After: {report.total_followers_after:,}")
        print(f"   Change: {report.net_change:+,}")
        
        if report.unfollowers:
            print(f"\n😢 Unfollowers ({len(report.unfollowers)}):")
            for user in report.unfollowers:
                print(f"   - @{user}")
        
        if report.new_followers:
            print(f"\n🎉 New Followers ({len(report.new_followers)}):")
            for user in report.new_followers:
                print(f"   + @{user}")

asyncio.run(detect_unfollowers())
```

### Monitor Account Changes

```python
"""
Monitor any account for changes.
"""
import asyncio
from xeepy import Xeepy

async def monitor_account():
    async with Xeepy() as x:
        # One-time check
        changes = await x.monitor.account_changes(
            username="competitor",
            since_hours=24
        )
        
        print(f"Changes for @competitor in last 24h:")
        print(f"  Followers: {changes.followers_change:+,}")
        print(f"  Following: {changes.following_change:+,}")
        print(f"  New tweets: {len(changes.new_tweets)}")
        
        if changes.bio_changed:
            print(f"  Bio changed!")
            print(f"    Old: {changes.old_bio}")
            print(f"    New: {changes.new_bio}")

asyncio.run(monitor_account())
```

### Real-Time Keyword Monitoring

```python
"""
Monitor X for specific keywords in real-time.
"""
import asyncio
from xeepy import Xeepy

async def on_match(tweet):
    print(f"🔔 Match found!")
    print(f"   @{tweet.author.username}: {tweet.text[:80]}...")

async def monitor_keywords():
    async with Xeepy() as x:
        await x.monitor.keywords(
            keywords=["your_brand", "your_product"],
            hashtags=["YourHashtag"],
            interval_seconds=60,
            on_match=on_match
        )

asyncio.run(monitor_keywords())
```

### Growth Tracking

```python
"""
Track your follower growth over time.
"""
import asyncio
from xeepy import Xeepy

async def track_growth():
    async with Xeepy() as x:
        # Record today's snapshot
        await x.analytics.record_snapshot()
        
        # Get growth history
        history = await x.analytics.growth_history(days=30)
        
        print("📈 30-Day Growth")
        for day in history[-7:]:  # Last 7 days
            print(f"  {day.date}: {day.followers:,} ({day.change:+,})")
        
        # Calculate growth rate
        rate = await x.analytics.growth_rate(days=7)
        print(f"\n📊 7-day growth rate: {rate:.1%}")

asyncio.run(track_growth())
```

---

## 🤖 AI Examples

### AI Reply Generator

```python
"""
Generate contextual replies using AI.
"""
import asyncio
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async def ai_replies():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="sk-...")
        
        # Get recent tweets to reply to
        tweets = await x.scrape.search("Python tips", limit=5)
        
        for tweet in tweets:
            reply = await ai.generate_reply(
                tweet_text=tweet.text,
                style="helpful"
            )
            
            print(f"Tweet: {tweet.text[:50]}...")
            print(f"Reply: {reply}")
            print("---")

asyncio.run(ai_replies())
```

### Sentiment Analysis Dashboard

```python
"""
Analyze sentiment of your mentions.
"""
import asyncio
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def sentiment_dashboard():
    async with Xeepy() as x:
        analyzer = SentimentAnalyzer()
        
        # Get your mentions
        mentions = await x.scrape.mentions("your_username", limit=100)
        
        # Analyze each
        positive, negative, neutral = 0, 0, 0
        
        for mention in mentions:
            result = await analyzer.analyze_tweet(mention.text)
            
            if result.label == "positive":
                positive += 1
            elif result.label == "negative":
                negative += 1
                print(f"⚠️ Negative: @{mention.author}: {mention.text[:50]}...")
            else:
                neutral += 1
        
        print(f"\n📊 Sentiment Summary")
        print(f"   Positive: {positive} ({positive/len(mentions):.1%})")
        print(f"   Neutral: {neutral} ({neutral/len(mentions):.1%})")
        print(f"   Negative: {negative} ({negative/len(mentions):.1%})")

asyncio.run(sentiment_dashboard())
```

---

## 🔧 Advanced Workflows

### Complete Growth Suite

```python
"""
All-in-one growth automation.
"""
import asyncio
from xeepy import Xeepy
from xeepy.ai import SmartTargeting

async def growth_suite():
    async with Xeepy() as x:
        targeting = SmartTargeting(provider="openai", api_key="sk-...")
        
        print("🚀 Starting Growth Suite")
        
        # Phase 1: Clean up (unfollow non-followers)
        print("\n📍 Phase 1: Cleaning up...")
        cleanup = await x.unfollow.non_followers(
            max_unfollows=20,
            whitelist=["important_accounts"],
            dry_run=False
        )
        print(f"   Unfollowed {cleanup.success_count} non-followers")
        
        await asyncio.sleep(60)  # Pause between phases
        
        # Phase 2: Smart follow
        print("\n📍 Phase 2: Finding targets...")
        targets = await targeting.find_targets(
            niche="Python developers",
            goal="growth",
            limit=15
        )
        
        for target in targets:
            await x.follow.user(target.username)
            print(f"   Followed @{target.username}")
            await asyncio.sleep(5)
        
        await asyncio.sleep(60)
        
        # Phase 3: Engage
        print("\n📍 Phase 3: Engaging...")
        likes = await x.engage.auto_like(
            keywords=["Python", "coding"],
            max_likes=20,
            duration_minutes=10
        )
        print(f"   Liked {likes.success_count} tweets")
        
        print("\n✅ Growth suite complete!")

asyncio.run(growth_suite())
```

### Scheduled Automation

```python
"""
Run automations on a schedule.
"""
import asyncio
from datetime import datetime
from xeepy import Xeepy

async def daily_routine():
    async with Xeepy() as x:
        now = datetime.now()
        
        # Morning: Check unfollowers
        if 8 <= now.hour < 9:
            report = await x.monitor.unfollowers()
            print(f"Morning report: {report.net_change:+} followers")
        
        # Afternoon: Engage
        elif 14 <= now.hour < 15:
            await x.engage.auto_like(
                keywords=["Python"],
                max_likes=25
            )
        
        # Evening: Clean up
        elif 20 <= now.hour < 21:
            await x.unfollow.non_followers(
                max_unfollows=15,
                dry_run=False
            )

# Run with cron or scheduler
asyncio.run(daily_routine())
```

### Export Everything

```python
"""
Full data export for backup/analysis.
"""
import asyncio
from xeepy import Xeepy

async def full_export():
    async with Xeepy() as x:
        username = "your_username"
        
        print("📦 Exporting all data...")
        
        # Profile
        profile = await x.scrape.profile(username)
        x.export.to_json(profile, f"export/{username}_profile.json")
        
        # Followers
        followers = await x.scrape.followers(username, limit=5000)
        x.export.to_csv(followers, f"export/{username}_followers.csv")
        
        # Following
        following = await x.scrape.following(username, limit=5000)
        x.export.to_csv(following, f"export/{username}_following.csv")
        
        # Tweets
        tweets = await x.scrape.tweets(username, limit=1000)
        x.export.to_json(tweets, f"export/{username}_tweets.json")
        
        # Bookmarks
        await x.engage.export_bookmarks(f"export/{username}_bookmarks.json")
        
        print("✅ Export complete!")

asyncio.run(full_export())
```

---

## 🆘 Error Handling

```python
"""
Proper error handling pattern.
"""
import asyncio
from xeepy import Xeepy
from xeepy.core.exceptions import (
    AuthenticationError,
    RateLimitError,
    ElementNotFoundError
)

async def safe_automation():
    try:
        async with Xeepy() as x:
            result = await x.unfollow.non_followers()
            
    except AuthenticationError:
        print("❌ Session expired. Please re-authenticate.")
        
    except RateLimitError as e:
        print(f"⏳ Rate limited. Wait {e.retry_after} seconds.")
        
    except ElementNotFoundError:
        print("⚠️ X/Twitter UI may have changed. Check for updates.")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

asyncio.run(safe_automation())
```

---

<p align="center">
  <strong>Happy automating! 🚀</strong>
</p>
