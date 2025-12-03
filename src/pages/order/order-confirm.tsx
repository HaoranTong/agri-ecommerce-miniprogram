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
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const derivedGiftcardMode = useMemo(() => {
    if (order?.giftcard_mode) {
      return order.giftcard_mode;
    }
    if (fromParam && fromParam.startsWith('giftcard')) {
      return fromParam;
    }
    return '';
  }, [order?.giftcard_mode, fromParam]);

  const isGiftCardOrder = useMemo(() => {
    if (order?.is_gift_card_order) {
      return true;
    }
    return derivedGiftcardMode !== '';
  }, [order?.is_gift_card_order, derivedGiftcardMode]);

  const giftcardFlowText = useMemo(() => {
    if (!isGiftCardOrder) return '购物卡订单';
    switch (derivedGiftcardMode) {
      case 'giftcard_bundle':
        return '固定组合购物卡订单';
      case 'giftcard_custom':
        return '任意组合购物卡订单';
      case 'giftcard_stored_value':
        return '储值购物卡订单';
      default:
        return '购物卡订单';
    }
  }, [derivedGiftcardMode, isGiftCardOrder]);

  const toNumber = (value?: string | number | null) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

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

  const goodsTotal = toNumber(order.original_total ?? order.total);
  const payableTotal = toNumber(order.total);
  const couponDiscount = order.coupon_info ? toNumber(order.coupon_info.discount_amount) : 0;
  const pointsUsed = order.points_usage?.points_used ?? 0;
  const pointsDiscountAmount = toNumber(order.points_usage?.discount_amount);
  const hasPointsDiscount = pointsUsed > 0 && pointsDiscountAmount > 0;

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
          <Text className='label'>商品金额</Text>
          <Text className='amount'>¥{goodsTotal.toFixed(2)}</Text>
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
        {order.coupon_info && couponDiscount > 0 && (
          <View className='info-row'>
            <Text className='label'>优惠券</Text>
            <Text className='value discount'>-¥{couponDiscount.toFixed(2)}</Text>
          </View>
        )}
        {hasPointsDiscount && (
          <View className='info-row'>
            <Text className='label'>积分抵扣</Text>
            <Text className='value discount'>
              -¥{pointsDiscountAmount.toFixed(2)}（{pointsUsed} 积分）
            </Text>
          </View>
        )}
        <View className='info-row total'>
          <Text className='label'>应付金额</Text>
          <Text className='value amount'>¥{payableTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* 购物卡提示 */}
      {isGiftCardOrder && (
        <View className='giftcard-hint-card'>
          <Text className='hint-title'>{giftcardFlowText}温馨提示</Text>
          <Text className='hint-item'>1. 审核通过后，购物卡会自动保存到“我的购物卡”，无需再填写收货地址。</Text>
          <Text className='hint-item'>2. 卡片会绑定当前账号，可在购物卡中心随时分享、转赠或兑换。</Text>
          <Text className='hint-item'>3. 兑换商品时填写收货信息即可生成 0 元订单，无需再次上传支付凭证。</Text>
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
      {isGiftCardOrder ? (
        <View className='action-buttons triple'>
          <Button className='nav-btn' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            首页
          </Button>
          <Button className='nav-btn' onClick={() => Taro.navigateTo({ url: '/pages/shopping-card/mine' })}>
            购物卡
          </Button>
          <Button className='nav-btn' onClick={() => Taro.switchTab({ url: '/pages/user/profile' })}>
            我的
          </Button>
        </View>
      ) : (
        <View className='action-buttons'>
          <Button className='modify-btn' onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}>
            修改订单
          </Button>
          <Button className='modify-btn' onClick={() => Taro.navigateBack()}>
            修改收货地址
          </Button>
          <Button
            className='pay-btn'
            onClick={() => Taro.redirectTo({ url: `/pages/order/payment?orderId=${order.order_id}` })}
          >
            去支付
          </Button>
        </View>
      )}
    </View>
  );
};

export default OrderConfirm;
