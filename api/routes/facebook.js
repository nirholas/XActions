// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
// by nichxbt
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();
router.use(authMiddleware);

/**
 * Validate Facebook session cookie presence.
 * Returns an error string if invalid, null if OK.
 * Cookie values are never logged (NFR3).
 */
function requireFacebookCookie(body) {
  const { authCookie } = body ?? {};
  if (!authCookie?.c_user?.trim() || !authCookie?.xs?.trim()) {
    return '❌ authCookie { c_user, xs } is required for this operation. Provide a valid Facebook session cookie.';
  }
  return null;
}

/**
 * POST /api/facebook/scrape
 * Scrape Facebook data: profile, posts, followers, or search.
 *
 * Body: {
 *   action: 'profile' | 'posts' | 'followers' | 'search',
 *   url?: string,       // required for profile/posts/followers
 *   query?: string,     // required for search
 *   authCookie?: { c_user, xs }  // optional; enables authenticated scrape
 * }
 */
router.post('/scrape', async (req, res) => {
  try {
    const { action, url, query, authCookie } = req.body ?? {};

    const VALID_ACTIONS = ['profile', 'posts', 'followers', 'search'];
    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        ok: false,
        error: `action must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
    }

    if (['profile', 'posts', 'followers'].includes(action) && !url?.trim()) {
      return res.status(400).json({ ok: false, error: `action "${action}" requires url` });
    }
    if (action === 'search' && !query?.trim()) {
      return res.status(400).json({ ok: false, error: 'action "search" requires query' });
    }

    // Dynamic import — avoids loading Puppeteer until needed
    const { scrape } = await import('../../src/scrapers/index.js');

    const options = {
      userId: req.user.id,
      // Only pass authCookie when both fields are present (never log values)
      ...(authCookie?.c_user?.trim() && authCookie?.xs?.trim()
        ? { authCookie: { c_user: authCookie.c_user, xs: authCookie.xs } }
        : {}),
    };

    const target = action === 'search' ? query.trim() : url.trim();
    const result = await scrape('facebook', action, { target, ...options });

    res.json({ ok: true, action, result });
  } catch (error) {
    console.error('❌ Facebook scrape error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/facebook/automate
 * Run Facebook automation with dry-run default (ADR-007, SM-2).
 *
 * Body: {
 *   action: 'like' | 'comment' | 'post',
 *   urls?: string[],     // required for like/comment
 *   text?: string,       // required for comment/post
 *   dryRun?: boolean,    // defaults true — only false enables real writes
 *   authCookie: { c_user, xs },
 *   maxBatch?: number
 * }
 */
router.post('/automate', async (req, res) => {
  try {
    const { action, urls = [], text = '', dryRun, authCookie, maxBatch } = req.body ?? {};

    // Hard auth guard — must come before any browser launch
    const cookieError = requireFacebookCookie(req.body);
    if (cookieError) return res.status(400).json({ ok: false, error: cookieError });

    const VALID_ACTIONS = ['like', 'comment', 'post'];
    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        ok: false,
        error: `action must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
    }

    // Fail-fast arg validation before browser launch (mirrors MCP/CLI guards)
    if (['like', 'comment'].includes(action) && (!Array.isArray(urls) || urls.length === 0)) {
      return res.status(400).json({
        ok: false,
        error: `action "${action}" requires at least one URL in urls`,
      });
    }
    if (['comment', 'post'].includes(action) && !String(text ?? '').trim()) {
      return res.status(400).json({
        ok: false,
        error: `action "${action}" requires non-empty text`,
      });
    }

    // Strict dryRun gate — only explicit false enables real writes
    const resolvedDryRun = dryRun === false ? false : true;

    const { createBrowser, createPage, loginWithCookie } = await import('../../src/scrapers/facebook/index.js');
    const {
      likeFacebookPosts,
      commentOnFacebookPosts,
      createFacebookPost,
    } = await import('../services/facebookAutomation.js');

    // Create Operation record for real (non-dry-run) runs — Story 3.4
    // config intentionally excludes authCookie — never persist cookie values (NFR3)
    let operation = null;
    if (!resolvedDryRun) {
      operation = await prisma.operation.create({
        data: {
          userId: req.user.id,
          type: `facebook_${action}`,
          status: 'running',
          startedAt: new Date(),
          config: JSON.stringify({ action, urls, text, maxBatch: maxBatch ?? null }),
        },
      });
      global.io?.emit('facebook:operation', {
        event: 'start',
        operationId: operation.id,
        userId: req.user.id,
        type: operation.type,
        status: 'running',
      });
    }

    const browser = await createBrowser({ headless: true });
    let result;
    try {
      const page = await createPage(browser);
      // Cookie values are never logged (NFR3)
      await loginWithCookie(page, { c_user: authCookie.c_user, xs: authCookie.xs });

      const options = {
        dryRun: resolvedDryRun,
        ...(maxBatch != null && { maxBatch: Number(maxBatch) }),
      };

      if (action === 'like') {
        result = await likeFacebookPosts(page, urls, options);
      } else if (action === 'comment') {
        result = await commentOnFacebookPosts(page, urls, text, options);
      } else {
        result = await createFacebookPost(page, text, options);
      }

      // Persist result + emit completion event
      if (operation) {
        await prisma.operation.update({
          where: { id: operation.id },
          data: { status: 'completed', completedAt: new Date(), result: JSON.stringify(result) },
        });
        global.io?.emit('facebook:operation', {
          event: 'complete',
          operationId: operation.id,
          userId: req.user.id,
          status: 'completed',
        });
      }
    } catch (browserError) {
      // Persist failure + emit error event, then re-throw for outer catch
      if (operation) {
        await prisma.operation.update({
          where: { id: operation.id },
          data: { status: 'failed', completedAt: new Date(), error: browserError.message },
        });
        global.io?.emit('facebook:operation', {
          event: 'error',
          operationId: operation.id,
          userId: req.user.id,
          status: 'failed',
          error: browserError.message,
        });
      }
      throw browserError;
    } finally {
      await browser.close();
    }

    res.json({
      ok: true,
      action,
      dryRun: resolvedDryRun,
      userId: req.user.id,
      operationId: operation?.id ?? null,
      ...result,
    });
  } catch (error) {
    console.error('❌ Facebook automate error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
