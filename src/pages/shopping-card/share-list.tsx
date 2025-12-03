import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCard } from '../../types';
import './share-list.scss';

const getBalanceNumber = (balance: string | null) => Number(balance ?? 0);

const GiftCardShareList = () => {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  const isShareableCard = useCallback(
    (card: GiftCard) => {
      // 可分享的条件：状态为active、余额大于0、未分享、未兑换
      return card.status === 'active' 
        && getBalanceNumber(card.balance) > 0 
        && card.share_state !== 'consumed'
        && card.share_state !== 'shared'; // 已分享的不能再次分享
    },
    []
  );

  const shareableCards = useMemo(
    () => cards.filter((card) => isShareableCard(card)),
    [cards, isShareableCard]
  );

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await giftCardService.listMine();
      setCards(data);
    } catch (error) {
      console.error('获取购物卡列表失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleSelectCard = (card: GiftCard) => {
    // 跳转到订单详情确认页
    Taro.navigateTo({
      url: `/pages/shopping-card/share-confirm?card=${card.card_number}`
    });
  };

  if (loading) {
    return (
      <View className='share-list-page loading-state'>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (shareableCards.length === 0) {
    return (
      <View className='share-list-page'>
        <View className='empty-state'>
          <Text className='empty-text'>暂无可分享的购物卡</Text>
          <Text className='empty-desc'>已购卡需等待审核激活或解除锁定后才能分享，可前往&ldquo;管理购物卡&rdquo;查看状态。</Text>
          <Button
            className='empty-btn'
            onClick={() => Taro.navigateTo({ url: '/pages/shopping-card/manage' })}
          >
            去管理购物卡
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className='share-list-page'>
      <View className='page-header'>
        <Text className='page-title'>选择要分享的购物卡</Text>
        <Text className='page-subtitle'>点击任意卡片查看详情并确认分享</Text>
      </View>

      <View className='card-list'>
        {shareableCards.map((card) => {
          const balanceValue = card.balance ?? '--';
          const templateName = card.template_name || '购物卡';
          return (
            <View
              key={card.card_number}
              className='card-item'
              onClick={() => handleSelectCard(card)}
            >
              <View className='card-header'>
                <Text className='card-name'>{templateName}</Text>
                <Text className='card-balance'>¥{balanceValue}</Text>
              </View>
              <View className='card-footer'>
                <Text className='card-number'>卡号：{card.card_number}</Text>
                <Text className='card-arrow'>›</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default GiftCardShareList;

