import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { pointsService } from '../../services/api';
import type { PointsRedeemOption } from '../../types';
import './redeem.scss';

const PointsRedeem = () => {
  const [options, setOptions] = useState<PointsRedeemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const data = await pointsService.getRedeemOptions();
      setOptions(data);
    } catch (error) {
      console.error('获取积分兑换选项失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const handleRedeem = async (optionId: string) => {
    try {
      setRedeeming(optionId);
      const result = await pointsService.redeem(optionId);
      const toastText = result.coupon_code
        ? `兑换成功，券码 ${result.coupon_code}`
        : result.gift_card_number
          ? `兑换成功，卡号 ${result.gift_card_number}`
          : '兑换成功';
      Taro.showToast({ title: toastText, icon: 'success', duration: 2500 });
      await loadOptions();
    } catch (error) {
      console.error('积分兑换失败', error);
      Taro.showToast({ title: '兑换失败', icon: 'none' });
    } finally {
      setRedeeming(null);
    }
  };

  const renderStatus = (option: PointsRedeemOption) => {
    if (option.status === 'coming_soon') return '即将上线';
    if (option.status === 'sold_out') return '已兑完';
    return '可兑换';
  };

  return (
    <View className="points-redeem-page">
      {loading && options.length === 0 ? (
        <View className="page-state">加载中...</View>
      ) : options.length === 0 ? (
        <View className="page-state">暂无可兑换内容</View>
      ) : (
        options.map((option) => (
          <View className="redeem-card" key={option.option_id}>
            <View className="redeem-header">
              <Text className="redeem-title">{option.title}</Text>
              <Text className={`redeem-status ${option.status}`}>
                {renderStatus(option)}
              </Text>
            </View>
            <Text className="redeem-type">类型：{option.type}</Text>
            {option.description && (
              <Text className="redeem-desc">{option.description}</Text>
            )}
            <Text className="redeem-cost">所需积分：{option.cost_points}</Text>
            {option.stock !== null && option.stock !== undefined && (
              <Text className="redeem-stock">剩余库存：{option.stock}</Text>
            )}
            <Button
              className="redeem-btn"
              loading={redeeming === option.option_id}
              disabled={option.status !== 'active' || redeeming === option.option_id}
              onClick={() => handleRedeem(option.option_id)}
            >
              立即兑换
            </Button>
          </View>
        ))
      )}
    </View>
  );
};

export default PointsRedeem;
