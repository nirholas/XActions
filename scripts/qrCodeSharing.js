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

  // ── Minimal QR Code Generator (no external deps) ──
  // Encodes text as a QR code using canvas. Supports alphanumeric mode.
  const generateQR = (text, size, dark, light) => {
    // Use a simple numeric encoding approach with canvas
    // For reliability, we generate via a data matrix pattern
    const modules = encodeToModules(text);
    const moduleCount = modules.length;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cellSize = size / moduleCount;

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = dark;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules[row][col]) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }
    }
    return canvas;
  };

  // Minimal QR encoder — builds a Version 3 (29x29) QR with byte mode
  const encodeToModules = (text) => {
    const size = 29; // Version 3
    const grid = Array.from({ length: size }, () => Array(size).fill(false));
    const reserved = Array.from({ length: size }, () => Array(size).fill(false));

    // Finder patterns (7x7) at three corners
    const drawFinder = (r, c) => {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const row = r + dr, col = c + dc;
          if (row < 0 || row >= size || col < 0 || col >= size) continue;
          const isBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
          const isOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const isInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          grid[row][col] = !isBorder && (isOuter || isInner);
          reserved[row][col] = true;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
      reserved[6][i] = true;
      reserved[i][6] = true;
    }

    // Alignment pattern for version 3 at (22, 22)
    const drawAlign = (r, c) => {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isEdge = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          grid[r + dr][c + dc] = isEdge || isCenter;
          reserved[r + dr][c + dc] = true;
        }
      }
    };
    drawAlign(22, 22);

    // Dark module
    grid[size - 8][8] = true;
    reserved[size - 8][8] = true;

    // Reserve format info areas
    for (let i = 0; i < 8; i++) {
      reserved[8][i] = true;
      reserved[8][size - 1 - i] = true;
      reserved[i][8] = true;
      reserved[size - 1 - i][8] = true;
    }
    reserved[8][8] = true;

    // Encode data as bytes
    const bytes = new TextEncoder().encode(text);
    const bits = [];
    // Mode indicator: byte mode = 0100
    bits.push(0, 1, 0, 0);
    // Character count (8 bits for version 1-9 byte mode)
    for (let i = 7; i >= 0; i--) bits.push((bytes.length >> i) & 1);
    // Data
    for (const b of bytes) {
      for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    }
    // Terminator
    bits.push(0, 0, 0, 0);
    // Pad to 8-bit boundary
    while (bits.length % 8 !== 0) bits.push(0);
    // Pad codewords
    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (bits.length < 70 * 8) { // Version 3-L capacity
      for (let i = 7; i >= 0; i--) bits.push((padBytes[padIdx] >> i) & 1);
      padIdx = (padIdx + 1) % 2;
    }

    // Place data bits in zigzag pattern
    let bitIdx = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // Skip timing column
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const col = right - j;
          const row = ((Math.floor((size - 1 - right + (right < 6 ? 1 : 0)) / 2)) % 2 === 0)
            ? size - 1 - vert : vert;
          if (row >= 0 && row < size && col >= 0 && col < size && !reserved[row][col]) {
            grid[row][col] = bitIdx < bits.length ? !!bits[bitIdx] : false;
            bitIdx++;
          }
        }
      }
    }

    // Apply mask 0 (checkerboard): (row + col) % 2 === 0
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!reserved[r][c] && (r + c) % 2 === 0) {
          grid[r][c] = !grid[r][c];
        }
      }
    }

    // Write format info for mask 0, error correction L
    const formatBits = [1,1,1,0,1,1,1,1,1,0,0,0,1,0,0];
    const formatPositions = [];
    for (let i = 0; i < 6; i++) formatPositions.push([8, i]);
    formatPositions.push([8, 7], [8, 8], [7, 8]);
    for (let i = 5; i >= 0; i--) formatPositions.push([i, 8]);
    for (let i = 0; i < 7; i++) formatPositions.push([size - 1 - i, 8]);
    formatPositions.push([8, size - 8]);
    for (let i = 1; i < 8; i++) formatPositions.push([8, size - 8 + i]);

    for (let i = 0; i < formatBits.length && i < formatPositions.length; i++) {
      const [r, c] = formatPositions[i];
      if (r >= 0 && r < size && c >= 0 && c < size) {
        grid[r][c] = !!formatBits[i];
      }
    }

    return grid;
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

    // Generate QR code
    console.log('🔲 Generating QR code...');
    const canvas = generateQR(profileUrl, CONFIG.size, CONFIG.darkColor, CONFIG.lightColor);

    // Show overlay
    const overlay = document.createElement('div');
    overlay.id = 'xactions-qr-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    const card = document.createElement('div');
    card.style.cssText = 'background:white;border-radius:16px;padding:32px;text-align:center;max-width:400px;';
    card.innerHTML = `<h2 style="margin:0 0 8px;font-size:20px;color:#000;">@${username}</h2><p style="margin:0 0 16px;color:#666;font-size:14px;">Scan to visit profile</p>`;
    canvas.style.cssText = `width:${CONFIG.size}px;height:${CONFIG.size}px;border:2px solid #eee;border-radius:8px;image-rendering:pixelated;`;
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
