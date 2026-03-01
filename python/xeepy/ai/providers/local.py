"""
Local Model Providers for Xeepy.

Supports local models via Ollama and other local inference engines.
"""

from __future__ import annotations

import os
from typing import Any, AsyncIterator

import httpx
from loguru import logger

from xeepy.ai.providers.base import (
    AIProvider,
    AIResponse,
    Message,
    ProviderConfig,
    ProviderError,
    ModelNotFoundError,
)


class LocalProvider(AIProvider):
    """Generic local model provider.
    
    Base class for local inference engines that expose an HTTP API.
    """
    
    def __init__(self, config: ProviderConfig | None = None):
        """Initialize local provider.
        
        Args:
            config: Provider configuration.
        """
        if config is None:
            config = ProviderConfig(
                base_url="http://localhost:8000",
                model="default",
            )
        
        super().__init__(config)
        self._client: httpx.AsyncClient | None = None
    
    async def initialize(self) -> None:
        """Initialize the HTTP client."""
        self._client = httpx.AsyncClient(
            base_url=self.config.base_url,
            timeout=self.config.timeout,
        )
        self._initialized = True
        logger.debug(f"Local provider initialized: {self.config.base_url}")
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
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
        """Generate a response from a prompt."""
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
        """Generate a response from a chat conversation."""
        raise NotImplementedError("Subclasses must implement generate_chat")


class OllamaProvider(LocalProvider):
    """Ollama local model provider.
    
    Ollama allows running various open-source models locally:
    - Llama 2/3
    - Mistral
    - CodeLlama
    - Many more
    
    Example:
        ```python
        config = ProviderConfig(
            base_url="http://localhost:11434",
            model="llama2",
        )
        async with OllamaProvider(config) as provider:
            response = await provider.generate("Hello!")
            print(response.content)
        ```
    """
    
    DEFAULT_URL = "http://localhost:11434"
    DEFAULT_MODEL = "llama2"
    
    def __init__(self, config: ProviderConfig | None = None):
        """Initialize Ollama provider.
        
        Args:
            config: Provider configuration.
        """
        if config is None:
            config = ProviderConfig(
                base_url=os.getenv("OLLAMA_HOST", self.DEFAULT_URL),
                model=os.getenv("OLLAMA_MODEL", self.DEFAULT_MODEL),
            )
        
        if not config.base_url:
            config.base_url = self.DEFAULT_URL
        
        super().__init__(config)
    
    async def initialize(self) -> None:
        """Initialize and verify Ollama connection."""
        await super().initialize()
        
        # Verify Ollama is running and model is available
        try:
            response = await self._client.get("/api/tags")
            response.raise_for_status()
            
            models = response.json().get("models", [])
            model_names = [m.get("name", "").split(":")[0] for m in models]
            
            if self.config.model not in model_names:
                available = ", ".join(model_names) if model_names else "none"
                logger.warning(
                    f"Model '{self.config.model}' may not be available. "
                    f"Available models: {available}. "
                    f"Pull with: ollama pull {self.config.model}"
                )
                
        except httpx.ConnectError:
            raise ProviderError(
                f"Cannot connect to Ollama at {self.config.base_url}. "
                "Make sure Ollama is running: ollama serve"
            )
        except Exception as e:
            logger.warning(f"Could not verify Ollama status: {e}")
    
    async def generate_chat(
        self,
        messages: list[Message],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> AIResponse:
        """Generate a response using Ollama.
        
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
        
        options = {}
        if temperature is not None:
            options["temperature"] = temperature
        if max_tokens is not None:
            options["num_predict"] = max_tokens
        if stop:
            options["stop"] = stop
        
        try:
            response = await self._client.post(
                "/api/chat",
                json={
                    "model": self.config.model,
                    "messages": formatted_messages,
                    "options": options,
                    "stream": False,
                },
            )
            response.raise_for_status()
            
            data = response.json()
            
            return AIResponse(
                content=data.get("message", {}).get("content", ""),
                model=data.get("model", self.config.model),
                usage={
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0),
                    "total_tokens": (
                        data.get("prompt_eval_count", 0) +
                        data.get("eval_count", 0)
                    ),
                },
                finish_reason="stop",
                raw_response=data,
            )
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ModelNotFoundError(
                    f"Model '{self.config.model}' not found. "
                    f"Pull it with: ollama pull {self.config.model}"
                )
            raise ProviderError(f"Ollama request failed: {e}")
        except Exception as e:
            raise ProviderError(f"Ollama error: {e}")
    
    async def generate_stream(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Generate a streaming response from Ollama.
        
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
        
        options = {}
        if temperature is not None:
            options["temperature"] = temperature
        if max_tokens is not None:
            options["num_predict"] = max_tokens
        
        try:
            async with self._client.stream(
                "POST",
                "/api/chat",
                json={
                    "model": self.config.model,
                    "messages": messages,
                    "options": options,
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                
                import json
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content
                            
        except Exception as e:
            raise ProviderError(f"Ollama streaming error: {e}")
    
    async def list_models(self) -> list[dict[str, Any]]:
        """List available models in Ollama.
        
        Returns:
            List of model information dictionaries.
        """
        if not self._client:
            await self.initialize()
        
        try:
            response = await self._client.get("/api/tags")
            response.raise_for_status()
            return response.json().get("models", [])
        except Exception as e:
            raise ProviderError(f"Failed to list models: {e}")
    
    async def pull_model(self, model_name: str) -> None:
        """Pull a model from Ollama library.
        
        Args:
            model_name: Name of the model to pull.
        """
        if not self._client:
            await self.initialize()
        
        logger.info(f"Pulling model: {model_name}")
        
        try:
            async with self._client.stream(
                "POST",
                "/api/pull",
                json={"name": model_name},
            ) as response:
                response.raise_for_status()
                
                import json
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        status = data.get("status", "")
                        if status:
                            logger.debug(f"Pull status: {status}")
                            
        except Exception as e:
            raise ProviderError(f"Failed to pull model: {e}")
        
        logger.info(f"Model {model_name} pulled successfully")
