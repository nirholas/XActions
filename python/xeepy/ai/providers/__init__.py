"""
AI Provider implementations for Xeepy.

Supports multiple AI backends:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Local models (Ollama)
"""

from __future__ import annotations

from xeepy.ai.providers.base import AIProvider, AIResponse, ProviderConfig
from xeepy.ai.providers.openai import OpenAIProvider
from xeepy.ai.providers.anthropic import AnthropicProvider
from xeepy.ai.providers.local import LocalProvider, OllamaProvider

__all__ = [
    "AIProvider",
    "AIResponse",
    "ProviderConfig",
    "OpenAIProvider",
    "AnthropicProvider",
    "LocalProvider",
    "OllamaProvider",
]
