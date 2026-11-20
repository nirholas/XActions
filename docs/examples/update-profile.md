# ✏️ Update Profile

Update your X/Twitter display name, bio, location, and website from the browser console.

---

## 📋 What It Does

1. Opens the Edit Profile dialog
2. Clears and fills in updated values for:
   - Display name
   - Bio
   - Location
   - Website
3. Clicks Save to apply changes

---

## 🌐 Browser Console Script

**Steps:**
1. Go to your profile page (`x.com/yourusername`)
2. Edit CONFIG with your new info
3. Open console (F12) and paste `browser/updateProfile.js`

**Configuration:**
```javascript
const CONFIG = {
  displayName: 'nichxbt',
  bio: '⚡ Building XActions — the complete X automation toolkit. Open source.',
  location: 'San Francisco, CA',
  website: 'https://xactions.app',
};
```

---

## 📁 Files

- `browser/updateProfile.js` — Browser console profile updater
- `scripts/twitter/update-bio.js` — Extended DevTools version

## ⚠️ Notes

- Leave any field as `null` to keep its current value
- Bio has a 160-character limit enforced by X
- Display name has a 50-character limit
- The script validates lengths before submitting
- Must be on your own profile page to access Edit Profile
