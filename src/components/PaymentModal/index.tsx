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
    } catch (error) {
      console.error('上传付款凭证失败', error);
      Taro.showToast({ title: '上传失败，请重试', icon: 'none' });
    }
  };

  return (
    <View className="payment-modal-overlay" onClick={onClose}>
      <View className="payment-modal-content" onClick={(event) => event.stopPropagation()}>
        <Text className="modal-title">请扫码付款</Text>

        <View className="qr-section">
          <View className="qr-item">
            <Text className="qr-label">微信收款码</Text>
            <Image src={paymentQrUrl} className="qr-code" mode="widthFix" />
          </View>

          <View className="qr-item">
            <Text className="qr-label">添加客服企业微信</Text>
            <Image src={customerServiceQr} className="qr-code" mode="widthFix" />
          </View>
        </View>

        <View className="order-info">
          <Text>
            订单号：<Text className="order-id">{orderId}</Text>
          </Text>
          <Text className="instruction">
            {`1. 扫描上方收款码完成付款\n2. 截图付款成功页面\n3. 点击下方按钮上传凭证`}
          </Text>
        </View>

        <Button className="upload-btn" onClick={handleUpload}>
          上传付款截图
        </Button>
        <Button className="close-btn" onClick={onClose}>
          已完成，关闭窗口
        </Button>
      </View>
    </View>
  );
}
