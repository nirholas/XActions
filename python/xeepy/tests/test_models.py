"""
Tests for data models.
"""

import pytest
from datetime import datetime

from xeepy.models import User, Tweet, EngagementMetrics


class TestUserModel:
    """Tests for User model."""
    
    def test_create_user(self):
        user = User(
            user_id="123456",
            username="testuser",
            display_name="Test User",
            followers_count=1000,
            following_count=500,
        )
        
        assert user.user_id == "123456"
        assert user.username == "testuser"
        assert user.display_name == "Test User"
        assert user.followers_count == 1000
        assert user.following_count == 500
    
    def test_user_to_dict(self):
        user = User(
            user_id="123456",
            username="testuser",
            display_name="Test User",
        )
        
        d = user.to_dict()
        assert isinstance(d, dict)
        assert d["user_id"] == "123456"
        assert d["username"] == "testuser"
    
    def test_user_from_dict(self):
        data = {
            "user_id": "123456",
            "username": "testuser",
            "display_name": "Test User",
            "bio": "Hello world",
        }
        
        user = User.from_dict(data)
        assert user.user_id == "123456"
        assert user.username == "testuser"
        assert user.bio == "Hello world"


class TestTweetModel:
    """Tests for Tweet model."""
    
    def test_create_tweet(self):
        tweet = Tweet(
            tweet_id="1234567890",
            text="Hello, world!",
            author_username="testuser",
            likes=100,
            retweets=50,
            replies=10,
        )
        
        assert tweet.tweet_id == "1234567890"
        assert tweet.text == "Hello, world!"
        assert tweet.likes == 100
    
    def test_tweet_to_dict(self):
        tweet = Tweet(
            tweet_id="1234567890",
            text="Hello, world!",
            author_username="testuser",
        )
        
        d = tweet.to_dict()
        assert isinstance(d, dict)
        assert d["tweet_id"] == "1234567890"
    
    def test_tweet_with_media(self):
        tweet = Tweet(
            tweet_id="1234567890",
            text="Check this out!",
            author_username="testuser",
            media_urls=["https://example.com/image.jpg"],
        )
        
        assert len(tweet.media_urls) == 1


class TestEngagementMetrics:
    """Tests for EngagementMetrics model."""
    
    def test_create_metrics(self):
        metrics = EngagementMetrics(
            likes=1000,
            retweets=500,
            replies=100,
            quotes=50,
            bookmarks=25,
            impressions=10000,
        )
        
        assert metrics.likes == 1000
        assert metrics.retweets == 500
    
    def test_total_engagements(self):
        metrics = EngagementMetrics(
            likes=1000,
            retweets=500,
            replies=100,
            quotes=50,
        )
        
        total = metrics.total_engagements
        assert total == 1650
    
    def test_engagement_rate(self):
        metrics = EngagementMetrics(
            likes=100,
            retweets=50,
            replies=50,
            impressions=10000,
        )
        
        rate = metrics.engagement_rate
        assert rate == 2.0  # 200 / 10000 * 100
