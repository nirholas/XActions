/**
 * XActions Client — Trends API
 *
 * Fetch trending topics and explore tabs via Twitter's internal REST endpoint.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { GRAPHQL_ENDPOINTS, buildGraphQLUrl } from './graphqlQueries.js';

/**
 * Category to guide.json parameters mapping.
 * @private
 */
const CATEGORY_PARAMS = {
  trending: { include_page_configuration: true, initial_tab_id: 'trending' },
  for_you: { include_page_configuration: true, initial_tab_id: 'for_you' },
  news: { include_page_configuration: true, initial_tab_id: 'news' },
  sports: { include_page_configuration: true, initial_tab_id: 'sports' },
  entertainment: { include_page_configuration: true, initial_tab_id: 'entertainment' },
};

/**
 * Get trending topics.
 *
 * @param {Object} http - HTTP client with get/post methods
 * @param {string} [category='trending'] - Category: 'trending', 'for_you', 'news', 'sports', 'entertainment'
 * @returns {Promise<Array<{name: string, tweetCount: string, url: string, context: string}>>}
 */
export async function getTrends(http, category = 'trending') {
  const endpoint = GRAPHQL_ENDPOINTS.Trends;
  const baseUrl = buildGraphQLUrl(endpoint);

  const params = CATEGORY_PARAMS[category] || CATEGORY_PARAMS.trending;
  const url = `${baseUrl}?${new URLSearchParams(params).toString()}`;

  const data = await http.get(url);

  const trends = [];
  const timeline = data?.timeline;
  if (!timeline) return trends;

  for (const instruction of timeline.instructions || []) {
    const entries = instruction.addEntries?.entries || [];
    for (const entry of entries) {
      const items = entry?.content?.timelineModule?.items || [];
      for (const item of items) {
        const trend = item?.item?.content?.trend;
        if (trend) {
          trends.push({
            name: trend.name,
            tweetCount: trend.trendMetadata?.metaDescription || '',
            url: trend.url?.url || '',
            context: trend.trendMetadata?.domainContext || '',
          });
        }
      }
    }
  }

  return trends;
}

/**
 * Get available explore tabs.
 *
 * @param {Object} http - HTTP client with get/post methods
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
export async function getExploreTabs(http) {
  const endpoint = GRAPHQL_ENDPOINTS.Trends;
  const url = `${buildGraphQLUrl(endpoint)}?include_page_configuration=true`;

  const data = await http.get(url);

  const tabs = [];
  const header = data?.timeline?.instructions?.find(
    (i) => i.type === 'TimelineAddEntries' || i.addEntries,
  );

  const pageConfig = data?.header?.displayTreatment;
  if (pageConfig) {
    // Parse from page configuration if available
    return [{ id: 'trending', label: 'Trending' }];
  }

  // Try to extract tab configuration from the response
  const tabEntries = data?.explore_tabs || data?.tabs || [];
  for (const tab of tabEntries) {
    tabs.push({
      id: tab.id || tab.tab_id || '',
      label: tab.label || tab.name || '',
    });
  }

  // Fallback: return known default tabs
  if (tabs.length === 0) {
    return [
      { id: 'for_you', label: 'For You' },
      { id: 'trending', label: 'Trending' },
      { id: 'news', label: 'News' },
      { id: 'sports', label: 'Sports' },
      { id: 'entertainment', label: 'Entertainment' },
    ];
  }

  return tabs;
}
