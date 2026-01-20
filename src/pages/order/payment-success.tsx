import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { orderService } from '../../services/api';
import type { OrderDetail } from '../../types';
import './payment-success.scss';

// 订单状态翻译
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '待支付',
    processing: '待发货',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
    failed: '支付失败'
  };
  return statusMap[status] || status;
};

const PaymentSuccess = () => {
  const orderId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    return params.orderId || params.id || '';
  }, []);
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    loadOrder();
  }, [orderId]);

  const handleContactService = () => {
    if (order?.customer_service_qr) {
      Taro.previewImage({
        urls: [order.customer_service_qr],
        current: order.customer_service_qr
      });
    } else {
      Taro.showToast({ title: '客服二维码未配置', icon: 'none' });
    }
  };

  const handleViewOrders = () => {
    Taro.navigateTo({ url: '/pages/order/list' });
  };

  if (loading) {
    return <View className='payment-success-page loading'>加载中...</View>;
  }

  if (!order) {
    return (
      <View className='payment-success-page'>
        <View className='empty-state'>未找到订单信息</View>
      </View>
    );
  }

  return (
    <View className='payment-success-page'>
      {/* 成功提示 - 压缩为两行 */}
      <View className='success-header'>
        <Text className='success-title'>支付成功 • 已完成扣款</Text>
      </View>

      {/* 订单信息卡片 */}
      <View className='card'>
        <Text className='card-title'>订单信息</Text>
        <View className='info-row'>
          <Text className='label'>订单号：</Text>
          <Text className='value'>{order.order_number}</Text>
        </View>
        <View className='info-row'>
          <Text className='label'>订单状态：</Text>
          <Text className='value status'>{getStatusText(order.status)}</Text>
        </View>
        <View className='info-row'>
          <Text className='label'>订单金额：</Text>
          <Text className='value amount'>¥{order.total}</Text>
        </View>
      </View>

      {/* 收货信息卡片 */}
      {order.shipping_address && (
        <View className='card'>
          <Text className='card-title'>收货信息</Text>
          <View className='info-row'>
            <Text className='label'>收件人：</Text>
            <Text className='value'>{order.shipping_address.name}</Text>
          </View>
          <View className='info-row'>
            <Text className='label'>联系电话：</Text>
            <Text className='value'>{order.shipping_address.phone}</Text>
          </View>
          <View className='info-row'>
            <Text className='label'>收货地址：</Text>
            <Text className='value address'>
              {order.shipping_address.province}
              {order.shipping_address.city}
              {order.shipping_address.district}
              {order.shipping_address.detail_address}
            </Text>
          </View>
        </View>
      )}

      {/* 温馨提示 */}
      <View className='tips-card'>
        <Text className='tips-title'>💡 温馨提示</Text>
        <View className='tips-list'>
          <Text className='tips-item'>• 订单已支付成功，商家将尽快安排发货</Text>
          <Text className='tips-item'>• 可在&quot;订单&quot;页面查看物流信息</Text>
          <Text className='tips-item'>• 如需修改收货信息，请立即联系客服</Text>
        </View>
      </View>

      {/* 操作按钮 */}
      <View className='action-buttons'>
        <Button className='primary-btn' onClick={handleContactService}>
          联系客服
        </Button>
        <Button className='secondary-btn' onClick={handleViewOrders}>
          查看订单
        </Button>
      </View>
    </View>
  );
};

export default PaymentSuccess;
