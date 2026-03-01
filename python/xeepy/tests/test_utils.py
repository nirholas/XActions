"""
Tests for core utility functions.
"""

import pytest
from datetime import datetime

from xeepy.core.utils import (
    parse_count,
    extract_username,
    extract_tweet_id,
    clean_text,
    is_valid_username,
    is_valid_tweet_id,
    format_number,
    parse_timestamp,
)


class TestParseCount:
    """Tests for parse_count function."""
    
    def test_plain_number(self):
        assert parse_count("123") == 123
        assert parse_count("1000") == 1000
    
    def test_number_with_comma(self):
        assert parse_count("1,234") == 1234
        assert parse_count("1,234,567") == 1234567
    
    def test_abbreviated_k(self):
        assert parse_count("1.5K") == 1500
        assert parse_count("10K") == 10000
        assert parse_count("1k") == 1000
    
    def test_abbreviated_m(self):
        assert parse_count("1.5M") == 1500000
        assert parse_count("10M") == 10000000
    
    def test_abbreviated_b(self):
        assert parse_count("1B") == 1000000000
        assert parse_count("1.5B") == 1500000000
    
    def test_empty_or_none(self):
        assert parse_count("") == 0
        assert parse_count(None) == 0
    
    def test_with_spaces(self):
        assert parse_count(" 123 ") == 123
        assert parse_count("1.5 K") == 1500


class TestExtractUsername:
    """Tests for extract_username function."""
    
    def test_url_format(self):
        assert extract_username("https://x.com/elonmusk") == "elonmusk"
        assert extract_username("https://twitter.com/elonmusk") == "elonmusk"
    
    def test_with_at_symbol(self):
        assert extract_username("@elonmusk") == "elonmusk"
    
    def test_plain_username(self):
        assert extract_username("elonmusk") == "elonmusk"
    
    def test_url_with_trailing_slash(self):
        assert extract_username("https://x.com/elonmusk/") == "elonmusk"
    
    def test_empty(self):
        assert extract_username("") is None
        assert extract_username(None) is None


class TestExtractTweetId:
    """Tests for extract_tweet_id function."""
    
    def test_url_format(self):
        url = "https://x.com/elonmusk/status/1234567890123456789"
        assert extract_tweet_id(url) == "1234567890123456789"
    
    def test_twitter_url(self):
        url = "https://twitter.com/user/status/1234567890123456789"
        assert extract_tweet_id(url) == "1234567890123456789"
    
    def test_plain_id(self):
        assert extract_tweet_id("1234567890123456789") == "1234567890123456789"
    
    def test_invalid(self):
        assert extract_tweet_id("not_an_id") is None
        assert extract_tweet_id("") is None


class TestValidation:
    """Tests for validation functions."""
    
    def test_valid_username(self):
        assert is_valid_username("elonmusk") is True
        assert is_valid_username("user_123") is True
        assert is_valid_username("a") is True
    
    def test_invalid_username(self):
        assert is_valid_username("") is False
        assert is_valid_username("a" * 20) is False  # Too long
        assert is_valid_username("user@name") is False  # Invalid char
    
    def test_valid_tweet_id(self):
        assert is_valid_tweet_id("1234567890123456789") is True
    
    def test_invalid_tweet_id(self):
        assert is_valid_tweet_id("abc") is False
        assert is_valid_tweet_id("") is False


class TestCleanText:
    """Tests for clean_text function."""
    
    def test_removes_extra_whitespace(self):
        assert clean_text("hello   world") == "hello world"
        assert clean_text("  hello  ") == "hello"
    
    def test_removes_newlines(self):
        assert clean_text("hello\nworld") == "hello world"
    
    def test_preserves_content(self):
        assert clean_text("Hello, World!") == "Hello, World!"


class TestFormatNumber:
    """Tests for format_number function."""
    
    def test_small_numbers(self):
        assert format_number(123) == "123"
        assert format_number(999) == "999"
    
    def test_thousands(self):
        assert format_number(1000) == "1.0K"
        assert format_number(1500) == "1.5K"
        assert format_number(10000) == "10.0K"
    
    def test_millions(self):
        assert format_number(1000000) == "1.0M"
        assert format_number(1500000) == "1.5M"
    
    def test_billions(self):
        assert format_number(1000000000) == "1.0B"
