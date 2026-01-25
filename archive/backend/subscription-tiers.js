// Follow bonus: 1 credit = useless alone, needs more
const FOLLOW_BONUS_CREDITS = 1;

// Free tier: ONE demo run, that's it
const FREE_CREDITS = 2;  // Exactly 1 basic operation, then PAY

// ============================================
// REFERRAL SYSTEM - Payment required!
// ============================================
// Rewards are USELESS alone - just makes them feel progress
// They need 2+ credits for even 1 op, we give 1s
const REFERRAL_CONFIG = {
  referrerReward: {
    credits: 1,                     // Useless alone
    triggerOn: 'referee_first_payment',
    minPurchaseRequired: 2.99,
    maxRewardsPerMonth: 3,
    message: '🎉 +1 credit! Keep referring to unlock more!'
  },
  refereeBonus: {
    credits: 1,                     // Useless alone
    triggerOn: 'first_payment',
    minPurchaseRequired: 2.99,
    message: '🎁 +1 bonus credit with your purchase!'
  },
  milestones: {
    5:  { credits: 1, badge: '🌱 Starter' },
    15: { credits: 1, badge: '🌟 Rising' },
    30: { credits: 2, badge: '🔥 Influencer' },   // Finally 1 free op!
    50: { credits: 2, badge: '💎 Ambassador' },
  },
  leaderboard: {
    enabled: true,
    showTop: 10,
    resetPeriod: 'monthly',
    countOnly: 'paid_referrals',
  }
};

// ============================================
// CREDIT EXPIRATION - Use it or lose it!
// ============================================
const CREDIT_EXPIRY = {
  enabled: true,
  daysToExpire: 14,                 // 2 weeks - more urgency
  warningEmails: [7, 3, 1],
  warningBanner: true,
  message: '⚠️ {credits} credits expire in {days} days!'
};

// ============================================
// LOW CREDIT NOTIFICATIONS - Trigger purchases
// ============================================
const LOW_CREDIT_TRIGGERS = {
  thresholds: [3, 2, 1],
  showBanner: true,
  showPopup: true,
  messages: {
    3: "📉 Almost out of credits!",
    2: "⚠️ 1 operation left!",
    1: "🚨 Can't run operations - buy credits now!"
  }
};

// ============================================
// TWITTER VIRAL LOOP - They advertise, get nothing useful
// ============================================
const SHARE_REWARDS = {
  twitter: {
    credits: 1,                     // Useless alone
    template: "Just cleaned my X following with @XActionsApp 🧹 {count} unfollowed! Try it: xactions.app/r/{code}",
    requireVerification: true,
    cooldown: '7d',
    maxPerMonth: 2,                 // 2 credits/month max = nothing
  }
};

// ============================================
// DAILY LOGIN - Habit forming, NO real rewards
// ============================================
const DAILY_BONUS = {
  enabled: true,
  // 7-day streak = only 1 credit (USELESS alone)
  rewards: {
    day1: 0, day2: 0, day3: 0,
    day4: 0, day5: 0, day6: 0,
    day7: 1,                        // 1 credit for a WEEK of logins lol
  },
  streakBreakReset: true,
  maxCreditsPerMonth: 4,            // 1 month = 4 credits = 2 ops IF saved
};

// ============================================
// EXIT INTENT - Rescue bounces (discount, not credits)
// ============================================
const EXIT_INTENT = {
  enabled: true,
  offer: 'discount',
  discountPercent: 15,
  code: 'DONTGO15',
  message: "Wait! Here's 15% off your first purchase...",
  showOnce: true,
  expiresIn: '24h',
};

// ============================================
// FLASH SALES - FOMO (discount, not credits)
// ============================================
const FLASH_SALES = {
  enabled: true,
  frequency: 'weekly',
  duration: '3h',
  discountPercent: 20,
  banner: '⚡ FLASH SALE: 20% off - {time} left!'
};

// ============================================
// ACHIEVEMENTS - Badges only, ZERO credits
// ============================================
const ACHIEVEMENTS = {
  first_operation:   { badge: '🎯 First Blood', credits: 0 },
  ops_10:            { badge: '⚡ Active', credits: 0 },
  ops_50:            { badge: '💪 Power User', credits: 0 },
  ops_100:           { badge: '🔥 Dedicated', credits: 0 },
  ops_500:           { badge: '👑 Legend', credits: 0 },
  shareable: true,
  shareReward: 0,                   // Nothing for sharing
};

// ============================================
// UPSELLS - Increase order value
// ============================================
const UPSELLS = {
  atCheckout: {
    enabled: true,
    message: '⬆️ Double your credits for just 50% more!',
  },
  postPurchase: {
    enabled: true,
    delay: '5min',
    discountPercent: 10,
    message: "🎁 One-time offer: 10% off your next pack!",
    expiresIn: '1h',
  }
};

const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free Demo',
    price: 0,
    credits: FREE_CREDITS,          // 2 credits = 1 basic op ONLY
    features: {
      unfollowNonFollowers: true,   // Only basic unfollow
      unfollowEveryone: false,      // ❌ Locked
      detectUnfollowers: false,     // ❌ Locked
      newFollowerAlerts: false,     // ❌ Locked
      monitorAccount: false,        // ❌ Locked
      continuousMonitoring: false,  // ❌ Locked
      automation: false,            // ❌ Locked
      maxOperationsPerDay: 1,       // ONE demo op
      maxUnfollowsPerOperation: 10, // Only 10 unfollows to taste it
      support: 'none'               // No support for free
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

// Variable credit costs - mix of 2, 3, 5 makes it IMPOSSIBLE to use all credits
// Users always end up with 1-4 useless credits → must buy more
const CREDIT_COSTS = {
  // Basic ops: 2 credits (common, keeps them hooked)
  unfollowNonFollowers: 2,
  unfollowEveryone: 2,
  smartUnfollow: 2,
  
  // Detection ops: 3 credits (odd = always leftover)
  detectUnfollowers: 3,
  newFollowerAlerts: 3,
  monitorAccount: 3,
  
  // Power features: 5 credits (prime number = impossible to plan)
  continuousMonitoring: 5,
  autoLiker: 5,
  keywordFollow: 5,
  followTargetUsers: 5,
  followEngagers: 5
};

// Per-operation limits - users need MULTIPLE operations to finish
// Following 5000 people? That's 100 operations at 50/op = 200+ credits = $$$$
const OPERATION_LIMITS = {
  unfollowNonFollowers: 50,   // Max 50 unfollows per run
  unfollowEveryone: 50,       // Max 50 unfollows per run
  smartUnfollow: 50,          // Max 50 unfollows per run
  detectUnfollowers: 100,     // Scans 100 followers per run
  newFollowerAlerts: 100,     // Checks 100 followers per run
  monitorAccount: 100,        // Monitors 100 users per run
  autoLiker: 25,              // Likes 25 posts per run
  keywordFollow: 25,          // Follows 25 users per run
  followTargetUsers: 25,      // Follows 25 users per run
  followEngagers: 25,         // Follows 25 users per run
  continuousMonitoring: 50,   // Monitors 50 per cycle
};

// Credit packages - prime numbers guarantee leftovers
// No combination of purchases will ever divide evenly by 2, 3, or 5
const CREDIT_PACKAGES = {
  starter: {
    credits: 17,           // Prime! Can't divide evenly
    price: 2.99,
    priceId: process.env.STRIPE_CREDITS_STARTER_PRICE_ID,
    popular: false,
    savings: null,
    description: 'Try it out'
  },
  basic: {
    credits: 47,           // Prime! Best margin, steer traffic here
    price: 6.99,
    priceId: process.env.STRIPE_CREDITS_SMALL_PRICE_ID,
    popular: true,         // ← 60% of users buy "popular"
    savings: '20%',
    description: 'Most popular'
  },
  pro: {
    credits: 113,          // Prime!
    price: 14.99,
    priceId: process.env.STRIPE_CREDITS_MEDIUM_PRICE_ID,
    popular: false,
    savings: '35%',
    description: 'Best value'
  },
  power: {
    credits: 251,          // Prime!
    price: 29.99,
    priceId: process.env.STRIPE_CREDITS_LARGE_PRICE_ID,
    popular: false,
    savings: '50%',
    description: 'Power user'
  }
};

// Crypto payment packages - same prime numbers, rounded crypto prices
const CRYPTO_PACKAGES = {
  starter: {
    credits: 17,
    priceUSD: 2.99,
    priceBTC: 0.00003,
    priceETH: 0.001,
    priceUSDC: 3,        // Round up for crypto
    priceSOL: 0.015
  },
  basic: {
    credits: 47,
    priceUSD: 6.99,
    priceBTC: 0.00007,
    priceETH: 0.0025,
    priceUSDC: 7,
    priceSOL: 0.035
  },
  pro: {
    credits: 113,
    priceUSD: 14.99,
    priceBTC: 0.00015,
    priceETH: 0.005,
    priceUSDC: 15,
    priceSOL: 0.075
  },
  power: {
    credits: 251,
    priceUSD: 29.99,
    priceBTC: 0.0003,
    priceETH: 0.01,
    priceUSDC: 30,
    priceSOL: 0.15
  }
};

export {
  SUBSCRIPTION_TIERS,
  CREDIT_COSTS,
  OPERATION_LIMITS,
  CREDIT_PACKAGES,
  CRYPTO_PACKAGES,
  REFERRAL_CONFIG,
  CREDIT_EXPIRY,
  LOW_CREDIT_TRIGGERS,
  SHARE_REWARDS,
  DAILY_BONUS,
  EXIT_INTENT,
  FLASH_SALES,
  ACHIEVEMENTS,
  UPSELLS,
  FOLLOW_BONUS_CREDITS,
  FREE_CREDITS
};
