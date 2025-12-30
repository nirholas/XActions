# Usage

These scripts are intended to be pasted into your browser's Developer Console while viewing your `following` page on X (formerly Twitter).

Basic steps:

1. Visit: https://twitter.com/YOUR_USER_NAME/following
2. Open Developer Console (Ctrl+Shift+I on Linux/Windows, Cmd+Opt+I on macOS)
3. Open one of the scripts in `src/`, copy its contents, and paste into the console

Files of interest:

- `src/unfollowback.js` — unfollow users who do not follow you back (default behavior)
- `src/unfollowEveryone.js` — unfollow everyone in your following list
- `src/unfollowWDFBLog.js` — unfollow non-followers and download a text file with usernames that were unfollowed

Notes and safety:

- These scripts automate clicks in your browser. Use at your own risk.
- Rate limits and automated behaviour on X may lead to account restrictions. Consider unfollowing in small batches and waiting between runs.
- The project provides the code as-is for transparency; it does not collect your credentials.
