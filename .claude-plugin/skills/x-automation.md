# X/Twitter Automation Skill
<!-- by nichxbt -->

You have access to the XActions MCP server which provides 68 tools for automating X/Twitter. The server uses Puppeteer browser automation — no API keys or fees required.

## Authentication

Before using any tools, authenticate with `x_login` using the user's `auth_token` cookie from x.com (DevTools → Application → Cookies → `auth_token`). The environment variable `XACTIONS_SESSION_COOKIE` can also be set.

## Core Tools

### Profile & Social Graph
| Tool | Purpose |
|------|---------|
| `x_get_profile` | Get bio, follower/following counts, verified status |
| `x_get_followers` | List followers with bios and follow-back indicator |
| `x_get_following` | List following with follow-back indicator |
| `x_get_non_followers` | Find accounts not following back |
| `x_follow` | Follow a user |
| `x_unfollow` | Unfollow a user |
| `x_unfollow_non_followers` | Bulk unfollow non-followers |
| `x_detect_unfollowers` | Compare snapshots to find who unfollowed |

### Tweets & Content
| Tool | Purpose |
|------|---------|
| `x_get_tweets` | Get a user's recent tweets |
| `x_search_tweets` | Search tweets by query |
| `x_post_tweet` | Post a new tweet |
| `x_post_thread` | Post a multi-tweet thread |
| `x_create_poll` | Create a poll tweet |
| `x_schedule_post` | Schedule a post for later |
| `x_delete_tweet` | Delete a tweet |
| `x_get_thread` | Get all tweets in a thread |

### Engagement
| Tool | Purpose |
|------|---------|
| `x_like` | Like a tweet |
| `x_retweet` | Retweet a tweet |
| `x_reply` | Reply to a tweet |
| `x_auto_like` | Auto-like tweets by keyword/user filter |

### Direct Messages
| Tool | Purpose |
|------|---------|
| `x_send_dm` | Send a direct message |
| `x_get_conversations` | List DM conversations |
| `x_export_dms` | Export DM history |

### Analytics & Discovery
| Tool | Purpose |
|------|---------|
| `x_get_analytics` | Account analytics |
| `x_get_post_analytics` | Per-post analytics |
| `x_get_trends` | Current trending topics |
| `x_get_explore` | Explore page content |
| `x_get_notifications` | Recent notifications |

### Moderation
| Tool | Purpose |
|------|---------|
| `x_mute_user` | Mute a user |
| `x_unmute_user` | Unmute a user |
| `x_get_blocked` | List blocked accounts |
| `x_toggle_protected` | Toggle protected/private account |

### Bookmarks & Lists
| Tool | Purpose |
|------|---------|
| `x_bookmark` | Bookmark a tweet |
| `x_get_bookmarks` | Get bookmarked tweets |
| `x_clear_bookmarks` | Clear all bookmarks |
| `x_get_lists` | Get user's lists |
| `x_get_list_members` | Get members of a list |

### Grok AI
| Tool | Purpose |
|------|---------|
| `x_grok_query` | Send a prompt to Grok |
| `x_grok_summarize` | Summarize content with Grok |

### Business & Creator
| Tool | Purpose |
|------|---------|
| `x_brand_monitor` | Monitor brand mentions |
| `x_competitor_analysis` | Analyze competitors |
| `x_analyze_sentiment` | Sentiment analysis on text |
| `x_monitor_reputation` | Monitor account reputation |
| `x_reputation_report` | Generate reputation report |
| `x_creator_analytics` | Creator monetization analytics |
| `x_check_premium` | Check Premium subscription status |

### Streaming (Real-time)
| Tool | Purpose |
|------|---------|
| `x_stream_start` | Start a real-time stream |
| `x_stream_stop` | Stop a stream |
| `x_stream_list` | List active streams |
| `x_stream_pause` / `x_stream_resume` | Pause/resume streams |
| `x_stream_status` | Get stream status |
| `x_stream_history` | Get stream event history |

### Workflows
| Tool | Purpose |
|------|---------|
| `x_workflow_create` | Create an automation workflow |
| `x_workflow_run` | Run a saved workflow |
| `x_workflow_list` | List all workflows |
| `x_workflow_actions` | List available workflow actions |

### Data Portability
| Tool | Purpose |
|------|---------|
| `x_export_account` | Export full account data |
| `x_migrate_account` | Migrate account data |
| `x_diff_exports` | Compare two exports |

### Media
| Tool | Purpose |
|------|---------|
| `x_download_video` | Download video from a tweet (returns MP4 URLs) |

## Best Practices

- Add 1-3 second delays between actions to avoid rate limits
- Use `limit` parameters to control data volume (default: 100)
- Always confirm destructive actions (mass unfollow, delete) with the user
- Export data to JSON/CSV for large datasets
- The server supports multi-platform: Twitter, Bluesky, Mastodon, Threads
