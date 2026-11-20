// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions AI Content Optimizer API Routes
 *
 * Every route needs a signed-in user. Three of them call OpenRouter with the
 * operator's OPENROUTER_API_KEY when one is set, so leaving them open let any
 * visitor spend that key, and gave away for free what /api/ai/optimizer/*
 * charges for over x402.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// X allows 280 characters, or 25,000 for a Premium long post.
const MAX_TEXT_LENGTH = 25_000;
const GOAL_PATTERN = /^[\w -]{1,40}$/;

/**
 * Validate `text` and clamp `count`, answering 400 for bad input.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ count?: { def: number, max: number } }} [opts]
 * @returns {{ text: string, count: number, body: Record<string, any> } | null}
 */
function readInput(req, res, opts = {}) {
  // Express 5 leaves req.body undefined when a request carries no body.
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { text } = body;
  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'text required (a non-empty string)' });
    return null;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    res.status(400).json({ error: `text too long (max ${MAX_TEXT_LENGTH} characters)` });
    return null;
  }
  let count = 0;
  if (opts.count) {
    const { def, max } = opts.count;
    const raw = body.count ?? def;
    count = Number(raw);
    if (!Number.isInteger(count) || count < 1 || count > max) {
      res.status(400).json({ error: `count must be an integer from 1 to ${max}` });
      return null;
    }
  }
  return { text, count, body };
}

/** @param {import('express').Response} res @param {unknown} error */
function fail(res, error) {
  console.error('❌ Optimizer error:', error);
  res.status(500).json({ error: 'Optimizer failed' });
}

// POST /api/optimizer/optimize
router.post('/optimize', async (req, res) => {
  const input = readInput(req, res);
  if (!input) return;
  // goal goes into the LLM prompt, so keep it a short plain phrase.
  const goal = input.body.goal ?? 'engagement';
  if (typeof goal !== 'string' || !GOAL_PATTERN.test(goal)) {
    return res.status(400).json({ error: 'goal must be a short phrase (letters, digits, spaces, hyphens; max 40 characters)' });
  }
  try {
    const { optimizeTweet } = await import('../../src/ai/contentOptimizer.js');
    res.json(await optimizeTweet(input.text, { goal }));
  } catch (error) {
    fail(res, error);
  }
});

// POST /api/optimizer/hashtags
router.post('/hashtags', async (req, res) => {
  const input = readInput(req, res, { count: { def: 5, max: 30 } });
  if (!input) return;
  try {
    const { suggestHashtags } = await import('../../src/ai/contentOptimizer.js');
    res.json(await suggestHashtags(input.text, { count: input.count }));
  } catch (error) {
    fail(res, error);
  }
});

// POST /api/optimizer/predict
router.post('/predict', async (req, res) => {
  const input = readInput(req, res);
  if (!input) return;
  try {
    const { predictPerformance } = await import('../../src/ai/contentOptimizer.js');
    res.json(await predictPerformance(input.text));
  } catch (error) {
    fail(res, error);
  }
});

// POST /api/optimizer/variations
router.post('/variations', async (req, res) => {
  const input = readInput(req, res, { count: { def: 3, max: 10 } });
  if (!input) return;
  try {
    const { generateVariations } = await import('../../src/ai/contentOptimizer.js');
    res.json({ variations: await generateVariations(input.text, input.count) });
  } catch (error) {
    fail(res, error);
  }
});

export default router;

// by nichxbt
