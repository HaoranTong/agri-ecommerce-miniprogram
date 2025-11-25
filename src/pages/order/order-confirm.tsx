import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

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
  const orderId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const id = params.orderId || params.id || '';
    return id;
  }, []);
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
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
  };

  useEffect(() => {
    loadOrder();
  }, []);

  if (loading) {
    return <View className="loading">加载中...</View>;
  }

  if (!order) {
    return (
      <View className="order-confirm-page">
        <View className="empty-state">未找到订单信息</View>
      </View>
    );
  }

  return (
    <View className="order-confirm-page">
      <Text className="page-title">请确认订单信息</Text>

      {/* 商品信息 */}
      <View className="card">
        <Text className="card-title">商品信息</Text>
        {order.items && order.items.map((item: any, index: number) => (
          <View key={index} className="product-item">
            <View className="product-info">
              <Text className="product-name">{item.product_name}</Text>
              <Text className="product-spec">{item.variation_name}</Text>
            </View>
            <View className="product-price-qty">
              <Text className="price">¥{item.price}</Text>
              <Text className="quantity">x{item.quantity}</Text>
            </View>
          </View>
        ))}
        <View className="total-row">
          <Text className="label">订单总额</Text>
          <Text className="amount">¥{order.total}</Text>
        </View>
      </View>

      {/* 订单信息 */}
      <View className="card">
        <Text className="card-title">订单信息</Text>
        <View className="info-row">
          <Text className="label">订单号</Text>
          <Text className="value">{order.order_number}</Text>
        </View>
        <View className="info-row">
          <Text className="label">支付状态</Text>
          <Text className="value status">{getStatusText(order.status)}</Text>
        </View>
      </View>

      {/* 收货信息 */}
      <View className="card">
        <Text className="card-title">收货信息</Text>
        <View className="info-row">
          <Text className="label">收件人</Text>
          <Text className="value">{order.shipping_address?.name || '-'}</Text>
        </View>
        <View className="info-row">
          <Text className="label">联系方式</Text>
          <Text className="value">{order.shipping_address?.phone || '-'}</Text>
        </View>
        <View className="info-row">
          <Text className="label">收货地址</Text>
          <Text className="value address">
            {order.shipping_address ? 
              `${order.shipping_address.province} ${order.shipping_address.city} ${order.shipping_address.district} ${order.shipping_address.detail_address}` 
              : '-'}
          </Text>
        </View>
      </View>

      {/* 操作按钮 */}
      <View className="action-buttons">
        <Button className="modify-btn" onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}>
          修改订单
        </Button>
        <Button className="modify-btn" onClick={() => Taro.navigateBack()}>
          修改收货地址
        </Button>
        <Button 
          className="pay-btn" 
          onClick={() => Taro.redirectTo({ url: `/pages/order/payment?orderId=${order.order_id}` })}
        >
          去支付
        </Button>
      </View>
    </View>
  );
};

export default OrderConfirm;
