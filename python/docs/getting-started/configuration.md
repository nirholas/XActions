# Configuration

Xeepy is highly configurable. This guide covers all configuration options and best practices.

## Configuration Methods

Xeepy supports multiple configuration methods (in order of precedence):

1. **Code** - Direct parameters in your script
2. **Environment variables** - For secrets and deployment
3. **Config file** - `xeepy.toml` or `xeepy.yaml`
4. **Defaults** - Sensible built-in defaults

## Quick Configuration

### In Code

```python
from xeepy import Xeepy

async with Xeepy(
    headless=True,           # Run browser invisibly
    timeout=30000,           # 30 second timeout
    rate_limit=20,           # Max 20 requests/minute
    session_file="session.json"
) as x:
    # Your code here
    pass
```

### Environment Variables

```bash
# Authentication
export XEEPY_SESSION_FILE="/path/to/session.json"

# Browser
export XEEPY_HEADLESS=true
export XEEPY_TIMEOUT=30000

# Rate limiting
export XEEPY_RATE_LIMIT=20

# Proxy
export XEEPY_PROXY_URL="http://user:pass@proxy:8080"

# AI Features
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Notifications
export DISCORD_WEBHOOK="https://discord.com/api/webhooks/..."
export TELEGRAM_BOT_TOKEN="123456:ABC..."
export TELEGRAM_CHAT_ID="123456789"
```

### Config File

Create `xeepy.toml` in your project root:

```toml
[xeepy]
# ============================================
# CORE SETTINGS
# ============================================

# Browser mode: true = invisible, false = visible
headless = true

# Page load timeout (milliseconds)
timeout = 30000

# Slow down operations by X ms (helps avoid detection)
slow_mo = 100

# Default session file location
session_file = "~/.config/xeepy/session.json"

# ============================================
# RATE LIMITING
# ============================================

[xeepy.rate_limit]
# Global rate limit (requests per minute)
requests_per_minute = 20

# Operation-specific limits
follows_per_hour = 30
unfollows_per_hour = 50
likes_per_hour = 100
tweets_per_day = 300

# Cooldown after hitting limits (seconds)
cooldown_duration = 300

# ============================================
# PROXY SETTINGS
# ============================================

[xeepy.proxy]
enabled = false
url = "http://user:pass@proxy:8080"

# Rotate proxies (requires proxy list)
rotate = false
proxy_file = "proxies.txt"

# ============================================
# BROWSER FINGERPRINT
# ============================================

[xeepy.browser]
# User agent (leave empty for default)
user_agent = ""

# Viewport size
viewport_width = 1920
viewport_height = 1080

# Locale and timezone
locale = "en-US"
timezone = "America/New_York"

# ============================================
# STORAGE & CACHING
# ============================================

[xeepy.storage]
# Enable caching
cache_enabled = true

# Cache location
cache_dir = "~/.cache/xeepy"

# Cache TTL (seconds) - how long to keep cached data
cache_ttl = 3600

# Database for persistent storage
database_url = "sqlite:///~/.local/share/xeepy/data.db"

# ============================================
# EXPORT DEFAULTS
# ============================================

[xeepy.export]
# Default format: csv, json, excel, parquet
default_format = "csv"

# Default output directory
output_dir = "./exports"

# Include timestamp in filenames
timestamp_filenames = true

# ============================================
# AI FEATURES
# ============================================

[xeepy.ai]
# Default provider: openai, anthropic, ollama
default_provider = "openai"

# Model settings per provider
[xeepy.ai.openai]
model = "gpt-4-turbo"
temperature = 0.7
max_tokens = 500

[xeepy.ai.anthropic]
model = "claude-3-sonnet"
temperature = 0.7
max_tokens = 500

[xeepy.ai.ollama]
model = "llama3"
base_url = "http://localhost:11434"

# ============================================
# NOTIFICATIONS
# ============================================

[xeepy.notifications]
# Enable notifications
enabled = true

# Notification triggers
notify_on_error = true
notify_on_complete = false
notify_daily_report = true

# Discord
discord_webhook = ""

# Telegram
telegram_bot_token = ""
telegram_chat_id = ""

# Email
smtp_host = "smtp.gmail.com"
smtp_port = 587
smtp_user = ""
smtp_password = ""
email_to = ""

# ============================================
# LOGGING
# ============================================

[xeepy.logging]
# Log level: DEBUG, INFO, WARNING, ERROR
level = "INFO"

# Log file (leave empty for console only)
file = "~/.local/share/xeepy/xeepy.log"

# Log format
format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Rotate logs
max_size_mb = 10
backup_count = 5

# ============================================
# SAFETY SETTINGS
# ============================================

[xeepy.safety]
# Dry run mode (no actual actions)
dry_run = false

# Confirm destructive operations
confirm_unfollow = false
confirm_mass_operations = true

# Daily limits (0 = unlimited)
max_follows_per_day = 100
max_unfollows_per_day = 200
max_likes_per_day = 500
max_tweets_per_day = 50

# Whitelist (never unfollow these)
whitelist_file = "whitelist.txt"
```

## YAML Format

If you prefer YAML, create `xeepy.yaml`:

```yaml
xeepy:
  headless: true
  timeout: 30000
  session_file: ~/.config/xeepy/session.json

  rate_limit:
    requests_per_minute: 20
    follows_per_hour: 30

  proxy:
    enabled: false
    url: http://user:pass@proxy:8080

  ai:
    default_provider: openai
    openai:
      model: gpt-4-turbo
      temperature: 0.7

  notifications:
    enabled: true
    discord_webhook: ${DISCORD_WEBHOOK}
```

## Environment-Specific Config

### Development

```toml
# xeepy.dev.toml
[xeepy]
headless = false  # See the browser
slow_mo = 500     # Slow for debugging
rate_limit.requests_per_minute = 5  # Conservative

[xeepy.logging]
level = "DEBUG"

[xeepy.safety]
dry_run = true    # Don't actually perform actions
```

### Production

```toml
# xeepy.prod.toml
[xeepy]
headless = true
slow_mo = 50

[xeepy.rate_limit]
requests_per_minute = 30

[xeepy.logging]
level = "INFO"
file = "/var/log/xeepy/xeepy.log"

[xeepy.notifications]
enabled = true
notify_on_error = true
```

### Load Environment Config

```python
import os
from xeepy import Xeepy

# Load based on environment
env = os.getenv("XEEPY_ENV", "dev")
config_file = f"xeepy.{env}.toml"

async with Xeepy(config_file=config_file) as x:
    pass
```

## Programmatic Configuration

### Using Config Class

```python
from xeepy import Xeepy
from xeepy.core.config import Config

# Create config programmatically
config = Config(
    headless=True,
    rate_limit=Config.RateLimit(
        requests_per_minute=25,
        follows_per_hour=40
    ),
    proxy=Config.Proxy(
        enabled=True,
        url="http://proxy:8080"
    )
)

async with Xeepy(config=config) as x:
    pass
```

### Runtime Configuration

```python
async with Xeepy() as x:
    # Change settings at runtime
    x.config.rate_limit.requests_per_minute = 10
    x.config.headless = False
    
    # Reload config from file
    x.config.reload()
    
    # Get current config
    print(x.config.to_dict())
```

## Profile System

Manage multiple configurations:

```python
from xeepy import Xeepy

# Development profile
async with Xeepy(profile="dev") as x:
    pass  # Uses xeepy.dev.toml + session_dev.json

# Production profile
async with Xeepy(profile="prod") as x:
    pass  # Uses xeepy.prod.toml + session_prod.json

# Custom profile
async with Xeepy(profile="client_abc") as x:
    pass  # Uses xeepy.client_abc.toml
```

## Configuration Validation

Xeepy validates your configuration on startup:

```python
from xeepy.core.config import Config, validate_config

# Validate config file
errors = validate_config("xeepy.toml")
if errors:
    for error in errors:
        print(f"Config error: {error}")
else:
    print("✓ Configuration valid")
```

## Secrets Management

### Using Environment Variables

```toml
# xeepy.toml - Reference env vars
[xeepy.notifications]
discord_webhook = "${DISCORD_WEBHOOK}"
telegram_bot_token = "${TELEGRAM_TOKEN}"

[xeepy.ai.openai]
api_key = "${OPENAI_API_KEY}"
```

### Using .env Files

```bash
# .env file
XEEPY_SESSION_FILE=/secure/path/session.json
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
OPENAI_API_KEY=sk-...
```

```python
from dotenv import load_dotenv
from xeepy import Xeepy

load_dotenv()  # Load .env file

async with Xeepy() as x:
    pass  # Uses env vars automatically
```

### Using Secret Managers

```python
import boto3
from xeepy import Xeepy

# AWS Secrets Manager example
def get_secret(name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=name)
    return response['SecretString']

async with Xeepy(
    session_file=get_secret("xeepy/session"),
    proxy_url=get_secret("xeepy/proxy")
) as x:
    pass
```

## Configuration Reference

### All Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | bool | `True` | Run browser invisibly |
| `timeout` | int | `30000` | Page timeout (ms) |
| `slow_mo` | int | `0` | Slow down operations (ms) |
| `session_file` | str | Auto | Path to session file |
| `config_file` | str | Auto | Path to config file |
| `profile` | str | None | Named profile to use |

### Rate Limit Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requests_per_minute` | int | `20` | Global rate limit |
| `follows_per_hour` | int | `30` | Max follows per hour |
| `unfollows_per_hour` | int | `50` | Max unfollows per hour |
| `likes_per_hour` | int | `100` | Max likes per hour |
| `cooldown_duration` | int | `300` | Cooldown seconds |

### Proxy Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | bool | `False` | Enable proxy |
| `url` | str | None | Proxy URL |
| `rotate` | bool | `False` | Rotate proxies |
| `proxy_file` | str | None | File with proxy list |

## Best Practices

1. **Use environment variables for secrets** - Never commit API keys or tokens
2. **Use profiles for different environments** - dev, staging, prod
3. **Start with conservative rate limits** - Increase gradually
4. **Enable dry_run when testing** - Avoid accidental actions
5. **Set up notifications** - Know when things go wrong
6. **Use a whitelist** - Protect important follows from unfollowing

---

Next: [Build Your First Script](first-script.md) →
