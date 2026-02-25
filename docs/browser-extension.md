# Browser Extension

Chrome/Edge extension for XActions. Run automation directly from the browser toolbar — no DevTools console needed.

---

## Install

### From Source (Developer Mode)

1. Clone the repo or download the `extension/` directory
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `extension/` folder
6. The XActions icon appears in your toolbar

### Permissions

The extension requests:

| Permission | Why |
|------------|-----|
| `activeTab` | Interact with the current x.com tab |
| `storage` | Save settings and session state |
| `scripting` | Inject automation scripts into x.com |
| `alarms` | Schedule recurring tasks |
| `contextMenus` | Right-click menu integration |
| `notifications` | Desktop alerts for completed tasks |

Host permissions: `https://x.com/*` and `https://twitter.com/*` only.

---

## Usage

### Popup Interface

Click the XActions icon in your toolbar to open the popup:

- **Connection status** — green dot when connected to x.com, red when disconnected
- **Account info** — shows your X username and avatar when connected
- **Pause All** — pause all running automations
- **Emergency Stop** — immediately halt everything

### Tabs

**Automations** — start/stop automation scripts:
- Unfollow non-followers
- Auto-like by feed/hashtag/user
- Keyword follow
- Smart unfollow
- Growth suite

**Activity** — live log of actions taken (likes, follows, unfollows).

**Settings** — configure:
- Default delays between actions
- Rate limit behavior
- Notification preferences
- Dark/light theme

### Running an Automation

1. Navigate to [x.com](https://x.com) in your browser
2. Click the XActions icon
3. Verify the green "Connected" status
4. Go to the **Automations** tab
5. Select an automation (e.g., "Unfollow Non-Followers")
6. Configure options (batch size, delay, etc.)
7. Click **Start**
8. Watch progress in the **Activity** tab

---

## Architecture

```
extension/
├── manifest.json           # MV3 manifest
├── background/
│   └── service-worker.js   # Background service worker
├── content/
│   ├── bridge.js           # Content script (injected into x.com)
│   └── injected.js         # Web-accessible script for DOM access
├── popup/
│   ├── popup.html          # Popup UI
│   ├── popup.css           # Styles
│   └── popup.js            # Popup logic
└── icons/                  # Extension icons (16/32/48/128px)
```

### How It Works

1. **Content script** (`bridge.js`) is injected into x.com pages at `document_idle`
2. **Injected script** (`injected.js`) is loaded as a web-accessible resource for direct DOM manipulation
3. **Popup** communicates with the content script via `chrome.runtime.sendMessage`
4. **Service worker** handles alarms, context menus, and background scheduling

### Message Passing

```
Popup ⟷ Service Worker ⟷ Content Script ⟷ Injected Script ⟷ x.com DOM
```

The content script bridges between the extension context and the page context, since MV3 extensions can't directly access page JavaScript.

---

## Development

### Generate Icons

```bash
cd extension
node generate-icons.cjs
```

Creates icons from the source SVG at all required sizes (16, 32, 48, 128px).

### Test Changes

1. Make edits to files in `extension/`
2. Go to `chrome://extensions`
3. Click the refresh icon on the XActions extension card
4. Open a new x.com tab to test

### Debugging

- **Popup:** Right-click the XActions icon → "Inspect Popup"
- **Service worker:** Click "Service Worker" link on `chrome://extensions`
- **Content script:** Open DevTools on any x.com tab → Sources → Content Scripts → XActions

---

## Limitations

- Only works on `x.com` and `twitter.com` domains
- Requires an active x.com tab with a logged-in session
- Cannot bypass X's rate limits — respects the same delays as browser scripts
- MV3 service workers may go idle; alarms are used for reliable scheduling
