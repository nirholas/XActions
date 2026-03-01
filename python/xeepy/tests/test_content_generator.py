"""Tests for content generation features."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from xeepy.ai.content_generator import (
    ContentGenerator,
    GeneratedContent,
    ContentType,
    TweetThread,
)
from xeepy.ai.providers.base import AIResponse


class TestGeneratedContent:
    """Tests for GeneratedContent dataclass."""

    def test_create_basic(self) -> None:
        """Test creating basic generated content."""
        content = GeneratedContent(
            content="Hello, world!",
            content_type=ContentType.TWEET,
            character_count=13,
        )

        assert content.content == "Hello, world!"
        assert content.content_type == ContentType.TWEET
        assert content.character_count == 13
        assert content.hashtags is None
        assert content.mentions is None
        assert content.metadata is None

    def test_create_with_metadata(self) -> None:
        """Test creating content with all fields."""
        content = GeneratedContent(
            content="Check out #python @user!",
            content_type=ContentType.TWEET,
            character_count=25,
            hashtags=["#python"],
            mentions=["@user"],
            metadata={"tone": "casual"},
        )

        assert content.hashtags == ["#python"]
        assert content.mentions == ["@user"]
        assert content.metadata == {"tone": "casual"}


class TestTweetThread:
    """Tests for TweetThread dataclass."""

    def test_create_thread(self) -> None:
        """Test creating a tweet thread."""
        thread = TweetThread(
            tweets=["Tweet 1", "Tweet 2", "Tweet 3"],
            total_tweets=3,
            total_characters=30,
        )

        assert len(thread.tweets) == 3
        assert thread.total_tweets == 3
        assert thread.total_characters == 30


class TestContentType:
    """Tests for ContentType enum."""

    def test_content_types(self) -> None:
        """Test all content types exist."""
        assert ContentType.TWEET is not None
        assert ContentType.REPLY is not None
        assert ContentType.THREAD is not None
        assert ContentType.BIO is not None
        assert ContentType.DM is not None


class TestContentGenerator:
    """Tests for ContentGenerator class."""

    @pytest.fixture
    def mock_provider(self) -> AsyncMock:
        """Create a mock AI provider."""
        provider = AsyncMock()
        provider.generate = AsyncMock(
            return_value=AIResponse(
                content="Generated tweet content",
                model="test-model",
            )
        )
        return provider

    @pytest.fixture
    def generator(self, mock_provider: AsyncMock) -> ContentGenerator:
        """Create a content generator with mock provider."""
        return ContentGenerator(provider=mock_provider)

    @pytest.mark.asyncio
    async def test_generate_tweet(self, generator: ContentGenerator) -> None:
        """Test generating a single tweet."""
        result = await generator.generate_tweet(
            topic="Python programming",
            tone="professional",
        )

        assert isinstance(result, GeneratedContent)
        assert result.content_type == ContentType.TWEET
        assert len(result.content) <= 280

    @pytest.mark.asyncio
    async def test_generate_tweet_with_hashtags(
        self,
        generator: ContentGenerator,
        mock_provider: AsyncMock,
    ) -> None:
        """Test generating a tweet with hashtags."""
        mock_provider.generate.return_value = AIResponse(
            content="Learning #Python is amazing! #coding #tech",
            model="test-model",
        )

        result = await generator.generate_tweet(
            topic="Python",
            include_hashtags=True,
            max_hashtags=3,
        )

        assert result.hashtags is not None
        assert len(result.hashtags) <= 3

    @pytest.mark.asyncio
    async def test_generate_reply(
        self,
        generator: ContentGenerator,
        mock_provider: AsyncMock,
    ) -> None:
        """Test generating a reply."""
        mock_provider.generate.return_value = AIResponse(
            content="Great point! I totally agree.",
            model="test-model",
        )

        result = await generator.generate_reply(
            original_tweet="Python is the best language!",
            context="Agreeing with the sentiment",
            tone="friendly",
        )

        assert isinstance(result, GeneratedContent)
        assert result.content_type == ContentType.REPLY

    @pytest.mark.asyncio
    async def test_generate_thread(
        self,
        generator: ContentGenerator,
        mock_provider: AsyncMock,
    ) -> None:
        """Test generating a tweet thread."""
        mock_provider.generate.return_value = AIResponse(
            content="1/ First tweet\n\n2/ Second tweet\n\n3/ Third tweet",
            model="test-model",
        )

        result = await generator.generate_thread(
            topic="Introduction to async Python",
            num_tweets=3,
        )

        assert isinstance(result, TweetThread)
        assert result.total_tweets >= 1

    @pytest.mark.asyncio
    async def test_generate_bio(
        self,
        generator: ContentGenerator,
        mock_provider: AsyncMock,
    ) -> None:
        """Test generating a bio."""
        mock_provider.generate.return_value = AIResponse(
            content="Python developer | Open source enthusiast | Coffee addict ☕",
            model="test-model",
        )

        result = await generator.generate_bio(
            interests=["Python", "open source", "coffee"],
            style="casual",
        )

        assert isinstance(result, GeneratedContent)
        assert result.content_type == ContentType.BIO
        assert len(result.content) <= 160

    @pytest.mark.asyncio
    async def test_character_limit_enforcement(
        self,
        generator: ContentGenerator,
        mock_provider: AsyncMock,
    ) -> None:
        """Test that character limits are enforced."""
        # Return content that's too long
        long_content = "x" * 300
        mock_provider.generate.return_value = AIResponse(
            content=long_content,
            model="test-model",
        )

        result = await generator.generate_tweet(topic="Test")

        # Should truncate or regenerate
        assert len(result.content) <= 280

    @pytest.mark.asyncio
    async def test_generate_without_provider(self) -> None:
        """Test behavior without AI provider."""
        generator = ContentGenerator(provider=None)

        # Should raise or return error
        with pytest.raises((RuntimeError, ValueError)):
            await generator.generate_tweet(topic="Test")

    @pytest.mark.asyncio
    async def test_generate_with_mentions(
        self,
        generator: ContentGenerator,
        mock_provider: AsyncMock,
    ) -> None:
        """Test generating content with mentions."""
        mock_provider.generate.return_value = AIResponse(
            content="Hey @python @github check this out!",
            model="test-model",
        )

        result = await generator.generate_tweet(
            topic="Python projects",
            mentions=["@python", "@github"],
        )

        assert result.mentions is not None

    @pytest.mark.asyncio
    async def test_custom_prompt(
        self,
        generator: ContentGenerator,
        mock_provider: AsyncMock,
    ) -> None:
        """Test using custom prompt template."""
        result = await generator.generate_tweet(
            topic="AI",
            custom_prompt="Write a tweet about {topic} in haiku format",
        )

        # Verify custom prompt was used
        call_args = mock_provider.generate.call_args
        assert "haiku" in call_args.args[0].lower() or (
            call_args.kwargs.get("prompt") and "haiku" in call_args.kwargs["prompt"].lower()
        )


class TestContentGeneratorEdgeCases:
    """Edge case tests for ContentGenerator."""

    @pytest.mark.asyncio
    async def test_empty_topic(self) -> None:
        """Test handling empty topic."""
        mock_provider = AsyncMock()
        generator = ContentGenerator(provider=mock_provider)

        with pytest.raises(ValueError, match="topic"):
            await generator.generate_tweet(topic="")

    @pytest.mark.asyncio
    async def test_provider_error_handling(self) -> None:
        """Test handling provider errors."""
        mock_provider = AsyncMock()
        mock_provider.generate.side_effect = Exception("API error")

        generator = ContentGenerator(provider=mock_provider)

        with pytest.raises(Exception):
            await generator.generate_tweet(topic="Test")

    @pytest.mark.asyncio
    async def test_thread_minimum_tweets(self) -> None:
        """Test thread with minimum tweets."""
        mock_provider = AsyncMock()
        mock_provider.generate.return_value = AIResponse(
            content="1/ Single tweet thread",
            model="test-model",
        )

        generator = ContentGenerator(provider=mock_provider)

        result = await generator.generate_thread(topic="Test", num_tweets=1)

        assert result.total_tweets >= 1

    @pytest.mark.asyncio
    async def test_thread_maximum_tweets(self) -> None:
        """Test thread with maximum tweets."""
        mock_provider = AsyncMock()

        tweets = "\n\n".join([f"{i}/ Tweet number {i}" for i in range(1, 26)])
        mock_provider.generate.return_value = AIResponse(
            content=tweets,
            model="test-model",
        )

        generator = ContentGenerator(provider=mock_provider)

        result = await generator.generate_thread(topic="Long topic", num_tweets=25)

        assert result.total_tweets <= 25
