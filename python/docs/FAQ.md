# ❓ Frequently Asked Questions

Common questions about Xeepy answered.

---

## General Questions

### What is Xeepy?

Xeepy is a Python toolkit for X/Twitter automation. It provides:
- 12 different scrapers (replies, followers, tweets, etc.)
- Follow/unfollow automation
- Engagement tools (auto-like, auto-comment)
- Monitoring (unfollower detection, account tracking)
- AI integration (GPT, Claude, Ollama)

### Is Xeepy free?

Yes! Xeepy is completely free and open-source (MIT License).

### Do I need a Twitter API key?

**No.** Xeepy uses browser automation instead of the Twitter API. This means:
- No API costs ($100-5000/month saved)
- No rate limit restrictions
- No application approval needed
- Works with any X/Twitter account

### Is Xeepy safe to use?

Xeepy includes:
- Built-in rate limiting
- Random delays between actions
- Stealth browser settings

However, any automation may risk account restrictions. Use responsibly and start with small numbers.

---

## Installation Questions

### How do I install Xeepy?

```bash
pip install xeepy
```

Or from source:
```bash
git clone https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy.git
pip install -e .
```

### What Python version do I need?

Python 3.10 or higher is required.

### What are the dependencies?

Core dependencies:
- `playwright` - Browser automation
- `loguru` - Logging
- `pydantic` - Data models
- `click` - CLI
- `rich` - Terminal output

AI dependencies (optional):
- `openai` - GPT integration
- `anthropic` - Claude integration

Install all with:
```bash
pip install xeepy[ai]
```

### Browser installation failed?

Run:
```bash
playwright install chromium
```

---

## Authentication Questions

### How do I authenticate?

1. Open [x.com](https://x.com) in your browser
2. Open Developer Tools (F12)
3. Go to Application → Cookies → x.com
4. Copy the `auth_token` value
5. Set it in Xeepy:

```python
async with Xeepy(auth_token="your_token") as x:
    ...
```

Or via environment variable:
```bash
export XEEPY_AUTH_TOKEN=your_token
```

### My authentication expired. What do I do?

Re-fetch your `auth_token` from the browser. Tokens typically expire after a few weeks.

### Can I use multiple accounts?

Yes, pass different auth tokens:

```python
async with Xeepy(auth_token="account1_token") as x1:
    ...

async with Xeepy(auth_token="account2_token") as x2:
    ...
```

---

## Feature Questions

### Does the tweet reply scraper work?

Yes! This is the main fix for the original repo. The original used Tweepy's deprecated search API. Xeepy uses browser automation which works reliably.

```python
async with Xeepy() as x:
    replies = await x.scrape.replies("https://x.com/user/status/123")
```

### Can I unfollow non-followers?

Yes, this is the most popular feature:

```python
async with Xeepy() as x:
    await x.unfollow.non_followers(max_unfollows=100)
```

### Can I detect who unfollowed me?

Yes:

```python
async with Xeepy() as x:
    report = await x.monitor.unfollowers()
    print(report.unfollowers)
```

### Does auto-like work?

Yes:

```python
async with Xeepy() as x:
    await x.engage.auto_like(keywords=["Python"], max_likes=25)
```

### Can I use AI to generate replies?

Yes, with OpenAI, Claude, or local models:

```python
from xeepy.ai import ContentGenerator

ai = ContentGenerator(provider="openai", api_key="sk-...")
reply = await ai.generate_reply("Great tweet!", style="supportive")
```

---

## Rate Limits & Safety

### What are the rate limits?

Xeepy includes conservative defaults:

| Action | Per Hour | Per Day | Delay |
|--------|----------|---------|-------|
| Follow | 20 | 100 | 3-8 sec |
| Unfollow | 25 | 150 | 2-6 sec |
| Like | 50 | 500 | 1-3 sec |
| Comment | 10 | 50 | 30-90 sec |

### Can I change rate limits?

Yes:

```python
from xeepy.core.rate_limiter import RateLimiter

limiter = RateLimiter()
limiter.set_limit("follow", per_hour=10, delay=(5, 10))
```

### Will I get banned?

Risk depends on your usage. To minimize risk:
- Start with small numbers (10-25 actions)
- Use dry-run mode first
- Don't run continuously
- Take breaks between sessions
- Don't spam

### What if I hit a rate limit?

Xeepy will automatically wait and retry. You'll see:

```
⏳ Rate limited. Waiting 60 seconds...
```

---

## Troubleshooting

### "Authentication failed"

1. Re-fetch your `auth_token` from browser
2. Make sure you're logged into X/Twitter
3. Clear browser cookies and re-login

### "Element not found"

X/Twitter may have updated their UI. Solutions:
1. Update Xeepy: `pip install --upgrade xeepy`
2. Check for open issues on GitHub
3. Try running with `headless=False` to see what's happening

### "Browser crashed"

1. Make sure Playwright is installed: `playwright install chromium`
2. Try running non-headless: `Xeepy(headless=False)`
3. Check available memory

### "Timeout waiting for element"

X/Twitter might be loading slowly:
1. Increase timeout in config
2. Check your internet connection
3. Try running at off-peak hours

### Scraping returns empty results

1. Check if the account is private
2. Verify the URL/username is correct
3. Some features require authentication

---

## Comparison Questions

### Xeepy vs Tweepy?

| Feature | Xeepy | Tweepy |
|---------|--------|--------|
| API Required | ❌ No | ✅ Yes |
| Cost | Free | $100-5000/mo |
| Reply Scraping | ✅ Works | ❌ Deprecated |
| Rate Limits | Flexible | Strict |
| Setup | Easy | Complex |

### Xeepy vs Twitter API v2?

| Feature | Xeepy | API v2 |
|---------|--------|--------|
| Cost | Free | $100-5000/mo |
| Approval | Not needed | Required |
| Rate Limits | No hard limits | 500k tweets/mo (Enterprise) |
| Real-time | Near real-time | Yes (streaming) |

### Xeepy vs Hypefury/Tweethunter?

| Feature | Xeepy | Hypefury/TweetHunter |
|---------|--------|----------------------|
| Cost | Free | $29-99/mo |
| Open Source | ✅ Yes | ❌ No |
| Self-hosted | ✅ Yes | ❌ No |
| Customizable | ✅ Fully | Limited |
| AI Features | ✅ Yes | ✅ Yes |

---

## Contribution Questions

### How can I contribute?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [Contributing Guide](community/contributing.md) for details.

### How do I report a bug?

Open an issue on GitHub with:
1. Description of the bug
2. Steps to reproduce
3. Expected vs actual behavior
4. Xeepy version
5. Python version

### How do I request a feature?

Open an issue on GitHub with:
1. Description of the feature
2. Use case
3. Expected behavior

---

## Legal Questions

### Is web scraping legal?

Web scraping public data is generally legal, but:
- Respect robots.txt
- Don't overload servers
- Don't scrape private data
- Check local laws
- Review X/Twitter ToS

### Can I use Xeepy commercially?

Yes, under the MIT License. However:
- Automation may violate X/Twitter ToS
- Don't use for spam or harassment
- Users are responsible for their usage

### Who is responsible if I get banned?

You are. Xeepy is provided "as-is" for educational purposes. The authors are not responsible for any account restrictions.

---

## Getting Help

### Where can I get help?

1. **Documentation**: Start here!
2. **GitHub Issues**: For bugs and features
3. **Examples**: See [EXAMPLES.md](EXAMPLES.md)

### Still have questions?

Open an issue on GitHub or tweet [@nichxbt](https://x.com/nichxbt).

---

<p align="center">
  <strong>Didn't find your answer? <a href="https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy/issues">Open an issue!</a></strong>
</p>
