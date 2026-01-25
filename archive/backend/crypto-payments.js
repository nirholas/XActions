import express from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { CRYPTO_PACKAGES, CREDIT_PACKAGES } from '../config/subscription-tiers.js';

const router = express.Router();
const prisma = new PrismaClient();

// Supported crypto payment providers
const PROVIDERS = {
  COINBASE: 'coinbase',
  BTCPAY: 'btcpay',
  NOWPAYMENTS: 'nowpayments'
};

// Generate a unique payment ID
function generatePaymentId() {
  return `xact_${crypto.randomBytes(16).toString('hex')}`;
}

// Get available crypto packages
router.get('/packages', (req, res) => {
  const packages = Object.entries(CRYPTO_PACKAGES).map(([key, pkg]) => ({
    id: key,
    credits: pkg.credits,
    priceUSD: pkg.priceUSD,
    prices: {
      BTC: pkg.priceBTC,
      ETH: pkg.priceETH,
      USDC: pkg.priceUSDC,
      SOL: pkg.priceSOL
    },
    popular: CREDIT_PACKAGES[key]?.popular || false,
    description: CREDIT_PACKAGES[key]?.description || ''
  }));

  res.json({ packages });
});

// Create a crypto payment invoice (Coinbase Commerce style)
router.post('/create-invoice', optionalAuthMiddleware, async (req, res) => {
  try {
    const { package: packageName, currency = 'USDC', email } = req.body;

    if (!CRYPTO_PACKAGES[packageName]) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    const pkg = CRYPTO_PACKAGES[packageName];
    const paymentId = generatePaymentId();

    // Get the price for selected currency
    const currencyMap = {
      BTC: pkg.priceBTC,
      ETH: pkg.priceETH,
      USDC: pkg.priceUSDC,
      SOL: pkg.priceSOL,
      USD: pkg.priceUSD
    };

    const amount = currencyMap[currency] || pkg.priceUSDC;

    // Create pending payment record
    const payment = await prisma.cryptoPayment.create({
      data: {
        paymentId,
        userId: req.user?.id || null,
        email: email || req.user?.email || null,
        package: packageName,
        credits: pkg.credits,
        amountUSD: pkg.priceUSD,
        currency,
        amount,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
      }
    });

    // In production, integrate with actual crypto payment provider
    // For Coinbase Commerce:
    if (process.env.COINBASE_COMMERCE_API_KEY) {
      const coinbaseResponse = await createCoinbaseCharge(payment);
      return res.json({
        paymentId,
        provider: PROVIDERS.COINBASE,
        checkoutUrl: coinbaseResponse.hosted_url,
        expiresAt: payment.expiresAt,
        amount,
        currency,
        credits: pkg.credits
      });
    }

    // For NOWPayments (non-KYC):
    if (process.env.NOWPAYMENTS_API_KEY) {
      const nowPaymentsResponse = await createNowPaymentsInvoice(payment);
      return res.json({
        paymentId,
        provider: PROVIDERS.NOWPAYMENTS,
        checkoutUrl: nowPaymentsResponse.invoice_url,
        expiresAt: payment.expiresAt,
        amount,
        currency,
        credits: pkg.credits
      });
    }

    // For BTCPay Server (self-hosted, non-KYC):
    if (process.env.BTCPAY_SERVER_URL) {
      const btcpayResponse = await createBTCPayInvoice(payment);
      return res.json({
        paymentId,
        provider: PROVIDERS.BTCPAY,
        checkoutUrl: btcpayResponse.checkoutLink,
        expiresAt: payment.expiresAt,
        amount,
        currency,
        credits: pkg.credits
      });
    }

    // Demo mode - return simulated payment details
    res.json({
      paymentId,
      provider: 'demo',
      walletAddresses: {
        BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f8B8c0',
        USDC: '0x742d35Cc6634C0532925a3b844Bc9e7595f8B8c0',
        SOL: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
      },
      amount,
      currency,
      credits: pkg.credits,
      expiresAt: payment.expiresAt,
      instructions: `Send exactly ${amount} ${currency} to the address above. Credits will be added automatically once confirmed.`
    });
  } catch (error) {
    console.error('Crypto invoice error:', error);
    res.status(500).json({ error: 'Failed to create payment invoice' });
  }
});

// Check payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.cryptoPayment.findUnique({
      where: { paymentId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      paymentId: payment.paymentId,
      status: payment.status,
      credits: payment.credits,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt,
      confirmedAt: payment.confirmedAt
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// Quick buy - creates guest user + payment in one step (no email verification needed)
router.post('/quick-buy', async (req, res) => {
  try {
    const { package: packageName, currency = 'USDC', email } = req.body;

    if (!CRYPTO_PACKAGES[packageName]) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email required for credit delivery' });
    }

    const pkg = CRYPTO_PACKAGES[packageName];
    const paymentId = generatePaymentId();

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    // Create guest user if doesn't exist (no password, no email verification)
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username: `user_${crypto.randomBytes(4).toString('hex')}`,
          password: null, // Guest user, no password
          credits: 0,
          isGuest: true,
          emailVerified: false,
          subscription: {
            create: {
              tier: 'free',
              status: 'active',
              startDate: new Date()
            }
          }
        },
        include: { subscription: true }
      });
    }

    const currencyMap = {
      BTC: pkg.priceBTC,
      ETH: pkg.priceETH,
      USDC: pkg.priceUSDC,
      SOL: pkg.priceSOL
    };

    const amount = currencyMap[currency] || pkg.priceUSDC;

    // Create pending payment
    const payment = await prisma.cryptoPayment.create({
      data: {
        paymentId,
        userId: user.id,
        email,
        package: packageName,
        credits: pkg.credits,
        amountUSD: pkg.priceUSD,
        currency,
        amount,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    // Return payment details with demo wallet addresses
    res.json({
      paymentId,
      userId: user.id,
      isNewUser: !user.password, // Guest user
      walletAddresses: {
        BTC: process.env.BTC_WALLET || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        ETH: process.env.ETH_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f8B8c0',
        USDC: process.env.USDC_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f8B8c0',
        SOL: process.env.SOL_WALLET || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
      },
      amount,
      currency,
      credits: pkg.credits,
      priceUSD: pkg.priceUSD,
      expiresAt: payment.expiresAt,
      message: `Send ${amount} ${currency} to start immediately. No sign-up required!`
    });
  } catch (error) {
    console.error('Quick buy error:', error);
    res.status(500).json({ error: 'Failed to process quick buy' });
  }
});

// Manually confirm payment (for admin/testing)
router.post('/confirm/:paymentId', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { txHash } = req.body;

    // Only admin can manually confirm
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const payment = await prisma.cryptoPayment.findUnique({
      where: { paymentId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Payment already confirmed' });
    }

    // Update payment status
    await prisma.cryptoPayment.update({
      where: { paymentId },
      data: {
        status: 'completed',
        txHash,
        confirmedAt: new Date()
      }
    });

    // Add credits to user
    if (payment.userId) {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          credits: { increment: payment.credits }
        }
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          userId: payment.userId,
          type: 'crypto_credits',
          amount: payment.amountUSD,
          currency: 'USD',
          cryptoCurrency: payment.currency,
          cryptoAmount: payment.amount,
          status: 'succeeded',
          metadata: {
            package: payment.package,
            credits: payment.credits,
            txHash,
            paymentId
          }
        }
      });
    }

    res.json({
      success: true,
      message: `Added ${payment.credits} credits`,
      paymentId
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Helper functions for payment providers

async function createCoinbaseCharge(payment) {
  const response = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': process.env.COINBASE_COMMERCE_API_KEY,
      'X-CC-Version': '2018-03-22'
    },
    body: JSON.stringify({
      name: `XActions Credits - ${payment.package}`,
      description: `${payment.credits} automation credits`,
      pricing_type: 'fixed_price',
      local_price: {
        amount: payment.amountUSD.toString(),
        currency: 'USD'
      },
      metadata: {
        paymentId: payment.paymentId,
        userId: payment.userId,
        credits: payment.credits
      },
      redirect_url: `${process.env.FRONTEND_URL}/dashboard?crypto_payment=${payment.paymentId}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`
    })
  });

  const data = await response.json();
  return data.data;
}

async function createNowPaymentsInvoice(payment) {
  const response = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.NOWPAYMENTS_API_KEY
    },
    body: JSON.stringify({
      price_amount: payment.amountUSD,
      price_currency: 'usd',
      order_id: payment.paymentId,
      order_description: `XActions ${payment.credits} Credits`,
      ipn_callback_url: `${process.env.API_URL}/webhooks/nowpayments`,
      success_url: `${process.env.FRONTEND_URL}/dashboard?crypto_payment=${payment.paymentId}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`
    })
  });

  return await response.json();
}

async function createBTCPayInvoice(payment) {
  const response = await fetch(`${process.env.BTCPAY_SERVER_URL}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${process.env.BTCPAY_API_KEY}`
    },
    body: JSON.stringify({
      amount: payment.amountUSD,
      currency: 'USD',
      metadata: {
        orderId: payment.paymentId,
        userId: payment.userId,
        credits: payment.credits
      },
      checkout: {
        redirectURL: `${process.env.FRONTEND_URL}/dashboard?crypto_payment=${payment.paymentId}`,
        redirectAutomatically: true
      }
    })
  });

  return await response.json();
}

export default router;
