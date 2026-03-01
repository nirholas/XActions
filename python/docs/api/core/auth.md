# AuthManager

Handles authentication, session management, and cookie operations for X/Twitter.

## Import

```python
from xeepy.core.auth import AuthManager
```

## Class Signature

```python
class AuthManager:
    def __init__(
        self,
        browser_manager: BrowserManager,
        cookies_path: Optional[str] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_manager` | `BrowserManager` | Required | Browser manager instance |
| `cookies_path` | `Optional[str]` | `None` | Default path for cookie storage |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `login()` | `bool` | Interactive login via browser |
| `login_with_credentials(username, password)` | `bool` | Automated credential login |
| `save_cookies(path)` | `None` | Save session cookies to file |
| `load_cookies(path)` | `bool` | Load cookies from file |
| `resume_session(cookies)` | `bool` | Resume with cookie dict |
| `import_cookies_from_browser(browser)` | `bool` | Import from system browser |
| `is_logged_in()` | `bool` | Check login status |
| `get_auth_tokens()` | `Dict` | Get ct0 and auth_token |
| `logout()` | `None` | Clear session and logout |

### `login`

```python
async def login(self, timeout: int = 120000) -> bool
```

Opens browser for manual login. Returns `True` when login is detected.

**Parameters:**
- `timeout`: Maximum wait time for login completion in milliseconds

### `login_with_credentials`

```python
async def login_with_credentials(
    self,
    username: str,
    password: str,
    email: Optional[str] = None,
    totp_secret: Optional[str] = None
) -> bool
```

Automated login with credentials. Supports 2FA via TOTP.

**Parameters:**
- `username`: X/Twitter username
- `password`: Account password
- `email`: Email for verification challenges
- `totp_secret`: TOTP secret for 2FA

### `save_cookies`

```python
async def save_cookies(self, path: str) -> None
```

Save current session cookies to a JSON file.

### `load_cookies`

```python
async def load_cookies(self, path: str) -> bool
```

Load cookies from a JSON file and restore the session.

### `resume_session`

```python
async def resume_session(self, cookies: Dict[str, str]) -> bool
```

Resume a session using a cookies dictionary.

**Parameters:**
- `cookies`: Dict with `ct0` and `auth_token` keys

### `import_cookies_from_browser`

```python
async def import_cookies_from_browser(
    self,
    browser: str = "chrome"
) -> bool
```

Import cookies from an installed browser. Requires `browser_cookie3`.

**Parameters:**
- `browser`: Browser name (`chrome`, `firefox`, `edge`, `safari`)

### `get_auth_tokens`

```python
def get_auth_tokens(self) -> Dict[str, str]
```

Get authentication tokens for GraphQL API usage.

**Returns:**
```python
{
    "ct0": "csrf_token_value",
    "auth_token": "auth_token_value"
}
```

### `is_logged_in`

```python
async def is_logged_in(self) -> bool
```

Check if the current session is authenticated.

## Usage Examples

### Manual Login

```python
from xeepy import Xeepy

async def main():
    async with Xeepy(headless=False) as x:
        # Opens browser for manual login
        success = await x.auth.login()
        
        if success:
            # Save session for later
            await x.auth.save_cookies("session.json")
            print("Login successful and saved!")

asyncio.run(main())
```

### Resume Saved Session

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Load previously saved session
        if await x.auth.load_cookies("session.json"):
            # Verify session is still valid
            if await x.auth.is_logged_in():
                print("Session restored!")
            else:
                print("Session expired, need to re-login")

asyncio.run(main())
```

### Import from System Browser

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Import cookies from Chrome
        success = await x.auth.import_cookies_from_browser("chrome")
        
        if success:
            print("Cookies imported from Chrome!")

asyncio.run(main())
```

### Get Tokens for GraphQL

```python
from xeepy import Xeepy
from xeepy.api.graphql import GraphQLClient

async def main():
    async with Xeepy() as x:
        await x.auth.load_cookies("session.json")
        
        # Get tokens for direct GraphQL access
        tokens = x.auth.get_auth_tokens()
        
        gql = GraphQLClient(cookies=tokens)
        user = await gql.get_user("username")
        await gql.close()

asyncio.run(main())
```

## See Also

- [Xeepy](xeepy.md) - Main entry point
- [GraphQL Client](../graphql.md) - Direct API access
