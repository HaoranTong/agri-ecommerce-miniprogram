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
  CartSummary,
  CommissionRecord,
  CreateOrderPayload,
  GiftCard,
  LoginResponse,
  OrderCreated,
  OrderDetail,
  Product,
  PublicConfig,
  ReferralDownline,
  ShippingAddress,
  UserProfile
} from '../types';

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

const handleUnauthorized = () => {
  clearToken();
  Taro.showToast({ title: '登录已失效，请重新登录', icon: 'none' });
  Taro.navigateTo({ url: '/pages/auth/login' });
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
    const result = await request<LoginResponse>({
      url: API_ENDPOINTS.login,
      method: 'POST',
      data: { code }
    });

    setToken(result.token);
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
  getProfile: () =>
    request<UserProfile>({
      url: API_ENDPOINTS.me,
      method: 'GET',
      showLoading: true
    })
};

export const cartService = {
  getCart: () =>
    request<CartSummary>({
      url: API_ENDPOINTS.cart,
      method: 'GET'
    }),
  updateCart: (payload: { product_id: number; variation_id?: number; quantity: number }) =>
    request<CartSummary>({
      url: API_ENDPOINTS.cart,
      method: 'POST',
      data: payload
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
      header: token ? { Authorization: `Bearer ${token}` } : {}
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
  listMine: () =>
    request<{ cards: GiftCard[] }>({
      url: API_ENDPOINTS.giftCards,
      method: 'GET',
      showLoading: true
    }).then(res => res.cards),
  redeem: (card_number: string, pin_code: string) =>
    request({
      url: API_ENDPOINTS.redeemGiftCard,
      method: 'POST',
      data: { card_number, pin_code },
      showLoading: true
    }),
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
