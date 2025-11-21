// src/utils/constants.ts
const DEV_BASE_URL = 'https://agri-ecommerce.test';
const PROD_BASE_URL = 'https://yourdomain.com';

export const BASE_URL = process.env.NODE_ENV === 'development' ? DEV_BASE_URL : PROD_BASE_URL;

export const API_BASE = `${BASE_URL}/wp-json/myshop/v1`;

export const API_ENDPOINTS = {
  publicConfig: '/config/public',
  products: '/products',
  login: '/auth/login',
  me: '/me',
  cart: '/cart',
  orders: '/orders',
  uploadPaymentProof: (orderId: number | string) => `/orders/${orderId}/upload-payment-proof`,
  giftCards: '/gift-cards/mine',
  redeemGiftCard: '/gift-cards/redeem',
  resetGiftCardPin: (cardId: number | string) => `/gift-cards/${cardId}/reset-pin`,
  referrals: '/referrals/my-downlines',
  commissions: '/commissions',
  agentsMe: '/agents/me',
  agentDownlines: '/agents/downlines',
  agentCommissions: '/agents/commissions'
} as const;