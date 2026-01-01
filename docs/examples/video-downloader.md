# 🎬 X Video Downloader

Download any video from X/Twitter posts directly to your device.

## 📋 What It Does

1. Searches page data for all video URLs
2. Sets up network interceptor to capture streams
3. Finds all available video qualities
4. Auto-selects highest quality
5. Downloads as MP4 (or opens in new tab)
6. Copies URL to clipboard

## 🌐 Browser Console Script

```javascript
// Go to: x.com/user/status/123456 (any tweet with a video)
// IMPORTANT: Click PLAY on the video first!
// Open Console (Ctrl+Shift+J) and paste the script from:
// src/scrapers/videoDownloader.js
```

## ⚙️ Configuration

```javascript
const CONFIG = {
  QUALITY: 'highest',      // 'highest', 'lowest', 'all'
  AUTO_DOWNLOAD: true,     // Auto-download best quality
  SHOW_ALL_QUALITIES: true // Show all available resolutions
};
```

## 📁 Output

- MP4 file downloaded to your device
- URL copied to clipboard
- `window.xVideo.best` - Best quality URL
- `window.xVideo.all` - All available qualities
- `window.xVideo.author` - Tweet author
- `window.xVideo.tweetId` - Tweet ID

## 💡 Tips

1. **Click play on the video first** - This loads the video URL
2. **Run the script** - It will find and download
3. **If first run fails**, it sets up an interceptor - just run again
4. **Multiple qualities** - Script shows all, picks the best

## ⚠️ Notes

- Works on tweets with native X/Twitter videos
- GIFs on X are actually videos - this works on them too
- May not work on embedded YouTube/external videos
- Some videos open in new tab due to CORS - just right-click → Save Video As

## 🔧 Troubleshooting

**"No video found"**
- Make sure you're on a tweet page (x.com/user/status/123)
- Click play on the video first
- Run the script again (interceptor is now active)

**"CORS blocked / Opens in new tab"**
- This is normal for cross-origin videos
- Right-click the video → Save Video As

**Download doesn't start**
- Right-click the URL in console → Open in new tab
- Then right-click → Save Video As

---

*Part of [XActions](https://github.com/nirholas/XActions) by [@nichxbt](https://x.com/nichxbt)*
