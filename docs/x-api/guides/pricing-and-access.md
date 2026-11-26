# Pricing and access

As of 2026-11-26. Prices and rules change, so treat the numbers below as a snapshot and confirm them in the developer console before you budget.

Official pages: https://docs.x.com/x-api/getting-started/pricing, https://docs.x.com/x-api/getting-started/getting-access and https://docs.x.com/x-api/getting-started/free-credits

## The current model

The documentation describes one self-serve model: pay per usage with prepaid credits. There are no monthly subscription tiers in the current docs. You buy credits, and each request draws them down according to what it reads or writes. Enterprise access, with custom contracts, higher limits and extra products, is arranged separately with X.

The docs describe only pay-per-usage for self-serve accounts. Whether any older free allowance still exists is not stated, so do not design around one.

## What is billed

Reads are billed per resource returned. If a call returns 100 posts you pay for 100 posts. Writes and a few other calls are billed per request.

Published read prices, in US dollars per resource:

- Posts: 0.005
- Lists, spaces, communities, notes, profile updates: 0.005
- Users, DM events, following and followers: 0.01
- Likes, mutes, blocks: 0.001

Published request prices:

- Create a post: 0.015. With a URL in the text: 0.20. A reply that was triggered by a mention of the account ("summoned"): 0.01.
- Create a DM or a user interaction (follow, like and similar): 0.015
- Delete an interaction: 0.01
- Create a list: 0.01. Manage a list: 0.005
- Content management, bookmarks, media metadata: 0.005
- Update privacy settings: 0.01
- Post counts: 0.005 for recent, 0.01 for full archive
- Trends: 0.01

There is a reduced rate for owned reads. When the authenticated user owns the app and reads their own timeline or mentions, each resource costs 0.001 instead of the normal post price.

Account Activity and X Activity events have their own per-event prices on a separate page: https://docs.x.com/x-api/getting-started/pricing and the event-pricing page it links to. One event type, `news.new`, is listed on one page with a price and on another as enterprise only, so check before using it.

## Deduplication

Reading the same resource more than once inside a 24-hour window, counted in UTC, is billed once. Repeated polling of the same post therefore costs less than the raw call count suggests, but a new window starts at midnight UTC.

## Caps and limits that affect cost

- Post reads on pay-per-usage are capped at 3 million per monthly billing cycle. Going past that needs an enterprise arrangement.
- Rate limits still apply on top of billing. See the rate limits guide.
- A spending limit can be set in the console. When reached, requests stop until the next cycle or until you raise it.

## Credits

- Buy credits in the console with a card.
- Auto-recharge tops up your balance when it runs low. It runs at most once every five minutes and pauses if the balance reaches zero or goes negative, so a heavy burst can still run you dry.
- When credits run out the API refuses requests. The docs do not list a specific HTTP status for this case, so handle any 4xx with a problem body that mentions credits or usage, and see the errors guide.

### Promotional credits

The free credits page describes introductory offers. At the time of writing, a new account can receive 20 dollars of credit after adding a card and making a first purchase. A first auto-recharge may be matched, up to 50 dollars. Promotional credits expire after three months. Another program gives bonus xAI API credits that scale with spend: none under 200 dollars, 10 percent from 200 to 499, 15 percent from 500 to 999 and 20 percent from 1,000 up, and it requires linking an xAI team. These offers have changed more than once, so read the live page.

## Getting keys

1. Go to https://console.x.com and sign in with an X account.
2. Accept the Developer Agreement and Policy and fill in a short profile of how you will use the API.
3. Create an app. Give it a name, a description and a use case.
4. The console generates credentials. Save them right away, because they are shown once. Regenerating invalidates the old ones.

You receive these:

- API key and secret: identify the app, mint bearer tokens, sign OAuth 1.0a requests.
- Bearer token: app-only reads of public data.
- Access token and secret: act as the account that owns the app, with OAuth 1.0a.
- Client id and secret: OAuth 2.0 user-context flows.

Which one to use for which job is covered in the authentication guide.

Keep secrets in environment variables or a secret manager, keep them out of git, rotate them on a schedule and request the fewest scopes your feature needs.

## Planning a budget

- Estimate resources, not calls. A timeline page of 100 posts costs about 0.50 dollars at the post rate.
- Use counts endpoints to size a topic before you read it.
- Trim `expansions`. Included users are returned resources and may be billed.
- Cache aggressively, and use the dedupe window by re-reading the same ids in one UTC day.
- Prefer streams over polling when you need continuous coverage and compare the stream cost with polling.
- Set a spending limit while developing.

## Where XActions fits

XActions can drive X through the browser, which does not use API credits, and through the official API when you have a key. Use the API for reliability and long-term compliance. Use browser automation where the API does not expose a feature or the cost does not fit.

The official docs at docs.x.com are authoritative, and XActions is not affiliated with X Corp.
