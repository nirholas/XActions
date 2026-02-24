```skill
---
name: settings-privacy
description: Manage X/Twitter settings and privacy including account security, 2FA, protected accounts, content filters, muting/blocking, discoverability, data downloads, delegate access, suspension appeals, and the 2026 expanded privacy policy for AI/training data collection.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Settings & Privacy with XActions

Automate and manage all X/Twitter settings and privacy controls.

## Features

### Account Settings
- **Login/Password**: Manage credentials, password reset
- **2FA**: Two-factor authentication (SMS, app, security key)
- **Mobile Login**: Login verification on mobile devices
- **Username/Email/Phone**: Update account identifiers
- **Country Settings**: Region and language preferences
- **Data Download**: Request account data archive
- **Activity Dashboard**: View account activity metrics
- **Delegate Access**: Grant account access to others
- **Deactivation**: Deactivate/reactivate account
- **Suspension Appeals**: Appeal account suspensions

### Privacy & Safety
- **Protected Account**: Lock tweets to approved followers only
- **Tagging Controls**: Who can tag you in photos/posts
- **Content Filters**: Sensitive content visibility
- **Mute/Block**: Manage blocked and muted users/words
- **Remove Followers**: Remove followers without blocking
- **Discoverability**: Hide from search results
- **DM Controls**: Who can send you DMs
- **Advanced Muting**: Mute phrases, hashtags, time-limited

### Content Preferences
- **Algorithm Tweaks**: Reduce politics, adjust recommendations
- **Language Settings**: Interface and content language
- **Dark Mode**: Theme preference
- **Font Size**: Display size settings
- **Accessibility**: High-contrast, voiceover support

### 2026 Privacy Changes
- **Expanded Data Collection**: Personal data for AI/training
- **"Everything App" Data**: Finance and calls data collection
- **Shadowban Checks**: Beta opt-in for transparency

## Browser Console Script

**File:** `scripts/manageSettings.js`

### How to use

1. Navigate to `x.com/settings`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Settings nav | `a[href="/settings"]` |
| Account tab | `a[href="/settings/account"]` |
| Privacy tab | `a[href="/settings/privacy_and_safety"]` |
| Notifications tab | `a[href="/settings/notifications"]` |
| Toggle switch | `[data-testid="settingsSwitch"]` |
| Protected toggle | `[data-testid="protectedTweets"]` |
| Data download | `a[href="/settings/download_data"]` |
| Deactivate | `a[href="/settings/deactivate"]` |
| 2FA settings | `a[href="/settings/account/login_verification"]` |

## MCP Tools

- `x_get_settings` – Get current account settings
- `x_update_settings` – Update settings
- `x_toggle_protected` – Toggle protected account
- `x_manage_blocks` – View/manage blocked users
- `x_manage_mutes` – View/manage muted users/words
- `x_download_data` – Request data archive
- `x_delegate_access` – Manage delegate accounts

## API Endpoints

- `GET /api/settings` – Get settings
- `PUT /api/settings` – Update settings
- `POST /api/settings/protected` – Toggle protected mode
- `GET /api/settings/blocks` – List blocked users
- `GET /api/settings/mutes` – List muted users
- `POST /api/settings/data-download` – Request archive
- `POST /api/settings/delegate` – Add delegate

## Related Files

- `src/settingsManager.js` – Core settings module
- `src/massBlock.js` – Mass block users
- `src/massUnblock.js` – Mass unblock
- `src/massUnmute.js` – Mass unmute
- `src/muteByKeywords.js` – Keyword muting
- `src/removeFollowers.js` – Remove followers
- `scripts/manageSettings.js` – Browser settings script

## Notes

- Protected accounts limit visibility to approved followers
- 2FA strongly recommended for all accounts
- Data downloads may take 24-48 hours to generate
- Delegate access allows others to post/manage without password
- 2026 privacy policy significantly expands data collection for AI
- Shadowban check available in beta settings
```
