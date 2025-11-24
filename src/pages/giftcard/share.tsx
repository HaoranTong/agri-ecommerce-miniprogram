import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCard, GiftCardShareResult } from '../../types';
import './share.scss';

const GiftCardShare = () => {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [deliveryMode, setDeliveryMode] = useState<'link' | 'qrcode' | 'passcode'>('link');
  const [shareResult, setShareResult] = useState<GiftCardShareResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCards = async () => {
    try {
      const data = await giftCardService.listMine();
      const activeCards = data.filter(card => card.status === 'active' && parseFloat(card.balance) > 0);
      setCards(activeCards);
      if (activeCards.length > 0) {
        setSelectedCard(activeCards[0].card_number);
      }
    } catch (error) {
      console.error('获取礼品卡列表失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleShare = async () => {
    if (!selectedCard) {
      Taro.showToast({ title: '请选择要分享的礼品卡', icon: 'none' });
      return;
    }

    try {
      const result = await giftCardService.share(selectedCard, deliveryMode);
      setShareResult(result);
      Taro.showToast({ title: '分享成功', icon: 'success' });
    } catch (error) {
      console.error('分享失败', error);
    }
  };

  const handleCopyLink = () => {
    if (!shareResult?.share_url) return;
    
    Taro.setClipboardData({
      data: shareResult.share_url,
      success: () => {
        Taro.showToast({ title: '链接已复制', icon: 'success' });
      }
    });
  };

  const handleCopyToken = () => {
    if (!shareResult?.share_token) return;
    
    Taro.setClipboardData({
      data: shareResult.share_token,
      success: () => {
        Taro.showToast({ title: '口令已复制', icon: 'success' });
      }
    });
  };

  if (loading) {
    return <View className="gift-card-share-page loading-state">加载中...</View>;
  }

  if (cards.length === 0) {
    return (
      <View className="gift-card-share-page">
        <View className="empty-state">
          <Text className="empty-text">暂无可分享的礼品卡</Text>
          <Button
            className="back-btn"
            onClick={() => Taro.navigateBack()}
          >
            返回
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="gift-card-share-page">
      {!shareResult ? (
        <>
          {/* 选择礼品卡 */}
          <View className="section">
            <Text className="section-title">选择要分享的礼品卡</Text>
            <View className="card-list">
              {cards.map((card) => (
                <View
                  key={card.card_number}
                  className={`card-item ${selectedCard === card.card_number ? 'selected' : ''}`}
                  onClick={() => setSelectedCard(card.card_number)}
                >
                  <View className="card-info">
                    <Text className="card-name">{card.template_name}</Text>
                    <Text className="card-number">{card.card_number}</Text>
                  </View>
                  <View className="card-balance">
                    <Text className="balance-label">余额</Text>
                    <Text className="balance-value">¥{card.balance}</Text>
                  </View>
                  {selectedCard === card.card_number && (
                    <View className="check-icon">✓</View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* 选择分享方式 */}
          <View className="section">
            <Text className="section-title">选择分享方式</Text>
            <View className="mode-list">
              <View
                className={`mode-item ${deliveryMode === 'link' ? 'selected' : ''}`}
                onClick={() => setDeliveryMode('link')}
              >
                <Text className="mode-icon">🔗</Text>
                <Text className="mode-label">链接分享</Text>
                {deliveryMode === 'link' && <View className="check-icon">✓</View>}
              </View>
              <View
                className={`mode-item ${deliveryMode === 'qrcode' ? 'selected' : ''}`}
                onClick={() => setDeliveryMode('qrcode')}
              >
                <Text className="mode-icon">📱</Text>
                <Text className="mode-label">二维码</Text>
                {deliveryMode === 'qrcode' && <View className="check-icon">✓</View>}
              </View>
              <View
                className={`mode-item ${deliveryMode === 'passcode' ? 'selected' : ''}`}
                onClick={() => setDeliveryMode('passcode')}
              >
                <Text className="mode-icon">🔑</Text>
                <Text className="mode-label">口令</Text>
                {deliveryMode === 'passcode' && <View className="check-icon">✓</View>}
              </View>
            </View>
          </View>

          <View className="action-section">
            <Button className="share-btn" onClick={handleShare}>
              生成分享
            </Button>
          </View>
        </>
      ) : (
        <>
          {/* 分享结果 */}
          <View className="result-section">
            <Text className="result-title">✨ 分享成功</Text>
            
            {deliveryMode === 'link' && (
              <View className="result-card">
                <Text className="result-label">分享链接</Text>
                <View className="result-content">
                  <Text className="result-text">{shareResult.share_url}</Text>
                </View>
                <Button className="copy-btn" onClick={handleCopyLink}>
                  复制链接
                </Button>
              </View>
            )}

            {deliveryMode === 'qrcode' && (
              <View className="result-card">
                <Text className="result-label">二维码</Text>
                <View className="qrcode-placeholder">
                  <Text>扫码领取礼品卡</Text>
                </View>
                <Text className="result-tip">保存二维码图片分享给好友</Text>
              </View>
            )}

            {deliveryMode === 'passcode' && (
              <View className="result-card">
                <Text className="result-label">分享口令</Text>
                <View className="result-content passcode">
                  <Text className="result-text">{shareResult.share_token}</Text>
                </View>
                <Button className="copy-btn" onClick={handleCopyToken}>
                  复制口令
                </Button>
                <Text className="result-tip">复制口令发送给好友，在领取页面输入即可</Text>
              </View>
            )}

            <Text className="expire-tip">
              此分享链接将于 {new Date(shareResult.expires_at).toLocaleString()} 过期
            </Text>

            <Button
              className="done-btn"
              onClick={() => Taro.navigateBack()}
            >
              完成
            </Button>
          </View>
        </>
      )}
    </View>
  );
};

export default GiftCardShare;
