import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCardShareDetail } from '../../types';
import './detail.scss';

const GiftCardDetail = () => {
  const router = useRouter();
  const { token } = router.params;
  const [detail, setDetail] = useState<GiftCardShareDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = async () => {
    if (!token) {
      Taro.showToast({ title: '缺少参数', icon: 'none' });
      return;
    }

    try {
      const data = await giftCardService.getShareDetail(token);
      setDetail(data);
    } catch (error) {
      console.error('获取礼品卡详情失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [token]);

  const handleClaim = () => {
    if (!token) return;
    Taro.redirectTo({ url: `/pages/giftcard/claim?token=${token}` });
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      active: '待领取',
      claimed: '已领取',
      expired: '已过期'
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      active: 'green',
      claimed: 'gray',
      expired: 'red'
    };
    return map[status] || 'default';
  };

  if (loading) {
    return <View className="gift-card-detail-page loading-state">加载中...</View>;
  }

  if (!detail) {
    return (
      <View className="gift-card-detail-page">
        <View className="empty">未找到礼品卡信息</View>
      </View>
    );
  }

  return (
    <View className="gift-card-detail-page">
      {/* 礼品卡主卡片 */}
      <View className="card-main">
        <View className="card-header">
          <Text className="card-template">{detail.template_name}</Text>
          <View className={`status-badge ${getStatusColor(detail.status)}`}>
            <Text>{getStatusText(detail.status)}</Text>
          </View>
        </View>

        <View className="card-balance">
          <Text className="balance-label">卡内余额</Text>
          <Text className="balance-value">¥{detail.balance}</Text>
        </View>

        {detail.sender_nickname && (
          <View className="card-sender">
            <Text className="sender-label">来自</Text>
            <Text className="sender-name">{detail.sender_nickname}</Text>
          </View>
        )}
      </View>

      {/* 详情信息 */}
      <View className="detail-card">
        <View className="detail-item">
          <Text className="detail-label">礼品卡号</Text>
          <Text className="detail-value">{detail.card_number}</Text>
        </View>
        <View className="detail-item">
          <Text className="detail-label">分享方式</Text>
          <Text className="detail-value">
            {detail.delivery_mode === 'link' && '链接分享'}
            {detail.delivery_mode === 'qrcode' && '二维码'}
            {detail.delivery_mode === 'passcode' && '口令'}
          </Text>
        </View>
        <View className="detail-item">
          <Text className="detail-label">过期时间</Text>
          <Text className="detail-value expire">
            {new Date(detail.expires_at).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 操作按钮 */}
      {detail.status === 'active' && (
        <View className="action-section">
          <Button className="claim-btn" onClick={handleClaim}>
            立即领取
          </Button>
        </View>
      )}

      {detail.status === 'claimed' && (
        <View className="tip-section">
          <Text className="tip-text">此礼品卡已被领取</Text>
        </View>
      )}

      {detail.status === 'expired' && (
        <View className="tip-section">
          <Text className="tip-text">此分享链接已过期</Text>
        </View>
      )}
    </View>
  );
};

export default GiftCardDetail;
