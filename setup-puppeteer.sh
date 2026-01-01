#!/bin/bash

echo "🚀 Setting up Puppeteer Browser Automation..."
echo ""

# Install dependencies
echo "📦 Installing Puppeteer packages..."
npm install

# Update database
echo "🗄️ Updating database schema..."
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Start Redis: redis-server (in a separate terminal)"
echo "  2. Start the server: npm run dev"
echo "  3. Visit http://localhost:3001/dashboard"
echo "  4. Choose 'Session Cookie' method"
echo "  5. Paste your auth_token cookie from X.com"
echo ""
echo "📚 Full guide: See PUPPETEER_SETUP.md"

