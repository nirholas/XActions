// QR Code Profile Sharing on X - by nichxbt
// https://github.com/nirholas/xactions
// Generate a shareable QR code for any X profile
// 1. Go to any page on x.com
// 2. Open the Developer Console (F12)
// 3. Edit the username below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    username: '', // Leave empty to use current page's profile
    size: 256,    // QR code size in pixels
    darkColor: '#000000',
    lightColor: '#FFFFFF',
    autoDownload: true,
  };

  // Minimal QR Code generator (no dependencies)
  // Uses the Google Charts API for simplicity
  const generateQRCode = (text, size = 256) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  };

  const run = async () => {
    console.log('📱 QR CODE SHARING - XActions by nichxbt');

    let username = CONFIG.username;
    if (!username) {
      const match = window.location.pathname.match(/^\/([^\/]+)/);
      username = match ? match[1] : '';
    }

    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(username)) {
      console.error('❌ Set CONFIG.username or navigate to a profile page!');
      return;
    }

    const profileUrl = `https://x.com/${username}`;
    const qrUrl = generateQRCode(profileUrl, CONFIG.size);

    console.log(`👤 Profile: @${username}`);
    console.log(`🔗 URL: ${profileUrl}`);
    console.log(`📱 QR Code: ${qrUrl}`);

    // Display QR code in console
    console.log('%c ', `
      font-size: 1px;
      padding: ${CONFIG.size / 2}px;
      background: url(${qrUrl}) no-repeat center;
      background-size: contain;
    `);

    // Create a floating overlay with the QR code
    const overlay = document.createElement('div');
    overlay.id = 'xactions-qr-overlay';
    overlay.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div style="background:white;border-radius:16px;padding:32px;text-align:center;max-width:400px;">
          <h2 style="margin:0 0 8px 0;font-size:20px;color:#000;">@${username}</h2>
          <p style="margin:0 0 16px 0;color:#666;font-size:14px;">Scan to visit profile</p>
          <img src="${qrUrl}" alt="QR Code" style="width:${CONFIG.size}px;height:${CONFIG.size}px;border:2px solid #eee;border-radius:8px;">
          <p style="margin:16px 0 0 0;color:#999;font-size:12px;">Click anywhere to close • XActions by nichxbt</p>
        </div>
      </div>
    `;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);

    if (CONFIG.autoDownload) {
      // Download as image
      try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${username}.png`;
        a.click();
        console.log('📥 QR code downloaded');
      } catch (e) {
        console.log('💡 Right-click the QR code to save it manually');
      }
    }
  };

  run();
})();
