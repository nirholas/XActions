/**
 * XActions AI Content Optimizer API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Router } from 'express';

const router = Router();

// POST /api/optimizer/optimize
router.post('/optimize', async (req, res) => {
  try {
    const { optimizeTweet } = await import('../../src/ai/contentOptimizer.js');
    const { text, goal } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const result = await optimizeTweet(text, { goal: goal || 'engagement' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/optimizer/hashtags
router.post('/hashtags', async (req, res) => {
  try {
    const { suggestHashtags } = await import('../../src/ai/contentOptimizer.js');
    const result = await suggestHashtags(req.body.text, { count: req.body.count || 5 });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/optimizer/predict
router.post('/predict', async (req, res) => {
  try {
    const { predictPerformance } = await import('../../src/ai/contentOptimizer.js');
    const result = await predictPerformance(req.body.text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/optimizer/variations
router.post('/variations', async (req, res) => {
  try {
    const { generateVariations } = await import('../../src/ai/contentOptimizer.js');
    const result = await generateVariations(req.body.text, req.body.count || 3);
    res.json({ variations: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
