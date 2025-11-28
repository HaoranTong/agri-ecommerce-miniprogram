import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { orderService } from '../../services/api';
import type { OrderDetail } from '../../types';
import './order-confirm.scss';

// 订单状态翻译
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '待支付',
    'processing': '处理中',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunded': '已退款',
    'failed': '失败'
  };
  return statusMap[status] || status;
};

const OrderConfirm = () => {
  const pageParams = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const orderId = useMemo(() => {
    const id = pageParams.orderId || pageParams.id || '';
    return id;
  }, [pageParams]);
  const fromParam = pageParams.from as string | undefined;
  const isGiftCardOrder = Boolean(fromParam && fromParam.startsWith('giftcard'));
  const giftcardFlowText = useMemo(() => {
    if (!isGiftCardOrder || !fromParam) return '礼品卡订单';
    if (fromParam === 'giftcard_bundle') return '固定组合礼品卡订单';
    if (fromParam === 'giftcard_custom') return '任意组合礼品卡订单';
    if (fromParam === 'giftcard_stored_value') return '储值卡订单';
    return '礼品卡订单';
  }, [fromParam, isGiftCardOrder]);
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      const data = await orderService.getOrderDetail(orderId);
      setOrder(data);
    } catch (error) {
      console.error('获取订单失败', error);
      Taro.showToast({ title: '获取订单失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return <View className='loading'>加载中...</View>;
  }

  if (!order) {
    return (
      <View className='order-confirm-page'>
        <View className='empty-state'>未找到订单信息</View>
      </View>
    );
  }

  return (
    <View className='order-confirm-page'>
      <Text className='page-title'>请确认订单信息</Text>

      {/* 商品信息 */}
      <View className='card'>
        <Text className='card-title'>商品信息</Text>
        {order.items && order.items.map((item: any, index: number) => (
          <View key={index} className='product-item'>
            <View className='product-info'>
              <Text className='product-name'>{item.product_name}</Text>
              <Text className='product-spec'>{item.variation_name}</Text>
            </View>
            <View className='product-price-qty'>
              <Text className='price'>¥{item.price}</Text>
              <Text className='quantity'>x{item.quantity}</Text>
            </View>
          </View>
        ))}
        <View className='total-row'>
          <Text className='label'>订单总额</Text>
          <Text className='amount'>¥{order.total}</Text>
        </View>
      </View>

      {/* 订单信息 */}
      <View className='card'>
        <Text className='card-title'>订单信息</Text>
        <View className='info-row'>
          <Text className='label'>订单号</Text>
          <Text className='value'>{order.order_number}</Text>
        </View>
        <View className='info-row'>
          <Text className='label'>支付状态</Text>
          <Text className='value status'>{getStatusText(order.status)}</Text>
        </View>
      </View>

      {/* 礼品卡提示 */}
      {isGiftCardOrder && (
        <View className='giftcard-hint-card'>
          <Text className='hint-title'>{giftcardFlowText}温馨提示</Text>
          <Text className='hint-item'>1. 该订单无需填写收货地址，支付审核通过后系统会自动生成礼品卡。</Text>
          <Text className='hint-item'>2. 礼品卡将投放到“我的礼品卡”，可随时查看卡号/PIN 并分享。</Text>
          <Text className='hint-item'>3. 有任何问题可在支付凭证备注受赠人信息，方便客服处理。</Text>
          <View className='hint-actions'>
            <Button
              className='hint-btn secondary'
              onClick={() => Taro.navigateTo({ url: '/pages/giftcard/templates' })}
            >
              查看其他礼品卡
            </Button>
            <Button
              className='hint-btn'
              onClick={() => Taro.navigateTo({ url: '/pages/giftcard/mine' })}
            >
              我的礼品卡
            </Button>
          </View>
        </View>
      )}

      {/* 收货信息 */}
      {!isGiftCardOrder && (
        <View className='card'>
          <Text className='card-title'>收货信息</Text>
          <View className='info-row'>
            <Text className='label'>收件人</Text>
            <Text className='value'>{order.shipping_address?.name || '-'}</Text>
          </View>
          <View className='info-row'>
            <Text className='label'>联系方式</Text>
            <Text className='value'>{order.shipping_address?.phone || '-'}</Text>
          </View>
          <View className='info-row'>
            <Text className='label'>收货地址</Text>
            <Text className='value address'>
              {order.shipping_address ?
                `${order.shipping_address.province} ${order.shipping_address.city} ${order.shipping_address.district} ${order.shipping_address.detail_address}`
                : '-'}
            </Text>
          </View>
        </View>
      )}

      {/* 操作按钮 */}
      <View className='action-buttons'>
        <Button className='modify-btn' onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}>
          修改订单
        </Button>
        {!isGiftCardOrder && (
          <Button className='modify-btn' onClick={() => Taro.navigateBack()}>
            修改收货地址
          </Button>
        )}
        <Button 
          className='pay-btn' 
          onClick={() => Taro.redirectTo({ url: `/pages/order/payment?orderId=${order.order_id}` })}
        >
          去支付
        </Button>
      </View>
    </View>
  );
};

export default OrderConfirm;
