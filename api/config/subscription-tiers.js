const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    credits: 50,
    features: {
      unfollowNonFollowers: true,
      unfollowEveryone: true,
      detectUnfollowers: true,
      newFollowerAlerts: false,
      monitorAccount: false,
      continuousMonitoring: false,
      automation: false,
      maxOperationsPerDay: 3,
      maxUnfollowsPerOperation: 50,
      support: 'community'
    }
  },
  basic: {
    name: 'Basic',
    price: 9.99,
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    credits: -1, // unlimited
    features: {
      unfollowNonFollowers: true,
      unfollowEveryone: true,
      detectUnfollowers: true,
      newFollowerAlerts: true,
      monitorAccount: true,
      continuousMonitoring: false,
      automation: false,
      maxOperationsPerDay: 10,
      maxUnfollowsPerOperation: 500,
      support: 'email'
    }
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    credits: -1, // unlimited
    features: {
      unfollowNonFollowers: true,
      unfollowEveryone: true,
      detectUnfollowers: true,
      newFollowerAlerts: true,
      monitorAccount: true,
      continuousMonitoring: true,
      automation: true,
      maxOperationsPerDay: 50,
      maxUnfollowsPerOperation: 2000,
      support: 'priority',
      customScheduling: true,
      advancedFilters: true,
      analyticsExport: true
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    credits: -1, // unlimited
    features: {
      unfollowNonFollowers: true,
      unfollowEveryone: true,
      detectUnfollowers: true,
      newFollowerAlerts: true,
      monitorAccount: true,
      continuousMonitoring: true,
      automation: true,
      maxOperationsPerDay: -1, // unlimited
      maxUnfollowsPerOperation: -1, // unlimited
      support: 'dedicated',
      customScheduling: true,
      advancedFilters: true,
      analyticsExport: true,
      multiAccount: true,
      apiAccess: true,
      whiteLabel: true
    }
  }
};

const CREDIT_COSTS = {
  unfollowNonFollowers: 10,
  unfollowEveryone: 20,
  detectUnfollowers: 5,
  newFollowerAlerts: 5,
  monitorAccount: 10,
  continuousMonitoring: 15,
  autoLiker: 15,
  keywordFollow: 20,
  smartUnfollow: 15,
  followTargetUsers: 20,
  followEngagers: 20
};

const CREDIT_PACKAGES = {
  small: {
    credits: 100,
    price: 4.99,
    priceId: process.env.STRIPE_CREDITS_SMALL_PRICE_ID
  },
  medium: {
    credits: 300,
    price: 12.99,
    priceId: process.env.STRIPE_CREDITS_MEDIUM_PRICE_ID
  },
  large: {
    credits: 1000,
    price: 34.99,
    priceId: process.env.STRIPE_CREDITS_LARGE_PRICE_ID
  }
};

module.exports = {
  SUBSCRIPTION_TIERS,
  CREDIT_COSTS,
  CREDIT_PACKAGES
};
