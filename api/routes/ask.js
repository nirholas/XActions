// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Ask XActions API
 *
 *   POST /api/ask          { question, history?, byok? }  -> text/event-stream
 *   GET  /api/ask/health                                  -> index + lane status
 *
 * Retrieval runs over dashboard/data/ask-index.json (built by
 * `npm run ask:index`), the answer streams through the free LLM chain in
 * src/ask/lanes.js. Server-Sent Events, one JSON object per `data:` line:
 * sources, lane, delta, done, error.
 *
 * @module api/routes/ask
 */

import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, createSearcher, SUGGESTED_QUESTIONS } from '../../src/ask/engine.js';
import { createActionMatcher } from '../../src/ask/actions.js';
import { buildLaneChain } from '../../src/ask/lanes.js';

const router = express.Router();
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../dashboard/data');
const INDEX_PATH = path.join(DATA_DIR, 'ask-index.json');
const ACTIONS_PATH = path.join(DATA_DIR, 'ask-actions.json');

let searcherPromise = null;
function getSearcher() {
  if (!searcherPromise) {
    searcherPromise = Promise.all([readFile(INDEX_PATH, 'utf8'), readFile(ACTIONS_PATH, 'utf8')]).then(([rawIndex, rawActions]) => {
      const index = JSON.parse(rawIndex);
      const catalog = JSON.parse(rawActions);
      return {
        searcher: createSearcher(index),
        matcher: createActionMatcher(catalog),
        digest: index.digest,
        counts: index.counts,
        actionCounts: catalog.counts,
      };
    });
    searcherPromise.catch(() => { searcherPromise = null; });
  }
  return searcherPromise;
}

router.get('/health', async (req, res) => {
  try {
    const { searcher, matcher, digest, counts, actionCounts } = await getSearcher();
    res.set('cache-control', 'no-store').json({
      status: 'ok',
      index: { chunks: searcher.size, digest, counts },
      actions: { total: matcher.size, counts: actionCounts },
      lanes: buildLaneChain(process.env).map((l) => l.name),
      suggested: SUGGESTED_QUESTIONS,
    });
  } catch (error) {
    res.status(503).json({ status: 'error', message: `ask index unavailable: ${error.message}. Run npm run ask:index.` });
  }
});

router.post('/', async (req, res) => {
  const { question, history, byok } = req.body || {};
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'question is required' });
  }
  let searcher;
  let matcher;
  try {
    ({ searcher, matcher } = await getSearcher());
  } catch (error) {
    return res.status(503).json({ error: 'INDEX_UNAVAILABLE', message: error.message });
  }

  res.status(200).set({
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.flushHeaders();
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const controller = new AbortController();
  // The client going away is the response closing before it ended. The
  // request's own 'close' fires as soon as its body has been read (about 1 ms
  // in on Node 24), which aborted every answer mid-stream and turned the
  // first failed LLM lane into "aborted" instead of a try on the next one.
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    await ask({
      question,
      history: Array.isArray(history) ? history : [],
      searcher,
      matcher,
      env: process.env,
      byok: byok && typeof byok === 'object' ? byok : undefined,
      onEvent: send,
      signal: controller.signal,
    });
  } catch (error) {
    send({ type: 'error', message: error.message });
  } finally {
    res.end();
  }
});

export default router;
