import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import PaymentModal from '../../components/PaymentModal';
import { orderService } from '../../services/api';
import type { OrderDetail } from '../../types';
import './detail.scss';

const OrderConfirm = () => {
  const orderId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    return params.orderId || params.id || '';
  }, []);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
    return <View className="loading">未找到订单信息</View>;
  }

  return (
    <View className="order-detail-page">
      <View className="card">
        <Text className="section-title">订单创建成功</Text>
        <View className="info-row">
          <Text>订单号</Text>
          <Text>{order.order_number}</Text>
        </View>
        <View className="info-row">
          <Text>支付状态</Text>
          <Text>{order.status}</Text>
        </View>
        <View className="info-row total">
          <Text>应付金额</Text>
          <Text>¥{order.total}</Text>
        </View>
      </View>

      <Button className="pay-btn" onClick={() => setShowPaymentModal(true)}>
        查看付款二维码
      </Button>

      <Button
        className="close-btn"
        onClick={() => Taro.redirectTo({ url: `/pages/order/detail?id=${order.order_id}` })}
      >
        查看订单详情
      </Button>

      <PaymentModal
        isOpen={showPaymentModal}
        orderId={order.order_id}
        paymentQrUrl={order.payment_qr_url}
        customerServiceQr={order.customer_service_qr}
        onClose={() => setShowPaymentModal(false)}
      />
    </View>
  );
};

export default OrderConfirm;
