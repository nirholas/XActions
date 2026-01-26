/**
 * ============================================================
 * 🛠️ [SCRIPT NAME HERE]
 * ============================================================
 * 
 * @name        script-name.js
 * @description Brief description of what this script does
 * @author      Your Name (https://x.com/yourhandle)
 * @version     1.0.0
 * @date        YYYY-MM-DD
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS
 * ============================================================
 * 
 * 1. Go to [TARGET WEBSITE URL]
 *    Example: https://example.com/page
 * 
 * 2. Open Chrome DevTools:
 *    - Windows/Linux: Press F12 or Ctrl+Shift+I
 *    - Mac: Press Cmd+Option+I
 * 
 * 3. Click on the "Console" tab
 * 
 * 4. Copy this ENTIRE script and paste it into the console
 * 
 * 5. Press Enter to run
 * 
 * 6. [Describe what happens / what to expect]
 * 
 * ============================================================
 * ⚙️ CONFIGURATION (modify these values as needed)
 * ============================================================
 */

const CONFIG = {
  // Add your configurable options here
  // Example:
  maxItems: 100,
  delayMs: 1000,
  autoDownload: true,
  copyToClipboard: true,
  verbose: true  // Set to false for less console output
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function main() {
  // ==========================================
  // INITIALIZATION
  // ==========================================
  
  const startTime = Date.now();
  const results = [];
  
  // Display script header
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🛠️ [SCRIPT NAME]                                          ║');
  console.log('║  by [author] - https://github.com/nirholas/XActions        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // ==========================================
  // VALIDATION - Check we're on the right page
  // ==========================================
  
  if (!window.location.href.includes('expected-domain.com')) {
    console.error('❌ Error: This script must be run on [expected website]');
    console.log('📍 Current URL:', window.location.href);
    console.log('💡 Navigate to [correct URL] and try again');
    return;
  }
  
  console.log('✅ Page validated');
  console.log('🚀 Starting script...');
  console.log('');
  
  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  
  /**
   * Wait for a specified number of milliseconds
   * @param {number} ms - Milliseconds to wait
   */
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  /**
   * Log message only if verbose mode is enabled
   * @param {string} message - Message to log
   */
  const verboseLog = (message) => {
    if (CONFIG.verbose) {
      console.log(message);
    }
  };
  
  /**
   * Safely query an element with error handling
   * @param {Element} parent - Parent element to query from
   * @param {string} selector - CSS selector
   * @returns {Element|null}
   */
  const safeQuery = (parent, selector) => {
    try {
      return parent.querySelector(selector);
    } catch (e) {
      return null;
    }
  };
  
  /**
   * Get text content safely
   * @param {Element} element - Element to get text from
   * @returns {string}
   */
  const getText = (element) => {
    return element?.innerText?.trim() || '';
  };
  
  // ==========================================
  // MAIN LOGIC
  // ==========================================
  
  try {
    // TODO: Add your main script logic here
    // 
    // Example pattern for scraping:
    // 
    // const items = document.querySelectorAll('.item-selector');
    // 
    // for (const item of items) {
    //   const data = {
    //     title: getText(safeQuery(item, '.title')),
    //     description: getText(safeQuery(item, '.description')),
    //     // ... more fields
    //   };
    //   
    //   results.push(data);
    //   verboseLog(`📊 Collected item: ${data.title}`);
    //   
    //   // Rate limiting
    //   await sleep(CONFIG.delayMs);
    // }
    
    // Placeholder - remove this in your actual script
    console.log('⚠️ This is a template! Add your logic above.');
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
    console.error(error);
    return;
  }
  
  // ==========================================
  // RESULTS & OUTPUT
  // ==========================================
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Build final output object
  const output = {
    scriptName: '[SCRIPT NAME]',
    url: window.location.href,
    scrapedAt: new Date().toISOString(),
    duration: `${duration}s`,
    totalItems: results.length,
    data: results
  };
  
  // Display completion message
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SCRIPT COMPLETE!                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 Items collected: ${output.totalItems}`);
  console.log(`⏱️ Duration: ${output.duration}`);
  console.log('');
  
  // Preview results
  if (results.length > 0) {
    console.log('📋 Preview (first 5 items):');
    console.table(results.slice(0, 5));
  }
  
  // ==========================================
  // EXPORT OPTIONS
  // ==========================================
  
  // Option 1: Download as JSON file
  if (CONFIG.autoDownload) {
    try {
      const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `script-output_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('💾 JSON file downloaded!');
    } catch (e) {
      console.error('❌ Download failed:', e.message);
    }
  }
  
  // Option 2: Copy to clipboard
  if (CONFIG.copyToClipboard) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(output, null, 2));
      console.log('📋 Data copied to clipboard!');
    } catch (e) {
      console.error('❌ Clipboard copy failed:', e.message);
      console.log('💡 Tip: Some browsers block clipboard access. Try the download option instead.');
    }
  }
  
  // Option 3: Store in window object for console access
  window.scriptOutput = output;
  console.log('');
  console.log('💡 Access your data anytime via: window.scriptOutput');
  console.log('');
  
  return output;
})();

/**
 * ============================================================
 * 📚 TEMPLATE NOTES (delete this section in your actual script)
 * ============================================================
 * 
 * COMMON PATTERNS:
 * 
 * 1. Auto-scrolling to load more content:
 *    while (items.length < targetCount) {
 *      window.scrollTo(0, document.body.scrollHeight);
 *      await sleep(2000);
 *      // re-query items
 *    }
 * 
 * 2. Clicking through pages:
 *    const nextButton = document.querySelector('.next-button');
 *    if (nextButton) nextButton.click();
 * 
 * 3. Waiting for element to appear:
 *    const waitForElement = async (selector, timeout = 5000) => {
 *      const start = Date.now();
 *      while (Date.now() - start < timeout) {
 *        const el = document.querySelector(selector);
 *        if (el) return el;
 *        await sleep(100);
 *      }
 *      return null;
 *    };
 * 
 * 4. Using sessionStorage for state persistence:
 *    const getProcessed = () => JSON.parse(sessionStorage.getItem('key') || '[]');
 *    const markProcessed = (id) => {
 *      const items = getProcessed();
 *      items.push(id);
 *      sessionStorage.setItem('key', JSON.stringify(items));
 *    };
 * 
 * TWITTER/X SELECTORS (as of Jan 2026):
 *    - Tweet: article[data-testid="tweet"]
 *    - Tweet text: [data-testid="tweetText"]
 *    - Like button: [data-testid="like"]
 *    - Retweet button: [data-testid="retweet"]
 *    - Reply button: [data-testid="reply"]
 *    - User cell: [data-testid="UserCell"]
 *    - Timestamp: time[datetime]
 * 
 * ============================================================
 */
