import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { orderService } from '../../services/api';
import type { OrderDetail as OrderDetailType } from '../../types';
import './detail.scss';

const OrderDetail = () => {
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    return params.id || params.orderId || params.order_id || params.out_order_id || '';
  }, []);

  const getStatusInfo = (currentOrder: OrderDetailType) => {
    const { status, has_payment_proof } = currentOrder;
    
    if (status === 'pending' && !has_payment_proof) {
      return { text: '待支付', color: '#ff9800', icon: '⏱️', tip: '请尽快完成支付' };
    }
    if (status === 'pending' && has_payment_proof) {
      return { text: '凭证审核中', color: '#2196f3', icon: '🔍', tip: '已收到您的付款凭证，请勿重复支付' };
    }
    if (status === 'processing') {
      return { text: '待发货', color: '#2196f3', icon: '📦', tip: '商家正在准备商品' };
    }
    if (status === 'completed') {
      return { text: '已完成', color: '#4caf50', icon: '✅', tip: '感谢您的购买' };
    }
    if (status === 'cancelled') {
      return { text: '已取消', color: '#9e9e9e', icon: '❌', tip: '订单已取消' };
    }
    return { text: status, color: '#666', icon: '📋', tip: '' };
  };

  const loadOrderDetail = useCallback(async () => {
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
  }, [orderId]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const handleGoPayment = () => {
    if (order?.has_payment_proof) {
      Taro.showModal({
        title: '提示',
        content: '您已上传过付款凭证，请勿重复支付。如有疑问请联系客服。',
        showCancel: false
      });
      return;
    }
    Taro.navigateTo({ url: `/pages/order/payment?orderId=${order?.order_id}` });
  };

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

  const handleCopyOrderNumber = () => {
    Taro.setClipboardData({
      data: order?.order_number || '',
      success: () => {
        Taro.showToast({ title: '订单号已复制', icon: 'success' });
      }
    });
  };

  const handleGoHome = () => {
    Taro.switchTab({ url: '/pages/index/index' });
  };

  if (loading) {
    return (
      <View className='order-detail-page'>
        <View className='loading'>订单加载中...</View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className='order-detail-page'>
        <View className='empty-state'>未找到该订单</View>
      </View>
    );
  }

  const statusInfo = getStatusInfo(order);

  return (
    <View className='order-detail-page'>
      {/* 顶部返回首页按钮 */}
      <View className='top-home-btn' onClick={handleGoHome}>
        <Text className='home-icon'>🏠</Text>
        <Text className='home-text'>首页</Text>
      </View>

      {/* 订单状态卡片 */}
      <View className='status-card' style={{ borderLeftColor: statusInfo.color }}>
        <View className='status-header'>
          <Text className='status-icon'>{statusInfo.icon}</Text>
          <View className='status-info'>
            <Text className='status-text' style={{ color: statusInfo.color }}>
              {statusInfo.text}
            </Text>
            <Text className='status-tip'>{statusInfo.tip}</Text>
          </View>
        </View>
        {order.has_payment_proof && (
          <View className='proof-notice'>
            <Text className='proof-icon'>✓</Text>
            <Text className='proof-text'>已提交付款凭证</Text>
            <Text className='proof-time'>
              {order.payment_proof_submitted_at}
            </Text>
          </View>
        )}
      </View>

      {/* 物流信息 */}
      {order.tracking_number && (
        <View className='card logistics-card'>
          <Text className='card-title'>🚚 物流信息</Text>
          <View className='logistics-content'>
            <View className='info-row'>
              <Text className='label'>物流公司</Text>
              <Text className='value'>{order.tracking_company || '暂无'}</Text>
            </View>
            <View className='info-row'>
              <Text className='label'>运单号码</Text>
              <Text className='value tracking'>{order.tracking_number}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 商品信息 */}
      <View className='card'>
        <Text className='card-title'>📦 商品信息</Text>
        {order.items?.map((item, index) => (
          <View key={index} className='product-item'>
            <View className='product-info'>
              <Text className='product-name'>{item.product_name}</Text>
              {item.variation_name && (
                <Text className='product-spec'>{item.variation_name}</Text>
              )}
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
        <Text className='card-title'>📋 订单信息</Text>
        <View className='info-row' onClick={handleCopyOrderNumber}>
          <Text className='label'>订单号</Text>
          <Text className='value order-num'>{order.order_number} 📋</Text>
        </View>
        <View className='info-row'>
          <Text className='label'>下单时间</Text>
          <Text className='value'>{order.created_at}</Text>
        </View>
      </View>

      {/* 收货信息 */}
      {order.shipping_address && (
        <View className='card'>
          <Text className='card-title'>📍 收货信息</Text>
          <View className='info-row'>
            <Text className='label'>收件人</Text>
            <Text className='value'>{order.shipping_address.name}</Text>
          </View>
          <View className='info-row'>
            <Text className='label'>联系电话</Text>
            <Text className='value'>{order.shipping_address.phone}</Text>
          </View>
          <View className='info-row'>
            <Text className='label'>收货地址</Text>
            <Text className='value address'>
              {order.shipping_address.province} {order.shipping_address.city}{' '}
              {order.shipping_address.district}{' '}
              {order.shipping_address.detail_address}
            </Text>
          </View>
        </View>
      )}

      {/* 操作按钮 */}
      <View className='action-buttons'>
        <Button className='contact-btn' onClick={handleContactService}>
          联系客服
        </Button>
        {order.status === 'pending' && (
          <Button className='pay-btn' onClick={handleGoPayment}>
            {order.has_payment_proof ? '查看付款详情' : '去支付'}
          </Button>
        )}
      </View>
    </View>
  );
};

export default OrderDetail;
