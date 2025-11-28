import { Text, View } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { pointsService } from '../../services/api';
import type { PointsBalance, PointsRule } from '../../types';
import './summary.scss';

const PointsSummary = () => {
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [rules, setRules] = useState<PointsRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (showSkeleton = true) => {
    try {
      if (showSkeleton) {
        setLoading(true);
      }
      const [balanceData, rulesData] = await Promise.all([
        pointsService.getBalance(),
        pointsService.getRules().catch(() => [])
      ]);
      setBalance(balanceData);
      setRules((rulesData || []).slice(0, 3));
    } catch (error) {
      console.error('获取积分数据失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      if (showSkeleton) {
        setLoading(false);
      }
      Taro.stopPullDownRefresh();
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  usePullDownRefresh(() => {
    loadData(false);
  });

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
      <View className="balance-card">
        <Text className="card-label">可用积分</Text>
        <Text className="card-value">{balance.available}</Text>
        <View className="card-meta">
          <View>
            <Text className="meta-label">近 30 天获取</Text>
            <Text className="meta-value">+{balance.recent_earnings ?? 0}</Text>
          </View>
          <View>
            <Text className="meta-label">累积使用</Text>
            <Text className="meta-value muted">-{balance.total_spent}</Text>
          </View>
        </View>
      </View>

      <View className="stats-grid">
        <View className="stat-item">
          <Text className="stat-label">待入账</Text>
          <Text className="stat-value">{balance.pending}</Text>
          <Text className="stat-tip">订单完成后自动发放</Text>
        </View>
        <View className="stat-item">
          <Text className="stat-label">冻结中</Text>
          <Text className="stat-value">{balance.frozen ?? 0}</Text>
          <Text className="stat-tip">用于抵扣的预占积分</Text>
        </View>
        <View className="stat-item">
          <Text className="stat-label">累计获得</Text>
          <Text className="stat-value">{balance.total_earned}</Text>
          <Text className="stat-tip">含任务与活动奖励</Text>
        </View>
        <View className="stat-item">
          <Text className="stat-label">累计使用</Text>
          <Text className="stat-value">{balance.total_spent}</Text>
          <Text className="stat-tip">含抵扣与兑换</Text>
        </View>
      </View>

      {Boolean(balance.expiring_soon) && (
        <View className="expiring-card" onClick={() => handleNavigate('/pages/points/ledger')}>
          <View className="expiring-left">
            <Text className="expiring-title">即将过期</Text>
            <Text className="expiring-value">{balance.expiring_soon}</Text>
          </View>
          <View className="expiring-right">
            <Text className="expiring-tip">
              {balance.expiring_date ? `${balance.expiring_date} 到期` : '请及时使用'}
            </Text>
            <Text className="expiring-link">查看详情 →</Text>
          </View>
        </View>
      )}

      <View className="quick-actions">
        <View className="action-item" onClick={() => handleNavigate('/pages/points/ledger')}>
          <Text className="action-icon">📊</Text>
          <Text className="action-title">积分流水</Text>
          <Text className="action-desc">所有收支明细</Text>
        </View>
        <View className="action-item" onClick={() => handleNavigate('/pages/points/missions')}>
          <Text className="action-icon">🧩</Text>
          <Text className="action-title">任务中心</Text>
          <Text className="action-desc">完成任务赚积分</Text>
        </View>
        <View className="action-item" onClick={() => handleNavigate('/pages/points/redeem')}>
          <Text className="action-icon">🎁</Text>
          <Text className="action-title">积分兑换</Text>
          <Text className="action-desc">兑换礼品或券</Text>
        </View>
        <View className="action-item" onClick={() => handleNavigate('/pages/points/rules')}>
          <Text className="action-icon">📘</Text>
          <Text className="action-title">积分规则</Text>
          <Text className="action-desc">了解玩法与有效期</Text>
        </View>
      </View>

      <View className="insight-card">
        <Text className="insight-title">积分使用建议</Text>
        <Text className="insight-text">
          订单支付前可选择抵扣（最多使用当前可用积分），也可在积分兑换专区换取优惠券、礼品卡或实物。冻结积分会在订单完成后自动解锁。
        </Text>
      </View>

      <View className="rules-card" onClick={() => handleNavigate('/pages/points/rules')}>
        <View className="rules-header">
          <Text className="rules-title">最新积分规则</Text>
          <Text className="rules-link">查看全部 →</Text>
        </View>
        {rules.length === 0 ? (
          <Text className="rules-empty">暂无规则，敬请期待</Text>
        ) : (
          rules.map((rule) => (
            <View className="rule-item" key={rule.rule_id}>
              <Text className="rule-title">{rule.title}</Text>
              <Text className="rule-desc">{rule.description}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

export default PointsSummary;
