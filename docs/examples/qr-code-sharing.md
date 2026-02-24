# 📱 QR Code Sharing

Generate QR codes for any X/Twitter profile — display on screen and download as PNG.

---

## 📋 What It Does

1. Takes a username or the current profile page
2. Generates a QR code pointing to the profile URL
3. Displays the QR code as an overlay on the page
4. Provides a download button to save as PNG

---

## 🌐 Browser Console Script

**Steps:**
1. Go to any page on `x.com`
2. Edit CONFIG with the target username (or leave blank to use current page)
3. Open console (F12) and paste `src/qrCodeSharing.js`

**Configuration:**
```javascript
const CONFIG = {
  username: 'nichxbt',
  size: 300,
  darkColor: '000000',
  lightColor: 'ffffff',
};
```

---

## 📁 Files

- `src/qrCodeSharing.js` — QR code generator and display

## ⚠️ Notes

- Uses the free `api.qrserver.com` API (no signup needed)
- QR code encodes the URL `https://x.com/username`
- The overlay can be closed by clicking the X button
- Size is in pixels (default 300×300)
- Colors are hex without the `#` prefix
