# Text Formatting in Posts -- Tutorial

> Step-by-step guide to formatting tweet text with bold, italic, monospace, and other Unicode styles using XActions.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to x.com
2. Open DevTools (F12)
3. Copy the script from `browser/textFormatting.js`
4. Set `CONFIG.text` and `CONFIG.format`
5. Paste into Console and press Enter
6. The formatted text is copied to your clipboard

## How It Works

X/Twitter does not support native text formatting (no markdown, no rich text). However, Unicode includes mathematical symbol characters that look like bold, italic, monospace, and other styles. These characters are standard Unicode and display correctly on all platforms.

The `textFormatting.js` script converts regular ASCII letters to their Unicode equivalents.

## Configuration

```js
const CONFIG = {
  text: 'Hello World',
  format: 'bold',
  autoPaste: false,    // true = paste into compose box automatically
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `text` | `string` | `'Hello World'` | The text to format |
| `format` | `string` | `'bold'` | Format style (see table below) |
| `autoPaste` | `boolean` | `false` | Auto-paste into tweet compose box |

## Available Formats

| Format | Example Input | Example Output |
|--------|--------------|----------------|
| `bold` | Hello World | **H**ello **W**orld (Mathematical Bold) |
| `italic` | Hello World | *H*ello *W*orld (Mathematical Italic) |
| `boldItalic` | Hello World | Bold italic combined |
| `monospace` | Hello World | Fixed-width characters |
| `strikethrough` | Hello World | Characters with line through them |
| `underline` | Hello World | Characters with underline |
| `smallCaps` | Hello World | Small capital letters |
| `circled` | Hello World | Letters inside circles |
| `squared` | Hello World | Letters inside squares |
| `doubleStruck` | Hello World | Outlined/hollow letters |

## Step-by-Step Guide

### Basic Usage

1. Paste `browser/textFormatting.js` into the DevTools console
2. The script formats `CONFIG.text` with `CONFIG.format` and copies it to clipboard
3. Paste (Ctrl+V) into any tweet compose box

### Quick Usage After Loading

After pasting the script once, a global helper function is available:

```js
// Quick format and copy to clipboard
xFormat('Your text here', 'bold');
xFormat('Important note', 'italic');
xFormat('Code snippet', 'monospace');
```

### Format Examples

The script prints all format previews when run:

```
All format previews:
   bold            (bold Unicode characters)
   italic          (italic Unicode characters)
   boldItalic      (bold italic Unicode characters)
   monospace        (monospace Unicode characters)
   strikethrough   (characters with strikethrough overlay)
   underline       (characters with underline overlay)
   smallCaps       (small capital letters)
   circled         (circled letters)
   squared         (squared letters)
   doubleStruck    (double-struck/outlined letters)
```

### Auto-Paste Mode

Set `autoPaste: true` to have the formatted text inserted directly into an open compose box:

```js
const CONFIG = {
  text: 'BREAKING NEWS',
  format: 'bold',
  autoPaste: true,   // Will paste into the tweet compose box
};
```

The script finds `[data-testid="tweetTextarea_0"]`, focuses it, and inserts the text using `document.execCommand('insertText', ...)`.

### Mixing Formats in One Tweet

You can combine multiple formats in a single tweet by formatting pieces separately:

```js
// Format different parts and paste them together
const title = xFormat('Thread:', 'bold');
const emphasis = xFormat('must read', 'italic');

// Copy the combined result
navigator.clipboard.writeText(`${title} This is a ${emphasis} thread about automation.`);
```

### How the Unicode Conversion Works

The script uses Unicode Mathematical Alphanumeric Symbols block. For example, bold conversion:

```js
// Bold uppercase: U+1D400 to U+1D419 (A-Z)
// Bold lowercase: U+1D41A to U+1D433 (a-z)
// Bold digits:    U+1D7CE to U+1D7D7 (0-9)

// Each letter maps to its mathematical bold equivalent:
// 'A' -> U+1D400 (MATHEMATICAL BOLD CAPITAL A)
// 'a' -> U+1D41A (MATHEMATICAL BOLD SMALL A)
```

For combining character formats (strikethrough, underline), a combining Unicode character is appended after each letter:

```js
// Strikethrough: each character + U+0336 (COMBINING LONG STROKE OVERLAY)
// Underline: each character + U+0332 (COMBINING LOW LINE)
```

## Supported Characters

| Format | Letters | Digits | Punctuation |
|--------|---------|--------|-------------|
| bold | A-Z, a-z | 0-9 | Not converted |
| italic | A-Z, a-z | Not available | Not converted |
| boldItalic | A-Z, a-z | Not available | Not converted |
| monospace | A-Z, a-z | 0-9 | Not converted |
| strikethrough | All chars | All chars | All chars |
| underline | All chars | All chars | All chars |
| smallCaps | a-z | Not converted | Not converted |
| circled | A-Z, a-z | 0-9 | Not converted |
| squared | A-Z only | Not converted | Not converted |
| doubleStruck | A-Z, a-z | 0-9 | Not converted |

Note: Punctuation, spaces, and special characters pass through unchanged in most formats. Strikethrough and underline work on all characters because they use combining overlays.

## Tips & Tricks

- **Use sparingly**: Overuse of Unicode formatting can look spammy. Use it for emphasis, not entire tweets.
- **Bold for headers**: Use bold at the start of thread tweets as section headers.
- **Monospace for code**: Use monospace formatting when sharing code snippets in tweets.
- **Strikethrough for humor**: Strikethrough is great for comedic corrections ("I love ~~meetings~~ productivity").
- **Clipboard fallback**: If clipboard access fails, the formatted text is printed in the console -- copy from there.
- **Character count**: Unicode characters count the same as regular characters toward the tweet limit. Some may count as 2 characters.
- **Screen readers**: Some screen readers may not handle mathematical Unicode well. Use formatting judiciously for accessibility.
- **Quick function**: After running the script once, use `xFormat('text', 'format')` for instant formatting from the console.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Formatted text looks wrong | Some fonts do not render all Unicode math symbols. The characters are correct but may display differently across platforms. |
| Clipboard copy failed | Browser security may block clipboard access. Copy the formatted text from the console output instead. |
| Auto-paste did not work | Make sure the compose box is open before running with `autoPaste: true`. |
| Some characters not formatted | Only A-Z, a-z, and 0-9 are converted. Punctuation and special characters pass through unchanged. |
| Italic digits missing | Unicode does not include italic digit variants. Digits remain in regular style. |
| Text looks fine on desktop but not mobile | Unicode rendering varies by platform and font. Test on mobile before posting important content. |

## Related Scripts

- `src/postComposer.js` -- Post tweets with the formatted text
- `browser/postThread.js` -- Create threads with formatted headers
- `browser/threadComposer.js` -- Advanced thread composition
- `docs/examples/tutorials/post-content-tutorial.md` -- General posting guide
