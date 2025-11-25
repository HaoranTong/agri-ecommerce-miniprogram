import Taro from '@tarojs/taro';

import type { AddressFormState } from '../types';

const TOKEN_KEY = 'MYSHOP_AUTH_TOKEN';
const USER_INFO_KEY = 'MYSHOP_USER_INFO';
const ADDRESS_KEY = 'MYSHOP_ADDRESSES';

export const getToken = (): string | null => {
  try {
    const token = Taro.getStorageSync<string>(TOKEN_KEY);
    console.log('[Storage] getToken:', token ? `${token.substring(0, 20)}...` : 'null');
    return token || null;
  } catch (error) {
    console.error('[Storage] 获取 token 失败', error);
    return null;
  }
};

export const setToken = (token: string) => {
  try {
    console.log('[Storage] setToken 开始:', token.substring(0, 20) + '...');
    Taro.setStorageSync(TOKEN_KEY, token);
    
    // 立即验证写入
    const saved = Taro.getStorageSync<string>(TOKEN_KEY);
    console.log('[Storage] setToken 验证:', {
      success: saved === token,
      savedPrefix: saved ? saved.substring(0, 20) + '...' : 'null'
    });
    
    if (saved !== token) {
      throw new Error('Token 写入验证失败');
    }
  } catch (error) {
    console.error('[Storage] 设置 token 失败', error);
    throw error;
  }
};

export const clearToken = () => {
  try {
    console.log('[Storage] clearToken');
    Taro.removeStorageSync(TOKEN_KEY);
  } catch (error) {
    console.error('[Storage] 清除 token 失败', error);
  }
};

export interface StoredUserInfo {
  user_id: number;
  phone?: string;
  wechat_nickname?: string;
  wechat_avatar?: string;
  invite_code?: string;
}

export const getStoredUserInfo = (): StoredUserInfo | null => {
  const info = Taro.getStorageSync<StoredUserInfo>(USER_INFO_KEY);
  return info || null;
};

export const setStoredUserInfo = (info: StoredUserInfo) => {
  Taro.setStorageSync(USER_INFO_KEY, info);
};

export const clearStoredUserInfo = () => {
  Taro.removeStorageSync(USER_INFO_KEY);
};

export interface StoredAddress extends AddressFormState {
  id: number;
}

const ensureAddresses = (): StoredAddress[] => {
  const result = Taro.getStorageSync<StoredAddress[]>(ADDRESS_KEY);
  return Array.isArray(result) ? result : [];
};

export const getSavedAddresses = (): StoredAddress[] => ensureAddresses();

export const saveAddresses = (addresses: StoredAddress[]) => {
  Taro.setStorageSync(ADDRESS_KEY, addresses);
};

export const upsertAddress = (address: AddressFormState): StoredAddress[] => {
  const list = ensureAddresses();
  let nextId = address.id ?? 0;
  if (!nextId) {
    nextId = list.length ? Math.max(...list.map((item) => item.id)) + 1 : 1;
  }
  const nextList = list.filter((item) => item.id !== nextId).concat({ ...address, id: nextId });
  saveAddresses(nextList);
  return nextList;
};

export const removeAddress = (id: number) => {
  const list = ensureAddresses().filter((item) => item.id !== id);
  saveAddresses(list);
  return list;
};
