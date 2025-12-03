import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCard } from '../../types';
import './redeem.scss';

const getBalanceNumber = (balance: string | null) => Number(balance ?? 0);

const GiftCardRedeem = () => {
  const params = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const presetCard = params.card as string | undefined;
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>(presetCard || '');
  const [loading, setLoading] = useState(true);
  const [redeemingCard, setRedeemingCard] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await giftCardService.listMine();
      setCards(data);
      if (presetCard && data.some((card) => card.card_number === presetCard)) {
        setSelectedCard(presetCard);
      } else if (data.length > 0) {
        setSelectedCard(data[0].card_number);
      }
    } catch (error) {
      console.error('获取礼品卡失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [presetCard]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const eligibleCards = useMemo(
    () =>
      cards.filter(
        (card) => card.status === 'active' && getBalanceNumber(card.balance) > 0 && card.share_state !== 'consumed'
      ),
    [cards]
  );

  useEffect(() => {
    if (eligibleCards.length === 0) {
      setSelectedCard('');
      return;
    }
    const cardInList = eligibleCards.find((card) => card.card_number === selectedCard);
    if (!cardInList) {
      setSelectedCard(eligibleCards[0].card_number);
    }
  }, [eligibleCards, selectedCard]);

  const handleRedeem = async (card: GiftCard) => {
    if (redeemingCard) return;

    try {
      setRedeemingCard(card.card_number);
      const result = await giftCardService.redeem(card.card_number);
      Taro.showToast({ title: '已创建配送订单', icon: 'success' });
      const redirectOrderId = (result as any)?.order_id;
      setTimeout(() => {
        if (redirectOrderId) {
          Taro.redirectTo({ url: `/pages/order/order-confirm?orderId=${redirectOrderId}&from=giftcard_self` });
        } else {
          Taro.redirectTo({ url: '/pages/order/list?filter=giftcard' });
        }
      }, 600);
    } catch (error) {
      console.error('提交兑换失败', error);
      Taro.showToast({ title: '兑换失败，请稍后再试', icon: 'none' });
    } finally {
      setRedeemingCard(null);
    }
  };

  if (loading) {
    return <View className='giftcard-redeem-page loading-state'>加载中...</View>;
  }

  if (eligibleCards.length === 0) {
    return (
      <View className='giftcard-redeem-page'>
        <View className='empty-card'>
          <Text className='empty-title'>暂无可兑换的礼品卡</Text>
          <Text className='empty-desc'>请先购买或领取礼品卡，或等待新卡入账。</Text>
        </View>
        <Button className='back-btn' onClick={() => Taro.navigateTo({ url: '/pages/shopping-card/templates' })}>
          去购卡
        </Button>
      </View>
    );
  }

  return (
    <View className='giftcard-redeem-page'>
      <View className='redeem-tip'>
        <Text className='tip-title'>兑换说明</Text>
        <Text className='tip-text'>点击任意购物卡，即为该卡创建 0 元订单。</Text>
        <Text className='tip-text'>在订单确认页填写收货地址即可完成兑换，无需额外付款。</Text>
      </View>

      <View className='card-selector'>
        <Text className='section-title'>选择礼品卡</Text>
        {eligibleCards.map((card) => {
          const processing = redeemingCard === card.card_number;
          return (
            <View
              key={card.card_number}
              className={`card-item ${selectedCard === card.card_number ? 'selected' : ''} ${processing ? 'processing' : ''}`}
              onClick={() => {
                setSelectedCard(card.card_number);
                handleRedeem(card);
              }}
            >
              <View className='card-basic'>
                <Text className='card-name'>{card.template_name || '礼品卡'}</Text>
                <Text className='card-balance'>余额 ¥{card.balance ?? '--'}</Text>
              </View>
              <Text className='card-number'>卡号：{card.card_number}</Text>
              <View className='card-footer'>
                <Text className='card-expire'>有效期：{card.expires_at || '长期有效'}</Text>
                <Text className='card-status'>点击立即兑换</Text>
              </View>
              <View className='card-action'>
                <Text>{processing ? '创建订单中...' : '去填写收货地址'}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default GiftCardRedeem;
