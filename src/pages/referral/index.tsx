import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { referralService, invitationService } from '../../services/api';
import type { CommissionRecord, ReferralMember, ReferralSummary } from '../../types';
import HelpTooltip from '../../components/HelpTooltip';
import './index.scss';

const ReferralIndex = () => {
  const [members, setMembers] = useState<ReferralMember[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [codeData, summaryData, memberData, commissionData] = await Promise.all([
          referralService.getCode().catch(() => null),
          referralService.getSummary().catch(() => null),
          referralService.listMembers().catch(() => []),
          referralService.listCommissions()
        ]);

        if (codeData?.referral_code) {
          setReferralCode(codeData.referral_code);
        }
        setSummary(summaryData);
        setMembers(memberData);
        setCommissions(commissionData);
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
      {/* 邀请码 */}
      {referralCode && (
        <View className='address-card'>
          <View className='info-row'>
            <Text className='section-title'>我的邀请码</Text>
            <HelpTooltip page='referral/index' location='invite_code' />
          </View>
          <View className='info-row'>
            <Text>邀请码</Text>
            <Text>{referralCode}</Text>
          </View>
        </View>
      )}

      {/* 邀请统计 */}
      {summary && (
        <View className='address-card'>
          <View className='info-row'>
            <Text className='section-title'>邀请统计</Text>
            <HelpTooltip page='referral/index' location='invite_stats' />
          </View>
          <View className='stats-grid'>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.total_invitees}</Text>
              <Text className='stat-label'>总邀请人数</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.completed_first_orders}</Text>
              <Text className='stat-label'>首单完成</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.level_one_count}</Text>
              <Text className='stat-label'>一级人数</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.level_two_count}</Text>
              <Text className='stat-label'>二级人数</Text>
            </View>
          </View>
        </View>
      )}

      {/* 我的邀请 */}
      <View className='address-card'>
        <Text className='section-title'>我的邀请</Text>
        {members.length === 0 && <View className='empty'>暂无下级用户</View>}
        {members.map((item) => (
          <View className='info-row' key={item.user_id}>
            <Text>{item.nickname || '匿名用户'}</Text>
            <Text>
              {item.level}级 · 注册时间 {item.joined_at}
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

      {/* 渠道分析接口仅运营可用，前端不展示 */}
    </View>
  );
};

export default ReferralIndex;
