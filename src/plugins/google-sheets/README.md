# 📊 XActions Google Sheets Plugin

> Export scraped X/Twitter data directly to Google Sheets — no copy-paste, no CSV import.

**Plugin:** `xactions-plugin-google-sheets`
**Author:** nich ([@nichxbt](https://x.com/nichxbt))

---

## ⚡ Quick Start

### 1. Install the dependency

```bash
npm install googleapis
```

### 2. Set up authentication

Choose one method:

| Method | Env Variable | Best For |
|--------|-------------|----------|
| Service account (JSON string) | `GOOGLE_SERVICE_ACCOUNT_KEY` | Servers, CI/CD, automated exports |
| Service account (key file) | `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | Local development |
| OAuth2 access token | `GOOGLE_ACCESS_TOKEN` | Short-lived / user-facing apps |
| API key | `GOOGLE_API_KEY` | Read-only access to public sheets |

**Recommended: Service account**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create a Service Account → Generate a JSON key
3. Enable the Google Sheets API
4. Share your target spreadsheet with the service account email (`...@...iam.gserviceaccount.com`)
5. Set the env var:

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY_FILE="./service-account-key.json"
```

### 3. Use it

```javascript
import { exportToGoogleSheets } from 'xactions/plugins/google-sheets';

// After scraping followers...
const result = await exportToGoogleSheets(followers, {
  spreadsheetId: 'YOUR_SPREADSHEET_ID',  // from the Sheet URL
  sheetName: 'Followers',
  mode: 'append',  // 'append' | 'replace' | 'new-sheet'
});

console.log(`✅ Exported ${result.rowsWritten} rows → ${result.url}`);
```

---

## 🖥️ CLI Usage

All scrape commands now support `--google-sheets`:

```bash
# Scrape followers and push directly to Google Sheets
xactions followers @nichxbt --google-sheets YOUR_SPREADSHEET_ID --sheet-name Followers

# Scrape tweets and append to a sheet
xactions tweets @nichxbt -l 200 --google-sheets YOUR_SPREADSHEET_ID --sheet-name Tweets

# Replace instead of append
xactions following @nichxbt --google-sheets YOUR_SPREADSHEET_ID --sheet-mode replace
```

---

## 🤖 MCP Tools (AI Agents)

The plugin registers three MCP tools:

| Tool | Description |
|------|-------------|
| `x_export_to_google_sheets` | Export data to an existing Google Sheet |
| `x_read_from_google_sheets` | Read data from a Google Sheet into objects |
| `x_create_google_spreadsheet` | Create a new spreadsheet and return its ID |

**Example AI agent prompt:**
> "Scrape @nichxbt's followers and export them to my Google Sheet 1BxiM..."

---

## 🔌 REST API

When loaded as a plugin, these routes are available:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/plugins/xactions-plugin-google-sheets/export` | Export data to a sheet |
| `GET` | `/api/plugins/xactions-plugin-google-sheets/read` | Read data from a sheet |
| `POST` | `/api/plugins/xactions-plugin-google-sheets/create` | Create a new spreadsheet |

**Example:**

```bash
curl -X POST http://localhost:3000/api/plugins/xactions-plugin-google-sheets/export \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{"username": "nichxbt", "followers": 12500}],
    "spreadsheetId": "YOUR_ID",
    "sheetName": "Followers",
    "mode": "append"
  }'
```

---

## 📖 API Reference

### `exportToGoogleSheets(data, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `spreadsheetId` | `string` | **required** | Google Sheet ID from URL |
| `sheetName` | `string` | `'Sheet1'` | Target tab name |
| `mode` | `string` | `'append'` | `'append'`, `'replace'`, or `'new-sheet'` |
| `columns` | `string[]` | all keys | Explicit column order |
| `includeHeaders` | `boolean` | `true` | Write header row |

**Returns:** `{ success, spreadsheetId, rowsWritten, columnsWritten, headers, url }`

### `readFromGoogleSheets(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `spreadsheetId` | `string` | **required** | Google Sheet ID |
| `sheetName` | `string` | `'Sheet1'` | Tab name |
| `range` | `string` | entire sheet | Custom A1 range |

**Returns:** `Object[]` — array of objects keyed by header row

### `createSpreadsheet(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | `'XActions Export'` | Spreadsheet title |
| `sheetNames` | `string[]` | `['Sheet1']` | Tabs to create |

**Returns:** `{ spreadsheetId, url, title, sheetNames }`
