// scripts/qrCodeSharing.js
// Browser console script for generating a QR code for any X/Twitter profile
// Paste in DevTools console on x.com/USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    size: 256,                // QR code size in pixels
    darkColor: '#000',        // QR module color
    lightColor: '#fff',       // Background color
    autoDownload: false,      // Download PNG automatically
  };
  // =============================================

  // Canvas-based QR renderer — loads QR image, redraws with custom colors
  const generateQR = async (text, size, dark, light) => {
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = apiUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    // Recolor if custom colors are set
    if (dark !== '#000' || light !== '#fff') {
      const imageData = ctx.getImageData(0, 0, size, size);
      const d = imageData.data;
      const parseCss = (hex) => { const c = parseInt(hex.replace('#',''), 16); return [(c>>16)&255,(c>>8)&255,c&255]; };
      const [dr, dg, db] = parseCss(dark);
      const [lr, lg, lb] = parseCss(light);
      for (let i = 0; i < d.length; i += 4) {
        const brightness = (d[i] + d[i+1] + d[i+2]) / 3;
        if (brightness < 128) { d[i]=dr; d[i+1]=dg; d[i+2]=db; }
        else { d[i]=lr; d[i+1]=lg; d[i+2]=lb; }
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return canvas;
  };

  const download = (canvas, filename) => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const run = async () => {
    console.log('📱 QR CODE SHARING — XActions by nichxbt');
    console.log('━'.repeat(45));

    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    const username = pathMatch ? pathMatch[1] : null;

    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(username)) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      return;
    }

    const profileUrl = `https://x.com/${username}`;
    console.log(`\n👤 Profile: @${username}`);
    console.log(`🔗 URL: ${profileUrl}\n`);

    console.log('🔲 Generating QR code...');
    let canvas;
    try {
      canvas = await generateQR(profileUrl, CONFIG.size, CONFIG.darkColor, CONFIG.lightColor);
    } catch {
      console.error('❌ Failed to generate QR code. Check your internet connection.');
      return;
    }

    // Show overlay
    const overlay = document.createElement('div');
    overlay.id = 'xactions-qr-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    const card = document.createElement('div');
    card.style.cssText = 'background:white;border-radius:16px;padding:32px;text-align:center;max-width:400px;';
    card.innerHTML = `<h2 style="margin:0 0 8px;font-size:20px;color:#000;">@${username}</h2><p style="margin:0 0 16px;color:#666;font-size:14px;">Scan to visit profile</p>`;
    canvas.style.cssText = `width:${CONFIG.size}px;height:${CONFIG.size}px;border:2px solid #eee;border-radius:8px;`;
    card.appendChild(canvas);

    const dlBtn = document.createElement('button');
    dlBtn.textContent = '📥 Download QR';
    dlBtn.style.cssText = 'margin-top:16px;padding:8px 20px;border:none;border-radius:8px;background:#1d9bf0;color:white;font-size:14px;cursor:pointer;';
    dlBtn.onclick = (e) => { e.stopPropagation(); download(canvas, `qr-${username}.png`); };
    card.appendChild(dlBtn);

    const footer = document.createElement('p');
    footer.style.cssText = 'margin:12px 0 0;color:#999;font-size:12px;';
    footer.textContent = 'Click outside to close • XActions by nichxbt';
    card.appendChild(footer);

    card.onclick = (e) => e.stopPropagation();
    overlay.onclick = () => overlay.remove();
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    console.log('✅ QR code displayed! Click outside overlay to close.');

    if (CONFIG.autoDownload) {
      download(canvas, `qr-${username}.png`);
      console.log('📥 QR code downloaded');
    }

    console.log('');
  };

  run();
})();
