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
