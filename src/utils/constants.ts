// src/utils/constants.ts
// 说明：
// 1) 小程序端真实的多环境（develop/trial/release）由 src/service/api.ts 按 envVersion 运行时决定。
// 2) 本文件的 BASE_URL/API_BASE 只作为“兜底回退”（例如 H5 端、或拿不到 envVersion 的场景）。
// 3) 为避免开发态误打生产：development 兜底指向 staging，production 兜底指向生产。

const DEV_BASE_URL = 'https://staging.fanbaoer.com';
const PROD_BASE_URL = 'https://fanbaoer.com';

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
  promoPoster: '/promo/poster',
  paymentsCreate: '/payments/create',
  paymentsStatus: '/payments/status'
} as const;
