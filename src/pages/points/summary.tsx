import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { pointsService } from '../../services/api';
import type { PointsBalance } from '../../types';
import './summary.scss';

const PointsSummary = () => {
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBalance = async () => {
    try {
      const data = await pointsService.getBalance();
      setBalance(data);
    } catch (error) {
      console.error('获取积分余额失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const handleNavigate = (url: string) => {
    Taro.navigateTo({ url });
  };

  if (loading) {
    return <View className="points-summary-page loading-state">加载中...</View>;
  }

  if (!balance) {
    return (
      <View className="points-summary-page">
        <View className="empty">未获取到积分信息</View>
      </View>
    );
  }

  return (
    <View className="points-summary-page">
      {/* 可用积分卡片 */}
      <View className="balance-card">
        <Text className="card-title">可用积分</Text>
        <Text className="balance-value">{balance.available}</Text>
        <Text className="card-subtitle">用于抵扣订单金额或兑换礼品</Text>
      </View>

      {/* 积分统计 */}
      <View className="stats-card">
        <View className="stat-item">
          <Text className="stat-label">待入账</Text>
          <Text className="stat-value">{balance.pending}</Text>
          <Text className="stat-tip">订单完成后发放</Text>
        </View>
        <View className="stat-divider" />
        <View className="stat-item">
          <Text className="stat-label">即将过期</Text>
          <Text className="stat-value expiring">{balance.expiring_soon}</Text>
          {balance.expiring_date && (
            <Text className="stat-tip">{balance.expiring_date}到期</Text>
          )}
        </View>
      </View>

      {/* 功能菜单 */}
      <View className="menu-list">
        <View className="menu-item" onClick={() => handleNavigate('/pages/points/ledger')}>
          <Text className="menu-icon">📋</Text>
          <View className="menu-content">
            <Text className="menu-label">积分流水</Text>
            <Text className="menu-desc">查看积分获取和消费记录</Text>
          </View>
          <Text className="menu-arrow">›</Text>
        </View>

        <View className="menu-item disabled">
          <Text className="menu-icon">🎁</Text>
          <View className="menu-content">
            <Text className="menu-label">积分兑换</Text>
            <Text className="menu-desc">敬请期待</Text>
          </View>
          <Text className="menu-arrow">›</Text>
        </View>
      </View>

      {/* 积分说明 */}
      <View className="tips-card">
        <Text className="tips-title">💡 积分规则说明</Text>
        <View className="tips-list">
          <Text className="tips-item">• 每消费1元获得1积分</Text>
          <Text className="tips-item">• 推荐好友注册获得50积分</Text>
          <Text className="tips-item">• 积分自获得之日起1年内有效</Text>
          <Text className="tips-item">• 订单退款后积分将被扣除</Text>
        </View>
      </View>
    </View>
  );
};

export default PointsSummary;
