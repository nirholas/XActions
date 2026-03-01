"""
OpenAI Provider for Xeepy.

Supports GPT-4, GPT-3.5, and other OpenAI models.
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
    import openai
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    AsyncOpenAI = None


class OpenAIProvider(AIProvider):
    """OpenAI API provider.
    
    Supports:
    - GPT-4 / GPT-4 Turbo
    - GPT-3.5 Turbo
    - Custom fine-tuned models
    
    Example:
        ```python
        config = ProviderConfig(
            api_key="sk-...",
            model="gpt-4-turbo-preview",
            temperature=0.7,
        )
        async with OpenAIProvider(config) as provider:
            response = await provider.generate("Hello, world!")
            print(response.content)
        ```
    """
    
    # Default models
    DEFAULT_MODEL = "gpt-4-turbo-preview"
    MODELS = {
        "gpt-4": "gpt-4",
        "gpt-4-turbo": "gpt-4-turbo-preview",
        "gpt-4-32k": "gpt-4-32k",
        "gpt-3.5": "gpt-3.5-turbo",
        "gpt-3.5-16k": "gpt-3.5-turbo-16k",
    }
    
    def __init__(self, config: ProviderConfig | None = None):
        """Initialize OpenAI provider.
        
        Args:
            config: Provider configuration. If not provided, uses environment
                   variables for API key.
        """
        if not OPENAI_AVAILABLE:
            raise ImportError(
                "OpenAI package not installed. Install with: pip install openai"
            )
        
        if config is None:
            config = ProviderConfig(
                api_key=os.getenv("OPENAI_API_KEY"),
                model=self.DEFAULT_MODEL,
            )
        
        super().__init__(config)
        self._client: AsyncOpenAI | None = None
    
    async def initialize(self) -> None:
        """Initialize the OpenAI client."""
        if not self.config.api_key:
            self.config.api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.config.api_key:
            raise AuthenticationError(
                "OpenAI API key not provided. Set OPENAI_API_KEY environment "
                "variable or pass api_key in config."
            )
        
        self._client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
        )
        
        self._initialized = True
        logger.debug(f"OpenAI provider initialized with model: {self.config.model}")
    
    async def close(self) -> None:
        """Close the OpenAI client."""
        if self._client:
            await self._client.close()
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
            temperature: Sampling temperature (0.0-2.0).
            max_tokens: Maximum response tokens.
            stop: Stop sequences.
            **kwargs: Additional OpenAI-specific options.
            
        Returns:
            AIResponse with generated content.
        """
        messages = []
        if system_prompt:
            messages.append(Message(role="system", content=system_prompt))
        messages.append(Message(role="user", content=prompt))
        
        return await self.generate_chat(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stop=stop,
            **kwargs,
        )
    
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
            messages: Conversation messages.
            temperature: Sampling temperature.
            max_tokens: Maximum response tokens.
            stop: Stop sequences.
            **kwargs: Additional options.
            
        Returns:
            AIResponse with generated content.
        """
        if not self._client:
            await self.initialize()
        
        formatted_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        try:
            response = await self._client.chat.completions.create(
                model=self.config.model,
                messages=formatted_messages,
                temperature=self._get_temperature(temperature),
                max_tokens=self._get_max_tokens(max_tokens),
                stop=stop,
                **kwargs,
            )
            
            choice = response.choices[0]
            
            return AIResponse(
                content=choice.message.content or "",
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0,
                },
                finish_reason=choice.finish_reason or "stop",
                raw_response=response,
            )
            
        except openai.AuthenticationError as e:
            raise AuthenticationError(f"OpenAI authentication failed: {e}")
        except openai.RateLimitError as e:
            raise RateLimitError(f"OpenAI rate limit exceeded: {e}")
        except openai.NotFoundError as e:
            raise ModelNotFoundError(f"Model not found: {e}")
        except openai.BadRequestError as e:
            if "content_filter" in str(e).lower():
                raise ContentFilterError(f"Content blocked by filter: {e}")
            raise ProviderError(f"OpenAI request failed: {e}")
        except Exception as e:
            raise ProviderError(f"OpenAI error: {e}")
    
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
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            stream = await self._client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                temperature=self._get_temperature(temperature),
                max_tokens=self._get_max_tokens(max_tokens),
                stream=True,
                **kwargs,
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            raise ProviderError(f"OpenAI streaming error: {e}")
