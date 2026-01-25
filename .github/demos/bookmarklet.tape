# XActions - Bookmarklet Demo
# Run with: vhs bookmarklet.tape

Output bookmarklet.gif
Output bookmarklet.webm

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Framerate 30

# Title
Type "# 🔖 XActions One-Click Bookmarklets"
Enter
Sleep 500ms
Enter

Type "# 1. Drag bookmarklet to your bookmark bar"
Enter
Sleep 1s

Type "# 2. Go to x.com (Twitter)"
Enter
Sleep 500ms

Type "# 3. Click the bookmarklet - that's it!"
Enter
Sleep 1s
Enter

# Show available bookmarklets
Type "Available One-Click Scripts:"
Enter
Sleep 500ms

Type@50ms "
┌─────────────────────────────┬────────────────────────────┐
│ 🧹 Unfollow Everyone        │ Mass unfollow all accounts │
├─────────────────────────────┼────────────────────────────┤
│ 🚫 Unfollow Non-Followers   │ Keep only mutual follows   │
├─────────────────────────────┼────────────────────────────┤
│ 🚪 Leave All Communities    │ Exit all X communities     │
├─────────────────────────────┼────────────────────────────┤
│ 🔍 Detect Unfollowers       │ Who stopped following you  │
├─────────────────────────────┼────────────────────────────┤
│ 📥 Download Video           │ Save any X video           │
└─────────────────────────────┴────────────────────────────┘
"
Enter
Sleep 2s

Type "# Visit: xactions.app/run for bookmarklets"
Enter
Sleep 2s
