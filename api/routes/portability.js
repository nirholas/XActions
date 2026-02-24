/**
 * XActions Portability API Routes
 * Export accounts, migrate to other platforms, compare exports.
 *
 * POST /api/portability/export      — Start export (background job)
 * GET  /api/portability/export/:id  — Check export progress
 * GET  /api/portability/export/:id/download — Download archive
 * POST /api/portability/migrate     — Start migration
 * POST /api/portability/diff        — Compare two exports
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// In-memory job tracking (could be backed by Bull/Redis in production)
const jobs = new Map();
let jobCounter = 0;

// ============================================================================
// POST /api/portability/export — start an account export
// ============================================================================

router.post('/export', async (req, res) => {
  try {
    const { username, formats, only, limit, authToken } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    const jobId = `export_${++jobCounter}_${Date.now()}`;
    const job = {
      id: jobId,
      type: 'export',
      username: username.replace(/^@/, ''),
      status: 'queued',
      progress: null,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
    };
    jobs.set(jobId, job);

    // Run export in background
    (async () => {
      try {
        job.status = 'running';
        const scrapers = (await import('../../src/scrapers/index.js')).default || await import('../../src/scrapers/index.js');
        const { exportAccount } = await import('../../src/portability/exporter.js');

        const browser = await scrapers.createBrowser();
        const page = await scrapers.createPage(browser);

        const cookie = authToken || req.body.cookie;
        if (cookie) {
          await scrapers.loginWithCookie(page, cookie);
        }

        const summary = await exportAccount({
          page,
          username: job.username,
          formats: formats || ['json', 'csv', 'md'],
          only,
          limit: limit || 500,
          scrapers,
          onProgress: (progress) => {
            job.progress = progress;
          },
        });

        await browser.close();

        job.status = 'completed';
        job.result = summary;
      } catch (err) {
        job.status = 'failed';
        job.error = err.message;
      }
    })();

    res.status(202).json({ jobId, status: 'queued', message: 'Export started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/portability/export/:id — check export progress
// ============================================================================

router.get('/export/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    id: job.id,
    status: job.status,
    username: job.username,
    progress: job.progress,
    result: job.status === 'completed' ? job.result : undefined,
    error: job.error,
    createdAt: job.createdAt,
  });
});

// ============================================================================
// GET /api/portability/export/:id/download — download the archive
// ============================================================================

router.get('/export/:id/download', async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (job.status !== 'completed' || !job.result?.dir) {
    return res.status(400).json({ error: 'Export not ready for download' });
  }

  const archivePath = path.join(job.result.dir, 'index.html');
  try {
    await fs.access(archivePath);
    res.sendFile(archivePath);
  } catch {
    res.status(404).json({ error: 'Archive file not found' });
  }
});

// ============================================================================
// POST /api/portability/migrate — start migration
// ============================================================================

router.post('/migrate', async (req, res) => {
  try {
    const { username, platform, dryRun, exportDir, credentials } = req.body;

    if (!username || !platform) {
      return res.status(400).json({ error: 'username and platform are required' });
    }

    if (!['bluesky', 'mastodon'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be "bluesky" or "mastodon"' });
    }

    // Find export directory
    let dir = exportDir;
    if (!dir) {
      const user = username.replace(/^@/, '');
      const exportsRoot = path.join(process.cwd(), 'exports');
      try {
        const dirs = await fs.readdir(exportsRoot);
        const match = dirs.filter((d) => d.startsWith(user + '_')).sort().pop();
        if (match) dir = path.join(exportsRoot, match);
      } catch { /* no exports dir */ }
    }

    if (!dir) {
      return res.status(400).json({
        error: `No export found for @${username}. Run an export first.`,
      });
    }

    const { migrate } = await import('../../src/portability/importer.js');
    const result = await migrate({
      platform,
      exportDir: dir,
      dryRun: dryRun !== false,
      credentials: credentials || {},
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST /api/portability/diff — compare two exports
// ============================================================================

router.post('/diff', async (req, res) => {
  try {
    const { dirA, dirB } = req.body;

    if (!dirA || !dirB) {
      return res.status(400).json({ error: 'dirA and dirB are required' });
    }

    const { diffAndReport } = await import('../../src/portability/differ.js');
    const { diff, report } = await diffAndReport(dirA, dirB);

    res.json({ summary: diff.summary, diff, report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/portability/exports — list available exports
// ============================================================================

router.get('/exports', async (req, res) => {
  try {
    const exportsRoot = path.join(process.cwd(), 'exports');
    let dirs = [];
    try {
      dirs = await fs.readdir(exportsRoot);
    } catch {
      return res.json({ exports: [] });
    }

    const exports = [];
    for (const dir of dirs) {
      const dirPath = path.join(exportsRoot, dir);
      const stat = await fs.stat(dirPath);
      if (stat.isDirectory()) {
        let summary = null;
        try {
          const raw = await fs.readFile(path.join(dirPath, 'summary.json'), 'utf-8');
          summary = JSON.parse(raw);
        } catch { /* no summary */ }

        exports.push({
          name: dir,
          path: dirPath,
          date: summary?.date || dir.split('_').pop(),
          username: summary?.username || dir.split('_')[0],
          phases: summary?.phases || {},
          hasArchive: await fs.access(path.join(dirPath, 'index.html')).then(() => true).catch(() => false),
        });
      }
    }

    res.json({ exports: exports.sort((a, b) => b.name.localeCompare(a.name)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
