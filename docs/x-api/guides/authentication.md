# Authenticating with the X API v2

This guide explains the three ways to authenticate against the X API v2 and when each one fits. It is a third-party summary. The authority is the official documentation:

- Overview: https://docs.x.com/fundamentals/authentication/overview
- OAuth 2.0 with PKCE: https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- User access tokens walkthrough: https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token
- App-only bearer tokens: https://docs.x.com/fundamentals/authentication/oauth-2-0/application-only
- OAuth 1.0a: https://docs.x.com/fundamentals/authentication/oauth-1-0a/overview

## The credentials you get

When you create an app in the developer console (https://console.x.com) you receive several secrets. They are shown once, so store them in a secret manager right away. Regenerating a secret invalidates the old one.

- API key and API secret: identify your app. Used to mint a bearer token and to sign OAuth 1.0a requests.
- Bearer token: an app-only token for public, read-only data.
- Access token and access token secret: OAuth 1.0a credentials for the account that owns the app.
- Client ID (and, for confidential clients, client secret): OAuth 2.0 credentials for user-context flows.

## 1. App-only bearer token

Use this to read public data with no user involved. Requests carry the header `Authorization: Bearer <token>`.

You can copy the bearer token from the console, or mint one from your API key and secret with the client credentials grant:

```bash
curl -u "$API_KEY:$API_SECRET" \
  --data 'grant_type=client_credentials' \
  https://api.x.com/oauth2/token
```

The response contains `token_type: "bearer"` and an `access_token`.

Limits of this method:

- There is no "current user", so anything that writes, or reads private data, fails. That covers posting, DMs, bookmarks, and the user's own timeline.
- Rate limits are counted per app, not per user. See [rate-limits.md](rate-limits.md).
- Treat the token like a password. Always call over HTTPS.

## 2. OAuth 2.0 authorization code flow with PKCE (user context)

Use this to act for a user, with only the permissions (scopes) that user approved. It works with X API v2 only. Enable OAuth 2.0 in your app's authentication settings first. You must also register a callback URL, and X requires an exact string match against it.

Your app type decides whether you hold a client secret:

- Native app and single page app are public clients. No secret, so you send `client_id` in the body.
- Web app and automated app or bot are confidential clients. You get a client secret and send it as HTTP Basic auth (client ID as user name, secret as password) on token calls.

### Endpoints

- Authorize (send the user's browser here): `https://x.com/i/oauth2/authorize`
- Token (exchange and refresh): `https://api.x.com/2/oauth2/token`
- Revoke: `https://api.x.com/2/oauth2/revoke`

Note: the published OpenAPI document lists the authorize URL as `https://api.x.com/2/oauth2/authorize`, while the prose docs use the `x.com/i/oauth2/authorize` form. The browser-facing `x.com` form is the one shown in the walkthroughs.

### Step by step

1. Generate a random `code_verifier`. Derive `code_challenge` from it. Use method `S256` (SHA-256, base64url) in production. `plain` is accepted but weak. Also generate a random `state` (up to 500 characters).
2. Redirect the user to the authorize URL with these query parameters: `response_type=code`, `client_id`, `redirect_uri`, `scope` (space separated, URL encoded), `state`, `code_challenge`, `code_challenge_method`.
3. After approval X redirects to your `redirect_uri` with `code` and `state`. Check that `state` matches what you sent.
4. Within 30 seconds, POST to the token endpoint with `Content-Type: application/x-www-form-urlencoded` and the fields `code`, `grant_type=authorization_code`, `client_id`, `redirect_uri`, and `code_verifier`. Confidential clients add the Basic auth header.
5. Call the API with `Authorization: Bearer <access_token>`.

The authorization code lives for only 30 seconds after it is issued, so exchange it immediately.

### Token lifetime and refresh

An access token lasts two hours. If you included the `offline.access` scope in step 2, the token response also contains a refresh token. Without that scope you get no refresh token and the user must authorize again after two hours.

To refresh, POST to the same token endpoint with `grant_type=refresh_token` and the `refresh_token` (plus `client_id` for public clients, or Basic auth for confidential ones). Store the new refresh token you get back, since the old one may stop working. Serialize refreshes per user so two workers do not race.

To log a user out, POST the token (and `client_id`) to the revoke endpoint. Users can also revoke your app at https://x.com/settings/connected_apps.

### Scopes

Request only what you need. The scope names published in the OpenAPI document are below, each with a short description.

- `tweet.read`: read posts you can see, including from protected accounts.
- `tweet.write`: create posts and reposts for the user.
- `tweet.moderate.write`: hide and unhide replies to the user's posts.
- `users.read`: read any account profile the user can see.
- `users.write`: edit the user's own profile fields.
- `users.email`: read the user's email address (listed in the prose docs).
- `follows.read`: see who the user follows and who follows them.
- `follows.write`: follow and unfollow on the user's behalf.
- `like.read`: read posts the user liked and likes they can see.
- `like.write`: like and unlike posts.
- `mute.read`: read the muted accounts list.
- `mute.write`: mute and unmute accounts.
- `block.read`: read the blocked accounts list.
- `block.write`: block and unblock accounts.
- `bookmark.read`: read the user's bookmarks.
- `bookmark.write`: add and remove bookmarks.
- `list.read`: read lists, members and followers, including private lists.
- `list.write`: create and manage lists.
- `dm.read`: read direct messages.
- `dm.write`: send and manage direct messages.
- `media.write`: upload photos and video.
- `media.library.read`: read the media library, its analytics and monetization settings.
- `media.library.write`: add to the media library and manage monetization settings.
- `space.read`: read Spaces the user can access.
- `timeline.read`: read custom timelines the user can see.
- `broadcast.read`: read the user's live broadcasts and their chat.
- `broadcast.write`: manage broadcasts and send chat messages.
- `calls.read`: read the user's calls and calendar.
- `calls.write`: start, schedule, change and cancel calls, and answer invitations.
- `calls.join`: join calls, speak, chat and admit people.
- `saved_search.read`: read saved searches.
- `saved_search.write`: create and delete saved searches.
- `settings.read`: read account settings.
- `settings.write`: change account settings.
- `developer.read`: read developer accounts, apps and settings.
- `developer.write`: create and manage the developer platform account.
- `offline.access`: ask for a refresh token.

Which scope each endpoint needs is in the official mapping guide: https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping. Each operation in the OpenAPI spec also lists its accepted scopes.

## 3. OAuth 1.0a user context

This is the older scheme. Every request is signed with HMAC-SHA1, using your API key and secret plus a user's access token and secret. Tokens do not expire, but the user can revoke them.

To act for another user, run the three-legged flow:

1. POST `https://api.x.com/oauth/request_token` with your callback, signed with your app keys.
2. Send the user to `https://api.x.com/oauth/authorize?oauth_token=<request token>`.
3. On return you get an `oauth_verifier`. POST it with the request token to `https://api.x.com/oauth/access_token` to receive the user's access token and secret.

For your own account, copy the access token and secret from the console. Signing by hand is error prone (percent encoding, nonce, timestamp, parameter ordering), so use a library. The signing rules are at https://docs.x.com/fundamentals/authentication/oauth-1-0a/creating-a-signature.

Apps that already hold OAuth 1.0a user tokens can exchange them for OAuth 2.0 tokens without asking users to authorize again. See https://docs.x.com/fundamentals/authentication/oauth-2-0/oauth-1-0a-token-exchange.

## Which one to use

- Reading public posts, profiles, counts, or search results: bearer token.
- A multi-user product where each user signs in and approves permissions: OAuth 2.0 with PKCE. It gives you scopes and refresh tokens.
- A script that acts as your own account and you want the least setup: OAuth 1.0a access token from the console, or OAuth 2.0 with `offline.access` if you prefer scopes.
- Endpoints that need a user (posting, DMs, bookmarks, timelines of "me"): a user-context method. A bearer token will be rejected.
- Every v2 operation in the current OpenAPI spec that accepts OAuth 1.0a also accepts OAuth 2.0 user tokens, so new projects can use OAuth 2.0 throughout. Legacy v1.1 endpoints are a separate matter.

Rate limits differ by method. App-only calls share a per-app bucket, user-context calls use a per-user bucket. See [rate-limits.md](rate-limits.md).

---

The official docs at docs.x.com are authoritative. XActions is not affiliated with X Corp.
