import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { agentService, pointsService } from '../../services/api';
import type { CommissionRecord, PointsLedgerItem } from '../../types';
import HelpTooltip from '../../components/HelpTooltip';
import { decimalAdd } from '../../utils/decimal';
import './list.scss';

const CommissionList = () => {
  const [referralRewards, setReferralRewards] = useState<PointsLedgerItem[]>([]);
  const [agentCommissions, setAgentCommissions] = useState<CommissionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'referral' | 'agent'>('referral');
  const [loading, setLoading] = useState(true);

  const loadCommissions = async () => {
    try {
      const [rewardData, agentData] = await Promise.all([
        pointsService
          .getLedger({ page: 1, per_page: 50, type: 'earn', channel_prefix: 'referral_reward' })
          .catch(() => ({ items: [] })),
        agentService.listCommissions()
      ]);
      setReferralRewards(rewardData.items || []);
      setAgentCommissions(agentData);
    } catch (error) {
      console.error('获取佣金明细失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommissions();
  }, []);

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'orange',
      confirmed: 'green',
      approved: 'blue',
      paid: 'green',
      rejected: 'red',
      released: 'gray'
    };
    return map[status] || 'gray';
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: '待结算',
      confirmed: '已入账',
      approved: '已审核',
      paid: '已支付',
      rejected: '已驳回',
      released: '已撤销'
    };
    return map[status] || status;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateAgentTotal = (commissions: CommissionRecord[]) => {
    return commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => decimalAdd(sum, parseFloat(c.amount)), 0)
      .toFixed(2);
  };

  const calculateReferralPoints = (items: PointsLedgerItem[]) => {
    return items
      .filter(item => item.status === 'confirmed')
      .reduce((sum, item) => sum + item.delta, 0);
  };

  const currentCommissions = activeTab === 'agent' ? agentCommissions : [];

  if (loading) {
    return <View className='commission-list-page loading-state'>加载中...</View>;
  }

  return (
    <View className='commission-list-page'>
      {/* 统计卡片 */}
      <View className='summary-card'>
        <View className='summary-item'>
          <Text className='summary-label'>推荐奖励积分</Text>
          <Text className='summary-value'>{calculateReferralPoints(referralRewards)}</Text>
        </View>
        <View className='summary-divider' />
        <View className='summary-item'>
          <Text className='summary-label'>代理佣金</Text>
          <Text className='summary-value'>¥{calculateAgentTotal(agentCommissions)}</Text>
        </View>
      </View>

      {/* 切换标签 */}
      <View className='tab-bar'>
        <View
          className={`tab-item ${activeTab === 'referral' ? 'active' : ''}`}
          onClick={() => setActiveTab('referral')}
        >
          <Text>推荐积分</Text>
        </View>
        <View
          className={`tab-item ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          <Text>代理佣金</Text>
        </View>
      </View>

      {activeTab === 'referral' ? (
        referralRewards.length === 0 ? (
          <View className='empty-state'>暂无积分记录</View>
        ) : (
          <View className='commission-list'>
            {referralRewards.map((item) => (
              <View key={item.id} className='commission-item'>
                <View className='item-header'>
                  <Text className='order-id'>订单 #{item.reference_order_id ?? '-'}</Text>
                  <View className='info-row'>
                    <View className={`status-badge ${getStatusColor(item.status || 'pending')}`}>
                      <Text>{getStatusText(item.status || 'pending')}</Text>
                    </View>
                    <HelpTooltip page='commission/list' location='status_badge' />
                  </View>
                </View>
                <View className='item-body'>
                  <View className='item-row'>
                    <Text className='item-label'>奖励积分</Text>
                    <Text className='item-value amount'>+{item.delta}</Text>
                  </View>
                  <View className='item-row'>
                    <Text className='item-label'>渠道</Text>
                    <Text className='item-value'>{item.channel || 'referral'}</Text>
                  </View>
                  <View className='item-row'>
                    <Text className='item-label'>创建时间</Text>
                    <Text className='item-value'>{formatDate(item.created_at)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )
      ) : currentCommissions.length === 0 ? (
        <View className='empty-state'>暂无佣金记录</View>
      ) : (
        <View className='commission-list'>
          {currentCommissions.map((commission) => (
            <View key={commission.id} className='commission-item'>
              <View className='item-header'>
                <Text className='order-id'>订单 #{commission.order_id}</Text>
                <View className='info-row'>
                  <View className={`status-badge ${getStatusColor(commission.status)}`}>
                    <Text>{getStatusText(commission.status)}</Text>
                  </View>
                  <HelpTooltip page='commission/list' location='status_badge' />
                </View>
              </View>
              <View className='item-body'>
                <View className='item-row'>
                  <Text className='item-label'>佣金金额</Text>
                  <Text className='item-value amount'>¥{commission.amount}</Text>
                </View>
                <View className='item-row'>
                  <Text className='item-label'>佣金类型</Text>
                  <Text className='item-value'>代理佣金</Text>
                </View>
                <View className='item-row'>
                  <Text className='item-label'>创建时间</Text>
                  <Text className='item-value'>{formatDate(commission.created_at)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default CommissionList;
