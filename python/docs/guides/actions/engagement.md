# Engagement Automation

Automate likes, retweets, comments, and bookmarks to grow your presence.

## Auto Like

Automatically like tweets matching your criteria:

=== "Python"

    ```python
    from xeepy import Xeepy

    async with Xeepy() as x:
        result = await x.engage.auto_like(
            keywords=["python", "programming", "tech"],
            max_likes=50,
            filters={
                "min_likes": 10,        # Already has some engagement
                "max_likes": 1000,      # Not too viral (author won't notice)
                "min_followers": 100,   # Real accounts
                "max_followers": 50000, # They'll notice your like
                "exclude_replies": True,
                "exclude_retweets": True,
            },
            delay_range=(2, 5),
            on_like=lambda t: print(f"❤️ Liked: {t.text[:50]}...")
        )
        
        print(f"\n✅ Liked {result.success_count} tweets")
    ```

=== "CLI"

    ```bash
    xeepy engage like --keywords "python,programming" --max 50
    ```

### Smart Targeting

Target tweets that maximize your visibility:

```python
# Like tweets from accounts likely to follow back
result = await x.engage.auto_like(
    keywords=["python developer", "learning to code"],
    filters={
        "min_followers": 100,
        "max_followers": 5000,    # Small accounts notice likes
        "min_likes": 5,
        "max_likes": 100,         # Not viral yet
        "account_age_days": 30,   # Established accounts
        "has_bio": True,
    },
    max_likes=30,
)

# Like tweets with questions (high engagement opportunity)
result = await x.engage.auto_like(
    keywords=["how to python", "python help", "python question"],
    search_type="latest",  # Fresh tweets
    filters={
        "max_likes": 10,   # Unanswered questions
        "max_age_hours": 2, # Recent
    },
    max_likes=20,
)
```

### Engagement Chains

Like multiple tweets from same author for better visibility:

```python
async def engagement_chain(username, count=5):
    """Like multiple tweets from one user"""
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=count)
        
        for tweet in tweets:
            await x.engage.like(tweet.url)
            await asyncio.sleep(random.uniform(3, 8))
        
        print(f"Liked {count} tweets from @{username}")
```

## Auto Retweet

Amplify content while building relationships:

```python
from xeepy import Xeepy

async with Xeepy() as x:
    result = await x.engage.auto_retweet(
        keywords=["python tips", "coding advice"],
        max_retweets=10,  # Be conservative with RTs
        filters={
            "min_likes": 100,      # Quality content
            "min_followers": 1000,  # Credible source
            "exclude_replies": True,
        },
        add_comment=False,  # Quote RT with comment (see below)
    )
```

### Quote Retweets with AI

Add intelligent comments to your retweets:

```python
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async with Xeepy() as x:
    ai = ContentGenerator(provider="openai", model="gpt-4o-mini")
    
    # Find tweets to quote
    tweets = await x.scrape.search(
        "python tutorial",
        min_likes=50,
        limit=10
    )
    
    for tweet in tweets[:5]:
        # Generate contextual comment
        comment = await ai.generate_quote_comment(
            tweet_text=tweet.text,
            style="insightful",
            max_length=200
        )
        
        await x.engage.quote_retweet(
            tweet_url=tweet.url,
            comment=comment
        )
        
        print(f"Quoted: {tweet.text[:50]}...")
        print(f"Comment: {comment}\n")
```

## Auto Comment

Reply to tweets automatically with AI-generated comments:

```python
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async with Xeepy() as x:
    ai = ContentGenerator(
        provider="openai",
        model="gpt-4o-mini",
        temperature=0.7
    )
    
    # Find tweets to reply to
    tweets = await x.scrape.search(
        "learning python",
        search_type="latest",
        limit=20
    )
    
    for tweet in tweets[:10]:
        # Generate helpful reply
        reply = await ai.generate_reply(
            tweet_text=tweet.text,
            author_bio=tweet.author.bio,
            style="helpful",
            tone="friendly",
            max_length=280,
            include_question=True,  # Encourage response
        )
        
        # Optional: Review before posting
        print(f"\nTweet: {tweet.text[:100]}...")
        print(f"Reply: {reply}")
        
        if input("Post? (y/n): ").lower() == 'y':
            await x.engage.reply(tweet.url, reply)
            print("✅ Posted!")
```

### Reply Templates

Use templates for consistent engagement:

```python
from xeepy.engage import ReplyTemplates

templates = ReplyTemplates(
    greetings=["Great point!", "Love this!", "So true!"],
    questions=[
        "What's your experience with {topic}?",
        "Have you tried {alternative}?",
        "What would you add to this?",
    ],
    value_adds=[
        "I'd also add that {insight}",
        "Another tip: {tip}",
        "Building on this: {addition}",
    ],
    closings=[
        "Thanks for sharing! 🙏",
        "Following for more! 👀",
        "Bookmarked! 📌",
    ]
)

async with Xeepy() as x:
    result = await x.engage.auto_reply(
        keywords=["python tips"],
        templates=templates,
        max_replies=10,
        require_review=True,  # Show before posting
    )
```

### Conversation Threading

Engage in multi-turn conversations:

```python
async def conversation_bot():
    """Monitor and respond to replies to your tweets"""
    
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai")
        
        # Get replies to your tweets
        my_tweets = await x.scrape.tweets("me", limit=10)
        
        for tweet in my_tweets:
            replies = await x.scrape.replies(tweet.url, limit=5)
            
            for reply in replies:
                # Skip if already replied
                if reply.author.username == "me":
                    continue
                
                # Generate response
                response = await ai.generate_reply(
                    tweet_text=reply.text,
                    context=tweet.text,  # Original tweet
                    style="conversational",
                )
                
                print(f"Reply from @{reply.author.username}: {reply.text}")
                print(f"Response: {response}")
                
                if input("Send? (y/n): ").lower() == 'y':
                    await x.engage.reply(reply.url, response)
```

## Bookmarks

Organize content with smart bookmarking:

```python
async with Xeepy() as x:
    # Auto-bookmark valuable content
    result = await x.engage.auto_bookmark(
        keywords=["python tutorial", "coding tips", "tech insights"],
        filters={
            "min_likes": 500,
            "min_bookmarks": 50,  # Already bookmarked by others
        },
        max_bookmarks=20,
    )
    
    # Get bookmarked tweets
    bookmarks = await x.scrape.bookmarks(limit=100)
    
    # Export for reference
    x.export.to_csv(bookmarks, "my_bookmarks.csv")
```

### Bookmark Folders (Conceptual)

Organize bookmarks by category:

```python
from xeepy.storage import BookmarkManager

bm = BookmarkManager("bookmarks.db")

# Categorize bookmarks
categories = {
    "tutorials": ["python tutorial", "how to", "guide"],
    "tools": ["tool", "library", "framework"],
    "inspiration": ["thread", "story", "journey"],
    "save_for_later": ["interesting", "read later"],
}

async with Xeepy() as x:
    bookmarks = await x.scrape.bookmarks(limit=200)
    
    for bookmark in bookmarks:
        for category, keywords in categories.items():
            if any(kw in bookmark.text.lower() for kw in keywords):
                bm.add_to_folder(bookmark.id, category)
                break
    
    # Get by folder
    tutorials = bm.get_folder("tutorials")
    print(f"Tutorial bookmarks: {len(tutorials)}")
```

## Engagement Pods

Coordinate engagement with a group (use ethically!):

```python
from xeepy import Xeepy
import asyncio

class EngagementPod:
    """Coordinate mutual engagement among members"""
    
    def __init__(self, members: list):
        self.members = members
    
    async def engage_with_member(self, x, username):
        """Like recent tweets from pod member"""
        tweets = await x.scrape.tweets(username, limit=3)
        
        for tweet in tweets:
            await x.engage.like(tweet.url)
            await asyncio.sleep(2)
    
    async def run_pod_session(self):
        """Engage with all pod members"""
        async with Xeepy() as x:
            for member in self.members:
                if member != "my_username":  # Skip self
                    await self.engage_with_member(x, member)
                    print(f"✅ Engaged with @{member}")

# Usage
pod = EngagementPod(["friend1", "friend2", "friend3"])
asyncio.run(pod.run_pod_session())
```

## Engagement Analytics

Track your engagement effectiveness:

```python
from xeepy.storage import EngagementTracker

tracker = EngagementTracker("engagement.db")

# Log engagement
tracker.record_like(tweet_id="123", author="username")
tracker.record_reply(tweet_id="456", author="username", reply_text="...")

# Get stats
stats = tracker.get_stats()
print(f"Total likes: {stats.total_likes}")
print(f"Total replies: {stats.total_replies}")
print(f"Reply rate: {stats.reply_rate}%")  # % of likes that turned into convos

# Engagement effectiveness
effectiveness = tracker.get_effectiveness()
print(f"\nEngagement Effectiveness:")
print(f"  Likes → Follows: {effectiveness.likes_to_follows}%")
print(f"  Replies → Follows: {effectiveness.replies_to_follows}%")
print(f"  Best keywords: {effectiveness.best_keywords}")
```

## Scheduled Engagement

Run engagement at optimal times:

```python
from xeepy import Xeepy
from xeepy.scheduling import EngagementScheduler

scheduler = EngagementScheduler(
    active_hours=(9, 22),  # 9 AM to 10 PM
    peak_hours=[(12, 14), (18, 21)],  # Lunch and evening
)

async def scheduled_engagement():
    async with Xeepy() as x:
        schedule = scheduler.get_today_schedule(
            likes_per_day=50,
            replies_per_day=10,
        )
        
        for task in schedule:
            if task.type == "like":
                await x.engage.auto_like(
                    keywords=task.keywords,
                    max_likes=task.count,
                )
            elif task.type == "reply":
                await x.engage.auto_reply(
                    keywords=task.keywords,
                    max_replies=task.count,
                )
            
            print(f"Completed: {task.type} x{task.count}")
            await asyncio.sleep(task.delay_until_next)
```

## Best Practices

!!! success "Do's"
    - ✅ Engage genuinely - add value with comments
    - ✅ Use AI to generate helpful, contextual replies
    - ✅ Target smaller accounts (they notice engagement)
    - ✅ Space out engagement naturally
    - ✅ Track what works and optimize

!!! danger "Don'ts"
    - ❌ Mass-like without reading tweets
    - ❌ Post generic "Great post!" comments
    - ❌ Engage more than 100 times/day
    - ❌ Reply to controversial topics
    - ❌ Spam the same message repeatedly

## Safety Settings

```python
# Conservative engagement settings
config = {
    "daily_likes": 50,
    "daily_retweets": 10,
    "daily_replies": 10,
    "min_delay": 3,
    "max_delay": 10,
    "require_review": True,  # Review AI comments before posting
    "blocked_keywords": ["politics", "controversial", "nsfw"],
}
```

## Next Steps

[:octicons-arrow-right-24: Mass Operations](mass-operations.md) - Scale your actions

[:octicons-arrow-right-24: AI Replies](../ai/replies.md) - Generate better content

[:octicons-arrow-right-24: Analytics](../analytics/engagement.md) - Measure effectiveness
