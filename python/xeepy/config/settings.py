"""
Xeepy Settings Module.

Configuration management using pydantic-settings.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISettings(BaseModel):
    """AI provider settings."""
    
    provider: str = Field(default="openai", description="AI provider: openai, anthropic, local")
    model: str = Field(default="gpt-4-turbo-preview", description="Model name")
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=1000, ge=1, le=8000)
    
    # API keys (loaded from environment)
    openai_api_key: str = Field(default="", description="OpenAI API key")
    anthropic_api_key: str = Field(default="", description="Anthropic API key")
    
    # Local model settings
    local_base_url: str = Field(default="http://localhost:11434", description="Local model base URL")
    local_model: str = Field(default="llama2", description="Local model name")


class RateLimitSettings(BaseModel):
    """Rate limiting settings."""
    
    requests_per_minute: int = Field(default=60, ge=1, le=300)
    delay_between_actions: float = Field(default=2.0, ge=0, le=60)
    delay_between_follows: float = Field(default=5.0, ge=1, le=120)
    delay_between_unfollows: float = Field(default=3.0, ge=1, le=120)
    delay_between_likes: float = Field(default=1.0, ge=0.5, le=30)
    max_follows_per_day: int = Field(default=200, ge=1, le=1000)
    max_unfollows_per_day: int = Field(default=200, ge=1, le=1000)
    max_likes_per_day: int = Field(default=500, ge=1, le=2000)


class ExportSettings(BaseModel):
    """Export settings."""
    
    default_format: str = Field(default="json", description="Default export format")
    output_dir: str = Field(default="./output", description="Default output directory")
    timestamp_files: bool = Field(default=True, description="Add timestamp to filenames")


class APISettings(BaseModel):
    """API server settings."""
    
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000, ge=1, le=65535)
    api_key: str = Field(default="", description="API key for authentication")
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])
    debug: bool = Field(default=False)


class TwitterSettings(BaseModel):
    """Twitter/X API settings."""
    
    # These would be used if integrating with official API
    api_key: str = Field(default="")
    api_secret: str = Field(default="")
    access_token: str = Field(default="")
    access_token_secret: str = Field(default="")
    bearer_token: str = Field(default="")


class MonitorSettings(BaseModel):
    """Monitoring settings."""
    
    unfollower_check_interval: int = Field(default=3600, description="Seconds between checks")
    snapshot_retention_days: int = Field(default=30, description="Days to keep snapshots")
    alert_on_unfollower: bool = Field(default=True)
    alert_threshold: int = Field(default=5, description="Min unfollowers to alert")
    webhook_url: str = Field(default="", description="Webhook for notifications")


class Settings(BaseSettings):
    """Main settings class."""
    
    model_config = SettingsConfigDict(
        env_prefix="XEEPY_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    # Sub-settings
    ai: AISettings = Field(default_factory=AISettings)
    rate_limit: RateLimitSettings = Field(default_factory=RateLimitSettings)
    export: ExportSettings = Field(default_factory=ExportSettings)
    api: APISettings = Field(default_factory=APISettings)
    twitter: TwitterSettings = Field(default_factory=TwitterSettings)
    monitor: MonitorSettings = Field(default_factory=MonitorSettings)
    
    # General settings
    debug: bool = Field(default=False)
    log_level: str = Field(default="INFO")
    data_dir: str = Field(default="./data")
    
    def __init__(self, **data: Any):
        super().__init__(**data)
        
        # Load API keys from environment
        self.ai.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.ai.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")


def load_config(config_path: str | Path | None = None) -> Settings:
    """Load configuration from file and environment.
    
    Args:
        config_path: Path to configuration file. If None, searches default locations.
        
    Returns:
        Settings object.
    """
    config_data = {}
    
    # Search for config file
    if config_path is None:
        search_paths = [
            Path("config.yaml"),
            Path("config.yml"),
            Path(".xeepy.yaml"),
            Path.home() / ".xeepy" / "config.yaml",
        ]
        
        for path in search_paths:
            if path.exists():
                config_path = path
                break
    
    # Load YAML config if found
    if config_path and Path(config_path).exists():
        with open(config_path) as f:
            config_data = yaml.safe_load(f) or {}
    
    # Create settings with loaded data
    return Settings(**config_data)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance.
    
    Returns:
        Settings singleton.
    """
    return load_config()


def save_config(settings: Settings, config_path: str | Path = "config.yaml") -> None:
    """Save settings to file.
    
    Args:
        settings: Settings to save.
        config_path: Path to save to.
    """
    path = Path(config_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # Convert to dict, excluding secrets
    data = settings.model_dump(
        exclude={
            "ai": {"openai_api_key", "anthropic_api_key"},
            "twitter": {"api_key", "api_secret", "access_token", "access_token_secret", "bearer_token"},
            "api": {"api_key"},
        }
    )
    
    with open(path, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)


def create_default_config(config_path: str | Path = "config.yaml") -> Settings:
    """Create a default configuration file.
    
    Args:
        config_path: Path to create config at.
        
    Returns:
        Default Settings object.
    """
    settings = Settings()
    save_config(settings, config_path)
    return settings
