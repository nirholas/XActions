# Xeepy - X/Twitter Automation Toolkit

⚠️ **EDUCATIONAL PURPOSES ONLY** - Do not run this code against X/Twitter. This project is for learning about API design, async programming, and AI integration patterns.

## Overview

Xeepy is a comprehensive Python toolkit for X/Twitter automation featuring:

- **🔍 Scraping**: Profile, followers, tweets, replies, threads
- **➕ Follow/Unfollow**: Smart operations with filters and whitelists
- **💬 Engagement**: Auto-like, auto-comment, retweet automation
- **📊 Monitoring**: Unfollower detection, growth tracking, analytics
- **🤖 AI Features**: Content generation, sentiment analysis, spam detection

## Features

### CLI Interface

```bash
# Scraping
xeepy scrape profile elonmusk
xeepy scrape followers elonmusk --limit 100
xeepy scrape replies https://twitter.com/user/status/123

# Follow/Unfollow
xeepy follow user elonmusk
xeepy follow by-keyword "AI" "machine learning" --max 50
xeepy unfollow non-followers --dry-run

# Engagement
xeepy engage auto-like "AI" "GPT" --max 50
xeepy engage comment tweet_url --ai --style witty

# Monitoring
xeepy monitor unfollowers
xeepy monitor growth --period 7d

# AI Features
xeepy ai reply "Great tweet about AI!" --style helpful
xeepy ai generate "thread about Python tips" --thread --num 5
xeepy ai sentiment "I love this product!"
xeepy ai analyze-user suspicious_account
```

### REST API

```python
# Start the API server
xeepy-api

# Or programmatically
from xeepy.api import run_server
run_server(port=8000)
```

API endpoints include:
- `GET /api/v1/scrape/profile/{username}`
- `POST /api/v1/ai/generate/reply`
- `POST /api/v1/follow/by-keyword`
- `GET /api/v1/monitor/unfollowers`

See [API Reference](docs/API_REFERENCE.md) for full documentation.

### Python SDK

```python
from xeepy.ai import ContentGenerator, SentimentAnalyzer
from xeepy.ai.providers import OpenAIProvider

# AI Content Generation
async with OpenAIProvider() as provider:
    generator = ContentGenerator(provider)
    
    # Generate a reply
    reply = await generator.generate_reply(
        "Just launched my new AI startup!",
        style="helpful"
    )
    print(reply.content)
    
    # Generate a thread
    thread = await generator.generate_thread(
        "Python async programming tips",
        num_tweets=5
    )
    for tweet in thread:
        print(tweet.content)

# Sentiment Analysis
analyzer = SentimentAnalyzer(provider)
result = await analyzer.analyze_tweet(
    "This product is amazing! Best purchase ever!",
    include_emotions=True
)
print(f"Sentiment: {result.label} ({result.score:+.2f})")
print(f"Emotions: {result.emotions}")
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/xeepy.git
cd xeepy

# Install with pip
pip install -e .

# Or with all optional dependencies
pip install -e ".[all]"
```

### Requirements

- Python 3.10+
- Required: click, rich, pydantic, loguru, pyyaml
- Optional: openai, anthropic, fastapi, uvicorn

## Configuration

### Environment Variables

```bash
# AI Provider Keys
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-...

# API Server
export XEEPY_API_KEY=your-api-key
export XEEPY_DEBUG=false
```

### Configuration File

Create `config.yaml`:

```yaml
ai:
  provider: openai
  model: gpt-4-turbo-preview
  temperature: 0.7

rate_limit:
  requests_per_minute: 60
  delay_between_follows: 5.0

export:
  default_format: json
  output_dir: ./output
```

See [Configuration Guide](docs/CONFIGURATION.md) for all options.

## Project Structure

```
xeepy/
├── ai/                    # AI features module
│   ├── providers/         # AI provider implementations
│   │   ├── base.py       # Base provider class
│   │   ├── openai.py     # OpenAI/GPT provider
│   │   ├── anthropic.py  # Anthropic/Claude provider
│   │   └── local.py      # Local models (Ollama)
│   ├── content_generator.py  # Tweet/reply generation
│   ├── sentiment_analyzer.py # Sentiment analysis
│   ├── spam_detector.py     # Bot/spam detection
│   ├── smart_targeting.py   # AI targeting
│   ├── crypto_analyzer.py   # Crypto Twitter analysis
│   └── influencer_finder.py # Influencer discovery
├── cli/                   # CLI module
│   ├── main.py           # Main CLI entry
│   ├── utils.py          # CLI utilities
│   └── commands/         # Command groups
│       ├── scrape.py
│       ├── follow.py
│       ├── unfollow.py
│       ├── engage.py
│       ├── monitor.py
│       └── ai.py
├── api/                   # REST API module
│   ├── server.py         # FastAPI server
│   └── routes/           # API routes
│       ├── scrape.py
│       ├── follow.py
│       ├── engage.py
│       ├── monitor.py
│       └── ai.py
└── config/               # Configuration module
    ├── settings.py       # Settings management
    └── default_config.yaml
```

## AI Providers

### OpenAI (Default)

```python
from xeepy.ai.providers import OpenAIProvider, ProviderConfig

provider = OpenAIProvider(config=ProviderConfig(
    model="gpt-4-turbo-preview",
    temperature=0.7,
))
```

### Anthropic (Claude)

```python
from xeepy.ai.providers import AnthropicProvider

provider = AnthropicProvider(config=ProviderConfig(
    model="claude-3-sonnet-20240229",
))
```

### Local Models (Ollama)

```python
from xeepy.ai.providers import OllamaProvider

provider = OllamaProvider(
    model="llama2",
    base_url="http://localhost:11434",
)
```

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [CLI Reference](docs/CLI_REFERENCE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Features Guide](docs/FEATURES.md)
- [Configuration](docs/CONFIGURATION.md)
- [Examples](docs/EXAMPLES.md)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## License

Apache 2.0 License - see [LICENSE](LICENSE) for details.

## Disclaimer

⚠️ **This project is for educational purposes only.** 

- Do NOT use this against X/Twitter's production services
- Automated actions may violate X/Twitter's Terms of Service
- Use at your own risk - we are not responsible for any account actions
- This code demonstrates API design patterns, not production automation
