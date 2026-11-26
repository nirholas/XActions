# Fields and expansions

The X API v2 returns small objects by default. You ask for more with two kinds of query parameters: fields and expansions. This guide explains how they fit together and lists the values each parameter accepts.

Official page: https://docs.x.com/x-api/fundamentals/fields and https://docs.x.com/x-api/fundamentals/expansions

## The default response

A post comes back with three attributes: `id`, `text` and `edit_history_tweet_ids`. A user comes back with `id`, `name` and `username`. Anything else must be requested.

## Fields

A `*.fields` parameter takes a comma-separated list of attribute names for one object type. There is one parameter per object type:

- `tweet.fields` (posts)
- `user.fields`
- `media.fields`
- `place.fields`
- `poll.fields`
- `list.fields`
- `space.fields`
- `dm_event.fields`
- `community.fields`
- `topic.fields`

Rules worth remembering:

- Fields are all-or-nothing per attribute. You cannot ask for one key inside `public_metrics`. You get the whole group.
- Unknown values produce a 400 error that names the allowed set.
- A field is only returned when the post or user has a value for it. Missing keys mean "not set", not "denied".
- Fields apply to the primary objects and to any objects added through expansions.

### A note on `tweet.fields` and `post.fields`

The prose documentation and most client code use `tweet.fields`. The OpenAPI document published by X (checked at version 2.175) names the parameter `post.fields` on most operations and keeps `tweet.fields` on the stream and firehose operations. XActions treats the two names as the same parameter. Test both names against the live API when you generate a client, and keep the accepted one in a single constant.

## Post fields

Values listed in the OpenAPI enum for posts:

`article`, `article_title`, `attachments`, `card_uri`, `community_id`, `context_annotations`, `conversation_id`, `created_at`, `display_text_range`, `edit_controls`, `entities`, `geo`, `id`, `lang`, `matched_media_notes`, `media_metadata`, `non_public_metrics`, `note_post`, `note_request_suggestions`, `organic_metrics`, `paid_partnership`, `possibly_sensitive`, `promoted_metrics`, `public_metrics`, `reply_settings`, `scopes`, `source`, `suggested_source_links`, `suggested_source_links_with_counts`, `text`, `withheld`.

The prose docs also name these values, which are absent from that enum: `author_id`, `in_reply_to_user_id`, `referenced_tweets`, `edit_history_tweet_ids` and `note_tweet`. They are what most existing code requests, so keep them in your allow-list and let the live API be the judge.

## User fields

`active_follower_count`, `confirmed_email`, `connection_status`, `created_at`, `description`, `entities`, `id`, `is_identity_verified`, `location`, `name`, `org_only`, `parody`, `profile_banner_url`, `profile_image_url`, `protected`, `public_metrics`, `receives_your_chat`, `receives_your_dm`, `subscriber_count`, `subscribes_to_you`, `subscription`, `subscription_type`, `url`, `username`, `verified`, `verified_followers_count`, `verified_type`, `withheld`.

Some of these depend on the caller. `confirmed_email` needs the `users.email` scope. `connection_status`, `receives_your_dm` and `subscribes_to_you` describe the relationship with the authenticated user, so they need user context.

## Media fields

`alt_text`, `duration_ms`, `height`, `media_key`, `non_public_metrics`, `organic_metrics`, `preview_image_url`, `promoted_metrics`, `public_metrics`, `revenue`, `type`, `url`, `variants`, `width`.

Media objects only appear when you expand `attachments.media_keys`.

## Place, poll, list, space and others

- `place.fields`: `contained_within`, `country`, `country_code`, `full_name`, `geo`, `id`, `name`, `place_type`
- `poll.fields`: `duration_minutes`, `end_datetime`, `id`, `options`, `voting_status`
- `list.fields`: `created_at`, `description`, `follower_count`, `id`, `member_count`, `name`, `private`
- `space.fields`: `created_at`, `ended_at`, `id`, `is_ticketed`, `lang`, `participant_count`, `scheduled_start`, `started_at`, `state`, `subscriber_count`, `title`, `updated_at`
- `dm_event.fields`: `attachments`, `created_at`, `dm_conversation_id`, `entities`, `event_type`, `id`, `text`
- `community.fields`: `access`, `created_at`, `description`, `id`, `join_policy`, `member_count`, `name`
- `topic.fields`: `description`, `id`, `name`

## Expansions

Many attributes hold only an identifier, such as `author_id` or `attachments.media_keys`. The `expansions` parameter tells the API to also return the full object those identifiers point to.

Expanded objects do not replace the id. They arrive in a top-level `includes` object, grouped by type, and you join them yourself.

```json
{
  "data": [{ "id": "1", "text": "hi", "author_id": "42" }],
  "includes": {
    "users": [{ "id": "42", "name": "Example", "username": "example" }]
  }
}
```

To join: build a map from `includes.users[].id` to the user, then look up each post's `author_id`. `includes` is de-duplicated, so one user appears once even if they wrote ten of the posts. A referenced id can be missing from `includes` when the object was deleted or hidden. That case is reported in a top-level `errors` array on a 200 response, so check both.

Remember that expanding an id usually does not return it for you. Request `author_id` in `tweet.fields` as well, or you will have no key to join on.

### Expansions per object

Posts:
`article.cover_media`, `article.media_entities`, `attachments.media_keys`, `attachments.media_source_tweet`, `attachments.poll_ids`, `author_id`, `edit_history_post_ids`, `entities.mentions.username`, `geo.place_id`, `in_reply_to_user_id`, `referenced_posts`, `username`.

Users: `affiliation`, `most_recent_post_id`, `pinned_post_id`.

Lists: `owner_id`.

Spaces: `creator_id`, `host_ids`, `invited_user_ids`, `speaker_ids`, `topic_ids`.

DM events: `attachments.media_keys`, `participant_ids`, `referenced_posts`, `sender_id`.

Each expansion lands in a matching `includes` key: `users`, `tweets`, `media`, `polls`, `places`, and so on. Which `*.fields` parameter shapes the expanded objects follows the type. For example `expansions=author_id&user.fields=verified,public_metrics` shapes the included users.

## Metrics groups

Engagement counts are grouped by who may read them. Each group is a post field (or a media field) whose value is an object of counters.

- `public_metrics`: visible to anyone. Works with an app-only bearer token. For posts it carries reposts, quotes, likes, replies, impressions and bookmarks. For video media it carries `view_count`.
- `non_public_metrics`: private to the owner. Needs user context for a post you own. It includes URL link clicks, profile clicks, engagements and, for video, quartile playback counts.
- `organic_metrics`: counts from views that were not paid. User context, owner only.
- `promoted_metrics`: counts from views generated by advertising. User context, owner only, and only for posts that were promoted.

When a post was promoted, the public total is organic plus promoted. Ask for all three groups to see the split.

Non-public, organic and promoted metrics are only available for posts less than 30 days old. Older posts return the public group only. Requesting a private group for someone else's post fails the request.

Official page: https://docs.x.com/x-api/fundamentals/metrics

## Practical advice

- Request only what you use. Smaller payloads are faster, and since reads are billed per returned resource, extra expansions can raise cost by adding users or media to each response.
- Keep your field lists in one constant so tests can check them against the enum from the OpenAPI document.
- Always read `includes` defensively. Treat every lookup as possibly empty.

The official docs at docs.x.com are authoritative, and XActions is not affiliated with X Corp.
