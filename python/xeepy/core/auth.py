"""
Xeepy Authentication Manager

Handles X/Twitter authentication via browser automation.
Supports cookie-based session persistence and resume.
"""

import asyncio
import json
from pathlib import Path
from typing import Optional

from loguru import logger

from xeepy.core.browser import BrowserManager
from xeepy.core.exceptions import AuthenticationError


class AuthManager:
    """
    Manages authentication for X/Twitter.
    
    Supports login, session persistence, and session validation.
    """
    
    X_LOGIN_URL = "https://x.com/i/flow/login"
    X_HOME_URL = "https://x.com/home"
    
    # Selectors for login flow
    SELECTORS = {
        "username_input": 'input[autocomplete="username"]',
        "password_input": 'input[autocomplete="current-password"]',
        "next_button": 'button:has-text("Next")',
        "login_button": 'button[data-testid="LoginForm_Login_Button"]',
        "home_timeline": '[data-testid="primaryColumn"]',
        "error_message": '[data-testid="toast"]',
    }
    
    def __init__(self, browser: BrowserManager):
        self.browser = browser
        self._is_authenticated = False
    
    async def login(
        self,
        username: str,
        password: str,
        session_file: Optional[str | Path] = None,
    ) -> bool:
        """
        Login to X/Twitter.
        
        Args:
            username: X/Twitter username or email
            password: Account password
            session_file: Path to save session for reuse
            
        Returns:
            True if login successful
            
        Raises:
            AuthenticationError: If login fails
        """
        logger.info(f"Attempting login for user: {username}")
        
        # Try to load existing session first
        if session_file and Path(session_file).exists():
            if await self._try_session(session_file):
                logger.info("Logged in using saved session")
                return True
        
        # Perform fresh login
        page = await self.browser.new_page()
        
        try:
            await page.goto(self.X_LOGIN_URL, wait_until="networkidle")
            await asyncio.sleep(2)  # Wait for page to stabilize
            
            # Enter username
            await page.wait_for_selector(self.SELECTORS["username_input"], timeout=10000)
            await page.fill(self.SELECTORS["username_input"], username)
            await page.click(self.SELECTORS["next_button"])
            await asyncio.sleep(1)
            
            # Enter password
            await page.wait_for_selector(self.SELECTORS["password_input"], timeout=10000)
            await page.fill(self.SELECTORS["password_input"], password)
            await page.click(self.SELECTORS["login_button"])
            
            # Wait for home page
            try:
                await page.wait_for_selector(
                    self.SELECTORS["home_timeline"],
                    timeout=15000,
                )
                self._is_authenticated = True
                logger.info("Login successful")
                
                # Save session
                if session_file:
                    await self.browser.save_session(session_file)
                
                return True
                
            except Exception:
                # Check for error message
                error = await page.query_selector(self.SELECTORS["error_message"])
                error_text = await error.text_content() if error else "Unknown error"
                raise AuthenticationError(f"Login failed: {error_text}")
                
        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Login error: {e}")
            raise AuthenticationError(f"Login failed: {e}")
    
    async def _try_session(self, session_file: str | Path) -> bool:
        """Try to authenticate using saved session."""
        try:
            await self.browser.new_context(storage_state=session_file)
            page = await self.browser.new_page()
            await page.goto(self.X_HOME_URL, wait_until="networkidle")
            
            # Check if we're on the home page
            home = await page.query_selector(self.SELECTORS["home_timeline"])
            if home:
                self._is_authenticated = True
                return True
            
            return False
            
        except Exception as e:
            logger.warning(f"Session restore failed: {e}")
            return False
    
    async def is_logged_in(self) -> bool:
        """Check if currently logged in."""
        if not self._is_authenticated:
            return False
        
        if self.browser.page is None:
            return False
        
        try:
            await self.browser.page.goto(self.X_HOME_URL, wait_until="domcontentloaded")
            home = await self.browser.page.query_selector(self.SELECTORS["home_timeline"])
            return home is not None
        except Exception:
            return False
    
    async def logout(self) -> None:
        """Logout from X/Twitter."""
        if self.browser.page:
            await self.browser.page.goto("https://x.com/logout", wait_until="networkidle")
        self._is_authenticated = False
        logger.info("Logged out")
    
    @property
    def is_authenticated(self) -> bool:
        """Check authentication status."""
        return self._is_authenticated
    
    async def save_cookies(self, filepath: str | Path) -> bool:
        """
        Save current session cookies to a JSON file.
        
        Args:
            filepath: Path to save cookies
            
        Returns:
            True if cookies were saved successfully
        """
        try:
            if not self.browser._context:
                logger.warning("No browser context available")
                return False
            
            cookies = await self.browser._context.cookies()
            
            # Filter for X/Twitter cookies
            x_cookies = [
                c for c in cookies
                if c.get("domain", "").endswith((".twitter.com", ".x.com", "twitter.com", "x.com"))
            ]
            
            filepath = Path(filepath)
            filepath.parent.mkdir(parents=True, exist_ok=True)
            
            with open(filepath, "w") as f:
                json.dump(x_cookies, f, indent=2)
            
            logger.info(f"Saved {len(x_cookies)} cookies to {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save cookies: {e}")
            return False
    
    async def load_cookies(self, filepath: str | Path) -> bool:
        """
        Load cookies from a JSON file and restore session.
        
        Args:
            filepath: Path to cookies JSON file
            
        Returns:
            True if session was restored successfully
        """
        try:
            filepath = Path(filepath)
            if not filepath.exists():
                logger.warning(f"Cookie file not found: {filepath}")
                return False
            
            with open(filepath, "r") as f:
                cookies = json.load(f)
            
            if not cookies:
                logger.warning("No cookies in file")
                return False
            
            # Ensure browser context exists
            if not self.browser._context:
                await self.browser.new_context()
            
            # Add cookies to browser
            await self.browser._context.add_cookies(cookies)
            
            logger.info(f"Loaded {len(cookies)} cookies from {filepath}")
            
            # Verify session is valid
            page = await self.browser.new_page()
            await page.goto(self.X_HOME_URL, wait_until="networkidle")
            
            home = await page.query_selector(self.SELECTORS["home_timeline"])
            if home:
                self._is_authenticated = True
                logger.info("Session restored successfully")
                return True
            else:
                logger.warning("Cookies loaded but session invalid")
                return False
                
        except Exception as e:
            logger.error(f"Failed to load cookies: {e}")
            return False
    
    async def import_cookies_from_browser(
        self,
        browser_name: str = "chrome",
    ) -> bool:
        """
        Import cookies from a local browser installation.
        
        Requires browser_cookie3 package.
        
        Args:
            browser_name: Browser to import from (chrome, firefox, edge, opera)
            
        Returns:
            True if cookies were imported successfully
        """
        try:
            import browser_cookie3
        except ImportError:
            logger.error("browser_cookie3 not installed. Run: pip install browser_cookie3")
            return False
        
        try:
            # Get browser cookie function
            browser_funcs = {
                "chrome": browser_cookie3.chrome,
                "firefox": browser_cookie3.firefox,
                "edge": browser_cookie3.edge,
                "opera": browser_cookie3.opera,
                "chromium": browser_cookie3.chromium,
            }
            
            if browser_name.lower() not in browser_funcs:
                logger.error(f"Unsupported browser: {browser_name}")
                return False
            
            # Get cookies for Twitter domains
            cj = browser_funcs[browser_name.lower()](domain_name=".twitter.com")
            
            cookies = []
            for cookie in cj:
                cookies.append({
                    "name": cookie.name,
                    "value": cookie.value,
                    "domain": cookie.domain,
                    "path": cookie.path,
                    "secure": cookie.secure,
                })
            
            # Also get x.com cookies
            cj = browser_funcs[browser_name.lower()](domain_name=".x.com")
            for cookie in cj:
                cookies.append({
                    "name": cookie.name,
                    "value": cookie.value,
                    "domain": cookie.domain,
                    "path": cookie.path,
                    "secure": cookie.secure,
                })
            
            if not cookies:
                logger.warning(f"No Twitter cookies found in {browser_name}")
                return False
            
            # Ensure browser context exists
            if not self.browser._context:
                await self.browser.new_context()
            
            # Add cookies
            await self.browser._context.add_cookies(cookies)
            
            logger.info(f"Imported {len(cookies)} cookies from {browser_name}")
            
            # Verify session
            page = await self.browser.new_page()
            await page.goto(self.X_HOME_URL, wait_until="networkidle")
            
            home = await page.query_selector(self.SELECTORS["home_timeline"])
            if home:
                self._is_authenticated = True
                logger.info("Session imported successfully")
                return True
            else:
                logger.warning("Cookies imported but session invalid")
                return False
                
        except Exception as e:
            logger.error(f"Failed to import cookies: {e}")
            return False
    
    def get_auth_tokens(self) -> dict[str, str]:
        """
        Get authentication tokens from current session.
        
        Returns:
            Dict with ct0 and auth_token if available
        """
        tokens = {}
        
        try:
            if self.browser._context:
                cookies = asyncio.get_event_loop().run_until_complete(
                    self.browser._context.cookies()
                )
                
                for cookie in cookies:
                    if cookie.get("name") == "ct0":
                        tokens["ct0"] = cookie.get("value", "")
                    elif cookie.get("name") == "auth_token":
                        tokens["auth_token"] = cookie.get("value", "")
            
        except Exception as e:
            logger.warning(f"Could not get auth tokens: {e}")
        
        return tokens
    
    async def resume_session(
        self,
        cookies: dict[str, str] | str,
    ) -> bool:
        """
        Resume session using cookies dict or file.
        
        Args:
            cookies: Dict with ct0/auth_token or path to cookies file
            
        Returns:
            True if session was resumed successfully
        """
        if isinstance(cookies, str):
            # Load from file
            return await self.load_cookies(cookies)
        
        # Use dict directly
        try:
            cookie_list = []
            
            for name, value in cookies.items():
                cookie_list.append({
                    "name": name,
                    "value": value,
                    "domain": ".twitter.com",
                    "path": "/",
                    "secure": True,
                })
                # Also add for x.com
                cookie_list.append({
                    "name": name,
                    "value": value,
                    "domain": ".x.com",
                    "path": "/",
                    "secure": True,
                })
            
            # Ensure browser context exists
            if not self.browser._context:
                await self.browser.new_context()
            
            await self.browser._context.add_cookies(cookie_list)
            
            # Verify session
            page = await self.browser.new_page()
            await page.goto(self.X_HOME_URL, wait_until="networkidle")
            
            home = await page.query_selector(self.SELECTORS["home_timeline"])
            if home:
                self._is_authenticated = True
                logger.info("Session resumed successfully")
                return True
            else:
                logger.warning("Session resume failed - invalid cookies")
                return False
                
        except Exception as e:
            logger.error(f"Failed to resume session: {e}")
            return False
