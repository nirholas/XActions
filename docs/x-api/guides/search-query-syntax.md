# Search query syntax

A query is a string of keywords and operators. The same language is used by recent search, full-archive search, post counts and (with extra operators) filtered stream rules. This guide explains how a query is put together and lists the operators.

Official pages: https://docs.x.com/x-api/posts/search/integrate/build-a-query and https://docs.x.com/x-api/posts/search/integrate/operators

## Endpoints that take a query

- `GET /2/tweets/search/recent`: posts from the last 7 days.
- `GET /2/tweets/search/all`: posts back to 2006. Available to pay-per-use and enterprise accounts.
- `GET /2/tweets/counts/recent` and `GET /2/tweets/counts/all`: counts instead of posts, using the same query language.

## Length limits

- Recent search: 512 characters on self-serve access, 4,096 on enterprise.
- Full-archive search: 1,024 characters on self-serve access, 4,096 on enterprise.

Long lists of accounts are the usual cause of an over-length query. Split them across several requests and merge the results by post id.

## How operators combine

- A space means AND. `cat dog` needs both words.
- `OR` must be uppercase. `cat OR dog` needs either.
- AND binds tighter than OR. `cat dog OR bird` means `(cat dog) OR bird`. Add parentheses to say what you mean.
- Parentheses group. `(cat OR dog) lang:en`.
- A leading `-` negates a single term or a single operator. `cat -grumpy`, `-is:retweet`.
- Do not negate a group. `-(a b)` is not valid. Negate the terms one by one.
- A quoted string is an exact phrase. A bare word is matched as a token, not as a substring.

## Standalone and conjunction-required operators

Operators fall into two classes, and the class decides whether a query is valid.

- Standalone operators can make a query on their own. `from:example` alone is fine.
- Conjunction-required operators cannot. They only narrow a result set and need at least one standalone operator beside them. `has:media` alone is rejected with a 400. `cats has:media` works.

Negated forms follow the same rule. `-is:retweet` alone is rejected.

## Operators that match content

- `keyword`: a token match in the post body.
- `"exact phrase"`: the phrase, in order.
- `emoji`: an emoji in the body.
- `#tag`: a hashtag, exact match.
- `@name`: a mention of the account.
- `$sym`: a cashtag.
- `url:"..."`: a tokenized match against the url or expanded url.

## Operators that match people

- `from:name` (also an id): posts written by the account.
- `to:name`: posts that are replies to the account.
- `retweets_of:name`: reposts of that account's posts.
- `list:id`: posts by members of a list.

## Operators that match relationships between posts

- `conversation_id:id`: every post in a thread.
- `in_reply_to_tweet_id:id`: direct replies to a post.
- `retweets_of_tweet_id:id`: reposts of a post.
- `quotes_of_tweet_id:id`: quote posts of a post.

## Operators that match annotations

- `context:domain.entity`: a context annotation pair, written as two numeric ids joined by a dot.
- `entity:"name"`: an annotation by string value. Recent search only.

## Operators that match place

- `place:name_or_id`
- `place_country:XX` using a two-letter country code
- `point_radius:[lon lat radius]` where the radius is in km or mi
- `bounding_box:[west south east north]`

Place operators only match posts that carry geo data, which is a small share of all posts.

## Conjunction-required operators

State and type of post:

- `is:retweet`, `is:reply`, `is:quote`, `is:verified`
- `-is:nullcast`: drops promoted-only posts. This one is only valid in negated form.

Content present in the post:

- `has:hashtags`, `has:cashtags`, `has:links`, `has:mentions`
- `has:media`, `has:images`, `has:video_link`, `has:geo`

Language:

- `lang:xx` with a code such as `en`, `es`, `ja`, `pt`, `zh-CN`, `zh-TW`. Hebrew is `iw` and Indonesian is `in`. One language per operator. Combine several with OR.

## Engagement thresholds

These are standalone operators in the current documentation:

- `min_likes:N`
- `min_replies:N`
- `min_reposts:N`

The older names `min_faves` and `min_retweets` are rejected with a 400, so update any saved queries that use them.

## Stream-only operators

Filtered stream rules accept everything above plus some extra operators that search does not. These include a proximity match written as `"word1 word2"~N` (N up to 6), `sample:N` for a percentage sample, profile matches such as `bio:`, `bio_name:` and `bio_location:`, account-size filters such as `min_followers:`, `followers_count:`, `following_count:`, `tweets_count:` and `listed_count:`, link filters such as `url_title:`, `url_description:` and `url_contains:`, `source:`, and affiliate filters `from_affiliate_of:` and `to_affiliate_of:`. Enterprise accounts also get embedding-based operators. See the streaming guide.

## Worked examples

Original posts about a topic in English, no reposts or replies:

```
"open source" maps lang:en -is:retweet -is:reply
```

Posts from either of two accounts that carry an image:

```
(from:alice OR from:bob) has:images
```

Replies to one account that contain a link, skipping promoted posts:

```
to:alice has:links -is:nullcast
```

Popular posts with a tag:

```
#rustlang min_likes:200 -is:retweet
```

Everything in a thread except the author's own posts, using ids:

```
conversation_id:1234567890123456789 -from:alice
```

Posts near a point that mention either of two words:

```
(coffee OR espresso) point_radius:[-122.33 47.61 5km]
```

Cashtag chatter from verified authors:

```
$ABC is:verified -is:retweet
```

## Tips

- Start small and add operators until the result count looks right. Counts endpoints let you check volume before you pay to read posts.
- Put the strongest standalone operator first. It makes queries easier to read.
- Quote anything with punctuation.
- Keep a test list of queries and run them against the validator your client uses, so a rejected operator shows up before production.
- Combine with `start_time`, `end_time`, `since_id` and `until_id` to scope the window. See the pagination guide.

The official docs at docs.x.com are authoritative, and XActions is not affiliated with X Corp.
