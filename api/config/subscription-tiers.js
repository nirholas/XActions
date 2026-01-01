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
  starter: {
    credits: 50,
    price: 2.99,
    priceId: process.env.STRIPE_CREDITS_STARTER_PRICE_ID,
    popular: false,
    description: 'Quick start'
  },
  small: {
    credits: 100,
    price: 4.99,
    priceId: process.env.STRIPE_CREDITS_SMALL_PRICE_ID,
    popular: false,
    description: 'Light usage'
  },
  medium: {
    credits: 300,
    price: 12.99,
    priceId: process.env.STRIPE_CREDITS_MEDIUM_PRICE_ID,
    popular: true,
    description: 'Most popular'
  },
  large: {
    credits: 1000,
    price: 34.99,
    priceId: process.env.STRIPE_CREDITS_LARGE_PRICE_ID,
    popular: false,
    description: 'Power user'
  },
  unlimited: {
    credits: 5000,
    price: 149.99,
    priceId: process.env.STRIPE_CREDITS_UNLIMITED_PRICE_ID,
    popular: false,
    description: 'Agency/Team'
  }
};

// Crypto payment packages (non-KYC via Coinbase Commerce / BTCPay)
const CRYPTO_PACKAGES = {
  starter: {
    credits: 50,
    priceUSD: 2.99,
    priceBTC: 0.00003,
    priceETH: 0.001,
    priceUSDC: 2.99,
    priceSOL: 0.02
  },
  small: {
    credits: 100,
    priceUSD: 4.99,
    priceBTC: 0.00005,
    priceETH: 0.0017,
    priceUSDC: 4.99,
    priceSOL: 0.035
  },
  medium: {
    credits: 300,
    priceUSD: 12.99,
    priceBTC: 0.00013,
    priceETH: 0.0045,
    priceUSDC: 12.99,
    priceSOL: 0.09
  },
  large: {
    credits: 1000,
    priceUSD: 34.99,
    priceBTC: 0.00035,
    priceETH: 0.012,
    priceUSDC: 34.99,
    priceSOL: 0.24
  },
  unlimited: {
    credits: 5000,
    priceUSD: 149.99,
    priceBTC: 0.0015,
    priceETH: 0.05,
    priceUSDC: 149.99,
    priceSOL: 1.0
  }
};

module.exports = {
  SUBSCRIPTION_TIERS,
  CREDIT_COSTS,
  CREDIT_PACKAGES,
  CRYPTO_PACKAGES
};
