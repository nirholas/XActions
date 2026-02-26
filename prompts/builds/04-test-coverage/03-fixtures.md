# Build 04-03 — Test Fixtures (Real Twitter Response Snapshots)

> **Creates:** `tests/fixtures/` directory with real response structure files

---

## Task

Create realistic test fixtures based on actual Twitter GraphQL API response structures. These are NOT mock data — they are structurally accurate JSON snapshots that mirror real API responses, used for deterministic testing.

---

## Fixture Files

### `tests/fixtures/twitter/profile.json`

Structure based on Twitter's `UserByScreenName` GraphQL endpoint:

```json
{
  "data": {
    "user": {
      "result": {
        "__typename": "User",
        "id": "VXNlcjoxMjM0NTY3ODk=",
        "rest_id": "123456789",
        "legacy": {
          "screen_name": "testuser",
          "name": "Test User",
          "description": "A test account for XActions testing",
          "location": "San Francisco, CA",
          "url": "https://t.co/example",
          "created_at": "Mon Jan 01 00:00:00 +0000 2020",
          "followers_count": 1234,
          "friends_count": 567,
          "statuses_count": 8901,
          "favourites_count": 2345,
          "listed_count": 67,
          "media_count": 123,
          "verified": false,
          "profile_image_url_https": "https://pbs.twimg.com/profile_images/123/photo_normal.jpg",
          "profile_banner_url": "https://pbs.twimg.com/profile_banners/123/1600000000",
          "pinned_tweet_ids_str": ["1234567890123456789"],
          "default_profile": false,
          "default_profile_image": false,
          "protected": false
        },
        "is_blue_verified": true,
        "professional": {
          "rest_id": "123",
          "professional_type": "Creator",
          "category": [{"id": 1, "name": "Technology"}]
        }
      }
    }
  }
}
```

### `tests/fixtures/twitter/tweets.json`

Structure based on `UserTweets` GraphQL endpoint:

```json
{
  "data": {
    "user": {
      "result": {
        "timeline_v2": {
          "timeline": {
            "instructions": [
              {
                "type": "TimelineAddEntries",
                "entries": [
                  {
                    "entryId": "tweet-1234567890",
                    "sortIndex": "1234567890",
                    "content": {
                      "entryType": "TimelineTimelineItem",
                      "itemContent": {
                        "itemType": "TimelineTweet",
                        "tweet_results": {
                          "result": {
                            "__typename": "Tweet",
                            "rest_id": "1234567890",
                            "core": {
                              "user_results": {
                                "result": {
                                  "legacy": {
                                    "screen_name": "testuser",
                                    "name": "Test User"
                                  }
                                }
                              }
                            },
                            "legacy": {
                              "full_text": "This is a test tweet for XActions testing 🚀",
                              "created_at": "Wed Jan 15 12:00:00 +0000 2025",
                              "favorite_count": 42,
                              "retweet_count": 10,
                              "reply_count": 5,
                              "quote_count": 2,
                              "bookmark_count": 3,
                              "lang": "en",
                              "entities": {
                                "hashtags": [{"text": "testing"}],
                                "urls": [],
                                "user_mentions": []
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  {
                    "entryId": "cursor-bottom-1234",
                    "content": {
                      "entryType": "TimelineTimelineCursor",
                      "value": "DAACCgACGdy0vZwpJhAKAAMZ3LS9m8kmEAAAAAA=",
                      "cursorType": "Bottom"
                    }
                  }
                ]
              }
            ]
          }
        }
      }
    }
  }
}
```

### `tests/fixtures/twitter/followers.json`

```json
{
  "data": {
    "user": {
      "result": {
        "timeline": {
          "timeline": {
            "instructions": [
              {
                "type": "TimelineAddEntries",
                "entries": [
                  {
                    "entryId": "user-111222333",
                    "content": {
                      "entryType": "TimelineTimelineItem",
                      "itemContent": {
                        "itemType": "TimelineUser",
                        "user_results": {
                          "result": {
                            "__typename": "User",
                            "rest_id": "111222333",
                            "legacy": {
                              "screen_name": "follower1",
                              "name": "Follower One",
                              "followers_count": 500,
                              "friends_count": 200,
                              "description": "A follower",
                              "verified": false,
                              "profile_image_url_https": "https://pbs.twimg.com/profile_images/111/photo_normal.jpg"
                            },
                            "is_blue_verified": false
                          }
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      }
    }
  }
}
```

### `tests/fixtures/twitter/search.json`

```json
{
  "data": {
    "search_by_raw_query": {
      "search_timeline": {
        "timeline": {
          "instructions": [
            {
              "type": "TimelineAddEntries",
              "entries": [
                {
                  "entryId": "tweet-9876543210",
                  "content": {
                    "entryType": "TimelineTimelineItem",
                    "itemContent": {
                      "itemType": "TimelineTweet",
                      "tweet_results": {
                        "result": {
                          "__typename": "Tweet",
                          "rest_id": "9876543210",
                          "core": {
                            "user_results": {
                              "result": {
                                "legacy": {
                                  "screen_name": "searchresult",
                                  "name": "Search Result"
                                }
                              }
                            }
                          },
                          "legacy": {
                            "full_text": "This matches the search query",
                            "created_at": "Thu Jan 16 08:00:00 +0000 2025",
                            "favorite_count": 100,
                            "retweet_count": 25
                          }
                        }
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

### `tests/fixtures/twitter/errors.json`

```json
{
  "notFound": {
    "errors": [
      {
        "message": "User not found.",
        "code": 34
      }
    ]
  },
  "suspended": {
    "errors": [
      {
        "message": "User has been suspended.",
        "code": 63
      }
    ]
  },
  "rateLimited": {
    "errors": [
      {
        "message": "Rate limit exceeded.",
        "code": 88
      }
    ]
  },
  "protected": {
    "data": {
      "user": {
        "result": {
          "__typename": "User",
          "legacy": {
            "protected": true,
            "screen_name": "protecteduser"
          }
        }
      }
    }
  }
}
```

### `tests/fixtures/twitter/rateLimit.json`

```json
{
  "headers": {
    "normal": {
      "x-rate-limit-limit": "50",
      "x-rate-limit-remaining": "49",
      "x-rate-limit-reset": "1705000000"
    },
    "nearLimit": {
      "x-rate-limit-limit": "50",
      "x-rate-limit-remaining": "2",
      "x-rate-limit-reset": "1705000000"
    },
    "exhausted": {
      "x-rate-limit-limit": "50",
      "x-rate-limit-remaining": "0",
      "x-rate-limit-reset": "1705000900"
    }
  }
}
```

### `tests/fixtures/index.js`

```javascript
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load a fixture JSON file.
 * @param {string} path - Relative path from fixtures dir, e.g. 'twitter/profile.json'
 */
export async function loadFixture(path) {
  const content = await readFile(join(__dirname, path), 'utf-8');
  return JSON.parse(content);
}

/**
 * Load a fixture synchronously (for use in vi.fn() mock returns).
 */
export function loadFixtureSync(path) {
  const { readFileSync } = require('node:fs');
  const content = readFileSync(join(__dirname, path), 'utf-8');
  return JSON.parse(content);
}

// Pre-loaded fixtures for convenience
export { default as profileFixture } from './twitter/profile.json' with { type: 'json' };
export { default as tweetsFixture } from './twitter/tweets.json' with { type: 'json' };
export { default as followersFixture } from './twitter/followers.json' with { type: 'json' };
export { default as searchFixture } from './twitter/search.json' with { type: 'json' };
export { default as errorsFixture } from './twitter/errors.json' with { type: 'json' };
export { default as rateLimitFixture } from './twitter/rateLimit.json' with { type: 'json' };
```

---

## Acceptance Criteria
- [ ] 6 fixture JSON files with structurally accurate Twitter responses
- [ ] Profile, tweets, followers, search, errors, and rate limit fixtures
- [ ] Fixtures use real GraphQL response structure (UserByScreenName, UserTweets, etc.)
- [ ] Error fixtures cover not-found (code 34), suspended (code 63), rate-limited (code 88)
- [ ] Rate limit header fixtures (normal, near-limit, exhausted)
- [ ] Fixture loader utility with sync and async options
- [ ] All fixtures parse as valid JSON
