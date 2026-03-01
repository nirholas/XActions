/* Xeepy Documentation JavaScript */

document.addEventListener('DOMContentLoaded', function() {
    // Copy button for code blocks
    addCopyButtons();
    
    // Smooth scrolling for anchor links
    enableSmoothScrolling();
    
    // Add version selector functionality
    initVersionSelector();
    
    // Analytics tracking (if enabled)
    initAnalytics();
});

/**
 * Add copy buttons to code blocks
 */
function addCopyButtons() {
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(function(codeBlock) {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.setAttribute('aria-label', 'Copy code to clipboard');
        
        button.addEventListener('click', function() {
            const code = codeBlock.textContent;
            navigator.clipboard.writeText(code).then(function() {
                button.textContent = 'Copied!';
                button.classList.add('copied');
                
                setTimeout(function() {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            }).catch(function(err) {
                console.error('Failed to copy:', err);
                button.textContent = 'Failed';
            });
        });
        
        const pre = codeBlock.parentElement;
        pre.style.position = 'relative';
        pre.appendChild(button);
    });
}

/**
 * Enable smooth scrolling for anchor links
 */
function enableSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update URL without jumping
                history.pushState(null, null, targetId);
            }
        });
    });
}

/**
 * Initialize version selector
 */
function initVersionSelector() {
    const selector = document.querySelector('.version-selector');
    if (!selector) return;
    
    selector.addEventListener('change', function() {
        const version = this.value;
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(/\/v[\d.]+\//, `/${version}/`);
        window.location.href = newPath;
    });
}

/**
 * Initialize analytics
 */
function initAnalytics() {
    // Placeholder for analytics integration
    // Add your analytics code here (Google Analytics, Plausible, etc.)
}

/**
 * Toggle dark/light mode
 */
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-md-color-scheme');
    const newTheme = currentTheme === 'slate' ? 'default' : 'slate';
    body.setAttribute('data-md-color-scheme', newTheme);
    localStorage.setItem('theme', newTheme);
}

/**
 * Load saved theme preference
 */
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-md-color-scheme', savedTheme);
    }
}

// Load theme on page load
loadThemePreference();

/**
 * Search enhancement
 */
function enhanceSearch() {
    const searchInput = document.querySelector('.md-search__input');
    if (!searchInput) return;
    
    // Add keyboard shortcut (/) to focus search
    document.addEventListener('keydown', function(e) {
        if (e.key === '/' && !isInputFocused()) {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Escape to close search
        if (e.key === 'Escape') {
            searchInput.blur();
        }
    });
}

/**
 * Check if an input element is currently focused
 */
function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement.tagName === 'INPUT' || 
           activeElement.tagName === 'TEXTAREA' ||
           activeElement.isContentEditable;
}

// Enhance search on load
enhanceSearch();

/**
 * Add progress indicator for long pages
 */
function addReadingProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: #1DA1F2;
        z-index: 9999;
        transition: width 0.1s;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = progress + '%';
    });
}

// Uncomment to enable reading progress
// addReadingProgress();

/**
 * Console Easter egg
 */
console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🐦 Xeepy - X/Twitter Automation Toolkit           ║
║                                                       ║
║   Documentation: https://xeepy.dev/docs             ║
║   GitHub: https://github.com/xeepy/xeepy           ║
║                                                       ║
║   Made with ❤️ by the Xeepy team                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);
