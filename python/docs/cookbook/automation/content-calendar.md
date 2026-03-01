# AI-Powered Content Calendar

Build an intelligent content calendar that uses AI to generate topics, identify trends, and maintain a consistent content strategy.

---

## Overview

This recipe creates an AI-powered content calendar with:

- **Content pillars** - Organize by themes
- **AI topic generation** - Generate ideas per pillar
- **Trend integration** - Incorporate trending topics
- **Gap analysis** - Find missing content areas
- **Performance feedback** - Learn from results
- **30-day generator** - Automated calendar creation

---

## System Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Content        │────▶│  AI Topic    │────▶│  Calendar       │
│  Pillars        │     │  Generator   │     │  Builder        │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                     │
        ▼                       ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Trend          │     │  Gap         │     │  Performance    │
│  Analyzer       │     │  Analyzer    │     │  Tracker        │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

---

## Data Models

```python
# calendar_models.py
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional
from enum import Enum

class ContentPillar(Enum):
    EDUCATIONAL = "educational"
    PROMOTIONAL = "promotional"
    ENGAGEMENT = "engagement"
    PERSONAL = "personal"
    CURATED = "curated"
    TRENDING = "trending"

@dataclass
class ContentIdea:
    id: str
    title: str
    pillar: ContentPillar
    description: str
    keywords: list[str]
    suggested_format: str  # tweet, thread, poll, image
    estimated_engagement: float
    trending_score: float = 0.0
    generated_at: datetime = field(default_factory=datetime.now)
    
    # Draft content
    draft_content: Optional[str] = None
    
    # Scheduling
    scheduled_date: Optional[date] = None
    published: bool = False

@dataclass
class CalendarDay:
    date: date
    posts: list[ContentIdea] = field(default_factory=list)
    pillar_distribution: dict[ContentPillar, int] = field(default_factory=dict)
    is_holiday: bool = False
    holiday_name: Optional[str] = None
    notes: str = ""

@dataclass
class ContentCalendar:
    name: str
    start_date: date
    end_date: date
    days: list[CalendarDay] = field(default_factory=list)
    pillar_ratios: dict[ContentPillar, float] = field(default_factory=dict)
    posts_per_day: int = 3
```

---

## Content Pillar Framework

```python
# pillar_framework.py
from dataclasses import dataclass
from calendar_models import ContentPillar

@dataclass
class PillarDefinition:
    pillar: ContentPillar
    name: str
    description: str
    example_topics: list[str]
    target_ratio: float  # 0-1, portion of content
    best_formats: list[str]
    best_days: list[int]  # 0=Monday
    engagement_multiplier: float = 1.0

class PillarFramework:
    """Define and manage content pillars."""
    
    DEFAULT_PILLARS = [
        PillarDefinition(
            pillar=ContentPillar.EDUCATIONAL,
            name="Educational",
            description="Teach your audience something valuable",
            example_topics=[
                "How-to guides",
                "Tips and tricks",
                "Industry insights",
                "Tutorials"
            ],
            target_ratio=0.35,
            best_formats=["thread", "image"],
            best_days=[1, 2, 3],  # Tue, Wed, Thu
            engagement_multiplier=1.2
        ),
        PillarDefinition(
            pillar=ContentPillar.PROMOTIONAL,
            name="Promotional",
            description="Promote your products or services",
            example_topics=[
                "Product updates",
                "Case studies",
                "Testimonials",
                "Launches"
            ],
            target_ratio=0.15,
            best_formats=["tweet", "image"],
            best_days=[2, 4],  # Wed, Fri
            engagement_multiplier=0.8
        ),
        PillarDefinition(
            pillar=ContentPillar.ENGAGEMENT,
            name="Engagement",
            description="Spark conversation and interaction",
            example_topics=[
                "Questions",
                "Polls",
                "Hot takes",
                "Debates"
            ],
            target_ratio=0.25,
            best_formats=["poll", "tweet"],
            best_days=[0, 4],  # Mon, Fri
            engagement_multiplier=1.5
        ),
        PillarDefinition(
            pillar=ContentPillar.PERSONAL,
            name="Personal",
            description="Share personal stories and behind-the-scenes",
            example_topics=[
                "Journey updates",
                "Lessons learned",
                "Behind the scenes",
                "Celebrations"
            ],
            target_ratio=0.15,
            best_formats=["tweet", "thread"],
            best_days=[0, 6],  # Mon, Sun
            engagement_multiplier=1.3
        ),
        PillarDefinition(
            pillar=ContentPillar.CURATED,
            name="Curated",
            description="Share valuable content from others",
            example_topics=[
                "Industry news",
                "Interesting threads",
                "Tool recommendations",
                "Resource roundups"
            ],
            target_ratio=0.10,
            best_formats=["tweet"],
            best_days=[1, 3, 5],  # Tue, Thu, Sat
            engagement_multiplier=0.9
        ),
    ]
    
    def __init__(self, custom_pillars: list[PillarDefinition] = None):
        self.pillars = custom_pillars or self.DEFAULT_PILLARS
        self.pillar_map = {p.pillar: p for p in self.pillars}
    
    def get_pillar(self, pillar: ContentPillar) -> PillarDefinition:
        return self.pillar_map.get(pillar)
    
    def get_ratios(self) -> dict[ContentPillar, float]:
        return {p.pillar: p.target_ratio for p in self.pillars}
    
    def suggest_pillar_for_day(self, day_of_week: int) -> ContentPillar:
        """Suggest best pillar for a day of week."""
        
        candidates = [
            p for p in self.pillars
            if day_of_week in p.best_days
        ]
        
        if not candidates:
            # Default to educational
            return ContentPillar.EDUCATIONAL
        
        # Return highest engagement multiplier
        return max(candidates, key=lambda p: p.engagement_multiplier).pillar
```

---

## AI Topic Generator

```python
# topic_generator.py
import os
from typing import Optional
import json

from calendar_models import ContentIdea, ContentPillar
from pillar_framework import PillarFramework

class AITopicGenerator:
    """Generate content topics using AI."""
    
    def __init__(
        self,
        provider: str = "openai",
        api_key: str = None,
        model: str = "gpt-4"
    ):
        self.provider = provider
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.framework = PillarFramework()
    
    async def generate_topics(
        self,
        pillar: ContentPillar,
        niche: str,
        count: int = 5,
        recent_topics: list[str] = None
    ) -> list[ContentIdea]:
        """Generate topic ideas for a pillar."""
        
        pillar_def = self.framework.get_pillar(pillar)
        
        prompt = f"""Generate {count} unique content ideas for Twitter/X.

Niche: {niche}
Content Pillar: {pillar_def.name}
Pillar Description: {pillar_def.description}
Example Topics: {', '.join(pillar_def.example_topics)}
Best Formats: {', '.join(pillar_def.best_formats)}

{"Avoid these recent topics: " + ', '.join(recent_topics) if recent_topics else ""}

For each idea, provide:
1. Title (catchy, specific)
2. Description (2-3 sentences)
3. Keywords (3-5 relevant keywords)
4. Suggested format (tweet/thread/poll/image)
5. Estimated engagement (1-10 scale)

Return as JSON array with fields: title, description, keywords, format, engagement"""

        # Call AI API
        response = await self._call_ai(prompt)
        
        # Parse response
        ideas = self._parse_response(response, pillar)
        
        return ideas
    
    async def generate_draft_content(
        self,
        idea: ContentIdea,
        style: str = "professional",
        max_length: int = 280
    ) -> str:
        """Generate draft tweet content for an idea."""
        
        prompt = f"""Write a Twitter/X post for this content idea:

Title: {idea.title}
Description: {idea.description}
Keywords: {', '.join(idea.keywords)}
Format: {idea.suggested_format}
Style: {style}
Max Length: {max_length} characters

Requirements:
- Be engaging and hook the reader
- Include relevant emoji
- End with a call to action or question
- Stay within character limit

{"If thread format, write the first tweet that hooks readers." if idea.suggested_format == 'thread' else ""}
{"If poll format, include 2-4 poll options." if idea.suggested_format == 'poll' else ""}

Return just the tweet text, no explanation."""

        response = await self._call_ai(prompt)
        return response.strip()
    
    async def _call_ai(self, prompt: str) -> str:
        """Call AI API."""
        
        if self.provider == "openai":
            import openai
            
            client = openai.AsyncOpenAI(api_key=self.api_key)
            
            response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8
            )
            
            return response.choices[0].message.content
        
        else:
            raise ValueError(f"Unknown provider: {self.provider}")
    
    def _parse_response(
        self,
        response: str,
        pillar: ContentPillar
    ) -> list[ContentIdea]:
        """Parse AI response into ContentIdea objects."""
        
        ideas = []
        
        try:
            # Try to parse as JSON
            data = json.loads(response)
            
            for i, item in enumerate(data):
                idea = ContentIdea(
                    id=f"idea_{pillar.value}_{i}",
                    title=item.get('title', ''),
                    pillar=pillar,
                    description=item.get('description', ''),
                    keywords=item.get('keywords', []),
                    suggested_format=item.get('format', 'tweet'),
                    estimated_engagement=float(item.get('engagement', 5))
                )
                ideas.append(idea)
        
        except json.JSONDecodeError:
            # Fallback: create single idea from response
            ideas.append(ContentIdea(
                id=f"idea_{pillar.value}_0",
                title="Generated Idea",
                pillar=pillar,
                description=response[:200],
                keywords=[],
                suggested_format='tweet',
                estimated_engagement=5.0
            ))
        
        return ideas
```

---

## Trend Analyzer

```python
# trend_analyzer.py
from datetime import datetime
from typing import Optional

from xeepy import Xeepy

class TrendAnalyzer:
    """Analyze trending topics for content opportunities."""
    
    def __init__(self):
        self.cached_trends: list[dict] = []
        self.last_fetch: Optional[datetime] = None
    
    async def fetch_trends(
        self,
        location: str = "Worldwide"
    ) -> list[dict]:
        """Fetch current trending topics."""
        
        async with Xeepy() as x:
            trends = await x.trends(location=location)
            
            self.cached_trends = [
                {
                    'name': t.name,
                    'tweet_count': t.tweet_count,
                    'url': t.url
                }
                for t in trends.items
            ]
            
            self.last_fetch = datetime.now()
            
            return self.cached_trends
    
    def find_relevant_trends(
        self,
        niche_keywords: list[str],
        min_relevance: float = 0.3
    ) -> list[dict]:
        """Find trends relevant to your niche."""
        
        relevant = []
        
        for trend in self.cached_trends:
            trend_lower = trend['name'].lower()
            
            # Check keyword match
            relevance = 0.0
            matched_keywords = []
            
            for keyword in niche_keywords:
                if keyword.lower() in trend_lower:
                    relevance += 0.5
                    matched_keywords.append(keyword)
            
            if relevance >= min_relevance:
                relevant.append({
                    **trend,
                    'relevance': relevance,
                    'matched_keywords': matched_keywords
                })
        
        return sorted(relevant, key=lambda t: t['relevance'], reverse=True)
    
    def get_trending_content_ideas(
        self,
        niche_keywords: list[str]
    ) -> list[dict]:
        """Generate content ideas from trends."""
        
        relevant_trends = self.find_relevant_trends(niche_keywords)
        
        ideas = []
        for trend in relevant_trends[:5]:
            ideas.append({
                'trend': trend['name'],
                'suggestion': f"Create content about {trend['name']} from your perspective",
                'potential_reach': trend['tweet_count'],
                'urgency': 'high'  # Trends are time-sensitive
            })
        
        return ideas
```

---

## Gap Analyzer

```python
# gap_analyzer.py
from collections import Counter
from datetime import datetime, timedelta

from calendar_models import ContentPillar, ContentIdea

class GapAnalyzer:
    """Analyze content gaps and opportunities."""
    
    def __init__(self, framework: 'PillarFramework'):
        self.framework = framework
    
    def analyze_pillar_gaps(
        self,
        published_content: list[ContentIdea],
        days: int = 30
    ) -> dict[ContentPillar, float]:
        """Find pillars that are underrepresented."""
        
        # Count published by pillar
        pillar_counts = Counter()
        for content in published_content:
            if content.published:
                pillar_counts[content.pillar] += 1
        
        total = sum(pillar_counts.values()) or 1
        
        # Calculate gaps
        target_ratios = self.framework.get_ratios()
        gaps = {}
        
        for pillar, target in target_ratios.items():
            actual = pillar_counts.get(pillar, 0) / total
            gaps[pillar] = target - actual
        
        return gaps
    
    def analyze_keyword_gaps(
        self,
        published_content: list[ContentIdea],
        target_keywords: list[str]
    ) -> list[str]:
        """Find keywords not covered recently."""
        
        # Get all used keywords
        used_keywords = set()
        for content in published_content:
            if content.published:
                used_keywords.update(kw.lower() for kw in content.keywords)
        
        # Find gaps
        gaps = [
            kw for kw in target_keywords
            if kw.lower() not in used_keywords
        ]
        
        return gaps
    
    def analyze_format_gaps(
        self,
        published_content: list[ContentIdea]
    ) -> dict[str, float]:
        """Find content formats that are underused."""
        
        format_counts = Counter()
        for content in published_content:
            if content.published:
                format_counts[content.suggested_format] += 1
        
        total = sum(format_counts.values()) or 1
        
        # Target ratios
        target_formats = {
            'tweet': 0.5,
            'thread': 0.25,
            'poll': 0.15,
            'image': 0.10
        }
        
        gaps = {}
        for fmt, target in target_formats.items():
            actual = format_counts.get(fmt, 0) / total
            gaps[fmt] = target - actual
        
        return gaps
    
    def get_recommendations(
        self,
        published_content: list[ContentIdea],
        target_keywords: list[str]
    ) -> list[str]:
        """Get content recommendations based on gaps."""
        
        recommendations = []
        
        # Pillar gaps
        pillar_gaps = self.analyze_pillar_gaps(published_content)
        top_pillar_gap = max(pillar_gaps.items(), key=lambda x: x[1])
        
        if top_pillar_gap[1] > 0.1:
            pillar_def = self.framework.get_pillar(top_pillar_gap[0])
            recommendations.append(
                f"Create more {pillar_def.name} content (+{top_pillar_gap[1]*100:.0f}% needed)"
            )
        
        # Keyword gaps
        keyword_gaps = self.analyze_keyword_gaps(published_content, target_keywords)
        if keyword_gaps:
            recommendations.append(
                f"Cover these keywords: {', '.join(keyword_gaps[:5])}"
            )
        
        # Format gaps
        format_gaps = self.analyze_format_gaps(published_content)
        top_format_gap = max(format_gaps.items(), key=lambda x: x[1])
        
        if top_format_gap[1] > 0.1:
            recommendations.append(
                f"Create more {top_format_gap[0]} content"
            )
        
        return recommendations
```

---

## Calendar Builder

```python
# calendar_builder.py
from datetime import date, timedelta
from typing import Optional

from calendar_models import ContentCalendar, CalendarDay, ContentIdea, ContentPillar
from pillar_framework import PillarFramework
from topic_generator import AITopicGenerator
from trend_analyzer import TrendAnalyzer
from gap_analyzer import GapAnalyzer

class CalendarBuilder:
    """Build AI-powered content calendars."""
    
    def __init__(
        self,
        niche: str,
        api_key: str = None,
        posts_per_day: int = 3
    ):
        self.niche = niche
        self.posts_per_day = posts_per_day
        self.framework = PillarFramework()
        self.generator = AITopicGenerator(api_key=api_key)
        self.trend_analyzer = TrendAnalyzer()
        self.gap_analyzer = GapAnalyzer(self.framework)
    
    async def build_calendar(
        self,
        days: int = 30,
        start_date: date = None
    ) -> ContentCalendar:
        """Build a content calendar for N days."""
        
        if start_date is None:
            start_date = date.today()
        
        end_date = start_date + timedelta(days=days - 1)
        
        calendar = ContentCalendar(
            name=f"{self.niche} Calendar",
            start_date=start_date,
            end_date=end_date,
            pillar_ratios=self.framework.get_ratios(),
            posts_per_day=self.posts_per_day
        )
        
        # Generate ideas for each pillar
        all_ideas: dict[ContentPillar, list[ContentIdea]] = {}
        
        for pillar in ContentPillar:
            if pillar == ContentPillar.TRENDING:
                continue  # Handle separately
            
            ideas_needed = int(days * self.posts_per_day * 
                             self.framework.get_ratios().get(pillar, 0.1))
            
            ideas = await self.generator.generate_topics(
                pillar=pillar,
                niche=self.niche,
                count=max(5, ideas_needed)
            )
            
            all_ideas[pillar] = ideas
        
        # Build each day
        for day_offset in range(days):
            current_date = start_date + timedelta(days=day_offset)
            
            day = CalendarDay(
                date=current_date,
                posts=[],
                pillar_distribution={}
            )
            
            # Select posts for this day
            day_of_week = current_date.weekday()
            
            for slot in range(self.posts_per_day):
                # Determine pillar for this slot
                pillar = self._select_pillar_for_slot(
                    day_of_week, slot, day.pillar_distribution
                )
                
                # Get idea from pool
                if pillar in all_ideas and all_ideas[pillar]:
                    idea = all_ideas[pillar].pop(0)
                    idea.scheduled_date = current_date
                    day.posts.append(idea)
                    
                    # Track distribution
                    day.pillar_distribution[pillar] = \
                        day.pillar_distribution.get(pillar, 0) + 1
            
            calendar.days.append(day)
        
        return calendar
    
    def _select_pillar_for_slot(
        self,
        day_of_week: int,
        slot: int,
        current_distribution: dict[ContentPillar, int]
    ) -> ContentPillar:
        """Select pillar for a slot based on rules."""
        
        # First slot: engagement or trending
        if slot == 0:
            if day_of_week in [0, 4]:  # Mon, Fri
                return ContentPillar.ENGAGEMENT
            return ContentPillar.EDUCATIONAL
        
        # Last slot: personal or curated
        if slot == self.posts_per_day - 1:
            if day_of_week in [0, 6]:  # Mon, Sun
                return ContentPillar.PERSONAL
            return ContentPillar.CURATED
        
        # Middle slots: based on day and balance
        return self.framework.suggest_pillar_for_day(day_of_week)
    
    async def generate_drafts(
        self,
        calendar: ContentCalendar,
        style: str = "professional"
    ) -> ContentCalendar:
        """Generate draft content for all ideas."""
        
        for day in calendar.days:
            for idea in day.posts:
                if idea.draft_content is None:
                    idea.draft_content = await self.generator.generate_draft_content(
                        idea, style=style
                    )
        
        return calendar
    
    def export_calendar(
        self,
        calendar: ContentCalendar,
        format: str = "markdown"
    ) -> str:
        """Export calendar to readable format."""
        
        if format == "markdown":
            return self._export_markdown(calendar)
        elif format == "csv":
            return self._export_csv(calendar)
        else:
            raise ValueError(f"Unknown format: {format}")
    
    def _export_markdown(self, calendar: ContentCalendar) -> str:
        """Export as markdown."""
        
        days_of_week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        
        md = f"# {calendar.name}\n\n"
        md += f"**Period:** {calendar.start_date} to {calendar.end_date}\n"
        md += f"**Posts per day:** {calendar.posts_per_day}\n\n"
        
        for day in calendar.days:
            dow = days_of_week[day.date.weekday()]
            md += f"## {dow}, {day.date}\n\n"
            
            for i, post in enumerate(day.posts, 1):
                pillar_emoji = {
                    ContentPillar.EDUCATIONAL: "📚",
                    ContentPillar.PROMOTIONAL: "📢",
                    ContentPillar.ENGAGEMENT: "💬",
                    ContentPillar.PERSONAL: "👤",
                    ContentPillar.CURATED: "🔗",
                    ContentPillar.TRENDING: "🔥"
                }.get(post.pillar, "📝")
                
                md += f"### {i}. {pillar_emoji} {post.title}\n"
                md += f"**Pillar:** {post.pillar.value} | "
                md += f"**Format:** {post.suggested_format}\n\n"
                
                if post.draft_content:
                    md += f"> {post.draft_content}\n\n"
                else:
                    md += f"*{post.description}*\n\n"
                
                md += f"Keywords: {', '.join(post.keywords)}\n\n"
            
            md += "---\n\n"
        
        return md
```

---

## Usage Example

```python
# main.py
import asyncio
import os
from datetime import date

from calendar_builder import CalendarBuilder

async def main():
    # Initialize
    builder = CalendarBuilder(
        niche="Python programming and software development",
        api_key=os.getenv("OPENAI_API_KEY"),
        posts_per_day=3
    )
    
    # Build 30-day calendar
    print("Building content calendar...")
    calendar = await builder.build_calendar(days=30)
    
    print(f"Generated calendar with {len(calendar.days)} days")
    
    # Generate draft content
    print("Generating draft content...")
    calendar = await builder.generate_drafts(calendar, style="casual")
    
    # Export
    markdown = builder.export_calendar(calendar, format="markdown")
    
    with open("content_calendar.md", "w") as f:
        f.write(markdown)
    
    print("Calendar saved to content_calendar.md")
    
    # Print preview
    print("\n📅 First Week Preview:\n")
    for day in calendar.days[:7]:
        print(f"\n{day.date} ({day.date.strftime('%A')})")
        for post in day.posts:
            print(f"  • [{post.pillar.value}] {post.title}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Best Practices

!!! tip "Content Balance"
    - Follow 80/20 rule: 80% value, 20% promotional
    - Mix formats throughout the week
    - Save high-engagement content for peak days

!!! warning "AI Content"
    - Always review and personalize AI drafts
    - Add your unique voice and insights
    - Fact-check any generated claims

---

## Related Recipes

- [Scheduled Posts](scheduled-posts.md) - Automation
- [Optimal Timing](../growth/optimal-timing.md) - When to post
- [Hashtag Strategy](../growth/hashtag-strategy.md) - Reach optimization
