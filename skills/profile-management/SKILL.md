---
name: profile-management
description: Manage X/Twitter profile settings including display name, bio, avatar, header image, theme color, verification status, QR codes, and the new post filtering feature. Automate profile updates, sync contacts, manage labels, and customize appearance.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Profile Management with XActions

Automate and manage all aspects of your X/Twitter profile.

## Features

- **Edit Profile**: Update display name, username, bio, location, website, birthdate, pronouns
- **Visual Customization**: Change profile picture, header/banner image, theme color (Premium)
- **Verification**: Blue checkmark management (Premium/Premium+)
- **QR Code**: Generate shareable profile QR codes
- **Contact Sync**: Sync phone/email contacts to find users
- **Labels**: View and manage auto-labels (state-affiliated, election tags)
- **Post Filtering**: View any account's posts sorted by latest or most liked (New 2026)
- **Username History**: Transparency controls for account creation date and username changes

## Browser Console Script

**File:** `scripts/editProfile.js`

Automate profile updates directly from the browser console.

### How to use

1. Navigate to `x.com/settings/profile`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Edit profile button | `[data-testid="editProfileButton"]` |
| Name input | `input[name="displayName"]` |
| Bio textarea | `textarea[name="description"]` |
| Location input | `input[name="location"]` |
| Website input | `input[name="url"]` |
| Save button | `[data-testid="Profile_Save_Button"]` |
| Avatar edit | `[data-testid="editProfileAvatar"]` |
| Header edit | `[data-testid="editProfileHeader"]` |

## MCP Tools

- `x_update_profile` – Update profile fields (name, bio, location, website)
- `x_get_profile` – Scrape detailed profile information
- `x_filter_posts` – Filter any user's posts by latest/most liked

## API Endpoints

- `POST /api/profile/update` – Update profile fields
- `GET /api/profile/:username` – Get profile data
- `GET /api/profile/:username/posts?sort=latest|most_liked` – Filtered post view

## Related Files

- `src/updateProfile.js` – Profile update automation (bio, name, location, website)
- `src/qrCodeSharing.js` – Generate shareable QR codes for any profile
- `src/backupAccount.js` – Export tweets, likes, followers as JSON
- `src/downloadAccountData.js` – Trigger Twitter's official data archive
- `scripts/twitter/update-bio.js` – Browser console script for bio updates
- `scripts/twitter/update-banner.js` – Browser console script for banner updates
- `scripts/twitter/update-profile-picture.js` – Browser console script for avatar
- `scripts/twitter/backup-account.js` – Full account backup script
- `scripts/scrapeProfile.js` – Profile scraping script

## Additional Scripts

### QR Code Sharing (`src/qrCodeSharing.js`)

Generate a scannable QR code for any X profile. Displays overlay + auto-downloads as PNG.

### Backup Account (`src/backupAccount.js`)

Scrape and download visible account data: profile, tweets, likes, following, followers.

### Download Account Data (`src/downloadAccountData.js`)

Helper to trigger Twitter's official data archive (Settings > Download your data).

## Notes

- Profile picture must be JPEG/PNG, max 2MB
- Header image recommended 1500x500px
- Bio limit: 160 characters
- Display name limit: 50 characters
- Theme color customization requires Premium
- Post filtering (latest/most liked) available for all accounts (2026 feature)
- QR codes use qrserver.com API
- Backup only captures visible data; increase maxItems in CONFIG for more
