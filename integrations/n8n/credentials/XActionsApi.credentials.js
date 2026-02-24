// XActions API credentials for n8n
// by nichxbt

/**
 * n8n credential type for connecting to XActions.
 * Supports two modes:
 *   1. Local — XActions runs on same machine, uses Puppeteer directly
 *   2. Remote — connects to an XActions API server via HTTP
 */
export class XActionsApi {
  name = 'xActionsApi';
  displayName = 'XActions API';
  documentationUrl = 'https://github.com/nirholas/XActions';

  properties = [
    {
      displayName: 'Mode',
      name: 'mode',
      type: 'options',
      options: [
        { name: 'Local (Puppeteer)', value: 'local' },
        { name: 'Remote API Server', value: 'remote' },
      ],
      default: 'local',
      description: 'Local mode runs scrapers directly via Puppeteer. Remote mode connects to an XActions API server.',
    },
    {
      displayName: 'API Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'http://localhost:3001',
      placeholder: 'http://localhost:3001',
      description: 'Base URL of the XActions API server',
      displayOptions: {
        show: { mode: ['remote'] },
      },
    },
    {
      displayName: 'API Token',
      name: 'apiToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'JWT token for authenticating with the XActions API',
      displayOptions: {
        show: { mode: ['remote'] },
      },
    },
    {
      displayName: 'X/Twitter Auth Cookie',
      name: 'authToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'auth_token cookie from x.com (required for authenticated scraping — followers, DMs, bookmarks, etc.)',
    },
    {
      displayName: 'Platform',
      name: 'defaultPlatform',
      type: 'options',
      options: [
        { name: 'Twitter/X', value: 'twitter' },
        { name: 'Bluesky', value: 'bluesky' },
        { name: 'Mastodon', value: 'mastodon' },
        { name: 'Threads', value: 'threads' },
      ],
      default: 'twitter',
      description: 'Default platform for scraping operations',
    },
    {
      displayName: 'Mastodon Instance URL',
      name: 'mastodonInstance',
      type: 'string',
      default: '',
      placeholder: 'https://mastodon.social',
      description: 'Mastodon instance URL (only needed for Mastodon)',
      displayOptions: {
        show: { defaultPlatform: ['mastodon'] },
      },
    },
  ];
}
