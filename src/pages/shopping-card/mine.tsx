import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCard } from '../../types';
import Skeleton from '../../components/Skeleton';
import './mine.scss';

const QUICK_ACTIONS = [
  {
    key: 'manage',
    icon: '📇',
    label: '管理购物卡',
    desc: '查看全部卡片和操作',
    url: '/pages/shopping-card/manage'
  },
  {
    key: 'redeem',
    icon: '🎁',
    label: '购物卡兑换商品',
    desc: '立即兑换成实物',
    url: '/pages/shopping-card/redeem'
  },
  {
    key: 'purchase',
    icon: '💳',
    label: '购买购物卡',
    desc: '自用或赠送好友',
    url: '/pages/shopping-card/templates'
  },
  {
    key: 'share',
    icon: '🤝',
    label: '分享 / 赠送购物卡',
    desc: '生成二维码或打印卡',
    url: '/pages/shopping-card/share-list'
  }
];

const resolveCardAmount = (card: GiftCard) => {
  const candidates = [
    card.balance,
    card.initial_amount,
    card.card_snapshot?.balance,
    card.card_snapshot?.initial_amount
  ];

  const prioritized = candidates.find((value) => {
    if (value === null || value === undefined) return false;
    const num = Number(value);
    return !Number.isNaN(num) && num > 0;
  }) ?? candidates.find((value) => value !== null && value !== undefined);

  return prioritized ? Number(prioritized).toFixed(2) : null;
};

const GiftCardMine = () => {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightBanner, setHighlightBanner] = useState(false);

  const shouldHighlight = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    return params.highlight === 'new';
  }, []);

  const fetchCards = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const data = await giftCardService.listMine();
      setCards(data);
    } catch (error) {
      console.error('获取购物卡失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useDidShow(() => {
    fetchCards(false);
    if (shouldHighlight) {
      setHighlightBanner(true);
      Taro.showToast({ title: '购物卡已到账', icon: 'success' });
    }
  });

  const totalAmount = useMemo(() => {
    return cards.reduce((sum, card) => {
      const amount = resolveCardAmount(card);
      return sum + (amount ? Number(amount) : 0);
    }, 0);
  }, [cards]);

  if (loading) {
    return (
      <View className='giftcard-mine-page'>
        <View className='skeleton-section'>
          <Skeleton type='card' count={3} />
        </View>
      </View>
    );
  }

  if (!cards.length) {
    return (
      <View className='giftcard-mine-page'>
        <View className='summary-card'>
          <Text className='summary-title'>我的购物卡</Text>
          <View className='summary-stats'>
            <View className='stat'>
              <Text className='stat-value'>0</Text>
              <Text className='stat-label'>持有张数</Text>
            </View>
            <View className='stat'>
              <Text className='stat-value'>¥0.00</Text>
              <Text className='stat-label'>合计面值</Text>
            </View>
          </View>
        </View>

        <View className='empty-block'>
          <Text className='empty-title'>暂无购物卡</Text>
          <Text className='empty-desc'>赶快去购买一张，送礼或自用都可以</Text>
        </View>

        <View className='quick-actions'>
          {QUICK_ACTIONS.map((action) => (
            <View
              className='quick-item'
              key={action.key}
              onClick={() => Taro.navigateTo({ url: action.url })}
            >
              <View className='quick-icon'>{action.icon}</View>
              <View className='quick-info'>
                <Text className='quick-label'>{action.label}</Text>
                <Text className='quick-desc'>{action.desc}</Text>
              </View>
              <Text className='quick-arrow'>→</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className='giftcard-mine-page'>
      <View className='summary-card'>
        <View>
          <Text className='summary-subtitle'>资产概览</Text>
          <Text className='summary-title'>我的购物卡</Text>
        </View>
        <View className='summary-stats'>
          <View className='stat'>
            <Text className='stat-value'>{cards.length}</Text>
            <Text className='stat-label'>持有张数</Text>
          </View>
          <View className='stat'>
            <Text className='stat-value'>¥{totalAmount.toFixed(2)}</Text>
            <Text className='stat-label'>合计面值</Text>
          </View>
        </View>
      </View>

      <View className='quick-actions'>
        {QUICK_ACTIONS.map((action) => (
          <View
            className='quick-item'
            key={action.key}
            onClick={() => Taro.navigateTo({ url: action.url })}
          >
            <View className='quick-icon'>{action.icon}</View>
            <View className='quick-info'>
              <Text className='quick-label'>{action.label}</Text>
              <Text className='quick-desc'>{action.desc}</Text>
            </View>
            <Text className='quick-arrow'>→</Text>
          </View>
        ))}
      </View>

      {highlightBanner && (
        <View className='giftcard-highlight' onClick={() => setHighlightBanner(false)}>
          <Text className='highlight-title'>🎉 新购物卡已发放</Text>
          <Text className='highlight-text'>已自动入账，可直接分享或自用。</Text>
        </View>
      )}
      <View className='manage-redirect'>
        <Text className='redirect-title'>全部购物卡已同步到管理页</Text>
        <Text className='redirect-desc'>在“管理购物卡”中查看详细权益、分享记录与兑换状态。</Text>
        <Button
          className='redirect-btn'
          onClick={() => Taro.navigateTo({ url: '/pages/shopping-card/manage' })}
        >
          打开管理购物卡
        </Button>
      </View>
    </View>
  );
};

export default GiftCardMine;
