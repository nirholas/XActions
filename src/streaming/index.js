/**
 * XActions Streaming — barrel export
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

export {
  createStream,
  stopStream,
  listStreams,
  getStreamHistory,
  getStreamStatus,
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
} from './browserPool.js';
