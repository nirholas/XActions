"""Tests for AI provider implementations."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import TYPE_CHECKING

from xeepy.ai.providers.base import AIProvider, AIResponse
from xeepy.ai.providers.openai import OpenAIProvider
from xeepy.ai.providers.anthropic import AnthropicProvider
from xeepy.ai.providers.local import OllamaProvider


class TestAIResponse:
    """Tests for AIResponse dataclass."""

    def test_create_response(self) -> None:
        """Test creating an AIResponse."""
        response = AIResponse(
            content="Test content",
            model="gpt-4",
            usage={"prompt_tokens": 10, "completion_tokens": 20},
            raw_response={"id": "test-123"},
        )

        assert response.content == "Test content"
        assert response.model == "gpt-4"
        assert response.usage == {"prompt_tokens": 10, "completion_tokens": 20}
        assert response.raw_response == {"id": "test-123"}

    def test_response_optional_fields(self) -> None:
        """Test AIResponse with optional fields."""
        response = AIResponse(content="Test", model="test-model")

        assert response.content == "Test"
        assert response.model == "test-model"
        assert response.usage is None
        assert response.raw_response is None


class TestOpenAIProvider:
    """Tests for OpenAI provider."""

    def test_init_with_api_key(self) -> None:
        """Test initializing with API key."""
        provider = OpenAIProvider(api_key="test-key", model="gpt-4")

        assert provider.model == "gpt-4"
        assert provider.api_key == "test-key"

    def test_init_default_model(self) -> None:
        """Test default model selection."""
        provider = OpenAIProvider(api_key="test-key")

        assert provider.model == "gpt-4-turbo-preview"

    @pytest.mark.asyncio
    async def test_generate_requires_client(self) -> None:
        """Test that generate requires entering context."""
        provider = OpenAIProvider(api_key="test-key")

        with pytest.raises(RuntimeError, match="not initialized"):
            await provider.generate("Test prompt")

    @pytest.mark.asyncio
    async def test_generate_with_mock_client(self) -> None:
        """Test generation with mocked client."""
        provider = OpenAIProvider(api_key="test-key")

        # Create mock response
        mock_choice = MagicMock()
        mock_choice.message.content = "Generated response"

        mock_completion = MagicMock()
        mock_completion.id = "test-completion-id"
        mock_completion.model = "gpt-4"
        mock_completion.choices = [mock_choice]
        mock_completion.usage.prompt_tokens = 10
        mock_completion.usage.completion_tokens = 20
        mock_completion.usage.total_tokens = 30

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

        # Inject mock client
        provider._client = mock_client

        response = await provider.generate("Test prompt")

        assert response.content == "Generated response"
        assert response.model == "gpt-4"
        assert response.usage["prompt_tokens"] == 10
        assert response.usage["completion_tokens"] == 20

    @pytest.mark.asyncio
    async def test_generate_with_system_prompt(self) -> None:
        """Test generation with system prompt."""
        provider = OpenAIProvider(api_key="test-key")

        mock_choice = MagicMock()
        mock_choice.message.content = "Response with system"

        mock_completion = MagicMock()
        mock_completion.id = "test-id"
        mock_completion.model = "gpt-4"
        mock_completion.choices = [mock_choice]
        mock_completion.usage.prompt_tokens = 15
        mock_completion.usage.completion_tokens = 25
        mock_completion.usage.total_tokens = 40

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

        provider._client = mock_client

        response = await provider.generate(
            "Test prompt",
            system_prompt="You are helpful.",
        )

        # Verify system prompt was included in the call
        call_args = mock_client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "You are helpful."
        assert messages[1]["role"] == "user"


class TestAnthropicProvider:
    """Tests for Anthropic provider."""

    def test_init_with_api_key(self) -> None:
        """Test initializing with API key."""
        provider = AnthropicProvider(api_key="test-key", model="claude-3-opus-20240229")

        assert provider.model == "claude-3-opus-20240229"
        assert provider.api_key == "test-key"

    def test_init_default_model(self) -> None:
        """Test default model selection."""
        provider = AnthropicProvider(api_key="test-key")

        assert provider.model == "claude-3-sonnet-20240229"

    @pytest.mark.asyncio
    async def test_generate_requires_client(self) -> None:
        """Test that generate requires entering context."""
        provider = AnthropicProvider(api_key="test-key")

        with pytest.raises(RuntimeError, match="not initialized"):
            await provider.generate("Test prompt")

    @pytest.mark.asyncio
    async def test_generate_with_mock_client(self) -> None:
        """Test generation with mocked client."""
        provider = AnthropicProvider(api_key="test-key")

        mock_content = MagicMock()
        mock_content.text = "Claude response"

        mock_response = MagicMock()
        mock_response.id = "test-msg-id"
        mock_response.model = "claude-3-sonnet-20240229"
        mock_response.content = [mock_content]
        mock_response.usage.input_tokens = 12
        mock_response.usage.output_tokens = 18

        mock_client = AsyncMock()
        mock_client.messages.create = AsyncMock(return_value=mock_response)

        provider._client = mock_client

        response = await provider.generate("Test prompt")

        assert response.content == "Claude response"
        assert response.model == "claude-3-sonnet-20240229"
        assert response.usage["input_tokens"] == 12
        assert response.usage["output_tokens"] == 18


class TestOllamaProvider:
    """Tests for Ollama local provider."""

    def test_init_defaults(self) -> None:
        """Test default initialization."""
        provider = OllamaProvider()

        assert provider.model == "llama2"
        assert provider.base_url == "http://localhost:11434"

    def test_init_custom_settings(self) -> None:
        """Test custom initialization."""
        provider = OllamaProvider(
            model="mistral",
            base_url="http://192.168.1.100:11434",
        )

        assert provider.model == "mistral"
        assert provider.base_url == "http://192.168.1.100:11434"

    @pytest.mark.asyncio
    async def test_generate_requires_client(self) -> None:
        """Test that generate requires entering context."""
        provider = OllamaProvider()

        with pytest.raises(RuntimeError, match="not initialized"):
            await provider.generate("Test prompt")

    @pytest.mark.asyncio
    async def test_generate_with_mock_client(self) -> None:
        """Test generation with mocked httpx client."""
        provider = OllamaProvider(model="llama2")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "model": "llama2",
            "response": "Ollama response",
            "done": True,
            "context": [1, 2, 3],
            "total_duration": 1234567890,
            "load_duration": 123456789,
            "prompt_eval_count": 10,
            "eval_count": 20,
        }

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)

        provider._client = mock_client

        response = await provider.generate("Test prompt")

        assert response.content == "Ollama response"
        assert response.model == "llama2"

    @pytest.mark.asyncio
    async def test_generate_error_handling(self) -> None:
        """Test error handling for failed requests."""
        provider = OllamaProvider()

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal server error"

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)

        provider._client = mock_client

        with pytest.raises(RuntimeError, match="Ollama request failed"):
            await provider.generate("Test prompt")


class TestProviderContextManager:
    """Tests for provider context manager behavior."""

    @pytest.mark.asyncio
    async def test_openai_context_manager(self) -> None:
        """Test OpenAI provider as context manager."""
        with patch("xeepy.ai.providers.openai.AsyncOpenAI") as mock_openai:
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client

            provider = OpenAIProvider(api_key="test-key")

            async with provider as p:
                assert p._client is not None
                assert p is provider

    @pytest.mark.asyncio
    async def test_anthropic_context_manager(self) -> None:
        """Test Anthropic provider as context manager."""
        with patch("xeepy.ai.providers.anthropic.AsyncAnthropic") as mock_anthropic:
            mock_client = AsyncMock()
            mock_anthropic.return_value = mock_client

            provider = AnthropicProvider(api_key="test-key")

            async with provider as p:
                assert p._client is not None
                assert p is provider

    @pytest.mark.asyncio
    async def test_ollama_context_manager(self) -> None:
        """Test Ollama provider as context manager."""
        with patch("xeepy.ai.providers.local.httpx.AsyncClient") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.return_value = mock_client

            provider = OllamaProvider()

            async with provider as p:
                assert p._client is not None
                assert p is provider
