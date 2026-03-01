"""
Base AI Provider class for Xeepy.

Defines the interface that all AI providers must implement.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncIterator
from enum import Enum


class ProviderType(str, Enum):
    """Supported AI provider types."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"
    OLLAMA = "ollama"


@dataclass
class ProviderConfig:
    """Configuration for an AI provider.
    
    Attributes:
        api_key: API key for the provider (not needed for local models).
        model: Model name/identifier to use.
        base_url: Base URL for API calls (optional, for custom endpoints).
        temperature: Sampling temperature (0.0 to 2.0).
        max_tokens: Maximum tokens in response.
        timeout: Request timeout in seconds.
        extra: Additional provider-specific options.
    """
    api_key: str | None = None
    model: str = "gpt-4"
    base_url: str | None = None
    temperature: float = 0.7
    max_tokens: int = 1000
    timeout: float = 30.0
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class AIResponse:
    """Response from an AI provider.
    
    Attributes:
        content: The generated text content.
        model: Model that generated the response.
        usage: Token usage information.
        finish_reason: Why the model stopped generating.
        raw_response: Raw response from the provider (for debugging).
    """
    content: str
    model: str
    usage: dict[str, int] = field(default_factory=dict)
    finish_reason: str = "stop"
    raw_response: Any = None


@dataclass
class Message:
    """A message in a conversation.
    
    Attributes:
        role: The role of the message sender ('system', 'user', 'assistant').
        content: The message content.
    """
    role: str
    content: str


class AIProvider(ABC):
    """Abstract base class for AI providers.
    
    All AI providers must implement this interface to be compatible
    with Xeepy AI features.
    
    Example:
        ```python
        class MyProvider(AIProvider):
            async def generate(self, prompt, **kwargs):
                # Implementation here
                pass
        ```
    """
    
    def __init__(self, config: ProviderConfig):
        """Initialize the provider with configuration.
        
        Args:
            config: Provider configuration.
        """
        self.config = config
        self._initialized = False
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> AIResponse:
        """Generate a response from a prompt.
        
        Args:
            prompt: The user prompt to respond to.
            system_prompt: Optional system prompt for context.
            temperature: Override default temperature.
            max_tokens: Override default max tokens.
            stop: Stop sequences.
            **kwargs: Additional provider-specific options.
            
        Returns:
            AIResponse containing the generated content.
            
        Raises:
            ProviderError: If generation fails.
        """
        pass
    
    @abstractmethod
    async def generate_chat(
        self,
        messages: list[Message],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> AIResponse:
        """Generate a response from a chat conversation.
        
        Args:
            messages: List of conversation messages.
            temperature: Override default temperature.
            max_tokens: Override default max tokens.
            stop: Stop sequences.
            **kwargs: Additional provider-specific options.
            
        Returns:
            AIResponse containing the generated content.
            
        Raises:
            ProviderError: If generation fails.
        """
        pass
    
    async def generate_stream(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Generate a streaming response from a prompt.
        
        Args:
            prompt: The user prompt to respond to.
            system_prompt: Optional system prompt for context.
            temperature: Override default temperature.
            max_tokens: Override default max tokens.
            **kwargs: Additional provider-specific options.
            
        Yields:
            Chunks of generated text.
            
        Raises:
            ProviderError: If generation fails.
            NotImplementedError: If streaming not supported.
        """
        raise NotImplementedError("Streaming not supported by this provider")
        yield  # Make this a generator
    
    async def initialize(self) -> None:
        """Initialize the provider (e.g., validate API key).
        
        Override this method for providers that need initialization.
        """
        self._initialized = True
    
    async def close(self) -> None:
        """Clean up provider resources.
        
        Override this method for providers that need cleanup.
        """
        self._initialized = False
    
    async def __aenter__(self) -> AIProvider:
        """Async context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()
    
    @property
    def is_initialized(self) -> bool:
        """Check if the provider is initialized."""
        return self._initialized
    
    def _get_temperature(self, temperature: float | None) -> float:
        """Get temperature, using provided value or config default."""
        return temperature if temperature is not None else self.config.temperature
    
    def _get_max_tokens(self, max_tokens: int | None) -> int:
        """Get max tokens, using provided value or config default."""
        return max_tokens if max_tokens is not None else self.config.max_tokens


class ProviderError(Exception):
    """Base exception for provider errors."""
    pass


class AuthenticationError(ProviderError):
    """Raised when authentication fails."""
    pass


class RateLimitError(ProviderError):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, message: str, retry_after: float | None = None):
        super().__init__(message)
        self.retry_after = retry_after


class ModelNotFoundError(ProviderError):
    """Raised when the requested model is not found."""
    pass


class ContentFilterError(ProviderError):
    """Raised when content is blocked by safety filters."""
    pass
