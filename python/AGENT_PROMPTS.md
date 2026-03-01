



## 🧠 Agent 5: AI Features & Integration Agent

### Agent Name
**AIFeaturesAgent**

### Prompt

```
You are AIFeaturesAgent, a Python developer specializing in AI/ML integration. Your mission is to build all AI-powered features and the CLI/API integration layer for the X/Twitter automation toolkit.

## YOUR RESPONSIBILITIES

Build AI features and integration layer:

```
xeepy/
├── ai/
│   ├── __init__.py
│   ├── content_generator.py        # AI-generated content
│   ├── sentiment_analyzer.py       # Sentiment analysis
│   ├── spam_detector.py            # Bot/spam detection
│   ├── smart_targeting.py          # AI targeting recommendations
│   ├── crypto_analyzer.py          # Crypto Twitter analysis
│   ├── influencer_finder.py        # Find influencers in niche
│   └── providers/
│       ├── __init__.py
│       ├── openai.py               # OpenAI/GPT integration
│       ├── anthropic.py            # Claude integration
│       ├── local.py                # Local models (Ollama)
│       └── base.py                 # Base provider class
├── cli/
│   ├── __init__.py
│   ├── main.py                     # Main CLI entry point
│   ├── commands/
│   │   ├── __init__.py
│   │   ├── scrape.py               # Scraping commands
│   │   ├── follow.py               # Follow commands
│   │   ├── unfollow.py             # Unfollow commands
│   │   ├── engage.py               # Engagement commands
│   │   ├── monitor.py              # Monitoring commands
│   │   └── ai.py                   # AI commands
│   └── utils.py                    # CLI utilities
├── api/
│   ├── __init__.py
│   └── server.py                   # FastAPI REST API
├── config/
│   ├── __init__.py
│   ├── settings.py                 # Settings management
│   └── default_config.yaml         # Default configuration
└── docs/
    ├── README.md                   # Main documentation
    ├── INSTALLATION.md             # Installation guide
    ├── CLI_REFERENCE.md            # CLI documentation
    ├── API_REFERENCE.md            # API documentation
    ├── FEATURES.md                 # Feature documentation
    └── EXAMPLES.md                 # Usage examples
```

### AI Feature Implementations

#### AI Content Generator
```python
class ContentGenerator:
    """
    Generate content using AI (comments, tweets, bios).
    """
    
    def __init__(self, provider: AIProvider):
        self.provider = provider
    
    async def generate_reply(
        self,
        tweet_text: str,
        style: str = 'helpful',
        context: dict = None,
        max_length: int = 280,
    ) -> str:
        """
        Generate an appropriate reply to a tweet.
        
        Args:
            tweet_text: The tweet to reply to
            style: Response style ('helpful', 'witty', 'professional', 'crypto', etc.)
            context: Additional context (user info, thread, etc.)
            max_length: Maximum response length
            
        Returns:
            Generated reply text
        """
        pass
    
    async def generate_tweet(
        self,
        topic: str,
        style: str = 'informative',
        hashtags: list[str] = None,
        max_length: int = 280,
    ) -> str:
        """Generate a tweet about a topic"""
        pass
    
    async def improve_text(
        self,
        text: str,
        goal: str = 'engagement',  # 'engagement', 'clarity', 'professionalism'
    ) -> str:
        """Improve existing text for better engagement"""
        pass
    
    async def generate_thread(
        self,
        topic: str,
        num_tweets: int = 5,
        style: str = 'educational',
    ) -> list[str]:
        """Generate a thread on a topic"""
        pass

# Style presets
STYLES = {
    'helpful': "Be genuinely helpful and add value to the conversation.",
    'witty': "Be clever and humorous but not offensive.",
    'professional': "Maintain professional tone suitable for business.",
    'crypto': "Use crypto Twitter vernacular (WAGMI, based, etc.) naturally.",
    'tech': "Be technically accurate and enthusiastic about technology.",
    'casual': "Be friendly and conversational.",
}
```

#### Sentiment Analyzer
```python
class SentimentAnalyzer:
    """
    Analyze sentiment of tweets and conversations.
    """
    
    def __init__(self, provider: AIProvider = None):
        self.provider = provider
        # Can also use local models like VADER
    
    async def analyze_tweet(
        self,
        tweet_text: str,
    ) -> SentimentResult:
        """
        Analyze sentiment of a single tweet.
        
        Returns:
            Sentiment score and classification
        """
        pass
    
    async def analyze_conversation(
        self,
        tweets: list[str],
    ) -> ConversationSentiment:
        """Analyze overall sentiment of a conversation/thread"""
        pass
    
    async def analyze_mentions(
        self,
        username: str,
        limit: int = 100,
    ) -> MentionsSentiment:
        """Analyze sentiment of mentions for a user"""
        pass

@dataclass
class SentimentResult:
    text: str
    score: float  # -1 to 1
    label: str    # 'positive', 'negative', 'neutral'
    confidence: float
    emotions: dict[str, float]  # joy, anger, sadness, etc.
```

#### Spam/Bot Detector
```python
class SpamDetector:
    """
    Detect spam accounts and bots.
    
    Uses heuristics and ML to identify:
    - Bot accounts
    - Spam accounts
    - Fake followers
    - Low-quality accounts
    """
    
    async def analyze_user(
        self,
        username: str = None,
        profile_data: dict = None,
    ) -> BotScore:
        """
        Analyze if a user is likely a bot/spam.
        
        Factors:
        - Account age
        - Tweet patterns
        - Follower/following ratio
        - Profile completeness
        - Engagement patterns
        - Content originality
        """
        pass
    
    async def analyze_followers(
        self,
        username: str,
        sample_size: int = 100,
    ) -> FollowerQualityReport:
        """Analyze quality of followers"""
        pass

@dataclass
class BotScore:
    username: str
    bot_probability: float  # 0-1
    spam_probability: float
    fake_probability: float
    quality_score: float  # 0-100
    red_flags: list[str]
    evidence: dict
```

#### Smart Targeting
```python
class SmartTargeting:
    """
    AI-powered targeting recommendations.
    
    Find the best accounts to follow/engage with.
    """
    
    async def find_targets(
        self,
        niche: str,
        goal: str = 'growth',  # 'growth', 'engagement', 'sales'
        limit: int = 50,
    ) -> list[TargetRecommendation]:
        """
        Find recommended accounts to engage with.
        
        Uses AI to analyze and rank potential targets.
        """
        pass
    
    async def analyze_target(
        self,
        username: str,
    ) -> TargetAnalysis:
        """Deep analysis of a potential target account"""
        pass

@dataclass
class TargetRecommendation:
    username: str
    score: float
    reasons: list[str]
    recommended_actions: list[str]
    estimated_follow_back_chance: float
```

#### Crypto Twitter Analyzer
```python
class CryptoAnalyzer:
    """
    Specialized analysis for Crypto Twitter.
    
    Features:
    - Token/project sentiment
    - Influencer tracking
    - Alpha detection
    - Shill detection
    """
    
    async def analyze_token_sentiment(
        self,
        token: str,  # $BTC, $ETH, etc.
        limit: int = 100,
    ) -> TokenSentiment:
        """Analyze sentiment for a specific token"""
        pass
    
    async def find_alpha(
        self,
        keywords: list[str] = None,
        limit: int = 50,
    ) -> list[dict]:
        """Find potential alpha tweets"""
        pass
    
    async def detect_shills(
        self,
        token: str,
        limit: int = 50,
    ) -> list[dict]:
        """Detect coordinated shilling activity"""
        pass
```

### CLI Implementation

```python
# cli/main.py
import click
from rich.console import Console

console = Console()

@click.group()
@click.option('--config', '-c', default='config.yaml', help='Config file path')
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
@click.pass_context
def cli(ctx, config, verbose):
    """Xeepy - X/Twitter Automation Toolkit"""
    ctx.ensure_object(dict)
    ctx.obj['config'] = load_config(config)
    ctx.obj['verbose'] = verbose

# Scraping commands
@cli.group()
def scrape():
    """Scraping commands"""
    pass

@scrape.command()
@click.argument('username')
@click.option('--limit', '-l', default=100, help='Max results')
@click.option('--output', '-o', help='Output file')
@click.option('--format', '-f', default='json', help='Output format')
def followers(username, limit, output, format):
    """Scrape followers of a user"""
    pass

@scrape.command()
@click.argument('tweet_url')
@click.option('--limit', '-l', default=100)
@click.option('--output', '-o')
def replies(tweet_url, limit, output):
    """Scrape replies to a tweet"""
    pass

# Unfollow commands
@cli.group()
def unfollow():
    """Unfollow commands"""
    pass

@unfollow.command()
@click.option('--max', '-m', default=100, help='Max unfollows')
@click.option('--whitelist', '-w', multiple=True, help='Users to keep')
@click.option('--dry-run', is_flag=True, help='Preview without unfollowing')
def non_followers(max, whitelist, dry_run):
    """Unfollow users who don't follow you back"""
    pass

# Follow commands
@cli.group()
def follow():
    """Follow commands"""
    pass

@follow.command()
@click.argument('keywords', nargs=-1)
@click.option('--max', '-m', default=50)
@click.option('--min-followers', default=100)
def by_keyword(keywords, max, min_followers):
    """Follow users who tweet about keywords"""
    pass

# Engagement commands
@cli.group()
def engage():
    """Engagement commands"""
    pass

@engage.command()
@click.argument('keywords', nargs=-1)
@click.option('--max', '-m', default=50)
@click.option('--duration', '-d', default=30, help='Duration in minutes')
def auto_like(keywords, max, duration):
    """Auto-like tweets matching keywords"""
    pass

# Monitoring commands
@cli.group()
def monitor():
    """Monitoring commands"""
    pass

@monitor.command()
@click.option('--notify', is_flag=True, help='Send notifications')
def unfollowers(notify):
    """Detect who unfollowed you"""
    pass

# AI commands
@cli.group()
def ai():
    """AI-powered commands"""
    pass

@ai.command()
@click.argument('tweet_text')
@click.option('--style', '-s', default='helpful')
def reply(tweet_text, style):
    """Generate an AI reply to a tweet"""
    pass

if __name__ == '__main__':
    cli()
```

### Documentation Requirements

Create comprehensive documentation:

#### README.md
```markdown
# Xeepy - X/Twitter Automation Toolkit

> ⚠️ **EDUCATIONAL PURPOSES ONLY** - This toolkit demonstrates automation techniques
> for research and learning. Do not run these scripts against X/Twitter.

## Features

- 📊 **Scraping**: Profile, followers, following, tweets, replies, threads
- 🔄 **Follow/Unfollow**: Smart operations with filters and tracking
- 💜 **Engagement**: Auto-like, auto-comment, retweet automation
- 📈 **Monitoring**: Unfollower detection, account monitoring, growth tracking
- 🤖 **AI Features**: Content generation, sentiment analysis, smart targeting

## Installation

\`\`\`bash
pip install xeepy
\`\`\`

## Quick Start

\`\`\`bash
# Login (save session)
xeepy auth login

# Scrape followers
xeepy scrape followers elonmusk --limit 100 --output followers.json

# Unfollow non-followers (dry run)
xeepy unfollow non-followers --dry-run

# Auto-like by keyword
xeepy engage auto-like "python" "web3" --max 50

# Detect unfollowers
xeepy monitor unfollowers --notify
\`\`\`

## Python API

\`\`\`python
from xeepy import Xeepy

async with Xeepy() as x:
    # Scrape
    followers = await x.scrape.followers("username", limit=100)
    
    # Unfollow non-followers
    result = await x.unfollow.non_followers(max=50, dry_run=True)
    
    # Auto-like
    await x.engage.auto_like(keywords=["python"], max_likes=50)
\`\`\`
```

## QUALITY REQUIREMENTS

- Clean CLI interface with rich output
- Progress bars for long operations
- Comprehensive error messages
- Configuration file support (YAML)
- Environment variable support
- API rate limiting
- Async throughout

## DELIVERABLES

1. Complete `ai/` module with all AI features
2. Complete `cli/` module with all commands
3. Complete `api/` module with REST API
4. Complete `config/` module
5. Complete `docs/` with all documentation
6. setup.py and pyproject.toml for packaging
7. GitHub Actions CI/CD workflow
8. Tests for all features
```

---

## 🤝 Agent Coordination Protocol

All 5 agents should follow these coordination rules:

### Shared Conventions

1. **Code Style**: Black formatter, 88 char line length
2. **Type Hints**: Python 3.10+ style with `from __future__ import annotations`
3. **Docstrings**: Google style
4. **Logging**: Use `loguru` consistently
5. **Async**: All I/O operations must be async
6. **Testing**: pytest with pytest-asyncio

### Interface Contracts

```python
# All agents must use these shared interfaces

# From Agent 1 (Core)
from xeepy.core.browser import BrowserManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.core.auth import AuthManager
from xeepy.core.selectors import Selectors

# Models shared across agents
from xeepy.models import User, Tweet

# Result types
from xeepy.core.results import ActionResult, ScrapeResult
```

### Directory Ownership

| Agent | Owns | Uses |
|-------|------|------|
| Agent 1 | core/, scrapers/, models/, exporters/ | - |
| Agent 2 | actions/follow/, actions/unfollow/, storage/ | core/, scrapers/ |
| Agent 3 | actions/engagement/, templates/ | core/, scrapers/ |
| Agent 4 | monitoring/, analytics/, notifications/ | core/, scrapers/, storage/ |
| Agent 5 | ai/, cli/, api/, config/, docs/ | ALL modules |

### Communication

- Agent 5 integrates all modules and handles dependencies
- All agents document their public interfaces
- Breaking changes must be communicated

---

## 📦 Final Project Structure

```
xeepy/
├── __init__.py
├── core/                       # Agent 1
│   ├── browser.py
│   ├── auth.py
│   ├── rate_limiter.py
│   ├── config.py
│   ├── exceptions.py
│   ├── selectors.py
│   └── utils.py
├── scrapers/                   # Agent 1
│   ├── profile.py
│   ├── followers.py
│   ├── following.py
│   ├── tweets.py
│   ├── replies.py
│   ├── thread.py
│   ├── hashtag.py
│   ├── media.py
│   ├── likes.py
│   ├── lists.py
│   └── search.py
├── models/                     # Agent 1
│   ├── user.py
│   ├── tweet.py
│   └── engagement.py
├── exporters/                  # Agent 1
│   ├── csv_exporter.py
│   ├── json_exporter.py
│   └── sqlite_exporter.py
├── actions/                    # Agents 2 & 3
│   ├── base.py
│   ├── follow/                 # Agent 2
│   │   ├── follow_user.py
│   │   ├── follow_by_keyword.py
│   │   ├── follow_by_hashtag.py
│   │   ├── follow_followers.py
│   │   ├── follow_engagers.py
│   │   └── auto_follow.py
│   ├── unfollow/               # Agent 2
│   │   ├── unfollow_user.py
│   │   ├── unfollow_all.py
│   │   ├── unfollow_non_followers.py
│   │   ├── smart_unfollow.py
│   │   └── unfollow_by_criteria.py
│   └── engagement/             # Agent 3
│       ├── like/
│       ├── comment/
│       ├── retweet/
│       └── bookmark/
├── templates/                  # Agent 3
│   └── comment_templates.py
├── storage/                    # Agent 2 & 4
│   ├── follow_tracker.py
│   ├── snapshots.py
│   ├── timeseries.py
│   └── database.py
├── monitoring/                 # Agent 4
│   ├── unfollower_detector.py
│   ├── follower_alerts.py
│   ├── account_monitor.py
│   ├── keyword_monitor.py
│   └── engagement_tracker.py
├── analytics/                  # Agent 4
│   ├── growth_tracker.py
│   ├── engagement_analytics.py
│   ├── best_time_to_post.py
│   ├── audience_insights.py
│   ├── competitor_analysis.py
│   └── reports.py
├── notifications/              # Agent 4
│   ├── console.py
│   ├── email.py
│   ├── webhook.py
│   └── telegram.py
├── ai/                         # Agent 5
│   ├── content_generator.py
│   ├── sentiment_analyzer.py
│   ├── spam_detector.py
│   ├── smart_targeting.py
│   ├── crypto_analyzer.py
│   ├── influencer_finder.py
│   └── providers/
├── cli/                        # Agent 5
│   ├── main.py
│   └── commands/
├── api/                        # Agent 5
│   └── server.py
├── config/                     # Agent 5
│   ├── settings.py
│   └── default_config.yaml
├── docs/                       # Agent 5
│   ├── README.md
│   ├── INSTALLATION.md
│   ├── CLI_REFERENCE.md
│   ├── API_REFERENCE.md
│   ├── FEATURES.md
│   └── EXAMPLES.md
├── tests/                      # All Agents
├── requirements.txt
├── setup.py
└── pyproject.toml
```

---

## ⚠️ Disclaimer

This toolkit is provided for **educational and research purposes only**. 

- Do NOT run these scripts against X/Twitter
- Automated actions may violate X/Twitter Terms of Service
- Use of these techniques may result in account suspension
- The authors are not responsible for any misuse

This project demonstrates:
- Web scraping techniques
- Browser automation patterns
- Rate limiting strategies
- AI integration methods

Understanding these techniques helps developers build better, more ethical software.




## 📋 Master Feature List

The following features should be implemented across all 5 agents:

### Core Scraping
- [ ] Get tweet replies (fix existing)
- [ ] Scrape user profile
- [ ] Scrape followers list
- [ ] Scrape following list
- [ ] Scrape user tweets
- [ ] Scrape tweet thread
- [ ] Scrape hashtag tweets
- [ ] Scrape user media
- [ ] Scrape tweet likes
- [ ] Scrape list members
- [ ] Search tweets by query

### Unfollow Operations
- [ ] Unfollow everyone
- [ ] Unfollow non-followers
- [ ] Smart unfollow (time-based)
- [ ] Unfollow with logging/export
- [ ] Unfollow by criteria (inactive, spam, etc.)

### Follow Operations
- [ ] Follow user
- [ ] Follow by keywords/search
- [ ] Follow by hashtag
- [ ] Follow followers of target account
- [ ] Follow engagers (likers/commenters of posts)
- [ ] Auto-follow with filters

### Engagement Actions
- [ ] Auto-like by keywords
- [ ] Auto-like by user
- [ ] Auto-like by hashtag
- [ ] Auto-comment/reply
- [ ] Auto-retweet
- [ ] Bookmark management
- [ ] Quote tweet

### Monitoring & Analysis
- [ ] Detect unfollowers
- [ ] New follower alerts
- [ ] Monitor any account
- [ ] Engagement analytics
- [ ] Growth tracking

### AI-Powered Features
- [ ] AI content generation for comments
- [ ] Sentiment analysis on tweets
- [ ] Spam/bot detection
- [ ] Smart targeting recommendations
- [ ] Crypto Twitter analysis
- [ ] Influencer identification

### Account Management
- [ ] Block/unblock users
- [ ] Mute/unmute users
- [ ] List management (create, add, remove)
- [ ] DM automation
- [ ] Profile updates

### Utilities
- [ ] Export to CSV/JSON
- [ ] Rate limit handling
- [ ] Session management
- [ ] Proxy support
- [ ] Multi-account support
- [ ] Scheduling system

---