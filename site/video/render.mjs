#!/usr/bin/env node

/**
 * XActions Video Render Script
 * 
 * Usage:
 *   node render.mjs                       # render all compositions
 *   node render.mjs TweetVideo            # render one composition
 *   node render.mjs PromoVideo --codec=h264  # custom codec
 * 
 * Output goes to ./out/
 * 
 * @author nich (@nichxbt)
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALL_COMPOSITIONS = [
  'TweetVideo',
  'TweetVideo-Landscape',
  'TweetVideo-Square',
  'ThreadVideo',
  'ThreadVideo-Landscape',
  'AnalyticsDashboard',
  'PromoVideo',
  'PromoVideo-Vertical',
];

const args = process.argv.slice(2);
const compositionArg = args.find(a => !a.startsWith('--'));
const codecArg = args.find(a => a.startsWith('--codec='))?.split('=')[1] || 'h264';

const toRender = compositionArg
  ? [compositionArg]
  : ALL_COMPOSITIONS;

console.log('⚡ XActions Video Renderer\n');

const entryPoint = path.resolve(__dirname, 'src/index.js');
console.log('📦 Bundling...');
const bundleLocation = await bundle(entryPoint);

for (const id of toRender) {
  console.log(`\n🎬 Rendering: ${id}`);
  const start = Date.now();

  try {
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id,
    });

    const outputPath = path.resolve(__dirname, 'out', `${id}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: codecArg,
      outputLocation: outputPath,
      onProgress: ({ progress }) => {
        if (Math.round(progress * 100) % 25 === 0) {
          process.stdout.write(`  ${Math.round(progress * 100)}%\r`);
        }
      },
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ✅ ${outputPath} (${elapsed}s)`);
  } catch (err) {
    console.error(`  ❌ Failed to render ${id}: ${err.message}`);
  }
}

console.log('\n✨ Done!');
