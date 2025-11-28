import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { referralService } from '../../services/api';
import type { CommissionRecord, ReferralDownline } from '../../types';
import '../address/address.scss';

const ReferralIndex = () => {
  const [downlines, setDownlines] = useState<ReferralDownline[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [downlineData, commissionData] = await Promise.all([
          referralService.listDownlines(),
          referralService.listCommissions()
        ]);
        setDownlines(downlineData);
        setCommissions(commissionData);
      } catch (error) {
        console.error('加载分销数据失败', error);
        Taro.showToast({ title: '加载失败', icon: 'none' });
      }
    };

    load();
  }, []);

  return (
    <View className='address-page'>
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
    </View>
  );
};

export default ReferralIndex;
