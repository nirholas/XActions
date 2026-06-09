// Manual live test for likeFacebookPosts (Story 2.2)
// by nichxbt
//
// Usage:
//   FB_C_USER=<c_user> FB_XS=<xs> node scripts/test-like-facebook.js <postUrl> [--real]
//
// Get c_user + xs from: DevTools → Application → Cookies → facebook.com
//
// Default: dry-run (preview only, no actual like)
// Add --real to execute the real like (⚠️ risk of account restriction)

import { createBrowser, createPage, loginWithCookie } from '../src/scrapers/facebook/index.js';
import { likeFacebookPosts } from '../api/services/facebookAutomation.js';

const c_user = process.env.FB_C_USER;
const xs = process.env.FB_XS;
const postUrl = process.argv[2];
const isReal = process.argv.includes('--real');

if (!c_user || !xs) {
  console.error('❌ FB_C_USER and FB_XS env vars are required.');
  console.error('   Get them from: DevTools → Application → Cookies → facebook.com');
  process.exit(1);
}

if (!postUrl || !postUrl.startsWith('https://')) {
  console.error('❌ Provide a full Facebook post URL as first argument.');
  console.error('   Example: node scripts/test-like-facebook.js https://www.facebook.com/...');
  process.exit(1);
}

const headless = process.env.PUPPETEER_HEADLESS !== 'false';

console.log(`\n🚀 likeFacebookPosts live test`);
console.log(`   Mode    : ${isReal ? '⚠️  REAL WRITE (dryRun=false)' : '🔍 DRY-RUN (preview only)'}`);
console.log(`   Post URL: ${postUrl}`);
console.log(`   Headless: ${headless}\n`);

if (isReal) {
  console.warn('⚠️  WARNING: Real write enabled. This will click Like on the post.');
  console.warn('   Use a TEST ACCOUNT. Automated actions risk account restriction.\n');
}

const browser = await createBrowser({ headless });
try {
  const page = await createPage(browser);

  console.log('🔐 Logging in with session cookie...');
  await loginWithCookie(page, { c_user, xs });

  // Verify login succeeded by checking current URL
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
    throw new Error(`❌ Login failed — redirected to: ${currentUrl}. Cookie may be expired.`);
  }
  console.log('✅ Login complete\n');

  const result = await likeFacebookPosts(page, [postUrl], {
    dryRun: !isReal,
  });

  console.log('📊 Result:\n', JSON.stringify(result, null, 2));

  if (result.dryRun) {
    console.log('\n💡 This was a dry-run preview. Add --real to execute the actual like.');
  } else {
    const r = result.results[0];
    if (r?.ok && r?.alreadyLiked) console.log('\nℹ️  Post was already liked — no action taken.');
    else if (r?.ok) console.log('\n✅ Post liked successfully.');
    else console.log('\n❌ Like failed:', r?.error);
  }
} finally {
  await browser.close();
  console.log('\n🏁 Browser closed.');
}
