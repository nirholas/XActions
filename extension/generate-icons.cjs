// Generate placeholder PNG icons for XActions extension
// Run: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Minimal PNG generator (no dependencies)
function createIcon(size) {
  // Create a simple canvas-like buffer for a PNG
  // We'll create a very simple BMP-style approach then use a minimal PNG encoder
  
  const pixels = [];
  const center = size / 2;
  const bgColor = [0, 0, 0]; // #000000
  const accentColor = [29, 155, 240]; // #1d9bf0
  const textColor = [231, 233, 234]; // #e7e9ea

  // Simple "XA" text pattern for different sizes
  // For simplicity, we'll create a solid circle icon with X in it
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= center - 1) {
        // Inside circle
        if (dist >= center - 2) {
          // Border ring
          pixels.push(...accentColor, 255);
        } else {
          // Check if in "X" letter area
          const nx = (x - size * 0.2) / (size * 0.6); // normalize to 0-1
          const ny = (y - size * 0.25) / (size * 0.5);
          
          if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
            const thickness = 0.15;
            // Diagonal from top-left to bottom-right
            const d1 = Math.abs(nx - ny);
            // Diagonal from top-right to bottom-left
            const d2 = Math.abs(nx - (1 - ny));
            
            if (d1 < thickness || d2 < thickness) {
              pixels.push(...accentColor, 255);
            } else {
              pixels.push(...bgColor, 255);
            }
          } else {
            pixels.push(...bgColor, 255);
          }
        }
      } else {
        // Outside circle - transparent
        pixels.push(0, 0, 0, 0);
      }
    }
  }
  
  return encodePNG(size, size, pixels);
}

// Minimal PNG encoder
function encodePNG(width, height, pixels) {
  const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ -1) >>> 0;
  }
  
  function adler32(buf) {
    let a = 1, b = 0;
    for (let i = 0; i < buf.length; i++) {
      a = (a + buf[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }
  
  function chunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const combined = Buffer.concat([typeBuffer, data]);
    const crcVal = crc32(combined);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal);
    return Buffer.concat([length, combined, crcBuf]);
  }
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  // IDAT - raw pixel data with filter byte per row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  let pixIdx = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      rawData[offset++] = pixels[pixIdx++]; // R
      rawData[offset++] = pixels[pixIdx++]; // G
      rawData[offset++] = pixels[pixIdx++]; // B
      rawData[offset++] = pixels[pixIdx++]; // A
    }
  }
  
  // Deflate (store method - no compression for simplicity)
  const blocks = [];
  const maxBlock = 65535;
  for (let i = 0; i < rawData.length; i += maxBlock) {
    const blockData = rawData.slice(i, i + maxBlock);
    const isLast = (i + maxBlock >= rawData.length) ? 1 : 0;
    const header = Buffer.alloc(5);
    header[0] = isLast;
    header.writeUInt16LE(blockData.length, 1);
    header.writeUInt16LE(blockData.length ^ 0xFFFF, 3);
    blocks.push(header, blockData);
  }
  
  const adlerVal = adler32(rawData);
  const adlerBuf = Buffer.alloc(4);
  adlerBuf.writeUInt32BE(adlerVal);
  
  const zlibHeader = Buffer.from([0x78, 0x01]); // zlib header (no compression)
  const deflated = Buffer.concat([zlibHeader, ...blocks, adlerBuf]);
  
  // IEND
  const iend = Buffer.alloc(0);
  
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', iend),
  ]);
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');

[16, 48, 128].forEach(size => {
  const png = createIcon(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`✅ Generated ${filePath} (${png.length} bytes)`);
});

console.log('Done! Icons generated.');
