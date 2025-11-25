import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { orderService } from '../../services/api';
import type { OrderDetail } from '../../types';
import './payment.scss';

const OrderPayment = () => {
  const orderId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const id = params.orderId || params.id || '';
    console.log('[OrderConfirm] 订单ID:', { params, orderId: id });
    return id;
  }, []);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    console.log('[OrderConfirm] 开始加载订单:', orderId);
    
    if (!orderId) {
      console.error('[OrderConfirm] 订单ID为空');
      setLoading(false);
      return;
    }

    try {
      const data = await orderService.getOrderDetail(orderId);
      console.log('[OrderConfirm] 订单数据:', data);
      console.log('[OrderConfirm] 支付二维码:', data.payment_qr_url);
      console.log('[OrderConfirm] 客服二维码:', data.customer_service_qr);
      setOrder(data);
    } catch (error) {
      console.error('[OrderConfirm] 获取订单失败', error);
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
      <View className="order-detail-page">
        <View className="empty-state">未找到订单信息</View>
      </View>
    );
  }

  const handleUpload = async () => {
    try {
      const { tempFilePaths } = await Taro.chooseImage({ count: 1 });
      if (!tempFilePaths || tempFilePaths.length === 0) {
        return;
      }

      Taro.showLoading({ title: '上传中...', mask: true });
      
      await orderService.uploadPaymentProof(orderId, tempFilePaths[0]);
      
      Taro.hideLoading();
      Taro.showToast({ title: '凭证已提交审核', icon: 'success' });
      
      // 跳转到订单详情页面
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/order/detail?orderId=${orderId}`
        });
      }, 1500);
    } catch (error: any) {
      Taro.hideLoading();
      console.error('上传付款凭证失败', error);
      
      // 根据错误类型提供更友好的提示
      const errorMsg = error?.errMsg || error?.message || '上传失败';
      if (errorMsg.includes('timeout')) {
        Taro.showModal({
          title: '上传超时',
          content: '网络连接超时，请检查网络后重试。如多次失败，请联系客服直接发送凭证。',
          showCancel: false
        });
      } else {
        Taro.showToast({ title: '上传失败，请重试', icon: 'none' });
      }
    }
  };

  return (
    <View className="payment-page">
      {/* 支付说明 */}
      <View className="notice-card">
        <Text className="notice-title">💳 支付说明</Text>
        <View className="notice-step">
          <Text className="step-num">1</Text>
          <Text className="step-text">长按下载保存收款二维码到相册</Text>
        </View>
        <View className="notice-step">
          <Text className="step-num">2</Text>
          <Text className="step-text">微信扫描保存到相册的收款码完成付款</Text>
        </View>
        <View className="notice-step">
          <Text className="step-num">3</Text>
          <Text className="step-text">截图保存付款成功信息</Text>
        </View>
        <View className="notice-step">
          <Text className="step-num">4</Text>
          <Text className="step-text">点击下方按钮上传支付凭证（也可添加客服发送）</Text>
        </View>
      </View>

      {/* 收款二维码 */}
      <View className="qr-card">
        <Text className="qr-title">微信收款码</Text>
        {order.payment_qr_url ? (
          <Image src={order.payment_qr_url} className="qr-image" mode="widthFix" />
        ) : (
          <View className="qr-placeholder">
            <Text>收款码未配置</Text>
          </View>
        )}
      </View>

      {/* 客服二维码（可选） */}
      {order.customer_service_qr && (
        <View className="qr-card">
          <Text className="qr-title">客服企业微信（可选）</Text>
          <Image src={order.customer_service_qr} className="qr-image" mode="widthFix" />
        </View>
      )}

      {/* 上传凭证按钮 */}
      <Button className="upload-btn" onClick={handleUpload}>
        上传支付凭证
      </Button>
    </View>
  );
};

export default OrderPayment;
