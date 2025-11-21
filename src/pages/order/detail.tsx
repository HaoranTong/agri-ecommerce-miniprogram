// src/pages/order/detail.tsx
import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import './detail.scss';

interface OrderDetail {
  id: string;
  product_name: string;
  variation: {
    specification: string; // 规格
    quality: string;       // 品质
    packaging: string;     // 包装
  };
  price: string;
  quantity: number;
  total: string;
}

export default function OrderDetail() {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [config, setConfig] = useState({
    payment_qr_code: '',
    service_qr_code: ''
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const fetchOrderAndConfig = async () => {
      try {
        const orderId = Taro.getCurrentInstance().router?.params?.id || 'MY20251121001';
        
        // 模拟订单数据（实际应调用 GET /orders/{id}）
        const mockOrder: OrderDetail = {
          id: orderId,
          product_name: '稻花香',
          variation: {
            specification: '5kg',
            quality: '新米',
            packaging: '礼盒'
          },
          price: '59.90',
          quantity: 1,
          total: '59.90'
        };
        setOrder(mockOrder);

        // 获取收款码配置
        const configRes = await Taro.request({
          url: '/wp-json/myshop/v1/config/payment-info'
        });
        setConfig(configRes.data);
      } catch (error) {
        Taro.showToast({ title: '加载失败', icon: 'none' });
      }
    };

    fetchOrderAndConfig();
  }, []);

  const handlePay = () => {
    setShowPaymentModal(true);
  };

  const handleUpload = () => {
    Taro.chooseImage({
      count: 1,
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        Taro.uploadFile({
          url: `/wp-json/myshop/v1/orders/${order?.id}/screenshot`,
          filePath: tempFilePath,
          name: 'screenshot',
          success: () => {
            Taro.showToast({ title: '凭证上传成功', icon: 'success' });
            setShowPaymentModal(false);
          },
          fail: () => {
            Taro.showToast({ title: '上传失败，请重试', icon: 'none' });
          }
        });
      }
    });
  };

  if (!order) {
    return <View className="loading">加载中...</View>;
  }

  return (
    <View className="order-detail-page">
      {/* 订单信息卡片 */}
      <View className="card">
        <Text className="section-title">订单信息</Text>
        <View className="info-row">
          <Text>商品</Text>
          <Text>{order.product_name}</Text>
        </View>
        <View className="info-row">
          <Text>规格</Text>
          <Text>{order.variation.specification}</Text>
        </View>
        <View className="info-row">
          <Text>品质</Text>
          <Text>{order.variation.quality}</Text>
        </View>
        <View className="info-row">
          <Text>包装</Text>
          <Text>{order.variation.packaging}</Text>
        </View>
        <View className="info-row total">
          <Text>总计</Text>
          <Text>¥{order.total}</Text>
        </View>
      </View>

      {/* 付款按钮 */}
      <Button className="pay-btn" onClick={handlePay}>
        去付款
      </Button>

      {/* 付款弹窗（内联实现） */}
      {showPaymentModal && (
        <View className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <View className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
            <Text className="modal-title">请扫码付款</Text>
            
            <View className="qr-section">
              <View className="qr-item">
                <Text className="qr-label">微信收款码</Text>
                <Image src={config.payment_qr_code} className="qr-code" mode="widthFix" />
              </View>
              
              <View className="qr-item">
                <Text className="qr-label">添加客服企业微信</Text>
                <Image src={config.service_qr_code} className="qr-code" mode="widthFix" />
              </View>
            </View>

            <View className="order-info">
              <Text>订单号：<Text className="order-id">{order.id}</Text></Text>
              <Text className="instruction">
                1. 扫描上方收款码完成付款\n
                2. 截图付款成功页面\n
                3. 点击下方按钮上传凭证
              </Text>
            </View>

            <Button className="upload-btn" onClick={handleUpload}>
              上传付款截图
            </Button>
            
            <Button className="close-btn" onClick={() => setShowPaymentModal(false)}>
              关闭
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}