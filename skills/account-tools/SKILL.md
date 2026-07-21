---
name: account-tools
description: Miscellaneous account utilities — view join date, login history, connected accounts, appeal suspension, QR code sharing, share/embed tweets, upload contacts, and calculate account age. Use when users need account info tools not covered by other skills.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Account Tools (Miscellaneous)

Browser console scripts for account utility tasks on X/Twitter.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| View join date, login history, connected accounts | `src/accountMisc.js` | `x.com` |
| Appeal account suspension | `src/accountMisc.js` | `x.com` |
| Calculate account age | `src/accountMisc.js` | `x.com/USERNAME` |
| Generate QR code for a profile/tweet | `src/qrCodeSharing.js` | Any page |
| Share or embed a tweet | `src/shareEmbed.js` | Tweet page |
| Upload contacts for people discovery | `src/uploadContacts.js` | `x.com` |

## accountMisc.js — Available Functions

```js
XActions.accountMisc.viewJoinDate('username')       // Scrape join date from profile
XActions.accountMisc.viewLoginHistory()             // View active sessions (device, location, IP)
XActions.accountMisc.viewConnectedAccounts()        // View linked external accounts (Google, Apple)
XActions.accountMisc.appealSuspension()             // Navigate to account appeal/support page
XActions.accountMisc.exportAccountSummary()         // Export account data as JSON
XActions.accountMisc.accountAgeCalculator('user')   // Calculate account age in days/months/years
```

## qrCodeSharing.js — Usage

```js
// Generates a QR code for any X profile or tweet URL
XActions.qr.generateProfile('username')   // QR code for @username's profile
XActions.qr.generateTweet('tweetUrl')     // QR code for a specific tweet
XActions.qr.download()                     // Download as PNG
```

## shareEmbed.js — Usage

```js
// On a tweet page:
XActions.share.copyLink()               // Copy tweet URL to clipboard
XActions.share.getEmbedCode()           // Get HTML embed code for the tweet
XActions.share.openShare()              // Open X's native share menu
```

## uploadContacts.js — Usage

Uploads phone contacts to X for "People you may know" discovery. Navigate to `x.com/settings/contacts` and paste the script.

## Notes

- `viewLoginHistory()` requires navigating to `x.com/settings/sessions`
- `viewConnectedAccounts()` requires navigating to `x.com/settings/connected_accounts`
- `appealSuspension()` navigates to `x.com/help/contact` with suspension-related form pre-filled
- QR codes are generated client-side using a canvas element — no third-party service used
- Contact upload is for discovery only; X encrypts contacts for matching

## Related Skills

- **profile-management** — Edit your profile, bio, avatar
- **settings-privacy** — Configure privacy settings
- **account-backup** — Export your full account data
