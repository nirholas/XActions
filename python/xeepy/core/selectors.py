"""
X/Twitter DOM selectors.

Centralized selectors for all X/Twitter UI elements.
Updated regularly as Twitter changes their DOM structure.
"""

from __future__ import annotations


class Selectors:
    """
    X/Twitter DOM selectors - kept centralized for easy updates.
    
    All selectors use data-testid attributes when available as they
    are more stable than class names which change frequently.
    """

    # ==========================================================================
    # Tweet Elements
    # ==========================================================================
    
    TWEET = '[data-testid="tweet"]'
    TWEET_TEXT = '[data-testid="tweetText"]'
    TWEET_TIME = 'time'
    TWEET_AUTHOR = '[data-testid="User-Name"]'
    TWEET_AVATAR = '[data-testid="Tweet-User-Avatar"]'
    
    # Tweet stats (inside tweet)
    TWEET_REPLY_COUNT = '[data-testid="reply"] span'
    TWEET_RETWEET_COUNT = '[data-testid="retweet"] span'
    TWEET_LIKE_COUNT = '[data-testid="like"] span'
    TWEET_VIEW_COUNT = 'a[href$="/analytics"] span'
    TWEET_BOOKMARK_COUNT = '[data-testid="bookmark"] span'
    
    # Tweet media
    TWEET_PHOTO = '[data-testid="tweetPhoto"]'
    TWEET_VIDEO = '[data-testid="videoPlayer"]'
    TWEET_CARD = '[data-testid="card.wrapper"]'
    
    # Tweet article (link to tweet)
    TWEET_LINK = 'a[href*="/status/"]'
    
    # ==========================================================================
    # Action Buttons
    # ==========================================================================
    
    # Follow/Unfollow
    FOLLOW_BUTTON = '[data-testid$="-follow"]'
    UNFOLLOW_BUTTON = '[data-testid$="-unfollow"]'
    
    # Tweet actions
    LIKE_BUTTON = '[data-testid="like"]'
    UNLIKE_BUTTON = '[data-testid="unlike"]'
    RETWEET_BUTTON = '[data-testid="retweet"]'
    UNRETWEET_BUTTON = '[data-testid="unretweet"]'
    REPLY_BUTTON = '[data-testid="reply"]'
    BOOKMARK_BUTTON = '[data-testid="bookmark"]'
    REMOVE_BOOKMARK_BUTTON = '[data-testid="removeBookmark"]'
    SHARE_BUTTON = '[data-testid="share"]'
    
    # Compose
    COMPOSE_TWEET_BUTTON = '[data-testid="tweetButtonInline"]'
    COMPOSE_REPLY_BUTTON = '[data-testid="tweetButton"]'
    COMPOSE_TEXT_AREA = '[data-testid="tweetTextarea_0"]'
    
    # ==========================================================================
    # Confirmation Dialogs
    # ==========================================================================
    
    CONFIRM_BUTTON = '[data-testid="confirmationSheetConfirm"]'
    CANCEL_BUTTON = '[data-testid="confirmationSheetCancel"]'
    UNFOLLOW_CONFIRM = '[data-testid="confirmationSheetConfirm"]'
    
    # ==========================================================================
    # User Elements
    # ==========================================================================
    
    USER_CELL = '[data-testid="UserCell"]'
    USER_NAME = '[data-testid="User-Name"]'
    USER_AVATAR = '[data-testid="UserAvatar-Container"]'
    USER_DESCRIPTION = '[data-testid="UserDescription"]'
    USER_LOCATION = '[data-testid="UserLocation"]'
    USER_URL = '[data-testid="UserUrl"]'
    USER_JOINED_DATE = '[data-testid="UserJoinDate"]'
    USER_PROFESSIONAL_CATEGORY = '[data-testid="UserProfessionalCategory"]'
    
    # Verification badges
    VERIFIED_BADGE = '[data-testid="icon-verified"]'
    BLUE_VERIFIED_BADGE = 'svg[data-testid="icon-verified"]'
    
    # ==========================================================================
    # Profile Page
    # ==========================================================================
    
    PROFILE_HEADER = '[data-testid="UserProfileHeader_Items"]'
    PROFILE_NAME = '[data-testid="UserName"]'
    PROFILE_BIO = '[data-testid="UserDescription"]'
    PROFILE_LOCATION = '[data-testid="UserLocation"]'
    PROFILE_WEBSITE = '[data-testid="UserUrl"]'
    PROFILE_JOINED = '[data-testid="UserJoinDate"]'
    PROFILE_BANNER = '[data-testid="UserAvatar-Container-unknown"]'
    
    # Profile stats
    FOLLOWERS_LINK = 'a[href$="/followers"]'
    FOLLOWING_LINK = 'a[href$="/following"]'
    FOLLOWERS_COUNT = 'a[href$="/followers"] span'
    FOLLOWING_COUNT = 'a[href$="/following"] span'
    
    # Profile tabs
    PROFILE_TAB_TWEETS = '[data-testid="ScrollSnap-List"] a[href$=""]'
    PROFILE_TAB_REPLIES = 'a[href$="/with_replies"]'
    PROFILE_TAB_MEDIA = 'a[href$="/media"]'
    PROFILE_TAB_LIKES = 'a[href$="/likes"]'
    
    # ==========================================================================
    # Navigation & Layout
    # ==========================================================================
    
    PRIMARY_COLUMN = '[data-testid="primaryColumn"]'
    SIDEBAR = '[data-testid="sidebarColumn"]'
    TIMELINE = '[aria-label*="Timeline"]'
    
    # Navigation menu
    NAV_HOME = 'a[data-testid="AppTabBar_Home_Link"]'
    NAV_EXPLORE = 'a[data-testid="AppTabBar_Explore_Link"]'
    NAV_NOTIFICATIONS = 'a[data-testid="AppTabBar_Notifications_Link"]'
    NAV_MESSAGES = 'a[data-testid="AppTabBar_DirectMessage_Link"]'
    NAV_PROFILE = 'a[data-testid="AppTabBar_Profile_Link"]'
    
    # ==========================================================================
    # Search
    # ==========================================================================
    
    SEARCH_INPUT = '[data-testid="SearchBox_Search_Input"]'
    SEARCH_CLEAR = '[data-testid="SearchBox_Search_Clear"]'
    SEARCH_TABS = '[data-testid="ScrollSnap-List"]'
    SEARCH_TAB_TOP = 'a[href*="f=top"]'
    SEARCH_TAB_LATEST = 'a[href*="f=live"]'
    SEARCH_TAB_PEOPLE = 'a[href*="f=user"]'
    SEARCH_TAB_MEDIA = 'a[href*="f=media"]'
    SEARCH_TAB_LISTS = 'a[href*="f=list"]'
    
    # ==========================================================================
    # Lists
    # ==========================================================================
    
    LIST_CELL = '[data-testid="listCell"]'
    LIST_NAME = '[data-testid="listName"]'
    LIST_DESCRIPTION = '[data-testid="listDescription"]'
    LIST_MEMBERS_COUNT = 'a[href$="/members"]'
    
    # ==========================================================================
    # Notifications
    # ==========================================================================
    
    NOTIFICATION_CELL = '[data-testid="notification"]'
    NOTIFICATION_TEXT = '[data-testid="notificationText"]'
    
    # ==========================================================================
    # Loading & Empty States
    # ==========================================================================
    
    LOADING_SPINNER = '[data-testid="progressBar"]'
    LOADING_INDICATOR = 'div[role="progressbar"]'
    EMPTY_STATE = '[data-testid="emptyState"]'
    ERROR_STATE = '[data-testid="error-detail"]'
    
    # ==========================================================================
    # Modals & Overlays
    # ==========================================================================
    
    MODAL = '[data-testid="sheetDialog"]'
    MODAL_CLOSE = '[data-testid="app-bar-close"]'
    TOAST = '[data-testid="toast"]'
    
    # ==========================================================================
    # Login/Auth
    # ==========================================================================
    
    LOGIN_BUTTON = 'a[data-testid="loginButton"]'
    SIGNUP_BUTTON = 'a[data-testid="signupButton"]'
    LOGOUT_BUTTON = 'a[data-testid="logout"]'
    
    # Account switcher
    ACCOUNT_SWITCHER = '[data-testid="SideNav_AccountSwitcher_Button"]'
    
    # ==========================================================================
    # Retweet Menu
    # ==========================================================================
    
    RETWEET_MENU = '[data-testid="Dropdown"]'
    RETWEET_OPTION = '[data-testid="retweetConfirm"]'
    QUOTE_TWEET_OPTION = '[data-testid="Dropdown"] a[href*="compose"]'
    UNDO_RETWEET_OPTION = '[data-testid="unretweetConfirm"]'
    
    # ==========================================================================
    # Hashtag & Trends
    # ==========================================================================
    
    TREND_ITEM = '[data-testid="trend"]'
    TREND_NAME = '[data-testid="trendName"]'
    HASHTAG_LINK = 'a[href*="/hashtag/"]'
    
    # ==========================================================================
    # Class Methods
    # ==========================================================================
    
    @classmethod
    def tweet_by_id(cls, tweet_id: str) -> str:
        """Get selector for a specific tweet by ID."""
        return f'a[href*="/status/{tweet_id}"]'
    
    @classmethod
    def user_profile_link(cls, username: str) -> str:
        """Get selector for a user's profile link."""
        return f'a[href="/{username}"]'
    
    @classmethod
    def user_cell_by_username(cls, username: str) -> str:
        """Get selector for a user cell containing specific username."""
        return f'{cls.USER_CELL}:has(a[href="/{username}"])'
    
    @classmethod
    def tab_by_label(cls, label: str) -> str:
        """Get selector for a tab with specific aria-label."""
        return f'[role="tab"][aria-label*="{label}"]'
