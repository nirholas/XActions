# XActions - Unfollow Everyone Demo
# Run with: vhs unfollow-everyone.tape

Output unfollow-everyone.gif
Output unfollow-everyone.webm

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Framerate 30

# Title
Type "# 🧹 XActions - Unfollow Everyone"
Enter
Sleep 500ms

Type "# Paste this script in browser console at x.com/following"
Enter
Sleep 1s
Enter

# Show the script running
Type "(() => {"
Enter
Sleep 200ms
Type "  console.log('🧹 XActions: Unfollow Everyone');"
Enter
Sleep 200ms
Type "  const unfollowBtn = '[data-testid$=\"-unfollow\"]';"
Enter
Sleep 200ms
Type "  const confirmBtn = '[data-testid=\"confirmationSheetConfirm\"]';"
Enter
Sleep 200ms
Type "  // ... script continues"
Enter
Sleep 200ms
Type "})();"
Enter
Sleep 1s

# Simulated output
Type "🧹 XActions: Unfollow Everyone"
Enter
Sleep 500ms
Type "⏳ Unfollowed 1 of ~2,847"
Enter
Sleep 400ms
Type "⏳ Unfollowed 2 of ~2,847"
Enter
Sleep 400ms
Type "⏳ Unfollowed 3 of ~2,847"
Enter
Sleep 400ms
Type "⏳ Unfollowed 4 of ~2,847"
Enter
Sleep 400ms
Type "⏳ Unfollowed 5 of ~2,847"
Enter
Sleep 400ms
Type "..."
Enter
Sleep 1s
Type "✅ Done! Unfollowed 2,847 accounts"
Enter
Sleep 2s
