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

export interface Profile {
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

export interface Tweet {
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
  quotedTweet?: Tweet;
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
  tweets: Tweet[];
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
  tweet: Tweet;
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
  tweet: Tweet;
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
  topPositive: Tweet[];
  topNegative: Tweet[];
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
  scrapers?: Record<string, Function>;
  routes?: unknown[];
  actions?: Record<string, Function>;
}

// ── Core Functions ──────────────────────────────────────────────────────────

/** Launch a Puppeteer browser with stealth mode */
export function createBrowser(options?: BrowserOptions): Promise<Browser>;

/** Create a new stealth page in the browser */
export function createPage(browser: Browser): Promise<Page>;

/** Scrape a user's profile data */
export function scrapeProfile(page: Page, username: string): Promise<Profile>;

/** Scrape a user's followers */
export function scrapeFollowers(page: Page, username: string, options?: ScrapeOptions): Promise<User[]>;

/** Scrape a user's following list */
export function scrapeFollowing(page: Page, username: string, options?: ScrapeOptions): Promise<User[]>;

/** Scrape a user's tweets */
export function scrapeTweets(page: Page, username: string, options?: ScrapeOptions): Promise<Tweet[]>;

/** Search tweets by query */
export function searchTweets(page: Page, query: string, options?: ScrapeOptions): Promise<Tweet[]>;

/** Download video from a tweet */
export function downloadVideo(page: Page, tweetUrl: string): Promise<VideoResult>;

/** Export bookmarks */
export function exportBookmarks(page: Page, options?: ScrapeOptions): Promise<Bookmark[]>;

/** Unroll a thread into a single document */
export function unrollThread(page: Page, tweetUrl: string): Promise<Thread>;

// ── Scrapers Module ─────────────────────────────────────────────────────────

export declare const scrapers: {
  createBrowser: typeof createBrowser;
  createPage: typeof createPage;
  scrapeProfile: typeof scrapeProfile;
  scrapeFollowers: typeof scrapeFollowers;
  scrapeFollowing: typeof scrapeFollowing;
  scrapeTweets: typeof scrapeTweets;
  searchTweets: typeof searchTweets;
  downloadVideo: typeof downloadVideo;
  exportBookmarks: typeof exportBookmarks;
  unrollThread: typeof unrollThread;
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
export declare const postThread: unknown;
export declare const premiumManager: unknown;
export declare const profileManager: unknown;
export declare const schedulePosts: unknown;
export declare const settingsManager: unknown;
export declare const spacesManager: unknown;
export declare const tweetComposer: unknown;

// ── Plugin System ───────────────────────────────────────────────────────────

export declare const plugins: unknown;
export function initializePlugins(): Promise<void>;
export function installPlugin(name: string): Promise<Plugin>;
export function removePlugin(name: string): Promise<void>;
export function listPlugins(): Plugin[];
export function getPluginTools(): unknown[];
export function getPluginScrapers(): Record<string, Function>;
export function getPluginRoutes(): unknown[];
export function getPluginActions(): Record<string, Function>;

// ── Browser Scripts Catalog ─────────────────────────────────────────────────

export declare const browserScripts: Record<string, {
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
export declare class ClientTweet {
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
  static fromGraphQL(raw: Record<string, unknown>): ClientTweet | null;
}

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
export declare class ClientProfile {
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
  static fromGraphQL(raw: Record<string, unknown>): ClientProfile | null;

  /** JSON-serializable representation */
  toJSON(): Record<string, unknown>;
}

// ── Client Message Model ───────────────────────────────────────────────────

/**
 * Direct message returned by the HTTP client Scraper.
 */
export declare class ClientMessage {
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
  static fromDmEntry(raw: Record<string, unknown>): ClientMessage | null;

  /** JSON-serializable representation */
  toJSON(): Record<string, unknown>;
}

/**
 * DM conversation object.
 */
export declare class ClientConversation {
  id: string;
  type: 'ONE_TO_ONE' | 'GROUP_DM';
  participantIds: string[];
  lastMessage: ClientMessage | null;
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
