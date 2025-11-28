// src/components/PaymentModal/index.tsx
import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { orderService } from '../../services/api';
import './index.scss';

interface PaymentModalProps {
  isOpen: boolean;
  orderId: number | string;
  paymentQrUrl: string;
  customerServiceQr: string;
  onClose: () => void;
  onUploaded?: () => void;
}

export default function PaymentModal({
  isOpen,
  orderId,
  paymentQrUrl,
  customerServiceQr,
  onClose,
  onUploaded
}: PaymentModalProps) {
  if (!isOpen) return null;

  console.log('[PaymentModal] Props:', {
    orderId,
    paymentQrUrl,
    customerServiceQr,
    hasPaymentQr: !!paymentQrUrl,
    hasCustomerServiceQr: !!customerServiceQr
  });

  const handleUpload = async () => {
    try {
      const { tempFilePaths } = await Taro.chooseImage({ count: 1 });
      if (!tempFilePaths || tempFilePaths.length === 0) {
        return;
      }

      await orderService.uploadPaymentProof(orderId, tempFilePaths[0]);
      Taro.showToast({ title: '凭证上传成功', icon: 'success' });
      onUploaded?.();
      onClose();
      
      // 跳转到支付成功页面
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/order/payment-success?orderId=${orderId}`
        });
      }, 1500);
    } catch (error) {
      console.error('上传付款凭证失败', error);
      Taro.showToast({ title: '上传失败，请重试', icon: 'none' });
    }
  };

  return (
    <View className="payment-modal-overlay" onClick={onClose}>
      <View 
        className="payment-modal-content" 
        onClick={(event) => event.stopPropagation()}
      >
        {/* 收款二维码 */}
        <View className="qr-item centered">
          <Text className="qr-label">微信收款码</Text>
          {paymentQrUrl ? (
            <Image src={paymentQrUrl} className="qr-code" mode="widthFix" />
          ) : (
            <View className="qr-placeholder">
              <Text className="placeholder-text">收款码未配置</Text>
            </View>
          )}
        </View>

        {/* 客服二维码 */}
        <View className="qr-item centered">
          <Text className="qr-label">添加客服企业微信</Text>
          {customerServiceQr ? (
            <Image src={customerServiceQr} className="qr-code" mode="widthFix" />
          ) : (
            <View className="qr-placeholder">
              <Text className="placeholder-text">客服二维码未配置</Text>
            </View>
          )}
        </View>

        <Button className="upload-btn" onClick={handleUpload}>
          上传付款凭证
        </Button>
        <Button className="close-btn" onClick={onClose}>
          关闭
        </Button>
      </View>
    </View>
  );
}
