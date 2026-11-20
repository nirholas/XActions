// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Standalone static server for the dashboard (no database, no API).
 *
 * Usage: npm run dashboard:serve   (or node scripts/dashboard-server.mjs; PORT overrides the default 3000)
 * For the full app with the REST API behind it, run `node api/server.js` instead.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = path.join(__dirname, '..', 'dashboard');

const app = express();

app.use(express.static(DASHBOARD_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, 'index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, 'pricing.html'));
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🎨 Dashboard running at http://localhost:${PORT}`);
});
