# X/Twitter Account Management Skill
<!-- by nichxbt -->

Manage your X/Twitter account — profile, settings, DMs, lists, bookmarks, moderation, and data portability.

## Profile Management

| Tool | Purpose |
|------|---------|
| `x_get_profile` | View your profile details |
| `x_update_profile` | Update bio, display name, location, website |
| `x_check_premium` | Check Premium subscription status |
| `x_toggle_protected` | Toggle private/protected account |
| `x_get_settings` | View account settings |

## Direct Messages

| Tool | Purpose |
|------|---------|
| `x_send_dm` | Send a direct message to a user |
| `x_get_conversations` | List DM conversations |
| `x_export_dms` | Export full DM history |

## Lists Management

| Tool | Purpose |
|------|---------|
| `x_get_lists` | Get all your lists |
| `x_get_list_members` | Get members of a list |

## Bookmarks

| Tool | Purpose |
|------|---------|
| `x_bookmark` | Bookmark a tweet |
| `x_get_bookmarks` | Get all bookmarked tweets |
| `x_clear_bookmarks` | Clear all bookmarks |

## Moderation

| Tool | Purpose |
|------|---------|
| `x_mute_user` | Mute a user |
| `x_unmute_user` | Unmute a user |
| `x_get_blocked` | List blocked accounts |

## Grok AI Integration

| Tool | Purpose |
|------|---------|
| `x_grok_query` | Send a prompt to X's Grok AI |
| `x_grok_summarize` | Summarize content using Grok |

## Data Portability

| Tool | Purpose |
|------|---------|
| `x_export_account` | Export full account data (followers, following, tweets, etc.) |
| `x_migrate_account` | Migrate account data to another platform |
| `x_diff_exports` | Compare two exports to see changes |

## Article Publishing

| Tool | Purpose |
|------|---------|
| `x_publish_article` | Publish a long-form article (Premium+ feature) |

## Cleanup Operations

For bulk account cleanup, use these tool combinations:

**Unfollow non-followers:**
1. `x_get_non_followers` — see who doesn't follow back
2. `x_unfollow_non_followers` — bulk unfollow them

**Clear bookmarks:**
1. `x_get_bookmarks` — review bookmarks first
2. `x_clear_bookmarks` — clear all

**Delete old content:**
1. `x_get_tweets` — review your tweets
2. `x_delete_tweet` — delete specific tweets

## Workflow Automation

Create reusable automation workflows:
- `x_workflow_create` — define a workflow
- `x_workflow_run` — execute a saved workflow
- `x_workflow_list` — see all workflows
- `x_workflow_actions` — list available actions

## Best Practices

- Always confirm destructive actions with the user (delete, clear, mass unfollow)
- Export data before bulk cleanup operations
- Use `x_detect_unfollowers` before unfollowing to avoid removing mutual follows
- DM exports may take time for large histories — use reasonable limits
