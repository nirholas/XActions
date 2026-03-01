# 📊 Data Science Cookbook

Advanced data science recipes for X/Twitter analytics. Transform raw social data into actionable insights using pandas, visualization, and machine learning.

## Setup

```python
# Install data science dependencies
pip install "xeepy[data]"  # Includes pandas, numpy, matplotlib, seaborn, scikit-learn
```

## Comprehensive Twitter Dataset Builder

Build a complete dataset of any account for analysis.

```python
"""
Twitter Dataset Builder
=======================
Create comprehensive datasets for data science analysis.
"""
import asyncio
import pandas as pd
from datetime import datetime
from xeepy import Xeepy


class TwitterDatasetBuilder:
    """Build comprehensive Twitter datasets for analysis"""
    
    def __init__(self, username: str):
        self.username = username
        self.data = {}
    
    async def build(self, include_network: bool = True) -> dict:
        """Build complete dataset"""
        async with Xeepy() as x:
            print(f"📊 Building dataset for @{self.username}...")
            
            # 1. Profile data
            print("  Fetching profile...")
            profile = await x.scrape.profile(self.username)
            self.data["profile"] = self._profile_to_dict(profile)
            
            # 2. Tweet history
            print("  Fetching tweets...")
            tweets = await x.scrape.tweets(self.username, limit=1000)
            self.data["tweets"] = pd.DataFrame([
                self._tweet_to_dict(t) for t in tweets
            ])
            
            # 3. Network data (optional, can be slow)
            if include_network:
                print("  Fetching followers (sample)...")
                followers = await x.scrape.followers(self.username, limit=500)
                self.data["followers"] = pd.DataFrame([
                    self._user_to_dict(u) for u in followers
                ])
                
                print("  Fetching following...")
                following = await x.scrape.following(self.username, limit=500)
                self.data["following"] = pd.DataFrame([
                    self._user_to_dict(u) for u in following
                ])
            
            # 4. Engagement patterns
            print("  Analyzing engagement...")
            self.data["engagement_by_hour"] = self._analyze_hourly_engagement()
            self.data["engagement_by_day"] = self._analyze_daily_engagement()
            
            print(f"✅ Dataset complete!")
            return self.data
    
    def _tweet_to_dict(self, tweet) -> dict:
        return {
            "id": tweet.id,
            "text": tweet.text,
            "created_at": tweet.created_at,
            "likes": tweet.likes,
            "retweets": tweet.retweets,
            "replies": tweet.replies,
            "is_retweet": tweet.is_retweet,
            "is_reply": tweet.is_reply,
            "is_thread": tweet.is_thread_start,
            "has_media": bool(tweet.media),
            "has_link": bool(tweet.urls),
            "hashtags": tweet.hashtags,
            "mentions": tweet.mentions,
            "char_count": len(tweet.text),
            "word_count": len(tweet.text.split()),
            "hour": tweet.created_at.hour,
            "day_of_week": tweet.created_at.strftime("%A"),
            "engagement": tweet.likes + tweet.retweets + tweet.replies,
        }
    
    def _user_to_dict(self, user) -> dict:
        return {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "bio": user.bio,
            "followers_count": user.followers_count,
            "following_count": user.following_count,
            "tweet_count": user.tweet_count,
            "verified": user.verified,
            "created_at": user.created_at,
            "has_bio": bool(user.bio),
            "has_website": bool(user.website),
            "follower_ratio": user.followers_count / max(user.following_count, 1),
        }
    
    def _profile_to_dict(self, profile) -> dict:
        return {
            "username": profile.username,
            "name": profile.name,
            "bio": profile.bio,
            "followers": profile.followers_count,
            "following": profile.following_count,
            "tweets": profile.tweet_count,
            "verified": profile.verified,
            "created_at": profile.created_at,
        }
    
    def _analyze_hourly_engagement(self) -> pd.DataFrame:
        """Engagement by hour of day"""
        df = self.data["tweets"]
        return df.groupby("hour").agg({
            "likes": "mean",
            "retweets": "mean",
            "engagement": "mean",
            "id": "count"
        }).rename(columns={"id": "tweet_count"})
    
    def _analyze_daily_engagement(self) -> pd.DataFrame:
        """Engagement by day of week"""
        df = self.data["tweets"]
        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        result = df.groupby("day_of_week").agg({
            "likes": "mean",
            "retweets": "mean",
            "engagement": "mean",
            "id": "count"
        }).rename(columns={"id": "tweet_count"})
        return result.reindex(day_order)
    
    def save(self, output_dir: str = "dataset"):
        """Save dataset to files"""
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        # Save DataFrames
        for name, data in self.data.items():
            if isinstance(data, pd.DataFrame):
                data.to_csv(f"{output_dir}/{name}.csv", index=True)
                data.to_parquet(f"{output_dir}/{name}.parquet")
            elif isinstance(data, dict):
                pd.DataFrame([data]).to_csv(f"{output_dir}/{name}.csv", index=False)
        
        print(f"💾 Dataset saved to {output_dir}/")


# Usage
async def main():
    builder = TwitterDatasetBuilder("elonmusk")
    data = await builder.build(include_network=True)
    builder.save("elon_dataset")
    
    # Quick analysis
    print(f"\nQuick Stats:")
    print(f"  Total tweets: {len(data['tweets'])}")
    print(f"  Avg engagement: {data['tweets']['engagement'].mean():.1f}")
    print(f"  Best hour: {data['engagement_by_hour']['engagement'].idxmax()}")

asyncio.run(main())
```

## Engagement Prediction Model

Predict how well a tweet will perform before posting.

```python
"""
Tweet Engagement Predictor
==========================
ML model to predict engagement before posting.
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
import pickle


class EngagementPredictor:
    """Predict tweet engagement using machine learning"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = None
    
    def train(self, tweets_df: pd.DataFrame):
        """Train the engagement prediction model"""
        print("🧠 Training engagement predictor...")
        
        # Feature engineering
        df = self._engineer_features(tweets_df)
        
        # Prepare features and target
        self.feature_columns = [
            "char_count", "word_count", "has_media", "has_link",
            "hashtag_count", "mention_count", "hour", "is_weekend",
            "is_thread", "question_mark", "exclamation"
        ]
        
        X = df[self.feature_columns]
        y = df["engagement"]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"  MAE: {mae:.2f}")
        print(f"  R²: {r2:.3f}")
        
        # Feature importance
        importance = pd.DataFrame({
            "feature": self.feature_columns,
            "importance": self.model.feature_importances_
        }).sort_values("importance", ascending=False)
        
        print("\n📊 Feature Importance:")
        for _, row in importance.head(5).iterrows():
            print(f"  {row['feature']}: {row['importance']:.3f}")
        
        return {"mae": mae, "r2": r2, "feature_importance": importance}
    
    def predict(self, tweet_text: str, hour: int = None, has_media: bool = False, 
                has_link: bool = False, is_thread: bool = False) -> dict:
        """Predict engagement for a new tweet"""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Extract features
        features = {
            "char_count": len(tweet_text),
            "word_count": len(tweet_text.split()),
            "has_media": int(has_media),
            "has_link": int(has_link),
            "hashtag_count": tweet_text.count("#"),
            "mention_count": tweet_text.count("@"),
            "hour": hour or 12,
            "is_weekend": 0,  # Assume weekday by default
            "is_thread": int(is_thread),
            "question_mark": int("?" in tweet_text),
            "exclamation": int("!" in tweet_text),
        }
        
        # Create feature vector
        X = pd.DataFrame([features])[self.feature_columns]
        X_scaled = self.scaler.transform(X)
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        
        # Get confidence interval (using tree predictions)
        tree_predictions = np.array([
            tree.predict(X_scaled)[0] 
            for tree in self.model.estimators_
        ])
        confidence_low = np.percentile(tree_predictions, 10)
        confidence_high = np.percentile(tree_predictions, 90)
        
        return {
            "predicted_engagement": round(prediction),
            "confidence_range": (round(confidence_low), round(confidence_high)),
            "features_used": features
        }
    
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for the model"""
        df = df.copy()
        
        df["hashtag_count"] = df["hashtags"].apply(len) if "hashtags" in df else 0
        df["mention_count"] = df["mentions"].apply(len) if "mentions" in df else 0
        df["is_weekend"] = df["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)
        df["question_mark"] = df["text"].str.contains(r"\?").astype(int)
        df["exclamation"] = df["text"].str.contains("!").astype(int)
        
        return df
    
    def save(self, filepath: str):
        """Save trained model"""
        with open(filepath, "wb") as f:
            pickle.dump({
                "model": self.model,
                "scaler": self.scaler,
                "feature_columns": self.feature_columns
            }, f)
        print(f"💾 Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load trained model"""
        with open(filepath, "rb") as f:
            data = pickle.load(f)
            self.model = data["model"]
            self.scaler = data["scaler"]
            self.feature_columns = data["feature_columns"]
        print(f"📂 Model loaded from {filepath}")


# Usage
async def main():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        # Get training data
        tweets = await x.scrape.tweets("your_username", limit=500)
        df = pd.DataFrame([tweet_to_dict(t) for t in tweets])
        
        # Train model
        predictor = EngagementPredictor()
        predictor.train(df)
        
        # Predict new tweet
        result = predictor.predict(
            tweet_text="Just launched my new product! 🚀 Check it out: example.com #launch",
            hour=14,
            has_media=True,
            has_link=True
        )
        
        print(f"\n🔮 Prediction:")
        print(f"  Expected engagement: {result['predicted_engagement']}")
        print(f"  Range: {result['confidence_range'][0]} - {result['confidence_range'][1]}")
        
        # Save model
        predictor.save("engagement_model.pkl")

asyncio.run(main())
```

## Audience Segmentation

Cluster your followers into meaningful segments.

```python
"""
Audience Segmentation
=====================
Cluster followers into actionable segments.
"""
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns


class AudienceSegmenter:
    """Segment followers using clustering"""
    
    def __init__(self, followers_df: pd.DataFrame):
        self.df = followers_df
        self.segments = None
        self.segment_profiles = None
    
    def segment(self, n_segments: int = 5) -> pd.DataFrame:
        """Perform audience segmentation"""
        print("🎯 Segmenting audience...")
        
        # Prepare features
        features = self._prepare_features()
        
        # Scale features
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        
        # Cluster
        kmeans = KMeans(n_clusters=n_segments, random_state=42, n_init=10)
        self.df["segment"] = kmeans.fit_predict(features_scaled)
        
        # Name segments based on characteristics
        self.segment_profiles = self._profile_segments()
        self.df["segment_name"] = self.df["segment"].map(
            {i: p["name"] for i, p in self.segment_profiles.items()}
        )
        
        return self.df
    
    def _prepare_features(self) -> pd.DataFrame:
        """Prepare features for clustering"""
        return self.df[[
            "followers_count",
            "following_count",
            "tweet_count",
            "follower_ratio"
        ]].fillna(0)
    
    def _profile_segments(self) -> dict:
        """Create profiles for each segment"""
        profiles = {}
        
        for seg in self.df["segment"].unique():
            seg_data = self.df[self.df["segment"] == seg]
            
            avg_followers = seg_data["followers_count"].mean()
            avg_tweets = seg_data["tweet_count"].mean()
            avg_ratio = seg_data["follower_ratio"].mean()
            
            # Name based on characteristics
            if avg_followers > 10000:
                name = "🌟 Influencers"
            elif avg_ratio > 2:
                name = "👑 Thought Leaders"
            elif avg_tweets > 5000:
                name = "🗣️ Power Users"
            elif avg_followers < 100:
                name = "🌱 Newcomers"
            else:
                name = "💼 Regular Users"
            
            profiles[seg] = {
                "name": name,
                "count": len(seg_data),
                "avg_followers": avg_followers,
                "avg_tweets": avg_tweets,
                "avg_ratio": avg_ratio,
                "sample_users": seg_data["username"].head(5).tolist()
            }
        
        return profiles
    
    def visualize(self, save_path: str = None):
        """Visualize segments"""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Segment sizes
        ax1 = axes[0, 0]
        segment_counts = self.df["segment_name"].value_counts()
        ax1.pie(segment_counts, labels=segment_counts.index, autopct='%1.1f%%')
        ax1.set_title("Segment Distribution")
        
        # Followers distribution by segment
        ax2 = axes[0, 1]
        sns.boxplot(data=self.df, x="segment_name", y="followers_count", ax=ax2)
        ax2.set_title("Followers by Segment")
        ax2.set_yscale("log")
        plt.xticks(rotation=45)
        
        # Engagement potential (followers vs tweets)
        ax3 = axes[1, 0]
        sns.scatterplot(
            data=self.df.sample(min(500, len(self.df))),
            x="followers_count", y="tweet_count",
            hue="segment_name", alpha=0.6, ax=ax3
        )
        ax3.set_xscale("log")
        ax3.set_yscale("log")
        ax3.set_title("Followers vs Tweets by Segment")
        
        # Segment profiles
        ax4 = axes[1, 1]
        profile_df = pd.DataFrame([
            {"segment": p["name"], "metric": "Avg Followers", "value": p["avg_followers"]}
            for p in self.segment_profiles.values()
        ] + [
            {"segment": p["name"], "metric": "Avg Tweets", "value": p["avg_tweets"]}
            for p in self.segment_profiles.values()
        ])
        sns.barplot(data=profile_df, x="segment", y="value", hue="metric", ax=ax4)
        ax4.set_title("Segment Profiles")
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150)
            print(f"📊 Visualization saved to {save_path}")
        else:
            plt.show()
    
    def get_segment_recommendations(self) -> dict:
        """Get actionable recommendations for each segment"""
        recommendations = {}
        
        for seg_id, profile in self.segment_profiles.items():
            name = profile["name"]
            
            if "Influencer" in name:
                recommendations[name] = {
                    "strategy": "Build relationships, seek collaborations",
                    "content": "High-quality, shareable threads",
                    "engagement": "Meaningful replies, DMs for partnerships"
                }
            elif "Thought Leader" in name:
                recommendations[name] = {
                    "strategy": "Provide value, establish expertise",
                    "content": "Educational content, insights",
                    "engagement": "Thoughtful discussions"
                }
            elif "Power User" in name:
                recommendations[name] = {
                    "strategy": "Engage actively, build community",
                    "content": "Interactive content, polls",
                    "engagement": "Regular interaction, replies"
                }
            elif "Newcomer" in name:
                recommendations[name] = {
                    "strategy": "Welcome, provide value",
                    "content": "Beginner-friendly content",
                    "engagement": "Supportive comments"
                }
            else:
                recommendations[name] = {
                    "strategy": "Consistent value delivery",
                    "content": "Mix of educational and entertaining",
                    "engagement": "Regular, genuine engagement"
                }
        
        return recommendations


# Usage
async def main():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        # Get followers
        followers = await x.scrape.followers("your_username", limit=1000)
        df = pd.DataFrame([user_to_dict(u) for u in followers])
        
        # Segment
        segmenter = AudienceSegmenter(df)
        segmented_df = segmenter.segment(n_segments=5)
        
        # Print profiles
        print("\n📊 Segment Profiles:")
        for seg_id, profile in segmenter.segment_profiles.items():
            print(f"\n{profile['name']} ({profile['count']} followers)")
            print(f"  Avg followers: {profile['avg_followers']:,.0f}")
            print(f"  Avg tweets: {profile['avg_tweets']:,.0f}")
            print(f"  Sample: {', '.join('@' + u for u in profile['sample_users'][:3])}")
        
        # Visualize
        segmenter.visualize("segments.png")
        
        # Get recommendations
        recs = segmenter.get_segment_recommendations()
        print("\n💡 Recommendations:")
        for segment, rec in recs.items():
            print(f"\n{segment}:")
            print(f"  Strategy: {rec['strategy']}")

asyncio.run(main())
```

## Time Series Forecasting

Forecast follower growth and engagement trends.

```python
"""
Time Series Forecasting
=======================
Predict future follower counts and engagement.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt


class GrowthForecaster:
    """Forecast follower growth using time series analysis"""
    
    def __init__(self, historical_data: pd.DataFrame):
        """
        historical_data should have columns: date, followers
        """
        self.data = historical_data.copy()
        self.data["date"] = pd.to_datetime(self.data["date"])
        self.data = self.data.sort_values("date").set_index("date")
    
    def forecast(self, days_ahead: int = 30) -> pd.DataFrame:
        """Forecast follower count"""
        print(f"🔮 Forecasting {days_ahead} days ahead...")
        
        # Simple moving average + trend
        self.data["ma7"] = self.data["followers"].rolling(7).mean()
        self.data["ma30"] = self.data["followers"].rolling(30).mean()
        
        # Calculate daily growth rate
        self.data["growth_rate"] = self.data["followers"].pct_change()
        avg_growth_rate = self.data["growth_rate"].mean()
        
        # Calculate trend
        recent_data = self.data.tail(30)
        X = np.arange(len(recent_data)).reshape(-1, 1)
        y = recent_data["followers"].values
        
        # Linear regression for trend
        from sklearn.linear_model import LinearRegression
        model = LinearRegression()
        model.fit(X, y)
        
        daily_trend = model.coef_[0]
        
        # Generate forecast
        last_date = self.data.index[-1]
        last_value = self.data["followers"].iloc[-1]
        
        forecast_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days_ahead
        )
        
        forecasts = []
        current_value = last_value
        
        for i, date in enumerate(forecast_dates):
            # Combine trend and seasonality
            predicted = current_value + daily_trend
            
            # Add some confidence bounds
            std = self.data["followers"].diff().std()
            lower = predicted - 1.96 * std * np.sqrt(i + 1)
            upper = predicted + 1.96 * std * np.sqrt(i + 1)
            
            forecasts.append({
                "date": date,
                "forecast": predicted,
                "lower_bound": lower,
                "upper_bound": upper
            })
            
            current_value = predicted
        
        forecast_df = pd.DataFrame(forecasts).set_index("date")
        
        # Calculate milestones
        milestones = self._calculate_milestones(forecast_df, last_value)
        
        return {
            "forecast": forecast_df,
            "daily_trend": daily_trend,
            "avg_growth_rate": avg_growth_rate,
            "milestones": milestones
        }
    
    def _calculate_milestones(self, forecast_df: pd.DataFrame, current: float) -> list:
        """Calculate when milestones will be reached"""
        milestones = []
        targets = [1000, 5000, 10000, 25000, 50000, 100000]
        
        for target in targets:
            if target > current:
                # Find when forecast exceeds target
                above_target = forecast_df[forecast_df["forecast"] >= target]
                if len(above_target) > 0:
                    milestone_date = above_target.index[0]
                    milestones.append({
                        "target": target,
                        "estimated_date": milestone_date,
                        "days_away": (milestone_date - datetime.now()).days
                    })
        
        return milestones
    
    def visualize(self, forecast_result: dict, save_path: str = None):
        """Visualize forecast"""
        fig, ax = plt.subplots(figsize=(14, 6))
        
        # Historical data
        ax.plot(self.data.index, self.data["followers"], 
                label="Historical", color="blue", linewidth=2)
        
        # Forecast
        forecast = forecast_result["forecast"]
        ax.plot(forecast.index, forecast["forecast"],
                label="Forecast", color="red", linewidth=2, linestyle="--")
        
        # Confidence interval
        ax.fill_between(forecast.index, 
                       forecast["lower_bound"], 
                       forecast["upper_bound"],
                       color="red", alpha=0.2, label="95% CI")
        
        # Milestones
        for m in forecast_result["milestones"][:3]:
            ax.axhline(y=m["target"], color="green", linestyle=":", alpha=0.5)
            ax.annotate(f'{m["target"]:,}', 
                       xy=(forecast.index[-1], m["target"]),
                       fontsize=10)
        
        ax.set_xlabel("Date")
        ax.set_ylabel("Followers")
        ax.set_title("Follower Growth Forecast")
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Format y-axis
        ax.yaxis.set_major_formatter(
            plt.FuncFormatter(lambda x, p: f'{x:,.0f}')
        )
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150)
        else:
            plt.show()


# Usage
async def main():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        # Get historical data
        growth_data = await x.analytics.growth_history(period="90d")
        
        df = pd.DataFrame([
            {"date": d.date, "followers": d.followers}
            for d in growth_data.daily_data
        ])
        
        # Forecast
        forecaster = GrowthForecaster(df)
        result = forecaster.forecast(days_ahead=60)
        
        print(f"\n📈 Growth Analysis:")
        print(f"  Daily trend: {result['daily_trend']:+.1f} followers/day")
        print(f"  Avg growth rate: {result['avg_growth_rate']:.2%}")
        
        print(f"\n🎯 Upcoming Milestones:")
        for m in result["milestones"]:
            print(f"  {m['target']:,}: ~{m['days_away']} days ({m['estimated_date'].strftime('%Y-%m-%d')})")
        
        # Visualize
        forecaster.visualize(result, "forecast.png")

asyncio.run(main())
```

## Sentiment Dashboard

Real-time sentiment analysis dashboard.

```python
"""
Sentiment Analysis Dashboard
============================
Track sentiment trends over time.
"""
import pandas as pd
import asyncio
from datetime import datetime, timedelta
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer


class SentimentDashboard:
    """Real-time sentiment tracking"""
    
    def __init__(self):
        self.data = []
        self.analyzer = SentimentAnalyzer(provider="openai")
    
    async def analyze_mentions(self, username: str, period: str = "24h"):
        """Analyze sentiment of mentions"""
        async with Xeepy() as x:
            mentions = await x.scrape.mentions(username, limit=200)
            
            for mention in mentions:
                result = await self.analyzer.analyze(mention.text)
                
                self.data.append({
                    "timestamp": mention.created_at,
                    "text": mention.text,
                    "author": mention.author.username,
                    "sentiment": result.label,
                    "score": result.score,
                    "likes": mention.likes
                })
            
            return self._generate_report()
    
    def _generate_report(self) -> dict:
        """Generate sentiment report"""
        df = pd.DataFrame(self.data)
        
        if len(df) == 0:
            return {"error": "No data collected"}
        
        # Overall sentiment distribution
        sentiment_dist = df["sentiment"].value_counts(normalize=True)
        
        # Average score
        avg_score = df["score"].mean()
        
        # Sentiment over time
        df["hour"] = pd.to_datetime(df["timestamp"]).dt.floor("H")
        hourly_sentiment = df.groupby("hour")["score"].mean()
        
        # Most positive/negative mentions
        most_positive = df.nlargest(3, "score")[["text", "author", "score"]]
        most_negative = df.nsmallest(3, "score")[["text", "author", "score"]]
        
        # Weighted sentiment (by engagement)
        df["weighted_score"] = df["score"] * (1 + df["likes"] / 100)
        weighted_avg = df["weighted_score"].mean()
        
        return {
            "total_mentions": len(df),
            "sentiment_distribution": sentiment_dist.to_dict(),
            "average_score": avg_score,
            "weighted_average": weighted_avg,
            "hourly_trend": hourly_sentiment.to_dict(),
            "most_positive": most_positive.to_dict("records"),
            "most_negative": most_negative.to_dict("records"),
        }
    
    def visualize(self, report: dict, save_path: str = None):
        """Visualize sentiment analysis"""
        import matplotlib.pyplot as plt
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Sentiment distribution
        ax1 = axes[0, 0]
        dist = report["sentiment_distribution"]
        colors = {"positive": "green", "neutral": "gray", "negative": "red"}
        ax1.pie(dist.values(), labels=dist.keys(), 
               colors=[colors.get(k, "blue") for k in dist.keys()],
               autopct='%1.1f%%')
        ax1.set_title("Sentiment Distribution")
        
        # Sentiment over time
        ax2 = axes[0, 1]
        hourly = report["hourly_trend"]
        ax2.plot(list(hourly.keys()), list(hourly.values()), marker="o")
        ax2.axhline(y=0, color="gray", linestyle="--")
        ax2.set_title("Sentiment Over Time")
        ax2.set_ylabel("Average Sentiment Score")
        plt.xticks(rotation=45)
        
        # Score histogram
        ax3 = axes[1, 0]
        df = pd.DataFrame(self.data)
        ax3.hist(df["score"], bins=20, edgecolor="black")
        ax3.axvline(x=report["average_score"], color="red", linestyle="--", 
                   label=f"Avg: {report['average_score']:.2f}")
        ax3.set_title("Sentiment Score Distribution")
        ax3.legend()
        
        # Summary stats
        ax4 = axes[1, 1]
        ax4.axis("off")
        summary_text = f"""
        Sentiment Analysis Summary
        ==========================
        
        Total Mentions: {report['total_mentions']}
        
        Average Score: {report['average_score']:.2f}
        Weighted Average: {report['weighted_average']:.2f}
        
        Distribution:
        - Positive: {report['sentiment_distribution'].get('positive', 0):.1%}
        - Neutral: {report['sentiment_distribution'].get('neutral', 0):.1%}
        - Negative: {report['sentiment_distribution'].get('negative', 0):.1%}
        """
        ax4.text(0.1, 0.5, summary_text, fontsize=12, family="monospace",
                verticalalignment="center")
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150)
        else:
            plt.show()


# Usage
async def main():
    dashboard = SentimentDashboard()
    report = await dashboard.analyze_mentions("your_username", period="24h")
    
    print("📊 Sentiment Report:")
    print(f"  Total mentions: {report['total_mentions']}")
    print(f"  Average sentiment: {report['average_score']:.2f}")
    print(f"  Distribution: {report['sentiment_distribution']}")
    
    dashboard.visualize(report, "sentiment_dashboard.png")

asyncio.run(main())
```

---

## Next Steps

<div class="grid cards" markdown>

-   **[Business Intelligence](../business/index.md)**
    
    Turn insights into business value

-   **[Research Applications](../research/index.md)**
    
    Academic and market research
