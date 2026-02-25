/**
 * XActions Datasets API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Router } from 'express';

const router = Router();

// GET /api/datasets — list all datasets
router.get('/', async (req, res) => {
  try {
    const { listDatasets } = await import('../../src/scraping/paginationEngine.js');
    const datasets = await listDatasets();
    res.json({ datasets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/datasets/:name — get items from a dataset
router.get('/:name', async (req, res) => {
  try {
    const { DatasetStore } = await import('../../src/scraping/paginationEngine.js');
    const ds = new DatasetStore(req.params.name);
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;
    const data = await ds.getData({ offset, limit });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/datasets/:name/export — export dataset
router.get('/:name/export', async (req, res) => {
  try {
    const { DatasetStore } = await import('../../src/scraping/paginationEngine.js');
    const ds = new DatasetStore(req.params.name);
    const format = req.query.format || 'json';
    const data = await ds.export(format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${req.params.name}.csv`);
    }
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/datasets/:name — delete a dataset
router.delete('/:name', async (req, res) => {
  try {
    const { DatasetStore } = await import('../../src/scraping/paginationEngine.js');
    const ds = new DatasetStore(req.params.name);
    await ds.delete();
    res.json({ status: 'deleted', name: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
