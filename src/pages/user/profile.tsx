import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useRef, useState } from 'react';

import { giftCardService, userService } from '../../services/api';
import { clearToken } from '../../utils/storage';
import type { UserProfile } from '../../types';
import './profile.scss';

const UserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [giftCardCount, setGiftCardCount] = useState<number | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const didShowRef = useRef(false);
  const giftCardRequestId = useRef(0);

  const loadProfile = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      const data = await userService.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('获取用户信息失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  const loadGiftCardCount = async () => {
    const requestId = ++giftCardRequestId.current;
    try {
      const cards = await giftCardService.listMine({
        showLoading: false,
        suppressErrorToast: true,
        suppressLog: true,
        cacheMs: 5000,
        fallbackToCache: true
      });
      if (requestId !== giftCardRequestId.current) return;
      setGiftCardCount(Array.isArray(cards) ? cards.length : 0);
    } catch (error) {
      if (requestId !== giftCardRequestId.current) return;
      console.warn('获取购物卡数量失败', error);
    }
  };

  // 页面显示时重新加载数据（从编辑页面返回时会触发）
  Taro.useDidShow(() => {
    const firstShow = !didShowRef.current;
    didShowRef.current = true;
    loadProfile(firstShow);
    loadGiftCardCount();
  });

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          clearToken();
          Taro.reLaunch({ url: '/pages/auth/login' });
        }
      }
    });
  };

  const handleNavigate = (url: string) => {
    Taro.navigateTo({ url });
  };

  if (loading) {
    return <View className='user-profile-page loading-state'>加载中...</View>;
  }

  if (!profile) {
    return (
      <View className='user-profile-page'>
        <View className='empty'>未获取到用户信息</View>
      </View>
    );
  }

  return (
    <View className='user-profile-page'>
      {/* 用户基础信息卡片 */}
      <View className='user-card'>
        <View className='user-avatar'>
          {profile.avatar && !avatarError ? (
            <Image
              className='avatar-img'
              src={profile.avatar}
              mode='aspectFill'
              onError={() => setAvatarError(true)}
            />
          ) : (
            <View className='avatar-placeholder'>👤</View>
          )}
        </View>
        <View className='user-info'>
          <Text className='user-nickname'>
            {profile.nickname || profile.first_name || '未设置昵称'}
          </Text>
          <Text className='user-id'>ID: {profile.username}</Text>
        </View>
      </View>

      {/* 积分和礼品卡 */}
      <View className='stats-section'>
        <View className='stat-item' onClick={() => handleNavigate('/pages/points/summary')}>
          <Text className='stat-value'>{profile.points_balance || 0}</Text>
          <Text className='stat-label'>我的积分</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item' onClick={() => handleNavigate('/pages/shopping-card/mine')}>
          <Text className='stat-value'>{giftCardCount ?? '--'}</Text>
          <Text className='stat-label'>购物卡</Text>
        </View>
      </View>

      {/* 功能菜单列表 */}
      <View className='menu-section'>
        <View className='menu-item' onClick={() => handleNavigate('/pages/user/edit-profile')}>
          <View className='menu-icon'>👤</View>
          <Text className='menu-label'>个人中心</Text>
          <Text className='menu-arrow'>→</Text>
        </View>

        <View className='menu-item' onClick={() => handleNavigate('/pages/order/list')}>
          <View className='menu-icon'>📦</View>
          <Text className='menu-label'>我的订单</Text>
          <Text className='menu-arrow'>→</Text>
        </View>

        <View className='menu-item' onClick={() => handleNavigate('/pages/address/list')}>
          <View className='menu-icon'>📍</View>
          <Text className='menu-label'>收货信息</Text>
          <Text className='menu-arrow'>→</Text>
        </View>
      </View>

      <View className='menu-section'>
        {profile.is_agent && (
          <View className='menu-item' onClick={() => handleNavigate('/pages/agent/dashboard')}>
            <View className='menu-icon'>🏢</View>
            <Text className='menu-label'>代理中心</Text>
            {profile.agent_code && <Text className='menu-badge'>{profile.agent_code}</Text>}
            <Text className='menu-arrow'>→</Text>
          </View>
        )}

        {!profile.is_agent && (
          <View className='menu-item' onClick={() => handleNavigate('/pages/agent/apply')}>
            <View className='menu-icon'>📝</View>
            <Text className='menu-label'>申请代理</Text>
            <Text className='menu-arrow'>→</Text>
          </View>
        )}

        <View className='menu-item' onClick={() => handleNavigate('/pages/referral/index')}>
          <View className='menu-icon'>👥</View>
          <Text className='menu-label'>我的推荐</Text>
          <Text className='menu-arrow'>→</Text>
        </View>

        <View className='menu-item' onClick={() => handleNavigate('/pages/commission/list')}>
          <View className='menu-icon'>💰</View>
          <Text className='menu-label'>佣金明细</Text>
          <Text className='menu-arrow'>→</Text>
        </View>
      </View>

      {profile.invite_code && (
        <View className='menu-section'>
          <View className='menu-item'>
            <View className='menu-icon'>🔑</View>
            <Text className='menu-label'>我的邀请码</Text>
            <Text className='menu-value invite-code'>{profile.invite_code}</Text>
          </View>
        </View>
      )}

      {/* 退出登录 */}
      <View className='logout-section'>
        <Button className='logout-btn' onClick={handleLogout}>
          退出登录
        </Button>
      </View>
    </View>
  );
};

export default UserProfile;
