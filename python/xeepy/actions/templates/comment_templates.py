"""
Comment Templates

Pre-made comment templates for various scenarios.
"""

import random
import re
from typing import Optional


class CommentTemplates:
    """
    Pre-made comment templates for various scenarios.
    
    Templates can include placeholders like {topic}, {author}, etc.
    that get filled in based on tweet context.
    
    Usage:
        # Get random template from category
        template = CommentTemplates.get_random("appreciation")
        
        # Format with context
        comment = CommentTemplates.format_template(
            "Great insight on {topic}!",
            {"topic": "AI"}
        )
        
        # Get contextual template
        comment = CommentTemplates.get_contextual(tweet_text)
    """
    
    # Appreciation templates - for valuable content
    APPRECIATION = [
        "Great insight! 🙌",
        "This is so true! Thanks for sharing.",
        "Really valuable thread 📌",
        "Bookmarking this for later!",
        "This needs more visibility 👀",
        "Exactly what I needed to hear today.",
        "This is gold! 💎",
        "Appreciate you sharing this!",
        "More people need to see this.",
        "Such an important point!",
    ]
    
    # Engagement templates - to spark conversation
    ENGAGEMENT = [
        "What's your take on {topic}?",
        "Curious to hear more about this!",
        "Can you elaborate on {point}?",
        "How would you approach this?",
        "What's been your experience with this?",
        "Any tips for someone just starting?",
        "Would love to hear your thoughts on the alternatives.",
        "This is fascinating - what inspired this?",
    ]
    
    # Agreement templates - showing support
    AGREEMENT = [
        "100% agree with this",
        "Finally someone said it! 💯",
        "This resonates so much",
        "Couldn't agree more.",
        "This is exactly right.",
        "You nailed it! 🎯",
        "Perfectly said.",
        "This is the take.",
    ]
    
    # Disagreement templates - respectful pushback
    DISAGREEMENT = [
        "Interesting perspective, though I see it differently.",
        "I'd push back a bit on this - have you considered {alternative}?",
        "Respectfully, I think there's another angle here.",
        "Good point, but {counterpoint} is worth considering too.",
    ]
    
    # Crypto/Web3 templates
    CRYPTO = [
        "WAGMI 🚀",
        "This is the alpha 👀",
        "Bullish on this take",
        "Based take",
        "Few understand 🧠",
        "This is the way",
        "Ser, this is it",
        "NFA but this is 🔥",
        "LFG! 🚀",
        "Wen moon? 🌙",
    ]
    
    # Tech/Developer templates
    TECH = [
        "Ship it! 🚀",
        "What stack are you using?",
        "Would love to see the implementation",
        "Is this open source?",
        "Looks clean! What's the tech behind it?",
        "Great DX 👏",
        "This is well architected",
        "Solid engineering 💪",
        "How's the performance?",
        "What's the learning curve like?",
    ]
    
    # Startup/Business templates
    STARTUP = [
        "Love the product thinking here",
        "Great GTM strategy 📈",
        "This solves a real problem",
        "What's your distribution strategy?",
        "How are you thinking about monetization?",
        "Strong value prop 💪",
        "The market timing seems right",
        "Exciting space to be in!",
    ]
    
    # Learning/Educational templates
    LEARNING = [
        "TIL! Thanks for sharing 📚",
        "This is a great explainer",
        "Saving this for reference",
        "Super helpful breakdown 🙏",
        "This clarifies so much",
        "Finally understand this concept!",
        "Great thread for beginners",
        "Adding this to my reading list",
    ]
    
    # Humor templates - use sparingly
    HUMOR = [
        "This hits different at 2am",
        "Felt this in my soul 😂",
        "Why is this so accurate?",
        "I'm in this post and I don't like it",
        "The accuracy 💀",
    ]
    
    # Supportive templates - for personal shares
    SUPPORTIVE = [
        "Love seeing this! Keep it up! 🙌",
        "This is amazing work!",
        "You're absolutely crushing it!",
        "So proud of you! 🎉",
        "Well deserved! Congratulations!",
        "Keep going, you're doing great!",
        "This is inspiring!",
        "Rooting for you! 💪",
    ]
    
    # Professional networking templates
    NETWORKING = [
        "Would love to connect on this topic",
        "Let's chat more about this - DM open?",
        "Working on something similar - would be great to exchange notes",
        "This aligns with what we're building at {company}",
        "Happy to share our learnings if helpful",
    ]
    
    # Question templates
    QUESTIONS = [
        "What resources would you recommend for learning more?",
        "How long did it take you to get here?",
        "What was the biggest challenge?",
        "Any common mistakes to avoid?",
        "What would you do differently?",
    ]
    
    # Follow-up templates (after initial interaction)
    FOLLOWUP = [
        "Following up on this - any updates?",
        "Still thinking about this thread",
        "Came back to this - such good advice",
        "Implemented your suggestion - works great!",
    ]
    
    @classmethod
    def get_random(cls, category: str) -> str:
        """
        Get a random template from a category.
        
        Args:
            category: Template category name (lowercase)
            
        Returns:
            Random template string
        """
        category_map = {
            "appreciation": cls.APPRECIATION,
            "engagement": cls.ENGAGEMENT,
            "agreement": cls.AGREEMENT,
            "disagreement": cls.DISAGREEMENT,
            "crypto": cls.CRYPTO,
            "tech": cls.TECH,
            "startup": cls.STARTUP,
            "learning": cls.LEARNING,
            "humor": cls.HUMOR,
            "supportive": cls.SUPPORTIVE,
            "networking": cls.NETWORKING,
            "questions": cls.QUESTIONS,
            "followup": cls.FOLLOWUP,
        }
        
        templates = category_map.get(category.lower())
        if not templates:
            # Default to appreciation
            templates = cls.APPRECIATION
        
        return random.choice(templates)
    
    @classmethod
    def get_all_categories(cls) -> list[str]:
        """Get list of all available categories."""
        return [
            "appreciation", "engagement", "agreement", "disagreement",
            "crypto", "tech", "startup", "learning", "humor",
            "supportive", "networking", "questions", "followup"
        ]
    
    @classmethod
    def get_templates_for_category(cls, category: str) -> list[str]:
        """Get all templates for a category."""
        category_map = {
            "appreciation": cls.APPRECIATION,
            "engagement": cls.ENGAGEMENT,
            "agreement": cls.AGREEMENT,
            "disagreement": cls.DISAGREEMENT,
            "crypto": cls.CRYPTO,
            "tech": cls.TECH,
            "startup": cls.STARTUP,
            "learning": cls.LEARNING,
            "humor": cls.HUMOR,
            "supportive": cls.SUPPORTIVE,
            "networking": cls.NETWORKING,
            "questions": cls.QUESTIONS,
            "followup": cls.FOLLOWUP,
        }
        return category_map.get(category.lower(), [])
    
    @classmethod
    def format_template(cls, template: str, context: dict) -> str:
        """
        Format a template with context from tweet.
        
        Args:
            template: Template string with {placeholders}
            context: Dictionary of values for placeholders
            
        Returns:
            Formatted template string
        """
        try:
            # Find all placeholders in template
            placeholders = re.findall(r'\{(\w+)\}', template)
            
            # Fill in available context
            result = template
            for placeholder in placeholders:
                if placeholder in context:
                    result = result.replace(f"{{{placeholder}}}", str(context[placeholder]))
                else:
                    # Remove unfilled placeholders gracefully
                    result = result.replace(f"{{{placeholder}}}", "")
            
            # Clean up any double spaces
            result = re.sub(r'\s+', ' ', result).strip()
            
            return result
        except Exception:
            return template
    
    @classmethod
    def get_contextual(
        cls,
        tweet_text: str,
        author_username: Optional[str] = None,
        hashtags: Optional[list[str]] = None,
    ) -> str:
        """
        Get a contextually appropriate template based on tweet content.
        
        Args:
            tweet_text: The tweet's text content
            author_username: Author's username (optional)
            hashtags: List of hashtags (optional)
            
        Returns:
            Appropriate template
        """
        text_lower = tweet_text.lower() if tweet_text else ""
        hashtags = hashtags or []
        hashtags_lower = [h.lower() for h in hashtags]
        
        # Detect crypto/web3 content
        crypto_keywords = ["crypto", "bitcoin", "ethereum", "btc", "eth", "nft", 
                         "defi", "web3", "blockchain", "wagmi", "gm", "dao"]
        if any(kw in text_lower for kw in crypto_keywords) or \
           any(tag in hashtags_lower for tag in crypto_keywords):
            return cls.get_random("crypto")
        
        # Detect tech content
        tech_keywords = ["coding", "programming", "developer", "javascript", "python",
                        "react", "api", "deploy", "open source", "github", "code"]
        if any(kw in text_lower for kw in tech_keywords):
            return cls.get_random("tech")
        
        # Detect startup/business content
        startup_keywords = ["startup", "fundraise", "vc", "founder", "launched",
                          "product", "mvp", "growth", "revenue", "users"]
        if any(kw in text_lower for kw in startup_keywords):
            return cls.get_random("startup")
        
        # Detect educational content
        learning_keywords = ["learned", "lesson", "tips", "guide", "how to", 
                           "tutorial", "thread", "explained", "breakdown"]
        if any(kw in text_lower for kw in learning_keywords):
            return cls.get_random("learning")
        
        # Detect personal achievement
        achievement_keywords = ["excited to", "proud to", "finally", "achieved",
                              "milestone", "anniversary", "promoted", "hired"]
        if any(kw in text_lower for kw in achievement_keywords):
            return cls.get_random("supportive")
        
        # Detect question/seeking advice
        if "?" in tweet_text:
            # It's a question, might want to engage
            return cls.get_random("engagement")
        
        # Default to appreciation
        return cls.get_random("appreciation")
    
    @classmethod
    def add_emoji(cls, text: str, emoji_probability: float = 0.3) -> str:
        """
        Optionally add an emoji to text.
        
        Args:
            text: The text to potentially add emoji to
            emoji_probability: Chance of adding emoji (0-1)
            
        Returns:
            Text with or without emoji
        """
        if random.random() > emoji_probability:
            return text
        
        # Don't add if already has emoji
        if re.search(r'[\U0001F300-\U0001F9FF]', text):
            return text
        
        emojis = ["👀", "🔥", "💯", "🙌", "👏", "💪", "📌", "💡", "✨", "🎯"]
        return f"{text} {random.choice(emojis)}"
    
    @classmethod
    def make_natural(cls, text: str) -> str:
        """
        Make template text more natural/varied.
        
        Args:
            text: Template text
            
        Returns:
            More natural variation
        """
        # Random capitalization of first letter
        if random.random() < 0.3 and text[0].isupper():
            text = text[0].lower() + text[1:]
        
        # Random punctuation
        if text.endswith("!") and random.random() < 0.3:
            text = text[:-1] + "."
        elif text.endswith(".") and random.random() < 0.2:
            text = text[:-1] + "!"
        
        return text


# Convenience functions
def get_appreciation_comment() -> str:
    """Get a random appreciation comment."""
    return CommentTemplates.get_random("appreciation")


def get_tech_comment() -> str:
    """Get a random tech comment."""
    return CommentTemplates.get_random("tech")


def get_crypto_comment() -> str:
    """Get a random crypto comment."""
    return CommentTemplates.get_random("crypto")


def get_supportive_comment() -> str:
    """Get a random supportive comment."""
    return CommentTemplates.get_random("supportive")


def get_contextual_comment(tweet_text: str) -> str:
    """Get a contextually appropriate comment."""
    return CommentTemplates.get_contextual(tweet_text)
