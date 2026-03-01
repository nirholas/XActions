"""
Xeepy Exceptions

Custom exception classes for the Xeepy toolkit.
"""


class XeepyError(Exception):
    """Base exception for all Xeepy errors."""
    pass


class AuthenticationError(XeepyError):
    """Raised when authentication fails."""
    pass


class RateLimitError(XeepyError):
    """Raised when rate limit is exceeded."""
    pass


class BrowserError(XeepyError):
    """Raised when browser automation fails."""
    pass


class TweetNotFoundError(XeepyError):
    """Raised when a tweet cannot be found."""
    pass


class UserNotFoundError(XeepyError):
    """Raised when a user cannot be found."""
    pass


class ActionFailedError(XeepyError):
    """Raised when an action (like, retweet, etc.) fails."""
    pass


class ConfigurationError(XeepyError):
    """Raised when configuration is invalid."""
    pass


class NetworkError(XeepyError):
    """Raised when network operations fail."""
    pass
