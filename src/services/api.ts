import Taro from '@tarojs/taro';

import { API_BASE, API_ENDPOINTS } from '../utils/constants';
import {
  clearAttributionParams,
  clearToken,
  getAttributionParams,
  getStoredUserInfo,
  getToken,
  setStoredUserInfo,
  setToken,
  type StoredUserInfo
} from '../utils/storage';
import type {
  AgentDownline,
  AgentProfile,
  CartItem,
  ChannelAnalytics,
  CommissionPayoutRecord,
  CommissionRecord,
  CommissionSummary,
  CreateOrderPayload,
  GiftCard,
  GiftCardPurchaseResult,
  GiftCardRedeemResult,
  GiftCardShareDetail,
  GiftCardShareLogEntry,
  GiftCardShareResult,
  GiftCardShareStyle,
  GiftCardTemplate,
  InvitationSummary,
  LoginResponse,
  OrderCreated,
  OrderDetail,
  PaymentCreateResponse,
  PaymentStatusResponse,
  PointsBalance,
  PointsLedgerItem,
  PointsMission,
  PointsRedeemOption,
  PointsRedeemResult,
  PointsRule,
  Product,
  PromoPoster,
  PublicConfig,
  ReferralDownline,
  ShippingAddress,
  UserProfile
} from '../types';

interface PointsService {
  getBalance: () => Promise<PointsBalance>;
  getSummary: () => Promise<PointsBalance>;
  getLedger: (
    params?: {
      page?: number;
      per_page?: number;
      type?: string;
      status?: string;
      from?: string;
      to?: string;
    }
  ) => Promise<{
    items: PointsLedgerItem[];
    total: number;
  }>;
  spend: (points: number, reason: string) => Promise<{ new_balance: number; deducted: number }>;
  getRules: () => Promise<PointsRule[]>;
  getSettings: () => Promise<{
    enable_points_discount: boolean;
    redeem_rate: number;
    min_points_to_use: number;
    max_discount_percent: number;
    min_order_amount_to_use: number;
  }>;
  getMissions: () => Promise<PointsMission[]>;
  claimMission: (
    missionId: string
  ) => Promise<{ mission_id: string; awarded_points: number; new_balance: number; message?: string }>;
  getRedeemOptions: () => Promise<PointsRedeemOption[]>;
  redeem: (optionId: string) => Promise<PointsRedeemResult>;
  signin: () => Promise<{ success: boolean; data: { awarded_points: number; new_balance: number; message?: string } }>;
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  header?: Record<string, string>;
  showLoading?: boolean;
  suppressErrorToast?: boolean;
  suppressLog?: boolean;
  timeout?: number;
}


/**
 * =========================
 * 多环境 API Base 自动选择（关键修改点）
 * - develop（开发版/预览/真机调试）：走 dev.fanbaoer.com（Cloudflare Tunnel → 你本机）
 * - trial（体验版）：走 staging.fanbaoer.com（预发布站点）
 * - release（正式版）：走 fanbaoer.com（生产站点）
 *
 * 说明：
 * 1) 小程序运行时可通过 Taro.getAccountInfoSync().miniProgram.envVersion 获取版本标识
 * 2) 如果取不到（例如 H5/其他端），回退使用 constants 里的 API_BASE
 * =========================
 */
type MiniEnvVersion = 'develop' | 'trial' | 'release' | 'unknown';

const API_PREFIX = '/wp-json/myshop/v1';

const normalizeNoTrailingSlash = (s: string) => s.replace(/\/+$/, '');

const getMiniEnvVersion = (): MiniEnvVersion => {
  try {
    const info = (Taro.getAccountInfoSync && Taro.getAccountInfoSync()) as any;
    const env = info?.miniProgram?.envVersion;
    if (env === 'develop' || env === 'trial' || env === 'release') return env;
  } catch (e) {
    // ignore
  }
  return 'unknown';
};

const pickOriginByEnv = (env: MiniEnvVersion): string | null => {
  if (env === 'develop') return 'https://dev.fanbaoer.com';
  if (env === 'trial') return 'https://staging.fanbaoer.com';
  if (env === 'release') return 'https://fanbaoer.com';
  return null;
};

const safeExtractOrigin = (fullUrl: string): string => {
  try {
    return new URL(fullUrl).origin;
  } catch (e) {
    return '';
  }
};

const computeApiBase = (): {
  envVersion: MiniEnvVersion;
  origin: string;
  base: string;
} => {
  const envVersion = getMiniEnvVersion();
  const mappedOrigin = pickOriginByEnv(envVersion);

  // 优先使用小程序 envVersion 映射的域名
  if (mappedOrigin) {
    const origin = normalizeNoTrailingSlash(mappedOrigin);
    return {
      envVersion,
      origin,
      base: normalizeNoTrailingSlash(`${origin}${API_PREFIX}`)
    };
  }

  // 取不到 envVersion（比如 H5），回退使用 constants 里的 API_BASE
  const fallbackBase = normalizeNoTrailingSlash(API_BASE);
  return {
    envVersion,
    origin: safeExtractOrigin(fallbackBase),
    base: fallbackBase
  };
};

const { envVersion: MINI_ENV_VERSION, origin: API_ORIGIN, base: EFFECTIVE_API_BASE } = computeApiBase();

/**
 * 统一 URL 解析：
 * - 绝对 URL（http/https）直接用
 * - 以 /wp-json/ 开头：认为是“站点级绝对路径”，拼接到 origin
 * - 其他情况：认为是 “myshop/v1 内部相对路径”，拼接到 EFFECTIVE_API_BASE
 */
const resolveUrl = (endpoint: string) => {
  if (!endpoint) return EFFECTIVE_API_BASE;

  if (endpoint.startsWith('http')) return endpoint;

  // 兼容：如果有人传了完整的 /wp-json/...（绝对路径），直接拼 origin
  if (endpoint.startsWith('/wp-json/')) {
    if (API_ORIGIN) return `${API_ORIGIN}${endpoint}`;
    // origin 取不到就退回拼 base（虽然不理想，但保证不崩）
    return `${EFFECTIVE_API_BASE}${endpoint}`;
  }

  // 常规：拼到 /wp-json/myshop/v1
  if (endpoint.startsWith('/')) return `${EFFECTIVE_API_BASE}${endpoint}`;
  return `${EFFECTIVE_API_BASE}/${endpoint}`;
};

let isRedirecting = false; // 防止重复跳转
let loadingCount = 0;
const REQUEST_TIMEOUT = MINI_ENV_VERSION === 'develop' ? 30000 : 15000;
const MAX_CONCURRENT_REQUESTS = MINI_ENV_VERSION === 'develop' ? 4 : 6;
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

const acquireRequestSlot = async () => {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests += 1;
    return;
  }

  await new Promise<void>((resolve) => requestQueue.push(resolve));
  activeRequests += 1;
};

const releaseRequestSlot = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  const next = requestQueue.shift();
  if (next) {
    next();
  }
};

const handleUnauthorized = () => {
  if (isRedirecting) return; // 如果正在跳转，直接返回

  isRedirecting = true;
  clearToken();

  // 获取当前页面路径
  const pages = Taro.getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const currentPath = currentPage?.route || '';

  // 如果已经在登录页，不再跳转
  if (currentPath.includes('auth/login')) {
    isRedirecting = false;
    return;
  }

  // 保存当前页面信息，登录后返回（直接保存对象，不进行JSON.stringify）
  const redirectData = {
    path: currentPath,
    params: currentPage?.options || {}
  };
  console.log('[Auth] 保存返回路径:', redirectData);

  try {
    Taro.setStorageSync('REDIRECT_AFTER_LOGIN', redirectData);
  } catch (e) {
    console.error('[Auth] 保存返回路径失败:', e);
  }

  // 延迟跳转，确保当前请求完成
  setTimeout(() => {
    Taro.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 1500
    });

    setTimeout(() => {
      Taro.reLaunch({
        url: '/pages/auth/login'
      })
        .then(() => {
          isRedirecting = false;
        })
        .catch((err) => {
          console.error('[Auth] 跳转登录页失败:', err);
          isRedirecting = false;
        });
    }, 1500);
  }, 100);
};

const PUBLIC_ENDPOINTS = new Set<string>([
  API_ENDPOINTS.publicConfig,
  API_ENDPOINTS.products,
  API_ENDPOINTS.productsRedeem,
  API_ENDPOINTS.login,
  API_ENDPOINTS.shareStyles,
  API_ENDPOINTS.clientLog,
  '/gift-cards/templates'
]);

const normalizeEndpointPath = (endpoint: string) => {
  if (!endpoint) return '';
  const trimmed = endpoint.split('?')[0];

  if (trimmed.startsWith('http')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname || '';
    } catch (error) {
      return '';
    }
  }

  return trimmed;
};

const isPublicEndpoint = (endpoint: string) => {
  const rawPath = normalizeEndpointPath(endpoint);
  if (!rawPath) return false;

  const path = rawPath.startsWith('/wp-json/')
    ? rawPath.replace(/^\/wp-json\/myshop\/v1/, '')
    : rawPath;
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (PUBLIC_ENDPOINTS.has(normalized)) return true;
  if (/^\/gift-cards\/templates\/.+/.test(normalized)) return true;
  if (/^\/gift-cards\/share\/[^/]+$/.test(normalized)) return true;
  return false;
};

export const request = async <T = any>({
  url,
  method = 'GET',
  data,
  header,
  showLoading = false,
  suppressErrorToast = false,
  suppressLog = false,
  timeout
}: RequestOptions): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(header || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!token && !isPublicEndpoint(url)) {
    handleUnauthorized();
    throw new Error('unauthorized');
  }

  const finalUrl = resolveUrl(url);
  const startedAt = Date.now();

  // 无论生产/开发，第一次初始化时打印一次环境信息（方便你现场判断是否走对站点）
  // 注意：这里只做轻量输出，不影响性能
  if (!suppressLog && (url === API_ENDPOINTS.publicConfig || url === API_ENDPOINTS.login)) {
    console.log('[API Env]', {
      miniEnvVersion: MINI_ENV_VERSION,
      effectiveBase: EFFECTIVE_API_BASE,
      nodeEnv: process.env.NODE_ENV
    });
  }

  // 发布版本移除调试日志输出

  if (showLoading) {
    loadingCount += 1;
    Taro.showLoading({ title: '加载中...', mask: true });
  }

  const doRequest = async (attempt: number): Promise<T> => {
    try {
      const response = await Taro.request<T>({
        url: finalUrl,
        method,
        data,
        header: headers,
        timeout: typeof timeout === 'number' && timeout > 0 ? timeout : REQUEST_TIMEOUT
      });

    const duration = Date.now() - startedAt;
    if (!suppressLog && duration >= 3000) {
      console.warn('[API Slow]', {
        method,
        url: finalUrl,
        duration
      });
    }

    const { statusCode, data: payload } = response as Taro.request.SuccessCallbackResult<any>;

    if (statusCode === 401) {
      handleUnauthorized();
      throw new Error('unauthorized');
    }

    if (statusCode >= 400) {
      const message = payload?.message || '请求失败';
      if (!suppressErrorToast) {
        Taro.showToast({ title: message, icon: 'none' });
      }
      throw new Error(message);
    }

    if (payload && typeof payload === 'object' && 'error_code' in payload) {
      const message = payload.message || '请求失败';
      Taro.showToast({ title: message, icon: 'none' });
      throw new Error(payload.error_code);
    }

      return payload as T;
    } catch (error: any) {
      const errMsg = String(error?.errMsg || error?.message || '');
      const isTimeout = /timeout/i.test(errMsg) || /request:fail/i.test(errMsg) || error?.errno === 5;

      if (isTimeout && method === 'GET' && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        return doRequest(1);
      }

      if (isTimeout && !suppressErrorToast) {
        Taro.showToast({ title: '网络超时，请检查网络或切换稳定环境', icon: 'none' });
      }

      if (!(error instanceof Error && error.message === 'unauthorized') && !suppressLog) {
        console.error('API 请求失败', error);
      }
      throw error;
    }
  };

  await acquireRequestSlot();

  try {
    return await doRequest(0);
  } finally {
    releaseRequestSlot();
    if (showLoading && loadingCount > 0) {
      loadingCount -= 1;
      if (loadingCount === 0) {
        Taro.hideLoading();
      }
    }
  }
};

export const authService = {
  async login(
    code: string,
    wechatProfile?: {
      nickname?: string;
      avatar?: string;
    }
  ) {
    const attribution = getAttributionParams();
    const response = await request<{ success: boolean; data: LoginResponse }>({
      url: API_ENDPOINTS.login,
      method: 'POST',
      data: {
        code,
        ...(wechatProfile?.nickname ? { nickname: wechatProfile.nickname } : {}),
        ...(wechatProfile?.avatar ? { avatar: wechatProfile.avatar } : {}),
        ...(attribution?.channel ? { channel: attribution.channel } : {}),
        ...(attribution?.scene ? { scene: attribution.scene } : {}),
        ...(attribution?.referrer_code ? { referrer_code: attribution.referrer_code } : {}),
        ...(attribution?.landing_page ? { landing_page: attribution.landing_page } : {})
      }
    });

    // 后端返回格式：{ success: true, data: { token, user_id, openid } }
    const result = response.data;

    if (!result || !result.token) {
      console.error('登录响应格式错误:', response);
      throw new Error('登录失败：未返回 token');
    }

    // 同步保存 token
    setToken(result.token);

    const storedUser: StoredUserInfo = {
      user_id: result.user_id,
      phone: result.phone,
      wechat_nickname: result.wechat_nickname,
      wechat_avatar: result.wechat_avatar,
      invite_code: result.invite_code,
      has_phone: result.has_phone,
      has_realname: result.has_realname
    };
    setStoredUserInfo(storedUser);
    clearAttributionParams();

    return result;
  },
  async bindPhone(
    code: string,
    phoneCode?: string,
    encryptedPayload?: { encryptedData: string; iv: string }
  ) {
    const response = await request<{ success: boolean; data?: { phone?: string } }>({
      url: API_ENDPOINTS.bindPhone,
      method: 'POST',
      data: {
        code,
        ...(phoneCode ? { phone_code: phoneCode } : {}),
        ...(encryptedPayload?.encryptedData ? { encrypted_data: encryptedPayload.encryptedData } : {}),
        ...(encryptedPayload?.iv ? { iv: encryptedPayload.iv } : {})
      },
      showLoading: true
    });

    const phone = response?.data?.phone;
    if (phone) {
      const current = getStoredUserInfo() || ({} as StoredUserInfo);
      setStoredUserInfo({
        ...current,
        phone,
        has_phone: true
      });
    }

    return response?.data;
  }
};

export const configService = {
  getPublicConfig: () =>
    request<PublicConfig>({
      url: API_ENDPOINTS.publicConfig,
      method: 'GET'
    })
};

export const productService = {
  async getProducts(): Promise<Product[]> {
    const response = await request<{ products: Product[] }>({
      url: API_ENDPOINTS.products,
      method: 'GET'
    });
    return response.products;
  },
  async getRedeemableProducts(): Promise<Product[]> {
    try {
      const response = await request<{ success: boolean; data: Product[] }>({
        url: API_ENDPOINTS.productsRedeem,
        method: 'GET'
      });
      return response.data || [];
    } catch (error) {
      console.error('获取积分兑换商品列表失败', error);
      throw error;
    }
  }
};

export const cartService = {
  getCart: async (): Promise<CartItem[]> => {
    const response = await request<{
      success?: boolean;
      data?: CartItem[] | { items?: CartItem[] };
      items?: CartItem[];
    }>({
      url: API_ENDPOINTS.cart,
      method: 'GET'
    });

    if (Array.isArray(response)) {
      return response as CartItem[];
    }

    const data = (response as any)?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray((response as any)?.items)) return (response as any).items;
    return [];
  },
  addToCart: async (variationId: number, quantity: number) => {
    return request<{ success?: boolean; data?: any }>({
      url: API_ENDPOINTS.cart,
      method: 'POST',
      data: { variation_id: variationId, quantity }
    });
  },
  updateCart: async (variationId: number, quantity: number) => {
    return request<{ success?: boolean; data?: any }>({
      url: API_ENDPOINTS.cart,
      method: 'POST',
      data: { variation_id: variationId, quantity }
    });
  },
  removeFromCart: async (variationId: number) => {
    return request<{ success?: boolean; data?: any }>({
      url: API_ENDPOINTS.cartItem(variationId),
      method: 'DELETE'
    });
  },
  clearCart: async () => {
    return request<{ success?: boolean; data?: any }>({
      url: API_ENDPOINTS.cart,
      method: 'DELETE'
    });
  }
};

export const userService = {
  getProfile: async (options?: {
    showLoading?: boolean;
    timeout?: number;
    suppressErrorToast?: boolean;
    suppressLog?: boolean;
  }) => {
    const response = await request<{ success: boolean; data: UserProfile }>({
      url: API_ENDPOINTS.me,
      method: 'GET',
      showLoading: options?.showLoading ?? true,
      timeout: options?.timeout,
      suppressErrorToast: options?.suppressErrorToast,
      suppressLog: options?.suppressLog
    });
    const profile = response.data;
    const current = getStoredUserInfo() || ({} as StoredUserInfo);
    setStoredUserInfo({
      ...current,
      user_id: profile.user_id || current.user_id,
      phone: profile.phone || current.phone,
      wechat_nickname: profile.wechat_nickname || current.wechat_nickname,
      wechat_avatar: profile.wechat_avatar || current.wechat_avatar,
      invite_code: profile.invite_code || current.invite_code,
      has_phone: typeof profile.has_phone === 'boolean' ? profile.has_phone : Boolean(profile.phone || current.phone),
      has_realname: typeof profile.has_realname === 'boolean'
        ? profile.has_realname
        : Boolean(profile.first_name && profile.first_name.trim())
    });
    return profile;
  },
  uploadAvatar: async (filePath: string) => {
    const token = getToken();
    const uploadRes = await Taro.uploadFile({
      url: resolveUrl(API_ENDPOINTS.uploadUserAvatar),
      filePath,
      name: 'avatar',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 60000
    });

    let data: any = {};
    try {
      data = uploadRes.data ? JSON.parse(uploadRes.data) : {};
    } catch (error) {
      console.warn('解析头像上传响应失败', error);
    }

    if (uploadRes.statusCode >= 400 || data?.error_code) {
      const message = data?.message || '头像上传失败';
      Taro.showToast({ title: message, icon: 'none' });
      throw new Error(message);
    }

    return data?.data ?? data;
  },
  updateProfile: async (data: { 
    nickname?: string; 
    first_name?: string; 
    phone?: string;
    avatar?: string;
    gender?: number;
  }) => {
    const response = await request<{ success: boolean; data: UserProfile }>({
      url: '/user/profile',
      method: 'PUT',
      data,
      showLoading: true
    });
    const profile = response.data;
    const current = getStoredUserInfo() || ({} as StoredUserInfo);
    setStoredUserInfo({
      ...current,
      user_id: profile.user_id || current.user_id,
      phone: profile.phone || current.phone,
      wechat_nickname: profile.wechat_nickname || current.wechat_nickname,
      wechat_avatar: profile.wechat_avatar || current.wechat_avatar,
      invite_code: profile.invite_code || current.invite_code,
      has_phone: typeof profile.has_phone === 'boolean' ? profile.has_phone : Boolean(profile.phone || current.phone),
      has_realname: typeof profile.has_realname === 'boolean'
        ? profile.has_realname
        : Boolean(profile.first_name && profile.first_name.trim())
    });
    return response.data;
  },
  getAddresses: async () => {
    const response = await request<{
      success: boolean;
      data: {
        addresses: Array<{
          id: string;
          name: string;
          phone: string;
          province: string;
          city: string;
          district: string;
          detail_address: string;
          postcode: string;
          isDefault: boolean;
          created_at: string;
        }>;
        default_address: {
          id: string;
          name: string;
          phone: string;
          province: string;
          city: string;
          district: string;
          detail_address: string;
          postcode: string;
          isDefault: boolean;
          created_at: string;
        } | null;
      };
    }>({
      url: API_ENDPOINTS.userAddresses,
      method: 'GET'
    });
    return response.data;
  }
};

export const invitationService = {
  getSummary: async () => {
    const response = await request<{
      success: boolean;
      data: {
        invite_code?: string;
        total_invites?: number;
        first_order_count?: number;
        conversion_rate?: string;
        pending_invitations?: number;
        pending_rewards?: string;
        latest_invite?: {
          invitee_user_id: number;
          nickname: string;
          invited_at: string;
          first_order_status: string;
        } | null;
      };
    }>({
      url: API_ENDPOINTS.invitationsSummary,
      method: 'GET'
    });
    const data = response.data || {};
    return {
      invite_code: data.invite_code,
      total_invitations: data.total_invites ?? 0,
      first_order_count: data.first_order_count ?? 0,
      conversion_rate: data.conversion_rate ?? '0.00',
      pending_invitations: data.pending_invitations ?? 0,
      pending_rewards: data.pending_rewards,
      latest_invite: data.latest_invite ?? null
    } as InvitationSummary;
  },
  track: async (params: { channel?: string; scene?: string; referrer_code?: string }) => {
    const response = await request<{ success: boolean; data: { tracked: boolean; log_id?: number; recorded_at?: string } }>({
      url: API_ENDPOINTS.invitationsTrack,
      method: 'POST',
      data: params
    });
    return response.data;
  }
};

export const analyticsService = {
  getChannelAnalytics: async () => {
    const response = await request<{ success: boolean; data: { channels: ChannelAnalytics[] } }>({
      url: API_ENDPOINTS.analyticsChannel,
      method: 'GET'
    });
    return response.data?.channels ?? [];
  }
};

export const promoService = {
  getPoster: async (params: { type?: string; referrer_code?: string; template_id?: string }) => {
    const response = await request<{ success: boolean; data: PromoPoster }>({
      url: API_ENDPOINTS.promoPoster,
      method: 'GET',
      data: params
    });
    return response.data;
  }
};

export const agentApplicationService = {
  create: async (orderId: number | string, provider: 'wechat' | 'offline') => {
    const response = await request<PaymentCreateResponse>({
      url: API_ENDPOINTS.paymentsCreate,
      method: 'POST',
      data: {
        order_id: orderId,
        provider
      },
      timeout: 30000, // Increase timeout to 30 seconds
      showLoading: true
    });
    return response;
  },
};

export const debugService = {
  logClient: async (event: string, payload?: Record<string, any>) =>
    request<{ success: boolean }>(
      {
        url: API_ENDPOINTS.clientLog,
        method: 'POST',
        data: {
          event,
          payload: payload || null
        },
        showLoading: false,
        suppressErrorToast: true,
        suppressLog: true
      }
    )
};

export const orderService = {
  createOrder: (payload: CreateOrderPayload) =>
    request<OrderCreated>({
      url: API_ENDPOINTS.orders,
      method: 'POST',
      data: payload,
      showLoading: true
    }),
  listOrders: () =>
    request<OrderDetail[]>({
      url: API_ENDPOINTS.orders,
      method: 'GET',
      showLoading: true
    }),
  getOrderDetail: (orderId: number | string) =>
    request<OrderDetail>({
      url: `${API_ENDPOINTS.orders}/${orderId}`,
      method: 'GET',
      showLoading: true,
      timeout: 30000
    }),
  applyCoupon: async (orderId: number | string, couponCode: string) => {
    const response = await request<{
      success: boolean;
      data: {
        order_id: number;
        coupon_code: string;
        discount_amount: string;
        original_total: string;
        final_total: string;
        coupon_description?: string;
      };
    }>({
      url: API_ENDPOINTS.applyCouponToOrder(orderId),
      method: 'POST',
      data: { coupon_code: couponCode },
      showLoading: true
    });
    return response.data;
  },
  applyGiftCard: async (orderId: number | string, cardNumber: string) => {
    const response = await request<{
      success: boolean;
      data: {
        order_id: number;
        card_number: string;
        used_amount: string;
        remaining_balance: string;
        original_total: string;
        final_total: string;
      };
    }>({
      url: API_ENDPOINTS.applyGiftCardToOrder(orderId),
      method: 'POST',
      data: { card_number: cardNumber },
      showLoading: true
    });
    return response.data;
  },
  requestReturn: async (
    orderId: number | string,
    payload?: {
      reason?: string;
      contact?: string;
      images?: string[];
    }
  ) => {
    const response = await request<{
      success: boolean;
      data: { return_status: string; return_requested_at: string };
    }>({
      url: `/orders/${orderId}/return-request`,
      method: 'POST',
      data: {
        ...(payload?.reason ? { reason: payload.reason } : {}),
        ...(payload?.contact ? { contact: payload.contact } : {}),
        ...(payload?.images && payload.images.length ? { images: payload.images } : {})
      },
      showLoading: true
    });
    return response.data;
  },
  uploadReturnImage: async (orderId: number | string, filePath: string) => {
    const token = getToken();
    const uploadRes = await Taro.uploadFile({
      url: resolveUrl(`/orders/${orderId}/return-request/upload`),
      filePath,
      name: 'image',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 60000
    });

    let data: any = {};
    try {
      data = uploadRes.data ? JSON.parse(uploadRes.data) : {};
    } catch (error) {
      console.warn('解析退货图片上传响应失败', error);
    }

    if (uploadRes.statusCode >= 400 || data?.error_code) {
      const message = data?.message || '上传失败';
      Taro.showToast({ title: message, icon: 'none' });
      throw new Error(message);
    }

    return data?.data?.url ?? '';
  }
};

export const paymentService = {
  create: async (orderId: number | string, provider: 'wechat' | 'offline') => {
    const response = await request<PaymentCreateResponse>({
      url: API_ENDPOINTS.paymentsCreate,
      method: 'POST',
      data: {
        order_id: orderId,
        provider
      },
      showLoading: true
    });
    return response;
  },
  getStatus: async (orderId: number | string, provider?: 'wechat' | 'offline') => {
    const response = await request<PaymentStatusResponse>({
      url: API_ENDPOINTS.paymentsStatus,
      method: 'GET',
      data: { order_id: orderId, provider }
    });
    return response;
  }
};

let giftCardListCache: { ts: number; data: GiftCard[] } | null = null;
let giftCardListPromise: Promise<GiftCard[]> | null = null;
let giftCardListError: Error | null = null;

export const giftCardService = {
  listMine: async (
    options?: {
      showLoading?: boolean;
      suppressErrorToast?: boolean;
      suppressLog?: boolean;
      timeout?: number;
      cacheMs?: number;
      force?: boolean;
      fallbackToCache?: boolean;
    }
  ) => {
    // 1. 检查数据缓存（优先级最高）
    if (!options?.force && giftCardListCache) {
      const now = Date.now();
      const cacheMs = options?.cacheMs ?? 0;
      if (cacheMs > 0 && now - giftCardListCache.ts < cacheMs) {
        return giftCardListCache.data;
      }
    }

    // 2. 检查进行中的请求
    if (!options?.force && giftCardListPromise) {
      // 如果之前的请求失败了，明确抛出错误而不是返回失败的 Promise
      if (giftCardListError) {
        throw giftCardListError;
      }
      return giftCardListPromise;
    }

    // 3. 发起新请求
    giftCardListPromise = request<{ success?: boolean; data?: GiftCard[]; cards?: GiftCard[] }>({
      url: API_ENDPOINTS.giftCards,
      method: 'GET',
      showLoading: options?.showLoading ?? true,
      suppressErrorToast: options?.suppressErrorToast ?? false,
      suppressLog: options?.suppressLog ?? false,
      timeout: options?.timeout
    })
      .then((response) => {
        const data = response.data ?? response.cards ?? [];
        giftCardListCache = { ts: Date.now(), data };
        giftCardListError = null; // 清空错误状态
        return data;
      })
      .catch((error) => {
        giftCardListError = error; // 记录错误
        // 降级策略：如果允许回退到缓存且缓存存在，返回缓存数据
        if (options?.fallbackToCache && giftCardListCache) {
          return giftCardListCache.data;
        }
        throw error;
      })
      .finally(() => {
        giftCardListPromise = null; // 清空 Promise 引用
      });

    return giftCardListPromise;
  },
  listTemplates: async () => {
    const response = await request<{ success: boolean; data: GiftCardTemplate[] }>({
      url: API_ENDPOINTS.giftCardTemplates,
      method: 'GET',
      showLoading: true
    });
    return response.data ?? [];
  },
  getTemplateDetail: async (templateId: number) => {
    const response = await request<{ success: boolean; data: GiftCardTemplate }>({
      url: API_ENDPOINTS.giftCardTemplateDetail(templateId),
      method: 'GET',
      showLoading: true
    });
    return response.data;
  },
  purchase: async (
    template_id: number,
    options?: {
      amount?: number;
      delivery_mode?: string;
      remark?: string;
      order_id?: number;
      payload?: Record<string, any>;
    }
  ) => {
    const response = await request<{ success: boolean; data: GiftCardPurchaseResult }>({
      url: API_ENDPOINTS.giftCardPurchase,
      method: 'POST',
      data: {
        template_id,
        ...(options || {})
      },
      showLoading: true
    });
    return response.data;
  },
  redeem: async (card_number: string, options?: { shipping_address?: ShippingAddress }) => {
    const response = await request<{ success: boolean; data?: GiftCardRedeemResult; message?: string }>({
      url: API_ENDPOINTS.redeemGiftCard,
      method: 'POST',
      data: {
        card_number,
        ...(options?.shipping_address ? { shipping_address: options.shipping_address } : {})
      },
      showLoading: true
    });
    return response.data;
  },
  share: async (options: {
    card_number: string;
    delivery_mode?: string;
    channel?: string;
    message?: string;
    theme?: string;
    format?: 'qr' | 'pdf' | 'both';
  }) => {
    const response = await request<{ success: boolean; data: GiftCardShareResult }>({
      url: API_ENDPOINTS.shareGiftCard,
      method: 'POST',
      data: { ...options, format: options.format || 'both' },
      showLoading: false // 关闭自动loading，由页面自己控制
    });
    if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
      return (response as { success: boolean; data: GiftCardShareResult }).data;
    }
    return response as any as GiftCardShareResult;
  },
  listShareStyles: async () => {
    const response = await request<{ success: boolean; data: GiftCardShareStyle[] }>({
      url: API_ENDPOINTS.shareStyles,
      method: 'GET',
      suppressErrorToast: true
    });
    return response.data ?? [];
  },
  revokeShare: async (card_number: string) => {
    const response = await request<{ success: boolean; data: { card_number: string; share_state?: string } }>({
      url: API_ENDPOINTS.revokeGiftCardShare(card_number),
      method: 'POST'
    });
    return response.data;
  },
  getShareDetail: async (token: string) => {
    const response = await request<{ success: boolean; data: GiftCardShareDetail }>({
      url: API_ENDPOINTS.getShareDetail(token),
      method: 'GET'
    });
    return response.data;
  },
  claim: async (token: string) => {
    const response = await request<{ success: boolean; data: { card_number: string; status: string } }>({
      url: API_ENDPOINTS.claimGiftCard(token),
      method: 'POST',
      showLoading: true
    });
    return response.data;
  },
  getShareHistory: async (card_number: string) => {
    const response = await request<{
      success: boolean;
      data: { card_number: string; share_history: GiftCardShareLogEntry[] };
    }>({
      url: API_ENDPOINTS.giftCardShareHistory(card_number),
      method: 'GET',
      showLoading: true
    });
    return response.data?.share_history ?? [];
  },
  getStoredValueCards: async () => {
    const cards = await giftCardService.listMine();
    return cards.filter(
      (card) =>
        card.template_type === 'fixed_amount' &&
        parseFloat(card.balance || '0') > 0 &&
        card.status === 'active'
    );
  }
};

export const couponService = {
  validate: async (code: string) => {
    const response = await request<{
      success: boolean;
      data: {
        code: string;
        discount_type: string;
        amount: string;
        description?: string;
        minimum_amount?: string | null;
        maximum_amount?: string | null;
      };
    }>({
      url: API_ENDPOINTS.validateCoupon,
      method: 'POST',
      data: { code },
      showLoading: true
    });
    return response.data;
  }
};

export const referralService = {
  listDownlines: () =>
    request<{ downlines: ReferralDownline[] }>({
      url: API_ENDPOINTS.referrals,
      method: 'GET'
    }).then((res) => res.downlines),
  listCommissions: () =>
    request<{ commissions: CommissionRecord[] }>({
      url: API_ENDPOINTS.commissions,
      method: 'GET'
    }).then((res) => res.commissions)
};

export const commissionService = {
  getSummary: async () => {
    const response = await request<{ success: boolean; data: CommissionSummary }>({
      url: API_ENDPOINTS.commissionsSummary,
      method: 'GET'
    });
    return response.data;
  },
  listPayouts: async (params?: { page?: number; per_page?: number }) => {
    const response = await request<{
      success: boolean;
      data: CommissionPayoutRecord[];
      pagination?: { total?: number };
    }>({
      url: API_ENDPOINTS.commissionsPayouts,
      method: 'GET',
      data: params
    });
    return {
      items: response.data ?? [],
      total: response.pagination?.total ?? response.data?.length ?? 0
    };
  },
  requestPayout: async (payload: {
    amount: number;
    payout_method?: string;
    account_name?: string;
    account_no?: string;
    bank_name?: string;
  }) => {
    const response = await request<{
      success: boolean;
      data: {
        payout_id: number;
        amount: string;
        status: string;
        settlement_batch?: string;
        requested_at?: string;
      };
    }>({
      url: API_ENDPOINTS.commissionsPayout,
      method: 'POST',
      data: payload,
      showLoading: true
    });
    return response.data;
  }
};

export const agentService = {
  getProfile: () =>
    request<AgentProfile>({
      url: API_ENDPOINTS.agentsMe,
      method: 'GET'
    }),
  listDownlines: () =>
    request<{ downlines: AgentDownline[] }>({
      url: API_ENDPOINTS.agentDownlines,
      method: 'GET'
    }).then((res) => res.downlines),
  listCommissions: () =>
    request<{ commissions: CommissionRecord[] }>({
      url: API_ENDPOINTS.agentCommissions,
      method: 'GET'
    }).then((res) => res.commissions)
};

export const pointsService: PointsService = {
  getBalance: async () => {
    const response = await request<{ success: boolean; data: PointsBalance }>({
      url: API_ENDPOINTS.pointsBalance,
      method: 'GET'
    });
    return response.data;
  },
  getSummary: async () => {
    const response = await request<{ success: boolean; data: PointsBalance }>({
      url: API_ENDPOINTS.pointsSummary,
      method: 'GET'
    });
    return response.data;
  },
  getLedger: async (params?: { page?: number; per_page?: number; type?: string; status?: string; from?: string; to?: string }) => {
    const response = await request<{ success: boolean; data: PointsLedgerItem[]; pagination?: { total?: number } }>({
      url: API_ENDPOINTS.pointsLedger,
      method: 'GET',
      data: params
    });
    return {
      items: response.data ?? [],
      total: response.pagination?.total ?? response.data?.length ?? 0
    };
  },
  spend: async (points: number, reason: string) => {
    const response = await request<{ success: boolean; data: { new_balance: number; deducted: number } }>({
      url: API_ENDPOINTS.pointsSpend,
      method: 'POST',
      data: { points, reason },
      showLoading: true
    });
    return response.data;
  },
  getRules: async () => {
    const response = await request<{ success: boolean; data: PointsRule[] }>({
      url: API_ENDPOINTS.pointsRules,
      method: 'GET'
    });
    return response.data ?? [];
  },
  getSettings: async () => {
    const response = await request<{
      success: boolean;
      data: {
        enable_points_discount: boolean;
        redeem_rate: number;
        min_points_to_use: number;
        max_discount_percent: number;
        min_order_amount_to_use: number;
      };
    }>({
      url: API_ENDPOINTS.pointsSettings,
      method: 'GET'
    });
    return response.data;
  },
  getMissions: async () => {
    const response = await request<{ success: boolean; data: PointsMission[] }>({
      url: API_ENDPOINTS.pointsMissions,
      method: 'GET'
    });
    return response.data ?? [];
  },
  claimMission: async (missionId: string) => {
    const response = await request<{ success: boolean; data: { mission_id: string; awarded_points: number; new_balance: number; message?: string } }>({
      url: API_ENDPOINTS.pointsClaimMission(missionId),
      method: 'POST',
      showLoading: true
    });
    return response.data;
  },
  getRedeemOptions: async () => {
    const response = await request<{ success: boolean; data: PointsRedeemOption[] }>({
      url: API_ENDPOINTS.pointsRedeemOptions,
      method: 'GET'
    });
    return response.data ?? [];
  },
  redeem: async (optionId: string) => {
    const response = await request<{ success: boolean; data: PointsRedeemResult }>({
      url: API_ENDPOINTS.pointsRedeem,
      method: 'POST',
      data: { option_id: optionId },
      showLoading: true
    });
    return response.data;
  },
  signin: async () => {
    return request<{ success: boolean; data: { awarded_points: number; new_balance: number; message?: string } }>({
      url: API_ENDPOINTS.pointsSignin,
      method: 'POST',
      showLoading: true
    });
  }
};
