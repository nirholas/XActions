"""
AI Content Generator for Xeepy.

Generate AI-powered content including tweets, replies, threads, and bios.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from loguru import logger

from xeepy.ai.providers.base import AIProvider, Message


# Style presets for content generation
STYLES = {
    "helpful": "Be genuinely helpful and add value to the conversation. Provide useful information or insights.",
    "witty": "Be clever and humorous but not offensive. Use wit appropriately for the context.",
    "professional": "Maintain a professional tone suitable for business. Be concise and polished.",
    "crypto": "Use crypto Twitter vernacular naturally (WAGMI, based, gm, etc.). Show understanding of the space.",
    "tech": "Be technically accurate and enthusiastic about technology. Share knowledge engagingly.",
    "casual": "Be friendly and conversational. Use a relaxed, approachable tone.",
    "educational": "Explain concepts clearly and thoroughly. Make complex topics accessible.",
    "controversial": "Take a strong stance and encourage discussion. Be provocative but respectful.",
    "inspirational": "Be motivating and uplifting. Share positive energy and encouragement.",
}


@dataclass
class GeneratedContent:
    """Generated content result.
    
    Attributes:
        content: The generated text content.
        style: Style used for generation.
        tokens_used: Total tokens used for generation.
        alternatives: Alternative versions (if requested).
    """
    content: str
    style: str
    tokens_used: int = 0
    alternatives: list[str] | None = None


class ContentGenerator:
    """Generate content using AI.
    
    Supports generating:
    - Tweet replies
    - Original tweets
    - Twitter threads
    - Bio text
    - Improved/optimized text
    
    Example:
        ```python
        from xeepy.ai import ContentGenerator
        from xeepy.ai.providers import OpenAIProvider
        
        provider = OpenAIProvider()
        generator = ContentGenerator(provider)
        
        reply = await generator.generate_reply(
            tweet_text="Just launched my new project!",
            style="helpful",
        )
        print(reply.content)
        ```
    """
    
    def __init__(self, provider: AIProvider):
        """Initialize the content generator.
        
        Args:
            provider: AI provider to use for generation.
        """
        self.provider = provider
    
    async def generate_reply(
        self,
        tweet_text: str,
        *,
        style: str = "helpful",
        context: dict[str, Any] | None = None,
        max_length: int = 280,
        author_info: str | None = None,
    ) -> GeneratedContent:
        """Generate an appropriate reply to a tweet.
        
        Args:
            tweet_text: The tweet text to reply to.
            style: Response style (from STYLES or custom).
            context: Additional context (user info, thread, etc.).
            max_length: Maximum response length in characters.
            author_info: Information about the tweet author.
            
        Returns:
            GeneratedContent with the reply text.
        """
        style_instruction = STYLES.get(style, style)
        
        system_prompt = f"""You are a Twitter user crafting a reply to a tweet.
        
Style: {style_instruction}

Guidelines:
- Keep your reply under {max_length} characters
- Be authentic and human-like
- Don't use excessive hashtags or emojis
- Match the tone and context of the original tweet
- Add value to the conversation
- Never be generic or spammy"""

        user_prompt = f"Tweet to reply to: \"{tweet_text}\""
        
        if author_info:
            user_prompt += f"\n\nAbout the author: {author_info}"
        
        if context:
            if "thread" in context:
                user_prompt += f"\n\nThread context: {context['thread']}"
            if "topic" in context:
                user_prompt += f"\n\nTopic: {context['topic']}"
        
        user_prompt += "\n\nGenerate a natural, engaging reply:"
        
        response = await self.provider.generate(
            user_prompt,
            system_prompt=system_prompt,
            max_tokens=150,
        )
        
        content = self._clean_content(response.content, max_length)
        
        return GeneratedContent(
            content=content,
            style=style,
            tokens_used=response.usage.get("total_tokens", 0),
        )
    
    async def generate_tweet(
        self,
        topic: str,
        *,
        style: str = "informative",
        hashtags: list[str] | None = None,
        max_length: int = 280,
        include_cta: bool = False,
    ) -> GeneratedContent:
        """Generate a tweet about a topic.
        
        Args:
            topic: The topic to tweet about.
            style: Tweet style.
            hashtags: Optional hashtags to include.
            max_length: Maximum tweet length.
            include_cta: Whether to include a call-to-action.
            
        Returns:
            GeneratedContent with the tweet text.
        """
        style_instruction = STYLES.get(style, style)
        
        # Reserve space for hashtags
        hashtag_length = 0
        if hashtags:
            hashtag_length = sum(len(h) + 2 for h in hashtags)  # +2 for "# " and " "
        
        effective_max_length = max_length - hashtag_length
        
        system_prompt = f"""You are creating a tweet.

Style: {style_instruction}

Guidelines:
- Keep the tweet under {effective_max_length} characters (hashtags will be added separately)
- Be engaging and shareable
- Write in first person when appropriate
- Don't use hashtags (they'll be added)
- {"Include a call-to-action (question, invitation to discuss, etc.)" if include_cta else ""}"""

        user_prompt = f"Create a tweet about: {topic}"
        
        response = await self.provider.generate(
            user_prompt,
            system_prompt=system_prompt,
            max_tokens=100,
        )
        
        content = self._clean_content(response.content, effective_max_length)
        
        # Add hashtags
        if hashtags:
            hashtag_str = " " + " ".join(f"#{h.lstrip('#')}" for h in hashtags)
            content = content.rstrip() + hashtag_str
        
        return GeneratedContent(
            content=content,
            style=style,
            tokens_used=response.usage.get("total_tokens", 0),
        )
    
    async def generate_thread(
        self,
        topic: str,
        *,
        num_tweets: int = 5,
        style: str = "educational",
        hook_style: str = "intriguing",
    ) -> list[GeneratedContent]:
        """Generate a Twitter thread on a topic.
        
        Args:
            topic: The topic to create a thread about.
            num_tweets: Number of tweets in the thread.
            style: Overall thread style.
            hook_style: Style for the opening hook.
            
        Returns:
            List of GeneratedContent for each tweet in the thread.
        """
        style_instruction = STYLES.get(style, style)
        
        system_prompt = f"""You are creating a Twitter thread.

Style: {style_instruction}

Guidelines:
- Create exactly {num_tweets} tweets
- Each tweet must be under 270 characters (leaving room for numbering)
- First tweet should be a compelling hook
- Each tweet should flow naturally to the next
- Last tweet should have a conclusion/CTA
- Number format: "1/{num_tweets}" at the end of each tweet
- Make it educational and valuable
- Use line breaks within tweets for readability where appropriate"""

        user_prompt = f"""Create a {num_tweets}-tweet thread about: {topic}

Format each tweet on a new line, separated by "---"
Include the tweet number at the end of each tweet."""

        response = await self.provider.generate(
            user_prompt,
            system_prompt=system_prompt,
            max_tokens=num_tweets * 150,
        )
        
        # Parse the thread
        tweets = []
        raw_tweets = response.content.split("---")
        
        for i, tweet in enumerate(raw_tweets[:num_tweets], 1):
            tweet = tweet.strip()
            if tweet:
                # Clean and ensure numbering
                tweet = self._clean_content(tweet, 270)
                if f"/{num_tweets}" not in tweet:
                    tweet = f"{tweet} {i}/{num_tweets}"
                
                tweets.append(GeneratedContent(
                    content=tweet,
                    style=style,
                    tokens_used=response.usage.get("total_tokens", 0) // num_tweets,
                ))
        
        return tweets
    
    async def improve_text(
        self,
        text: str,
        *,
        goal: str = "engagement",
        max_length: int = 280,
        preserve_meaning: bool = True,
    ) -> GeneratedContent:
        """Improve existing text for better engagement.
        
        Args:
            text: The text to improve.
            goal: Improvement goal ('engagement', 'clarity', 'professionalism').
            max_length: Maximum output length.
            preserve_meaning: Whether to preserve original meaning.
            
        Returns:
            GeneratedContent with improved text.
        """
        goal_instructions = {
            "engagement": "Make it more engaging, shareable, and likely to get interactions.",
            "clarity": "Make it clearer and easier to understand.",
            "professionalism": "Make it more professional and polished.",
            "concise": "Make it shorter while preserving the key message.",
            "viral": "Optimize for viral potential - make it provocative, relatable, or highly shareable.",
        }
        
        instruction = goal_instructions.get(goal, goal)
        
        system_prompt = f"""You are improving text for Twitter.

Goal: {instruction}

Guidelines:
- Keep the result under {max_length} characters
- {"Preserve the original meaning and intent" if preserve_meaning else "Feel free to reframe the message"}
- Make it sound natural and human
- Only return the improved text, nothing else"""

        user_prompt = f"Original text: \"{text}\"\n\nImproved version:"
        
        response = await self.provider.generate(
            user_prompt,
            system_prompt=system_prompt,
            max_tokens=100,
        )
        
        content = self._clean_content(response.content, max_length)
        
        return GeneratedContent(
            content=content,
            style=goal,
            tokens_used=response.usage.get("total_tokens", 0),
        )
    
    async def generate_bio(
        self,
        *,
        topics: list[str] | None = None,
        personality: str = "professional",
        max_length: int = 160,
        include_emoji: bool = True,
    ) -> GeneratedContent:
        """Generate a Twitter bio.
        
        Args:
            topics: Topics/interests to include.
            personality: Bio personality/tone.
            max_length: Maximum bio length.
            include_emoji: Whether to include emojis.
            
        Returns:
            GeneratedContent with bio text.
        """
        system_prompt = f"""You are creating a Twitter bio.

Personality: {personality}

Guidelines:
- Keep it under {max_length} characters
- {"Include 1-2 relevant emojis" if include_emoji else "Don't use emojis"}
- Be memorable and unique
- Show personality
- Only return the bio text, nothing else"""

        topics_str = ", ".join(topics) if topics else "general interests"
        user_prompt = f"Create a bio for someone interested in: {topics_str}"
        
        response = await self.provider.generate(
            user_prompt,
            system_prompt=system_prompt,
            max_tokens=80,
        )
        
        content = self._clean_content(response.content, max_length)
        
        return GeneratedContent(
            content=content,
            style=personality,
            tokens_used=response.usage.get("total_tokens", 0),
        )
    
    async def generate_alternatives(
        self,
        original: str,
        *,
        num_alternatives: int = 3,
        style: str | None = None,
    ) -> list[GeneratedContent]:
        """Generate alternative versions of content.
        
        Args:
            original: Original content to create alternatives for.
            num_alternatives: Number of alternatives to generate.
            style: Optional style for alternatives.
            
        Returns:
            List of alternative GeneratedContent.
        """
        system_prompt = """You are creating alternative versions of a tweet.

Guidelines:
- Create distinctly different versions
- Maintain the core message
- Each version should have a unique angle or tone
- Separate each alternative with "---"
- Only return the alternatives, no explanations"""

        user_prompt = f"""Create {num_alternatives} alternative versions of:
"{original}"

Alternatives:"""

        response = await self.provider.generate(
            user_prompt,
            system_prompt=system_prompt,
            max_tokens=num_alternatives * 100,
        )
        
        alternatives = []
        for alt in response.content.split("---"):
            alt = alt.strip()
            if alt:
                alternatives.append(GeneratedContent(
                    content=self._clean_content(alt, 280),
                    style=style or "alternative",
                    tokens_used=response.usage.get("total_tokens", 0) // num_alternatives,
                ))
        
        return alternatives[:num_alternatives]
    
    def _clean_content(self, content: str, max_length: int) -> str:
        """Clean and truncate content.
        
        Args:
            content: Content to clean.
            max_length: Maximum length.
            
        Returns:
            Cleaned content.
        """
        # Remove common AI artifacts
        content = content.strip()
        content = content.strip('"\'')
        
        # Remove "Here's..." or similar prefixes
        prefixes_to_remove = [
            "Here's a reply:",
            "Here's my reply:",
            "Reply:",
            "Tweet:",
            "Here's the tweet:",
        ]
        for prefix in prefixes_to_remove:
            if content.lower().startswith(prefix.lower()):
                content = content[len(prefix):].strip()
        
        # Truncate if needed
        if len(content) > max_length:
            # Try to truncate at a natural break
            truncated = content[:max_length]
            
            # Find last sentence/phrase break
            for sep in [". ", "! ", "? ", "... ", ", "]:
                last_sep = truncated.rfind(sep)
                if last_sep > max_length * 0.7:
                    return truncated[:last_sep + len(sep) - 1].strip()
            
            # Fall back to word break
            last_space = truncated.rfind(" ")
            if last_space > max_length * 0.8:
                return truncated[:last_space].strip() + "..."
            
            return truncated.strip()
        
        return content
