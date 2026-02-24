# X/Twitter Engagement Skill
<!-- by nichxbt -->

Automate engagement actions on X/Twitter — liking, retweeting, replying, following, and growth strategies.

## Engagement Tools

| Tool | Action | Key params |
|------|--------|------------|
| `x_like` | Like a tweet | `tweet_url` or `tweet_id` |
| `x_retweet` | Retweet a tweet | `tweet_url` or `tweet_id` |
| `x_reply` | Reply to a tweet | `tweet_url`, `text` |
| `x_auto_like` | Auto-like by keyword/user filter | `query`, `limit` |
| `x_follow` | Follow a user | `username` |
| `x_unfollow` | Unfollow a user | `username` |
| `x_bookmark` | Bookmark a tweet | `tweet_url` |
| `x_post_tweet` | Post a tweet | `text` |
| `x_post_thread` | Post a thread | `tweets` (array of strings) |

## Growth Strategies

### Keyword Engagement
1. Use `x_search_tweets` to find tweets about a topic
2. Use `x_like` and `x_reply` on relevant tweets
3. Use `x_follow` on users posting about the topic
4. Add 2-3 second delays between actions

### Audience Building
1. Use `x_get_followers` on target accounts in your niche
2. Use `x_follow` on relevant users
3. Use `x_get_non_followers` periodically to find non-mutual accounts
4. Use `x_unfollow_non_followers` to maintain a healthy ratio

### Content Strategy
1. Use `x_get_trends` to find trending topics
2. Use `x_post_tweet` or `x_post_thread` to publish relevant content
3. Use `x_schedule_post` to queue posts for optimal times
4. Use `x_get_post_analytics` to measure engagement

## Monitoring

| Tool | Purpose |
|------|---------|
| `x_get_analytics` | Overall account engagement stats |
| `x_get_post_analytics` | Per-post performance |
| `x_detect_unfollowers` | Track who unfollowed |
| `x_analyze_sentiment` | Analyze sentiment of mentions |
| `x_monitor_reputation` | Track brand reputation |
| `x_brand_monitor` | Monitor brand mentions |
| `x_competitor_analysis` | Compare against competitors |

## Real-time Streaming

Start real-time monitoring streams:
- `x_stream_start` — begin monitoring (keywords, users, or mentions)
- `x_stream_list` — see active streams
- `x_stream_history` — review captured events
- `x_stream_stop` — stop when done

## Best Practices

- Always add 1-3 second delays between engagement actions
- Confirm mass actions (bulk follow/unfollow) with the user first
- Start with small limits and scale up
- Monitor analytics to measure effectiveness
- Respect X/Twitter's terms of service
