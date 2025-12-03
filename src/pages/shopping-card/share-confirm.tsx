import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';

import { giftCardService, orderService } from '../../services/api';
import type { GiftCard, OrderDetail } from '../../types';
import './share-confirm.scss';

// iOS 兼容的日期格式化函数
const formatDate = (value?: string | null) => {
  if (!value) return '长期有效';
  try {
    // iOS 兼容：将 "yyyy-MM-dd HH:mm:ss" 格式转换为 "yyyy-MM-ddTHH:mm:ss"
    const isoValue = value.replace(' ', 'T');
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  } catch (error) {
    console.error('时间格式化失败', error);
    return value;
  }
};

const GiftCardShareConfirm = () => {
  const router = useRouter();
  const cardNumber = (router?.params?.card as string) || '';
  const [card, setCard] = useState<GiftCard | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!cardNumber) {
      Taro.showToast({ title: '购物卡号缺失', icon: 'none' });
      Taro.navigateBack();
      return;
    }

    setLoading(true);
    try {
      // 获取购物卡信息
      const cards = await giftCardService.listMine();
      const foundCard = cards.find((c) => c.card_number === cardNumber);
      if (!foundCard) {
        Taro.showToast({ title: '购物卡不存在', icon: 'none' });
        Taro.navigateBack();
        return;
      }
      setCard(foundCard);

      // 获取订单详情
      const orderId = foundCard.purchase_order_id;
      if (orderId) {
        try {
          const orderData = await orderService.getOrderDetail(orderId);
          setOrder(orderData);
        } catch (error) {
          console.error('获取订单详情失败', error);
          // 订单获取失败不影响继续分享
        }
      }
    } catch (error) {
      console.error('加载数据失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [cardNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirm = () => {
    if (!card) return;
    // 跳转到分享设置页
    Taro.navigateTo({
      url: `/pages/shopping-card/share-setup?card=${card.card_number}`
    });
  };

  const handleBack = () => {
    Taro.navigateBack();
  };

  if (loading) {
    return (
      <View className='share-confirm-page loading-state'>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View className='share-confirm-page'>
        <View className='error-state'>
          <Text>购物卡不存在</Text>
          <Button className='back-btn' onClick={handleBack}>
            返回
          </Button>
        </View>
      </View>
    );
  }

  const balanceValue = card.balance ?? '0.00';
  const templateName = card.template_name || '购物卡';

  return (
    <View className='share-confirm-page'>
      <View className='card-summary'>
        <View className='summary-header'>
          <Text className='summary-title'>{templateName}</Text>
          <Text className='summary-balance'>¥{balanceValue}</Text>
        </View>
        <View className='summary-info'>
          <Text className='info-item'>卡号：{card.card_number}</Text>
          {card.expires_at && (
            <Text className='info-item'>有效期：{formatDate(card.expires_at)}</Text>
          )}
        </View>
      </View>

      {order && (
        <View className='order-details'>
          <View className='details-header'>
            <Text className='details-title'>订单详情</Text>
            <Text className='order-number'>订单号：#{order.order_number}</Text>
          </View>

          {order.items && order.items.length > 0 && (
            <View className='order-items'>
              {order.items.map((item, index) => (
                <View key={index} className='order-item'>
                  <View className='item-info'>
                    <Text className='item-name'>{item.product_name}</Text>
                    {item.variation_name && (
                      <Text className='item-variation'>{item.variation_name}</Text>
                    )}
                    <Text className='item-quantity'>×{item.quantity}</Text>
                  </View>
                  <Text className='item-price'>¥{item.price}</Text>
                </View>
              ))}
            </View>
          )}

          <View className='order-totals'>
            {order.original_total && (
              <View className='total-row'>
                <Text className='total-label'>商品金额</Text>
                <Text className='total-value'>¥{order.original_total}</Text>
              </View>
            )}
            {order.discount_total && Number(order.discount_total) > 0 && (
              <View className='total-row'>
                <Text className='total-label'>优惠金额</Text>
                <Text className='total-value discount'>-¥{order.discount_total}</Text>
              </View>
            )}
            {order.points_usage && order.points_usage.points_used > 0 && (
              <View className='total-row'>
                <Text className='total-label'>积分抵扣</Text>
                <Text className='total-value discount'>-¥{order.points_usage.discount_amount}</Text>
              </View>
            )}
            <View className='total-row final'>
              <Text className='total-label'>实付金额</Text>
              <Text className='total-value final'>¥{order.total}</Text>
            </View>
          </View>
        </View>
      )}

      <View className='action-buttons'>
        <Button className='btn btn-back' onClick={handleBack}>
          返回
        </Button>
        <Button className='btn btn-confirm' onClick={handleConfirm}>
          确认分享
        </Button>
      </View>
    </View>
  );
};

export default GiftCardShareConfirm;

