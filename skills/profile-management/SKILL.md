---
name: profile-management
description: Updates X/Twitter profile information including bio, avatar, header image, display name, location, website, and QR code sharing. Use when updating profile fields, optimizing profile for growth, or sharing profile via QR code.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Profile Management

Browser console scripts for updating X/Twitter profile information.

## Script Selection

| Script | File | Purpose |
|--------|------|---------|
| Profile Manager | `src/profileManager.js` | Core profile management operations |
| Update Profile | `src/updateProfile.js` | Update bio, name, location, website |
| QR Code Sharing | `src/qrCodeSharing.js` | Generate and share profile QR codes |

## Update Profile

**File:** `src/updateProfile.js`

Programmatically updates profile fields: display name, bio, location, website, birth date.

### How to Use
1. Navigate to `x.com/settings/profile`
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter

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

Generates a shareable QR code for your X profile. Useful for in-person networking and cross-platform promotion.

## DOM Selectors

| Element | Selector |
|---------|----------|
| Edit profile button | `[data-testid="editProfileButton"]` |
| Avatar edit | `[data-testid="editProfileAvatar"]` |
| Header edit | `[data-testid="editProfileHeader"]` |
| Save button | `[data-testid="Profile_Save_Button"]` |
| User name display | `[data-testid="UserName"]` |
| User description | `[data-testid="UserDescription"]` |
| User location | `[data-testid="UserLocation"]` |
| User URL | `[data-testid="UserUrl"]` |

## Field Limits

| Field | Limit |
|-------|-------|
| Display name | 50 characters |
| Bio | 160 characters |
| Location | 30 characters |
| Website | Valid URL |
| Avatar | Square image, 400x400px recommended |
| Header | 1500x500px recommended |

## Strategy Guide

### Optimizing profile for conversions
1. **Display name**: Full name + value proposition keyword (e.g., "Jane Smith | AI Engineer")
2. **Bio**: Lead with what you do, who you serve, proof (numbers), and CTA
3. **Location**: Include if relevant to your niche (e.g., "San Francisco, CA" for tech)
4. **Website**: Link to your most important conversion page (not just homepage)
5. **Avatar**: Professional headshot, face visible, good lighting, contrasting background
6. **Header**: Banner showing your work, product, or personal brand tagline

### Bio formula (160 chars max)
```
{What you do} for {who you serve}
{Proof/credentials}
{CTA or link description}
```

Example: "Building AI tools for indie hackers | 10K+ users | Free at example.com"

### Profile A/B testing
1. Use `src/updateProfile.js` to set version A
2. Run for 1 week, track follower growth with `src/followerGrowthTracker.js`
3. Switch to version B with `src/updateProfile.js`
4. Compare growth rates after another week
5. Keep the winning version

## Notes
- Profile updates take effect immediately after saving
- Avatar and header uploads require file input interaction
- Bio supports line breaks and emoji
- All scripts include dry-run mode by default
- Changes can be reverted by running the script again with old values
