# ML-Powered Posting Time Optimizer

Build a machine learning system to discover your optimal posting times based on historical engagement data.

---

## Overview

This recipe creates a posting time optimization system with:

- **Historical data collection** - Gather your engagement data
- **Pattern analysis** - Identify engagement trends
- **Timezone detection** - Understand your audience
- **ML prediction** - Random forest model for timing
- **Schedule generation** - Personalized posting calendar
- **Continuous learning** - Improve over time

---

## System Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Data           │────▶│  Feature     │────▶│  ML Model       │
│  Collector      │     │  Engineer    │     │  (RandomForest) │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                     │
        ▼                       ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Timezone       │     │  Cross       │     │  Schedule       │
│  Analyzer       │     │  Validator   │     │  Generator      │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

---

## Data Collection

```python
# data_collector.py
import asyncio
from datetime import datetime, timedelta
from dataclasses import dataclass
import json

from xeepy import Xeepy

@dataclass
class TweetPerformance:
    tweet_id: str
    created_at: datetime
    hour: int
    day_of_week: int  # 0=Monday
    text_length: int
    has_media: bool
    has_link: bool
    hashtag_count: int
    
    # Engagement metrics
    likes: int
    retweets: int
    replies: int
    quotes: int
    impressions: int  # If available
    
    # Calculated
    engagement_score: float = 0.0
    
    def __post_init__(self):
        self.engagement_score = (
            self.likes + 
            self.retweets * 2 + 
            self.replies * 3 +
            self.quotes * 2
        )

class DataCollector:
    """Collect historical tweet performance data."""
    
    def __init__(self, username: str):
        self.username = username
        self.data: list[TweetPerformance] = []
    
    async def collect(
        self,
        tweet_count: int = 200,
        days_back: int = 90
    ) -> list[TweetPerformance]:
        """Collect tweet performance data."""
        
        async with Xeepy() as x:
            # Get tweets
            tweets = await x.scrape.tweets(
                self.username,
                limit=tweet_count
            )
            
            cutoff = datetime.now() - timedelta(days=days_back)
            
            for tweet in tweets:
                if tweet.created_at < cutoff:
                    continue
                
                # Skip retweets
                if tweet.is_retweet:
                    continue
                
                # Detect features
                has_media = bool(tweet.media)
                has_link = 'http' in tweet.text
                hashtag_count = tweet.text.count('#')
                
                perf = TweetPerformance(
                    tweet_id=tweet.id,
                    created_at=tweet.created_at,
                    hour=tweet.created_at.hour,
                    day_of_week=tweet.created_at.weekday(),
                    text_length=len(tweet.text),
                    has_media=has_media,
                    has_link=has_link,
                    hashtag_count=hashtag_count,
                    likes=tweet.like_count,
                    retweets=tweet.retweet_count,
                    replies=tweet.reply_count,
                    quotes=tweet.quote_count,
                    impressions=getattr(tweet, 'impressions', 0)
                )
                
                self.data.append(perf)
        
        return self.data
    
    def save(self, filepath: str):
        """Save collected data to JSON."""
        data = []
        for perf in self.data:
            data.append({
                'tweet_id': perf.tweet_id,
                'created_at': perf.created_at.isoformat(),
                'hour': perf.hour,
                'day_of_week': perf.day_of_week,
                'text_length': perf.text_length,
                'has_media': perf.has_media,
                'has_link': perf.has_link,
                'hashtag_count': perf.hashtag_count,
                'likes': perf.likes,
                'retweets': perf.retweets,
                'replies': perf.replies,
                'quotes': perf.quotes,
                'impressions': perf.impressions,
                'engagement_score': perf.engagement_score
            })
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load(self, filepath: str):
        """Load data from JSON."""
        with open(filepath) as f:
            data = json.load(f)
        
        self.data = []
        for d in data:
            self.data.append(TweetPerformance(
                tweet_id=d['tweet_id'],
                created_at=datetime.fromisoformat(d['created_at']),
                hour=d['hour'],
                day_of_week=d['day_of_week'],
                text_length=d['text_length'],
                has_media=d['has_media'],
                has_link=d['has_link'],
                hashtag_count=d['hashtag_count'],
                likes=d['likes'],
                retweets=d['retweets'],
                replies=d['replies'],
                quotes=d['quotes'],
                impressions=d['impressions']
            ))
```

---

## Audience Timezone Analyzer

```python
# timezone_analyzer.py
from collections import Counter
from datetime import datetime
import pytz

from xeepy import Xeepy

class TimezoneAnalyzer:
    """Analyze audience timezone distribution."""
    
    # Major timezone mappings
    TIMEZONE_HINTS = {
        'PST': 'America/Los_Angeles',
        'EST': 'America/New_York',
        'CST': 'America/Chicago',
        'GMT': 'Europe/London',
        'CET': 'Europe/Paris',
        'IST': 'Asia/Kolkata',
        'JST': 'Asia/Tokyo',
        'AEST': 'Australia/Sydney',
    }
    
    LOCATION_TIMEZONES = {
        'new york': 'America/New_York',
        'los angeles': 'America/Los_Angeles',
        'san francisco': 'America/Los_Angeles',
        'london': 'Europe/London',
        'paris': 'Europe/Paris',
        'berlin': 'Europe/Berlin',
        'tokyo': 'Asia/Tokyo',
        'india': 'Asia/Kolkata',
        'singapore': 'Asia/Singapore',
        'sydney': 'Australia/Sydney',
        'toronto': 'America/Toronto',
        'chicago': 'America/Chicago',
    }
    
    async def analyze_followers(
        self,
        username: str,
        sample_size: int = 200
    ) -> dict[str, float]:
        """Estimate timezone distribution from follower locations."""
        
        async with Xeepy() as x:
            followers = await x.scrape.followers(username, limit=sample_size)
            
            timezone_counts = Counter()
            
            for follower in followers:
                if follower.location:
                    tz = self._guess_timezone(follower.location.lower())
                    if tz:
                        timezone_counts[tz] += 1
            
            # Convert to percentages
            total = sum(timezone_counts.values())
            if total == 0:
                return {}
            
            return {
                tz: count / total
                for tz, count in timezone_counts.most_common(10)
            }
    
    def _guess_timezone(self, location: str) -> str:
        """Guess timezone from location string."""
        location = location.lower()
        
        for city, tz in self.LOCATION_TIMEZONES.items():
            if city in location:
                return tz
        
        return None
    
    def get_optimal_hours_by_timezone(
        self,
        timezone_distribution: dict[str, float],
        optimal_local_hours: list[int] = None
    ) -> list[tuple[int, float]]:
        """Get optimal posting hours considering audience timezones."""
        
        if optimal_local_hours is None:
            optimal_local_hours = [9, 12, 17, 20]  # Default optimal hours
        
        # Weight each UTC hour by timezone distribution
        hour_weights = Counter()
        
        for tz_name, weight in timezone_distribution.items():
            try:
                tz = pytz.timezone(tz_name)
                
                for local_hour in optimal_local_hours:
                    # Convert local hour to UTC
                    now = datetime.now(tz)
                    local_time = now.replace(hour=local_hour, minute=0)
                    utc_time = local_time.astimezone(pytz.UTC)
                    utc_hour = utc_time.hour
                    
                    hour_weights[utc_hour] += weight
            except Exception:
                continue
        
        # Sort by weight
        return sorted(hour_weights.items(), key=lambda x: x[1], reverse=True)
```

---

## Feature Engineering

```python
# feature_engineer.py
import numpy as np
from typing import Tuple

class FeatureEngineer:
    """Engineer features for ML model."""
    
    def prepare_features(
        self,
        data: list['TweetPerformance']
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare feature matrix and target vector."""
        
        features = []
        targets = []
        
        for perf in data:
            # Time features
            hour = perf.hour
            day = perf.day_of_week
            
            # Cyclical encoding for hour
            hour_sin = np.sin(2 * np.pi * hour / 24)
            hour_cos = np.cos(2 * np.pi * hour / 24)
            
            # Cyclical encoding for day
            day_sin = np.sin(2 * np.pi * day / 7)
            day_cos = np.cos(2 * np.pi * day / 7)
            
            # Is weekend
            is_weekend = 1 if day >= 5 else 0
            
            # Is business hours (9-17)
            is_business = 1 if 9 <= hour <= 17 else 0
            
            # Is evening (18-22)
            is_evening = 1 if 18 <= hour <= 22 else 0
            
            # Content features
            text_length_norm = min(perf.text_length / 280, 1.0)
            has_media = 1 if perf.has_media else 0
            has_link = 1 if perf.has_link else 0
            hashtag_count_norm = min(perf.hashtag_count / 5, 1.0)
            
            feature_vector = [
                hour_sin, hour_cos,
                day_sin, day_cos,
                is_weekend,
                is_business,
                is_evening,
                text_length_norm,
                has_media,
                has_link,
                hashtag_count_norm
            ]
            
            features.append(feature_vector)
            targets.append(perf.engagement_score)
        
        return np.array(features), np.array(targets)
    
    def prepare_prediction_features(
        self,
        hour: int,
        day_of_week: int,
        has_media: bool = False,
        has_link: bool = False,
        hashtag_count: int = 2,
        text_length: int = 200
    ) -> np.ndarray:
        """Prepare features for prediction."""
        
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        day_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_cos = np.cos(2 * np.pi * day_of_week / 7)
        is_weekend = 1 if day_of_week >= 5 else 0
        is_business = 1 if 9 <= hour <= 17 else 0
        is_evening = 1 if 18 <= hour <= 22 else 0
        text_length_norm = min(text_length / 280, 1.0)
        has_media_val = 1 if has_media else 0
        has_link_val = 1 if has_link else 0
        hashtag_count_norm = min(hashtag_count / 5, 1.0)
        
        return np.array([[
            hour_sin, hour_cos,
            day_sin, day_cos,
            is_weekend,
            is_business,
            is_evening,
            text_length_norm,
            has_media_val,
            has_link_val,
            hashtag_count_norm
        ]])
```

---

## ML Model

```python
# timing_model.py
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
import pickle

class TimingModel:
    """Random Forest model for timing prediction."""
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(
        self,
        X: np.ndarray,
        y: np.ndarray
    ) -> dict:
        """Train the model."""
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Cross-validation
        tscv = TimeSeriesSplit(n_splits=5)
        cv_scores = cross_val_score(
            self.model, X_scaled, y,
            cv=tscv,
            scoring='neg_mean_squared_error'
        )
        
        # Train final model
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        # Feature importance
        feature_names = [
            'hour_sin', 'hour_cos',
            'day_sin', 'day_cos',
            'is_weekend', 'is_business', 'is_evening',
            'text_length', 'has_media', 'has_link', 'hashtag_count'
        ]
        
        importance = dict(zip(
            feature_names,
            self.model.feature_importances_
        ))
        
        return {
            'cv_rmse': np.sqrt(-cv_scores.mean()),
            'cv_std': np.sqrt(-cv_scores).std(),
            'feature_importance': importance
        }
    
    def predict(self, X: np.ndarray) -> float:
        """Predict engagement score."""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)[0]
    
    def save(self, filepath: str):
        """Save model to file."""
        with open(filepath, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'is_trained': self.is_trained
            }, f)
    
    def load(self, filepath: str):
        """Load model from file."""
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        
        self.model = data['model']
        self.scaler = data['scaler']
        self.is_trained = data['is_trained']
```

---

## Schedule Generator

```python
# schedule_generator.py
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class ScheduleSlot:
    day_of_week: int  # 0=Monday
    hour: int
    predicted_engagement: float
    rank: int

class ScheduleGenerator:
    """Generate optimized posting schedule."""
    
    def __init__(
        self,
        model: 'TimingModel',
        feature_engineer: 'FeatureEngineer'
    ):
        self.model = model
        self.engineer = feature_engineer
    
    def generate_heatmap(
        self,
        has_media: bool = False
    ) -> list[list[float]]:
        """Generate engagement heatmap (7 days x 24 hours)."""
        
        heatmap = []
        
        for day in range(7):
            day_scores = []
            for hour in range(24):
                features = self.engineer.prepare_prediction_features(
                    hour=hour,
                    day_of_week=day,
                    has_media=has_media
                )
                score = self.model.predict(features)
                day_scores.append(score)
            heatmap.append(day_scores)
        
        return heatmap
    
    def get_top_slots(
        self,
        posts_per_day: int = 3,
        has_media: bool = False
    ) -> list[ScheduleSlot]:
        """Get top posting slots for each day."""
        
        all_slots = []
        
        for day in range(7):
            day_slots = []
            
            for hour in range(24):
                features = self.engineer.prepare_prediction_features(
                    hour=hour,
                    day_of_week=day,
                    has_media=has_media
                )
                score = self.model.predict(features)
                day_slots.append((hour, score))
            
            # Sort by score and get top slots
            day_slots.sort(key=lambda x: x[1], reverse=True)
            
            for rank, (hour, score) in enumerate(day_slots[:posts_per_day], 1):
                all_slots.append(ScheduleSlot(
                    day_of_week=day,
                    hour=hour,
                    predicted_engagement=score,
                    rank=rank
                ))
        
        return all_slots
    
    def generate_week_schedule(
        self,
        start_date: datetime,
        posts_per_day: int = 2
    ) -> list[datetime]:
        """Generate specific posting times for the week."""
        
        slots = self.get_top_slots(posts_per_day=posts_per_day)
        
        schedule = []
        current_date = start_date
        
        # Find next Monday
        days_until_monday = (7 - current_date.weekday()) % 7
        week_start = current_date + timedelta(days=days_until_monday)
        
        for slot in slots:
            post_date = week_start + timedelta(days=slot.day_of_week)
            post_time = post_date.replace(
                hour=slot.hour,
                minute=0,
                second=0
            )
            schedule.append(post_time)
        
        return sorted(schedule)
    
    def print_schedule(self, slots: list[ScheduleSlot]):
        """Print formatted schedule."""
        
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                'Friday', 'Saturday', 'Sunday']
        
        print("\n📅 Optimal Posting Schedule\n")
        print("=" * 50)
        
        for day in range(7):
            day_slots = [s for s in slots if s.day_of_week == day]
            day_slots.sort(key=lambda s: s.rank)
            
            print(f"\n{days[day]}:")
            for slot in day_slots:
                time_str = f"{slot.hour:02d}:00"
                bar = "█" * int(slot.predicted_engagement / 10)
                print(f"  {time_str} | {bar} ({slot.predicted_engagement:.1f})")
```

---

## Continuous Learning System

```python
# continuous_learner.py
from datetime import datetime, timedelta
import asyncio

class ContinuousLearner:
    """Continuously improve model with new data."""
    
    def __init__(
        self,
        collector: 'DataCollector',
        model: 'TimingModel',
        engineer: 'FeatureEngineer',
        retrain_interval_days: int = 7
    ):
        self.collector = collector
        self.model = model
        self.engineer = engineer
        self.retrain_interval = timedelta(days=retrain_interval_days)
        self.last_trained = None
    
    async def update_model(self) -> dict:
        """Collect new data and retrain model."""
        
        # Collect recent data
        new_data = await self.collector.collect(
            tweet_count=50,
            days_back=14
        )
        
        if len(new_data) < 20:
            return {'status': 'insufficient_data', 'samples': len(new_data)}
        
        # Combine with existing data
        all_data = self.collector.data
        
        # Prepare features
        X, y = self.engineer.prepare_features(all_data)
        
        # Retrain
        metrics = self.model.train(X, y)
        
        self.last_trained = datetime.now()
        
        return {
            'status': 'success',
            'samples': len(all_data),
            'metrics': metrics
        }
    
    async def run_continuous(self):
        """Run continuous learning loop."""
        
        while True:
            if self.last_trained is None or \
               datetime.now() - self.last_trained > self.retrain_interval:
                
                print("Updating model with new data...")
                result = await self.update_model()
                print(f"Update result: {result['status']}")
                
                if 'metrics' in result:
                    print(f"  RMSE: {result['metrics']['cv_rmse']:.2f}")
            
            # Wait before next check
            await asyncio.sleep(3600)  # Check every hour
```

---

## Complete Usage Example

```python
# main.py
import asyncio
from data_collector import DataCollector
from feature_engineer import FeatureEngineer
from timing_model import TimingModel
from schedule_generator import ScheduleGenerator
from timezone_analyzer import TimezoneAnalyzer
from datetime import datetime

async def main():
    username = "your_username"
    
    # 1. Collect historical data
    print("Collecting data...")
    collector = DataCollector(username)
    data = await collector.collect(tweet_count=200)
    print(f"Collected {len(data)} tweets")
    
    # Save for future use
    collector.save("tweet_data.json")
    
    # 2. Analyze audience timezones
    print("\nAnalyzing audience timezones...")
    tz_analyzer = TimezoneAnalyzer()
    tz_dist = await tz_analyzer.analyze_followers(username, sample_size=200)
    
    print("Timezone distribution:")
    for tz, pct in list(tz_dist.items())[:5]:
        print(f"  {tz}: {pct*100:.1f}%")
    
    # 3. Prepare features and train model
    print("\nTraining model...")
    engineer = FeatureEngineer()
    X, y = engineer.prepare_features(data)
    
    model = TimingModel()
    metrics = model.train(X, y)
    
    print(f"Model RMSE: {metrics['cv_rmse']:.2f}")
    print("\nFeature importance:")
    for feat, imp in sorted(
        metrics['feature_importance'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]:
        print(f"  {feat}: {imp:.3f}")
    
    # Save model
    model.save("timing_model.pkl")
    
    # 4. Generate schedule
    print("\nGenerating optimal schedule...")
    generator = ScheduleGenerator(model, engineer)
    
    slots = generator.get_top_slots(posts_per_day=3)
    generator.print_schedule(slots)
    
    # 5. Get specific times for next week
    schedule = generator.generate_week_schedule(
        start_date=datetime.now(),
        posts_per_day=2
    )
    
    print("\n📆 Next Week's Posting Times:")
    for dt in schedule[:10]:
        print(f"  {dt.strftime('%A %H:%M')}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Best Practices

!!! tip "Data Quality"
    - Need at least 50 tweets for meaningful results
    - More data = better predictions
    - Exclude outliers (viral tweets)

!!! warning "Limitations"
    - Model reflects YOUR past audience
    - Audience behavior changes over time
    - Retrain regularly (weekly)

---

## Related Recipes

- [Content Calendar](../automation/content-calendar.md) - Plan content
- [Hashtag Strategy](hashtag-strategy.md) - Optimize hashtags
- [Scheduled Posts](../automation/scheduled-posts.md) - Automate posting
