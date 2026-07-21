// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402 discovery router
 *
 * Thin wrapper — delegates to the canonical OpenAPI generators in api/openapi.js.
 * Keep all discovery logic there; this file is for Express mounting only.
 *
 * Routes:
 *   GET /openapi.json        — OpenAPI 3.1 spec (primary discovery signal)
 *   GET /.well-known/x402   — v1 well-known fallback
 *
 * @see api/openapi.js
 * @author nichxbt
 */

import express from 'express';
import { generateSpec, generateWellKnown } from '../openapi.js';

const router = express.Router();

router.get('/openapi.json', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('application/json').json(generateSpec());
});

router.get('/.well-known/x402', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('application/json').json(generateWellKnown());
});

export default router;
