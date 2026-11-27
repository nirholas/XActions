// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        qrCodeSharing.js
 * @title       QR Code Profile Sharing
 * @description Generate a shareable QR code for any X profile, shown in an overlay and downloadable as a PNG.
 * @category    profile
 * @page        x.com/<username> or x.com/*
 * @writes      false
 * @aliases     scripts/qrCodeSharing.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// QR Code Profile Sharing on X - by nichxbt
// https://github.com/nirholas/xactions
// Generate a shareable QR code for any X profile
// 1. Go to a profile page (x.com/USERNAME), or any page on x.com and set CONFIG.username
// 2. Open the Developer Console (F12)
// 3. Edit the username below (optional), and darkColor / lightColor to recolor the code
// 4. Paste browser/qrCodeSharing.js into the Developer Console and run it
//
// Last Updated: 27 November 2026
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

  // '#abc' or '#aabbcc' -> [r, g, b]
  const parseHex = (hex) => {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const c = parseInt(h, 16);
    if (h.length !== 6 || Number.isNaN(c)) return null;
    return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  };

  // Canvas renderer: loads the QR image and redraws it with CONFIG.darkColor / CONFIG.lightColor
  const renderQRCanvas = async (qrUrl, size, dark, light) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `${qrUrl}&format=png`;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const darkRgb = parseHex(dark) || [0, 0, 0];
    const lightRgb = parseHex(light) || [255, 255, 255];
    const isDefault = darkRgb.join() === '0,0,0' && lightRgb.join() === '255,255,255';
    if (!isDefault) {
      const imageData = ctx.getImageData(0, 0, size, size);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
        const [r, g, b] = brightness < 128 ? darkRgb : lightRgb;
        d[i] = r; d[i + 1] = g; d[i + 2] = b;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return canvas;
  };

  const downloadCanvas = (canvas, filename) => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadFromUrl = async (qrUrl, filename) => {
    const response = await fetch(qrUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const run = async () => {
    console.log('📱 QR CODE SHARING - XActions by nichxbt');

    let username = CONFIG.username.replace(/^@/, '');
    if (!username) {
      const match = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
      username = match ? match[1] : '';
    }

    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(username)) {
      console.error('❌ Set CONFIG.username or navigate to a profile page!');
      return;
    }

    const profileUrl = `https://x.com/${username}`;
    const qrUrl = generateQRCode(profileUrl, CONFIG.size);
    const filename = `qr-${username}.png`;

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

    // Render on a canvas so custom colors apply; fall back to the plain image if the canvas fails
    let canvas = null;
    try {
      canvas = await renderQRCanvas(qrUrl, CONFIG.size, CONFIG.darkColor, CONFIG.lightColor);
    } catch (e) {
      console.warn('⚠️ Could not render the QR code on a canvas; showing the plain image (custom colors not applied).');
    }

    // Create a floating overlay with the QR code
    const overlay = document.createElement('div');
    overlay.id = 'xactions-qr-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    const card = document.createElement('div');
    card.style.cssText = 'background:white;border-radius:16px;padding:32px;text-align:center;max-width:400px;cursor:default;';
    card.innerHTML = `
      <h2 style="margin:0 0 8px 0;font-size:20px;color:#000;">@${username}</h2>
      <p style="margin:0 0 16px 0;color:#666;font-size:14px;">Scan to visit profile</p>
    `;
    const qrStyle = `width:${CONFIG.size}px;height:${CONFIG.size}px;border:2px solid #eee;border-radius:8px;`;
    if (canvas) {
      canvas.style.cssText = qrStyle;
      card.appendChild(canvas);
    } else {
      const img = document.createElement('img');
      img.src = qrUrl;
      img.alt = 'QR Code';
      img.style.cssText = qrStyle;
      card.appendChild(img);
    }

    const save = async () => {
      try {
        if (canvas) downloadCanvas(canvas, filename);
        else await downloadFromUrl(qrUrl, filename);
        console.log('📥 QR code downloaded');
      } catch (e) {
        console.log('💡 Right-click the QR code to save it manually');
      }
    };

    const dlBtn = document.createElement('button');
    dlBtn.textContent = '📥 Download QR';
    dlBtn.style.cssText = 'margin-top:16px;padding:8px 20px;border:none;border-radius:8px;background:#1d9bf0;color:white;font-size:14px;cursor:pointer;';
    dlBtn.onclick = (e) => { e.stopPropagation(); save(); };
    card.appendChild(dlBtn);

    const footer = document.createElement('p');
    footer.style.cssText = 'margin:12px 0 0 0;color:#999;font-size:12px;';
    footer.textContent = 'Click outside to close • XActions by nichxbt';
    card.appendChild(footer);

    card.onclick = (e) => e.stopPropagation();
    overlay.onclick = () => overlay.remove();
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    console.log('✅ QR code displayed! Click outside overlay to close.');

    if (CONFIG.autoDownload) {
      // Download as image
      await save();
    }
  };

  run();
})();
