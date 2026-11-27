/**
 * x402 Micropayment Configuration (Optional)
 *
 * Optional pay-per-request pricing for self-hosted remote AI API.
 * All local features (browser scripts, CLI, MCP server) are 100% free.
 * x402 is only relevant if you self-host the XActions API and want to
 * monetize remote AI agent access. Most users can ignore this file.
 *
 * @see https://x402.org for protocol documentation
 */
export declare const PAY_TO_ADDRESS: string;
export declare const PAY_TO_ADDRESS_SOLANA: string;
export declare const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export declare const SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export declare const FACILITATOR_URL: string;
export declare const NETWORK: string;
export declare const SOLANA_NETWORK: string;
export declare const SUPPORTED_NETWORKS: {
    'eip155:8453': {
        name: string;
        recommended: boolean;
        gasCost: string;
        usdc: string;
    };
    'eip155:42161': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:10': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:137': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:1': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:43114': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:56': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:42220': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:324': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:59144': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:534352': {
        name: string;
        gasCost: string;
        usdc: string;
    };
    'eip155:84532': {
        name: string;
        testnet: boolean;
        gasCost: string;
        usdc: string;
    };
    'eip155:11155111': {
        name: string;
        testnet: boolean;
        gasCost: string;
        usdc: string;
    };
    'eip155:421614': {
        name: string;
        testnet: boolean;
        gasCost: string;
        usdc: string;
    };
    "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
        name: string;
        recommended: boolean;
        gasCost: string;
        usdc: string;
    };
    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": {
        name: string;
        testnet: boolean;
        gasCost: string;
        usdc: string;
    };
};
export declare const SUPPORTED_TOKENS: {
    "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
        USDC: string;
        USDT: string;
    };
    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": {
        USDC: string;
    };
    'eip155:8453': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:42161': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:10': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:137': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:1': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:43114': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:56': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:42220': {
        USDC: string;
        USDT: string;
        DAI: string;
    };
    'eip155:324': {
        USDC: string;
        USDT: string;
        WETH: string;
    };
    'eip155:59144': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:534352': {
        USDC: string;
        USDT: string;
        DAI: string;
        WETH: string;
    };
    'eip155:84532': {
        USDC: string;
    };
    'eip155:11155111': {
        USDC: string;
    };
    'eip155:421614': {
        USDC: string;
    };
};
/**
 * Get list of accepted networks for payments
 * @param {boolean} includeTestnet - Whether to include testnet networks
 * @returns {Array} Array of network configurations with token addresses
 */
export declare function getAcceptedNetworks(includeTestnet?: boolean): any[];
/**
 * Get network configuration by network ID
 * @param {string} networkId - Network identifier (e.g., 'eip155:8453')
 * @returns {Object|null} Network configuration or null if not found
 */
export declare function getNetworkConfig(networkId: string): Object | null;
/**
 * Get all accepted tokens across all supported networks
 * @param {boolean} includeTestnet - Whether to include testnet networks
 * @returns {Array<{symbol: string, networks: Array}>} Accepted tokens
 */
export declare function getAcceptedTokens(includeTestnet?: boolean): Array<{
    symbol: string;
    networks: any[];
}>;
export declare const AI_OPERATION_PRICES: {
    'scrape:profile': string;
    'scrape:followers': string;
    'scrape:following': string;
    'scrape:tweets': string;
    'scrape:thread': string;
    'scrape:search': string;
    'scrape:hashtag': string;
    'scrape:media': string;
    'action:unfollow-non-followers': string;
    'action:unfollow-everyone': string;
    'action:detect-unfollowers': string;
    'action:auto-like': string;
    'action:follow-engagers': string;
    'action:keyword-follow': string;
    'monitor:account': string;
    'monitor:followers': string;
    'alert:new-followers': string;
    'download:video': string;
    'export:bookmarks': string;
    'unroll:thread': string;
    'profile:update': string;
    'posting:tweet': string;
    'posting:thread': string;
    'posting:poll': string;
    'posting:schedule': string;
    'posting:delete': string;
    'discovery:search': string;
    'discovery:explore': string;
    'messages:send': string;
    'messages:conversations': string;
    'messages:export': string;
    'bookmarks:clear': string;
    'creator:analytics': string;
    'creator:revenue': string;
    'creator:subscribers': string;
    'spaces:scrape': string;
    'settings:get': string;
    'settings:protected': string;
    'settings:blocked': string;
    'settings:muted': string;
    'grok:query': string;
    'grok:summarize': string;
    'premium:check': string;
    'writer:analyze-voice': string;
    'writer:generate': string;
    'writer:rewrite': string;
    'writer:calendar': string;
    'writer:reply': string;
    'writer:comment': string;
    'analytics:audience-overlap': string;
    'analytics:best-time': string;
    'analytics:competitor': string;
    'automation:auto-reply': string;
    'automation:auto-repost': string;
    'automation:plug-replies': string;
    'automation:engagement-booster': string;
    'automation:content-calendar': string;
    'automation:welcome-followers': string;
    'automation:continuous-monitor': string;
    'automation:keyword-monitor': string;
    'automation:customer-service': string;
    'automation:evergreen': string;
    'community:join': string;
    'community:leave-all': string;
    'community:create': string;
    'community:manage': string;
    'community:notes': string;
    'moderation:block-bots': string;
    'moderation:mass-block': string;
    'moderation:mass-unblock': string;
    'moderation:mass-unmute': string;
    'moderation:mute-keywords': string;
    'moderation:muted-words': string;
    'moderation:remove-followers': string;
    'moderation:report-spam': string;
    'moderation:shadowban-check': string;
    'moderation:verified-only': string;
    'account:backup': string;
    'account:audit-followers': string;
    'account:delegate-access': string;
    'account:verify-identity': string;
    'ads:dashboard': string;
    'ads:media-studio': string;
    'xpro:dashboard': string;
    'scrape:likes': string;
    'scrape:retweets': string;
    'discovery:trending-monitor': string;
    'discovery:save-search': string;
    'discovery:saved-searches': string;
    'discovery:topics': string;
    'settings:advanced': string;
    'settings:block-list': string;
    'creator:studio': string;
    'creator:subscriptions': string;
    'monitor:following': string;
    'posting:reply': string;
    'posting:bookmark': string;
    'posting:bookmarks': string;
    'posting:clear-bookmarks': string;
    'posting:article': string;
    'engagement:follow': string;
    'engagement:unfollow': string;
    'engagement:like': string;
    'engagement:retweet': string;
    'engagement:quote-tweet': string;
    'engagement:auto-follow': string;
    'engagement:smart-unfollow': string;
    'engagement:auto-retweet': string;
    'engagement:bulk-execute': string;
    'engagement:notifications': string;
    'engagement:mute': string;
    'engagement:unmute': string;
    'engagement:trends': string;
    'engagement:explore': string;
    'engagement:detect-bots': string;
    'engagement:find-influencers': string;
    'engagement:smart-target': string;
    'engagement:crypto-analyze': string;
    'engagement:audience-insights': string;
    'engagement:engagement-report': string;
    'action:follow': string;
    'action:unfollow': string;
    'action:like': string;
    'action:retweet': string;
    'action:quote-tweet': string;
    'action:post-tweet': string;
    'action:auto-follow': string;
    'action:smart-unfollow': string;
    'action:auto-retweet': string;
    'action:bulk-execute': string;
    'profile:check-premium': string;
    'profile:settings': string;
    'profile:toggle-protected': string;
    'profile:blocked': string;
    'grok:analyze-image': string;
    'lists:all': string;
    'lists:members': string;
    'spaces:list': string;
    'spaces:join': string;
    'spaces:leave': string;
    'spaces:status': string;
    'spaces:transcript': string;
    'analytics:account': string;
    'analytics:post': string;
    'analytics:creator': string;
    'analytics:brand-monitor': string;
    'analytics:history': string;
    'analytics:snapshot': string;
    'analytics:growth-rate': string;
    'analytics:compare-accounts': string;
    'analytics:analyze-voice': string;
    'analytics:generate-tweet': string;
    'analytics:rewrite-tweet': string;
    'analytics:summarize-thread': string;
    'sentiment:analyze': string;
    'sentiment:monitor': string;
    'sentiment:report': string;
    'reputation:score': string;
    'streams:start': string;
    'streams:stop': string;
    'streams:list': string;
    'streams:pause': string;
    'streams:resume': string;
    'streams:status': string;
    'streams:history': string;
    'workflows:create': string;
    'workflows:run': string;
    'workflows:list': string;
    'workflows:actions': string;
    'portability:export-account': string;
    'portability:migrate': string;
    'portability:diff': string;
    'portability:platforms': string;
    'portability:import': string;
    'portability:convert': string;
    'personas:create': string;
    'personas:list': string;
    'personas:status': string;
    'personas:edit': string;
    'personas:delete': string;
    'personas:run': string;
    'personas:presets': string;
    'graph:build': string;
    'graph:analyze': string;
    'graph:recommendations': string;
    'graph:list': string;
    'crm:sync': string;
    'crm:tag': string;
    'crm:search': string;
    'crm:segment': string;
    'schedule:add': string;
    'schedule:list': string;
    'schedule:remove': string;
    'schedule:rss-add': string;
    'schedule:rss-check': string;
    'schedule:rss-drafts': string;
    'schedule:evergreen': string;
    'optimizer:optimize': string;
    'optimizer:hashtags': string;
    'optimizer:predict': string;
    'optimizer:variations': string;
    'notify:send': string;
    'notify:test': string;
    'datasets:list': string;
    'datasets:get': string;
    'teams:create': string;
    'teams:members': string;
    'scrape:replies': string;
    'scrape:quote-tweets': string;
    'scrape:user-likes': string;
    'scrape:mentions': string;
    'scrape:recommendations': string;
    'monitor:keyword': string;
    'monitor:follower-alerts': string;
    'monitor:track-engagement': string;
    'monitor:compare': string;
    'action:auto-comment': string;
    'analyze:profile': string;
    'analyze:tweet': string;
    'account:connected-accounts': string;
    'account:join-date': string;
    'account:login-history': string;
    'account:multi-account': string;
    'account:qr-code': string;
    'ads:analytics': string;
    'ads:campaigns': string;
    'articles:analytics': string;
    'articles:compose': string;
    'articles:draft': string;
    'articles:list': string;
    'articles:publish': string;
    'automation:content-repurpose': string;
    'automation:quote-tweet-auto': string;
    'bookmarks:export': string;
    'bookmarks:folders': string;
    'bookmarks:import': string;
    'bookmarks:organize': string;
    'bookmarks:search': string;
    'cleanup:archive': string;
    'cleanup:bulk-delete': string;
    'cleanup:clear-history': string;
    'cleanup:clear-reposts': string;
    'cleanup:delete-tweets': string;
    'cleanup:unlike-all': string;
    'community:leave': string;
    'community:list': string;
    'community:members': string;
    'community:search': string;
    'discovery:for-you': string;
    'discovery:trending': string;
    'leads:enrich': string;
    'leads:export': string;
    'leads:find': string;
    'leads:monitor': string;
    'leads:qualify': string;
    'leads:score': string;
    'media:analytics': string;
    'media:captions': string;
    'media:download-batch': string;
    'media:library': string;
    'media:studio': string;
    'media:upload': string;
    'moderation:blocked-list': string;
    'moderation:muted-list': string;
    'alert:account': string;
    'alert:alert:new-followers': string;
    'alert:compare': string;
    'alert:follower-alerts': string;
    'alert:followers': string;
    'alert:following': string;
    'alert:keyword': string;
    'alert:track-engagement': string;
    'monitor:alert:new-followers': string;
    'monitor:new-followers': string;
    'premium:features': string;
    'settings:update': string;
    'timeline:collect': string;
    'timeline:export': string;
    'timeline:scroll': string;
    'timeline:switch-feed': string;
    'timeline:view': string;
    'topics:discover': string;
    'topics:follow': string;
    'topics:list': string;
    'topics:unfollow': string;
    'analyze:bookmarks': string;
    'analyze:thread': string;
    'analyze:video': string;
    'download:bookmarks': string;
    'download:profile': string;
    'download:thread': string;
    'download:tweet': string;
    'export:profile': string;
    'export:thread': string;
    'export:tweet': string;
    'export:video': string;
    'unroll:bookmarks': string;
    'unroll:profile': string;
    'unroll:tweet': string;
    'unroll:video': string;
    'viral:analyze': string;
    'viral:generate': string;
    'viral:headlines': string;
    'viral:research': string;
    'viral:trending-hooks': string;
    'xpro:columns': string;
};
/**
 * Endpoints that are deliberately free, and why.
 *
 * The rule this API follows: it charges for X data and X actions, and it does
 * not charge you to manage your relationship with the API itself. An endpoint
 * that is neither priced above nor listed here fails `npm run check:x402`,
 * which is what stops a new route from shipping without either decision being
 * made. A hundred of them had, before that check existed.
 *
 * @type {Record<string, string>} operation -> the reason it is free
 */
export declare const FREE_OPERATIONS: Record<string, string>;
export declare const SCRIPT_PRICES: {
    'src/accountMisc': string;
    'src/communityNotes': string;
    'src/delegateAccess': string;
    'src/dmCalls': string;
    'src/followAccount': string;
    'src/followList': string;
    'src/idVerification': string;
    'src/likePost': string;
    'src/postInteractions': string;
    'src/qrCodeSharing': string;
    'src/repostPost': string;
    'src/saveSearch': string;
    'src/savedSearchManager': string;
    'src/shareEmbed': string;
    'src/textFormatting': string;
    'src/timelineViewer': string;
    'src/uploadContacts': string;
    'src/verifiedOnly': string;
    'src/videoCaptions': string;
    'src/viewAnalytics': string;
    'src/accountHealthMonitor': string;
    'src/audienceDemographics': string;
    'src/audienceOverlap': string;
    'src/auditFollowers': string;
    'src/bestTimeToPost': string;
    'src/followerGrowthTracker': string;
    'src/followerTools': string;
    'src/hashtagAnalytics': string;
    'src/newFollowersAlert': string;
    'src/shadowbanChecker': string;
    'src/tweetABTester': string;
    'src/tweetPerformance': string;
    'src/tweetScheduleOptimizer': string;
    'src/viralTweetDetector': string;
    'src/advancedDM': string;
    'src/advancedGrok': string;
    'src/advancedLists': string;
    'src/advancedNotifications': string;
    'src/advancedPremium': string;
    'src/advancedProfile': string;
    'src/advancedSettings': string;
    'src/advancedSpaces': string;
    'src/bookmarkManager': string;
    'src/bookmarkOrganizer': string;
    'src/businessTools': string;
    'src/clearAllBookmarks': string;
    'src/contentCalendar': string;
    'src/contentRepurposer': string;
    'src/creatorStudio': string;
    'src/creatorSubscriptions': string;
    'src/discoveryExplore': string;
    'src/dmManager': string;
    'src/editPost': string;
    'src/encryptedDM': string;
    'src/engagementAnalytics': string;
    'src/engagementLeaderboard': string;
    'src/engagementManager': string;
    'src/grokIntegration': string;
    'src/groupDM': string;
    'src/hostSpace': string;
    'src/joinCommunities': string;
    'src/joinSpace': string;
    'src/keywordMonitor': string;
    'src/listManager': string;
    'src/manageCommunity': string;
    'src/manageMutedWords': string;
    'src/mentionUsers': string;
    'src/monitorAccount': string;
    'src/notificationManager': string;
    'src/pinTweetManager': string;
    'src/pollCreator': string;
    'src/postAdvanced': string;
    'src/postComposer': string;
    'src/postThread': string;
    'src/premiumGifting': string;
    'src/premiumManager': string;
    'src/profileManager': string;
    'src/schedulePosts': string;
    'src/scrapeSpaces': string;
    'src/sendDirectMessage': string;
    'src/sentimentAnalyzer': string;
    'src/settingsManager': string;
    'src/spacesManager': string;
    'src/subscribePremium': string;
    'src/threadComposer': string;
    'src/timelineScraper': string;
    'src/topicManager': string;
    'src/trendingTopicMonitor': string;
    'src/updateProfile': string;
    'src/welcomeNewFollowers': string;
    'src/xPro': string;
    'src/xProManager': string;
    'src/adCampaignManager': string;
    'src/adsManager': string;
    'src/advancedCreator': string;
    'src/algorithmBuilder': string;
    'src/articlePublisher': string;
    'src/autoPlugReplies': string;
    'src/autoReply': string;
    'src/autoRepost': string;
    'src/blockBots': string;
    'src/blockListManager': string;
    'src/competitorAnalysis': string;
    'src/continuousMonitor': string;
    'src/detectUnfollowers': string;
    'src/engagementBooster': string;
    'src/followRatioManager': string;
    'src/mediaStudio': string;
    'src/muteByKeywords': string;
    'src/personaEngine': string;
    'src/quoteTweetAutomation': string;
    'src/removeFollowers': string;
    'src/reportSpam': string;
    'src/unfollowWDFBLog': string;
    'src/videoDownloaderBrowser': string;
    'src/backupAccount': string;
    'src/bulkDeleteTweets': string;
    'src/clearAllReposts': string;
    'src/createCommunity': string;
    'src/createPoll': string;
    'src/downloadAccountData': string;
    'src/leaveAllCommunities': string;
    'src/massBlock': string;
    'src/massUnblock': string;
    'src/massUnmute': string;
    'src/unfollowEveryone': string;
    'src/unfollowback': string;
    'src/unlikeAllPosts': string;
    'automation/core': string;
    'automation/sessionLogger': string;
    'automation/linkScraper': string;
    'automation/protectActiveUsers': string;
    'automation/quotaSupervisor': string;
    'automation/autoCommenter': string;
    'automation/autoLiker': string;
    'automation/controlPanel': string;
    'automation/customerService': string;
    'automation/evergreenRecycler': string;
    'automation/followEngagers': string;
    'automation/followTargetUsers': string;
    'automation/keywordFollow': string;
    'automation/rssMonitor': string;
    'automation/smartUnfollow': string;
    'automation/actions': string;
    'automation/algorithmBuilder': string;
    'automation/algorithmTrainer': string;
    'automation/growthSuite': string;
    'automation/multiAccount': string;
};
/**
 * Price for POST /api/scripts/run
 * Running a script costs more than downloading it — it spins up a real
 * Puppeteer session and performs actions on the caller's X account.
 */
export declare const SCRIPT_RUN_PRICE = "$0.025";
export declare function getRouteConfig(payTo: any): {};
/**
 * Validate x402 configuration
 *
 * In production, this THROWS if payment address is not configured.
 * In development, it warns but allows testnet operation.
 *
 * @param {boolean} throwOnError - If true, throws ConfigurationError on critical issues
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export declare function validateConfig(throwOnError?: boolean): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Ensure config has been validated (call on first request)
 * Returns false if payment address is not configured (disables x402)
 */
export declare function ensureConfigValidated(): boolean;
/**
 * Check if x402 is properly configured
 */
export declare function isX402Configured(): boolean;
/** Whether a usable Base/EVM receiving address is configured. */
export declare function isEvmPayToConfigured(): boolean;
/**
 * Whether a usable Solana receiving address is configured.
 * A Solana address is a base58 ed25519 public key, 32 bytes, which renders as
 * 32 to 44 base58 characters.
 */
export declare function isSolanaPayToConfigured(): boolean;
/**
 * The receiving address for a network, or null when that chain is not enabled.
 * @param {string} network - CAIP-2 network id.
 * @returns {string|null}
 */
export declare function getPayTo(network: string): string | null;
/**
 * x402 v1 network names, keyed by CAIP-2 id.
 *
 * v1 identifies a chain by a short name (`base`, `solana`); CAIP-2 arrived with
 * v2. Clients and indexers built against v1 do not recognise `eip155:8453` and
 * reject the challenge as unparseable, so the v1 body is rendered with these
 * names while the v2 header keeps the CAIP-2 ids.
 * @type {Record<string, string>}
 */
export declare const V1_NETWORK_NAMES: Record<string, string>;
/**
 * The v1 spelling of a network id, falling back to the id itself for a chain
 * with no v1 name.
 * @param {string} network - CAIP-2 network id.
 * @returns {string}
 */
export declare function toV1Network(network: string): string;
/**
 * Whether two network identifiers name the same chain, in either spelling.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export declare function sameNetwork(a: string, b: string): boolean;
/**
 * Build the `accepts` array for a 402 challenge: one entry per chain that has a
 * receiving address, Solana first.
 *
 * Amounts are integer strings in the token's smallest unit. USDC is 6 decimals
 * on both Solana and Base, so a `$0.001` price is `1000`.
 *
 * @param {object} options
 * @param {string} options.price - Price as a dollar string, e.g. '$0.001'.
 * @param {string} options.resource - Absolute URL of the paid resource.
 * @param {string} options.description - Human-readable description.
 * @param {number} [options.maxTimeoutSeconds] - Settlement window.
 * @returns {object[]} Spec-shaped payment requirements.
 */
export declare function buildAccepts({ price, resource, description, maxTimeoutSeconds }: {
    price: string;
    resource: string;
    description: string;
    maxTimeoutSeconds?: number;
}): object[];
/**
 * The operation key for a request path, and the path for an operation key.
 *
 * Every gate used to derive this itself with `path.split('/')` taking the first
 * two segments, which silently could not express a three-segment route:
 * `/api/ai/monitor/alert/new-followers` resolved to the operation
 * `monitor:alert`, which has no price, so the endpoint was served free no matter
 * what the price table said. Deriving it in one place from the whole path is
 * what keeps the price table, the middleware, and the edge gates agreeing.
 *
 * @param {string} path - Absolute request path, e.g. /api/ai/scrape/profile
 * @returns {string|null} operation key, or null when the path is not an AI route
 */
export declare function operationForPath(path: string): string | null;
/**
 * Inverse of {@link operationForPath}.
 * @param {string} operation - e.g. "scrape:profile"
 * @returns {string} absolute path
 */
export declare function pathForOperation(operation: string): string;
export declare function getOperationName(operation: any): any;
