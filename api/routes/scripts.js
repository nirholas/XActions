// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Browser Script Download Routes
 *
 * Serves XActions browser scripts behind x402 micropayments. Every public id
 * resolves through browser/index.json to the canonical browser/<id>.js file
 * (api/services/scriptManifest.js), so a download is the script a user would paste.
 * Payment is verified by the x402 middleware before these handlers run.
 *
 * Routes:
 *   GET /api/scripts          — list all scripts with prices (free)
 *   GET /api/scripts/src/:name       — download a top-level browser script
 *   GET /api/scripts/automation/:name — download an automation script
 *
 * The `src/` and `automation/` collection names are part of the public URL and
 * of the SCRIPT_PRICES keys, so they stay even though the files moved to browser/.
 *
 * @author nichxbt
 */

import { Router } from 'express';
import { readFile } from 'fs/promises';
import crypto from 'crypto';
import { SCRIPT_PRICES } from '../config/x402-config.js';
import { describeScript, resolveScriptFile } from '../services/scriptManifest.js';

const router = Router();

// Only allow safe camelCase / known filename characters
const SAFE_NAME = /^[a-zA-Z0-9_-]+$/;

/**
 * GET /api/scripts
 * Free listing of all available scripts with their x402 prices.
 */
router.get('/', (req, res) => {
  const scripts = Object.entries(SCRIPT_PRICES).map(([scriptPath, price]) => {
    const [collection, name] = scriptPath.split('/');
    return {
      path: scriptPath,
      name,
      collection,
      endpoint: `/api/scripts/${scriptPath}`,
      price,
      ...describeScript(scriptPath),
    };
  });

  res.json({
    count: scripts.length,
    currency: 'USDC',
    payment: 'x402',
    scripts,
  });
});

/**
 * GET /api/scripts/src/:name
 * Serve a top-level browser script (its canonical browser/ file). Requires x402 payment.
 */
router.get('/src/:name', async (req, res) => {
  const { name } = req.params;

  if (!SAFE_NAME.test(name)) {
    return res.status(400).json({ error: 'Invalid script name' });
  }

  const scriptPath = `src/${name}`;
  if (!SCRIPT_PRICES[scriptPath]) {
    return res.status(404).json({ error: 'Script not found' });
  }

  // Guard against path traversal (resolve must stay within its tree)
  const filePath = resolveScriptFile(scriptPath);
  if (!filePath) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = await readFile(filePath, 'utf8');
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('X-Script-Name', name);
    res.set('X-Script-Price', SCRIPT_PRICES[scriptPath]);
    res.send(content);
  } catch {
    res.status(404).json({ error: 'Script not found' });
  }
});

/**
 * GET /api/scripts/automation/:name
 * Serve a browser automation script (its canonical browser/ file). Requires x402 payment.
 */
router.get('/automation/:name', async (req, res) => {
  const { name } = req.params;

  if (!SAFE_NAME.test(name)) {
    return res.status(400).json({ error: 'Invalid script name' });
  }

  const scriptPath = `automation/${name}`;
  if (!SCRIPT_PRICES[scriptPath]) {
    return res.status(404).json({ error: 'Script not found' });
  }

  const filePath = resolveScriptFile(scriptPath);
  if (!filePath) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = await readFile(filePath, 'utf8');
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('X-Script-Name', name);
    res.set('X-Script-Price', SCRIPT_PRICES[scriptPath]);
    res.send(content);
  } catch {
    res.status(404).json({ error: 'Script not found' });
  }
});

/**
 * POST /api/scripts/run
 * Run a browser script server-side via Puppeteer — requires x402 payment.
 *
 * Body:
 *   script        {string}  required  e.g. "src/unfollowback" or "automation/autoLiker"
 *   sessionCookie {string}  required  X auth_token cookie value
 *   params        {object}  optional  CONFIG overrides (dryRun, maxUnfollows, …)
 *   startUrl      {string}  optional  Page to navigate to before running (default: x.com/home)
 *   callbackUrl   {string}  optional  POST job result here when complete
 */
router.post('/run', async (req, res) => {
  const { script, sessionCookie, params = {}, startUrl, callbackUrl } = req.body;

  if (!script) {
    return res.status(400).json({ error: 'script is required' });
  }
  if (!sessionCookie) {
    return res.status(400).json({
      error: 'SESSION_REQUIRED',
      message: 'X/Twitter sessionCookie (auth_token) is required to run scripts',
      hint: 'Find your auth_token cookie on x.com via DevTools → Application → Cookies',
    });
  }

  // Normalise: strip .js extension if present
  const scriptPath = script.replace(/\.js$/, '');

  // Enforce whitelist — only scripts in SCRIPT_PRICES may be run
  if (!SCRIPT_PRICES[scriptPath]) {
    return res.status(404).json({
      error: 'SCRIPT_NOT_FOUND',
      message: `Script "${scriptPath}" is not available`,
      hint: 'GET /api/scripts for a list of available scripts',
    });
  }

  // Validate params is a plain object
  if (typeof params !== 'object' || Array.isArray(params)) {
    return res.status(400).json({ error: 'params must be a plain object' });
  }

  // Sanitise startUrl — must be an x.com URL if provided
  if (startUrl && !/^https:\/\/(x|twitter)\.com\//.test(startUrl)) {
    return res.status(400).json({ error: 'startUrl must be an x.com or twitter.com URL' });
  }

  // Sanitise callbackUrl — must be http/https if provided
  if (callbackUrl) {
    try {
      const u = new URL(callbackUrl);
      if (!['http:', 'https:'].includes(u.protocol)) {
        return res.status(400).json({ error: 'callbackUrl must use http or https' });
      }
    } catch {
      return res.status(400).json({ error: 'callbackUrl is not a valid URL' });
    }
  }

  const operationId = `script-run-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;

  try {
    const { queueJob } = await import('../services/jobQueue.js');
    await queueJob({
      id: operationId,
      type: 'scriptRun',
      config: {
        scriptPath,
        sessionCookie,
        params,
        callbackUrl: callbackUrl || null,
        ...(startUrl ? { startUrl } : {}),
      },
      source: 'scripts-api',
      agentType: req.headers['x-agent-type'] || 'unknown',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      data: {
        operationId,
        status: 'queued',
        script: scriptPath,
        params,
        polling: {
          endpoint: `/api/ai/action/status/${operationId}`,
          recommendedIntervalMs: 5000,
        },
      },
      meta: {
        createdAt: new Date().toISOString(),
        note: 'Script runs in a headless browser authenticated as your X account. Poll the status endpoint for results and console output.',
        downloadUrl: `/api/scripts/${scriptPath}`,
      },
    });
  } catch (error) {
    console.error('❌ Script run error:', error);
    return res.status(500).json({ error: 'QUEUE_FAILED', message: error.message });
  }
});

export default router;
