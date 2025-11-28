import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { agentService } from '../../services/api';
import type { AgentDownline, AgentProfile, CommissionRecord } from '../../types';
import '../address/address.scss';

const AgentDashboard = () => {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [downlines, setDownlines] = useState<AgentDownline[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [prof, downlineData, commissionData] = await Promise.all([
          agentService.getProfile(),
          agentService.listDownlines(),
          agentService.listCommissions()
        ]);
        setProfile(prof);
        setDownlines(downlineData);
        setCommissions(commissionData);
      } catch (error) {
        console.error('加载代理商数据失败', error);
        Taro.showToast({ title: '加载失败', icon: 'none' });
      }
    };

    load();
  }, []);

  if (!profile?.is_agent) {
    return <View className='address-page'>您尚未成为代理商</View>;
  }

  return (
    <View className='address-page'>
      <View className='address-card'>
        <Text className='section-title'>代理商概况</Text>
        <View className='info-row'>
          <Text>代理编码</Text>
          <Text>{profile.agent_code}</Text>
        </View>
        <View className='info-row'>
          <Text>等级</Text>
          <Text>{profile.level}</Text>
        </View>
        <View className='info-row'>
          <Text>团队规模</Text>
          <Text>{profile.total_downline_agents}</Text>
        </View>
        <View className='info-row'>
          <Text>累计销售额</Text>
          <Text>¥{profile.total_sales_amount}</Text>
        </View>
      </View>

      <View className='address-card'>
        <Text className='section-title'>团队列表</Text>
        {downlines.length === 0 && <View className='empty'>暂无下级代理</View>}
        {downlines.map((agent) => (
          <View className='info-row' key={agent.agent_user_id}>
            <Text>{agent.agent_code}</Text>
            <Text>
              {agent.level}级 · 销售额 ¥{agent.sales_amount}
            </Text>
          </View>
        ))}
      </View>

      <View className='address-card'>
        <Text className='section-title'>佣金记录</Text>
        {commissions.length === 0 && <View className='empty'>暂无佣金记录</View>}
        {commissions.map((commission) => (
          <View className='info-row' key={commission.id}>
            <Text>订单 {commission.order_id}</Text>
            <Text>
              ¥{commission.amount} ({commission.status})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default AgentDashboard;
