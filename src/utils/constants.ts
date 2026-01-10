// src/utils/constants.ts
const DEV_BASE_URL = 'https://agri-ecommerce.test';
const PROD_BASE_URL = 'https://yourdomain.com';

export const BASE_URL = process.env.NODE_ENV === 'development' ? DEV_BASE_URL : PROD_BASE_URL;

export const API_BASE = `${BASE_URL}/wp-json/myshop/v1`;

export const API_ENDPOINTS = {
  publicConfig: '/config/public',
  products: '/products',
  productsRedeem: '/products/redeem',
  login: '/auth/login',
  me: '/me',
  userAddresses: '/user/addresses',
  cart: '/cart',
  cartItem: (variationId: number | string) => `/cart/${variationId}`,
  orders: '/orders',
  uploadPaymentProof: (orderId: number | string) => `/orders/${orderId}/upload-payment-proof`,
  applyCouponToOrder: (orderId: number | string) => `/orders/${orderId}/apply-coupon`,
  applyGiftCardToOrder: (orderId: number | string) => `/orders/${orderId}/apply-gift-card`,
  validateCoupon: '/coupons/validate',
  giftCards: '/gift-cards',
  redeemGiftCard: '/gift-cards/redeem',
  shareGiftCard: '/gift-cards/share',
  shareStyles: '/gift-cards/share-styles',
  revokeGiftCardShare: (cardNumber: string) => `/gift-cards/share/${cardNumber}/revoke`,
  getShareDetail: (token: string) => `/gift-cards/share/${token}`,
  claimGiftCard: (token: string) => `/gift-cards/share/${token}/claim`,
  giftCardShareHistory: (cardNumber: string) => `/gift-cards/${cardNumber}/share-history`,
  referrals: '/referrals/my-downlines',
  commissions: '/commissions',
  agentsMe: '/agents/me',
  agentDownlines: '/agents/downlines',
  agentCommissions: '/agents/commissions',
  pointsBalance: '/points/balance',
  pointsLedger: '/points/ledger',
  pointsSettings: '/points/settings',
  pointsSpend: '/points/spend',
  pointsRules: '/points/rules',
  pointsMissions: '/points/missions',
  pointsClaimMission: (missionId: string) => `/points/missions/${missionId}/claim`,
  pointsRedeemOptions: '/points/redeem/options',
  pointsRedeem: '/points/redeem',
  // 缺失的接口
  invitationsSummary: '/invitations/summary',
  invitationsTrack: '/invitations/track',
  agentsApply: '/agents/apply',
  analyticsChannel: '/analytics/channel',
  promoPoster: '/promo/poster'
} as const;