# Data Export Guide

Xeepy makes it easy to export your scraped data and analytics to various formats for analysis, backup, or integration with other tools.

## Overview

<div class="grid cards" markdown>

-   :material-file-delimited:{ .lg .middle } **CSV**
    
    Spreadsheet-compatible format

-   :material-code-json:{ .lg .middle } **JSON**
    
    Structured data for developers

-   :material-microsoft-excel:{ .lg .middle } **Excel**
    
    Formatted spreadsheets with sheets

-   :material-database:{ .lg .middle } **Database**
    
    SQLite, PostgreSQL, MySQL

-   :material-file-table:{ .lg .middle } **Parquet**
    
    Efficient columnar format for data science

</div>

## Quick Start

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Scrape data
    followers = await x.scrape.followers("username", limit=1000)
    
    # Export to different formats
    x.export.to_csv(followers, "followers.csv")
    x.export.to_json(followers, "followers.json")
    x.export.to_excel(followers, "followers.xlsx")
```

## CSV Export

### Basic Export

```python
async with Xeepy() as x:
    tweets = await x.scrape.tweets("username", limit=100)
    
    # Simple export
    x.export.to_csv(tweets, "tweets.csv")
```

### Custom Fields

```python
x.export.to_csv(
    tweets,
    "tweets.csv",
    fields=["id", "text", "likes", "retweets", "created_at"]
)
```

### Nested Fields

```python
# Access nested data with dot notation
x.export.to_csv(
    tweets,
    "tweets.csv",
    fields=[
        "id",
        "text",
        "author.username",      # Nested field
        "author.followers_count",
        "likes",
        "created_at"
    ]
)
```

### Append to Existing File

```python
async with Xeepy() as x:
    # First batch
    batch1 = await x.scrape.followers("user1", limit=500)
    x.export.to_csv(batch1, "all_followers.csv")
    
    # Append more
    batch2 = await x.scrape.followers("user2", limit=500)
    x.export.append_csv(batch2, "all_followers.csv")
```

### CSV Options

```python
x.export.to_csv(
    data,
    "output.csv",
    delimiter=",",           # Field separator
    encoding="utf-8",        # File encoding
    include_header=True,     # Include column names
    date_format="%Y-%m-%d",  # Date formatting
    null_value="",           # How to represent None
)
```

## JSON Export

### Basic Export

```python
async with Xeepy() as x:
    profile = await x.scrape.profile("username")
    x.export.to_json(profile, "profile.json")
```

### Pretty Print

```python
x.export.to_json(
    data,
    "output.json",
    indent=2,        # Pretty print with indentation
    sort_keys=True   # Alphabetize keys
)
```

### JSON Lines Format

For large datasets, use JSON Lines (one JSON object per line):

```python
x.export.to_jsonl(tweets, "tweets.jsonl")

# Or standard JSON
x.export.to_json(tweets, "tweets.json", format="lines")
```

### Custom Serialization

```python
from datetime import datetime

def custom_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

x.export.to_json(data, "output.json", default=custom_serializer)
```

## Excel Export

### Basic Export

```python
async with Xeepy() as x:
    followers = await x.scrape.followers("username", limit=1000)
    x.export.to_excel(followers, "followers.xlsx")
```

### Multiple Sheets

```python
async with Xeepy() as x:
    followers = await x.scrape.followers("username")
    following = await x.scrape.following("username")
    tweets = await x.scrape.tweets("username", limit=100)
    
    x.export.to_excel_multi(
        "account_data.xlsx",
        {
            "Followers": followers,
            "Following": following,
            "Tweets": tweets
        }
    )
```

### Formatted Reports

```python
x.export.to_excel(
    data,
    "report.xlsx",
    sheet_name="Data",
    freeze_header=True,      # Freeze top row
    auto_width=True,         # Auto-fit column widths
    header_style={
        "bold": True,
        "bg_color": "#1DA1F2",
        "font_color": "white"
    }
)
```

### Add Charts

```python
x.export.to_excel_with_chart(
    growth_data,
    "growth_report.xlsx",
    chart_type="line",
    x_column="date",
    y_column="followers",
    title="Follower Growth"
)
```

## Database Export

### SQLite

```python
async with Xeepy() as x:
    tweets = await x.scrape.tweets("username", limit=1000)
    
    # Export to SQLite
    await x.export.to_database(
        tweets,
        "sqlite:///xeepy.db",
        table="tweets"
    )
```

### PostgreSQL

```python
await x.export.to_database(
    followers,
    "postgresql://user:pass@host:5432/dbname",
    table="followers",
    if_exists="append"  # "replace", "append", or "fail"
)
```

### MySQL

```python
await x.export.to_database(
    data,
    "mysql://user:pass@host:3306/dbname",
    table="twitter_data"
)
```

### Custom Schema

```python
await x.export.to_database(
    tweets,
    "sqlite:///xeepy.db",
    table="tweets",
    dtype={
        "id": "VARCHAR(50) PRIMARY KEY",
        "text": "TEXT",
        "likes": "INTEGER",
        "created_at": "TIMESTAMP"
    }
)
```

### Incremental Updates

```python
async with Xeepy() as x:
    # Only insert new records
    await x.export.to_database(
        new_followers,
        "sqlite:///xeepy.db",
        table="followers",
        if_exists="append",
        unique_columns=["id"]  # Skip duplicates
    )
```

## Parquet Export

For data science workflows:

```python
async with Xeepy() as x:
    tweets = await x.scrape.tweets("username", limit=10000)
    
    # Export to Parquet (efficient columnar format)
    x.export.to_parquet(tweets, "tweets.parquet")
```

### With Compression

```python
x.export.to_parquet(
    data,
    "data.parquet",
    compression="snappy"  # or "gzip", "brotli"
)
```

### Partitioned Dataset

```python
x.export.to_parquet(
    tweets,
    "tweets_partitioned/",
    partition_cols=["year", "month"]
)
```

## Streaming Export

For large datasets, export as you scrape:

```python
async with Xeepy() as x:
    # Initialize export
    exporter = x.export.create_stream("followers.csv", format="csv")
    
    async for batch in x.scrape.followers_batched("popular_user", batch_size=100):
        # Export each batch immediately
        exporter.write_batch(batch)
        print(f"Exported {exporter.total_rows} rows")
    
    exporter.close()
```

## Custom Export Formats

### Markdown Table

```python
md_table = x.export.to_markdown(
    followers[:10],
    columns=["username", "followers_count", "bio"]
)
print(md_table)
# | username | followers_count | bio |
# |----------|-----------------|-----|
# | user1    | 10,000          | ... |
```

### HTML Table

```python
html = x.export.to_html(
    data,
    table_class="data-table",
    include_style=True
)

with open("table.html", "w") as f:
    f.write(html)
```

## Export Transformations

### Filter Before Export

```python
async with Xeepy() as x:
    followers = await x.scrape.followers("username", limit=5000)
    
    # Export only verified users
    verified = [f for f in followers if f.verified]
    x.export.to_csv(verified, "verified_followers.csv")
```

### Transform Data

```python
async with Xeepy() as x:
    tweets = await x.scrape.tweets("username", limit=100)
    
    # Transform before export
    transformed = [
        {
            "id": t.id,
            "text": t.text,
            "engagement": t.likes + t.retweets,
            "date": t.created_at.strftime("%Y-%m-%d")
        }
        for t in tweets
    ]
    
    x.export.to_json(transformed, "tweets_transformed.json")
```

## Configuration

### Default Settings

```toml
# xeepy.toml
[xeepy.export]
default_format = "csv"
output_dir = "./exports"
timestamp_filenames = true  # Add timestamp to filenames
encoding = "utf-8"

[xeepy.export.csv]
delimiter = ","
include_header = true

[xeepy.export.json]
indent = 2
sort_keys = false

[xeepy.export.excel]
freeze_header = true
auto_width = true
```

## CLI Commands

```bash
# Export from scrape command
xeepy scrape followers username --limit 1000 --output followers.csv
xeepy scrape tweets username --output tweets.json --format json

# Convert formats
xeepy export convert data.csv data.json
xeepy export convert data.json data.xlsx

# Export to database
xeepy export database data.csv sqlite:///data.db --table tweets
```

## Integration with pandas

```python
async with Xeepy() as x:
    tweets = await x.scrape.tweets("username", limit=1000)
    
    # Convert to DataFrame
    df = x.export.to_dataframe(tweets)
    
    # Now use pandas features
    print(df.describe())
    print(df.groupby('author.verified')['likes'].mean())
    
    # Export from DataFrame
    df.to_csv("tweets.csv")
    df.to_parquet("tweets.parquet")
```

## Best Practices

1. **Choose the right format** - CSV for spreadsheets, JSON for APIs, Parquet for data science
2. **Stream large exports** - Don't load everything into memory
3. **Timestamp your files** - Avoid overwriting previous exports
4. **Verify exports** - Check row counts and data integrity
5. **Compress large files** - Use gzip for CSV, snappy for Parquet
6. **Backup to database** - For long-term storage and querying
