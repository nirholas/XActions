# Export

Export data to various file formats.

## Import

```python
from xeepy.storage import Export
# Or via Xeepy instance
x.export
```

## Class Signature

```python
class Export:
    def __init__(self)
```

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `to_csv(data, filename)` | `str` | Export to CSV |
| `to_json(data, filename)` | `str` | Export to JSON |
| `to_excel(data, filename)` | `str` | Export to Excel |
| `to_parquet(data, filename)` | `str` | Export to Parquet |
| `to_markdown(data, filename)` | `str` | Export to Markdown table |

### `to_csv`

```python
def to_csv(
    self,
    data: Union[List[Dict], List[Any], ScrapeResult],
    filename: str,
    columns: Optional[List[str]] = None
) -> str
```

Export to CSV file.

**Parameters:**
- `data`: Data to export (dicts, models, or ScrapeResult)
- `filename`: Output filename
- `columns`: Specific columns to include (optional)

**Returns:** Path to created file

### `to_json`

```python
def to_json(
    self,
    data: Union[List[Dict], List[Any], ScrapeResult],
    filename: str,
    indent: int = 2
) -> str
```

Export to JSON file.

### `to_excel`

```python
def to_excel(
    self,
    data: Union[List[Dict], List[Any], ScrapeResult],
    filename: str,
    sheet_name: str = "Sheet1"
) -> str
```

Export to Excel file.

### `to_parquet`

```python
def to_parquet(
    self,
    data: Union[List[Dict], List[Any], ScrapeResult],
    filename: str,
    compression: str = "snappy"
) -> str
```

Export to Parquet file (for large datasets).

### `to_markdown`

```python
def to_markdown(
    self,
    data: Union[List[Dict], List[Any], ScrapeResult],
    filename: str,
    columns: Optional[List[str]] = None
) -> str
```

Export to Markdown table.

## Usage Examples

### Export Replies to CSV

```python
from xeepy import Xeepy

async def export_replies(tweet_url: str):
    async with Xeepy() as x:
        replies = await x.scrape.replies(tweet_url, limit=100)
        
        path = x.export.to_csv(replies, "replies.csv")
        print(f"Exported to {path}")

asyncio.run(export_replies("https://x.com/user/status/123"))
```

### Export Followers to JSON

```python
from xeepy import Xeepy

async def export_followers(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=500)
        
        path = x.export.to_json(followers, f"followers_{username}.json")
        print(f"Exported to {path}")

asyncio.run(export_followers("myaccount"))
```

### Export with Specific Columns

```python
from xeepy import Xeepy

async def export_selective(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=200)
        
        path = x.export.to_csv(
            followers,
            "followers_simple.csv",
            columns=["username", "name", "followers_count", "bio"]
        )
        
        print(f"Exported selected columns to {path}")

asyncio.run(export_selective("myaccount"))
```

### Export to Excel

```python
from xeepy import Xeepy

async def export_to_excel(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=100)
        
        path = x.export.to_excel(
            tweets,
            f"tweets_{username}.xlsx",
            sheet_name="Tweets"
        )
        
        print(f"Exported to {path}")

asyncio.run(export_to_excel("username"))
```

### Export Large Dataset to Parquet

```python
from xeepy import Xeepy

async def export_large_dataset(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=10000)
        
        path = x.export.to_parquet(
            followers,
            f"followers_{username}.parquet",
            compression="snappy"
        )
        
        print(f"Exported {len(followers.items):,} rows to {path}")

asyncio.run(export_large_dataset("elonmusk"))
```

### Export to Markdown

```python
from xeepy import Xeepy

async def export_markdown(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=10)
        
        path = x.export.to_markdown(
            tweets,
            f"tweets_{username}.md",
            columns=["text", "like_count", "created_at"]
        )
        
        print(f"Exported to {path}")

asyncio.run(export_markdown("username"))
```

### Export Custom Data

```python
from xeepy import Xeepy

async def export_custom_analysis(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=100)
        
        # Create custom data structure
        data = []
        for tweet in tweets.items:
            data.append({
                "id": tweet.id,
                "text": tweet.text[:100],
                "likes": tweet.like_count,
                "retweets": tweet.retweet_count,
                "engagement_rate": tweet.engagement_rate,
                "has_media": tweet.has_media,
                "hashtags": ", ".join(tweet.hashtags),
                "posted_at": tweet.created_at.isoformat()
            })
        
        x.export.to_csv(data, f"analysis_{username}.csv")
        x.export.to_json(data, f"analysis_{username}.json")

asyncio.run(export_custom_analysis("username"))
```

### Export Multiple Sheets to Excel

```python
from xeepy import Xeepy

async def export_multi_sheet(username: str):
    async with Xeepy() as x:
        user = await x.scrape.profile(username)
        tweets = await x.scrape.tweets(username, limit=50)
        followers = await x.scrape.followers(username, limit=100)
        
        # Export each to separate Excel files
        x.export.to_excel([user.to_dict()], f"{username}_profile.xlsx", sheet_name="Profile")
        x.export.to_excel(tweets, f"{username}_tweets.xlsx", sheet_name="Tweets")
        x.export.to_excel(followers, f"{username}_followers.xlsx", sheet_name="Followers")

asyncio.run(export_multi_sheet("username"))
```

### Export with Timestamp

```python
from xeepy import Xeepy
from datetime import datetime

async def export_with_timestamp(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=500)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = x.export.to_csv(followers, f"followers_{username}_{timestamp}.csv")
        
        print(f"Exported to {path}")

asyncio.run(export_with_timestamp("myaccount"))
```

### Export Search Results

```python
from xeepy import Xeepy

async def export_search(query: str):
    async with Xeepy() as x:
        results = await x.scrape.search(query, limit=200)
        
        x.export.to_csv(results, f"search_{query.replace(' ', '_')}.csv")
        print(f"Exported {len(results.items)} search results")

asyncio.run(export_search("Python programming"))
```

### Batch Export

```python
from xeepy import Xeepy

async def batch_export(usernames: list):
    async with Xeepy() as x:
        for username in usernames:
            try:
                followers = await x.scrape.followers(username, limit=500)
                x.export.to_csv(followers, f"followers_{username}.csv")
                print(f"✓ Exported @{username}")
            except Exception as e:
                print(f"✗ Failed @{username}: {e}")

asyncio.run(batch_export(["user1", "user2", "user3"]))
```

### Convert to DataFrame

```python
from xeepy import Xeepy
import pandas as pd

async def to_dataframe(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=500)
        
        # Export to CSV, then read as DataFrame
        path = x.export.to_csv(followers, "temp_followers.csv")
        df = pd.read_csv(path)
        
        print(f"DataFrame shape: {df.shape}")
        print(df.head())
        
        return df

asyncio.run(to_dataframe("username"))
```

## See Also

- [Database](database.md) - SQLite storage
- [Tweet](../models/tweet.md) - Tweet model
- [User](../models/user.md) - User model
