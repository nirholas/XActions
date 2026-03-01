#!/bin/bash
# Setup and serve documentation locally

set -e

echo "📚 XTools Documentation Setup"
echo "=============================="

# Check if in right directory
if [ ! -f "mkdocs.yml" ]; then
    echo "❌ Error: mkdocs.yml not found. Run from project root."
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing documentation dependencies..."
pip install -r docs/requirements.txt

# Create required directories
echo ""
echo "📁 Creating directory structure..."
mkdir -p docs/assets
mkdir -p docs/stylesheets
mkdir -p docs/javascripts
mkdir -p docs/includes
mkdir -p docs/overrides

# Create placeholder assets if missing
if [ ! -f "docs/assets/logo.svg" ]; then
    echo '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔧</text></svg>' > docs/assets/logo.svg
fi

if [ ! -f "docs/stylesheets/extra.css" ]; then
    cat > docs/stylesheets/extra.css << 'EOF'
/* XTools Documentation Custom Styles */

:root {
  --md-primary-fg-color: #1DA1F2;
  --md-primary-fg-color--light: #4DB5F5;
  --md-primary-fg-color--dark: #0C7ABF;
}

/* Custom admonition for Twitter/X */
.md-typeset .admonition.twitter,
.md-typeset details.twitter {
  border-color: #1DA1F2;
}
.md-typeset .twitter > .admonition-title,
.md-typeset .twitter > summary {
  background-color: rgba(29, 161, 242, 0.1);
}
.md-typeset .twitter > .admonition-title::before,
.md-typeset .twitter > summary::before {
  background-color: #1DA1F2;
  -webkit-mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>');
  mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>');
}

/* Code block improvements */
.md-typeset pre > code {
  font-size: 0.85em;
}

/* Better table styling */
.md-typeset table:not([class]) {
  font-size: 0.85em;
}

/* Responsive improvements */
@media screen and (max-width: 76.25em) {
  .md-nav--primary .md-nav__title {
    background-color: var(--md-primary-fg-color);
  }
}
EOF
fi

if [ ! -f "docs/javascripts/extra.js" ]; then
    cat > docs/javascripts/extra.js << 'EOF'
// XTools Documentation Custom JavaScript

// Add copy button feedback
document.addEventListener('DOMContentLoaded', function() {
  // Track documentation events (if analytics enabled)
  document.querySelectorAll('a[href^="http"]').forEach(function(link) {
    link.addEventListener('click', function() {
      if (typeof gtag === 'function') {
        gtag('event', 'click', {
          'event_category': 'outbound',
          'event_label': link.href
        });
      }
    });
  });
});
EOF
fi

if [ ! -f "docs/includes/abbreviations.md" ]; then
    cat > docs/includes/abbreviations.md << 'EOF'
*[API]: Application Programming Interface
*[CLI]: Command Line Interface
*[DM]: Direct Message
*[RT]: Retweet
*[AI]: Artificial Intelligence
*[ML]: Machine Learning
*[GPT]: Generative Pre-trained Transformer
*[LLM]: Large Language Model
*[NLP]: Natural Language Processing
*[CSV]: Comma-Separated Values
*[JSON]: JavaScript Object Notation
*[SQL]: Structured Query Language
*[DB]: Database
*[ICP]: Ideal Customer Profile
*[ROI]: Return on Investment
EOF
fi

# Serve docs
echo ""
echo "🚀 Starting documentation server..."
echo "   Open http://localhost:8000 in your browser"
echo ""
mkdocs serve
