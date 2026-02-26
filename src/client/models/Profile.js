/**/**



















































































































































export default Profile;}  }    });      canDm: legacy.can_dm === true,      affiliatesCount: raw.affiliates_highlighted_label?.label?.badge?.url ? 1 : 0,      isBusiness,      isGovernment,      isBlueVerified: raw.is_blue_verified === true,      pinnedTweetIds,      birthdate,      protected: legacy.protected === true,      verified: legacy.verified === true,      banner: legacy.profile_banner_url || '',      avatar: (legacy.profile_image_url_https || '').replace('_normal', ''),      mediaCount: legacy.media_count || 0,      listedCount: legacy.listed_count || 0,      likesCount: legacy.favourites_count || 0,      tweetCount: legacy.statuses_count || 0,      followingCount: legacy.friends_count || 0,      followersCount: legacy.followers_count || 0,      joined,      website,      location: legacy.location || '',      bio: legacy.description || '',      name: legacy.name || '',      username: legacy.screen_name || '',      id: raw.rest_id || legacy.id_str || '',    return new Profile({      raw.business_account?.type === 'Business';    const isBusiness = verificationType.toLowerCase().includes('business') ||    const isGovernment = verificationType.toLowerCase().includes('government');    const verificationType = raw.verification_info?.reason?.description?.text || '';    // Verification type    const pinnedTweetIds = (legacy.pinned_tweet_ids_str || []).filter(Boolean);    // Pinned tweet IDs    }      };        year: legacy.birthdate.year || undefined,        day: legacy.birthdate.day || undefined,        month: legacy.birthdate.month || undefined,      birthdate = {    if (legacy.birthdate) {    let birthdate = null;    // Parse birthdate    }      joined = new Date(legacy.created_at);    if (legacy.created_at) {    let joined = null;    // Parse join date    }      website = urlEntity.expanded_url || urlEntity.display_url || urlEntity.url || '';    if (urlEntity) {    const urlEntity = entities.url?.urls?.[0];    let website = '';    // Extract website from URL entities    const entities = legacy.entities || {};    const legacy = raw.legacy || {};    }      return null;    if (raw.__typename === 'UserUnavailable') {    // Handle UserUnavailable    if (!raw) return null;  static fromGraphQL(raw) {   */   * @returns {Profile|null} Parsed profile, or null if unparseable   * @param {Object} raw - Raw GraphQL user result   *   * Parse a raw Twitter GraphQL "user_results.result" object into a Profile.  /**  }    this.platform = 'twitter';    /** @type {'twitter'} */    this.canDm = data.canDm || false;    /** @type {boolean} */    this.affiliatesCount = data.affiliatesCount || 0;    /** @type {number} */    this.isBusiness = data.isBusiness || false;    /** @type {boolean} */    this.isGovernment = data.isGovernment || false;    /** @type {boolean} */    this.isBlueVerified = data.isBlueVerified || false;    /** @type {boolean} */    this.pinnedTweetIds = data.pinnedTweetIds || [];    /** @type {string[]} */    this.birthdate = data.birthdate || null;    /** @type {{month: number, day: number, year?: number}|null} */    this.protected = data.protected || false;    /** @type {boolean} */    this.verified = data.verified || false;    /** @type {boolean} */    this.banner = data.banner || '';    /** @type {string} */    this.avatar = data.avatar || '';    /** @type {string} */    this.mediaCount = data.mediaCount || 0;    /** @type {number} */    this.listedCount = data.listedCount || 0;    /** @type {number} */    this.likesCount = data.likesCount || 0;    /** @type {number} */    this.tweetCount = data.tweetCount || 0;    /** @type {number} */    this.followingCount = data.followingCount || 0;    /** @type {number} */    this.followersCount = data.followersCount || 0;    /** @type {number} */    this.joined = data.joined || null;    /** @type {Date|null} */    this.website = data.website || '';    /** @type {string} */    this.location = data.location || '';    /** @type {string} */    this.bio = data.bio || '';    /** @type {string} */    this.name = data.name || '';    /** @type {string} */    this.username = data.username || '';    /** @type {string} */    this.id = data.id || '';    /** @type {string} */  constructor(data = {}) {   */   * @param {Object} [data] - Pre-mapped profile data  /**export class Profile { */ * Represents a Twitter user profile./** */ * @license MIT * @author nich (@nichxbt) * * Maps Twitter GraphQL "user_results.result" objects to a clean Profile class. * XActions Client — Profile Data Model * XActions Client — Profile Data Model
 * Maps Twitter GraphQL "user_results.result" objects to a clean Profile class.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Represents a Twitter user profile.
 */
export class Profile {
  /**
   * @param {Object} [data={}] - Pre-mapped profile data
   */
  constructor(data = {}) {
    /** @type {string} */
    this.id = data.id || '';
    /** @type {string} */
    this.username = data.username || '';
    /** @type {string} */
    this.name = data.name || '';
    /** @type {string} */
    this.bio = data.bio || '';
    /** @type {string} */
    this.location = data.location || '';
    /** @type {string} */
    this.website = data.website || '';
    /** @type {Date|null} */
    this.joined = data.joined || null;
    /** @type {number} */
    this.followersCount = data.followersCount || 0;
    /** @type {number} */
    this.followingCount = data.followingCount || 0;
    /** @type {number} */
    this.tweetCount = data.tweetCount || 0;
    /** @type {number} */
    this.likesCount = data.likesCount || 0;
    /** @type {number} */
    this.listedCount = data.listedCount || 0;
    /** @type {number} */
    this.mediaCount = data.mediaCount || 0;
    /** @type {string} */
    this.avatar = data.avatar || '';
    /** @type {string} */
    this.banner = data.banner || '';
    /** @type {boolean} */
    this.verified = data.verified || false;
    /** @type {boolean} */
    this.protected = data.protected || false;
    /** @type {Object|null} */
    this.birthdate = data.birthdate || null;
    /** @type {string[]} */
    this.pinnedTweetIds = data.pinnedTweetIds || [];
    /** @type {boolean} */
    this.isBlueVerified = data.isBlueVerified || false;
    /** @type {boolean} */
    this.isGovernment = data.isGovernment || false;
    /** @type {boolean} */
    this.isBusiness = data.isBusiness || false;
    /** @type {number} */
    this.affiliatesCount = data.affiliatesCount || 0;
    /** @type {boolean} */
    this.canDm = data.canDm || false;
    /** @type {string} */
    this.platform = data.platform || 'twitter';
  }

  /**
   * Parse a raw Twitter GraphQL user_results.result object into a Profile instance.
   *
   * @param {Object} raw - Raw GraphQL user result object
   * @returns {Profile|null} Parsed Profile or null if data is unusable
   */
  static fromGraphQL(raw) {
    if (!raw) return null;

    // Unwrap UserUnavailable
    if (raw.__typename === 'UserUnavailable') return null;

    const legacy = raw.legacy || {};

    // Parse join date
    let joined = null;
    if (legacy.created_at) {
      joined = new Date(legacy.created_at);
    }

    // Extract website from entities
    let website = '';
    const urlEntity = legacy.entities?.url?.urls?.[0];
    if (urlEntity) {
      website = urlEntity.expanded_url || urlEntity.url || '';
    }

    // Birthdate
    let birthdate = null;
    if (raw.legacy_extended_profile?.birthdate) {
      birthdate = raw.legacy_extended_profile.birthdate;
    }

    // Pinned tweets
    const pinnedTweetIds = (legacy.pinned_tweet_ids_str || []).map(String);

    // Verification status
    const affiliatesHighlightedLabel = raw.affiliates_highlighted_label?.label;
    const isGovernment = affiliatesHighlightedLabel?.badge?.url?.includes('gov') || false;
    const isBusiness = affiliatesHighlightedLabel?.badge?.url?.includes('business') || false;

    return new Profile({
      id: raw.rest_id || legacy.id_str || '',
      username: legacy.screen_name || '',
      name: legacy.name || '',
      bio: legacy.description || '',
      location: legacy.location || '',
      website,
      joined,
      followersCount: legacy.followers_count || 0,
      followingCount: legacy.friends_count || 0,
      tweetCount: legacy.statuses_count || 0,
      likesCount: legacy.favourites_count || 0,
      listedCount: legacy.listed_count || 0,
      mediaCount: legacy.media_count || 0,
      avatar: (legacy.profile_image_url_https || '').replace('_normal', '_400x400'),
      banner: legacy.profile_banner_url || '',
      verified: legacy.verified || false,
      protected: legacy.protected || false,
      birthdate,
      pinnedTweetIds,
      isBlueVerified: raw.is_blue_verified || false,
      isGovernment,
      isBusiness,
      affiliatesCount: raw.affiliates_count || 0,
      canDm: raw.can_dm || legacy.can_dm || false,
      platform: 'twitter',
    });
  }
}
