# X API v2 errors

This guide lists the HTTP status codes and error shapes the X API v2 returns and how to fix each one. The official reference is https://docs.x.com/x-api/fundamentals/response-codes-and-errors.

## Status codes

Success:

- 200: the request worked. Check for a partial `errors` array (see below).
- 201: a resource was created.
- 204: success with no body, typical for some deletes.

Client errors:

- 400 Bad Request: invalid JSON, a malformed query, a missing required parameter, a wrong parameter type.
- 401 Unauthorized: missing or invalid credentials, or the wrong auth method for the endpoint.
- 403 Forbidden: the credentials are valid but not allowed. Causes include an endpoint your access does not cover, a missing OAuth scope, a protected or private resource, or an IP allowlist mismatch.
- 404 Not Found: the resource does not exist or was deleted.
- 409 Conflict: on the filtered stream, the stream has no rules. In the broadcast APIs it means a source or broadcast state conflict.
- 413: a response was too large (for example, one very large chat media item). Retrying fails the same way.
- 429 Too Many Requests: a rate limit or a usage cap was hit.

Server errors:

- 500, 502, 503, 504: transient on X's side. Retry with backoff and check the status page at https://developer.x.com/status.

## Body format

v2 uses the "problem details" shape:

```json
{
  "title": "Invalid Request",
  "detail": "One or more parameters to your request was invalid.",
  "type": "https://api.x.com/2/problems/invalid-request"
}
```

- `type` is a URI that names the problem.
- `title` is a short label.
- `detail` is the specific explanation for this call.
- Other fields can appear depending on the type. Resource-level problems add `resource_id`, `resource_type`, `parameter` and `value`.

Some older paths still return `{"errors":[{"code":88,"message":"Rate limit exceeded"}]}` for rate limits.

## Problem types

- `about:blank`: no specific type. Use the HTTP status code.
- `invalid-request`: bad parameters or a malformed request. Read `detail` and fix the named parameter.
- `resource-not-found`: the post, user or other id does not exist. Check the id. Deleted and suspended resources look like this.
- `not-authorized-for-resource`: you cannot see this content (private or protected), or your account's IP allowlist blocked the call. If `detail` says "client IP not allowed", add your egress IP to the allowlist in the console settings.
- `not-authorized-for-field`, `field-unauthorized`: you asked for a field you cannot read, such as a non-public metric. Drop the field or use the owner's user-context token.
- `field-hydration-failure`: a requested field or expansion could not be filled in. Treat it as partial data.
- `resource-unavailable`: the resource exists but is withheld or otherwise not available.
- `disallowed-resource`: the resource type is not allowed for this call.
- `client-forbidden`: your app is not enrolled for this product or lacks the needed access. Check your plan and credits in the console.
- `missing-scopes`: the OAuth 2.0 token lacks a scope. Re-authorize with the scope named in `detail`. See [authentication.md](authentication.md).
- `usage-capped`: a usage or spend cap was reached. Raise the cap or add credits. Waiting for the 15 minute reset will not help.
- `rate-limit-exceeded`: a window limit was hit. Wait for `x-rate-limit-reset`. See [rate-limits.md](rate-limits.md).
- `conflict`: the target is in a state that blocks the action.
- `response-too-large`: the payload cannot be returned in one response.
- `internal-error`: a server problem. Retry with backoff.
- `streaming-connection`: a problem with the stream connection, such as an operational disconnect or too many connections.
- `operational-disconnect`: X closed the stream for operational reasons. Reconnect with backoff.
- `rule-cap`: you have too many filtered stream rules.
- `invalid-rules`: a stream rule failed to parse.
- `duplicate-rules`: that rule already exists.
- `encryption-required`, `xchat-setup-required`, `recipient-xchat-setup-required`, `unencrypted-send-not-allowed`: encrypted chat requirements. The sender or recipient must set up encrypted chat, or you must send through the encrypted endpoints.
- `recipient-not-messageable`: the DM recipient cannot receive your message.
- `dm-*` problems (for example `dm-text-too-long`, `dm-rate-limited`, `dm-sender-blocks-recipient`, `dm-recipient-not-accepting`): direct message failures. The suffix says why. The OpenAPI spec lists the full set.

## Partial errors on a 200

When you ask for several resources, some may fail while others succeed. You get status 200 with both `data` and `errors`:

```json
{
  "data": [{ "id": "123", "text": "Hello" }],
  "errors": [
    {
      "resource_id": "456",
      "resource_type": "tweet",
      "title": "Not Found Error",
      "detail": "Could not find tweet with id: [456].",
      "type": "https://api.x.com/2/problems/resource-not-found"
    }
  ]
}
```

Always inspect `errors` even on success. The same thing happens when a requested field or expansion cannot be returned.

## Out of credits

On the pay-per-use model, requests fail once the credit balance is empty or slightly negative, until you add credits. Only successful responses that return data are billed. Turn on auto-recharge and spending limits to control this. See [pricing-and-access.md](pricing-and-access.md).

## Debugging checklist

1. Check the status code before parsing the body.
2. Read `type` and `detail`.
3. For 401, confirm the credential type matches the endpoint and the header format is right. For OAuth 1.0a, recheck the signature.
4. For 403, check plan access, scopes, privacy of the target, and the IP allowlist.
5. For 429, use the reset header.
6. Log the request id, endpoint, timestamp and sanitized headers so you can ask for help in the developer forum at https://devcommunity.x.com.

---

The official docs at docs.x.com are authoritative. XActions is not affiliated with X Corp.
