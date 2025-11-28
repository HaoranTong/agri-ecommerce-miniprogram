import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { pointsService } from '../../services/api';
import type { PointsRule } from '../../types';
import './rules.scss';

const PointsRules = () => {
  const [rules, setRules] = useState<PointsRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await pointsService.getRules();
      setRules(data);
    } catch (error) {
      console.error('获取积分规则失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  return (
    <View className='points-rules-page'>
      {loading && rules.length === 0 ? (
        <View className='page-state'>加载中...</View>
      ) : rules.length === 0 ? (
        <View className='page-state'>暂无积分规则</View>
      ) : (
        rules.map((rule) => (
          <View className='rule-card' key={rule.rule_id}>
            <Text className='rule-title'>{rule.title}</Text>
            <Text className='rule-desc'>{rule.description}</Text>
            <Text className={`rule-status ${rule.status}`}>
              {rule.status === 'active' ? '生效中' : '已下线'}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

export default PointsRules;
