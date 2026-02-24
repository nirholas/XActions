---
name: profile-management
description: Updates X/Twitter profile information including bio, avatar, header image, display name, and QR code sharing. Use when users want to update their X profile or share profile via QR code.
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

### Key Selectors

| Element | Selector |
|---------|----------|
| Edit profile button | `[data-testid="editProfileButton"]` |
| Avatar edit | `[data-testid="editProfileAvatar"]` |
| Header edit | `[data-testid="editProfileHeader"]` |
| Save button | `[data-testid="Profile_Save_Button"]` |

## QR Code Sharing

**File:** `src/qrCodeSharing.js`

Generates a shareable QR code for your X profile.

## Notes

- Bio max: 160 characters
- Display name max: 50 characters
- Avatar: square image, recommended 400x400px
- Header: 1500x500px recommended
