"""
Tests for Comment Templates

Unit tests for comment template system.
"""

import pytest
from xeepy.actions.templates.comment_templates import (
    CommentTemplates,
    get_appreciation_comment,
    get_tech_comment,
    get_crypto_comment,
    get_supportive_comment,
    get_contextual_comment,
)


class TestCommentTemplates:
    """Tests for CommentTemplates class."""
    
    def test_get_random_appreciation(self):
        """Test getting random appreciation template."""
        template = CommentTemplates.get_random("appreciation")
        
        assert isinstance(template, str)
        assert len(template) > 0
        assert template in CommentTemplates.APPRECIATION
    
    def test_get_random_tech(self):
        """Test getting random tech template."""
        template = CommentTemplates.get_random("tech")
        
        assert template in CommentTemplates.TECH
    
    def test_get_random_crypto(self):
        """Test getting random crypto template."""
        template = CommentTemplates.get_random("crypto")
        
        assert template in CommentTemplates.CRYPTO
    
    def test_get_random_invalid_category(self):
        """Test fallback for invalid category."""
        template = CommentTemplates.get_random("nonexistent")
        
        # Should fallback to appreciation
        assert template in CommentTemplates.APPRECIATION
    
    def test_get_all_categories(self):
        """Test getting all category names."""
        categories = CommentTemplates.get_all_categories()
        
        assert isinstance(categories, list)
        assert "appreciation" in categories
        assert "tech" in categories
        assert "crypto" in categories
        assert len(categories) == 13
    
    def test_get_templates_for_category(self):
        """Test getting all templates for a category."""
        templates = CommentTemplates.get_templates_for_category("agreement")
        
        assert isinstance(templates, list)
        assert len(templates) > 0
        assert templates == CommentTemplates.AGREEMENT
    
    def test_get_templates_invalid_category(self):
        """Test getting templates for invalid category."""
        templates = CommentTemplates.get_templates_for_category("invalid")
        
        assert templates == []


class TestFormatTemplate:
    """Tests for template formatting."""
    
    def test_format_simple_placeholder(self):
        """Test formatting with simple placeholder."""
        template = "Great insight on {topic}!"
        result = CommentTemplates.format_template(
            template,
            {"topic": "AI"}
        )
        
        assert result == "Great insight on AI!"
    
    def test_format_multiple_placeholders(self):
        """Test formatting with multiple placeholders."""
        template = "Hey {author}, love your take on {topic}!"
        result = CommentTemplates.format_template(
            template,
            {"author": "@elonmusk", "topic": "space"}
        )
        
        assert result == "Hey @elonmusk, love your take on space!"
    
    def test_format_missing_placeholder(self):
        """Test formatting with missing placeholder values."""
        template = "Great post about {topic}!"
        result = CommentTemplates.format_template(
            template,
            {}  # No context provided
        )
        
        # Should remove unfilled placeholder
        assert "{topic}" not in result
    
    def test_format_extra_context(self):
        """Test formatting with extra context values."""
        template = "Nice!"
        result = CommentTemplates.format_template(
            template,
            {"unused": "value"}
        )
        
        assert result == "Nice!"


class TestContextualTemplates:
    """Tests for contextual template selection."""
    
    def test_crypto_detection(self):
        """Test crypto content detection."""
        tweet_text = "Just bought some Bitcoin, feeling bullish!"
        template = CommentTemplates.get_contextual(tweet_text)
        
        assert template in CommentTemplates.CRYPTO
    
    def test_tech_detection(self):
        """Test tech content detection."""
        tweet_text = "Just deployed my new Python API to production"
        template = CommentTemplates.get_contextual(tweet_text)
        
        assert template in CommentTemplates.TECH
    
    def test_startup_detection(self):
        """Test startup content detection."""
        tweet_text = "Excited to announce our seed fundraise!"
        template = CommentTemplates.get_contextual(tweet_text)
        
        assert template in CommentTemplates.STARTUP
    
    def test_learning_detection(self):
        """Test learning content detection."""
        tweet_text = "Here's a guide on how to learn machine learning"
        template = CommentTemplates.get_contextual(tweet_text)
        
        assert template in CommentTemplates.LEARNING
    
    def test_supportive_detection(self):
        """Test supportive content detection."""
        tweet_text = "Excited to announce I got promoted!"
        template = CommentTemplates.get_contextual(tweet_text)
        
        assert template in CommentTemplates.SUPPORTIVE
    
    def test_question_detection(self):
        """Test question detection."""
        tweet_text = "What's your favorite programming language?"
        template = CommentTemplates.get_contextual(tweet_text)
        
        assert template in CommentTemplates.ENGAGEMENT
    
    def test_default_appreciation(self):
        """Test default to appreciation."""
        tweet_text = "Having a nice day today"
        template = CommentTemplates.get_contextual(tweet_text)
        
        assert template in CommentTemplates.APPRECIATION
    
    def test_hashtag_detection(self):
        """Test hashtag-based detection."""
        tweet_text = "Great news today!"
        template = CommentTemplates.get_contextual(
            tweet_text,
            hashtags=["crypto", "bitcoin"]
        )
        
        assert template in CommentTemplates.CRYPTO


class TestEmojiHandling:
    """Tests for emoji handling."""
    
    def test_add_emoji_probability(self):
        """Test emoji addition probability."""
        text = "Great post"
        
        # Run multiple times to test probability
        with_emoji = 0
        for _ in range(100):
            result = CommentTemplates.add_emoji(text, emoji_probability=1.0)
            if result != text:
                with_emoji += 1
        
        # With probability 1.0, should always add emoji
        assert with_emoji == 100
    
    def test_no_emoji_with_zero_probability(self):
        """Test no emoji with zero probability."""
        text = "Great post"
        result = CommentTemplates.add_emoji(text, emoji_probability=0.0)
        
        assert result == text
    
    def test_no_double_emoji(self):
        """Test no double emoji."""
        text = "Great post 🔥"
        result = CommentTemplates.add_emoji(text, emoji_probability=1.0)
        
        # Should not add another emoji
        assert result == text


class TestMakeNatural:
    """Tests for natural text variation."""
    
    def test_make_natural_returns_string(self):
        """Test make_natural returns string."""
        text = "This is great!"
        result = CommentTemplates.make_natural(text)
        
        assert isinstance(result, str)
        assert len(result) > 0
    
    def test_make_natural_preserves_meaning(self):
        """Test make_natural preserves core content."""
        text = "Great post!"
        result = CommentTemplates.make_natural(text)
        
        # Core word should remain
        assert "great" in result.lower() or "Great" in result


class TestConvenienceFunctions:
    """Tests for convenience functions."""
    
    def test_get_appreciation_comment(self):
        """Test get_appreciation_comment."""
        comment = get_appreciation_comment()
        
        assert comment in CommentTemplates.APPRECIATION
    
    def test_get_tech_comment(self):
        """Test get_tech_comment."""
        comment = get_tech_comment()
        
        assert comment in CommentTemplates.TECH
    
    def test_get_crypto_comment(self):
        """Test get_crypto_comment."""
        comment = get_crypto_comment()
        
        assert comment in CommentTemplates.CRYPTO
    
    def test_get_supportive_comment(self):
        """Test get_supportive_comment."""
        comment = get_supportive_comment()
        
        assert comment in CommentTemplates.SUPPORTIVE
    
    def test_get_contextual_comment(self):
        """Test get_contextual_comment."""
        comment = get_contextual_comment("Python is great!")
        
        assert isinstance(comment, str)
        assert len(comment) > 0


class TestTemplateContent:
    """Tests for template content quality."""
    
    def test_all_templates_non_empty(self):
        """Test all templates are non-empty strings."""
        for category in CommentTemplates.get_all_categories():
            templates = CommentTemplates.get_templates_for_category(category)
            for template in templates:
                assert isinstance(template, str)
                assert len(template) > 0
    
    def test_templates_reasonable_length(self):
        """Test templates are reasonable length."""
        for category in CommentTemplates.get_all_categories():
            templates = CommentTemplates.get_templates_for_category(category)
            for template in templates:
                # Should be under 280 chars (X limit)
                assert len(template) <= 280
    
    def test_no_duplicate_templates(self):
        """Test no duplicate templates within categories."""
        for category in CommentTemplates.get_all_categories():
            templates = CommentTemplates.get_templates_for_category(category)
            assert len(templates) == len(set(templates))
