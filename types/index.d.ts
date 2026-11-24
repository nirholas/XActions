// ═══════════════════════════════════════════════════════════════════════════════
// XActions — TypeScript Type Declarations
// The Complete X/Twitter Automation Toolkit
// by nichxbt
// ═══════════════════════════════════════════════════════════════════════════════

import type { Browser, Page } from 'puppeteer';

// ── Core Types ──────────────────────────────────────────────────────────────

export interface BrowserOptions {
  headless?: boolean;
  proxy?: string;
  userDataDir?: string;
  args?: string[];
}

export interface ScrapeOptions {
  limit?: number;
  format?: 'json' | 'csv';
  output?: string;
}

// ── Profile ─────────────────────────────────────────────────────────────────

export interface ScrapedProfile {
  name: string;
  username: string;
  bio: string;
  location?: string;
  website?: string;
  joinDate?: string;
  followers: number;
  following: number;
  tweets: number;
  verified: boolean;
  avatar?: string;
  header?: string;
}

// ── User ────────────────────────────────────────────────────────────────────

export interface User {
  name: string;
  username: string;
  bio?: string;
  followers?: number;
  following?: number;
  verified?: boolean;
  followsBack?: boolean;
}

// ── Tweet ───────────────────────────────────────────────────────────────────

export interface ScrapedTweet {
  id: string;
  text: string;
  author: string;
  authorUsername: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  views?: number;
  url: string;
  media?: MediaItem[];
  isRetweet?: boolean;
  isQuote?: boolean;
  quotedTweet?: ScrapedTweet;
}

export interface MediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

// ── Thread ──────────────────────────────────────────────────────────────────

export interface Thread {
  author: string;
  tweets: ScrapedTweet[];
  totalTweets: number;
  text: string;
}

// ── Video ───────────────────────────────────────────────────────────────────

export interface VideoResult {
  url: string;
  variants: VideoVariant[];
  thumbnail?: string;
  duration?: number;
}

export interface VideoVariant {
  url: string;
  bitrate?: number;
  contentType: string;
}

// ── Bookmark ────────────────────────────────────────────────────────────────

export interface Bookmark {
  tweet: ScrapedTweet;
  savedAt?: string;
}

// ── DM ──────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
}

export interface DirectMessage {
  id: string;
  text: string;
  sender: string;
  recipient: string;
  timestamp: string;
  media?: MediaItem[];
}

// ── Analytics ───────────────────────────────────────────────────────────────

export interface Analytics {
  followers: number;
  following: number;
  tweets: number;
  impressions?: number;
  profileVisits?: number;
  mentions?: number;
  period?: string;
}

export interface PostAnalytics {
  tweet: ScrapedTweet;
  impressions: number;
  engagements: number;
  engagementRate: number;
  likes: number;
  retweets: number;
  replies: number;
  clicks?: number;
  profileClicks?: number;
}

// ── Sentiment ───────────────────────────────────────────────────────────────

export interface SentimentResult {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
}

// ── Workflow ────────────────────────────────────────────────────────────────

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  enabled: boolean;
  createdAt: string;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook';
  cron?: string;
}

export interface WorkflowStep {
  action?: string;
  target?: string;
  input?: string;
  output?: string;
  condition?: string;
  limit?: number;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'success' | 'error' | 'partial';
  steps: WorkflowStepResult[];
  duration: number;
}

export interface WorkflowStepResult {
  step: number;
  action: string;
  status: 'success' | 'skipped' | 'error';
  output?: unknown;
  error?: string;
  duration: number;
}

// ── Stream ──────────────────────────────────────────────────────────────────

export interface Stream {
  id: string;
  type: 'tweet' | 'follower' | 'mention';
  username: string;
  interval: number;
  status: 'active' | 'stopped';
  pollCount: number;
}

// ── Reputation ──────────────────────────────────────────────────────────────

export interface ReputationMonitor {
  id: string;
  target: string;
  type: 'mentions' | 'keyword' | 'replies';
  interval: number;
  status: 'active' | 'stopped';
}

export interface ReputationReport {
  username: string;
  period: string;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topPositive: ScrapedTweet[];
  topNegative: ScrapedTweet[];
  timeline: Array<{ date: string; averageSentiment: number; count: number }>;
  keywords: Array<{ word: string; count: number }>;
  alerts: string[];
}

// ── Export ───────────────────────────────────────────────────────────────────

export interface ExportResult {
  username: string;
  formats: string[];
  files: string[];
  stats: {
    profile: boolean;
    tweets: number;
    followers: number;
    following: number;
    bookmarks: number;
  };
}

// ── Plugin ──────────────────────────────────────────────────────────────────

export interface Plugin {
  name: string;
  version: string;
  description: string;
  tools?: unknown[];
  scrapers?: unknown[];
  routes?: unknown[];
  actions?: unknown[];
}

/** One entry of listPlugins(): what the plugin registry knows about a plugin. */
export interface PluginInfo {
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  loaded: boolean;
  installedAt?: string;
}

/** What installPlugin() reports: the plugin and how much it contributed. */
export interface InstalledPlugin {
  name: string;
  version: string;
  description?: string;
  actions: number;
  scrapers: number;
  tools: number;
  routes: number;
}

// ── Core Functions ──────────────────────────────────────────────────────────

/** Launch a Puppeteer browser with stealth mode */
export function createBrowser(options?: BrowserOptions): Promise<Browser>;

/** Create a new stealth page in the browser */
export function createPage(browser: Browser): Promise<Page>;

/** Scrape a user's profile data */
export function scrapeProfile(page: Page, username: string): Promise<ScrapedProfile>;

/** Scrape a user's followers */
export function scrapeFollowers(page: Page, username: string, options?: ScrapeOptions): Promise<User[]>;

/** Scrape a user's following list */
export function scrapeFollowing(page: Page, username: string, options?: ScrapeOptions): Promise<User[]>;

/** Scrape a user's tweets */
export function scrapeTweets(page: Page, username: string, options?: ScrapeOptions): Promise<ScrapedTweet[]>;

/** Search tweets by query */
export function searchTweets(page: Page, query: string, options?: ScrapeOptions): Promise<ScrapedTweet[]>;

/** Log a page in with an X auth_token cookie */
export function loginWithCookie(page: Page, authToken: string): Promise<void>;

/** Scrape every tweet in a thread, starting from the given tweet URL */
export function scrapeThread(page: Page, tweetUrl: string): Promise<ThreadTweet[]>;

/** Scrape the accounts that liked a tweet */
export function scrapeLikes(page: Page, tweetUrl: string, options?: ScrapeOptions): Promise<User[]>;

/** Scrape recent tweets for a hashtag */
export function scrapeHashtag(page: Page, hashtag: string, options?: ScrapeOptions): Promise<ScrapedTweet[]>;

/** Scrape the images and videos an account has posted */
export function scrapeMedia(page: Page, username: string, options?: ScrapeOptions): Promise<ScrapedMediaItem[]>;

/** Scrape the members of an X List by its URL */
export function scrapeListMembers(page: Page, listUrl: string, options?: ScrapeOptions): Promise<User[]>;

/** Scrape the logged-in account's bookmarks */
export function scrapeBookmarks(page: Page, options?: ScrapeOptions): Promise<ScrapedTweet[]>;

/** Scrape the logged-in account's notifications */
export function scrapeNotifications(page: Page, options?: ScrapeOptions): Promise<ScrapedNotification[]>;

/** Scrape the trending topics for the logged-in account */
export function scrapeTrending(page: Page, options?: ScrapeOptions): Promise<ScrapedTrend[]>;

/** Scrape the members of an X Community by its URL */
export function scrapeCommunityMembers(page: Page, communityUrl: string, options?: ScrapeOptions): Promise<User[]>;

/** Find live and scheduled X Spaces matching a search query */
export function scrapeSpaces(page: Page, query: string, options?: ScrapeOptions): Promise<ScrapedSpace[]>;

/** Write data to a JSON file; resolves with the filename */
export function exportToJSON(data: unknown, filename: string): Promise<string>;

/** Write an array of flat records to a CSV file; resolves with the filename */
export function exportToCSV(data: Record<string, unknown>[], filename: string): Promise<string>;

// ── Puppeteer scraper result shapes ─────────────────────────────────────────

export interface ThreadTweet {
  id: string | null;
  text: string | null;
  timestamp: string | null;
  url: string | null;
  isMainAuthor: boolean;
  platform: 'twitter';
}

export interface ScrapedMediaItem {
  type: 'image' | 'video';
  url: string;
  tweetUrl?: string;
  tweetId?: string;
  platform?: 'twitter';
}

export interface ScrapedNotification {
  text: string;
  time: string | null;
  links: string[];
  platform: 'twitter';
}

export interface ScrapedTrend {
  category: string | null;
  topic: string;
  posts: string | null;
  platform: 'twitter';
}

export interface ScrapedSpace {
  title: string | null;
  host?: string | null;
  status?: string | null;
  link: string;
  platform: 'twitter';
}

// ── Multi-platform scrape() and adapter system ──────────────────────────────

export type PlatformName = 'twitter' | 'x' | 'bluesky' | 'bsky' | 'mastodon' | 'masto' | 'threads';

export type ScrapeAction =
  | 'profile' | 'followers' | 'following' | 'tweets' | 'posts' | 'search' | 'hashtag'
  | 'trending' | 'thread' | 'likes' | 'media' | 'listMembers' | 'bookmarks'
  | 'notifications' | 'communityMembers' | 'spaces' | 'feed';

export interface UnifiedScrapeOptions {
  /** Target username (profile, followers, following, tweets, media) */
  username?: string;
  /** Search query (search action) */
  query?: string;
  /** Hashtag without the leading # (hashtag action) */
  hashtag?: string;
  /** Tweet, list, or community URL for URL-addressed actions */
  url?: string;
  listUrl?: string;
  communityUrl?: string;
  /** Bluesky feed URI (feed action) */
  feedUri?: string;
  /** Max results */
  limit?: number;
  /** Mastodon instance URL */
  instance?: string;
  /** Mastodon access token */
  accessToken?: string;
  /** Bluesky service URL, handle, and app password */
  service?: string;
  identifier?: string;
  password?: string;
  /** Existing Puppeteer page (Twitter, Threads); one is created when omitted */
  page?: Page;
  /** Options for the browser that is auto-created when no page is given */
  browserOptions?: BrowserOptions;
  /** X auth_token cookie applied to an auto-created page */
  authToken?: string;
  /** Existing API client (Bluesky, Mastodon) */
  client?: unknown;
  /** Close the auto-created browser when done (default true) */
  autoClose?: boolean;
  [key: string]: unknown;
}

/** A platform module: every scraper it implements plus its browser/client factories */
export type PlatformModule = Record<string, (...args: any[]) => any>;

/** Registry of platform modules, keyed by name and alias */
export declare const platforms: Record<PlatformName, PlatformModule>;

/** Look up a platform module by name; throws on an unknown platform */
export function getPlatform(platform: string): PlatformModule;

/**
 * Unified scrape entry point. Dispatches to the platform module and, when no
 * page or client is supplied, creates and tears down one for the call.
 */
export function scrape(platform: PlatformName | string, action: ScrapeAction | string, options?: UnifiedScrapeOptions): Promise<unknown>;

/** Resolve a plugin-contributed scraper's handler by name */
export function getPluginScraper(name: string): Promise<Function | undefined>;

export interface AdapterDependencyStatus {
  available: boolean;
  message?: string;
}

export interface AdapterInfo {
  name: string;
  description?: string;
  supportsJavaScript?: boolean;
  requiresBrowser?: boolean;
  available: boolean;
  installHint?: string | null;
  error?: string;
}

/**
 * Base class for scraping-framework adapters (Puppeteer, Playwright, HTTP).
 * Subclass it and register the class with `registerAdapter`.
 */
export declare class BaseAdapter {
  name: string;
  description: string;
  supportsJavaScript: boolean;
  requiresBrowser: boolean;
  checkDependencies(): Promise<AdapterDependencyStatus>;
  launch(options?: Record<string, unknown>): Promise<unknown>;
  newPage(browser: unknown, options?: Record<string, unknown>): Promise<unknown>;
  goto(page: unknown, url: string, options?: Record<string, unknown>): Promise<unknown>;
  evaluate<T = unknown>(page: unknown, fn: (...args: any[]) => T, ...args: unknown[]): Promise<T>;
  queryAll<T = unknown>(page: unknown, selector: string, mapFn: (el: Element) => T): Promise<T[]>;
  getContent(page: unknown): Promise<string>;
  setCookie(page: unknown, cookie: CookieEntry): Promise<void>;
  scroll(page: unknown, options?: Record<string, unknown>): Promise<void>;
  screenshot(page: unknown, options?: Record<string, unknown>): Promise<unknown>;
  waitForSelector(page: unknown, selector: string, options?: Record<string, unknown>): Promise<unknown>;
  closePage(page: unknown): Promise<void>;
  closeBrowser(browser: unknown): Promise<void>;
  getInfo(): Pick<AdapterInfo, 'name' | 'description' | 'supportsJavaScript' | 'requiresBrowser'>;
}

/** Get an adapter instance by name (defaults to the global default adapter) */
export function getAdapter(name?: string): Promise<BaseAdapter>;
/** Get the first adapter whose dependencies are installed, preferring the given name */
export function getAvailableAdapter(preferred?: string): Promise<BaseAdapter>;
/** Set the global default adapter name */
export function setDefaultAdapter(name: string): void;
/** Read the global default adapter name */
export function getDefaultAdapterName(): string;
/** Register an adapter class under a name */
export function registerAdapter(name: string, AdapterClass: typeof BaseAdapter): void;
/** Names of every registered adapter */
export function listAdapters(): string[];
/** Info and availability for every registered adapter */
export function getAdapterInfo(): Promise<AdapterInfo[]>;
/** Dependency status keyed by adapter name */
export function checkAvailability(): Promise<Record<string, AdapterDependencyStatus>>;

// ── HTTP scraper (direct GraphQL, no browser) ───────────────────────────────

export interface HttpScraperOptions {
  /** Browser cookie string for authentication, e.g. "auth_token=...; ct0=..." */
  cookies?: string;
  /** HTTP or SOCKS5 proxy URL */
  proxy?: string;
  /** How to handle rate limits: wait for the reset or throw */
  rateLimitStrategy?: 'wait' | 'error';
  [key: string]: unknown;
}

/** An X long-form Article read by `scrapeArticle`. */
export interface HttpArticle {
  /** Id of the tweet that carries the article */
  id: string;
  /** The article's own id (`article_results.result.rest_id`) */
  articleId: string | null;
  url: string;
  title: string | null;
  /** The whole article as plain text */
  text: string;
  /** The short teaser shown in the timeline */
  previewText: string | null;
  summaryText: string | null;
  coverImageUrl: string | null;
  createdAt: string | null;
  author: { id: string | null; username: string; name: string; avatar: string | null; verified: boolean };
  metrics: { likes: number; retweets: number; replies: number; quotes: number; bookmarks: number; views: number };
}

/**
 * Scraper returned by `createHttpScraper`: every HTTP scraper function with
 * the client argument already bound.
 */
export interface HttpScraper {
  client: unknown;
  scrapeProfile(username: string): Promise<Record<string, unknown>>;
  scrapeProfileById(userId: string): Promise<Record<string, unknown>>;
  parseUserData(raw: Record<string, unknown>): Record<string, unknown>;
  scrapeFollowers(username: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  scrapeFollowing(username: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  scrapeNonFollowers(username: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  scrapeLikers(tweetId: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  scrapeRetweeters(tweetId: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  scrapeListMembers(listId: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  scrapeTweets(username: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  scrapeTweetsAndReplies(username: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  scrapeTweetById(tweetId: string): Promise<Record<string, unknown>>;
  /** Full body of an X long-form Article, from its post id or status URL */
  scrapeArticle(tweetIdOrUrl: string): Promise<HttpArticle>;
  parseTweetData(raw: Record<string, unknown>): Record<string, unknown>;
  parseTimelineInstructions(instructions: unknown[]): Record<string, unknown>[];
  scrapeThread(tweetId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  scrapeFullThread(tweetId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  scrapeConversation(tweetId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  reconstructThread(tweets: Record<string, unknown>[]): Record<string, unknown>[];
  parseConversationModule(module: Record<string, unknown>): Record<string, unknown>[];
  postTweet(text: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  postThread(tweets: string[], options?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  deleteTweet(tweetId: string): Promise<Record<string, unknown>>;
  replyToTweet(tweetId: string, text: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  quoteTweet(tweetId: string, text: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  schedulePost(text: string, scheduledAt: Date | number | string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  likeTweet(tweetId: string): Promise<Record<string, unknown>>;
  unlikeTweet(tweetId: string): Promise<Record<string, unknown>>;
  retweet(tweetId: string): Promise<Record<string, unknown>>;
  unretweet(tweetId: string): Promise<Record<string, unknown>>;
  followUser(userId: string): Promise<Record<string, unknown>>;
  unfollowUser(userId: string): Promise<Record<string, unknown>>;
  followByUsername(username: string): Promise<Record<string, unknown>>;
  blockUser(userId: string): Promise<Record<string, unknown>>;
  unblockUser(userId: string): Promise<Record<string, unknown>>;
  muteUser(userId: string): Promise<Record<string, unknown>>;
  unmuteUser(userId: string): Promise<Record<string, unknown>>;
  bookmarkTweet(tweetId: string): Promise<Record<string, unknown>>;
  unbookmarkTweet(tweetId: string): Promise<Record<string, unknown>>;
  pinTweet(tweetId: string): Promise<Record<string, unknown>>;
  unpinTweet(tweetId: string): Promise<Record<string, unknown>>;
  bulkUnfollow(userIds: string[], options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  bulkLike(tweetIds: string[], options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  bulkBlock(userIds: string[], options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  uploadMedia(input: string | Buffer, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  uploadImage(input: string | Buffer, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  uploadVideo(input: string | Buffer, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  uploadGif(input: string | Buffer, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  setAltText(mediaId: string, altText: string): Promise<Record<string, unknown>>;
  scrapeMedia(username: string, options?: ScrapeOptions): Promise<Record<string, unknown>[]>;
  downloadMedia(url: string, options?: Record<string, unknown>): Promise<Buffer | string>;
  getVideoUrl(tweetId: string): Promise<string | null>;
}

/** Create an HTTP scraper (no browser) with every method bound to one client */
export function createHttpScraper(options?: HttpScraperOptions): Promise<HttpScraper>;

// ── Scrapers Module ─────────────────────────────────────────────────────────

export declare const scrapers: {
  createBrowser: typeof createBrowser;
  createPage: typeof createPage;
  loginWithCookie: typeof loginWithCookie;
  scrapeProfile: typeof scrapeProfile;
  scrapeFollowers: typeof scrapeFollowers;
  scrapeFollowing: typeof scrapeFollowing;
  scrapeTweets: typeof scrapeTweets;
  searchTweets: typeof searchTweets;
  scrapeThread: typeof scrapeThread;
  scrapeLikes: typeof scrapeLikes;
  scrapeHashtag: typeof scrapeHashtag;
  scrapeMedia: typeof scrapeMedia;
  scrapeListMembers: typeof scrapeListMembers;
  scrapeBookmarks: typeof scrapeBookmarks;
  scrapeNotifications: typeof scrapeNotifications;
  scrapeTrending: typeof scrapeTrending;
  scrapeCommunityMembers: typeof scrapeCommunityMembers;
  scrapeSpaces: typeof scrapeSpaces;
  exportToJSON: typeof exportToJSON;
  exportToCSV: typeof exportToCSV;
  scrape: typeof scrape;
  platforms: typeof platforms;
  getPlatform: typeof getPlatform;
  twitter: PlatformModule;
  bluesky: PlatformModule;
  mastodon: PlatformModule;
  threads: PlatformModule;
  getPluginScraper: typeof getPluginScraper;
  getAdapter: typeof getAdapter;
  getAvailableAdapter: typeof getAvailableAdapter;
  setDefaultAdapter: typeof setDefaultAdapter;
  getDefaultAdapterName: typeof getDefaultAdapterName;
  registerAdapter: typeof registerAdapter;
  listAdapters: typeof listAdapters;
  getAdapterInfo: typeof getAdapterInfo;
  checkAvailability: typeof checkAvailability;
  BaseAdapter: typeof BaseAdapter;
};

// ── Managers ────────────────────────────────────────────────────────────────

export declare const articlePublisher: unknown;
export declare const bookmarkManager: unknown;
export declare const businessTools: unknown;
export declare const creatorStudio: unknown;
export declare const discoveryExplore: unknown;
export declare const dmManager: unknown;
export declare const engagementManager: unknown;
export declare const grokIntegration: unknown;
export declare const notificationManager: unknown;
export declare const pollCreator: unknown;
export declare const postComposer: unknown;
export declare const premiumManager: unknown;
export declare const profileManager: unknown;
export declare const settingsManager: unknown;
export declare const spacesManager: unknown;

// ── Plugin System ───────────────────────────────────────────────────────────

export declare const plugins: unknown;
export function initializePlugins(): Promise<number>;
export function installPlugin(name: string): Promise<InstalledPlugin>;
export function removePlugin(name: string): Promise<boolean>;
export function listPlugins(): Promise<PluginInfo[]>;
export function getPluginTools(): unknown[];
/** Scrapers contributed by loaded plugins, each tagged with `_plugin`. */
export function getPluginScrapers(): Array<Record<string, unknown> & { _plugin: string }>;
export function getPluginRoutes(): unknown[];
/** Browser actions contributed by loaded plugins, each tagged with `_plugin`. */
export function getPluginActions(): Array<Record<string, unknown> & { _plugin: string }>;

// ── Browser Scripts Catalog ─────────────────────────────────────────────────

export declare const browserScripts: Record<string, {
  /** Path in the GitHub repository, e.g. `browser/unfollowback.js`. Not shipped in the npm package. */
  file: string;
  description: string;
}>;

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP Client (Track 01 — Programmatic Scraper)
// No Puppeteer required. Uses Twitter's internal GraphQL API via HTTP.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Search Mode ─────────────────────────────────────────────────────────────

export declare const SearchMode: {
  readonly Top: 'Top';
  readonly Latest: 'Latest';
  readonly Photos: 'Photos';
  readonly Videos: 'Videos';
};
export type SearchModeType = typeof SearchMode[keyof typeof SearchMode];

// ── Scraper Options ─────────────────────────────────────────────────────────

export interface ScraperOptions {
  /** Cookies string or array of {name, value} pairs */
  cookies?: string | CookieEntry[];
  /** Proxy URL (http, https, or socks5) */
  proxy?: string;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
  /** Request transform function applied before each request */
  transform?: (request: RequestInit) => RequestInit | void;
}

export interface CookieEntry {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  email?: string;
}

export interface SendTweetOptions {
  /** Media entity IDs to attach */
  mediaIds?: string[];
  /** Tweet ID to reply to */
  replyTo?: string;
}

// ── Trend ───────────────────────────────────────────────────────────────────

export interface Trend {
  name: string;
  tweetCount: string;
  url: string;
  context: string;
}

// ── Poll ────────────────────────────────────────────────────────────────────

export interface PollOption {
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  options: PollOption[];
  endDatetime: string | null;
  votingStatus: 'open' | 'closed';
  totalVotes: number;
}

// ── Client Tweet Model ──────────────────────────────────────────────────────

export interface ClientMediaItem {
  id: string;
  type: string;
  url: string;
  preview: string;
  width: number;
  height: number;
  duration: number | null;
  altText: string | null;
}

/**
 * Tweet data model returned by the HTTP client Scraper.
 * Created via `Tweet.fromGraphQL(raw)`.
 */
export declare class Tweet {
  id: string;
  text: string;
  fullText: string;
  username: string;
  userId: string;
  timeParsed: Date | null;
  timestamp: number | null;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  photos: Array<{ id: string; url: string; alt: string | null }>;
  videos: Array<{ id: string; url: string; preview: string; duration: number | null }>;
  thread: ClientTweet[];
  inReplyToStatusId: string | null;
  inReplyToStatus: ClientTweet | null;
  quotedStatusId: string | null;
  quotedStatus: ClientTweet | null;
  isRetweet: boolean;
  isReply: boolean;
  isQuote: boolean;
  retweetedStatus: ClientTweet | null;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  bookmarkCount: number;
  place: Record<string, unknown> | null;
  sensitiveContent: boolean;
  conversationId: string;
  poll: Poll | null;

  /**
   * Parse a tweet from a raw Twitter GraphQL "tweet_results.result" object.
   */
  static fromGraphQL(raw: Record<string, unknown>): Tweet | null;
}

/** @deprecated Use `Tweet`; kept for callers that imported the old alias */
export type ClientTweet = Tweet;

// ── Client Profile Model ───────────────────────────────────────────────────

export interface Birthdate {
  day: number | null;
  month: number | null;
  year: number | null;
  visibility: string;
}

/**
 * User profile returned by the HTTP client Scraper.
 * Created via `Profile.fromGraphQL(raw)`.
 */
export declare class Profile {
  id: string;
  username: string;
  name: string;
  bio: string;
  location: string;
  website: string;
  joined: Date | null;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  likesCount: number;
  listedCount: number;
  mediaCount: number;
  avatar: string;
  banner: string;
  verified: boolean;
  protected: boolean;
  birthdate: Birthdate | null;
  pinnedTweetIds: string[];
  isBlueVerified: boolean;
  isGovernment: boolean;
  isBusiness: boolean;
  affiliatesCount: number;
  canDm: boolean;
  platform: string;

  /** Full URL to profile on X */
  readonly profileUrl: string;

  /**
   * Parse a profile from a raw Twitter GraphQL "user_results.result" object.
   */
  static fromGraphQL(raw: Record<string, unknown>): Profile | null;

  /** JSON-serializable representation */
  toJSON(): Record<string, unknown>;
}

/** @deprecated Use `Profile`; kept for callers that imported the old alias */
export type ClientProfile = Profile;

// ── Client Message Model ───────────────────────────────────────────────────

/**
 * Direct message returned by the HTTP client Scraper.
 */
export declare class Message {
  id: string;
  text: string;
  senderId: string;
  recipientId: string;
  createdAt: Date | null;
  mediaUrls: string[];
  conversationId: string;

  /**
   * Parse a DM from a raw Twitter inbox API entry.
   */
  static fromRaw(raw: Record<string, unknown>, conversationId?: string): Message | null;

  /** JSON-serializable representation */
  toJSON(): Record<string, unknown>;
}

/** @deprecated Use `Message`; kept for callers that imported the old alias */
export type ClientMessage = Message;

/**
 * DM conversation object.
 */
export interface ClientConversation {
  id: string;
  type: 'ONE_TO_ONE' | 'GROUP_DM';
  participantIds: string[];
  lastMessage: Message | null;
  updatedAt: Date | null;
}

// ── Error Classes ───────────────────────────────────────────────────────────

/**
 * Base error for all XActions client errors.
 */
export declare class ScraperError extends Error {
  code: string;
  endpoint: string | null;
  httpStatus: number | null;
  rateLimitReset: number | null;
  timestamp: Date;
  constructor(message: string, code?: string, details?: Record<string, unknown>);
  toString(): string;
  toJSON(): Record<string, unknown>;
}

/**
 * Thrown when authentication fails or is required.
 */
export declare class AuthenticationError extends ScraperError {
  constructor(message: string, code?: string, details?: Record<string, unknown>);
}

/**
 * Thrown when Twitter rate limits are exceeded.
 */
export declare class RateLimitError extends ScraperError {
  retryAfter: number | null;
  limit: number | null;
  remaining: number;
  resetAt: Date | null;
  readonly retryAfterMs: number;
  constructor(message?: string, details?: Record<string, unknown>);
}

/**
 * Thrown when a requested resource does not exist.
 */
export declare class NotFoundError extends ScraperError {
  constructor(message: string, code?: string, details?: Record<string, unknown>);
}

/**
 * Wraps raw Twitter API errors with structured metadata.
 */
export declare class TwitterApiError extends ScraperError {
  twitterErrorCode: number | null;
  twitterMessage: string | null;
  constructor(message: string, details?: Record<string, unknown>);
  static fromTwitterError(error: Record<string, unknown>, details?: Record<string, unknown>): ScraperError;
  static fromResponse(body: Record<string, unknown>, details?: Record<string, unknown>): ScraperError;
}

// ── Scraper Class ───────────────────────────────────────────────────────────

/**
 * The main entry point for programmatic Twitter/X access via HTTP.
 * No Puppeteer or browser required.
 *
 * @example
 * ```js
 * import { Scraper, SearchMode } from 'xactions/client';
 *
 * const scraper = new Scraper();
 * await scraper.loadCookies('./cookies.json');
 * const profile = await scraper.getProfile('elonmusk');
 * for await (const tweet of scraper.getTweets('elonmusk', 20)) {
 *   console.log(tweet.text);
 * }
 * ```
 */
export declare class Scraper {
  constructor(options?: ScraperOptions);

  // ── Authentication ──────────────────────────────────────────────────

  /** Log in with credentials (placeholder — use cookie-based auth until Track 02) */
  login(credentials: LoginCredentials): Promise<void>;

  /** Log out and clear all auth state */
  logout(): Promise<void>;

  /** Check if the scraper is authenticated */
  isLoggedIn(): Promise<boolean>;

  /** Get current cookies */
  getCookies(): Promise<CookieEntry[]>;

  /** Set cookies for authentication */
  setCookies(cookies: CookieEntry[] | string): Promise<void>;

  /** Save current cookies to a JSON file */
  saveCookies(filePath: string): Promise<void>;

  /** Load cookies from a JSON file */
  loadCookies(filePath: string): Promise<void>;

  // ── Users ───────────────────────────────────────────────────────────

  /** Get a user's profile by screen name */
  getProfile(username: string): Promise<ClientProfile>;

  /** Get the authenticated user's profile */
  me(): Promise<ClientProfile>;

  /** Get a user's followers (requires userId, not username) */
  getFollowers(userId: string, count?: number): AsyncGenerator<ClientProfile, void, undefined>;

  /** Get accounts a user follows */
  getFollowing(userId: string, count?: number): AsyncGenerator<ClientProfile, void, undefined>;

  /** Follow a user by username */
  followUser(username: string): Promise<void>;

  /** Unfollow a user by username */
  unfollowUser(username: string): Promise<void>;

  // ── Tweets ──────────────────────────────────────────────────────────

  /** Get a single tweet by ID */
  getTweet(id: string): Promise<ClientTweet>;

  /** Get tweets from a user's timeline */
  getTweets(username: string, count?: number): AsyncGenerator<ClientTweet, void, undefined>;

  /** Get tweets and replies from a user's timeline */
  getTweetsAndReplies(username: string, count?: number): AsyncGenerator<ClientTweet, void, undefined>;

  /** Get a user's liked tweets */
  getLikedTweets(username: string, count?: number): AsyncGenerator<ClientTweet, void, undefined>;

  /** Get the latest tweet from a user */
  getLatestTweet(username: string): Promise<ClientTweet | null>;

  /** Post a new tweet */
  sendTweet(text: string, options?: SendTweetOptions): Promise<ClientTweet>;

  /** Post a quote tweet */
  sendQuoteTweet(text: string, quotedTweetId: string, mediaIds?: string[]): Promise<ClientTweet>;

  /** Delete a tweet */
  deleteTweet(id: string): Promise<void>;

  /** Like a tweet */
  likeTweet(id: string): Promise<void>;

  /** Unlike a tweet */
  unlikeTweet(id: string): Promise<void>;

  /** Retweet a tweet */
  retweet(id: string): Promise<void>;

  /** Remove a retweet */
  unretweet(id: string): Promise<void>;

  // ── Search ──────────────────────────────────────────────────────────

  /** Search tweets with query and optional mode */
  searchTweets(query: string, count?: number, mode?: SearchModeType): AsyncGenerator<ClientTweet, void, undefined>;

  /** Search user profiles */
  searchProfiles(query: string, count?: number): AsyncGenerator<ClientProfile, void, undefined>;

  // ── Trends ──────────────────────────────────────────────────────────

  /** Get current trending topics */
  getTrends(): Promise<Trend[]>;

  // ── Lists ───────────────────────────────────────────────────────────

  /** Get tweets from a Twitter List */
  getListTweets(listId: string, count?: number): AsyncGenerator<ClientTweet, void, undefined>;

  // ── Direct Messages ─────────────────────────────────────────────────

  /** Send a direct message to a user by their numeric ID */
  sendDm(userId: string, text: string): Promise<void>;
}

// ── GraphQL Constants ───────────────────────────────────────────────────────

export declare const BEARER_TOKEN: string;
export declare const DEFAULT_FEATURES: Record<string, boolean>;
export declare const GRAPHQL_ENDPOINTS: Record<string, { queryId: string; operationName: string }>;
export declare function buildGraphQLUrl(
  endpoint: { queryId: string; operationName: string },
  variables: Record<string, unknown>,
  features?: Record<string, boolean>,
  fieldToggles?: Record<string, boolean>,
): string;

// ── Cookie Import (painless login) ────────────────────────────────────────────

/** A cookie parsed from an export or read from a browser database. */
export interface ImportedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  /** ISO 8601 expiry, or null when the cookie is a session cookie. */
  expires: string | null;
}

/** Cookie export formats understood by parseCookieInput / detectCookieFormat. */
export type CookieFormat = 'json-array' | 'storage-state' | 'netscape' | 'header' | 'unknown';

/** Browsers readBrowserCookies can read cookies from. */
export type BrowserName = 'chrome' | 'chromium' | 'brave' | 'edge' | 'arc' | 'firefox';

export interface ParseCookieOptions {
  /** Force a format instead of auto-detecting. */
  format?: CookieFormat | 'auto';
}

/**
 * Parse cookie text in any supported format (Netscape cookies.txt, Cookie-Editor
 * / EditThisCookie JSON, Playwright / Puppeteer storageState, or a raw
 * "auth_token=...; ct0=..." header string) into X/Twitter cookies.
 *
 * @throws When the text is empty or contains no X/Twitter cookies.
 */
export function parseCookieInput(text: string, options?: ParseCookieOptions): ImportedCookie[];

/** Identify which cookie export format a blob of text is. */
export function detectCookieFormat(text: string): CookieFormat;

/**
 * Read x.com cookies straight out of a locally installed browser. Supports
 * Firefox everywhere, and Chromium-family browsers on Linux (default key) and
 * macOS (Keychain). Throws an actionable Error naming the --cookies-file export
 * path for unsupported combinations.
 *
 * @throws On an unknown browser name or an unsupported platform/browser combo.
 */
export function readBrowserCookies(browser: BrowserName): ImportedCookie[];

/** Browsers readBrowserCookies understands. */
export const SUPPORTED_BROWSERS: BrowserName[];


// ============================================================================
// AI: prompt-driven comment generator (src/ai/commentGenerator.js)
// ============================================================================

export type CommentProvider = 'openrouter' | 'openai' | 'xai' | 'anthropic' | 'ollama' | 'custom';

export interface CommentGeneratorConfig {
  /** How the replies should sound. Required. */
  prompt: string;
  /** Optional first line of the system prompt, e.g. "You are @you, a founder building X". */
  persona?: string;
  provider?: CommentProvider;
  apiKey?: string;
  /** Full chat-completions URL; required for provider "custom". */
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxLength?: number;
  allowHashtags?: boolean;
  allowEmoji?: boolean;
  fetchImpl?: typeof fetch;
}

export interface CommentTweetInput {
  text: string;
  author?: string;
  authorName?: string;
  quotedText?: string;
  hasMedia?: boolean;
}

export interface GeneratedComment {
  text: string;
  model: string;
  /** 1 when the first completion was usable, 2 when it was regenerated for being generic. */
  attempts: number;
}

export interface CommentGenerator {
  generate(tweet: CommentTweetInput): Promise<GeneratedComment>;
  /** Replies produced so far in this session, fed back to the model for variety. */
  history: string[];
  target: { provider: string; url: string; model: string };
}

export function createCommentGenerator(config: CommentGeneratorConfig): CommentGenerator;
export function sanitizeComment(raw: string, opts?: { allowHashtags?: boolean; maxLength?: number }): string;
export function isGenericComment(text: string): boolean;


// ============================================================================
// AI: post reputation / risk scorer (src/ai/reputationScorer.js)
// ============================================================================

export type RiskDimensionKey = 'professional' | 'hostile' | 'legal' | 'spam';
export type RiskVerdict = 'clean' | 'review' | 'flagged';

export interface RiskDimensionMeta {
  label: string;
  emoji: string;
  question: string;
}

/** The built-in risk dimensions, keyed by the name scorePost/scorePosts expect. */
export const DIMENSIONS: Record<RiskDimensionKey, RiskDimensionMeta>;

export interface ScorablePost {
  id?: string;
  text: string;
  author?: string;
  authorName?: string;
  quotedText?: string;
  hasMedia?: boolean;
  isReply?: boolean;
}

export interface ReputationScoreConfig {
  provider?: CommentProvider;
  apiKey?: string;
  /** Full chat-completions URL; required for provider "custom". */
  baseUrl?: string;
  model?: string;
  /** Subset of RiskDimensionKey to score. Default: all four. */
  dimensions?: RiskDimensionKey[];
  /** An extra risk question specific to this scan, scored alongside the built-ins. */
  customQuestion?: string;
  /** Retries on 429/5xx before chatCompletion gives up. Default: 2. */
  retries?: number;
  fetchImpl?: typeof fetch;
}

export interface ReputationScorePostsConfig extends ReputationScoreConfig {
  /** Parallel requests in flight, capped at 8. Default: 4. */
  concurrency?: number;
  onProgress?: (done: number, total: number, result: PostRiskResult) => void;
}

export interface PostRiskResult {
  postId: string | null;
  dimensions: Record<string, { score: number; reason: string }>;
  /** The highest score across every scored dimension. */
  overall: number;
  verdict: RiskVerdict;
  /** The dimension key that produced `overall`. */
  worstDimension: string;
  model?: string;
  /** Present instead of the fields above when this post's scoring call failed. */
  error?: string;
}

export interface ReputationReport {
  scanned: number;
  scoredOk: number;
  errors: number;
  /** 0..100, higher is better. */
  reputationScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  verdictCounts: { clean: number; review: number; flagged: number };
  /** Mean score per dimension across every successfully scored post. */
  dimensionAverages: Record<string, number>;
  /** Highest single-post score per dimension. Colour by this, not the average. */
  dimensionPeaks: Record<string, number>;
  worstPosts: Array<{ post: ScorablePost; score: PostRiskResult }>;
}

export function scorePost(post: ScorablePost, config?: ReputationScoreConfig): Promise<PostRiskResult>;
export function scorePosts(posts: ScorablePost[], config?: ReputationScorePostsConfig): Promise<PostRiskResult[]>;
export function scoreToGrade(reputationScore: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export function summarizeReport(posts: ScorablePost[], scores: PostRiskResult[], topN?: number): ReputationReport;


// ============================================================================
// Signed outbound webhooks (src/notifications/webhook.js)
// ============================================================================

export interface WebhookVerification {
  valid: boolean;
  /** Set when valid is false. */
  reason?: string;
  /** Value of X-XActions-Event. */
  event?: string;
  /** Value of X-XActions-Delivery. */
  deliveryId?: string;
  /** Value of X-XActions-Timestamp, unix seconds. */
  timestamp?: number;
}

export interface WebhookDeliveryAttempt {
  at: string;
  status: number | null;
  error?: string;
  durationMs: number;
}

export interface WebhookDeliveryRecord {
  id: string;
  url: string;
  event: string;
  /** Raw JSON body exactly as signed and sent. */
  body: string;
  createdAt: string;
  completedAt?: string;
  status: 'delivered' | 'failed';
  signed: boolean;
  attempts: WebhookDeliveryAttempt[];
  replayOf?: string;
}

export interface DeliverWebhookOptions {
  url: string;
  payload: object | string;
  event?: string;
  /** Falls back to XACTIONS_WEBHOOK_SECRET. */
  secret?: string;
  headers?: Record<string, string>;
  id?: string;
  attempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Verify a webhook received from XActions: constant-time HMAC-SHA256 check of
 * the raw body against X-XActions-Signature, then the X-XActions-Timestamp
 * freshness window (default 300 seconds; pass toleranceSeconds: 0 to skip).
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  headers: Headers | Record<string, string | string[] | undefined>,
  secret: string,
  options?: { toleranceSeconds?: number; now?: number },
): WebhookVerification;

/**
 * "sha256=<hex>" HMAC-SHA256 over `<timestamp>.<rawBody>`. The timestamp
 * (unix seconds, the value sent as X-XActions-Timestamp) is part of the signed
 * payload, so a captured delivery cannot be replayed with a fresh header.
 */
export function signWebhookBody(rawBody: string | Buffer, secret: string, timestamp: number | string): string;

/** Sign and POST a webhook with retries; resolves with the delivery record either way. */
export function deliverWebhook(options: DeliverWebhookOptions): Promise<WebhookDeliveryRecord>;

/** Re-send a logged delivery with a fresh timestamp and signature. */
export function replayWebhookDelivery(
  id: string,
  options?: Partial<Omit<DeliverWebhookOptions, 'payload' | 'event' | 'id'>>,
): Promise<WebhookDeliveryRecord>;

/** Deliveries from $XACTIONS_HOME/webhook-deliveries.json, newest first. */
export function listWebhookDeliveries(options?: { status?: 'delivered' | 'failed' | 'all'; limit?: number }): WebhookDeliveryRecord[];
