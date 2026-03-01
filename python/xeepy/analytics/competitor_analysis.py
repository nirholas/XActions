"""
Competitor analysis - analyze competitor accounts.

Compare performance, content strategy, and audience overlap.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class AccountMetrics:
    """Metrics for a single account"""
    username: str
    followers_count: int
    following_count: int
    tweets_count: int
    avg_likes: float
    avg_retweets: float
    avg_replies: float
    engagement_rate: float
    tweets_per_day: float
    top_tweet: Optional[dict] = None
    
    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "followers_count": self.followers_count,
            "following_count": self.following_count,
            "tweets_count": self.tweets_count,
            "avg_likes": self.avg_likes,
            "avg_retweets": self.avg_retweets,
            "avg_replies": self.avg_replies,
            "engagement_rate": self.engagement_rate,
            "tweets_per_day": self.tweets_per_day,
        }


@dataclass
class CompetitorReport:
    """Competitor analysis report"""
    your_account: AccountMetrics
    competitors: List[AccountMetrics]
    rankings: Dict[str, List[str]]  # metric -> [usernames in order]
    your_strengths: List[str]
    your_weaknesses: List[str]
    opportunities: List[str]
    content_comparison: Dict[str, dict]
    posting_frequency_comparison: Dict[str, float]
    
    def to_dict(self) -> dict:
        return {
            "your_account": self.your_account.to_dict(),
            "competitors": [c.to_dict() for c in self.competitors],
            "rankings": self.rankings,
            "your_strengths": self.your_strengths,
            "your_weaknesses": self.your_weaknesses,
            "opportunities": self.opportunities,
        }
    
    def summary(self) -> str:
        """Generate human-readable summary"""
        lines = [
            f"Competitor Analysis: @{self.your_account.username}",
            "=" * 50,
            "",
            f"Your Stats:",
            f"  Followers: {self.your_account.followers_count:,}",
            f"  Engagement Rate: {self.your_account.engagement_rate:.2f}%",
            f"  Avg Likes: {self.your_account.avg_likes:.0f}",
            "",
            "Competitors:",
        ]
        
        for c in self.competitors:
            lines.append(f"  @{c.username}: {c.followers_count:,} followers, {c.engagement_rate:.2f}% ER")
        
        lines.extend([
            "",
            "💪 Your Strengths:",
        ])
        for s in self.your_strengths[:3]:
            lines.append(f"  • {s}")
        
        lines.extend([
            "",
            "📈 Opportunities:",
        ])
        for o in self.opportunities[:3]:
            lines.append(f"  • {o}")
        
        return "\n".join(lines)


class CompetitorAnalyzer:
    """
    Analyze competitor accounts.
    
    Compare your account against competitors on:
    - Follower count and growth
    - Engagement metrics
    - Content strategy
    - Posting frequency
    
    Example:
        analyzer = CompetitorAnalyzer(scraper)
        
        report = await analyzer.analyze(
            your_username="myaccount",
            competitor_usernames=["competitor1", "competitor2"],
        )
        print(report.summary())
    """
    
    def __init__(
        self,
        scraper: Optional[Any] = None,
    ):
        """
        Initialize competitor analyzer.
        
        Args:
            scraper: X/Twitter scraper instance
        """
        self.scraper = scraper
    
    async def _get_account_metrics(
        self,
        username: str,
        tweet_limit: int = 50,
    ) -> Optional[AccountMetrics]:
        """Fetch and calculate metrics for an account"""
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        # Get user info
        user_data = None
        if hasattr(self.scraper, 'get_user'):
            try:
                user = await self.scraper.get_user(username)
                if user:
                    if isinstance(user, dict):
                        user_data = {
                            "followers_count": user.get('followers_count', 0),
                            "following_count": user.get('friends_count') or user.get('following_count', 0),
                            "tweets_count": user.get('statuses_count') or user.get('tweets_count', 0),
                        }
                    else:
                        user_data = {
                            "followers_count": getattr(user, 'followers_count', 0),
                            "following_count": getattr(user, 'friends_count', 0) or getattr(user, 'following_count', 0),
                            "tweets_count": getattr(user, 'statuses_count', 0) or getattr(user, 'tweets_count', 0),
                        }
            except Exception as e:
                print(f"Error fetching user {username}: {e}")
                return None
        
        if not user_data:
            return None
        
        # Get recent tweets for engagement analysis
        tweets = []
        if hasattr(self.scraper, 'get_tweets'):
            try:
                count = 0
                async for tweet in self.scraper.get_tweets(username):
                    if isinstance(tweet, dict):
                        tweets.append({
                            "id": tweet.get('id'),
                            "text": tweet.get('text', '')[:100],
                            "likes": tweet.get('favorite_count') or tweet.get('likes', 0),
                            "retweets": tweet.get('retweet_count') or tweet.get('retweets', 0),
                            "replies": tweet.get('reply_count') or tweet.get('replies', 0),
                            "views": tweet.get('view_count') or tweet.get('views', 0),
                            "created_at": tweet.get('created_at'),
                        })
                    else:
                        tweets.append({
                            "id": getattr(tweet, 'id', None),
                            "text": getattr(tweet, 'text', '')[:100],
                            "likes": getattr(tweet, 'likes', 0) or getattr(tweet, 'favorite_count', 0),
                            "retweets": getattr(tweet, 'retweets', 0) or getattr(tweet, 'retweet_count', 0),
                            "replies": getattr(tweet, 'replies', 0) or getattr(tweet, 'reply_count', 0),
                            "views": getattr(tweet, 'views', 0) or getattr(tweet, 'view_count', 0),
                            "created_at": getattr(tweet, 'created_at', None),
                        })
                    
                    count += 1
                    if count >= tweet_limit:
                        break
            except Exception as e:
                print(f"Error fetching tweets for {username}: {e}")
        
        # Calculate engagement metrics
        if tweets:
            avg_likes = sum(t["likes"] for t in tweets) / len(tweets)
            avg_retweets = sum(t["retweets"] for t in tweets) / len(tweets)
            avg_replies = sum(t["replies"] for t in tweets) / len(tweets)
            total_engagement = sum(t["likes"] + t["retweets"] + t["replies"] for t in tweets)
            total_views = sum(t["views"] for t in tweets)
            
            engagement_rate = 0
            if total_views > 0:
                engagement_rate = (total_engagement / total_views) * 100
            elif user_data["followers_count"] > 0:
                engagement_rate = (total_engagement / len(tweets) / user_data["followers_count"]) * 100
            
            # Find top tweet
            top_tweet = max(tweets, key=lambda t: t["likes"] + t["retweets"] + t["replies"])
            
            # Calculate tweets per day (estimate)
            tweets_per_day = user_data["tweets_count"] / 365  # rough estimate
        else:
            avg_likes = 0
            avg_retweets = 0
            avg_replies = 0
            engagement_rate = 0
            top_tweet = None
            tweets_per_day = 0
        
        return AccountMetrics(
            username=username.lower(),
            followers_count=user_data["followers_count"],
            following_count=user_data["following_count"],
            tweets_count=user_data["tweets_count"],
            avg_likes=avg_likes,
            avg_retweets=avg_retweets,
            avg_replies=avg_replies,
            engagement_rate=engagement_rate,
            tweets_per_day=tweets_per_day,
            top_tweet=top_tweet,
        )
    
    def _analyze_rankings(
        self,
        your_account: AccountMetrics,
        competitors: List[AccountMetrics],
    ) -> Dict[str, List[str]]:
        """Rank accounts by various metrics"""
        all_accounts = [your_account] + competitors
        
        rankings = {}
        
        metrics = [
            ("followers_count", True),  # (metric name, higher is better)
            ("engagement_rate", True),
            ("avg_likes", True),
            ("avg_retweets", True),
            ("tweets_per_day", True),
        ]
        
        for metric, higher_better in metrics:
            sorted_accounts = sorted(
                all_accounts,
                key=lambda a: getattr(a, metric, 0),
                reverse=higher_better,
            )
            rankings[metric] = [a.username for a in sorted_accounts]
        
        return rankings
    
    def _identify_strengths_weaknesses(
        self,
        your_account: AccountMetrics,
        competitors: List[AccountMetrics],
        rankings: Dict[str, List[str]],
    ) -> tuple[List[str], List[str], List[str]]:
        """Identify strengths, weaknesses, and opportunities"""
        strengths = []
        weaknesses = []
        opportunities = []
        
        num_accounts = len(competitors) + 1
        
        for metric, usernames in rankings.items():
            your_rank = usernames.index(your_account.username) + 1
            
            metric_name = metric.replace("_", " ").title()
            
            if your_rank == 1:
                strengths.append(f"#1 in {metric_name}")
            elif your_rank <= num_accounts / 2:
                strengths.append(f"Above average {metric_name} (#{your_rank})")
            elif your_rank == num_accounts:
                weaknesses.append(f"Lowest {metric_name} among competitors")
                opportunities.append(f"Improve {metric_name} to match competitors")
            else:
                weaknesses.append(f"Below average {metric_name} (#{your_rank})")
        
        # Additional analysis
        avg_competitor_followers = sum(c.followers_count for c in competitors) / len(competitors) if competitors else 0
        
        if your_account.followers_count < avg_competitor_followers * 0.5:
            opportunities.append("Focus on growth - significantly behind competitor follower counts")
        
        avg_competitor_er = sum(c.engagement_rate for c in competitors) / len(competitors) if competitors else 0
        
        if your_account.engagement_rate > avg_competitor_er * 1.5:
            strengths.append("Exceptional engagement rate compared to competitors")
        elif your_account.engagement_rate < avg_competitor_er * 0.5:
            opportunities.append("Study competitor content to improve engagement")
        
        return strengths, weaknesses, opportunities
    
    async def analyze(
        self,
        your_username: str,
        competitor_usernames: List[str],
        tweet_limit: int = 50,
    ) -> CompetitorReport:
        """
        Analyze your account against competitors.
        
        Args:
            your_username: Your Twitter/X username
            competitor_usernames: List of competitor usernames
            tweet_limit: Tweets to analyze per account
            
        Returns:
            CompetitorReport with analysis
        """
        your_username = your_username.lower().lstrip('@')
        competitor_usernames = [u.lower().lstrip('@') for u in competitor_usernames]
        
        # Get metrics for your account
        your_metrics = await self._get_account_metrics(your_username, tweet_limit)
        if your_metrics is None:
            raise ValueError(f"Could not fetch data for {your_username}")
        
        # Get metrics for competitors
        competitor_metrics = []
        for username in competitor_usernames:
            metrics = await self._get_account_metrics(username, tweet_limit)
            if metrics:
                competitor_metrics.append(metrics)
        
        if not competitor_metrics:
            raise ValueError("Could not fetch data for any competitors")
        
        # Calculate rankings
        rankings = self._analyze_rankings(your_metrics, competitor_metrics)
        
        # Identify strengths/weaknesses
        strengths, weaknesses, opportunities = self._identify_strengths_weaknesses(
            your_metrics, competitor_metrics, rankings
        )
        
        # Content comparison
        content_comparison = {
            "your_top_tweet": your_metrics.top_tweet,
            "competitor_top_tweets": {
                c.username: c.top_tweet
                for c in competitor_metrics
            },
        }
        
        # Posting frequency comparison
        posting_frequency = {
            your_username: your_metrics.tweets_per_day,
            **{c.username: c.tweets_per_day for c in competitor_metrics},
        }
        
        return CompetitorReport(
            your_account=your_metrics,
            competitors=competitor_metrics,
            rankings=rankings,
            your_strengths=strengths,
            your_weaknesses=weaknesses,
            opportunities=opportunities,
            content_comparison=content_comparison,
            posting_frequency_comparison=posting_frequency,
        )
    
    async def quick_compare(
        self,
        usernames: List[str],
    ) -> List[dict]:
        """
        Quick comparison of multiple accounts.
        
        Args:
            usernames: List of usernames to compare
            
        Returns:
            List of account metrics dictionaries
        """
        results = []
        
        for username in usernames:
            metrics = await self._get_account_metrics(username.lower().lstrip('@'))
            if metrics:
                results.append(metrics.to_dict())
        
        # Sort by followers
        results.sort(key=lambda x: x["followers_count"], reverse=True)
        
        return results
    
    async def find_content_gaps(
        self,
        your_username: str,
        competitor_username: str,
        tweet_limit: int = 100,
    ) -> dict:
        """
        Find content topics competitors cover that you don't.
        
        This is a simplified analysis based on common words in tweets.
        
        Args:
            your_username: Your username
            competitor_username: Competitor username
            tweet_limit: Tweets to analyze
            
        Returns:
            Content gap analysis
        """
        import re
        from collections import Counter
        
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "is", "are", "was", "were", "be", "been", "has",
            "have", "had", "do", "does", "did", "will", "would", "could", "should",
            "i", "you", "he", "she", "it", "we", "they", "this", "that", "these",
            "my", "your", "his", "her", "our", "their", "what", "which", "who",
            "https", "http", "rt", "via", "just", "like", "get", "got", "new",
        }
        
        async def get_tweet_words(username: str) -> Counter:
            words = Counter()
            
            if hasattr(self.scraper, 'get_tweets'):
                try:
                    count = 0
                    async for tweet in self.scraper.get_tweets(username):
                        text = ""
                        if isinstance(tweet, dict):
                            text = tweet.get('text', '')
                        else:
                            text = getattr(tweet, 'text', '')
                        
                        # Clean and tokenize
                        text = re.sub(r'https?://\S+', '', text.lower())
                        text = re.sub(r'@\w+', '', text)
                        text = re.sub(r'[^\w\s]', ' ', text)
                        
                        for word in text.split():
                            if len(word) > 3 and word not in stop_words:
                                words[word] += 1
                        
                        count += 1
                        if count >= tweet_limit:
                            break
                except Exception as e:
                    print(f"Error: {e}")
            
            return words
        
        your_words = await get_tweet_words(your_username.lower().lstrip('@'))
        competitor_words = await get_tweet_words(competitor_username.lower().lstrip('@'))
        
        # Find words competitor uses that you don't (or rarely)
        gaps = []
        for word, count in competitor_words.most_common(100):
            your_count = your_words.get(word, 0)
            if your_count < count * 0.2:  # They use it 5x more than you
                gaps.append({
                    "word": word,
                    "competitor_count": count,
                    "your_count": your_count,
                })
        
        return {
            "content_gaps": gaps[:20],
            "your_top_topics": [w for w, _ in your_words.most_common(20)],
            "competitor_top_topics": [w for w, _ in competitor_words.most_common(20)],
        }
