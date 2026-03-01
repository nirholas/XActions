"""
Shared utility functions for Xeepy.
"""

from __future__ import annotations

import asyncio
import hashlib
import random
import re
import string
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypeVar
from urllib.parse import parse_qs, urlencode, urlparse

from loguru import logger

T = TypeVar("T")


def extract_tweet_id(url: str) -> str | None:
    """
    Extract tweet ID from a Twitter/X URL.
    
    Args:
        url: Tweet URL (supports various formats).
        
    Returns:
        Tweet ID string or None if not found.
        
    Examples:
        >>> extract_tweet_id("https://x.com/user/status/1234567890")
        '1234567890'
        >>> extract_tweet_id("https://twitter.com/user/status/1234567890?s=20")
        '1234567890'
    """
    patterns = [
        r"(?:twitter\.com|x\.com)/\w+/status/(\d+)",
        r"/status/(\d+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def extract_username(url: str) -> str | None:
    """
    Extract username from a Twitter/X profile URL.
    
    Args:
        url: Profile URL.
        
    Returns:
        Username string (without @) or None if not found.
        
    Examples:
        >>> extract_username("https://x.com/elonmusk")
        'elonmusk'
        >>> extract_username("https://twitter.com/elonmusk/followers")
        'elonmusk'
    """
    patterns = [
        r"(?:twitter\.com|x\.com)/(@?\w+)(?:/|$|\?)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            username = match.group(1)
            return username.lstrip("@")
    
    return None


def build_twitter_url(path: str, base: str = "https://x.com") -> str:
    """
    Build a full Twitter/X URL from a path.
    
    Args:
        path: URL path (e.g., '/user/status/123').
        base: Base URL.
        
    Returns:
        Full URL string.
    """
    path = path.lstrip("/")
    return f"{base.rstrip('/')}/{path}"


def parse_count(text: str | None) -> int:
    """
    Parse engagement count text to integer.
    
    Handles formats like "1.2K", "3.5M", "500", etc.
    
    Args:
        text: Count text from Twitter UI.
        
    Returns:
        Integer count value.
        
    Examples:
        >>> parse_count("1.2K")
        1200
        >>> parse_count("3.5M")
        3500000
        >>> parse_count("500")
        500
    """
    if not text:
        return 0
    
    text = text.strip().upper().replace(",", "")
    
    multipliers = {
        "K": 1_000,
        "M": 1_000_000,
        "B": 1_000_000_000,
    }
    
    for suffix, multiplier in multipliers.items():
        if suffix in text:
            try:
                number = float(text.replace(suffix, ""))
                return int(number * multiplier)
            except ValueError:
                return 0
    
    try:
        return int(float(text))
    except ValueError:
        return 0


def parse_timestamp(timestamp_str: str) -> datetime | None:
    """
    Parse Twitter timestamp to datetime object.
    
    Args:
        timestamp_str: Timestamp string from Twitter.
        
    Returns:
        datetime object or None if parsing fails.
    """
    formats = [
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%a %b %d %H:%M:%S %z %Y",
        "%b %d, %Y",
        "%d %b %Y",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(timestamp_str, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    
    logger.warning(f"Could not parse timestamp: {timestamp_str}")
    return None


def relative_time_to_datetime(relative: str) -> datetime | None:
    """
    Convert relative time string to datetime.
    
    Args:
        relative: Relative time string (e.g., "2h", "3d", "1w").
        
    Returns:
        datetime object or None if parsing fails.
        
    Examples:
        >>> relative_time_to_datetime("2h")  # 2 hours ago
        >>> relative_time_to_datetime("3d")  # 3 days ago
    """
    import re
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    
    patterns = {
        r"(\d+)s": lambda x: timedelta(seconds=int(x)),
        r"(\d+)m": lambda x: timedelta(minutes=int(x)),
        r"(\d+)h": lambda x: timedelta(hours=int(x)),
        r"(\d+)d": lambda x: timedelta(days=int(x)),
        r"(\d+)w": lambda x: timedelta(weeks=int(x)),
    }
    
    for pattern, delta_func in patterns.items():
        match = re.match(pattern, relative.strip().lower())
        if match:
            return now - delta_func(match.group(1))
    
    return None


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize a string for use as a filename.
    
    Args:
        filename: Original filename.
        max_length: Maximum filename length.
        
    Returns:
        Sanitized filename string.
    """
    # Remove or replace invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, "_")
    
    # Remove control characters
    filename = "".join(c for c in filename if ord(c) >= 32)
    
    # Truncate if too long
    if len(filename) > max_length:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        max_name_length = max_length - len(ext) - 1 if ext else max_length
        filename = f"{name[:max_name_length]}.{ext}" if ext else name[:max_length]
    
    return filename.strip()


def generate_filename(
    prefix: str,
    extension: str = "json",
    include_timestamp: bool = True,
) -> str:
    """
    Generate a unique filename with optional timestamp.
    
    Args:
        prefix: Filename prefix.
        extension: File extension (without dot).
        include_timestamp: Whether to include timestamp.
        
    Returns:
        Generated filename.
        
    Examples:
        >>> generate_filename("followers", "csv")
        'followers_20250125_143022.csv'
    """
    parts = [sanitize_filename(prefix)]
    
    if include_timestamp:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        parts.append(timestamp)
    
    filename = "_".join(parts)
    return f"{filename}.{extension.lstrip('.')}"


def random_delay(min_seconds: float, max_seconds: float) -> float:
    """
    Generate a random delay duration.
    
    Args:
        min_seconds: Minimum delay in seconds.
        max_seconds: Maximum delay in seconds.
        
    Returns:
        Random delay in seconds.
    """
    return random.uniform(min_seconds, max_seconds)


async def async_random_delay(min_seconds: float, max_seconds: float) -> None:
    """
    Asynchronously wait for a random duration.
    
    Args:
        min_seconds: Minimum delay in seconds.
        max_seconds: Maximum delay in seconds.
    """
    delay = random_delay(min_seconds, max_seconds)
    await asyncio.sleep(delay)


def chunk_list(items: list[T], chunk_size: int) -> list[list[T]]:
    """
    Split a list into chunks of specified size.
    
    Args:
        items: List to split.
        chunk_size: Size of each chunk.
        
    Returns:
        List of chunks.
        
    Examples:
        >>> chunk_list([1, 2, 3, 4, 5], 2)
        [[1, 2], [3, 4], [5]]
    """
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


def deduplicate_by_key(items: list[dict], key: str) -> list[dict]:
    """
    Remove duplicates from list of dicts based on a key.
    
    Args:
        items: List of dictionaries.
        key: Key to use for deduplication.
        
    Returns:
        Deduplicated list.
    """
    seen = set()
    result = []
    
    for item in items:
        value = item.get(key)
        if value not in seen:
            seen.add(value)
            result.append(item)
    
    return result


def hash_string(s: str) -> str:
    """
    Generate a short hash of a string.
    
    Args:
        s: Input string.
        
    Returns:
        8-character hash string.
    """
    return hashlib.md5(s.encode()).hexdigest()[:8]


def random_string(length: int = 8) -> str:
    """
    Generate a random alphanumeric string.
    
    Args:
        length: Length of the string.
        
    Returns:
        Random string.
    """
    chars = string.ascii_letters + string.digits
    return "".join(random.choice(chars) for _ in range(length))


def ensure_dir(path: str | Path) -> Path:
    """
    Ensure a directory exists, creating it if necessary.
    
    Args:
        path: Directory path.
        
    Returns:
        Path object.
    """
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def flatten_dict(d: dict, parent_key: str = "", sep: str = "_") -> dict:
    """
    Flatten a nested dictionary.
    
    Args:
        d: Dictionary to flatten.
        parent_key: Parent key prefix.
        sep: Separator for nested keys.
        
    Returns:
        Flattened dictionary.
        
    Examples:
        >>> flatten_dict({"a": {"b": 1, "c": 2}})
        {'a_b': 1, 'a_c': 2}
    """
    items: list[tuple[str, Any]] = []
    
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep).items())
        else:
            items.append((new_key, v))
    
    return dict(items)


def clean_text(text: str | None) -> str:
    """
    Clean and normalize text content.
    
    Args:
        text: Input text.
        
    Returns:
        Cleaned text string.
    """
    if not text:
        return ""
    
    # Normalize whitespace
    text = " ".join(text.split())
    
    # Remove zero-width characters
    text = re.sub(r"[\u200b\u200c\u200d\ufeff]", "", text)
    
    return text.strip()


def extract_hashtags(text: str) -> list[str]:
    """
    Extract hashtags from text.
    
    Args:
        text: Input text.
        
    Returns:
        List of hashtags (without #).
    """
    pattern = r"#(\w+)"
    return re.findall(pattern, text)


def extract_mentions(text: str) -> list[str]:
    """
    Extract @mentions from text.
    
    Args:
        text: Input text.
        
    Returns:
        List of usernames (without @).
    """
    pattern = r"@(\w+)"
    return re.findall(pattern, text)


def extract_urls(text: str) -> list[str]:
    """
    Extract URLs from text.
    
    Args:
        text: Input text.
        
    Returns:
        List of URLs.
    """
    pattern = r"https?://[^\s<>\"{}|\\^`\[\]]+"
    return re.findall(pattern, text)


def is_valid_username(username: str) -> bool:
    """
    Check if a username is valid for Twitter/X.
    
    Args:
        username: Username to validate.
        
    Returns:
        True if valid, False otherwise.
    """
    if not username:
        return False
    
    # Twitter usernames: 1-15 chars, alphanumeric + underscore
    pattern = r"^[a-zA-Z0-9_]{1,15}$"
    return bool(re.match(pattern, username))


def add_query_params(url: str, params: dict[str, str]) -> str:
    """
    Add query parameters to a URL.
    
    Args:
        url: Base URL.
        params: Parameters to add.
        
    Returns:
        URL with parameters.
    """
    parsed = urlparse(url)
    existing_params = parse_qs(parsed.query)
    
    # Merge params
    for key, value in params.items():
        existing_params[key] = [value]
    
    # Rebuild URL
    new_query = urlencode(existing_params, doseq=True)
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}?{new_query}"
