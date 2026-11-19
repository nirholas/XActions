// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Chat API
 *
 *   POST /api/chat/context  { input }                          -> a resolved context item (JSON)
 *   POST /api/chat          { question, items, history?, byok? } -> text/event-stream
 *   GET  /api/chat/health                                      -> lanes and limits
 *
 * `input` is an @handle, a profile link or a post link. The browser keeps the
 * resolved items with the conversation and sends them back with each
 * question, so follow-ups make no X requests. Events match /api/ask:
 * sources, lane, delta, done, error. The Cloudflare Worker serves the same
 * routes at the edge (worker/index.js).
 *
 * @module api/routes/chat
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import express from 'express';
import { chat, SUGGESTED_PROMPTS } from '../../src/chat/engine.js';
import { CONTEXT_BUDGET, MAX_ITEMS, resolveAttachment } from '../../src/chat/context.js';
import { edgeReader } from '../../src/chat/reader.js';
import { buildLaneChain } from '../../src/ask/lanes.js';
import { statusForError } from '../../src/edge/twitterClient.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.set('cache-control', 'no-store').json({
    status: 'ok',
    lanes: buildLaneChain(process.env).map((l) => l.name),
    budget: CONTEXT_BUDGET,
    maxItems: MAX_ITEMS,
    suggested: SUGGESTED_PROMPTS,
  });
});

router.post('/context', async (req, res) => {
  const input = typeof req.body?.input === 'string' ? req.body.input.slice(0, 300) : '';
  try {
    const item = await resolveAttachment(input, edgeReader);
    res.set('cache-control', 'no-store').json(item);
  } catch (error) {
    res.status(error.status || statusForError(error)).json({ error: 'CONTEXT_FAILED', message: error.message });
  }
});

router.post('/', async (req, res) => {
  const { question, history, items, byok } = req.body || {};
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'question is required' });
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'NO_CONTEXT', message: 'Attach an account, a post or a thread first.' });
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
  // `req` emits 'close' as soon as its body has been read, which is before
  // the answer starts; the response closing early is what means the reader left.
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });

  try {
    await chat({
      question,
      history: Array.isArray(history) ? history : [],
      items,
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
