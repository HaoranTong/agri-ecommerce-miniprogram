// src/utils/constants.ts
// 说明：
// 1) 小程序端真实的多环境（develop/trial/release）由 src/service/api.ts 按 envVersion 运行时决定。
// 2) 本文件的 BASE_URL/API_BASE 只作为“兜底回退”（例如 H5 端、或拿不到 envVersion 的场景）。
// 3) 严格区分三套环境：development -> dev.fanbaoer.com（本地 Cloudflare Tunnel），production -> fanbaoer.com。

const DEV_BASE_URL = 'https://dev.fanbaoer.com';
const PROD_BASE_URL = 'https://fanbaoer.com';

export const BASE_URL = process.env.NODE_ENV === 'development' ? DEV_BASE_URL : PROD_BASE_URL;

export const API_BASE = `${BASE_URL}/wp-json/myshop/v1`;

export const API_ENDPOINTS = {
  publicConfig: '/config/public',
  products: '/products',
  productsRedeem: '/products/redeem',
  login: '/auth/login',
  bindPhone: '/auth/phone',
  me: '/me',
  userAddresses: '/user/addresses',
  cart: '/cart',
  cartItem: (variationId: number | string) => `/cart/${variationId}`,
  uploadUserAvatar: '/user/avatar',
  orders: '/orders',
  applyCouponToOrder: (orderId: number | string) => `/orders/${orderId}/apply-coupon`,
  applyGiftCardToOrder: (orderId: number | string) => `/orders/${orderId}/apply-gift-card`,
  validateCoupon: '/coupons/validate',
  giftCards: '/gift-cards',
  giftCardTemplates: '/gift-cards/templates',
  giftCardTemplateDetail: (templateId: number | string) => `/gift-cards/templates/${templateId}`,
  giftCardPurchase: '/gift-cards/purchase',
  redeemGiftCard: '/gift-cards/redeem',
  shareGiftCard: '/gift-cards/share',
  shareStyles: '/gift-cards/share-styles',
  clientLog: '/debug/client-log',
  revokeGiftCardShare: (cardNumber: string) => `/gift-cards/share/${cardNumber}/revoke`,
  getShareDetail: (token: string) => `/gift-cards/share/${token}`,
  claimGiftCard: (token: string) => `/gift-cards/share/${token}/claim`,
  giftCardShareHistory: (cardNumber: string) => `/gift-cards/${cardNumber}/share-history`,
  referrals: '/referrals/my-downlines',
  referralCode: '/referral/code',
  referralMembers: '/referral/members',
  referralSummary: '/referral/summary',
  referralQr: '/referral/qr',
  commissions: '/commissions',
  commissionsSummary: '/commissions/summary',
  commissionsPayout: '/commissions/payout',
  commissionsPayouts: '/commissions/payouts',
  agentsMe: '/agents/me',
  agentsProfile: '/agents/profile',
  agentsTeamStats: '/agents/team-stats',
  agentDownlines: '/agents/downlines',
  agentCommissions: '/agents/commissions',
  pointsBalance: '/points/balance',
  pointsSummary: '/points/summary',
  pointsLedger: '/points/ledger',
  pointsSettings: '/points/settings',
  pointsSpend: '/points/spend',
  pointsRules: '/points/rules',
  pointsMissions: '/points/missions',
  pointsClaimMission: (missionId: string) => `/points/missions/${missionId}/claim`,
  pointsRedeemOptions: '/points/redeem/options',
  pointsRedeem: '/points/redeem',
  pointsSignin: '/points/signin',
  pointsExchange: '/points/exchange',
  pointsExchangeRules: '/points/exchange/rules',
  invitationsSummary: '/invitations/summary',
  invitationsTrack: '/invitations/track',
  agentsApply: '/agents/apply',
  analyticsChannel: '/analytics/channel',
  promoPoster: '/promo/poster',
  paymentsCreate: '/payments/create',
  paymentsStatus: '/payments/status',
} as const;
