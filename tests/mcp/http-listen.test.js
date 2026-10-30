// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: startHttpTransport() reports a listen failure instead of announcing
 * a server that never bound.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';

let blocker;
let port;

beforeAll(async () => {
  blocker = createServer();
  await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  port = blocker.address().port;
});

afterAll(() => new Promise((resolve) => blocker.close(resolve)));

describe('startHttpTransport', () => {
  it('rejects with EADDRINUSE when the port is taken', async () => {
    const { startHttpTransport } = await import('../../src/mcp/server.js');
    await expect(startHttpTransport({ port, host: '127.0.0.1' })).rejects.toMatchObject({ code: 'EADDRINUSE' });
  });

  it('listens and answers on a free port', async () => {
    const { startHttpTransport } = await import('../../src/mcp/server.js');
    const server = await startHttpTransport({ port: 0, host: '127.0.0.1' });
    try {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/health`);
      expect(res.status).toBeLessThan(500);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
