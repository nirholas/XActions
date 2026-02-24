/**
 * XActions Google Sheets Plugin — xactions-plugin-google-sheets
 *
 * Export any scraped X/Twitter data directly to Google Sheets.
 * Supports: followers, following, tweets, likes, lists, bookmarks, search results.
 *
 * Authentication options:
 *   1. Service account JSON key file (GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
 *   2. OAuth2 access token (GOOGLE_ACCESS_TOKEN)
 *   3. API key for read-only public sheets (GOOGLE_API_KEY)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// Google Sheets Client
// ============================================================================

/**
 * Lazy-load the googleapis module (peer dependency).
 * Returns null if not installed, letting callers show a helpful error.
 */
async function loadGoogleApis() {
  try {
    const { google } = await import('googleapis');
    return google;
  } catch {
    return null;
  }
}

/**
 * Build an authenticated Google Sheets client from environment variables.
 *
 * Priority:
 *   1. GOOGLE_SERVICE_ACCOUNT_KEY (inline JSON string)
 *   2. GOOGLE_SERVICE_ACCOUNT_KEY_FILE (path to .json key file)
 *   3. GOOGLE_ACCESS_TOKEN (OAuth2 bearer token)
 *   4. GOOGLE_API_KEY (read-only, public sheets only)
 *
 * @returns {Promise<{ sheets: object, authType: string }>}
 */
async function getSheetsClient() {
  const google = await loadGoogleApis();
  if (!google) {
    throw new Error(
      'googleapis is not installed. Run: npm install googleapis'
    );
  }

  // 1. Service account — inline JSON
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return { sheets: google.sheets({ version: 'v4', auth }), authType: 'service-account' };
  }

  // 2. Service account — key file path
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const keyPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    const credentials = JSON.parse(await fs.readFile(keyPath, 'utf-8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return { sheets: google.sheets({ version: 'v4', auth }), authType: 'service-account-file' };
  }

  // 3. OAuth2 access token
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: process.env.GOOGLE_ACCESS_TOKEN });
    return { sheets: google.sheets({ version: 'v4', auth }), authType: 'oauth2-token' };
  }

  // 4. API key (read-only)
  if (process.env.GOOGLE_API_KEY) {
    return {
      sheets: google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY }),
      authType: 'api-key',
    };
  }

  throw new Error(
    'No Google credentials found. Set one of: GOOGLE_SERVICE_ACCOUNT_KEY, ' +
    'GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_ACCESS_TOKEN, or GOOGLE_API_KEY.'
  );
}

// ============================================================================
// Data Normalization
// ============================================================================

/**
 * Normalize scraped data into a flat array of objects.
 * Handles the various shapes returned by XActions scrapers.
 */
function normalizeData(data) {
  if (Array.isArray(data)) return data;
  // Common wrapper shapes from XActions scrapers
  const arrayKeys = [
    'followers', 'following', 'tweets', 'likes', 'members',
    'bookmarks', 'messages', 'notifications', 'likers',
    'replies', 'quotes', 'media', 'links', 'results', 'users',
  ];
  for (const key of arrayKeys) {
    if (data[key] && Array.isArray(data[key])) return data[key];
  }
  // Last resort: treat as single-item array
  return [data];
}

/**
 * Flatten an array of objects into a 2D array: [headers, ...rows].
 * Handles nested objects by JSON-stringifying them.
 *
 * @param {Object[]} items
 * @param {string[]} [columns] - Explicit column order; default: union of all keys
 * @returns {{ headers: string[], rows: any[][] }}
 */
function toSheetRows(items, columns) {
  const allKeys = new Set();
  for (const item of items) {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((k) => allKeys.add(k));
    }
  }

  const headers = columns || [...allKeys];

  const rows = items.map((item) =>
    headers.map((key) => {
      const val = item?.[key];
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) return val.join('; ');
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    })
  );

  return { headers, rows };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Export scraped data to a Google Sheet.
 *
 * @param {Object|Object[]} data - Scraped data (raw scraper output or array of objects)
 * @param {Object} options
 * @param {string}  options.spreadsheetId - Google Sheet ID (from the URL)
 * @param {string}  [options.sheetName='Sheet1'] - Target sheet/tab name
 * @param {string}  [options.mode='append'] - 'append' | 'replace' | 'new-sheet'
 * @param {string[]} [options.columns] - Explicit column order
 * @param {boolean} [options.includeHeaders=true] - Write header row
 * @returns {Promise<Object>} Result summary
 */
async function exportToGoogleSheets(data, options = {}) {
  const {
    spreadsheetId,
    sheetName = 'Sheet1',
    mode = 'append',
    columns,
    includeHeaders = true,
  } = options;

  if (!spreadsheetId) {
    throw new Error('spreadsheetId is required. Find it in your Google Sheet URL: docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit');
  }

  const items = normalizeData(data);
  if (!items.length) {
    return { success: true, rowsWritten: 0, message: 'No data to export' };
  }

  const { headers, rows } = toSheetRows(items, columns);
  const { sheets, authType } = await getSheetsClient();

  const range = `${sheetName}!A1`;
  let result;

  if (mode === 'replace') {
    // Clear existing content, then write everything
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}`,
    });

    const values = includeHeaders ? [headers, ...rows] : rows;
    result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } else if (mode === 'new-sheet') {
    // Create a new sheet/tab, then write
    const newSheetName = sheetName || `Export_${new Date().toISOString().slice(0, 10)}`;
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: newSheetName } },
          }],
        },
      });
    } catch (e) {
      // Sheet may already exist — that's ok, we'll write to it
      if (!e.message?.includes('already exists')) throw e;
    }

    const values = includeHeaders ? [headers, ...rows] : rows;
    result = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${newSheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } else {
    // Append (default) — add rows below existing data
    const values = includeHeaders ? [headers, ...rows] : rows;
    result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  }

  return {
    success: true,
    spreadsheetId,
    sheetName,
    mode,
    authType,
    rowsWritten: rows.length,
    columnsWritten: headers.length,
    headers,
    updatedRange: result.data?.updatedRange || result.data?.tableRange || range,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Read data from a Google Sheet into an array of objects.
 *
 * @param {Object} options
 * @param {string} options.spreadsheetId
 * @param {string} [options.sheetName='Sheet1']
 * @param {string} [options.range] - Custom A1 range (overrides sheetName)
 * @returns {Promise<Object[]>}
 */
async function readFromGoogleSheets(options = {}) {
  const { spreadsheetId, sheetName = 'Sheet1', range } = options;

  if (!spreadsheetId) {
    throw new Error('spreadsheetId is required.');
  }

  const { sheets } = await getSheetsClient();
  const fullRange = range || `${sheetName}`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: fullRange,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const [headers, ...dataRows] = rows;
  return dataRows.map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });
}

/**
 * Create a new Google Spreadsheet.
 *
 * @param {Object} options
 * @param {string} options.title - Spreadsheet title
 * @param {string[]} [options.sheetNames=['Sheet1']] - Tab names to create
 * @returns {Promise<Object>} { spreadsheetId, url, title }
 */
async function createSpreadsheet(options = {}) {
  const { title = 'XActions Export', sheetNames = ['Sheet1'] } = options;

  const { sheets } = await getSheetsClient();

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: sheetNames.map((name) => ({
        properties: { title: name },
      })),
    },
  });

  return {
    spreadsheetId: response.data.spreadsheetId,
    url: response.data.spreadsheetUrl,
    title,
    sheetNames,
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export const name = 'xactions-plugin-google-sheets';
export const version = '1.0.0';
export const description = 'Export scraped X/Twitter data directly to Google Sheets';

/**
 * MCP tool definitions — AI agents (Claude, GPT) can call these
 */
export const tools = [
  {
    name: 'x_export_to_google_sheets',
    description:
      'Export scraped X/Twitter data (followers, tweets, likes, etc.) to a Google Sheet. ' +
      'Requires a spreadsheetId. Modes: "append" (add rows), "replace" (overwrite), "new-sheet" (new tab).',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: ['array', 'object'],
          description: 'Array of objects or raw scraper output to export',
        },
        spreadsheetId: {
          type: 'string',
          description: 'Google Sheet ID from the URL (docs.google.com/spreadsheets/d/{ID}/edit)',
        },
        sheetName: {
          type: 'string',
          description: 'Target sheet/tab name (default: Sheet1)',
        },
        mode: {
          type: 'string',
          enum: ['append', 'replace', 'new-sheet'],
          description: 'Write mode: append, replace, or new-sheet (default: append)',
        },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Explicit column order (default: all keys from data)',
        },
      },
      required: ['data', 'spreadsheetId'],
    },
    handler: async (args) => {
      return await exportToGoogleSheets(args.data, {
        spreadsheetId: args.spreadsheetId,
        sheetName: args.sheetName,
        mode: args.mode,
        columns: args.columns,
      });
    },
  },
  {
    name: 'x_read_from_google_sheets',
    description:
      'Read data from a Google Sheet into an array of objects. ' +
      'First row is used as headers. Returns objects keyed by header names.',
    inputSchema: {
      type: 'object',
      properties: {
        spreadsheetId: {
          type: 'string',
          description: 'Google Sheet ID',
        },
        sheetName: {
          type: 'string',
          description: 'Sheet/tab name (default: Sheet1)',
        },
        range: {
          type: 'string',
          description: 'Custom A1 range (overrides sheetName)',
        },
      },
      required: ['spreadsheetId'],
    },
    handler: async (args) => {
      return await readFromGoogleSheets({
        spreadsheetId: args.spreadsheetId,
        sheetName: args.sheetName,
        range: args.range,
      });
    },
  },
  {
    name: 'x_create_google_spreadsheet',
    description: 'Create a new Google Spreadsheet and return its ID and URL.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Spreadsheet title (default: "XActions Export")',
        },
        sheetNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tab names to create (default: ["Sheet1"])',
        },
      },
      required: [],
    },
    handler: async (args) => {
      return await createSpreadsheet({
        title: args.title,
        sheetNames: args.sheetNames,
      });
    },
  },
];

/**
 * Express route handlers (mounted under /api/plugins/xactions-plugin-google-sheets/)
 */
export const routes = [
  {
    method: 'post',
    path: '/export',
    description: 'Export data to Google Sheets via REST API',
    handler: async (req, res) => {
      try {
        const { data, spreadsheetId, sheetName, mode, columns } = req.body;
        if (!data || !spreadsheetId) {
          return res.status(400).json({ error: 'data and spreadsheetId are required' });
        }
        const result = await exportToGoogleSheets(data, { spreadsheetId, sheetName, mode, columns });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  },
  {
    method: 'get',
    path: '/read',
    description: 'Read data from a Google Sheet',
    handler: async (req, res) => {
      try {
        const { spreadsheetId, sheetName, range } = req.query;
        if (!spreadsheetId) {
          return res.status(400).json({ error: 'spreadsheetId query param is required' });
        }
        const data = await readFromGoogleSheets({ spreadsheetId, sheetName, range });
        res.json({ success: true, rows: data.length, data });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  },
  {
    method: 'post',
    path: '/create',
    description: 'Create a new Google Spreadsheet',
    handler: async (req, res) => {
      try {
        const result = await createSpreadsheet(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  },
];

/**
 * Lifecycle hooks
 */
export const hooks = {
  onLoad() {
    console.log('📊 xactions-plugin-google-sheets loaded');
  },
  onUnload() {
    console.log('📊 xactions-plugin-google-sheets unloaded');
  },
};

/**
 * Export core functions for programmatic use
 */
export {
  exportToGoogleSheets,
  readFromGoogleSheets,
  createSpreadsheet,
  getSheetsClient,
  normalizeData,
  toSheetRows,
};

export default {
  name,
  version,
  description,
  tools,
  routes,
  hooks,
};
