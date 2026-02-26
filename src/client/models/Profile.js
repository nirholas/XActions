/**
 * XActions Client — Profile Data Model
 *
 * Represents a Twitter user profile from the internal GraphQL API.
 * Use Profile.fromGraphQL(raw) to parse raw API responses.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Represents a Twitter user profile.
 */
export class Profile {
  constructor() {
    /** @type {string} */
    this.id = '';
    /** @type {string} */
    this.username = '';
    /** @type {string} */
    this.name = '';
    /** @type {string} */
    this.bio = '';
    /** @type {string} */
    this.location = '';
    /** @type {string} */
    this.website = '';
    /** @type {Date|null} */
    this.joined = null;
    /** @type {number} */
    this.followersCount = 0;
    /** @type {number} */
    this.followingCount = 0;
    /** @type {number} */
    this.tweetCount = 0;
    /** @type {number} */
    this.likesCount = 0;
    /** @type {number} */
    this.listedCount = 0;
    /** @type {number} */
    this.mediaCount = 0;
    /** @type {string} */
    this.avatar = '';
    /** @type {string} */
    this.banner = '';
    /** @type {boolean} */
    this.verified = false;
    /** @type {boolean} */
    this.protected = false;
    /** @type {Object|null} */
    this.birthdate = null;
    /** @type {string[]} */
    this.pinnedTweetIds = [];
    /** @type {boolean} */
    this.isBlueVerified = false;
    /** @type {boolean} */
    this.isGovernment = false;
    /** @type {boolean} */
    this.isBusiness = false;
    /** @type {number} */
    this.affiliatesCount = 0;
    /** @type {boolean} */
    this.canDm = false;
    /** @type {string} */
    this.platform = 'twitter';
  }

  /**
   * Create a Profile from a raw Twitter GraphQL "user_results.result" object.
   *
   * @param {Object} raw - Raw GraphQL user result
   * @returns {Profile|null} Parsed profile, or null if unparseable
   */
  static fromGraphQL(raw) {
    if (!raw) return null;

    // Handle UserUnavailable
    if (raw.__typename === 'UserUnavailable') return null;

    const legacy = raw.legacy;
    if (!legacy) return null;

    const profile = new Profile();

    // Core fields
    profile.id = raw.rest_id || legacy.id_str || '';
    profile.username = legacy.screen_name || '';
    profile.name = legacy.name || '';
    profile.bio = legacy.description || '';
    profile.location = legacy.location || '';

    // Website — expand t.co URL from entities
    const websiteEntity = legacy.entities?.url?.urls?.[0];
    profile.website = websiteEntity?.expanded_url || websiteEntity?.url || legacy.url || '';

    // Join date
    if (legacy.created_at) {
      profile.joined = new Date(legacy.created_at);
    }

    // Counts
    profile.followersCount = parseInt(legacy.followers_count, 10) || 0;
    profile.followingCount = parseInt(legacy.friends_count, 10) || 0;
    profile.tweetCount = parseInt(legacy.statuses_count, 10) || 0;
    profile.likesCount = parseInt(legacy.favourites_count, 10) || 0;
    profile.listedCount = parseInt(legacy.listed_count, 10) || 0;
    profile.mediaCount = parseInt(legacy.media_count, 10) || 0;

    // Images
    profile.avatar = (legacy.profile_image_url_https || '').replace('_normal', '_400x400');
    profile.banner = legacy.profile_banner_url || '';

    // Verification
    profile.verified = legacy.verified || false;
    profile.isBlueVerified = raw.is_blue_verified || false;
    profile.protected = legacy.protected || false;

    // Pinned tweets
    profile.pinnedTweetIds = (legacy.pinned_tweet_ids_str || []).slice();

    // Business/government affiliations
    const affiliateLabels = raw.affiliates_highlighted_label?.label || {};
    if (affiliateLabels.userLabelType === 'GovernmentLabel') {
      profile.isGovernment = true;
    } else if (affiliateLabels.userLabelType === 'BusinessLabel') {
      profile.isBusiness = true;
    }
    profile.affiliatesCount = parseInt(raw.business_account?.affiliates_count, 10) || 0;

    // DM ability
    profile.canDm = legacy.can_dm || false;

    // Birthdate
    if (legacy.birthdate) {
      profile.birthdate = {
        day: legacy.birthdate.day || null,
        month: legacy.birthdate.month || null,
        year: legacy.birthdate.year || null,
        visibility: legacy.birthdate.visibility || 'Self',
      };
    }

    return profile;
  }

  /**
   * Full URL to profile on X.
   * @returns {string}
   */
  get profileUrl() {
    return this.username ? `https://x.com/${this.username}` : '';
  }

  /**
   * JSON-serializable representation.
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      bio: this.bio,
      location: this.location,
      website: this.website,
      joined: this.joined?.toISOString() || null,
      followersCount: this.followersCount,
      followingCount: this.followingCount,
      tweetCount: this.tweetCount,
      likesCount: this.likesCount,
      listedCount: this.listedCount,
      mediaCount: this.mediaCount,
      avatar: this.avatar,
      banner: this.banner,
      verified: this.verified,
      isBlueVerified: this.isBlueVerified,
      protected: this.protected,
      pinnedTweetIds: this.pinnedTweetIds,
      isGovernment: this.isGovernment,
      isBusiness: this.isBusiness,
      canDm: this.canDm,
      platform: this.platform,
      profileUrl: this.profileUrl,
    };
  }
}
