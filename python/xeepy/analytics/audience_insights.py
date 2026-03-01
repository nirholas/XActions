"""
Audience insights - analyze your follower base.

Understand your audience demographics, interests, and behaviors.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set
import re


@dataclass
class AudienceReport:
    """Audience analysis report"""
    total_followers: int
    sample_size: int
    locations: Dict[str, int] = field(default_factory=dict)
    common_bio_keywords: List[tuple] = field(default_factory=list)  # (keyword, count)
    avg_follower_count: float = 0
    avg_following_count: float = 0
    median_follower_count: float = 0
    verified_percentage: float = 0
    avg_account_age_days: float = 0
    likely_bots_percentage: float = 0
    active_percentage: float = 0  # Posted in last 30 days
    follower_distribution: Dict[str, int] = field(default_factory=dict)  # size buckets
    interests: Dict[str, int] = field(default_factory=dict)
    languages: Dict[str, int] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "total_followers": self.total_followers,
            "sample_size": self.sample_size,
            "locations": self.locations,
            "common_bio_keywords": self.common_bio_keywords[:20],
            "avg_follower_count": self.avg_follower_count,
            "avg_following_count": self.avg_following_count,
            "verified_percentage": self.verified_percentage,
            "avg_account_age_days": self.avg_account_age_days,
            "likely_bots_percentage": self.likely_bots_percentage,
            "active_percentage": self.active_percentage,
            "follower_distribution": self.follower_distribution,
        }
    
    def summary(self) -> str:
        """Generate human-readable summary"""
        lines = [
            f"Audience Report (sample: {self.sample_size:,} of {self.total_followers:,})",
            "",
            "📊 Follower Stats:",
            f"  Avg followers: {self.avg_follower_count:,.0f}",
            f"  Avg following: {self.avg_following_count:,.0f}",
            f"  Verified: {self.verified_percentage:.1f}%",
            f"  Active (30d): {self.active_percentage:.1f}%",
            f"  Likely bots: {self.likely_bots_percentage:.1f}%",
            f"  Avg account age: {self.avg_account_age_days:.0f} days",
        ]
        
        if self.locations:
            top_locations = sorted(self.locations.items(), key=lambda x: x[1], reverse=True)[:5]
            lines.append("\n🌍 Top Locations:")
            for loc, count in top_locations:
                pct = count / self.sample_size * 100
                lines.append(f"  {loc}: {pct:.1f}%")
        
        if self.common_bio_keywords:
            lines.append("\n🏷️ Common Bio Keywords:")
            for kw, count in self.common_bio_keywords[:10]:
                pct = count / self.sample_size * 100
                lines.append(f"  {kw}: {pct:.1f}%")
        
        return "\n".join(lines)


class AudienceInsights:
    """
    Analyze your follower base.
    
    Provides insights on:
    - Follower demographics (location, account age)
    - Common interests (bio analysis)
    - Follower quality (bots, activity levels)
    - Engagement potential
    
    Example:
        insights = AudienceInsights(scraper)
        
        report = await insights.analyze("myusername", sample_size=500)
        print(report.summary())
        
        # Get specific insights
        top_locations = report.locations
        common_interests = report.common_bio_keywords
    """
    
    # Keywords to identify interests from bios
    INTEREST_KEYWORDS = {
        "tech": ["developer", "engineer", "programmer", "coding", "software", "tech", "ai", "ml", "data"],
        "crypto": ["crypto", "bitcoin", "btc", "eth", "blockchain", "web3", "nft", "defi"],
        "finance": ["investor", "trading", "finance", "stocks", "forex", "entrepreneur", "business"],
        "creative": ["designer", "artist", "creator", "writer", "photographer", "filmmaker"],
        "gaming": ["gamer", "gaming", "esports", "streamer", "twitch"],
        "marketing": ["marketing", "growth", "seo", "social media", "content"],
        "startup": ["founder", "startup", "ceo", "building", "co-founder"],
    }
    
    # Words to exclude from keyword analysis
    STOP_WORDS = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "must", "shall", "can", "need",
        "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
        "us", "them", "my", "your", "his", "its", "our", "their", "this",
        "that", "these", "those", "what", "which", "who", "whom", "where",
        "when", "why", "how", "all", "each", "every", "both", "few", "more",
        "most", "other", "some", "such", "no", "not", "only", "same", "so",
        "than", "too", "very", "just", "also", "now", "here", "there",
        "https", "http", "www", "com", "co", "rt", "via", "dm", "dms",
    }
    
    def __init__(
        self,
        scraper: Optional[Any] = None,
    ):
        """
        Initialize audience insights.
        
        Args:
            scraper: X/Twitter scraper instance
        """
        self.scraper = scraper
    
    def _parse_follower(self, user: Any) -> Optional[dict]:
        """Parse user object into standardized format"""
        if isinstance(user, dict):
            created_at = user.get('created_at')
            if isinstance(created_at, str):
                try:
                    created_at = datetime.strptime(created_at, "%a %b %d %H:%M:%S +0000 %Y")
                except ValueError:
                    created_at = None
            
            return {
                "username": user.get('screen_name') or user.get('username', ''),
                "display_name": user.get('name') or user.get('display_name', ''),
                "bio": user.get('description') or user.get('bio', ''),
                "location": user.get('location', ''),
                "followers_count": user.get('followers_count', 0),
                "following_count": user.get('friends_count') or user.get('following_count', 0),
                "tweets_count": user.get('statuses_count') or user.get('tweets_count', 0),
                "verified": user.get('verified', False),
                "created_at": created_at,
                "default_profile": user.get('default_profile', False),
                "default_profile_image": user.get('default_profile_image', False),
            }
        else:
            created_at = getattr(user, 'created_at', None)
            if isinstance(created_at, str):
                try:
                    created_at = datetime.strptime(created_at, "%a %b %d %H:%M:%S +0000 %Y")
                except ValueError:
                    created_at = None
            
            return {
                "username": getattr(user, 'screen_name', '') or getattr(user, 'username', ''),
                "display_name": getattr(user, 'name', '') or getattr(user, 'display_name', ''),
                "bio": getattr(user, 'description', '') or getattr(user, 'bio', ''),
                "location": getattr(user, 'location', ''),
                "followers_count": getattr(user, 'followers_count', 0),
                "following_count": getattr(user, 'friends_count', 0) or getattr(user, 'following_count', 0),
                "tweets_count": getattr(user, 'statuses_count', 0) or getattr(user, 'tweets_count', 0),
                "verified": getattr(user, 'verified', False),
                "created_at": created_at,
                "default_profile": getattr(user, 'default_profile', False),
                "default_profile_image": getattr(user, 'default_profile_image', False),
            }
    
    def _is_likely_bot(self, user: dict) -> bool:
        """Heuristic to detect potential bot accounts"""
        score = 0
        
        # Default profile indicators
        if user.get('default_profile'):
            score += 1
        if user.get('default_profile_image'):
            score += 2
        
        # Suspicious follower/following ratio
        followers = user.get('followers_count', 0)
        following = user.get('following_count', 0)
        
        if following > 0 and followers / following < 0.01:
            score += 1
        if following > 5000 and followers < 100:
            score += 2
        
        # No bio
        if not user.get('bio', '').strip():
            score += 1
        
        # Very new account with lots of activity
        created_at = user.get('created_at')
        if created_at:
            age_days = (datetime.utcnow() - created_at).days
            tweets = user.get('tweets_count', 0)
            
            if age_days < 30 and tweets > 1000:
                score += 2
            if age_days < 7 and following > 500:
                score += 2
        
        return score >= 3
    
    def _extract_bio_keywords(self, bio: str) -> List[str]:
        """Extract meaningful keywords from bio"""
        if not bio:
            return []
        
        # Clean and tokenize
        bio_lower = bio.lower()
        # Remove URLs, mentions, special characters
        bio_clean = re.sub(r'https?://\S+', '', bio_lower)
        bio_clean = re.sub(r'@\w+', '', bio_clean)
        bio_clean = re.sub(r'[^\w\s]', ' ', bio_clean)
        
        words = bio_clean.split()
        
        # Filter
        keywords = [
            w for w in words
            if len(w) > 2 and w not in self.STOP_WORDS and not w.isdigit()
        ]
        
        return keywords
    
    def _identify_interests(self, bio: str) -> List[str]:
        """Identify interest categories from bio"""
        if not bio:
            return []
        
        bio_lower = bio.lower()
        interests = []
        
        for category, keywords in self.INTEREST_KEYWORDS.items():
            if any(kw in bio_lower for kw in keywords):
                interests.append(category)
        
        return interests
    
    def _normalize_location(self, location: str) -> Optional[str]:
        """Normalize location string"""
        if not location or len(location) < 2:
            return None
        
        location = location.strip()
        
        # Common location patterns
        location_lower = location.lower()
        
        # Country detection
        country_map = {
            "usa": "United States",
            "us": "United States", 
            "united states": "United States",
            "uk": "United Kingdom",
            "united kingdom": "United Kingdom",
            "india": "India",
            "canada": "Canada",
            "australia": "Australia",
            "germany": "Germany",
            "france": "France",
            "japan": "Japan",
            "brazil": "Brazil",
            "nigeria": "Nigeria",
        }
        
        for key, value in country_map.items():
            if key in location_lower:
                return value
        
        # Return first part (likely city or country)
        parts = location.split(',')
        return parts[-1].strip() if parts else location
    
    async def analyze(
        self,
        username: str,
        sample_size: int = 500,
    ) -> AudienceReport:
        """
        Analyze follower demographics and behavior.
        
        Args:
            username: Twitter/X username
            sample_size: Number of followers to analyze
            
        Returns:
            AudienceReport with detailed insights
        """
        username = username.lower().lstrip('@')
        
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        # Fetch followers
        followers = []
        
        if hasattr(self.scraper, 'get_followers'):
            try:
                count = 0
                async for follower in self.scraper.get_followers(username):
                    parsed = self._parse_follower(follower)
                    if parsed:
                        followers.append(parsed)
                        count += 1
                        if count >= sample_size:
                            break
            except Exception as e:
                print(f"Error fetching followers: {e}")
        
        if not followers:
            return AudienceReport(total_followers=0, sample_size=0)
        
        # Get total followers count
        total_followers = len(followers)
        if hasattr(self.scraper, 'get_user'):
            try:
                user = await self.scraper.get_user(username)
                if user:
                    if isinstance(user, dict):
                        total_followers = user.get('followers_count', len(followers))
                    else:
                        total_followers = getattr(user, 'followers_count', len(followers))
            except Exception:
                pass
        
        # Analyze locations
        locations = Counter()
        for f in followers:
            loc = self._normalize_location(f.get('location', ''))
            if loc:
                locations[loc] += 1
        
        # Analyze bio keywords
        all_keywords = []
        for f in followers:
            all_keywords.extend(self._extract_bio_keywords(f.get('bio', '')))
        
        keyword_counts = Counter(all_keywords).most_common(50)
        
        # Analyze interests
        interests = Counter()
        for f in followers:
            for interest in self._identify_interests(f.get('bio', '')):
                interests[interest] += 1
        
        # Calculate follower stats
        follower_counts = [f.get('followers_count', 0) for f in followers]
        following_counts = [f.get('following_count', 0) for f in followers]
        
        avg_follower_count = sum(follower_counts) / len(followers) if followers else 0
        avg_following_count = sum(following_counts) / len(followers) if followers else 0
        
        # Median
        sorted_counts = sorted(follower_counts)
        median_follower_count = sorted_counts[len(sorted_counts) // 2] if sorted_counts else 0
        
        # Verified percentage
        verified_count = sum(1 for f in followers if f.get('verified'))
        verified_percentage = verified_count / len(followers) * 100 if followers else 0
        
        # Account age
        ages = []
        now = datetime.utcnow()
        for f in followers:
            created_at = f.get('created_at')
            if created_at:
                ages.append((now - created_at).days)
        
        avg_account_age = sum(ages) / len(ages) if ages else 0
        
        # Bot detection
        bot_count = sum(1 for f in followers if self._is_likely_bot(f))
        bot_percentage = bot_count / len(followers) * 100 if followers else 0
        
        # Activity (proxy: account age vs tweet count)
        active_count = sum(
            1 for f in followers
            if f.get('tweets_count', 0) > 10  # Has posted something
        )
        active_percentage = active_count / len(followers) * 100 if followers else 0
        
        # Follower distribution buckets
        distribution = {
            "nano (0-1K)": 0,
            "micro (1K-10K)": 0,
            "mid (10K-100K)": 0,
            "macro (100K-1M)": 0,
            "mega (1M+)": 0,
        }
        
        for count in follower_counts:
            if count < 1000:
                distribution["nano (0-1K)"] += 1
            elif count < 10000:
                distribution["micro (1K-10K)"] += 1
            elif count < 100000:
                distribution["mid (10K-100K)"] += 1
            elif count < 1000000:
                distribution["macro (100K-1M)"] += 1
            else:
                distribution["mega (1M+)"] += 1
        
        return AudienceReport(
            total_followers=total_followers,
            sample_size=len(followers),
            locations=dict(locations.most_common(20)),
            common_bio_keywords=keyword_counts,
            avg_follower_count=avg_follower_count,
            avg_following_count=avg_following_count,
            median_follower_count=median_follower_count,
            verified_percentage=verified_percentage,
            avg_account_age_days=avg_account_age,
            likely_bots_percentage=bot_percentage,
            active_percentage=active_percentage,
            follower_distribution=distribution,
            interests=dict(interests.most_common(10)),
        )
    
    async def find_influencers(
        self,
        username: str,
        min_followers: int = 10000,
        sample_size: int = 1000,
    ) -> List[dict]:
        """
        Find influential followers.
        
        Args:
            username: Twitter/X username
            min_followers: Minimum follower count to be considered influential
            sample_size: Number of followers to scan
            
        Returns:
            List of influential followers
        """
        username = username.lower().lstrip('@')
        
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        influencers = []
        
        if hasattr(self.scraper, 'get_followers'):
            try:
                count = 0
                async for follower in self.scraper.get_followers(username):
                    parsed = self._parse_follower(follower)
                    if parsed and parsed.get('followers_count', 0) >= min_followers:
                        influencers.append(parsed)
                    
                    count += 1
                    if count >= sample_size:
                        break
            except Exception as e:
                print(f"Error fetching followers: {e}")
        
        # Sort by follower count
        influencers.sort(key=lambda x: x.get('followers_count', 0), reverse=True)
        
        return influencers
    
    async def find_mutual_followers(
        self,
        username1: str,
        username2: str,
        sample_size: int = 500,
    ) -> List[str]:
        """
        Find followers that follow both accounts.
        
        Args:
            username1: First username
            username2: Second username
            sample_size: Number of followers to compare
            
        Returns:
            List of mutual follower usernames
        """
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        followers1: Set[str] = set()
        followers2: Set[str] = set()
        
        if hasattr(self.scraper, 'get_followers'):
            # Get followers of first user
            try:
                count = 0
                async for follower in self.scraper.get_followers(username1):
                    parsed = self._parse_follower(follower)
                    if parsed:
                        followers1.add(parsed.get('username', '').lower())
                    count += 1
                    if count >= sample_size:
                        break
            except Exception as e:
                print(f"Error fetching followers for {username1}: {e}")
            
            # Get followers of second user
            try:
                count = 0
                async for follower in self.scraper.get_followers(username2):
                    parsed = self._parse_follower(follower)
                    if parsed:
                        followers2.add(parsed.get('username', '').lower())
                    count += 1
                    if count >= sample_size:
                        break
            except Exception as e:
                print(f"Error fetching followers for {username2}: {e}")
        
        mutual = followers1 & followers2
        return sorted(mutual)
