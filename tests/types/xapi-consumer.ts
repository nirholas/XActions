// Compiled (never run) by tests/types/xapi-exports.test.js. It imports the
// package by name, so it proves the "./xapi" types condition resolves and that
// ordinary consumer code type-checks under --strict without @types/node.

import {
  XApiClient,
  XApiError,
  OPERATIONS,
  SOURCE,
  getOperation,
  listOperations,
  describeOperation,
  buildAuthorizeUrl,
  createPkcePair,
  createState,
  verifySignature,
  createWebhookHandler,
  rateLimitsFor,
} from 'xactions/xapi';
import type { XApiResult, XApiOperation, XApiErrorCode } from 'xactions/xapi';

interface User {
  id: string;
  name: string;
  username: string;
}

export async function consumer(): Promise<void> {
  const client = XApiClient.fromEnv({ X_BEARER_TOKEN: 'app-only-token' }, { maxRetries: 2 });
  const summary: boolean = client.credentials().bearer;

  const result: XApiResult<User> = await client.call<User>('getUsersByUsername', { username: 'XDevelopers' });
  const name: string = result.data.name;
  const remaining: number | null = result.rateLimit?.remaining ?? null;

  for await (const page of client.paginate('searchPostsRecent', { query: 'from:XDevelopers' }, { maxPages: 2 })) {
    const count: number = page.meta?.result_count ?? 0;
    void count;
  }
  const collected = await client.collect('getUsersFollowers', { id: '2244994945' }, { limit: 100 });
  const pages: number = collected.pages;

  const controller = new AbortController();
  for await (const message of client.stream('streamPostsSample', {}, { signal: controller.signal, stallMs: 20_000 })) {
    void message;
    controller.abort();
  }

  const upload = await client.uploadMedia(new Uint8Array([1, 2, 3]), { mediaType: 'image/png' });
  const mediaId: string = upload.mediaId;

  const plan = client.build('createPosts', {}, { body: { text: 'hello' }, auth: 'oauth2' });
  const method: string = plan.op.method;

  const op: XApiOperation = getOperation('GET /2/users/me');
  const writes: number = listOperations({ write: true, tag: 'Posts' }).length;
  const limits = describeOperation(op.id).rateLimits.map((l) => l.requests);
  const published = rateLimitsFor('GET', '/2/tweets/search/recent');
  const total: number = OPERATIONS.length + SOURCE.operations;

  const pkce = createPkcePair();
  const url: string = buildAuthorizeUrl({ clientId: 'id', redirectUri: 'http://127.0.0.1:8789/callback', state: createState(), codeChallenge: pkce.challenge });
  const ok: boolean = verifySignature('{}', 'sha256=abc', 'secret');
  const handler = createWebhookHandler({ consumerSecret: 'secret', onEvent: async () => {} });

  try {
    await client.call('getUsersMe');
  } catch (err) {
    if (err instanceof XApiError) {
      const code: XApiErrorCode = err.code;
      const json: Record<string, unknown> = err.toJSON();
      void code;
      void json;
    }
  }

  void [summary, name, remaining, pages, mediaId, method, writes, limits, published, total, url, ok, handler];
}
