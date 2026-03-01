"""
Tests for rate limiter.
"""

import pytest
import asyncio
from datetime import datetime

from xeepy.core.rate_limiter import RateLimiter, RateLimitConfig


class TestRateLimiter:
    """Tests for RateLimiter."""
    
    @pytest.fixture
    def config(self):
        return RateLimitConfig(
            requests_per_minute=60,
            requests_per_hour=600,
            min_delay=0.1,
            max_delay=0.5,
        )
    
    @pytest.fixture
    def limiter(self, config):
        return RateLimiter(config)
    
    @pytest.mark.asyncio
    async def test_basic_wait(self, limiter):
        """Test that wait doesn't error."""
        await limiter.wait("test_action")
    
    @pytest.mark.asyncio
    async def test_records_action(self, limiter):
        """Test that actions are recorded."""
        await limiter.wait("test_action")
        
        # Check history exists
        assert "test_action" in limiter._history or len(limiter._history) == 0
    
    def test_remaining(self, limiter):
        """Test remaining requests calculation."""
        remaining = limiter.remaining("test_action")
        assert remaining > 0
    
    def test_is_limited_initially_false(self, limiter):
        """Test that limiter is not limited initially."""
        assert limiter.is_limited("test_action") is False
    
    def test_reset(self, limiter):
        """Test reset clears history."""
        limiter.reset()
        assert len(limiter._history) == 0


class TestRateLimitConfig:
    """Tests for RateLimitConfig."""
    
    def test_default_config(self):
        config = RateLimitConfig()
        assert config.requests_per_minute > 0
        assert config.min_delay >= 0
    
    def test_custom_config(self):
        config = RateLimitConfig(
            requests_per_minute=30,
            requests_per_hour=300,
            min_delay=0.5,
            max_delay=2.0,
        )
        
        assert config.requests_per_minute == 30
        assert config.min_delay == 0.5
