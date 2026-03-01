"""Tests for sentiment analysis features."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from xeepy.ai.sentiment_analyzer import (
    SentimentAnalyzer,
    SentimentResult,
    SentimentLabel,
    BatchSentimentResult,
)
from xeepy.ai.providers.base import AIResponse


class TestSentimentLabel:
    """Tests for SentimentLabel enum."""

    def test_labels_exist(self) -> None:
        """Test all sentiment labels exist."""
        assert SentimentLabel.POSITIVE is not None
        assert SentimentLabel.NEGATIVE is not None
        assert SentimentLabel.NEUTRAL is not None
        assert SentimentLabel.MIXED is not None


class TestSentimentResult:
    """Tests for SentimentResult dataclass."""

    def test_create_basic(self) -> None:
        """Test creating basic sentiment result."""
        result = SentimentResult(
            text="I love Python!",
            label=SentimentLabel.POSITIVE,
            score=0.95,
            confidence=0.92,
        )

        assert result.text == "I love Python!"
        assert result.label == SentimentLabel.POSITIVE
        assert result.score == 0.95
        assert result.confidence == 0.92

    def test_create_with_details(self) -> None:
        """Test creating result with detailed scores."""
        result = SentimentResult(
            text="Mixed feelings about this",
            label=SentimentLabel.MIXED,
            score=0.1,
            confidence=0.75,
            positive_score=0.4,
            negative_score=0.3,
            neutral_score=0.3,
        )

        assert result.positive_score == 0.4
        assert result.negative_score == 0.3
        assert result.neutral_score == 0.3

    def test_is_positive_property(self) -> None:
        """Test is_positive property."""
        positive = SentimentResult(
            text="Great!", label=SentimentLabel.POSITIVE, score=0.9, confidence=0.9
        )
        negative = SentimentResult(
            text="Bad!", label=SentimentLabel.NEGATIVE, score=-0.9, confidence=0.9
        )

        assert positive.is_positive
        assert not negative.is_positive

    def test_is_negative_property(self) -> None:
        """Test is_negative property."""
        negative = SentimentResult(
            text="Terrible!", label=SentimentLabel.NEGATIVE, score=-0.9, confidence=0.9
        )
        positive = SentimentResult(
            text="Amazing!", label=SentimentLabel.POSITIVE, score=0.9, confidence=0.9
        )

        assert negative.is_negative
        assert not positive.is_negative


class TestBatchSentimentResult:
    """Tests for BatchSentimentResult dataclass."""

    def test_create_batch(self) -> None:
        """Test creating batch result."""
        results = [
            SentimentResult("Good", SentimentLabel.POSITIVE, 0.8, 0.9),
            SentimentResult("Bad", SentimentLabel.NEGATIVE, -0.8, 0.9),
            SentimentResult("Okay", SentimentLabel.NEUTRAL, 0.0, 0.85),
        ]

        batch = BatchSentimentResult(
            results=results,
            total_analyzed=3,
            average_score=0.0,
            positive_count=1,
            negative_count=1,
            neutral_count=1,
        )

        assert batch.total_analyzed == 3
        assert batch.positive_count == 1
        assert batch.negative_count == 1
        assert batch.neutral_count == 1


class TestSentimentAnalyzer:
    """Tests for SentimentAnalyzer class."""

    @pytest.fixture
    def mock_provider(self) -> AsyncMock:
        """Create a mock AI provider."""
        provider = AsyncMock()
        provider.generate = AsyncMock(
            return_value=AIResponse(
                content='{"label": "positive", "score": 0.85, "confidence": 0.9}',
                model="test-model",
            )
        )
        return provider

    @pytest.fixture
    def analyzer(self, mock_provider: AsyncMock) -> SentimentAnalyzer:
        """Create a sentiment analyzer with mock provider."""
        return SentimentAnalyzer(provider=mock_provider)

    @pytest.fixture
    def analyzer_no_provider(self) -> SentimentAnalyzer:
        """Create a sentiment analyzer without provider (uses VADER)."""
        return SentimentAnalyzer(provider=None)

    @pytest.mark.asyncio
    async def test_analyze_single(self, analyzer: SentimentAnalyzer) -> None:
        """Test analyzing a single text."""
        result = await analyzer.analyze("I absolutely love this product!")

        assert isinstance(result, SentimentResult)
        assert result.label in [
            SentimentLabel.POSITIVE,
            SentimentLabel.NEGATIVE,
            SentimentLabel.NEUTRAL,
            SentimentLabel.MIXED,
        ]

    @pytest.mark.asyncio
    async def test_analyze_positive_text(
        self,
        analyzer: SentimentAnalyzer,
        mock_provider: AsyncMock,
    ) -> None:
        """Test analyzing positive text."""
        mock_provider.generate.return_value = AIResponse(
            content='{"label": "positive", "score": 0.92, "confidence": 0.95}',
            model="test-model",
        )

        result = await analyzer.analyze("This is amazing! Best day ever!")

        assert result.label == SentimentLabel.POSITIVE
        assert result.score > 0

    @pytest.mark.asyncio
    async def test_analyze_negative_text(
        self,
        analyzer: SentimentAnalyzer,
        mock_provider: AsyncMock,
    ) -> None:
        """Test analyzing negative text."""
        mock_provider.generate.return_value = AIResponse(
            content='{"label": "negative", "score": -0.88, "confidence": 0.91}',
            model="test-model",
        )

        result = await analyzer.analyze("This is terrible. Worst experience ever.")

        assert result.label == SentimentLabel.NEGATIVE
        assert result.score < 0

    @pytest.mark.asyncio
    async def test_analyze_neutral_text(
        self,
        analyzer: SentimentAnalyzer,
        mock_provider: AsyncMock,
    ) -> None:
        """Test analyzing neutral text."""
        mock_provider.generate.return_value = AIResponse(
            content='{"label": "neutral", "score": 0.05, "confidence": 0.88}',
            model="test-model",
        )

        result = await analyzer.analyze("The meeting is at 3pm.")

        assert result.label == SentimentLabel.NEUTRAL
        assert -0.2 <= result.score <= 0.2

    @pytest.mark.asyncio
    async def test_analyze_batch(
        self,
        analyzer: SentimentAnalyzer,
        mock_provider: AsyncMock,
    ) -> None:
        """Test analyzing multiple texts."""
        texts = [
            "I love this!",
            "This is terrible.",
            "It's okay I guess.",
        ]

        # Set up sequential responses
        mock_provider.generate.side_effect = [
            AIResponse(
                content='{"label": "positive", "score": 0.9, "confidence": 0.95}',
                model="test-model",
            ),
            AIResponse(
                content='{"label": "negative", "score": -0.85, "confidence": 0.92}',
                model="test-model",
            ),
            AIResponse(
                content='{"label": "neutral", "score": 0.1, "confidence": 0.88}',
                model="test-model",
            ),
        ]

        result = await analyzer.analyze_batch(texts)

        assert isinstance(result, BatchSentimentResult)
        assert result.total_analyzed == 3
        assert len(result.results) == 3

    @pytest.mark.asyncio
    async def test_vader_fallback(self, analyzer_no_provider: SentimentAnalyzer) -> None:
        """Test VADER fallback when no provider."""
        result = await analyzer_no_provider.analyze("I love Python programming!")

        assert isinstance(result, SentimentResult)
        # VADER should detect positive sentiment
        assert result.label in [SentimentLabel.POSITIVE, SentimentLabel.NEUTRAL]

    @pytest.mark.asyncio
    async def test_vader_negative(self, analyzer_no_provider: SentimentAnalyzer) -> None:
        """Test VADER with negative text."""
        result = await analyzer_no_provider.analyze(
            "This is awful, terrible, and horrible!"
        )

        assert isinstance(result, SentimentResult)
        assert result.label == SentimentLabel.NEGATIVE

    @pytest.mark.asyncio
    async def test_vader_batch(self, analyzer_no_provider: SentimentAnalyzer) -> None:
        """Test VADER batch analysis."""
        texts = [
            "Great product!",
            "Worst service ever.",
            "It works.",
        ]

        result = await analyzer_no_provider.analyze_batch(texts)

        assert result.total_analyzed == 3
        assert result.positive_count >= 1
        assert result.negative_count >= 1


class TestSentimentAnalyzerEdgeCases:
    """Edge case tests for SentimentAnalyzer."""

    @pytest.mark.asyncio
    async def test_empty_text(self) -> None:
        """Test handling empty text."""
        analyzer = SentimentAnalyzer(provider=None)

        with pytest.raises(ValueError, match="empty"):
            await analyzer.analyze("")

    @pytest.mark.asyncio
    async def test_whitespace_only(self) -> None:
        """Test handling whitespace-only text."""
        analyzer = SentimentAnalyzer(provider=None)

        with pytest.raises(ValueError, match="empty"):
            await analyzer.analyze("   \n\t  ")

    @pytest.mark.asyncio
    async def test_very_long_text(self) -> None:
        """Test handling very long text."""
        analyzer = SentimentAnalyzer(provider=None)

        long_text = "This is great! " * 1000  # Very long positive text

        result = await analyzer.analyze(long_text)

        assert isinstance(result, SentimentResult)

    @pytest.mark.asyncio
    async def test_special_characters(self) -> None:
        """Test handling special characters."""
        analyzer = SentimentAnalyzer(provider=None)

        result = await analyzer.analyze("I 💖 this! 🎉🎊 #amazing")

        assert isinstance(result, SentimentResult)

    @pytest.mark.asyncio
    async def test_mixed_sentiment(self) -> None:
        """Test text with mixed sentiment."""
        analyzer = SentimentAnalyzer(provider=None)

        result = await analyzer.analyze(
            "I love the product but the service was terrible."
        )

        assert isinstance(result, SentimentResult)
        # Could be mixed or slightly positive/negative

    @pytest.mark.asyncio
    async def test_batch_with_empty_list(self) -> None:
        """Test batch analysis with empty list."""
        analyzer = SentimentAnalyzer(provider=None)

        result = await analyzer.analyze_batch([])

        assert result.total_analyzed == 0
        assert len(result.results) == 0

    @pytest.mark.asyncio
    async def test_provider_error_fallback(self) -> None:
        """Test fallback to VADER when provider fails."""
        mock_provider = AsyncMock()
        mock_provider.generate.side_effect = Exception("API error")

        analyzer = SentimentAnalyzer(provider=mock_provider, fallback_to_vader=True)

        # Should fall back to VADER and succeed
        result = await analyzer.analyze("This is great!")

        assert isinstance(result, SentimentResult)


class TestSentimentAnalyzerMetrics:
    """Tests for sentiment metrics and aggregation."""

    @pytest.fixture
    def sample_results(self) -> list[SentimentResult]:
        """Create sample sentiment results."""
        return [
            SentimentResult("Positive 1", SentimentLabel.POSITIVE, 0.9, 0.95),
            SentimentResult("Positive 2", SentimentLabel.POSITIVE, 0.85, 0.92),
            SentimentResult("Negative 1", SentimentLabel.NEGATIVE, -0.8, 0.9),
            SentimentResult("Neutral 1", SentimentLabel.NEUTRAL, 0.0, 0.88),
            SentimentResult("Neutral 2", SentimentLabel.NEUTRAL, 0.1, 0.85),
        ]

    def test_batch_average_score(self, sample_results: list[SentimentResult]) -> None:
        """Test batch average score calculation."""
        batch = BatchSentimentResult(
            results=sample_results,
            total_analyzed=5,
            average_score=sum(r.score for r in sample_results) / 5,
            positive_count=2,
            negative_count=1,
            neutral_count=2,
        )

        expected_avg = (0.9 + 0.85 - 0.8 + 0.0 + 0.1) / 5
        assert abs(batch.average_score - expected_avg) < 0.01

    def test_batch_counts(self, sample_results: list[SentimentResult]) -> None:
        """Test batch sentiment counts."""
        batch = BatchSentimentResult(
            results=sample_results,
            total_analyzed=5,
            average_score=0.21,
            positive_count=2,
            negative_count=1,
            neutral_count=2,
        )

        assert batch.positive_count == 2
        assert batch.negative_count == 1
        assert batch.neutral_count == 2
        assert (
            batch.positive_count + batch.negative_count + batch.neutral_count
            == batch.total_analyzed
        )
