// Text Formatting Helper for X - by nichxbt
// https://github.com/nirholas/xactions
// Format text with bold, italic, strikethrough, monospace using Unicode characters
// X/Twitter doesn't support native formatting, but Unicode math symbols work!
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below
// 4. Paste and run
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── Text to Format ──
    text: 'Hello World',

    // ── Format: 'bold', 'italic', 'boldItalic', 'monospace', 'strikethrough',
    //            'underline', 'smallCaps', 'circled', 'squared', 'doubleStruck' ──
    format: 'bold',

    // ── Auto-paste into compose box ──
    autoPaste: false,           // true = paste formatted text into the compose box
  };

  // ── Unicode Character Maps ──
  const CHAR_MAPS = {
    // Bold (Mathematical Bold)
    bold: {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D400 + i); return m;
      }, {}),
      lower: 'abcdefghijklmnopqrstuvwxyz'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D41A + i); return m;
      }, {}),
      digits: '0123456789'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D7CE + i); return m;
      }, {}),
    },

    // Italic (Mathematical Italic)
    italic: {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D434 + i); return m;
      }, {}),
      lower: 'abcdefghijklmnopqrstuvwxyz'.split('').reduce((m, c, i) => {
        // 'h' is a special case in Unicode italic
        if (i === 7) { m[c] = '\u210E'; return m; }
        m[c] = String.fromCodePoint(0x1D44E + i); return m;
      }, {}),
      digits: null, // No italic digits in Unicode
    },

    // Bold Italic (Mathematical Bold Italic)
    boldItalic: {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D468 + i); return m;
      }, {}),
      lower: 'abcdefghijklmnopqrstuvwxyz'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D482 + i); return m;
      }, {}),
      digits: null,
    },

    // Monospace (Mathematical Monospace)
    monospace: {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D670 + i); return m;
      }, {}),
      lower: 'abcdefghijklmnopqrstuvwxyz'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D68A + i); return m;
      }, {}),
      digits: '0123456789'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D7F6 + i); return m;
      }, {}),
    },

    // Double-Struck (Mathematical Double-Struck)
    doubleStruck: {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reduce((m, c, i) => {
        // Some letters have pre-existing double-struck forms
        const specials = { 'C': '\u2102', 'H': '\u210D', 'N': '\u2115', 'P': '\u2119', 'Q': '\u211A', 'R': '\u211D', 'Z': '\u2124' };
        m[c] = specials[c] || String.fromCodePoint(0x1D538 + i);
        return m;
      }, {}),
      lower: 'abcdefghijklmnopqrstuvwxyz'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D552 + i); return m;
      }, {}),
      digits: '0123456789'.split('').reduce((m, c, i) => {
        m[c] = String.fromCodePoint(0x1D7D8 + i); return m;
      }, {}),
    },
  };

  // ── Combining Character Transforms ──
  const COMBINING = {
    strikethrough: '\u0336',    // Combining long stroke overlay
    underline: '\u0332',        // Combining low line
  };

  // ── Small Caps Map ──
  const SMALL_CAPS = {
    'a': '\u1D00', 'b': '\u0299', 'c': '\u1D04', 'd': '\u1D05', 'e': '\u1D07',
    'f': '\ua730', 'g': '\u0262', 'h': '\u029C', 'i': '\u026A', 'j': '\u1D0A',
    'k': '\u1D0B', 'l': '\u029F', 'm': '\u1D0D', 'n': '\u0274', 'o': '\u1D0F',
    'p': '\u1D18', 'q': '\u01EB', 'r': '\u0280', 's': '\u0455', 't': '\u1D1B',
    'u': '\u1D1C', 'v': '\u1D20', 'w': '\u1D21', 'x': '\u02E3', 'y': '\u028F',
    'z': '\u1D22',
  };

  // ── Circled Characters ──
  const CIRCLED = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reduce((m, c, i) => {
      m[c] = String.fromCodePoint(0x24B6 + i); return m;
    }, {}),
    lower: 'abcdefghijklmnopqrstuvwxyz'.split('').reduce((m, c, i) => {
      m[c] = String.fromCodePoint(0x24D0 + i); return m;
    }, {}),
    digits: { '0': '\u24EA', ...'123456789'.split('').reduce((m, c, i) => {
      m[c] = String.fromCodePoint(0x2460 + i); return m;
    }, {}) },
  };

  // ── Squared Characters (Negative Squared Latin) ──
  const SQUARED = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').reduce((m, c, i) => {
      m[c] = String.fromCodePoint(0x1F130 + i); return m;
    }, {}),
  };

  // ── Format Function ──
  const formatText = (text, format) => {
    // Combining character formats (apply per-character overlay)
    if (format === 'strikethrough' || format === 'underline') {
      const combiner = COMBINING[format];
      return text.split('').map(c => c + combiner).join('');
    }

    // Small caps
    if (format === 'smallCaps') {
      return text.split('').map(c => {
        const lower = c.toLowerCase();
        return SMALL_CAPS[lower] || c;
      }).join('');
    }

    // Circled
    if (format === 'circled') {
      return text.split('').map(c => {
        if (c >= 'A' && c <= 'Z') return CIRCLED.upper[c] || c;
        if (c >= 'a' && c <= 'z') return CIRCLED.lower[c] || c;
        if (c >= '0' && c <= '9') return CIRCLED.digits[c] || c;
        return c;
      }).join('');
    }

    // Squared (uppercase only)
    if (format === 'squared') {
      return text.split('').map(c => {
        const upper = c.toUpperCase();
        return SQUARED.upper[upper] || c;
      }).join('');
    }

    // Unicode math symbol formats
    const charMap = CHAR_MAPS[format];
    if (!charMap) {
      console.error(`❌ Unknown format: "${format}"`);
      console.log('💡 Available formats: bold, italic, boldItalic, monospace, strikethrough, underline, smallCaps, circled, squared, doubleStruck');
      return text;
    }

    return text.split('').map(c => {
      if (c >= 'A' && c <= 'Z') return charMap.upper?.[c] || c;
      if (c >= 'a' && c <= 'z') return charMap.lower?.[c] || c;
      if (c >= '0' && c <= '9') return charMap.digits?.[c] || c;
      return c;
    }).join('');
  };

  // ── Paste into Compose Box ──
  const pasteIntoCompose = async (text) => {
    const textarea = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!textarea) {
      console.warn('⚠️  Compose box not found. Open the tweet composer first.');
      console.log('💡 The formatted text has been copied to your clipboard instead.');
      return false;
    }

    textarea.focus();
    await new Promise(r => setTimeout(r, 300));
    document.execCommand('insertText', false, text);
    console.log('✅ Formatted text pasted into compose box!');
    return true;
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('🔤 XActions — Text Formatting Helper');
    console.log('═══════════════════════════════════════');

    if (!CONFIG.text) {
      console.error('❌ Please set CONFIG.text to the text you want to format.');
      return;
    }

    const formatted = formatText(CONFIG.text, CONFIG.format);

    console.log(`📝 Original:  ${CONFIG.text}`);
    console.log(`✨ Formatted: ${formatted}`);
    console.log(`   Format:    ${CONFIG.format}`);
    console.log('');

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(formatted);
      console.log('📋 Formatted text copied to clipboard!');
    } catch (e) {
      console.log('⚠️  Could not copy to clipboard. Select and copy from above.');
    }

    // Auto-paste if configured
    if (CONFIG.autoPaste) {
      await pasteIntoCompose(formatted);
    }

    // Show all format previews
    console.log('');
    console.log('📖 All format previews:');
    const allFormats = ['bold', 'italic', 'boldItalic', 'monospace', 'strikethrough', 'underline', 'smallCaps', 'circled', 'squared', 'doubleStruck'];
    for (const fmt of allFormats) {
      const preview = formatText(CONFIG.text, fmt);
      const marker = fmt === CONFIG.format ? ' ◀ selected' : '';
      console.log(`   ${fmt.padEnd(15)} ${preview}${marker}`);
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');

    // Expose helper function globally for quick use
    window.xFormat = (text, format = 'bold') => {
      const result = formatText(text, format);
      navigator.clipboard.writeText(result).catch(() => {});
      return result;
    };
    console.log('💡 Quick use: window.xFormat("your text", "bold")');
  };

  run();
})();
