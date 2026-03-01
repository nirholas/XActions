# Authentication

Xeepy uses browser-based authentication—no API keys required. This guide covers all authentication methods.

## Why Browser Auth?

| Traditional API | Xeepy Browser Auth |
|-----------------|---------------------|
| $100+/month fees | Free |
| Rate limited | Natural pacing |
| Approval required | Instant access |
| Limited features | Full access |
| Can be revoked | Your browser, your rules |

## Quick Start

The fastest way to authenticate:

```bash
# Interactive login (opens browser)
xeepy auth login
```

This opens a browser window where you log in normally. Xeepy saves your session for future use.

## Authentication Methods

### Method 1: Interactive Login (Recommended)

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Opens browser for manual login
    await x.auth.login()
    
    # Your session is now saved automatically
    # Future runs will use the saved session
```

**When to use:** First-time setup, session expired, or switching accounts.

### Method 2: Load Saved Session

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Load previously saved session
    await x.auth.load_session()
    
    # Or from a specific file
    await x.auth.load_session("my_session.json")
```

**When to use:** Automated scripts, CI/CD, scheduled tasks.

### Method 3: Cookie Import

Export cookies from your browser and import them:

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Import from exported cookie file
    await x.auth.import_cookies("cookies.json")
    
    # Or from browser extension export
    await x.auth.import_cookies("cookies.txt", format="netscape")
```

**When to use:** When you can't use interactive login (headless servers).

### Method 4: Environment Variables

```bash
# Set in your environment
export XEEPY_SESSION_FILE="/path/to/session.json"
```

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Automatically loads from XEEPY_SESSION_FILE
    await x.auth.auto_login()
```

**When to use:** Production deployments, Docker containers.

## Session Management

### Save Session

```python
async with Xeepy() as x:
    await x.auth.login()
    
    # Save for later use
    await x.auth.save_session("my_session.json")
```

### Session File Location

Default locations:

| OS | Path |
|----|------|
| Linux | `~/.config/xeepy/session.json` |
| macOS | `~/Library/Application Support/xeepy/session.json` |
| Windows | `%APPDATA%\xeepy\session.json` |

### Check Session Status

```python
async with Xeepy() as x:
    # Check if session is valid
    if await x.auth.is_authenticated():
        print("✓ Logged in")
        print(f"Username: {await x.auth.get_username()}")
    else:
        print("✗ Not logged in")
        await x.auth.login()
```

### Refresh Session

Sessions can expire. Refresh them:

```python
async with Xeepy() as x:
    # Try to use existing session, refresh if needed
    await x.auth.ensure_authenticated()
```

## Multiple Accounts

Manage multiple X/Twitter accounts:

```python
from xeepy import Xeepy

# Account 1
async with Xeepy(profile="personal") as x:
    await x.auth.login()  # Login as personal account

# Account 2
async with Xeepy(profile="business") as x:
    await x.auth.login()  # Login as business account

# Later, switch between them
async with Xeepy(profile="personal") as x:
    await x.auth.load_session()  # Loads personal session
```

### Account Profiles

```python
from xeepy import Xeepy

# Create named profiles
profiles = {
    "main": "sessions/main_session.json",
    "backup": "sessions/backup_session.json",
    "research": "sessions/research_session.json"
}

async def use_account(profile_name: str):
    async with Xeepy() as x:
        await x.auth.load_session(profiles[profile_name])
        return x
```

## CLI Authentication

### Login

```bash
# Interactive login (default)
xeepy auth login

# Login with specific profile
xeepy auth login --profile business

# Login with browser visible (debugging)
xeepy auth login --headful
```

### Status

```bash
# Check current auth status
xeepy auth status

# Output:
# ✓ Authenticated
# Username: @yourhandle
# Session age: 2 days
# Expires: ~28 days
```

### Logout

```bash
# Clear saved session
xeepy auth logout

# Clear specific profile
xeepy auth logout --profile business

# Clear all sessions
xeepy auth logout --all
```

### Export/Import

```bash
# Export session for backup
xeepy auth export backup_session.json

# Import from backup
xeepy auth import backup_session.json

# Import from browser cookie export
xeepy auth import cookies.txt --format netscape
```

## Exporting Cookies from Browser

### Chrome/Brave

1. Install "EditThisCookie" extension
2. Go to x.com and log in
3. Click the extension icon
4. Click "Export" (copies JSON to clipboard)
5. Save to `cookies.json`

### Firefox

1. Install "Cookie Quick Manager" extension
2. Go to x.com and log in
3. Click extension → Export → JSON
4. Save the file

### Using Browser DevTools

```javascript
// In browser console on x.com
copy(document.cookie.split('; ').map(c => {
    const [name, value] = c.split('=');
    return {name, value, domain: '.x.com', path: '/'};
}));
```

## Security Best Practices

!!! danger "Never share session files"
    Session files contain authentication tokens. Treat them like passwords.

### Recommended Practices

1. **Use environment variables** for session paths in production
2. **Encrypt session files** at rest
3. **Rotate sessions** periodically
4. **Use separate accounts** for automation vs personal use
5. **Enable 2FA** on your X account (Xeepy handles it)

### Secure Session Storage

```python
import os
from cryptography.fernet import Fernet

# Generate key (save this securely!)
key = Fernet.generate_key()
cipher = Fernet(key)

async with Xeepy() as x:
    await x.auth.login()
    
    # Get session data
    session_data = await x.auth.export_session()
    
    # Encrypt before saving
    encrypted = cipher.encrypt(session_data.encode())
    with open("session.enc", "wb") as f:
        f.write(encrypted)
```

### Gitignore Sessions

Add to your `.gitignore`:

```gitignore
# Xeepy sessions
*.session.json
session.json
sessions/
cookies.json
*.enc
```

## Two-Factor Authentication (2FA)

Xeepy handles 2FA during interactive login:

```python
async with Xeepy() as x:
    # If 2FA is enabled, you'll be prompted in the browser
    await x.auth.login()  # Complete 2FA in browser window
```

For automated 2FA (advanced):

```python
async with Xeepy() as x:
    await x.auth.login(
        totp_secret="YOUR_2FA_SECRET"  # From authenticator setup
    )
```

## Troubleshooting

??? question "Session expired unexpectedly"
    
    Sessions typically last 30 days. To auto-refresh:
    ```python
    async with Xeepy(auto_refresh_session=True) as x:
        await x.auth.load_session()
    ```

??? question "Login loop / Can't complete login"
    
    Try clearing browser state:
    ```bash
    xeepy auth logout --clear-browser
    xeepy auth login --headful
    ```

??? question "Captcha during login"
    
    Use headful mode to solve manually:
    ```python
    async with Xeepy(headless=False) as x:
        await x.auth.login()  # Solve captcha in browser
    ```

??? question "Account locked after automation"
    
    This usually means rate limits were hit. See [Rate Limiting](../advanced/rate-limiting.md).

??? question "Session works locally but not on server"
    
    Sessions are tied to IP/fingerprint. Options:
    
    1. Login on the server directly
    2. Use residential proxies
    3. Use the same browser fingerprint

## API Reference

::: xeepy.core.auth.Auth
    options:
      show_source: false
      members:
        - login
        - logout
        - load_session
        - save_session
        - import_cookies
        - export_session
        - is_authenticated
        - ensure_authenticated
        - get_username

---

Next: [Quick Start Guide](quickstart.md) →
