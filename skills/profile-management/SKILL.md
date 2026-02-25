---
name: profile-management
description: Updates X/Twitter profile information including bio, avatar, header image, display name, location, website, and QR code sharing. The agent uses this skill when a user wants to update their X profile fields or share their profile via QR code.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Profile Management

Browser console scripts for updating X/Twitter profile information.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Profile Manager | `src/profileManager.js` | Core profile management operations |
| Update Profile | `src/updateProfile.js` | Update bio, name, location, website |
| QR Code Sharing | `src/qrCodeSharing.js` | Generate and share profile QR codes |

## Update Profile

**File:** `src/updateProfile.js`

Programmatically updates profile fields: display name, bio, location, website, birth date.

### How to use

1. Navigate to `x.com/settings/profile`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Configuration

```javascript
const CONFIG = {
  displayName: 'Your Name',
  bio: 'Your new bio here',
  location: 'City, Country',
  website: 'https://example.com',
};
```

## Profile Manager

**File:** `src/profileManager.js`

Core module for reading and updating profile data. Used by other scripts that need profile context.

## QR Code Sharing

**File:** `src/qrCodeSharing.js`

Generates a shareable QR code for your X profile. Useful for cross-platform promotion.

### Key Selectors

| Element | Selector |
|---------|----------|
| Edit profile button | `[data-testid="editProfileButton"]` |
| Avatar edit | `[data-testid="editProfileAvatar"]` |
| Header edit | `[data-testid="editProfileHeader"]` |
| Save button | `[data-testid="Profile_Save_Button"]` |
| User name display | `[data-testid="UserName"]` |
| User description | `[data-testid="UserDescription"]` |

## Field Limits

| Field | Limit |
|-------|-------|
| Display name | 50 characters |
| Bio | 160 characters |
| Location | 30 characters |
| Website | Valid URL |
| Avatar | Square image, 400×400px recommended |
| Header | 1500×500px recommended |

## Notes

- Profile updates take effect immediately after saving
- Avatar and header uploads require file input interaction
- Bio supports line breaks and emoji
- All scripts include dry-run mode by default
