"""
Anthropic Provider for Xeepy.

Supports Claude models (Claude 3 Opus, Sonnet, Haiku).
"""

from __future__ import annotations

import os
from typing import Any, AsyncIterator

from loguru import logger

from xeepy.ai.providers.base import (
    AIProvider,
    AIResponse,
    Message,
    ProviderConfig,
    ProviderError,
    AuthenticationError,
    RateLimitError,
    ModelNotFoundError,
    ContentFilterError,
)

try:
    import anthropic
    from anthropic import AsyncAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    AsyncAnthropic = None


class AnthropicProvider(AIProvider):
    """Anthropic Claude API provider.
    
    Supports:
    - Claude 3 Opus (most capable)
    - Claude 3 Sonnet (balanced)
    - Claude 3 Haiku (fastest)
    
    Example:
        ```python
        config = ProviderConfig(
            api_key="sk-ant-...",
            model="claude-3-opus-20240229",
            temperature=0.7,
        )
        async with AnthropicProvider(config) as provider:
            response = await provider.generate("Hello, world!")
            print(response.content)
        ```
    """
    
    # Default models
    DEFAULT_MODEL = "claude-3-sonnet-20240229"
    MODELS = {
        "claude-3-opus": "claude-3-opus-20240229",
        "claude-3-sonnet": "claude-3-sonnet-20240229",
        "claude-3-haiku": "claude-3-haiku-20240307",
        "claude-2": "claude-2.1",
    }
    
    def __init__(self, config: ProviderConfig | None = None):
        """Initialize Anthropic provider.
        
        Args:
            config: Provider configuration. If not provided, uses environment
                   variables for API key.
        """
        if not ANTHROPIC_AVAILABLE:
            raise ImportError(
                "Anthropic package not installed. Install with: pip install anthropic"
            )
        
        if config is None:
            config = ProviderConfig(
                api_key=os.getenv("ANTHROPIC_API_KEY"),
                model=self.DEFAULT_MODEL,
            )
        
        super().__init__(config)
        self._client: AsyncAnthropic | None = None
    
    async def initialize(self) -> None:
        """Initialize the Anthropic client."""
        if not self.config.api_key:
            self.config.api_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not self.config.api_key:
            raise AuthenticationError(
                "Anthropic API key not provided. Set ANTHROPIC_API_KEY environment "
                "variable or pass api_key in config."
            )
        
        self._client = AsyncAnthropic(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
        )
        
        self._initialized = True
        logger.debug(f"Anthropic provider initialized with model: {self.config.model}")
    
    async def close(self) -> None:
        """Close the Anthropic client."""
        if self._client:
            self._client = None
        self._initialized = False
    
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
            prompt: The user prompt.
            system_prompt: Optional system prompt.
            temperature: Sampling temperature (0.0-1.0).
            max_tokens: Maximum response tokens.
            stop: Stop sequences.
            **kwargs: Additional Anthropic-specific options.
            
        Returns:
            AIResponse with generated content.
        """
        messages = [Message(role="user", content=prompt)]
        
        return await self.generate_chat(
            messages,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            stop=stop,
            **kwargs,
        )
    
    async def generate_chat(
        self,
        messages: list[Message],
        *,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> AIResponse:
        """Generate a response from a chat conversation.
        
        Args:
            messages: Conversation messages.
            system_prompt: System prompt (Anthropic handles this separately).
            temperature: Sampling temperature.
            max_tokens: Maximum response tokens.
            stop: Stop sequences.
            **kwargs: Additional options.
            
        Returns:
            AIResponse with generated content.
        """
        if not self._client:
            await self.initialize()
        
        # Anthropic requires alternating user/assistant messages
        formatted_messages = []
        system = system_prompt
        
        for msg in messages:
            if msg.role == "system":
                # Anthropic handles system prompt separately
                system = msg.content
            else:
                formatted_messages.append({
                    "role": msg.role,
                    "content": msg.content,
                })
        
        # Ensure messages alternate properly
        formatted_messages = self._ensure_alternating_messages(formatted_messages)
        
        try:
            request_params = {
                "model": self.config.model,
                "messages": formatted_messages,
                "temperature": self._get_temperature(temperature),
                "max_tokens": self._get_max_tokens(max_tokens),
            }
            
            if system:
                request_params["system"] = system
            if stop:
                request_params["stop_sequences"] = stop
            
            response = await self._client.messages.create(**request_params)
            
            content = ""
            if response.content:
                content = response.content[0].text
            
            return AIResponse(
                content=content,
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
                },
                finish_reason=response.stop_reason or "stop",
                raw_response=response,
            )
            
        except anthropic.AuthenticationError as e:
            raise AuthenticationError(f"Anthropic authentication failed: {e}")
        except anthropic.RateLimitError as e:
            raise RateLimitError(f"Anthropic rate limit exceeded: {e}")
        except anthropic.NotFoundError as e:
            raise ModelNotFoundError(f"Model not found: {e}")
        except anthropic.BadRequestError as e:
            if "content" in str(e).lower() and "filter" in str(e).lower():
                raise ContentFilterError(f"Content blocked by filter: {e}")
            raise ProviderError(f"Anthropic request failed: {e}")
        except Exception as e:
            raise ProviderError(f"Anthropic error: {e}")
    
    async def generate_stream(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Generate a streaming response.
        
        Args:
            prompt: The user prompt.
            system_prompt: Optional system prompt.
            temperature: Sampling temperature.
            max_tokens: Maximum response tokens.
            **kwargs: Additional options.
            
        Yields:
            Chunks of generated text.
        """
        if not self._client:
            await self.initialize()
        
        request_params = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self._get_temperature(temperature),
            "max_tokens": self._get_max_tokens(max_tokens),
        }
        
        if system_prompt:
            request_params["system"] = system_prompt
        
        try:
            async with self._client.messages.stream(**request_params) as stream:
                async for text in stream.text_stream:
                    yield text
                    
        except Exception as e:
            raise ProviderError(f"Anthropic streaming error: {e}")
    
    def _ensure_alternating_messages(
        self,
        messages: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        """Ensure messages alternate between user and assistant.
        
        Anthropic requires this pattern. If there are consecutive messages
        with the same role, they are combined.
        """
        if not messages:
            return messages
        
        result = []
        for msg in messages:
            if result and result[-1]["role"] == msg["role"]:
                # Combine consecutive same-role messages
                result[-1]["content"] += "\n\n" + msg["content"]
            else:
                result.append(msg.copy())
        
        return result
