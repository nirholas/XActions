/**
 * XActions Client — Trends API
 * Fetch trending topics from Twitter's explore/guide endpoint.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Get current trending topics on Twitter.
 *
 * @param {Object} http - HttpClient instance
 * @param {string} [category='trending'] - Category: 'trending', 'for_you', 'news', 'sports', 'entertainment'
 * @returns {Promise<Array<{name: string, tweetCount: string, url: string, context: string}>>}
 */
export async function getTrends(http, category = 'trending') {
  const params = new URLSearchParams({
    include_page_configuration: 'false',
    initial_tab_id: category,
  });
  const url = `https://x.com/i/api/2/guide.json?${params.toString()}`;
  const data = await http.get(url);

  const trends = [];

  try {
    const instructions =
      data?.timeline?.instructions || [];

    for (const instruction of instructions) {
      const entries = instruction.addEntries?.entries || instruction.entries || [];
      for (const entry of entries) {
        const items = entry.content?.timelineModule?.items || [];
        for (const item of items) {
          const trend = item.item?.content?.trend;
          if (trend) {
            trends.push({
              name: trend.name || '',
              tweetCount: trend.trendMetadata?.metaDescription || '',
              url: trend.url?.url || `https://x.com/search?q=${encodeURIComponent(trend.name || '')}`,
              context: trend.trendMetadata?.domainContext || '',
            });
          }
        }

        // Also check for direct trend content in timeline entry
        const directTrend = entry.content?.trend;
        if (directTrend) {
          trends.push({
            name: directTrend.name || '',
            tweetCount: directTrend.trendMetadata?.metaDescription || '',
            url: directTrend.url?.url || `https://x.com/search?q=${encodeURIComponent(directTrend.name || '')}`,
            context: directTrend.trendMetadata?.domainContext || '',
          });
        }
      }
    }
  } catch {
    // Return whatever we have so far
  }

  return trends;
}

/**
 * Get available explore tabs.
 *
 * @param {Object} http - HttpClient instance
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
export async function getExploreTabs(http) {
  const url = 'https://x.com/i/api/2/guide.json?include_page_configuration=true';
  const data = await http.get(url);

  const tabs = [];
  try {
    const pageConfig = data?.timeline?.instructions?.find(
      (i) => i.type === 'TimelineShowCover' || i.coverConfiguration,
    );
    const tabItems =
      data?.page_configuration?.tabs || [];
    for (const tab of tabItems) {
      tabs.push({
        id: tab.tab_id || tab.id || '',
        label: tab.label || tab.name || '',
      });
    }
  } catch {
    // Return default tabs
  }

  if (tabs.length === 0) {
    return [
      { id: 'trending', label: 'Trending' },
      { id: 'for_you', label: 'For You' },
      { id: 'news', label: 'News' },
      { id: 'sports', label: 'Sports' },
      { id: 'entertainment', label: 'Entertainment' },
    ];
  }

  return tabs;
}
