/**
 * Twitter API Response Fixtures — Realistic mock data
 *
 * Every fixture matches the exact JSON structure Twitter's internal APIs
 * return. Data is fictional but structurally accurate. Used by integration
 * tests with mocked fetch — no real network requests.
 *
 * Sources: Twitter web client network inspection, the-convocation/twitter-scraper
 *
 * @author nich (@nichxbt)
 */

// ===========================================================================
// 1. PROFILE_RESPONSE — UserByScreenName GraphQL
// ===========================================================================

export const PROFILE_RESPONSE = {
  data: {
    user: {
      result: {
        __typename: 'User',
        id: 'VXNlcjoxODkwMTIzNDU2',
        rest_id: '1890123456',
        is_blue_verified: true,
        legacy: {
          created_at: 'Thu Jun 15 10:30:00 +0000 2017',
          name: 'Sarah Developer',
          screen_name: 'testuser',
          description: 'Full-stack dev 🚀 Building at @acmecorp. OSS contributor. https://t.co/abc123',
          location: 'San Francisco, CA',
          url: 'https://t.co/xyz789',
          protected: false,
          verified: false,
          followers_count: 24500,
          friends_count: 890,
          statuses_count: 12340,
          favourites_count: 45600,
          media_count: 567,
          listed_count: 310,
          profile_image_url_https: 'https://pbs.twimg.com/profile_images/189012/avatar_normal.jpg',
          profile_banner_url: 'https://pbs.twimg.com/profile_banners/1890123456/1680000000',
          pinned_tweet_ids_str: ['1800000000000000001'],
          entities: {
            url: {
              urls: [
                {
                  display_url: 'sarahdev.io',
                  expanded_url: 'https://sarahdev.io',
                  url: 'https://t.co/xyz789',
                  indices: [0, 23],
                },
              ],
            },
            description: {
              urls: [
                {
                  display_url: 'github.com/sarahdev',
                  expanded_url: 'https://github.com/sarahdev',
                  url: 'https://t.co/abc123',
                  indices: [55, 78],
                },
              ],
              hashtags: [],
              user_mentions: [
                {
                  screen_name: 'acmecorp',
                  indices: [30, 39],
                },
              ],
            },
          },
          birthdate: {
            day: 15,
            month: 6,
            year: 1992,
            visibility: 'Self',
            year_visibility: 'Self',
          },
        },
        professional: {
          rest_id: '1500000000000000000',
          professional_type: 'Business',
          category: [{ id: 4, name: 'Science & Technology' }],
        },
      },
    },
  },
};

// ===========================================================================
// 2. TWEETS_RESPONSE — UserTweets GraphQL (3 tweets + cursor)
// ===========================================================================

function makeTweetEntry(id, text, extraLegacy = {}, extraResult = {}) {
  return {
    entryId: `tweet-${id}`,
    sortIndex: id,
    content: {
      entryType: 'TimelineTimelineItem',
      __typename: 'TimelineTimelineItem',
      itemContent: {
        itemType: 'TimelineTweet',
        __typename: 'TimelineTweet',
        tweet_results: {
          result: {
            __typename: 'Tweet',
            rest_id: id,
            core: {
              user_results: {
                result: {
                  __typename: 'User',
                  rest_id: '1890123456',
                  legacy: {
                    screen_name: 'testuser',
                    name: 'Sarah Developer',
                    profile_image_url_https: 'https://pbs.twimg.com/profile_images/189012/avatar_normal.jpg',
                  },
                  is_blue_verified: true,
                },
              },
            },
            legacy: {
              id_str: id,
              full_text: text,
              created_at: 'Fri Jan 12 14:30:00 +0000 2024',
              favorite_count: 42,
              retweet_count: 7,
              reply_count: 3,
              quote_count: 1,
              bookmark_count: 5,
              conversation_id_str: id,
              lang: 'en',
              entities: { urls: [], hashtags: [], user_mentions: [], symbols: [] },
              ...extraLegacy,
            },
            ...extraResult,
          },
        },
      },
    },
  };
}

export const TWEETS_RESPONSE = {
  data: {
    user: {
      result: {
        __typename: 'User',
        timeline_v2: {
          timeline: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: [
                  // Tweet 1: Plain text
                  makeTweetEntry(
                    '1800000000000000001',
                    'Just shipped a new feature! 🚀 Check out the docs at https://t.co/short1',
                  ),
                  // Tweet 2: With media
                  makeTweetEntry(
                    '1800000000000000002',
                    'Here\'s a screenshot of the new dashboard',
                    {
                      extended_entities: {
                        media: [
                          {
                            id_str: '1800000000000000010',
                            media_url_https: 'https://pbs.twimg.com/media/FakeImg1.jpg',
                            type: 'photo',
                            sizes: {
                              large: { w: 1920, h: 1080 },
                              medium: { w: 1200, h: 675 },
                              small: { w: 680, h: 383 },
                              thumb: { w: 150, h: 150 },
                            },
                          },
                        ],
                      },
                    },
                  ),
                  // Tweet 3: Quote tweet
                  makeTweetEntry(
                    '1800000000000000003',
                    'This is a great take! 👏',
                    {},
                    {
                      quoted_status_result: {
                        result: {
                          __typename: 'Tweet',
                          rest_id: '1799000000000000000',
                          legacy: {
                            full_text: 'Original quoted tweet text here',
                            id_str: '1799000000000000000',
                          },
                          core: {
                            user_results: {
                              result: {
                                legacy: { screen_name: 'quoteduser', name: 'Quoted User' },
                              },
                            },
                          },
                        },
                      },
                    },
                  ),
                  // Bottom cursor
                  {
                    entryId: 'cursor-bottom-1800000000000000000',
                    sortIndex: '1800000000000000000',
                    content: {
                      entryType: 'TimelineTimelineCursor',
                      __typename: 'TimelineTimelineCursor',
                      value: 'DAABCgABF__-kVIAJxEKAAIW____pFYACAADAAAAAgAA',
                      cursorType: 'Bottom',
                    },
                  },
                  // Top cursor
                  {
                    entryId: 'cursor-top-1800000000000000099',
                    sortIndex: '1800000000000000099',
                    content: {
                      entryType: 'TimelineTimelineCursor',
                      __typename: 'TimelineTimelineCursor',
                      value: 'DAABCgABF__-kVIAABEKAAIX____pFYACAADAAAAAgAA',
                      cursorType: 'Top',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    },
  },
};

/** Second page — no cursor (signals end of timeline) */
export const TWEETS_RESPONSE_PAGE2 = {
  data: {
    user: {
      result: {
        __typename: 'User',
        timeline_v2: {
          timeline: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: [
                  makeTweetEntry(
                    '1800000000000000004',
                    'Older tweet from page 2',
                  ),
                  // No bottom cursor → end of timeline
                ],
              },
            ],
          },
        },
      },
    },
  },
};

// ===========================================================================
// 3. FOLLOWERS_RESPONSE — Followers GraphQL (5 users + cursor)
// ===========================================================================

function makeUserEntry(id, screenName, name, followersCount = 100) {
  return {
    entryId: `user-${id}`,
    sortIndex: id,
    content: {
      entryType: 'TimelineTimelineItem',
      __typename: 'TimelineTimelineItem',
      itemContent: {
        itemType: 'TimelineUser',
        __typename: 'TimelineUser',
        user_results: {
          result: {
            __typename: 'User',
            rest_id: id,
            is_blue_verified: false,
            legacy: {
              screen_name: screenName,
              name,
              description: `Bio of ${name}`,
              followers_count: followersCount,
              friends_count: Math.floor(followersCount / 2),
              profile_image_url_https: `https://pbs.twimg.com/profile_images/${id}/avatar_normal.jpg`,
              protected: false,
              verified: false,
            },
          },
        },
      },
    },
  };
}

export const FOLLOWERS_RESPONSE = {
  data: {
    user: {
      result: {
        __typename: 'User',
        timeline: {
          timeline: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: [
                  makeUserEntry('2001', 'alice_dev', 'Alice Dev', 5400),
                  makeUserEntry('2002', 'bob_codes', 'Bob Codes', 1200),
                  makeUserEntry('2003', 'carol_ml', 'Carol ML', 34000),
                  makeUserEntry('2004', 'dave_ops', 'Dave Ops', 890),
                  makeUserEntry('2005', 'eve_sec', 'Eve Sec', 15600),
                  // Bottom cursor
                  {
                    entryId: 'cursor-bottom-2000',
                    content: {
                      value: 'HBaGwLmVmpjR0y0AAA==',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    },
  },
};

/** Following list (different from followers for non-follower detection) */
export const FOLLOWING_RESPONSE = {
  data: {
    user: {
      result: {
        __typename: 'User',
        timeline: {
          timeline: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: [
                  // alice_dev and carol_ml are mutual (appear in both lists)
                  makeUserEntry('2001', 'alice_dev', 'Alice Dev', 5400),
                  makeUserEntry('2003', 'carol_ml', 'Carol ML', 34000),
                  // frank_ai and grace_ui are non-followers (only in following)
                  makeUserEntry('3001', 'frank_ai', 'Frank AI', 2100),
                  makeUserEntry('3002', 'grace_ui', 'Grace UI', 780),
                ],
              },
            ],
          },
        },
      },
    },
  },
};

// ===========================================================================
// 4. SEARCH_RESPONSE — SearchTimeline GraphQL (mixed results + cursor)
// ===========================================================================

export const SEARCH_RESPONSE = {
  data: {
    search_by_raw_query: {
      search_timeline: {
        timeline: {
          instructions: [
            {
              type: 'TimelineAddEntries',
              entries: [
                makeTweetEntry(
                  '1850000000000000001',
                  'JavaScript async/await is so powerful! Here\'s a quick tip thread 🧵',
                ),
                makeTweetEntry(
                  '1850000000000000002',
                  'RT @devguru: New JavaScript framework just dropped: BlazeFire.js 🔥',
                  { retweeted_status_result: {} },
                ),
                makeTweetEntry(
                  '1850000000000000003',
                  '@user123 Have you tried using the new Temporal API for dates in JavaScript?',
                  { in_reply_to_status_id_str: '1849000000000000000' },
                ),
                // Bottom cursor
                {
                  entryId: 'cursor-bottom-1850000000000000000',
                  content: {
                    entryType: 'TimelineTimelineCursor',
                    __typename: 'TimelineTimelineCursor',
                    value: 'scroll:thGAVUV0VFVBaAgLcmhtCpKgiyAiUBFQAVAAA=',
                    cursorType: 'Bottom',
                  },
                },
              ],
            },
          ],
        },
      },
    },
  },
};

// ===========================================================================
// 5. THREAD_RESPONSE — TweetDetail GraphQL (conversation thread)
// ===========================================================================

export const THREAD_RESPONSE = {
  data: {
    tweetResult: {
      result: {
        __typename: 'Tweet',
        rest_id: '1810000000000000001',
        core: {
          user_results: {
            result: {
              __typename: 'User',
              rest_id: '1890123456',
              legacy: { screen_name: 'testuser', name: 'Sarah Developer' },
              is_blue_verified: true,
            },
          },
        },
        legacy: {
          id_str: '1810000000000000001',
          full_text: '🧵 Thread on how to build a Twitter scraper (1/3)',
          created_at: 'Mon Jan 15 10:00:00 +0000 2024',
          conversation_id_str: '1810000000000000001',
          in_reply_to_status_id_str: null,
          favorite_count: 218,
          retweet_count: 45,
          reply_count: 12,
          entities: { urls: [], hashtags: [], user_mentions: [] },
        },
      },
    },
    // Twitter nests threaded replies in timeline instructions
    threaded_conversation_with_injections_v2: {
      instructions: [
        {
          type: 'TimelineAddEntries',
          entries: [
            // Focal tweet (same as above, repeated in timeline)
            {
              entryId: 'tweet-1810000000000000001',
              content: {
                itemContent: {
                  tweet_results: {
                    result: {
                      __typename: 'Tweet',
                      rest_id: '1810000000000000001',
                      legacy: {
                        id_str: '1810000000000000001',
                        full_text: '🧵 Thread on how to build a Twitter scraper (1/3)',
                        created_at: 'Mon Jan 15 10:00:00 +0000 2024',
                        conversation_id_str: '1810000000000000001',
                        in_reply_to_status_id_str: null,
                      },
                      core: {
                        user_results: {
                          result: {
                            rest_id: '1890123456',
                            legacy: { screen_name: 'testuser', name: 'Sarah Developer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            // Reply 2
            {
              entryId: 'tweet-1810000000000000002',
              content: {
                itemContent: {
                  tweet_results: {
                    result: {
                      __typename: 'Tweet',
                      rest_id: '1810000000000000002',
                      legacy: {
                        id_str: '1810000000000000002',
                        full_text: '2/3 First, you need to reverse-engineer the GraphQL API endpoints...',
                        created_at: 'Mon Jan 15 10:01:00 +0000 2024',
                        conversation_id_str: '1810000000000000001',
                        in_reply_to_status_id_str: '1810000000000000001',
                      },
                      core: {
                        user_results: {
                          result: {
                            rest_id: '1890123456',
                            legacy: { screen_name: 'testuser', name: 'Sarah Developer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            // Reply 3 (final)
            {
              entryId: 'tweet-1810000000000000003',
              content: {
                itemContent: {
                  tweet_results: {
                    result: {
                      __typename: 'Tweet',
                      rest_id: '1810000000000000003',
                      legacy: {
                        id_str: '1810000000000000003',
                        full_text: '3/3 Then handle rate limits, pagination, and error recovery. Done! ✅',
                        created_at: 'Mon Jan 15 10:02:00 +0000 2024',
                        conversation_id_str: '1810000000000000001',
                        in_reply_to_status_id_str: '1810000000000000002',
                      },
                      core: {
                        user_results: {
                          result: {
                            rest_id: '1890123456',
                            legacy: { screen_name: 'testuser', name: 'Sarah Developer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
};

// ===========================================================================
// 6. TWEET_CREATE_RESPONSE — CreateTweet mutation
// ===========================================================================

export const TWEET_CREATE_RESPONSE = {
  data: {
    create_tweet: {
      tweet_results: {
        result: {
          __typename: 'Tweet',
          rest_id: '1820000000000000001',
          core: {
            user_results: {
              result: {
                __typename: 'User',
                rest_id: '1890123456',
                legacy: {
                  screen_name: 'testuser',
                  name: 'Sarah Developer',
                },
                is_blue_verified: true,
              },
            },
          },
          legacy: {
            id_str: '1820000000000000001',
            full_text: 'Hello from the HTTP scraper! 🎉',
            created_at: 'Wed Jan 17 12:00:00 +0000 2024',
            favorite_count: 0,
            retweet_count: 0,
            reply_count: 0,
            quote_count: 0,
            bookmark_count: 0,
            conversation_id_str: '1820000000000000001',
            lang: 'en',
            entities: { urls: [], hashtags: [], user_mentions: [], symbols: [] },
          },
        },
      },
    },
  },
};

// ===========================================================================
// 7. LIKE_RESPONSE — FavoriteTweet mutation
// ===========================================================================

export const LIKE_RESPONSE = {
  data: {
    favorite_tweet: 'Done',
  },
};

// ===========================================================================
// 8. DELETE_TWEET_RESPONSE — DeleteTweet mutation
// ===========================================================================

export const DELETE_TWEET_RESPONSE = {
  data: {
    delete_tweet: {
      tweet_results: {},
    },
  },
};

// ===========================================================================
// 9. GUEST_TOKEN_RESPONSE — Guest activate endpoint
// ===========================================================================

export const GUEST_TOKEN_RESPONSE = {
  guest_token: '1890567890123456789',
};

// ===========================================================================
// 10. RATE_LIMIT_RESPONSE — 429 with rate limit headers
// ===========================================================================

/** HTTP 429 mock response factory. Call with optional resetTime (Unix seconds). */
export function makeRateLimitResponse(resetTimeSec = Math.floor(Date.now() / 1000) + 900) {
  return {
    status: 429,
    ok: false,
    json: async () => ({
      errors: [{ message: 'Rate limit exceeded', code: 88 }],
    }),
    headers: {
      get: (key) => {
        const headers = {
          'x-rate-limit-limit': '500',
          'x-rate-limit-remaining': '0',
          'x-rate-limit-reset': String(resetTimeSec),
        };
        return headers[key.toLowerCase()] ?? null;
      },
    },
  };
}

// ===========================================================================
// 11. AUTH_ERROR_RESPONSE — 401 unauthorized
// ===========================================================================

export function makeAuthErrorResponse() {
  return {
    status: 401,
    ok: false,
    json: async () => ({
      errors: [{ message: 'Could not authenticate you', code: 32 }],
    }),
    headers: {
      get: () => null,
    },
  };
}

// ===========================================================================
// 12. MEDIA_UPLOAD_RESPONSES — 3-step chunked upload
// ===========================================================================

export const MEDIA_INIT_RESPONSE = {
  media_id: 1830000000000000001,
  media_id_string: '1830000000000000001',
  expires_after_secs: 86400,
};

export const MEDIA_APPEND_RESPONSE = null; // 204 No Content — empty body

export const MEDIA_FINALIZE_RESPONSE = {
  media_id: 1830000000000000001,
  media_id_string: '1830000000000000001',
  media_key: '3_1830000000000000001',
  size: 2048576,
  expires_after_secs: 86400,
  processing_info: {
    state: 'succeeded',
    progress_percent: 100,
  },
};

// ===========================================================================
// 13. UserByScreenName resolver (for relationships/engagement username lookup)
// ===========================================================================

export const USER_RESOLVE_RESPONSE = {
  data: {
    user: {
      result: {
        __typename: 'User',
        rest_id: '1890123456',
        is_blue_verified: true,
        legacy: {
          screen_name: 'testuser',
          name: 'Sarah Developer',
        },
      },
    },
  },
};

// ===========================================================================
// Helper: wrap a JSON body in a Response-like mock object
// ===========================================================================

/**
 * Create a mock fetch Response-like object.
 * @param {object|null} body — JSON body (or null for 204)
 * @param {number} [status=200]
 * @param {object} [headers={}] — custom header key-value pairs
 * @returns {object}
 */
export function mockResponse(body = {}, status = 200, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    headers: {
      get: (key) => headers[key?.toLowerCase()] ?? null,
    },
  };
}
