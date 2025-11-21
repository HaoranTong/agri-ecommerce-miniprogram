import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import PaymentModal from '../../components/PaymentModal';
import { orderService } from '../../services/api';
import type { OrderDetail as OrderDetailType } from '../../types';
import './detail.scss';

const OrderDetail = () => {
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const orderId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    return params.id || params.orderId || '';
  }, []);

  const loadOrderDetail = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      const data = await orderService.getOrderDetail(orderId);
      setOrder(data);
    } catch (error) {
      console.error('加载订单详情失败', error);
      Taro.showToast({ title: '加载订单失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, []);

  if (loading) {
    return <View className="loading">订单加载中...</View>;
  }

  if (!order) {
    return <View className="loading">未找到该订单</View>;
  }

  return (
    <View className="order-detail-page">
      <View className="card">
        <Text className="section-title">订单信息</Text>
        <View className="info-row">
          <Text>订单号</Text>
          <Text>{order.order_number}</Text>
        </View>
        <View className="info-row">
          <Text>状态</Text>
          <Text>{order.status}</Text>
        </View>
        <View className="info-row total">
          <Text>总计</Text>
          <Text>¥{order.total}</Text>
        </View>
      </View>

      {order.items?.map((item) => (
        <View className="card" key={item.variation_id}>
          <Text className="section-title">商品</Text>
          <View className="info-row">
            <Text>名称</Text>
            <Text>{item.product_name}</Text>
          </View>
          <View className="info-row">
            <Text>规格</Text>
            <Text>{item.variation_name}</Text>
          </View>
          <View className="info-row">
            <Text>数量</Text>
            <Text>{item.quantity}</Text>
          </View>
          <View className="info-row">
            <Text>小计</Text>
            <Text>¥{item.price}</Text>
          </View>
        </View>
      ))}

      <Button className="pay-btn" onClick={() => setShowPaymentModal(true)}>
        查看付款指引
      </Button>

      <PaymentModal
        isOpen={showPaymentModal}
        orderId={order.order_id}
        paymentQrUrl={order.payment_qr_url}
        customerServiceQr={order.customer_service_qr}
        onClose={() => setShowPaymentModal(false)}
        onUploaded={loadOrderDetail}
      />
    </View>
  );
};

export default OrderDetail;