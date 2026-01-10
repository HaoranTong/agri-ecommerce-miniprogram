import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { referralService, invitationService, analyticsService } from '../../services/api';
import type { CommissionRecord, ReferralDownline, InvitationSummary, ChannelAnalytics } from '../../types';
import '../address/address.scss';

const ReferralIndex = () => {
  const [downlines, setDownlines] = useState<ReferralDownline[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [invitationSummary, setInvitationSummary] = useState<InvitationSummary | null>(null);
  const [channelAnalytics, setChannelAnalytics] = useState<ChannelAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [downlineData, commissionData, summaryData, analyticsData] = await Promise.all([
          referralService.listDownlines(),
          referralService.listCommissions(),
          invitationService.getSummary().catch(() => null),
          analyticsService.getChannelAnalytics().catch(() => [])
        ]);
        
        setDownlines(downlineData);
        setCommissions(commissionData);
        setInvitationSummary(summaryData);
        setChannelAnalytics(analyticsData);
      } catch (error) {
        console.error('加载分销数据失败', error);
        Taro.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 渠道归因追踪
  useEffect(() => {
    const trackChannelVisit = async () => {
      try {
        const options = Taro.getLaunchOptionsSync();
        const query = options.query || {};
        
        // 检查是否有渠道参数
        if (query.channel || query.scene || query.referrer_code) {
          await invitationService.track({
            channel: query.channel,
            scene: query.scene,
            referrer_code: query.referrer_code
          });
        }
      } catch (error) {
        console.warn('渠道追踪失败', error);
      }
    };

    trackChannelVisit();
  }, []);

  if (loading) {
    return (
      <View className='address-page'>
        <View className='address-card'>
          <Text className='section-title'>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='address-page'>
      {/* 邀请统计 */}
      {invitationSummary && (
        <View className='address-card'>
          <Text className='section-title'>邀请统计</Text>
          <View className='stats-grid'>
            <View className='stat-item'>
              <Text className='stat-number'>{invitationSummary.total_invitations}</Text>
              <Text className='stat-label'>总邀请人数</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{invitationSummary.first_order_count}</Text>
              <Text className='stat-label'>首单转化</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{invitationSummary.conversion_rate}</Text>
              <Text className='stat-label'>转化率</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{invitationSummary.pending_invitations}</Text>
              <Text className='stat-label'>待转化</Text>
            </View>
          </View>
        </View>
      )}

      {/* 我的邀请 */}
      <View className='address-card'>
        <Text className='section-title'>我的邀请</Text>
        {downlines.length === 0 && <View className='empty'>暂无下级用户</View>}
        {downlines.map((item) => (
          <View className='info-row' key={item.user_id}>
            <Text>{item.phone}</Text>
            <Text>
              {item.level}级 · 注册时间 {item.registered_at}
            </Text>
          </View>
        ))}
      </View>

      {/* 佣金明细 */}
      <View className='address-card'>
        <Text className='section-title'>佣金明细</Text>
        {commissions.length === 0 && <View className='empty'>暂无佣金记录</View>}
        {commissions.map((commission) => (
          <View className='info-row' key={commission.id}>
            <Text>订单 {commission.order_id}</Text>
            <Text>
              ¥{commission.amount} · {commission.status}
            </Text>
          </View>
        ))}
      </View>

      {/* 渠道分析 */}
      {channelAnalytics.length > 0 && (
        <View className='address-card'>
          <Text className='section-title'>渠道分析</Text>
          {channelAnalytics.map((channel, index) => (
            <View className='info-row' key={index}>
              <Text>{channel.channel}</Text>
              <Text>
                访问 {channel.visits} · 新用户 {channel.new_users} · 首单 {channel.first_orders}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default ReferralIndex;
