/**
 * XActions Streaming — barrel export
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

export {
  createStream,
  stopStream,
  stopAllStreams,
  pauseStream,
  resumeStream,
  updateStream,
  listStreams,
  getStreamHistory,
  getStreamStatus,
  getStreamStats,
  isHealthy,
  setIO,
  shutdown,
  STREAM_TYPES,
  getPoolStatus,
} from './streamManager.js';

export { pollTweets } from './tweetStream.js';
export { pollFollowers } from './followerStream.js';
export { pollMentions } from './mentionStream.js';

export {
  acquireBrowser,
  releaseBrowser,
  acquirePage,
  releasePage,
  closeAll as closeAllBrowsers,
  getPoolStatus as getBrowserPoolStatus,
  isHealthy as isBrowserPoolHealthy,
} from './browserPool.js';
