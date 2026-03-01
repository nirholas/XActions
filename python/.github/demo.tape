# Xeepy Demo - VHS Tape File
# Generate with: vhs demo.tape

Output .github/demo.gif
Output .github/demo.webm

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 600
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Framerate 30
Set PlaybackSpeed 0.5

# Title
Type "# 🐦 Xeepy - The Free Tweepy Alternative"
Enter
Sleep 1s
Type "# No API keys required!"
Enter
Enter
Sleep 500ms

# Start Python
Type "python3"
Enter
Sleep 500ms

# Import
Type "from xeepy import Xeepy"
Enter
Sleep 300ms
Type "import asyncio"
Enter
Enter
Sleep 500ms

# Show the async context
Type "async def demo():"
Enter
Type "    async with Xeepy() as x:"
Enter
Sleep 300ms

# Scrape replies demo
Type "        # Scrape replies to @nichxbt's tweet"
Enter
Type "        replies = await x.scrape.replies('https://x.com/nichxbt/status/1972556264917119260')"
Enter
Sleep 500ms

# Show results
Type "        print(f'✅ Found {len(replies.items)} replies!')"
Enter
Type "        for reply in replies.items[:3]:"
Enter
Type "            print(f'  @{reply.author.username}: {reply.text[:50]}...')"
Enter
Enter
Sleep 300ms

# Scrape profile
Type "        # Get user profile"
Enter
Type "        profile = await x.scrape.profile('nichxbt')"
Enter
Type "        print(f'\\n👤 @{profile.username} - {profile.followers_count:,} followers')"
Enter
Enter
Sleep 300ms

# Auto-engagement
Type "        # Auto-like tweets about Python"
Enter
Type "        await x.engage.auto_like(keywords=['python', 'automation'], limit=10)"
Enter
Type "        print('\\n🔥 Liked 10 tweets!')"
Enter
Enter
Sleep 300ms

# Unfollow non-followers
Type "        # Find who doesn't follow back"
Enter
Type "        result = await x.unfollow.non_followers(dry_run=True)"
Enter
Type "        print(f'\\n👻 {len(result.would_unfollow)} users don\\'t follow back')"
Enter
Enter
Sleep 300ms

# Export
Type "        # Export to CSV"
Enter
Type "        x.export.to_csv(replies, 'replies.csv')"
Enter
Type "        print('\\n📁 Exported to replies.csv')"
Enter
Enter
Sleep 500ms

# Run it
Type "asyncio.run(demo())"
Enter

Sleep 3s

# Show output simulation
Type@50ms "✅ Found 47 replies!"
Enter
Type@30ms "  @dev_sarah: This is exactly what I needed for my project..."
Enter
Type@30ms "  @crypto_mike: Amazing work! Can't wait to try this..."
Enter
Type@30ms "  @python_lover: Finally a free alternative to Tweepy!..."
Enter
Enter
Type@50ms "👤 @nichxbt - 12,847 followers"
Enter
Enter
Type@50ms "🔥 Liked 10 tweets!"
Enter
Enter
Type@50ms "👻 23 users don't follow back"
Enter
Enter
Type@50ms "📁 Exported to replies.csv"
Enter

Sleep 2s

# Exit
Type "exit()"
Enter
Sleep 500ms

# Final message
Type "# pip install xeepy && playwright install chromium"
Enter
Type "# github.com/nirholas/xeepy"
Enter

Sleep 3s
