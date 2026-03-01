# Plugin System

XTools provides a powerful plugin system for extending functionality without modifying core code.

## Plugin Architecture

Plugins can hook into various lifecycle events and extend core functionality.

```python
from xtools.plugins import Plugin, hook

class MyPlugin(Plugin):
    """Custom plugin example."""
    
    name = "my-plugin"
    version = "1.0.0"
    
    async def on_load(self, xtools):
        """Called when plugin is loaded."""
        self.xtools = xtools
        print(f"Plugin {self.name} loaded")
    
    async def on_unload(self):
        """Called when plugin is unloaded."""
        print(f"Plugin {self.name} unloaded")
    
    @hook("before_scrape")
    async def before_scrape(self, url: str, **kwargs):
        """Hook called before any scrape operation."""
        print(f"About to scrape: {url}")
        return url, kwargs  # Can modify parameters
    
    @hook("after_scrape")
    async def after_scrape(self, results: list):
        """Hook called after scrape completes."""
        print(f"Scraped {len(results)} items")
        return results  # Can modify results
```

## Registering Plugins

```python
from xtools import XTools
from my_plugins import MyPlugin, AnalyticsPlugin

async def register_plugins():
    """Register plugins with XTools."""
    async with XTools() as x:
        # Register single plugin
        await x.plugins.register(MyPlugin())
        
        # Register multiple plugins
        await x.plugins.register_all([
            MyPlugin(),
            AnalyticsPlugin(),
        ])
        
        # List loaded plugins
        for plugin in x.plugins.list():
            print(f"{plugin.name} v{plugin.version}")
```

!!! info "Plugin Loading Order"
    Plugins are loaded in registration order. Hooks execute in the same order.

## Available Hooks

| Hook Name | Arguments | Description |
|-----------|-----------|-------------|
| `before_scrape` | `url, **kwargs` | Before any scrape operation |
| `after_scrape` | `results` | After scrape completes |
| `before_action` | `action_name, **kwargs` | Before follow/like/etc |
| `after_action` | `action_name, result` | After action completes |
| `on_error` | `error, context` | When an error occurs |
| `on_rate_limit` | `endpoint, wait_time` | When rate limited |

## Building a Metrics Plugin

```python
from xtools.plugins import Plugin, hook
from datetime import datetime
import json

class MetricsPlugin(Plugin):
    """Collect and export scraping metrics."""
    
    name = "metrics"
    version = "1.0.0"
    
    def __init__(self):
        self.metrics = {
            "scrapes": 0,
            "items_collected": 0,
            "errors": 0,
            "start_time": None
        }
    
    async def on_load(self, xtools):
        self.metrics["start_time"] = datetime.now().isoformat()
    
    @hook("after_scrape")
    async def track_scrape(self, results: list):
        self.metrics["scrapes"] += 1
        self.metrics["items_collected"] += len(results)
        return results
    
    @hook("on_error")
    async def track_error(self, error, context):
        self.metrics["errors"] += 1
    
    async def export_metrics(self, filepath: str):
        """Export metrics to JSON file."""
        with open(filepath, "w") as f:
            json.dump(self.metrics, f, indent=2)
```

## Plugin Configuration

```python
from xtools.plugins import Plugin, PluginConfig

class ConfigurablePlugin(Plugin):
    """Plugin with configuration."""
    
    name = "configurable"
    
    class Config(PluginConfig):
        enabled: bool = True
        log_level: str = "INFO"
        custom_setting: int = 100
    
    def __init__(self, config: Config = None):
        self.config = config or self.Config()
    
    @hook("before_scrape")
    async def log_scrape(self, url, **kwargs):
        if self.config.enabled:
            print(f"[{self.config.log_level}] Scraping {url}")
        return url, kwargs

# Usage
plugin = ConfigurablePlugin(
    ConfigurablePlugin.Config(log_level="DEBUG")
)
```

!!! tip "Plugin Best Practices"
    - Keep plugins focused on single responsibility
    - Handle errors gracefully in hooks
    - Document all configuration options
    - Use async/await for all I/O operations

## Notification Plugin Example

```python
from xtools.plugins import Plugin, hook
import aiohttp

class DiscordNotifyPlugin(Plugin):
    """Send notifications to Discord webhook."""
    
    name = "discord-notify"
    
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
    
    @hook("after_scrape")
    async def notify_scrape(self, results):
        if len(results) > 0:
            await self._send(f"✅ Scraped {len(results)} items")
        return results
    
    @hook("on_error")
    async def notify_error(self, error, context):
        await self._send(f"❌ Error: {error}")
    
    async def _send(self, message: str):
        async with aiohttp.ClientSession() as session:
            await session.post(
                self.webhook_url,
                json={"content": message}
            )
```

!!! warning "Webhook Security"
    Never commit webhook URLs to version control. Use environment variables.
