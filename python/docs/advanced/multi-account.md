# Multi-Account Management

Manage multiple X/Twitter accounts safely with XTools session isolation.

## Account Manager Setup

```python
from dataclasses import dataclass
from xtools import XTools

@dataclass
class Account:
    username: str
    cookies_path: str
    proxy: str = None
    active: bool = True

class AccountManager:
    def __init__(self, accounts: list[Account]):
        self.accounts = {acc.username: acc for acc in accounts}
        self.clients: dict[str, XTools] = {}
    
    async def get_client(self, username: str) -> XTools:
        if username not in self.clients:
            account = self.accounts[username]
            client = XTools(headless=True, proxy=account.proxy)
            await client.auth.load_cookies(account.cookies_path)
            self.clients[username] = client
        return self.clients[username]
    
    async def close_all(self):
        for client in self.clients.values():
            await client.close()
        self.clients.clear()
```

!!! danger "Use Separate Proxies"
    Each account should use a different proxy/IP to avoid association and mass bans.

## Configuration File

```yaml
# accounts.yaml
accounts:
  - username: "account1"
    cookies_path: "sessions/account1.json"
    proxy: "http://proxy1:8080"
    tags: ["main", "engagement"]
  - username: "account2"
    cookies_path: "sessions/account2.json"
    proxy: "http://proxy2:8080"
    tags: ["scraping"]
```

```python
import yaml

def load_accounts(config_path: str) -> list[Account]:
    with open(config_path) as f:
        config = yaml.safe_load(f)
    return [Account(**acc) for acc in config["accounts"]]

accounts = load_accounts("accounts.yaml")
manager = AccountManager(accounts)
```

## Round-Robin Operations

```python
from itertools import cycle

async def distributed_scrape(usernames: list[str]):
    """Distribute scraping across multiple accounts."""
    accounts = load_accounts("accounts.yaml")
    scraping_accounts = [a for a in accounts if "scraping" in a.get("tags", [])]
    account_cycle = cycle(scraping_accounts)
    
    results = []
    for username in usernames:
        account = next(account_cycle)
        async with XTools(proxy=account.proxy) as x:
            await x.auth.load_cookies(account.cookies_path)
            profile = await x.scrape.profile(username)
            results.append(profile)
        await asyncio.sleep(2)
    return results
```

!!! tip "Tag Accounts by Purpose"
    Use tags to separate accounts for different tasks (scraping, engagement, posting).

## Account Health Monitoring

```python
from datetime import datetime

@dataclass
class AccountHealth:
    username: str
    is_active: bool
    is_suspended: bool
    last_checked: datetime

async def check_account_health(account: Account) -> AccountHealth:
    try:
        async with XTools(proxy=account.proxy) as x:
            await x.auth.load_cookies(account.cookies_path)
            await x.scrape.profile(account.username)
            return AccountHealth(account.username, True, False, datetime.now())
    except Exception as e:
        return AccountHealth(
            account.username, False, "suspended" in str(e).lower(), datetime.now()
        )

async def monitor_all_accounts():
    accounts = load_accounts("accounts.yaml")
    health_reports = await asyncio.gather(
        *[check_account_health(acc) for acc in accounts]
    )
    for report in health_reports:
        status = "🟢" if report.is_active else "🔴"
        print(f"{status} @{report.username}")
```

!!! warning "Suspended Account Detection"
    Regularly check account health and remove suspended accounts from rotation.

## Concurrent Multi-Account Operations

```python
async def parallel_engagement(tweet_url: str, accounts: list[Account]):
    """Like a tweet from multiple accounts with staggered timing."""
    async def like_from_account(account: Account, delay: int):
        await asyncio.sleep(delay)
        async with XTools(proxy=account.proxy) as x:
            await x.auth.load_cookies(account.cookies_path)
            await x.engage.like(tweet_url)
        return account.username
    
    tasks = [like_from_account(acc, i * 5) for i, acc in enumerate(accounts)]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

## Session Persistence

```python
async def refresh_all_sessions():
    """Refresh and save sessions for all accounts."""
    accounts = load_accounts("accounts.yaml")
    for account in accounts:
        try:
            async with XTools(proxy=account.proxy) as x:
                await x.auth.load_cookies(account.cookies_path)
                await x.scrape.profile(account.username)
                await x.auth.save_cookies(account.cookies_path)
                print(f"✓ Refreshed: @{account.username}")
        except Exception as e:
            print(f"✗ Failed: @{account.username} - {e}")
```
