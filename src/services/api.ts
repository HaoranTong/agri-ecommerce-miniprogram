import Taro from '@tarojs/taro';

import { API_BASE, API_ENDPOINTS } from '../utils/constants';
import { mockProducts, mockPublicConfig } from '../mock/data';
import {
  clearToken,
  getToken,
  setStoredUserInfo,
  setToken,
  type StoredUserInfo
} from '../utils/storage';
import type {
  AgentApplication,
  AgentApplicationResult,
  AgentDownline,
  AgentProfile,
  CartItem,
  ChannelAnalytics,
  CommissionRecord,
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
  UserProfile
} from '../types';

interface PointsService {
  getBalance: () => Promise<PointsBalance>;
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
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  header?: Record<string, string>;
  showLoading?: boolean;
  suppressErrorToast?: boolean;
  suppressLog?: boolean;
}

const isDev = process.env.NODE_ENV !== 'production';

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

  // 保存当前页面信息，登录后返回
  const redirectData = {
    path: currentPath,
    params: JSON.stringify(currentPage?.options || {})
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

export const request = async <T = any>({
  url,
  method = 'GET',
  data,
  header,
  showLoading = false,
  suppressErrorToast = false,
  suppressLog = false
}: RequestOptions): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(header || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const finalUrl = resolveUrl(url);

  // 无论生产/开发，第一次初始化时打印一次环境信息（方便你现场判断是否走对站点）
  // 注意：这里只做轻量输出，不影响性能
  if (!suppressLog && (url === API_ENDPOINTS.publicConfig || url === API_ENDPOINTS.login)) {
    console.log('[API Env]', {
      miniEnvVersion: MINI_ENV_VERSION,
      effectiveBase: EFFECTIVE_API_BASE,
      nodeEnv: process.env.NODE_ENV
    });
  }

  if (isDev && !suppressLog) {
    console.info('[API Debug]', {
      method,
      url: finalUrl,
      hasToken: !!token,
      nodeEnv: process.env.NODE_ENV,
      apiBase: EFFECTIVE_API_BASE,
      miniEnvVersion: MINI_ENV_VERSION
    });
  }

  // 对需要认证的请求记录 token 状态
  if (!suppressLog && (url.includes('/cart') || url.includes('/orders'))) {
    console.log(`[API] ${method} ${url}`, {
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'NONE'
    });
  }

  if (showLoading) {
    Taro.showLoading({ title: '加载中...', mask: true });
  }

  try {
    const response = await Taro.request<T>({
      url: finalUrl,
      method,
      data,
      header: headers
    });

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
  } catch (error) {
    if (!(error instanceof Error && error.message === 'unauthorized') && !suppressLog) {
      console.error('API 请求失败', error);
    }
    throw error;
  } finally {
    if (showLoading) {
      Taro.hideLoading();
    }
  }
};

export const authService = {
  async login(code: string) {
    const response = await request<{ success: boolean; data: LoginResponse }>({
      url: API_ENDPOINTS.login,
      method: 'POST',
      data: { code }
    });

    // 后端返回格式：{ success: true, data: { token, user_id, openid } }
    const result = response.data;

    if (!result || !result.token) {
      console.error('登录响应格式错误:', response);
      throw new Error('登录失败：未返回 token');
    }

    // 同步保存 token
    setToken(result.token);

    // 立即验证是否保存成功
    const savedToken = getToken();
    console.log('Token 保存验证:', {
      received: result.token.substring(0, 30) + '...',
      saved: savedToken ? savedToken.substring(0, 30) + '...' : 'NULL',
      match: savedToken === result.token
    });

    const storedUser: StoredUserInfo = {
      user_id: result.user_id,
      phone: result.phone,
      wechat_nickname: result.wechat_nickname,
      invite_code: result.invite_code
    };
    setStoredUserInfo(storedUser);

    return result;
  }
};

export const configService = {
  getPublicConfig: async () => {
    try {
      return await request<PublicConfig>({
        url: API_ENDPOINTS.publicConfig,
        method: 'GET',
        suppressErrorToast: isDev,
        suppressLog: isDev
      });
    } catch (error) {
      if (isDev) {
        console.warn('使用 mock 公共配置数据', error);
        return mockPublicConfig;
      }
      throw error;
    }
  }
};

export const productService = {
  async getProducts(): Promise<Product[]> {
    try {
      const response = await request<{ products: Product[] }>({
        url: API_ENDPOINTS.products,
        method: 'GET',
        suppressErrorToast: isDev,
        suppressLog: isDev
      });
      return response.products;
    } catch (error) {
      if (isDev) {
        console.warn('使用 mock 商品数据', error);
        return mockProducts;
      }
      throw error;
    }
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

export const userService = {
  getProfile: async () => {
    const response = await request<{ success: boolean; data: UserProfile }>({
      url: API_ENDPOINTS.me,
      method: 'GET',
      showLoading: true
    });
    return response.data;
  },
  updateProfile: async (data: { nickname?: string; first_name?: string; phone?: string }) => {
    const response = await request<{ success: boolean; data: UserProfile }>({
      url: '/user/profile',
      method: 'PUT',
      data,
      showLoading: true
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
    const response = await request<{ success: boolean; data: InvitationSummary }>({
      url: API_ENDPOINTS.invitationsSummary,
      method: 'GET'
    });
    return response.data;
  },
  track: async (params: { channel?: string; scene?: string; referrer_code?: string }) => {
    const response = await request<{ success: boolean; data: { tracked: boolean } }>({
      url: API_ENDPOINTS.invitationsTrack,
      method: 'POST',
      data: params
    });
    return response.data;
  }
};

export const analyticsService = {
  getChannelAnalytics: async () => {
    const response = await request<{ success: boolean; data: ChannelAnalytics[] }>({
      url: API_ENDPOINTS.analyticsChannel,
      method: 'GET'
    });
    return response.data ?? [];
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
  apply: async (data: AgentApplication) => {
    const response = await request<{ success: boolean; data: AgentApplicationResult }>({
      url: API_ENDPOINTS.agentsApply,
      method: 'POST',
      data,
      showLoading: true
    });
    return response.data;
  }
};

export const cartService = {
  getCart: () =>
    request<CartItem[]>({
      url: API_ENDPOINTS.cart,
      method: 'GET'
    }),
  addToCart: (variation_id: number, quantity: number) =>
    request<{ success: boolean }>({
      url: API_ENDPOINTS.cart,
      method: 'POST',
      data: { variation_id, quantity },
      showLoading: true
    }),
  updateCart: (variation_id: number, quantity: number) =>
    request<{ success: boolean }>({
      url: API_ENDPOINTS.cartItem(variation_id),
      method: 'PUT',
      data: { quantity },
      showLoading: true
    }),
  removeFromCart: (variation_id: number) =>
    request<{ success: boolean }>({
      url: API_ENDPOINTS.cartItem(variation_id),
      method: 'DELETE'
    }),
  clearCart: () =>
    request<void>({
      url: API_ENDPOINTS.cart,
      method: 'DELETE'
    })
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
      showLoading: true
    }),
  uploadPaymentProof: async (orderId: number | string, filePath: string) => {
    const token = getToken();
    const uploadRes = await Taro.uploadFile({
      url: resolveUrl(API_ENDPOINTS.uploadPaymentProof(orderId)),
      filePath,
      name: 'proof_image',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 60000 // 设置60秒超时
    });

    let data: any = {};
    try {
      data = uploadRes.data ? JSON.parse(uploadRes.data) : {};
    } catch (error) {
      console.warn('解析上传响应失败', error);
    }

    if (uploadRes.statusCode >= 400 || data?.error_code) {
      const message = data?.message || '上传失败';
      Taro.showToast({ title: message, icon: 'none' });
      throw new Error(message);
    }
  },
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
  }
};

export const giftCardService = {
  listMine: async () => {
    const response = await request<{ success?: boolean; data?: GiftCard[]; cards?: GiftCard[] }>({
      url: API_ENDPOINTS.giftCards,
      method: 'GET',
      showLoading: true
    });
    return response.data ?? response.cards ?? [];
  },
  listTemplates: async () => {
    const response = await request<{ success: boolean; data: GiftCardTemplate[] }>({
      url: '/gift-cards/templates',
      method: 'GET',
      showLoading: true
    });
    return response.data ?? [];
  },
  getTemplateDetail: async (templateId: number) => {
    const response = await request<{ success: boolean; data: GiftCardTemplate }>({
      url: `/gift-cards/templates/${templateId}`,
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
      url: '/gift-cards/purchase',
      method: 'POST',
      data: {
        template_id,
        ...(options || {})
      },
      showLoading: true
    });
    return response.data;
  },
  redeem: async (card_number: string) => {
    const response = await request<{ success: boolean; data?: GiftCardRedeemResult; message?: string }>({
      url: API_ENDPOINTS.redeemGiftCard,
      method: 'POST',
      data: { card_number },
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
  }
};
