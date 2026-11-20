# 📝 Profile Management

Edit and manage your X/Twitter profile — update bio, avatar, header, filter posts, and share QR codes.

## 📋 What It Does

1. Updates profile fields (name, bio, location, website)
2. Uploads avatar and header images
3. Filters posts on your profile (2026 feature)
4. Generates shareable QR codes

## 🌐 Browser Console Script

```javascript
// Go to: x.com/settings/profile
// Paste scripts/editProfile.js (configure UPDATES at top of script)
```

### Quick Bio Update

```javascript
(() => {
  const editBtn = document.querySelector('[data-testid="editProfileButton"]');
  if (editBtn) editBtn.click();
  // Wait for dialog, then interact with form fields
})();
```

## 📦 Node.js Module

```javascript
import { getProfile, updateProfile, uploadAvatar } from 'xactions/src/profileManager.js';

// Get profile info
const profile = await getProfile(page, 'nichxbt');

// Update profile fields
await updateProfile(page, {
  name: 'New Display Name',
  bio: 'Building tools for the X ecosystem 🚀',
  location: 'Worldwide',
  website: 'https://xactions.app',
});

// Upload new avatar
await uploadAvatar(page, './avatar.png');
```

## 🔧 MCP Server

```
Tool: x_get_profile
Input: { "username": "nichxbt" }

Tool: x_update_profile
Input: { "name": "Display Name", "bio": "New bio text" }
```

## 📊 Profile Features (2026)

| Feature | Description | Tier |
|---------|-------------|------|
| Display name | 50 char max | Free |
| Bio | 160 char max | Free |
| Location | Text or coordinates | Free |
| Website | Single URL | Free |
| Avatar | 400x400 recommended | Free |
| Header image | 1500x500 recommended | Free |
| Profile category | Label your account type | Premium |
| Post filtering | Filter visible posts by type | New 2026 |
| QR code sharing | Scannable profile QR | Free |

## ⚠️ Notes

- Profile changes may take a few minutes to propagate
- Avatar and header uploads support JPG, PNG, GIF (≤2MB for avatar, ≤5MB for header)
- Post filtering (2026) lets visitors filter your profile by replies, media, articles
- Business profiles require Verified Organizations subscription
