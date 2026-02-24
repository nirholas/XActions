/**
 * XActions Excel Plugin — xactions-plugin-excel
 *
 * Export any scraped X/Twitter data to native Excel (.xlsx) files with
 * auto-filters, column widths, styled headers, and multi-sheet workbooks.
 *
 * Dependency: exceljs (peer dependency, npm install exceljs)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// ExcelJS Lazy Loader
// ============================================================================

/**
 * Lazy-load exceljs (peer dependency).
 * Returns null if not installed.
 */
async function loadExcelJS() {
  try {
    const ExcelJS = await import('exceljs');
    return ExcelJS.default || ExcelJS;
  } catch {
    return null;
  }
}

// ============================================================================
// Data Normalization (shared with google-sheets plugin)
// ============================================================================

/**
 * Normalize scraped data into a flat array of objects.
 */
function normalizeData(data) {
  if (Array.isArray(data)) return data;
  const arrayKeys = [
    'followers', 'following', 'tweets', 'likes', 'members',
    'bookmarks', 'messages', 'notifications', 'likers',
    'replies', 'quotes', 'media', 'links', 'results', 'users',
  ];
  for (const key of arrayKeys) {
    if (data[key] && Array.isArray(data[key])) return data[key];
  }
  return [data];
}

/**
 * Extract headers (union of all keys) from an array of objects.
 */
function extractHeaders(items, columns) {
  if (columns) return columns;
  const allKeys = new Set();
  for (const item of items) {
    if (item && typeof item === 'object') {
      for (const key of Object.keys(item)) {
        // Filter out deep nested objects (keep primitives and arrays)
        const val = item[key];
        if (typeof val !== 'object' || val === null || Array.isArray(val)) {
          allKeys.add(key);
        }
      }
    }
  }
  return [...allKeys];
}

/**
 * Format a cell value for Excel.
 */
function formatCellValue(val) {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.join('; ');
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

// ============================================================================
// Header Style Presets
// ============================================================================

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1DA1F2' } }, // Twitter blue
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: {
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
  },
};

const ALT_ROW_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5F8FA' }, // Light Twitter gray
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Export scraped data to an Excel (.xlsx) file.
 *
 * @param {Object|Object[]} data - Scraped data (raw scraper output or array)
 * @param {Object} options
 * @param {string}  options.filepath - Output file path (.xlsx)
 * @param {string}  [options.sheetName='Data'] - Sheet/tab name
 * @param {string[]} [options.columns] - Explicit column order
 * @param {boolean} [options.autoFilter=true] - Add auto-filter to header row
 * @param {boolean} [options.autoWidth=true] - Auto-fit column widths
 * @param {boolean} [options.styled=true] - Apply header styling and alternating row colors
 * @param {boolean} [options.freezeHeader=true] - Freeze the header row
 * @returns {Promise<Object>} Result summary
 */
async function exportToExcel(data, options = {}) {
  const ExcelJS = await loadExcelJS();
  if (!ExcelJS) {
    throw new Error('exceljs is not installed. Run: npm install exceljs');
  }

  const {
    filepath,
    sheetName = 'Data',
    columns,
    autoFilter = true,
    autoWidth = true,
    styled = true,
    freezeHeader = true,
  } = options;

  if (!filepath) {
    throw new Error('filepath is required (e.g., "./followers.xlsx")');
  }

  const items = normalizeData(data);
  if (!items.length) {
    return { success: true, rowsWritten: 0, filepath, message: 'No data to export' };
  }

  const headers = extractHeaders(items, columns);

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'XActions (xactions.app)';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  // --- Column definitions ---
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: 15, // Default; auto-width adjusts below
  }));

  // --- Add data rows ---
  for (const item of items) {
    const row = {};
    for (const key of headers) {
      row[key] = formatCellValue(item?.[key]);
    }
    worksheet.addRow(row);
  }

  // --- Styling ---
  if (styled) {
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = HEADER_STYLE.font;
      cell.fill = HEADER_STYLE.fill;
      cell.alignment = HEADER_STYLE.alignment;
      cell.border = HEADER_STYLE.border;
    });
    headerRow.height = 22;

    // Alternating row colors
    for (let i = 2; i <= items.length + 1; i++) {
      if (i % 2 === 0) {
        const row = worksheet.getRow(i);
        row.eachCell((cell) => {
          cell.fill = ALT_ROW_FILL;
        });
      }
    }
  }

  // --- Auto-width ---
  if (autoWidth) {
    for (const col of worksheet.columns) {
      let maxLength = col.header?.length || 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const cellLength = String(cell.value || '').length;
        if (cellLength > maxLength) maxLength = cellLength;
      });
      col.width = Math.min(Math.max(maxLength + 2, 10), 60); // Min 10, max 60
    }
  }

  // --- Auto-filter ---
  if (autoFilter && headers.length > 0) {
    const lastCol = String.fromCharCode(64 + Math.min(headers.length, 26)); // A-Z
    worksheet.autoFilter = `A1:${lastCol}1`;
  }

  // --- Freeze header row ---
  if (freezeHeader) {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  // --- Write file ---
  const outPath = path.resolve(filepath);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await workbook.xlsx.writeFile(outPath);

  return {
    success: true,
    filepath: outPath,
    sheetName,
    rowsWritten: items.length,
    columnsWritten: headers.length,
    headers,
    fileSize: (await fs.stat(outPath)).size,
  };
}

/**
 * Export multiple datasets to a multi-sheet Excel workbook.
 *
 * @param {Object} sheets - { sheetName: data, ... }
 * @param {Object} options
 * @param {string} options.filepath - Output file path (.xlsx)
 * @param {boolean} [options.styled=true]
 * @returns {Promise<Object>}
 */
async function exportMultiSheet(sheets, options = {}) {
  const ExcelJS = await loadExcelJS();
  if (!ExcelJS) {
    throw new Error('exceljs is not installed. Run: npm install exceljs');
  }

  const { filepath, styled = true } = options;

  if (!filepath) {
    throw new Error('filepath is required');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'XActions (xactions.app)';
  workbook.created = new Date();

  const sheetSummaries = [];

  for (const [sheetName, data] of Object.entries(sheets)) {
    const items = normalizeData(data);
    if (!items.length) {
      sheetSummaries.push({ sheetName, rows: 0 });
      continue;
    }

    const headers = extractHeaders(items);
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = headers.map((h) => ({ header: h, key: h, width: 15 }));

    for (const item of items) {
      const row = {};
      for (const key of headers) {
        row[key] = formatCellValue(item?.[key]);
      }
      worksheet.addRow(row);
    }

    if (styled) {
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = HEADER_STYLE.font;
        cell.fill = HEADER_STYLE.fill;
        cell.alignment = HEADER_STYLE.alignment;
      });
    }

    // Auto-width
    for (const col of worksheet.columns) {
      let maxLength = col.header?.length || 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = String(cell.value || '').length;
        if (len > maxLength) maxLength = len;
      });
      col.width = Math.min(Math.max(maxLength + 2, 10), 60);
    }

    // Auto-filter + freeze
    if (headers.length > 0) {
      const lastCol = String.fromCharCode(64 + Math.min(headers.length, 26));
      worksheet.autoFilter = `A1:${lastCol}1`;
    }
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheetSummaries.push({ sheetName, rows: items.length, columns: headers.length });
  }

  const outPath = path.resolve(filepath);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await workbook.xlsx.writeFile(outPath);

  return {
    success: true,
    filepath: outPath,
    sheets: sheetSummaries,
    totalRows: sheetSummaries.reduce((sum, s) => sum + s.rows, 0),
    fileSize: (await fs.stat(outPath)).size,
  };
}

/**
 * Read an Excel file into an array of objects (first sheet by default).
 *
 * @param {Object} options
 * @param {string} options.filepath - Path to .xlsx file
 * @param {string} [options.sheetName] - Sheet name (default: first sheet)
 * @returns {Promise<Object[]>}
 */
async function readFromExcel(options = {}) {
  const ExcelJS = await loadExcelJS();
  if (!ExcelJS) {
    throw new Error('exceljs is not installed. Run: npm install exceljs');
  }

  const { filepath, sheetName } = options;
  if (!filepath) throw new Error('filepath is required');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.resolve(filepath));

  const worksheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0];

  if (!worksheet) throw new Error(`Sheet "${sheetName || 'first'}" not found`);

  const rows = [];
  const headers = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => headers.push(String(cell.value || '')));
    } else {
      const obj = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) obj[header] = cell.value;
      });
      rows.push(obj);
    }
  });

  return rows;
}

// ============================================================================
// Plugin Definition
// ============================================================================

export const name = 'xactions-plugin-excel';
export const version = '1.0.0';
export const description = 'Export scraped X/Twitter data to Excel (.xlsx) files with styling and auto-filters';

/**
 * MCP tool definitions — AI agents (Claude, GPT) can call these
 */
export const tools = [
  {
    name: 'x_export_to_excel',
    description:
      'Export scraped X/Twitter data (followers, tweets, likes, etc.) to a styled Excel (.xlsx) file ' +
      'with auto-filters, frozen headers, and auto-fit column widths.',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: ['array', 'object'],
          description: 'Array of objects or raw scraper output to export',
        },
        filepath: {
          type: 'string',
          description: 'Output file path (e.g., "./followers.xlsx")',
        },
        sheetName: {
          type: 'string',
          description: 'Sheet/tab name (default: "Data")',
        },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Explicit column order (default: all keys from data)',
        },
      },
      required: ['data', 'filepath'],
    },
    handler: async (args) => {
      return await exportToExcel(args.data, {
        filepath: args.filepath,
        sheetName: args.sheetName,
        columns: args.columns,
      });
    },
  },
  {
    name: 'x_export_multi_sheet_excel',
    description:
      'Export multiple datasets to separate sheets in a single Excel workbook. ' +
      'Pass an object like { "Followers": followersData, "Tweets": tweetsData }.',
    inputSchema: {
      type: 'object',
      properties: {
        sheets: {
          type: 'object',
          description: 'Object mapping sheet names to data arrays: { "SheetName": [...], ... }',
        },
        filepath: {
          type: 'string',
          description: 'Output file path (e.g., "./twitter-data.xlsx")',
        },
      },
      required: ['sheets', 'filepath'],
    },
    handler: async (args) => {
      return await exportMultiSheet(args.sheets, { filepath: args.filepath });
    },
  },
  {
    name: 'x_read_from_excel',
    description: 'Read an Excel (.xlsx) file into an array of objects. First row is used as headers.',
    inputSchema: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the .xlsx file',
        },
        sheetName: {
          type: 'string',
          description: 'Sheet name (default: first sheet)',
        },
      },
      required: ['filepath'],
    },
    handler: async (args) => {
      return await readFromExcel(args);
    },
  },
];

/**
 * Express route handlers
 */
export const routes = [
  {
    method: 'post',
    path: '/export',
    description: 'Export data to an Excel file',
    handler: async (req, res) => {
      try {
        const { data, filepath, sheetName, columns } = req.body;
        if (!data || !filepath) {
          return res.status(400).json({ error: 'data and filepath are required' });
        }
        const result = await exportToExcel(data, { filepath, sheetName, columns });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  },
  {
    method: 'post',
    path: '/export-multi',
    description: 'Export multiple datasets to a multi-sheet Excel file',
    handler: async (req, res) => {
      try {
        const { sheets: sheetData, filepath } = req.body;
        if (!sheetData || !filepath) {
          return res.status(400).json({ error: 'sheets and filepath are required' });
        }
        const result = await exportMultiSheet(sheetData, { filepath });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  },
  {
    method: 'post',
    path: '/read',
    description: 'Read an Excel file and return data as JSON',
    handler: async (req, res) => {
      try {
        const { filepath, sheetName } = req.body;
        if (!filepath) {
          return res.status(400).json({ error: 'filepath is required' });
        }
        const data = await readFromExcel({ filepath, sheetName });
        res.json({ success: true, rows: data.length, data });
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
    console.log('📗 xactions-plugin-excel loaded');
  },
  onUnload() {
    console.log('📗 xactions-plugin-excel unloaded');
  },
};

/**
 * Export core functions for programmatic use
 */
export {
  exportToExcel,
  exportMultiSheet,
  readFromExcel,
  normalizeData,
};

export default {
  name,
  version,
  description,
  tools,
  routes,
  hooks,
};
