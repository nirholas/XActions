// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * A scripted fetch for the X API client tests: each call takes the next
 * response from the queue and the request is recorded for assertions.
 */

export function jsonResponse(status, body, headers = {}) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** A streaming response whose body yields each string chunk in turn. */
export function streamResponse(chunks, status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status });
}

export function scriptedFetch(responses) {
  const queue = [...responses];
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET', headers: init.headers ?? {}, body: init.body });
    if (!queue.length) throw new Error(`unexpected request ${init.method ?? 'GET'} ${url}`);
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(url, init) : next;
  };
  return { fetch, calls, remaining: () => queue.length };
}

/** A sleep that records waits instead of waiting. */
export function recordingSleep() {
  const waits = [];
  const sleep = async (ms) => {
    waits.push(ms);
  };
  return { sleep, waits };
}
