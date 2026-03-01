# Config

Configuration management for Xeepy, handling settings, defaults, and environment variables.

## Import

```python
from xeepy.core.config import Config
```

## Class Signature

```python
class Config:
    def __init__(
        self,
        config_path: Optional[str] = None,
        env_prefix: str = "XEEPY_"
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config_path` | `Optional[str]` | `None` | Path to YAML/JSON config file |
| `env_prefix` | `str` | `"XEEPY_"` | Prefix for environment variables |

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `browser.headless` | `bool` | `True` | Run browser in headless mode |
| `browser.timeout` | `int` | `30000` | Default timeout (ms) |
| `browser.slow_mo` | `int` | `0` | Operation delay (ms) |
| `browser.type` | `str` | `"chromium"` | Browser engine |
| `proxy.url` | `str` | `None` | Proxy server URL |
| `proxy.username` | `str` | `None` | Proxy username |
| `proxy.password` | `str` | `None` | Proxy password |
| `rate_limit.requests_per_minute` | `int` | `30` | Rate limit per minute |
| `rate_limit.min_delay` | `float` | `1.0` | Min delay between requests |
| `auth.cookies_path` | `str` | `None` | Default cookies file path |
| `storage.database_path` | `str` | `"xeepy.db"` | SQLite database path |
| `ai.provider` | `str` | `None` | AI provider name |
| `ai.api_key` | `str` | `None` | AI provider API key |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `load(path)` | `None` | Load config from file |
| `save(path)` | `None` | Save config to file |
| `get(key, default)` | `Any` | Get configuration value |
| `set(key, value)` | `None` | Set configuration value |
| `from_env()` | `Config` | Load config from environment |
| `to_dict()` | `Dict` | Export as dictionary |
| `validate()` | `bool` | Validate configuration |

### `load`

```python
def load(self, path: str) -> None
```

Load configuration from a YAML or JSON file.

### `get`

```python
def get(self, key: str, default: Any = None) -> Any
```

Get a configuration value using dot notation.

**Parameters:**
- `key`: Configuration key (e.g., `browser.headless`)
- `default`: Default value if key not found

### `set`

```python
def set(self, key: str, value: Any) -> None
```

Set a configuration value using dot notation.

### `from_env`

```python
@classmethod
def from_env(cls, prefix: str = "XEEPY_") -> "Config"
```

Create configuration from environment variables.

**Environment Variable Mapping:**
- `XEEPY_BROWSER_HEADLESS` → `browser.headless`
- `XEEPY_PROXY_URL` → `proxy.url`
- `XEEPY_AI_PROVIDER` → `ai.provider`

## Configuration File Format

### YAML Format

```yaml
# xeepy.yaml
browser:
  headless: true
  timeout: 30000
  slow_mo: 0
  type: chromium

proxy:
  url: http://proxy.example.com:8080
  username: user
  password: pass

rate_limit:
  requests_per_minute: 30
  requests_per_hour: 500
  min_delay: 1.0
  max_delay: 5.0

auth:
  cookies_path: ~/.xeepy/cookies.json

storage:
  database_path: ~/.xeepy/data.db

ai:
  provider: openai
  api_key: ${OPENAI_API_KEY}
  model: gpt-4

notifications:
  discord_webhook: https://discord.com/api/webhooks/...
  telegram_bot_token: ${TELEGRAM_BOT_TOKEN}
  telegram_chat_id: "123456789"
```

### JSON Format

```json
{
  "browser": {
    "headless": true,
    "timeout": 30000
  },
  "rate_limit": {
    "requests_per_minute": 30
  }
}
```

## Usage Examples

### Load from File

```python
from xeepy import Xeepy
from xeepy.core.config import Config

config = Config("xeepy.yaml")

async def main():
    async with Xeepy(config_path="xeepy.yaml") as x:
        # Uses settings from config file
        await x.scrape.replies("https://x.com/user/status/123")

asyncio.run(main())
```

### Environment Variables

```bash
export XEEPY_BROWSER_HEADLESS=false
export XEEPY_PROXY_URL=http://proxy:8080
export XEEPY_AI_PROVIDER=openai
export XEEPY_AI_API_KEY=sk-...
```

```python
from xeepy.core.config import Config

config = Config.from_env()
print(config.get("browser.headless"))  # False
print(config.get("proxy.url"))  # http://proxy:8080
```

### Programmatic Configuration

```python
from xeepy.core.config import Config

config = Config()
config.set("browser.headless", False)
config.set("rate_limit.requests_per_minute", 20)
config.set("proxy.url", "http://proxy:8080")

# Validate before use
if config.validate():
    print("Configuration is valid")
    
# Save for later
config.save("my_config.yaml")
```

## See Also

- [Xeepy](xeepy.md) - Main entry point
- [RateLimiter](rate_limiter.md) - Rate limiting details
