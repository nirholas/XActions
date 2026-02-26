/**
 * XActions A2A — Skill Registry
 *
 * Bridges MCP tool definitions to A2A skill descriptors. Maintains a
 * searchable, categorized registry of all capabilities the XActions agent
 * can advertise to other A2A agents.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

// ============================================================================
// MCP Tool Definitions (inline snapshot)
// ============================================================================
// The canonical list lives in src/mcp/server.js as `const TOOLS = [...]`.
// To avoid importing the full MCP server (which starts StdioTransport), we
// maintain a lightweight extraction function that reads tool metadata only.

import { getPluginTools } from '../plugins/index.js';

/**
 * Hardcoded MCP tool names + descriptions extracted from src/mcp/server.js.
 * This avoids importing the 4k-line server module at registry init time.
 * Run `refreshSkills()` to pull dynamic plugin tools on top of this base.
 */
const BASE_MCP_TOOLS = [
  { name: 'x_login', description: 'Login to X/Twitter using a session cookie (auth_token).', inputSchema: { type: 'object', properties: { cookie: { type: 'string' } }, required: ['cookie'] } },
  { name: 'x_get_profile', description: 'Get profile information for a user including bio, follower count, etc. Supports Twitter, Bluesky, Threads, and Mastodon.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, platform: { type: 'string', enum: ['twitter', 'bluesky', 'mastodon', 'threads'] } }, required: ['username'] } },
  { name: 'x_get_followers', description: 'Scrape followers for an account. Supports multiple platforms.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, count: { type: 'number' }, platform: { type: 'string' } }, required: ['username'] } },
  { name: 'x_get_following', description: 'Scrape accounts that a user follows.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, count: { type: 'number' }, platform: { type: 'string' } }, required: ['username'] } },
  { name: 'x_get_non_followers', description: 'Find accounts you follow that do not follow you back.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_get_tweets', description: 'Scrape recent tweets from a user.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, count: { type: 'number' }, platform: { type: 'string' } }, required: ['username'] } },
  { name: 'x_search_tweets', description: 'Search for tweets by query.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, count: { type: 'number' } }, required: ['query'] } },
  { name: 'x_get_replies', description: 'Get replies to a specific tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_get_hashtag', description: 'Scrape tweets for a hashtag.', inputSchema: { type: 'object', properties: { hashtag: { type: 'string' }, count: { type: 'number' } }, required: ['hashtag'] } },
  { name: 'x_get_likers', description: 'Get users who liked a specific tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_get_retweeters', description: 'Get users who retweeted a specific tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_get_media', description: 'Scrape media from a user profile.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, count: { type: 'number' } }, required: ['username'] } },
  { name: 'x_get_recommendations', description: 'Get recommended accounts based on a profile.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_get_mentions', description: 'Get mentions of a user.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, count: { type: 'number' } }, required: ['username'] } },
  { name: 'x_get_quote_tweets', description: 'Get quote tweets of a specific tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_get_likes', description: 'Get tweets liked by a user.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, count: { type: 'number' } }, required: ['username'] } },
  { name: 'x_get_thread', description: 'Scrape a full tweet thread.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_follow', description: 'Follow a user on X/Twitter.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_unfollow', description: 'Unfollow a user on X/Twitter.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_unfollow_non_followers', description: 'Unfollow accounts that do not follow you back.', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'x_detect_unfollowers', description: 'Detect accounts that recently unfollowed you.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_auto_follow', description: 'Auto-follow users matching criteria.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, count: { type: 'number' } }, required: ['query'] } },
  { name: 'x_follow_engagers', description: 'Follow users who engaged with a specific tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_unfollow_all', description: 'Mass unfollow all accounts you follow.', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'x_smart_unfollow', description: 'Smart unfollow based on engagement and activity.', inputSchema: { type: 'object', properties: { strategy: { type: 'string' }, limit: { type: 'number' } } } },
  { name: 'x_post_tweet', description: 'Post a tweet on X/Twitter.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, mediaPath: { type: 'string' } }, required: ['text'] } },
  { name: 'x_like', description: 'Like a tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_retweet', description: 'Retweet a tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_reply', description: 'Reply to a tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' }, text: { type: 'string' } }, required: ['tweetId', 'text'] } },
  { name: 'x_post_thread', description: 'Post a thread of tweets.', inputSchema: { type: 'object', properties: { tweets: { type: 'array', items: { type: 'string' } } }, required: ['tweets'] } },
  { name: 'x_create_poll', description: 'Create a poll tweet.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, choices: { type: 'array' }, duration: { type: 'number' } }, required: ['text', 'choices'] } },
  { name: 'x_schedule_post', description: 'Schedule a tweet for later.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, scheduledTime: { type: 'string' } }, required: ['text', 'scheduledTime'] } },
  { name: 'x_delete_tweet', description: 'Delete a tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_quote_tweet', description: 'Quote tweet with commentary.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' }, text: { type: 'string' } }, required: ['tweetId', 'text'] } },
  { name: 'x_auto_comment', description: 'Auto-comment on tweets matching criteria.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, comment: { type: 'string' }, count: { type: 'number' } }, required: ['query', 'comment'] } },
  { name: 'x_auto_retweet', description: 'Auto-retweet tweets matching criteria.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, count: { type: 'number' } }, required: ['query'] } },
  { name: 'x_auto_like', description: 'Auto-like tweets matching criteria.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, count: { type: 'number' } }, required: ['query'] } },
  { name: 'x_bookmark', description: 'Bookmark a tweet.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_get_bookmarks', description: 'Get all bookmarked tweets.', inputSchema: { type: 'object', properties: { count: { type: 'number' } } } },
  { name: 'x_clear_bookmarks', description: 'Clear all bookmarks.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_download_video', description: 'Download a video from a tweet.', inputSchema: { type: 'object', properties: { tweetUrl: { type: 'string' } }, required: ['tweetUrl'] } },
  { name: 'x_update_profile', description: 'Update your X/Twitter profile.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, bio: { type: 'string' }, location: { type: 'string' }, website: { type: 'string' } } } },
  { name: 'x_get_trends', description: 'Get trending topics.', inputSchema: { type: 'object', properties: { location: { type: 'string' } } } },
  { name: 'x_get_explore', description: 'Get explore/discovery content.', inputSchema: { type: 'object', properties: { category: { type: 'string' } } } },
  { name: 'x_get_notifications', description: 'Get recent notifications.', inputSchema: { type: 'object', properties: { count: { type: 'number' } } } },
  { name: 'x_mute_user', description: 'Mute a user.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_unmute_user', description: 'Unmute a user.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_get_blocked', description: 'Get list of blocked accounts.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_detect_bots', description: 'Detect potential bot accounts.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_send_dm', description: 'Send a direct message.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, message: { type: 'string' } }, required: ['username', 'message'] } },
  { name: 'x_get_conversations', description: 'Get DM conversations.', inputSchema: { type: 'object', properties: { count: { type: 'number' } } } },
  { name: 'x_export_dms', description: 'Export DM conversations.', inputSchema: { type: 'object', properties: { format: { type: 'string' } } } },
  { name: 'x_grok_query', description: 'Query Grok AI.', inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } },
  { name: 'x_grok_summarize', description: 'Summarize content with Grok AI.', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'x_grok_analyze_image', description: 'Analyze an image with Grok AI.', inputSchema: { type: 'object', properties: { imageUrl: { type: 'string' } }, required: ['imageUrl'] } },
  { name: 'x_get_lists', description: 'Get user lists.', inputSchema: { type: 'object', properties: { username: { type: 'string' } } } },
  { name: 'x_get_list_members', description: 'Get members of a list.', inputSchema: { type: 'object', properties: { listId: { type: 'string' } }, required: ['listId'] } },
  { name: 'x_get_spaces', description: 'Get active Twitter Spaces.', inputSchema: { type: 'object', properties: { query: { type: 'string' } } } },
  { name: 'x_scrape_space', description: 'Scrape data from a Twitter Space.', inputSchema: { type: 'object', properties: { spaceId: { type: 'string' } }, required: ['spaceId'] } },
  { name: 'x_get_analytics', description: 'Get account analytics overview.', inputSchema: { type: 'object', properties: { period: { type: 'string' } } } },
  { name: 'x_get_post_analytics', description: 'Get analytics for a specific post.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_audience_insights', description: 'Get audience demographic insights.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_engagement_report', description: 'Generate an engagement report.', inputSchema: { type: 'object', properties: { period: { type: 'string' } } } },
  { name: 'x_creator_analytics', description: 'Get creator monetization analytics.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_get_settings', description: 'Get account settings.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_toggle_protected', description: 'Toggle protected/private account mode.', inputSchema: { type: 'object', properties: { enabled: { type: 'boolean' } } } },
  { name: 'x_check_premium', description: 'Check X Premium subscription status.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_brand_monitor', description: 'Monitor brand mentions and sentiment.', inputSchema: { type: 'object', properties: { brand: { type: 'string' } }, required: ['brand'] } },
  { name: 'x_competitor_analysis', description: 'Analyze competitor Twitter strategy.', inputSchema: { type: 'object', properties: { competitor: { type: 'string' } }, required: ['competitor'] } },
  { name: 'x_publish_article', description: 'Publish a long-form article on X.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] } },
  { name: 'x_analyze_sentiment', description: 'Analyze sentiment of tweets.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'x_monitor_reputation', description: 'Monitor online reputation.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_reputation_report', description: 'Generate a reputation report.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_stream_start', description: 'Start real-time streaming for keywords/users.', inputSchema: { type: 'object', properties: { keywords: { type: 'array' }, users: { type: 'array' } } } },
  { name: 'x_stream_stop', description: 'Stop a streaming session.', inputSchema: { type: 'object', properties: { streamId: { type: 'string' } }, required: ['streamId'] } },
  { name: 'x_stream_list', description: 'List active streams.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_stream_pause', description: 'Pause a stream.', inputSchema: { type: 'object', properties: { streamId: { type: 'string' } }, required: ['streamId'] } },
  { name: 'x_stream_resume', description: 'Resume a paused stream.', inputSchema: { type: 'object', properties: { streamId: { type: 'string' } }, required: ['streamId'] } },
  { name: 'x_stream_status', description: 'Get stream status.', inputSchema: { type: 'object', properties: { streamId: { type: 'string' } }, required: ['streamId'] } },
  { name: 'x_stream_history', description: 'Get stream event history.', inputSchema: { type: 'object', properties: { streamId: { type: 'string' }, count: { type: 'number' } }, required: ['streamId'] } },
  { name: 'x_workflow_create', description: 'Create a new automation workflow.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, steps: { type: 'array' } }, required: ['name', 'steps'] } },
  { name: 'x_workflow_run', description: 'Run an existing workflow.', inputSchema: { type: 'object', properties: { workflowId: { type: 'string' } }, required: ['workflowId'] } },
  { name: 'x_workflow_list', description: 'List all workflows.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_workflow_actions', description: 'List available workflow actions.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_export_account', description: 'Export account data.', inputSchema: { type: 'object', properties: { format: { type: 'string' } } } },
  { name: 'x_migrate_account', description: 'Migrate account data between platforms.', inputSchema: { type: 'object', properties: { source: { type: 'string' }, target: { type: 'string' } }, required: ['source', 'target'] } },
  { name: 'x_diff_exports', description: 'Compare two account exports.', inputSchema: { type: 'object', properties: { exportA: { type: 'string' }, exportB: { type: 'string' } }, required: ['exportA', 'exportB'] } },
  { name: 'x_best_time_to_post', description: 'Find the best time to post for engagement.', inputSchema: { type: 'object', properties: { username: { type: 'string' } } } },
  { name: 'x_analyze_voice', description: 'Analyze writing voice and tone.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_generate_tweet', description: 'Generate a tweet using AI.', inputSchema: { type: 'object', properties: { topic: { type: 'string' }, tone: { type: 'string' } }, required: ['topic'] } },
  { name: 'x_rewrite_tweet', description: 'Rewrite a tweet for better engagement.', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'x_summarize_thread', description: 'Summarize a tweet thread.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_optimize_tweet', description: 'Optimize tweet for maximum engagement.', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'x_suggest_hashtags', description: 'Suggest relevant hashtags.', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'x_predict_performance', description: 'Predict tweet engagement performance.', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'x_generate_variations', description: 'Generate tweet variations.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, count: { type: 'number' } }, required: ['text'] } },
  { name: 'x_list_platforms', description: 'List supported social media platforms.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_graph_build', description: 'Build a social graph for a user.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, depth: { type: 'number' } }, required: ['username'] } },
  { name: 'x_graph_analyze', description: 'Analyze social graph connections.', inputSchema: { type: 'object', properties: { graphId: { type: 'string' } }, required: ['graphId'] } },
  { name: 'x_graph_recommendations', description: 'Get follow recommendations from social graph.', inputSchema: { type: 'object', properties: { graphId: { type: 'string' } }, required: ['graphId'] } },
  { name: 'x_graph_list', description: 'List saved social graphs.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_persona_create', description: 'Create a new AI persona for automation.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, niche: { type: 'string' } }, required: ['name', 'niche'] } },
  { name: 'x_persona_list', description: 'List all personas.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_persona_status', description: 'Get persona status.', inputSchema: { type: 'object', properties: { personaId: { type: 'string' } }, required: ['personaId'] } },
  { name: 'x_persona_edit', description: 'Edit a persona configuration.', inputSchema: { type: 'object', properties: { personaId: { type: 'string' }, updates: { type: 'object' } }, required: ['personaId'] } },
  { name: 'x_persona_delete', description: 'Delete a persona.', inputSchema: { type: 'object', properties: { personaId: { type: 'string' } }, required: ['personaId'] } },
  { name: 'x_persona_run', description: 'Run a persona automation session.', inputSchema: { type: 'object', properties: { personaId: { type: 'string' } }, required: ['personaId'] } },
  { name: 'x_persona_presets', description: 'List available persona presets.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_history_get', description: 'Get follower history.', inputSchema: { type: 'object', properties: { username: { type: 'string' } } } },
  { name: 'x_history_snapshot', description: 'Take a follower snapshot.', inputSchema: { type: 'object', properties: { username: { type: 'string' } } } },
  { name: 'x_growth_rate', description: 'Calculate follower growth rate.', inputSchema: { type: 'object', properties: { username: { type: 'string' } } } },
  { name: 'x_compare_accounts', description: 'Compare two accounts side by side.', inputSchema: { type: 'object', properties: { usernameA: { type: 'string' }, usernameB: { type: 'string' } }, required: ['usernameA', 'usernameB'] } },
  { name: 'x_audience_overlap', description: 'Find audience overlap between accounts.', inputSchema: { type: 'object', properties: { usernameA: { type: 'string' }, usernameB: { type: 'string' } }, required: ['usernameA', 'usernameB'] } },
  { name: 'x_crm_sync', description: 'Sync contacts with CRM.', inputSchema: { type: 'object', properties: { provider: { type: 'string' } } } },
  { name: 'x_crm_tag', description: 'Tag a contact in CRM.', inputSchema: { type: 'object', properties: { username: { type: 'string' }, tag: { type: 'string' } }, required: ['username', 'tag'] } },
  { name: 'x_crm_search', description: 'Search CRM contacts.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'x_crm_segment', description: 'Create audience segments.', inputSchema: { type: 'object', properties: { criteria: { type: 'object' } }, required: ['criteria'] } },
  { name: 'x_bulk_execute', description: 'Execute bulk operations.', inputSchema: { type: 'object', properties: { action: { type: 'string' }, targets: { type: 'array' } }, required: ['action', 'targets'] } },
  { name: 'x_schedule_add', description: 'Add a scheduled task.', inputSchema: { type: 'object', properties: { action: { type: 'string' }, cronExpr: { type: 'string' } }, required: ['action', 'cronExpr'] } },
  { name: 'x_schedule_list', description: 'List scheduled tasks.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_schedule_remove', description: 'Remove a scheduled task.', inputSchema: { type: 'object', properties: { scheduleId: { type: 'string' } }, required: ['scheduleId'] } },
  { name: 'x_evergreen_analyze', description: 'Analyze content for evergreen potential.', inputSchema: { type: 'object', properties: { username: { type: 'string' } } } },
  { name: 'x_rss_add', description: 'Add an RSS feed for auto-posting.', inputSchema: { type: 'object', properties: { feedUrl: { type: 'string' } }, required: ['feedUrl'] } },
  { name: 'x_rss_check', description: 'Check RSS feed status.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_rss_drafts', description: 'Get RSS draft posts.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_notify_send', description: 'Send a notification.', inputSchema: { type: 'object', properties: { channel: { type: 'string' }, message: { type: 'string' } }, required: ['channel', 'message'] } },
  { name: 'x_notify_test', description: 'Test notification settings.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_dataset_list', description: 'List available datasets.', inputSchema: { type: 'object', properties: {} } },
  { name: 'x_dataset_get', description: 'Get a specific dataset.', inputSchema: { type: 'object', properties: { datasetId: { type: 'string' } }, required: ['datasetId'] } },
  { name: 'x_team_create', description: 'Create a team.', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'x_team_members', description: 'List team members.', inputSchema: { type: 'object', properties: { teamId: { type: 'string' } } } },
  { name: 'x_import_data', description: 'Import data from external sources.', inputSchema: { type: 'object', properties: { source: { type: 'string' }, format: { type: 'string' } }, required: ['source'] } },
  { name: 'x_convert_format', description: 'Convert data between formats.', inputSchema: { type: 'object', properties: { data: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' } }, required: ['data', 'from', 'to'] } },
  { name: 'x_monitor_account', description: 'Set up account monitoring.', inputSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_monitor_keyword', description: 'Monitor keywords in real-time.', inputSchema: { type: 'object', properties: { keyword: { type: 'string' } }, required: ['keyword'] } },
  { name: 'x_follower_alerts', description: 'Set up follower change alerts.', inputSchema: { type: 'object', properties: { username: { type: 'string' } } } },
  { name: 'x_track_engagement', description: 'Track engagement on specific posts.', inputSchema: { type: 'object', properties: { tweetId: { type: 'string' } }, required: ['tweetId'] } },
  { name: 'x_find_influencers', description: 'Find influencers in a niche.', inputSchema: { type: 'object', properties: { niche: { type: 'string' }, count: { type: 'number' } }, required: ['niche'] } },
  { name: 'x_smart_target', description: 'Smart audience targeting.', inputSchema: { type: 'object', properties: { criteria: { type: 'object' } }, required: ['criteria'] } },
  { name: 'x_crypto_analyze', description: 'Analyze crypto/token Twitter communities.', inputSchema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } },
];

// ============================================================================
// Skill Categories
// ============================================================================

const CATEGORY_PATTERNS = {
  scraping: /^x_(get|scrape)_/,
  posting: /^x_(post|tweet|reply|retweet|repost|create_poll|quote_tweet|auto_comment|auto_retweet|auto_like)/,
  analytics: /^x_(analytics|engagement|performance|audience|creator|get_analytics|get_post_analytics|audience_insights|engagement_report|creator_analytics|predict|best_time|analyze_voice|analyze_sentiment)/,
  automation: /^x_(auto_|schedule|workflow|bulk|evergreen|rss)/,
  management: /^x_(unfollow|follow|block|mute|unmute|detect_unfollowers|smart_unfollow|detect_bots)/,
  profile: /^x_(profile|update_profile|get_settings|toggle_protected|check_premium)/,
  graph: /^x_graph_/,
  persona: /^x_persona_/,
  streaming: /^x_stream_/,
  content: /^x_(generate|rewrite|optimize|summarize|suggest_hashtags|generate_variations|publish_article)/,
  monitoring: /^x_(monitor_|follower_alerts|track_engagement|brand_monitor|reputation)/,
  data: /^x_(export|import|convert|migrate|diff|dataset|history|growth_rate|compare_accounts|audience_overlap)/,
  crm: /^x_crm_/,
  messaging: /^x_(send_dm|get_conversations|export_dms|notify)/,
  discovery: /^x_(get_trends|get_explore|find_influencers|smart_target|get_recommendations|crypto_analyze)/,
  lists: /^x_(get_lists|get_list_members)/,
  spaces: /^x_(get_spaces|scrape_space)/,
  grok: /^x_grok_/,
  teams: /^x_team_/,
  bookmarks: /^x_(bookmark|get_bookmarks|clear_bookmarks)/,
  video: /^x_download_video/,
};

/** Platform tags inferred from tool capabilities */
const PLATFORM_KEYWORDS = {
  twitter: ['twitter', 'tweet', 'retweet', 'dm', 'x_'],
  bluesky: ['bluesky', 'bsky'],
  mastodon: ['mastodon', 'fediverse'],
  threads: ['threads'],
};

// ============================================================================
// Registry State (singleton)
// ============================================================================

let _skills = null;
let _initialized = false;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Convert an MCP tool definition to an A2A skill descriptor.
 *
 * @param {object} tool - MCP tool { name, description, inputSchema }
 * @returns {object} A2A skill
 */
export function convertMcpToolToA2aSkill(tool) {
  const id = `xactions.${tool.name}`;
  const nameParts = tool.name.replace(/^x_/, '').split('_');
  const displayName = nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Generate tags from tool name
  const tags = [...new Set([
    ...nameParts,
    ...detectPlatformTags(tool),
    detectCategoryTag(tool.name),
  ].filter(Boolean))];

  return {
    id,
    name: displayName,
    description: tool.description || '',
    tags,
    inputSchema: tool.inputSchema || { type: 'object', properties: {} },
    outputSchema: { type: 'object', properties: { result: { type: 'object' } } },
  };
}

/**
 * Detect platform tags from a tool definition.
 *
 * @param {object} tool
 * @returns {string[]}
 */
function detectPlatformTags(tool) {
  const tags = ['twitter']; // Default: all tools support Twitter
  const desc = (tool.description || '').toLowerCase();
  const schema = JSON.stringify(tool.inputSchema || {}).toLowerCase();
  if (desc.includes('bluesky') || schema.includes('bluesky')) tags.push('bluesky');
  if (desc.includes('mastodon') || schema.includes('mastodon')) tags.push('mastodon');
  if (desc.includes('threads') || schema.includes('threads')) tags.push('threads');
  return tags;
}

/**
 * Detect the primary category tag for a tool name.
 *
 * @param {string} toolName
 * @returns {string|null}
 */
function detectCategoryTag(toolName) {
  for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(toolName)) return cat;
  }
  return null;
}

/**
 * Initialize the skill registry.
 */
function ensureInitialized() {
  if (_initialized) return;
  _skills = new Map();
  for (const tool of BASE_MCP_TOOLS) {
    const skill = convertMcpToolToA2aSkill(tool);
    _skills.set(skill.id, skill);
  }
  // Try to load plugin tools (best-effort, non-blocking)
  try {
    const pluginTools = getPluginTools();
    if (Array.isArray(pluginTools)) {
      for (const tool of pluginTools) {
        const skill = convertMcpToolToA2aSkill(tool);
        _skills.set(skill.id, skill);
      }
    }
  } catch {
    // Plugins not yet initialized — base tools are sufficient
  }
  _initialized = true;
  console.log(`📋 A2A Skill Registry initialized: ${_skills.size} skills registered`);
}

/**
 * Get skill categories with their member skills.
 *
 * @returns {Record<string, object[]>}
 */
export function getSkillCategories() {
  ensureInitialized();
  const categories = {};
  for (const [cat] of Object.entries(CATEGORY_PATTERNS)) {
    categories[cat] = [];
  }
  categories['other'] = [];
  for (const skill of _skills.values()) {
    let placed = false;
    // Use the tool name (strip xactions. prefix) for categorization
    const toolName = skill.id.replace('xactions.', '');
    for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS)) {
      if (pattern.test(toolName)) {
        categories[cat].push(skill);
        placed = true;
        break;
      }
    }
    if (!placed) categories['other'].push(skill);
  }
  return categories;
}

/**
 * Search skills by query text and/or tags.
 *
 * @param {string} [query=''] - Text to search in skill name/description
 * @param {string[]} [tags=[]] - Tags to filter by (OR matching)
 * @returns {object[]} Matching skills
 */
export function searchSkills(query = '', tags = []) {
  ensureInitialized();
  const q = query.toLowerCase();
  const results = [];
  for (const skill of _skills.values()) {
    let match = false;
    if (q && (
      skill.id.toLowerCase().includes(q) ||
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q)
    )) {
      match = true;
    }
    if (tags.length > 0 && tags.some(t => skill.tags.includes(t))) {
      match = true;
    }
    if (!q && tags.length === 0) match = true;
    if (match) results.push(skill);
  }
  return results;
}

/**
 * Get a single skill by its A2A skill ID.
 *
 * @param {string} skillId - e.g. 'xactions.x_get_profile'
 * @returns {object|null}
 */
export function getSkillById(skillId) {
  ensureInitialized();
  return _skills.get(skillId) || null;
}

/**
 * Get all registered A2A skills.
 *
 * @returns {object[]}
 */
export function getAllSkills() {
  ensureInitialized();
  return Array.from(_skills.values());
}

/**
 * Re-scan MCP tools and plugins to rebuild the skill list.
 *
 * @returns {number} New skill count
 */
export function refreshSkills() {
  _initialized = false;
  _skills = null;
  ensureInitialized();
  return _skills.size;
}
