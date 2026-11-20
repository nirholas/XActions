# ⚙️ Settings & Privacy Management

Export, audit, and manage your X/Twitter account settings, privacy controls, and security configuration.

## 📋 What It Does

1. Audits your current privacy and security settings
2. Exports a snapshot of all toggle states
3. Manages blocked and muted accounts
4. Requests data download archives

## 🌐 Browser Console Script

```javascript
// Go to: x.com/settings
// Paste scripts/manageSettings.js
```

### Quick Privacy Audit

```javascript
(() => {
  const toggles = [];
  document.querySelectorAll('[role="switch"]').forEach(sw => {
    const label = sw.parentElement?.textContent?.trim()?.substring(0, 80) || '';
    const enabled = sw.getAttribute('aria-checked') === 'true';
    toggles.push({ label, enabled });
  });
  console.table(toggles);
})();
```

## 📦 Node.js Module

```javascript
import { getSettings, toggleProtectedAccount, getBlockedAccounts, requestDataDownload } from 'xactions/src/settingsManager.js';

// Export settings
const settings = await getSettings(page);

// Toggle protected (private) account
await toggleProtectedAccount(page, true);

// Get blocked accounts
const blocked = await getBlockedAccounts(page);

// Request data download
await requestDataDownload(page);
```

## 🔧 MCP Server

```
Tool: x_get_settings
Input: {}

Tool: x_toggle_protected
Input: { "protected": true }

Tool: x_request_data_download
Input: {}
```

## 🔐 Security Checklist

- [ ] Enable 2FA (authenticator app recommended)
- [ ] Review connected apps and revoke unused ones
- [ ] Check login history for suspicious activity
- [ ] Set strong password (not reused)
- [ ] Review who can tag you in photos
- [ ] Check DM privacy settings
- [ ] Review ad personalization preferences
- [ ] Check data sharing permissions

## 📊 Key Settings

| Setting | Path | Description |
|---------|------|-------------|
| Password | /settings/password | Change password |
| 2FA | /settings/account/login_verification | Two-factor auth |
| Protected | /settings/audience_and_tagging | Private account |
| Muted words | /settings/muted_keywords | Filter content |
| Blocked accounts | /settings/blocked/all | Manage blocks |
| Data download | /settings/download_your_data | Request archive |
| Deactivate | /settings/deactivate | Delete account |

## ⚠️ Notes

- Data download requests can take 24-48 hours to process
- Protected (private) accounts hide tweets from non-followers
- 2FA via authenticator app is more secure than SMS
- In 2026, X expanded data portability controls under DSA/DMA compliance
- Passkey support was added in late 2025
