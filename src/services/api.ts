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
  AgentDownline,
  AgentProfile,
  CartItem,
  CommissionRecord,
  CreateOrderPayload,
  GiftCard,
  GiftCardPurchaseResult,
  GiftCardShareDetail,
  GiftCardShareResult,
  GiftCardTemplate,
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
  PublicConfig,
  ReferralDownline,
  UserProfile
} from '../types';

interface PointsService {
  getBalance: () => Promise<PointsBalance>;
  getLedger: (params?: { page?: number; per_page?: number; type?: string; status?: string; from?: string; to?: string }) => Promise<{
    items: PointsLedgerItem[];
    total: number;
  }>;
  spend: (points: number, reason: string) => Promise<{ new_balance: number; deducted: number }>;
  getRules: () => Promise<PointsRule[]>;
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

const resolveUrl = (endpoint: string) =>
  endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

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
      }).then(() => {
        isRedirecting = false;
      }).catch((err) => {
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
      url: resolveUrl(url),
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
      timeout: 60000  // 设置60秒超时
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
    const response = await request<{ success: boolean; data: GiftCardTemplate }>( {
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
  redeem: async (card_number: string, card_pin: string) => {
    const response = await request<{ success: boolean; data?: { card_number: string; status: string }; message?: string }>({
      url: API_ENDPOINTS.redeemGiftCard,
      method: 'POST',
      data: { card_number, card_pin },
      showLoading: true
    });
    return response.data;
  },
  share: async (card_number: string, delivery_mode: string, channel?: string) => {
    const response = await request<{ success: boolean; data: GiftCardShareResult }>({
      url: API_ENDPOINTS.shareGiftCard,
      method: 'POST',
      data: { card_number, delivery_mode, channel },
      showLoading: true
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
  claim: async (token: string, pin_code?: string) => {
    const payload = pin_code ? { pin_code } : undefined;
    const response = await request<{ success: boolean; data: { card_number: string; status: string } }>({
      url: API_ENDPOINTS.claimGiftCard(token),
      method: 'POST',
      data: payload,
      showLoading: true
    });
    return response.data;
  },
  resetPin: (cardId: number | string, newPin: string) =>
    request({
      url: API_ENDPOINTS.resetGiftCardPin(cardId),
      method: 'POST',
      data: { new_pin: newPin }
    })
};

export const referralService = {
  listDownlines: () =>
    request<{ downlines: ReferralDownline[] }>({
      url: API_ENDPOINTS.referrals,
      method: 'GET'
    }).then(res => res.downlines),
  listCommissions: () =>
    request<{ commissions: CommissionRecord[] }>({
      url: API_ENDPOINTS.commissions,
      method: 'GET'
    }).then(res => res.commissions)
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
    }).then(res => res.downlines),
  listCommissions: () =>
    request<{ commissions: CommissionRecord[] }>({
      url: API_ENDPOINTS.agentCommissions,
      method: 'GET'
    }).then(res => res.commissions)
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
