# 📗 XActions Excel Plugin

> Export scraped X/Twitter data to styled Excel (.xlsx) files with auto-filters, frozen headers, and multi-sheet workbooks.

**Plugin:** `xactions-plugin-excel`
**Author:** nich ([@nichxbt](https://x.com/nichxbt))

---

## ⚡ Quick Start

### 1. Install the dependency

```bash
npm install exceljs
```

### 2. Use it

```javascript
import { exportToExcel } from 'xactions/plugins/excel';

// After scraping followers...
const result = await exportToExcel(followers, {
  filepath: './followers.xlsx',
  sheetName: 'Followers',
});

console.log(`✅ Saved ${result.rowsWritten} rows to ${result.filepath}`);
```

**What you get:**
- Twitter-blue styled header row with white bold text
- Auto-fit column widths
- Auto-filter dropdowns on every column
- Frozen header row (stays visible when scrolling)
- Alternating row colors for readability

---

## 🖥️ CLI Usage

All scrape commands now support `.xlsx` output:

```bash
# Scrape followers to Excel
xactions followers @nichxbt -o followers.xlsx

# Scrape tweets to Excel with custom sheet name
xactions tweets @nichxbt -l 200 -o tweets.xlsx --sheet-name "Tweets 2026"

# Scrape following to Excel
xactions following @nichxbt -o following.xlsx
```

---

## 📚 Multi-Sheet Workbooks

Combine multiple datasets into a single Excel file:

```javascript
import { exportMultiSheet } from 'xactions/plugins/excel';

const result = await exportMultiSheet({
  'Followers': followersData,
  'Following': followingData,
  'Tweets': tweetsData,
  'Non-Followers': nonFollowersData,
}, {
  filepath: './twitter-audit.xlsx',
});

console.log(`✅ Created ${result.sheets.length}-sheet workbook with ${result.totalRows} total rows`);
```

---

## 🤖 MCP Tools (AI Agents)

| Tool | Description |
|------|-------------|
| `x_export_to_excel` | Export data to a styled .xlsx file |
| `x_export_multi_sheet_excel` | Export multiple datasets to separate sheets |
| `x_read_from_excel` | Read an .xlsx file into JSON objects |

**Example AI agent prompt:**
> "Scrape @nichxbt's followers and tweets, then save them as separate sheets in an Excel file."

---

## 🔌 REST API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/plugins/xactions-plugin-excel/export` | Export data to .xlsx |
| `POST` | `/api/plugins/xactions-plugin-excel/export-multi` | Multi-sheet export |
| `POST` | `/api/plugins/xactions-plugin-excel/read` | Read .xlsx into JSON |

---

## 📖 API Reference

### `exportToExcel(data, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filepath` | `string` | **required** | Output .xlsx path |
| `sheetName` | `string` | `'Data'` | Sheet/tab name |
| `columns` | `string[]` | all keys | Explicit column order |
| `autoFilter` | `boolean` | `true` | Add auto-filter to headers |
| `autoWidth` | `boolean` | `true` | Auto-fit column widths |
| `styled` | `boolean` | `true` | Apply header + alternating row styling |
| `freezeHeader` | `boolean` | `true` | Freeze the header row |

**Returns:** `{ success, filepath, rowsWritten, columnsWritten, headers, fileSize }`

### `exportMultiSheet(sheets, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sheets` | `Object` | **required** | `{ "SheetName": data[], ... }` |
| `filepath` | `string` | **required** | Output .xlsx path |
| `styled` | `boolean` | `true` | Apply styling |

**Returns:** `{ success, filepath, sheets: [{ sheetName, rows, columns }], totalRows, fileSize }`

### `readFromExcel(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filepath` | `string` | **required** | Path to .xlsx file |
| `sheetName` | `string` | first sheet | Sheet name to read |

**Returns:** `Object[]` — array of objects keyed by header row
