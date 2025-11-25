import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { userService } from '../../services/api';
import { clearToken } from '../../utils/storage';
import type { UserProfile } from '../../types';
import './profile.scss';

const UserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const data = await userService.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('获取用户信息失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

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
    return <View className="user-profile-page loading-state">加载中...</View>;
  }

  if (!profile) {
    return (
      <View className="user-profile-page">
        <View className="empty">未获取到用户信息</View>
      </View>
    );
  }

  return (
    <View className="user-profile-page">
      {/* 用户基础信息卡片 */}
      <View className="user-card">
        <View className="user-avatar">
          {profile.wechat_avatar ? (
            <Image className="avatar-img" src={profile.wechat_avatar} mode="aspectFill" />
          ) : (
            <View className="avatar-placeholder">👤</View>
          )}
        </View>
        <View className="user-info">
          <Text className="user-nickname">{profile.wechat_nickname || profile.phone || '未设置昵称'}</Text>
          {profile.phone && <Text className="user-phone">{profile.phone}</Text>}
        </View>
      </View>

      {/* 邀请码 */}
      {profile.invite_code && (
        <View className="info-card">
          <View className="info-row">
            <Text className="info-label">我的邀请码</Text>
            <Text className="info-value invite-code">{profile.invite_code}</Text>
          </View>
        </View>
      )}

      {/* 资产统计 */}
      <View className="asset-card">
        <View className="asset-item" onClick={() => handleNavigate('/pages/points/summary')}>
          <Text className="asset-value">{profile.total_points || 0}</Text>
          <Text className="asset-label">我的积分</Text>
        </View>
        <View className="asset-divider" />
        <View className="asset-item" onClick={() => handleNavigate('/pages/giftcard/mine')}>
          <Text className="asset-value">查看</Text>
          <Text className="asset-label">我的礼品卡</Text>
        </View>
      </View>

      {/* 功能菜单列表 */}
      <View className="menu-list">
        {profile.is_agent && (
          <View className="menu-item" onClick={() => handleNavigate('/pages/agent/dashboard')}>
            <Text className="menu-label">🏢 代理中心</Text>
            {profile.agent_code && <Text className="menu-badge">{profile.agent_code}</Text>}
            <Text className="menu-arrow">›</Text>
          </View>
        )}

        {!profile.is_agent && (
          <View className="menu-item" onClick={() => handleNavigate('/pages/agent/apply')}>
            <Text className="menu-label">📝 申请代理</Text>
            <Text className="menu-arrow">›</Text>
          </View>
        )}

        <View className="menu-item" onClick={() => handleNavigate('/pages/referral/index')}>
          <Text className="menu-label">👥 我的推荐</Text>
          <Text className="menu-arrow">›</Text>
        </View>

        <View className="menu-item" onClick={() => handleNavigate('/pages/commission/list')}>
          <Text className="menu-label">💰 佣金明细</Text>
          <Text className="menu-arrow">›</Text>
        </View>

        <View className="menu-item" onClick={() => handleNavigate('/pages/address/list')}>
          <Text className="menu-label">📍 收货信息</Text>
          <Text className="menu-arrow">›</Text>
        </View>

        <View className="menu-item" onClick={() => handleNavigate('/pages/order/list')}>
          <Text className="menu-label">📦 我的订单</Text>
          <Text className="menu-arrow">›</Text>
        </View>
      </View>

      {/* 退出登录 */}
      <View className="logout-section">
        <Button className="logout-btn" onClick={handleLogout}>
          退出登录
        </Button>
      </View>
    </View>
  );
};

export default UserProfile;
