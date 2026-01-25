/**
 * x402 Mock Payment Helper
 * 
 * Utilities for creating valid-looking test payment objects
 * for x402 integration testing.
 * 
 * @author nichxbt
 */

/**
 * Create a mock x402 payment object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock payment object
 */
export function createMockPayment(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  
  return {
    x402Version: 2,
    scheme: 'exact',
    network: 'eip155:84532',
    payload: {
      signature: '0x' + 'a'.repeat(130),
      authorization: {
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        value: '1000',
        validAfter: '0',
        validBefore: (now + 3600).toString(),
        nonce: '0x' + 'b'.repeat(64)
      },
      networkName: 'base-sepolia',
      chainId: 84532,
    },
    ...overrides
  };
}

/**
 * Create a mock payment with specific network
 * @param {string} network - Network name ('base', 'base-sepolia', 'ethereum', 'arbitrum')
 * @returns {Object} Mock payment object
 */
export function createMockPaymentForNetwork(network) {
  const networks = {
    'base-sepolia': { networkId: 'eip155:84532', chainId: 84532 },
    'base': { networkId: 'eip155:8453', chainId: 8453 },
    'ethereum': { networkId: 'eip155:1', chainId: 1 },
    'arbitrum': { networkId: 'eip155:42161', chainId: 42161 },
  };
  
  const config = networks[network] || networks['base-sepolia'];
  
  return createMockPayment({
    network: config.networkId,
    payload: {
      ...createMockPayment().payload,
      networkName: network,
      chainId: config.chainId,
    }
  });
}

/**
 * Encode a payment object as base64 for the X-PAYMENT header
 * @param {Object} payment - Payment object
 * @returns {string} Base64-encoded payment
 */
export function encodePayment(payment) {
  return Buffer.from(JSON.stringify(payment)).toString('base64');
}

/**
 * Decode a base64 payment string
 * @param {string} encoded - Base64-encoded payment
 * @returns {Object} Decoded payment object
 */
export function decodePayment(encoded) {
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
}

/**
 * Create an invalid payment for testing error handling
 * @param {string} type - Type of invalid payment
 * @returns {Object} Invalid payment object
 */
export function createInvalidPayment(type) {
  switch (type) {
    case 'missing-version':
      return {
        scheme: 'exact',
        network: 'eip155:84532',
        payload: {}
      };
    
    case 'missing-payload':
      return {
        x402Version: 2,
        scheme: 'exact',
        network: 'eip155:84532'
      };
    
    case 'missing-signature':
      return {
        x402Version: 2,
        scheme: 'exact',
        network: 'eip155:84532',
        payload: {
          authorization: {}
        }
      };
    
    case 'wrong-version':
      return {
        x402Version: 99,
        scheme: 'exact',
        network: 'eip155:84532',
        payload: createMockPayment().payload
      };
    
    case 'expired':
      return createMockPayment({
        payload: {
          ...createMockPayment().payload,
          authorization: {
            ...createMockPayment().payload.authorization,
            validBefore: '0' // Already expired
          }
        }
      });
    
    default:
      return {};
  }
}

/**
 * Create mock payment requirements (as returned by 402 response)
 * @param {Object} options - Options
 * @returns {Object} Payment requirements
 */
export function createMockRequirements(options = {}) {
  return {
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: options.network || 'eip155:84532',
        maxAmountRequired: options.price || '$0.001',
        payTo: options.payTo || '0x' + '3'.repeat(40),
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        description: options.description || 'Test operation',
        mimeType: 'application/json',
        maxTimeoutSeconds: 300,
        extra: {
          networkName: 'Base Sepolia',
          gasCost: 'low',
          testnet: true,
          service: 'XActions AI API',
        }
      }
    ],
    resource: options.resource || 'https://api.xactions.app/api/ai/test'
  };
}

export default {
  createMockPayment,
  createMockPaymentForNetwork,
  encodePayment,
  decodePayment,
  createInvalidPayment,
  createMockRequirements
};
