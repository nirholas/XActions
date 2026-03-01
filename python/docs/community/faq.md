# Frequently Asked Questions

Common questions and answers about Xeepy.

## General

### What is Xeepy?

Xeepy is a Python toolkit for X/Twitter automation. It uses browser automation (Playwright) instead of the Twitter API, which means:

- ✅ No API fees ($0/month vs $100+/month)
- ✅ No rate limit anxiety
- ✅ No approval process
- ✅ Access to all features

### Is Xeepy free?

Yes! Xeepy is open-source and free under the MIT license.

### Is Xeepy legal?

Xeepy is for educational purposes only. While browser automation isn't explicitly forbidden, automated access to X/Twitter may violate their Terms of Service. Use responsibly and at your own risk.

### Does Xeepy require Twitter API keys?

No. Xeepy uses browser automation, so you don't need:

- Twitter Developer Account
- API keys or tokens
- Elevated access approval

You just log in with your regular X/Twitter account.

## Installation

### What Python version do I need?

Python 3.10 or higher is required.

```bash
python --version  # Should be 3.10+
```

### How do I install Xeepy?

```bash
pip install xeepy
playwright install chromium
```

### I get "playwright not found" error

Install Playwright and its browser:

```bash
pip install playwright
playwright install chromium
```

### Installation is slow on Linux

The browser download can be slow. Try using a CDN:

```bash
PLAYWRIGHT_DOWNLOAD_HOST=https://playwright.azureedge.net playwright install chromium
```

### How do I update Xeepy?

```bash
pip install --upgrade xeepy
playwright install chromium  # Update browser too
```

## Authentication

### How do I authenticate?

```bash
xeepy auth login  # Opens browser for manual login
```

Or in Python:

```python
async with Xeepy() as x:
    await x.auth.login()
```

### Where is my session stored?

Default locations:

| OS | Path |
|----|------|
| Linux | `~/.config/xeepy/session.json` |
| macOS | `~/Library/Application Support/xeepy/session.json` |
| Windows | `%APPDATA%\xeepy\session.json` |

### My session expired. What do I do?

Re-authenticate:

```bash
xeepy auth login
```

Sessions typically last 30 days.

### Can I use multiple accounts?

Yes! Use profiles:

```bash
xeepy auth login --profile personal
xeepy auth login --profile business

# Use specific profile
xeepy --profile business scrape replies URL
```

### Can I run on a headless server?

Yes, but you'll need to authenticate first:

1. Authenticate on a machine with a display:
   ```bash
   xeepy auth login
   xeepy auth export session.json
   ```

2. Copy `session.json` to your server

3. Import on server:
   ```bash
   xeepy auth import session.json
   ```

## Scraping

### How many tweets/followers can I scrape?

There's no hard limit in Xeepy, but X/Twitter may impose limits:

- Start with small amounts (100-500)
- Increase gradually
- Use delays between requests
- Respect rate limits

### Scraping is slow. How can I speed it up?

```python
# Increase rate limit (use carefully)
x.config.rate_limit.requests_per_minute = 30

# Use caching
x.config.storage.cache_enabled = True
```

### I'm getting blocked/rate limited

Reduce your request rate:

```python
x.config.rate_limit.requests_per_minute = 10
```

Or use proxies:

```toml
# xeepy.toml
[xeepy.proxy]
enabled = true
url = "http://user:pass@proxy:8080"
```

### Can I scrape private accounts?

Only if:
1. You follow the account
2. They follow you back (for some data)

Xeepy respects privacy settings.

### How do I export data?

```python
x.export.to_csv(data, "output.csv")
x.export.to_json(data, "output.json")
x.export.to_excel(data, "output.xlsx")
```

Or via CLI:

```bash
xeepy scrape tweets username --limit 100 -o tweets.csv
```

## Follow/Unfollow

### How many follows/unfollows per day is safe?

Conservative limits:

| Action | Safe Limit |
|--------|------------|
| Follows | 30-50/day |
| Unfollows | 50-100/day |
| Likes | 100-200/day |

Xeepy has built-in limits. Don't disable them.

### I accidentally unfollowed someone important!

Check the result object for who was unfollowed:

```python
result = await x.unfollow.non_followers()
print(result.unfollowed_users)  # List of unfollowed

# Re-follow
await x.follow.user("important_person")
```

### How do I protect accounts from unfollowing?

Use a whitelist:

```python
await x.unfollow.non_followers(
    whitelist=["friend1", "friend2"],
    # or
    whitelist_file="whitelist.txt"
)
```

### My follow ratio is bad. How do I fix it?

```python
# Unfollow non-followers gradually
await x.unfollow.non_followers(max_unfollows=25)  # Daily

# Or smart unfollow
await x.unfollow.smart(
    criteria={"inactive_days": 90, "not_following_back": True},
    max_unfollows=50
)
```

## AI Features

### Which AI providers are supported?

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3)
- Ollama (local, free)

### How do I use AI without paying?

Use Ollama for free, local AI:

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3
```

```python
from xeepy.ai import ContentGenerator

ai = ContentGenerator(
    provider="ollama",
    model="llama3"
)
```

### AI-generated content sounds robotic

Adjust the temperature and add personalization:

```python
ai = ContentGenerator(
    provider="openai",
    temperature=0.8,  # Higher = more creative
)

# Add your style context
reply = await ai.generate_reply(
    tweet_text=tweet,
    style="casual",
    voice_sample="your previous tweets here"  # Optional
)
```

## Troubleshooting

### Browser keeps crashing

```bash
# Reinstall browser
playwright install chromium --force

# Install dependencies (Linux)
playwright install-deps chromium
```

### "Element not found" errors

X/Twitter's UI changed. Update Xeepy:

```bash
pip install --upgrade xeepy
```

If still broken, [report the issue](https://github.com/xeepy/xeepy/issues).

### High memory usage

Use streaming for large datasets:

```python
async for batch in x.scrape.followers_batched("user", batch_size=100):
    x.export.append_csv(batch, "followers.csv")
```

### Operations are timing out

Increase timeout:

```python
async with Xeepy(timeout=60000) as x:  # 60 seconds
    ...
```

### I'm getting CAPTCHA challenges

This means X/Twitter detected automation:

1. Use headful mode to solve manually:
   ```python
   async with Xeepy(headless=False) as x:
       await x.auth.login()
   ```

2. Reduce request rate
3. Use residential proxies
4. Take a break (24-48 hours)

## Best Practices

### What's the safest way to use Xeepy?

1. **Start slow** - Begin with low limits
2. **Use delays** - Don't rapid-fire requests
3. **Be human** - Mix automated and manual activity
4. **Monitor** - Watch for warnings/blocks
5. **Backup** - Keep whitelist and session backups

### How do I avoid getting my account flagged?

- Don't follow/unfollow the same people repeatedly
- Keep following ratio reasonable (< 1.5)
- Mix content types (not all automation)
- Take breaks
- Use residential proxies if needed

### Should I use a dedicated account?

For heavy automation, yes. Don't risk your main account.

## More Questions?

- 📖 [Full Documentation](../index.md)
- 💬 [Discord Community](https://discord.gg/xeepy)
- 🐛 [Report Issues](https://github.com/xeepy/xeepy/issues)
- 📧 [Email Support](mailto:support@xeepy.dev)
