# SettingsActions

Actions for managing account settings and profile on X/Twitter.

## Import

```python
from xeepy.actions.settings import SettingsActions
```

## Class Signature

```python
class SettingsActions:
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_manager` | `BrowserManager` | Required | Browser manager instance |
| `rate_limiter` | `Optional[RateLimiter]` | `None` | Rate limiter instance |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get_settings()` | `AccountSettings` | Get current settings |
| `update_settings(settings)` | `bool` | Update account settings |
| `get_notifications()` | `List[Notification]` | Get notifications |
| `change_password(old, new)` | `bool` | Change password |
| `update_profile(...)` | `bool` | Update profile info |
| `update_profile_image(path)` | `bool` | Update avatar |
| `update_profile_banner(path)` | `bool` | Update banner |

### `get_settings`

```python
async def get_settings(self) -> AccountSettings
```

Get current account settings.

### `update_settings`

```python
async def update_settings(
    self,
    settings: Dict[str, Any]
) -> bool
```

Update account settings.

**Available Settings:**
- `protected`: `bool` - Private account
- `allow_dm_from`: `str` - `"everyone"`, `"following"`, `"verified"`
- `sensitive_media`: `bool` - Mark media as sensitive
- `hide_sensitive_content`: `bool` - Hide sensitive content
- `quality_filter`: `bool` - Enable quality filter
- `personalization`: `bool` - Allow personalization

### `update_profile`

```python
async def update_profile(
    self,
    name: Optional[str] = None,
    bio: Optional[str] = None,
    location: Optional[str] = None,
    website: Optional[str] = None,
    birth_date: Optional[str] = None
) -> bool
```

Update profile information.

### `update_profile_image`

```python
async def update_profile_image(
    self,
    image_path: str
) -> bool
```

Update profile avatar image.

### `update_profile_banner`

```python
async def update_profile_banner(
    self,
    image_path: str
) -> bool
```

Update profile banner image.

### `change_password`

```python
async def change_password(
    self,
    old_password: str,
    new_password: str
) -> bool
```

Change account password.

## AccountSettings Object

```python
@dataclass
class AccountSettings:
    username: str                    # Current username
    email: str                       # Account email
    phone: Optional[str]             # Phone number
    protected: bool                  # Private account
    allow_dm_from: str               # DM settings
    sensitive_media: bool            # Sensitive media setting
    hide_sensitive_content: bool     # Hide sensitive
    quality_filter: bool             # Quality filter enabled
    personalization: bool            # Personalization enabled
    language: str                    # Interface language
    country: str                     # Country setting
```

## Notification Object

```python
@dataclass
class Notification:
    id: str                          # Notification ID
    type: str                        # like, retweet, follow, mention, etc.
    text: str                        # Notification text
    user: Optional[User]             # Related user
    tweet: Optional[Tweet]           # Related tweet
    created_at: datetime             # Notification time
    is_read: bool                    # Read status
```

## Usage Examples

### Get Current Settings

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        settings = await x.settings.get_settings()
        
        print(f"Username: @{settings.username}")
        print(f"Protected: {settings.protected}")
        print(f"DM from: {settings.allow_dm_from}")
        print(f"Quality filter: {settings.quality_filter}")

asyncio.run(main())
```

### Make Account Private

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        success = await x.settings.update_settings({
            "protected": True
        })
        
        print("Account is now private!" if success else "Failed")

asyncio.run(main())
```

### Update DM Settings

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Only allow DMs from people you follow
        success = await x.settings.update_settings({
            "allow_dm_from": "following"
        })
        
        # Options: "everyone", "following", "verified"
        print("DM settings updated!" if success else "Failed")

asyncio.run(main())
```

### Update Multiple Settings

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        success = await x.settings.update_settings({
            "protected": False,
            "allow_dm_from": "everyone",
            "sensitive_media": False,
            "quality_filter": True
        })
        
        print("Settings updated!" if success else "Failed")

asyncio.run(main())
```

### Update Profile Information

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        success = await x.settings.update_profile(
            name="John Doe",
            bio="Software developer | Python enthusiast | Building cool stuff",
            location="San Francisco, CA",
            website="https://johndoe.dev"
        )
        
        print("Profile updated!" if success else "Failed")

asyncio.run(main())
```

### Update Profile Picture

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Update avatar
        success = await x.settings.update_profile_image("new_avatar.jpg")
        print("Avatar updated!" if success else "Failed")
        
        # Update banner
        success = await x.settings.update_profile_banner("new_banner.jpg")
        print("Banner updated!" if success else "Failed")

asyncio.run(main())
```

### Change Password

```python
from xeepy import Xeepy
import getpass

async def main():
    async with Xeepy() as x:
        old_pass = getpass.getpass("Current password: ")
        new_pass = getpass.getpass("New password: ")
        confirm = getpass.getpass("Confirm new password: ")
        
        if new_pass != confirm:
            print("Passwords don't match!")
            return
        
        success = await x.settings.change_password(old_pass, new_pass)
        print("Password changed!" if success else "Failed")

asyncio.run(main())
```

### Get Notifications

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        notifications = await x.settings.get_notifications()
        
        print(f"You have {len(notifications)} notifications:")
        
        for notif in notifications[:10]:
            status = "🔵" if not notif.is_read else "⚪"
            print(f"{status} [{notif.type}] {notif.text[:60]}...")

asyncio.run(main())
```

### Profile Refresh Automation

```python
from xeepy import Xeepy
from datetime import datetime

async def seasonal_profile_update():
    """Update profile based on current season."""
    async with Xeepy() as x:
        month = datetime.now().month
        
        if month in [12, 1, 2]:
            bio = "❄️ Winter mode | Building cool stuff"
            banner = "winter_banner.jpg"
        elif month in [3, 4, 5]:
            bio = "🌸 Spring vibes | Building cool stuff"
            banner = "spring_banner.jpg"
        elif month in [6, 7, 8]:
            bio = "☀️ Summer edition | Building cool stuff"
            banner = "summer_banner.jpg"
        else:
            bio = "🍂 Fall season | Building cool stuff"
            banner = "fall_banner.jpg"
        
        await x.settings.update_profile(bio=bio)
        await x.settings.update_profile_banner(banner)
        
        print("Profile updated for the season!")

asyncio.run(seasonal_profile_update())
```

### Backup Settings

```python
from xeepy import Xeepy
import json

async def backup_settings(output_file: str):
    async with Xeepy() as x:
        settings = await x.settings.get_settings()
        
        backup = {
            "username": settings.username,
            "protected": settings.protected,
            "allow_dm_from": settings.allow_dm_from,
            "sensitive_media": settings.sensitive_media,
            "quality_filter": settings.quality_filter,
            "backed_up_at": datetime.now().isoformat()
        }
        
        with open(output_file, "w") as f:
            json.dump(backup, f, indent=2)
        
        print(f"Settings backed up to {output_file}")

asyncio.run(backup_settings("settings_backup.json"))
```

## See Also

- [AuthManager](../core/auth.md) - Authentication
- [ProfileScraper](../scrapers/profile.md) - Profile scraping
- [User Model](../models/user.md) - User data structure
