/**
 * Payment Statistics Service
 * 
 * In-memory payment statistics tracking for x402 revenue analytics.
 * Note: Use Redis/DB in production for persistence across restarts.
 * 
 * @author nichxbt
 */

const stats = {
  totalPayments: 0,
  totalRevenue: 0, // in USD cents
  byOperation: {},
  byHour: {},
  recentPayments: [] // last 100
};

/**
 * Record a successful payment
 * @param {Object} payment - Payment details
 * @param {string} payment.operation - Operation name (e.g., 'scrape:profile')
 * @param {string} payment.price - Price string (e.g., '$0.05')
 * @param {string} [payment.paymentId] - Unique payment identifier
 * @param {string} [payment.network] - Blockchain network
 */
export function recordPayment(payment) {
  stats.totalPayments++;
  stats.totalRevenue += parseFloat(payment.price.replace('$', '')) * 100;
  
  // By operation
  const op = payment.operation;
  stats.byOperation[op] = (stats.byOperation[op] || 0) + 1;
  
  // By hour
  const hour = new Date().toISOString().slice(0, 13);
  stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
  
  // Recent payments (keep last 100)
  stats.recentPayments.unshift({
    ...payment,
    timestamp: new Date().toISOString()
  });
  if (stats.recentPayments.length > 100) {
    stats.recentPayments.pop();
  }
}

/**
 * Get current payment statistics
 * @returns {Object} Payment statistics including totals and breakdowns
 */
export function getStats() {
  return {
    ...stats,
    totalRevenueUSD: (stats.totalRevenue / 100).toFixed(2)
  };
}

/**
 * Reset statistics (useful for testing)
 */
export function resetStats() {
  stats.totalPayments = 0;
  stats.totalRevenue = 0;
  stats.byOperation = {};
  stats.byHour = {};
  stats.recentPayments = [];
}

export default { recordPayment, getStats, resetStats };
