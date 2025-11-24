import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCard } from '../../types';
import '../address/address.scss';

const GiftCardMine = () => {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCards = async () => {
    try {
      const data = await giftCardService.listMine();
      setCards(data);
    } catch (error) {
      console.error('获取购物卡失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  if (loading) {
    return <View className="address-page">购物卡加载中...</View>;
  }

  if (!cards.length) {
    return (
      <View className="address-page">
        <View className="empty">暂无绑定购物卡</View>
        <View className="action-buttons">
          <Button className="add-btn" onClick={() => Taro.navigateTo({ url: '/pages/giftcard/redeem' })}>
            兑换购物卡
          </Button>
          <Button className="add-btn secondary" onClick={() => Taro.navigateTo({ url: '/pages/giftcard/claim' })}>
            领取礼品卡
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="address-page">
      <View className="address-list">
        {cards.map((card) => (
          <View className="address-card" key={card.card_number}>
            <View className="address-main">
              <Text className="address-name">{card.template_name}</Text>
              <Text className="address-phone">余额 ¥{card.balance}</Text>
            </View>
            <Text className="address-detail">卡号：{card.card_number}</Text>
            <Text className="address-detail">有效期至：{card.expires_at}</Text>
            <Text className="address-detail">状态：{card.status}</Text>
            <View className="card-actions">
              {card.status === 'active' && parseFloat(card.balance) > 0 && (
                <Button
                  className="action-btn"
                  onClick={() => Taro.navigateTo({ url: '/pages/giftcard/share' })}
                >
                  分享
                </Button>
              )}
              {card.can_reset_pin && (
                <Button
                  className="action-btn"
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages/giftcard/redeem?card=${card.card_number}`
                    })
                  }
                >
                  重置密码
                </Button>
              )}
            </View>
          </View>
        ))}
      </View>

      <View className="action-buttons">
        <Button className="add-btn" onClick={() => Taro.navigateTo({ url: '/pages/giftcard/redeem' })}>
          兑换新购物卡
        </Button>
        <Button className="add-btn secondary" onClick={() => Taro.navigateTo({ url: '/pages/giftcard/claim' })}>
          领取礼品卡
        </Button>
      </View>
    </View>
  );
};

export default GiftCardMine;
