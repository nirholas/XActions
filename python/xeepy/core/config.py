"""
Xeepy Configuration

Global configuration management for the toolkit.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml
from dotenv import load_dotenv


@dataclass
class BrowserConfig:
    """Browser configuration settings."""
    headless: bool = True
    slow_mo: int = 0
    timeout: int = 30000
    user_agent: Optional[str] = None
    viewport_width: int = 1280
    viewport_height: int = 720
    proxy: Optional[str] = None


@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""
    max_requests_per_minute: int = 30
    max_requests_per_hour: int = 300
    cooldown_seconds: int = 60
    jitter_range: tuple[float, float] = (0.5, 1.5)


@dataclass
class EngagementConfig:
    """Engagement-specific configuration."""
    max_likes_per_hour: int = 30
    max_comments_per_hour: int = 5
    max_retweets_per_hour: int = 20
    default_delay_range: tuple[int, int] = (2, 5)
    enable_dry_run: bool = False


@dataclass
class Config:
    """Main configuration class for Xeepy."""
    
    browser: BrowserConfig = field(default_factory=BrowserConfig)
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    engagement: EngagementConfig = field(default_factory=EngagementConfig)
    
    # Authentication
    username: Optional[str] = None
    password: Optional[str] = None
    session_file: Optional[str] = None
    
    # Logging
    log_level: str = "INFO"
    log_file: Optional[str] = None
    
    # Storage
    data_dir: str = "./data"
    cache_dir: str = "./cache"
    
    @classmethod
    def from_env(cls) -> "Config":
        """Load configuration from environment variables."""
        load_dotenv()
        
        config = cls()
        
        # Auth from env
        config.username = os.getenv("XEEPY_USERNAME")
        config.password = os.getenv("XEEPY_PASSWORD")
        config.session_file = os.getenv("XEEPY_SESSION_FILE")
        
        # Browser settings from env
        if os.getenv("XEEPY_HEADLESS"):
            config.browser.headless = os.getenv("XEEPY_HEADLESS", "true").lower() == "true"
        if os.getenv("XEEPY_PROXY"):
            config.browser.proxy = os.getenv("XEEPY_PROXY")
            
        # Logging from env
        config.log_level = os.getenv("XEEPY_LOG_LEVEL", "INFO")
        config.log_file = os.getenv("XEEPY_LOG_FILE")
        
        return config
    
    @classmethod
    def from_yaml(cls, path: str | Path) -> "Config":
        """Load configuration from YAML file."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {path}")
        
        with open(path) as f:
            data = yaml.safe_load(f)
        
        config = cls()
        
        if "browser" in data:
            config.browser = BrowserConfig(**data["browser"])
        if "rate_limit" in data:
            config.rate_limit = RateLimitConfig(**data["rate_limit"])
        if "engagement" in data:
            config.engagement = EngagementConfig(**data["engagement"])
            
        for key in ["username", "password", "session_file", "log_level", "log_file", "data_dir", "cache_dir"]:
            if key in data:
                setattr(config, key, data[key])
        
        return config
    
    def to_yaml(self, path: str | Path) -> None:
        """Save configuration to YAML file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            "browser": {
                "headless": self.browser.headless,
                "slow_mo": self.browser.slow_mo,
                "timeout": self.browser.timeout,
                "viewport_width": self.browser.viewport_width,
                "viewport_height": self.browser.viewport_height,
            },
            "rate_limit": {
                "max_requests_per_minute": self.rate_limit.max_requests_per_minute,
                "max_requests_per_hour": self.rate_limit.max_requests_per_hour,
                "cooldown_seconds": self.rate_limit.cooldown_seconds,
            },
            "engagement": {
                "max_likes_per_hour": self.engagement.max_likes_per_hour,
                "max_comments_per_hour": self.engagement.max_comments_per_hour,
                "max_retweets_per_hour": self.engagement.max_retweets_per_hour,
                "enable_dry_run": self.engagement.enable_dry_run,
            },
            "log_level": self.log_level,
            "data_dir": self.data_dir,
            "cache_dir": self.cache_dir,
        }
        
        with open(path, "w") as f:
            yaml.dump(data, f, default_flow_style=False)
