import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCard, GiftCardDeliveryMode, GiftCardShareResult } from '../../types';
import './share.scss';

const getBalanceNumber = (balance: string | null) => Number(balance ?? 0);

const MODE_META: Record<GiftCardDeliveryMode, { icon: string; label: string; tip: string }> = {
  digital_share: {
    icon: '🔗',
    label: '数字分享',
    tip: '生成分享口令，好友在“领取礼品卡”页输入即可领取。'
  },
  printable: {
    icon: '🖨️',
    label: '打印卡',
    tip: '复制打印模板链接，在浏览器填写卡号/有效期后即可打印或转发。'
  }
};

const FALLBACK_MODES: GiftCardDeliveryMode[] = ['digital_share', 'printable'];

const GiftCardShare = () => {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [deliveryMode, setDeliveryMode] = useState<GiftCardDeliveryMode>('digital_share');
  const [shareResult, setShareResult] = useState<GiftCardShareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const presetCardFromRoute = (router?.params?.card as string) || '';

  const getAvailableModes = (card?: GiftCard): GiftCardDeliveryMode[] => {
    const candidates = card?.delivery_modes?.length ? card.delivery_modes : FALLBACK_MODES;
    return candidates.filter((mode): mode is GiftCardDeliveryMode => Boolean(MODE_META[mode as GiftCardDeliveryMode]));
  };

  const selectedCardInfo = useMemo(
    () => cards.find((card) => card.card_number === selectedCard),
    [cards, selectedCard]
  );

  const availableModes = useMemo(() => getAvailableModes(selectedCardInfo), [selectedCardInfo]);

  const loadCards = useCallback(async () => {
    try {
      const data = await giftCardService.listMine();
      const activeCards = data.filter(card => card.status === 'active' && getBalanceNumber(card.balance) > 0);
      setCards(activeCards);
      if (activeCards.length > 0) {
        const matchedCard = presetCardFromRoute
          ? activeCards.find((card) => card.card_number === presetCardFromRoute)
          : undefined;
        const defaultCard = matchedCard || activeCards[0];
        setSelectedCard(defaultCard.card_number);
        const modes = getAvailableModes(defaultCard);
        setDeliveryMode(modes[0] ?? 'digital_share');
      }
    } catch (error) {
      console.error('获取礼品卡列表失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [presetCardFromRoute]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleSelectCard = (card: GiftCard) => {
    setSelectedCard(card.card_number);
    const modes = getAvailableModes(card);
    setDeliveryMode(modes[0] ?? 'digital_share');
    setShareResult(null);
  };

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
      Taro.showToast({ title: '分享失败', icon: 'none' });
    }
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

  const handleCopyPrintUrl = () => {
    const url = shareResult?.print_template_url || selectedCardInfo?.print_template_url;
    if (!url) {
      Taro.showToast({ title: '暂无打印模板链接', icon: 'none' });
      return;
    }

    Taro.setClipboardData({
      data: url,
      success: () => {
        Taro.showToast({ title: '模板链接已复制', icon: 'success' });
      }
    });
  };

  if (loading) {
    return <View className='gift-card-share-page loading-state'>加载中...</View>;
  }

  if (cards.length === 0) {
    return (
      <View className='gift-card-share-page'>
        <View className='empty-state'>
          <Text className='empty-text'>暂无可分享的礼品卡</Text>
          <View className='empty-actions'>
            <Button
              className='back-btn'
              onClick={() => Taro.navigateTo({ url: '/pages/giftcard/templates' })}
            >
              去购卡
            </Button>
            <Button
              className='back-btn secondary'
              onClick={() => Taro.navigateBack()}
            >
              返回
            </Button>
          </View>
        </View>
      </View>
    );
  }

  const modeTip = MODE_META[deliveryMode]?.tip;

  return (
    <View className='gift-card-share-page'>
      {!shareResult ? (
        <>
          {/* 选择礼品卡 */}
          <View className='section'>
            <Text className='section-title'>选择要分享的礼品卡</Text>
            <View className='card-list'>
              {cards.map((card) => {
                const balanceValue = card.balance ?? '--';
                const templateName = card.template_name || '礼品卡';
                return (
                  <View
                    key={card.card_number}
                    className={`card-item ${selectedCard === card.card_number ? 'selected' : ''}`}
                    onClick={() => handleSelectCard(card)}
                  >
                    <View className='card-info'>
                      <Text className='card-name'>{templateName}</Text>
                      <Text className='card-number'>{card.card_number}</Text>
                    </View>
                    <View className='card-balance'>
                      <Text className='balance-label'>余额</Text>
                      <Text className='balance-value'>¥{balanceValue}</Text>
                    </View>
                    {selectedCard === card.card_number && (
                      <View className='check-icon'>✓</View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* 选择分享方式 */}
          <View className='section'>
            <Text className='section-title'>选择分享方式</Text>
            <View className='mode-list'>
              {availableModes.map((mode) => {
                const meta = MODE_META[mode];
                return (
                  <View
                    key={mode}
                    className={`mode-item ${deliveryMode === mode ? 'selected' : ''}`}
                    onClick={() => setDeliveryMode(mode)}
                  >
                    <Text className='mode-icon'>{meta.icon}</Text>
                    <Text className='mode-label'>{meta.label}</Text>
                    {deliveryMode === mode && <View className='check-icon'>✓</View>}
                  </View>
                );
              })}
            </View>
            {modeTip && <Text className='mode-tip'>{modeTip}</Text>}
          </View>

          <View className='action-section'>
            <Button className='share-btn' onClick={handleShare}>
              生成分享
            </Button>
          </View>
        </>
      ) : (
        <>
          {/* 分享结果 */}
          <View className='result-section'>
            <Text className='result-title'>✨ 分享成功</Text>
            <View className='result-summary'>
              <Text className='result-card-name'>{shareResult.template_name || '礼品卡'}</Text>
              <Text className='result-card-number'>卡号：{shareResult.card_number}</Text>
            </View>

            {shareResult.delivery_mode === 'digital_share' && (
              <View className='result-card'>
                <Text className='result-label'>分享口令</Text>
                <View className='result-content passcode'>
                  <Text className='result-text'>{shareResult.share_token}</Text>
                </View>
                <Button className='copy-btn' onClick={handleCopyToken}>
                  复制口令
                </Button>
                <Text className='result-tip'>转发口令给好友，让 TA 在“领取礼品卡”页输入即可领取。</Text>
              </View>
            )}

            {shareResult.delivery_mode === 'printable' && (
              <View className='result-card'>
                <Text className='result-label'>打印模板链接</Text>
                <View className='result-content'>
                  <Text className='result-text'>
                    {shareResult.print_template_url || selectedCardInfo?.print_template_url || '未配置'}
                  </Text>
                </View>
                <Button className='copy-btn' onClick={handleCopyPrintUrl}>
                  复制模板链接
                </Button>
                <Text className='result-tip'>复制链接在浏览器中打开，填写卡号/有效期后即可打印或转发。</Text>
              </View>
            )}

            {shareResult.expires_at && (
              <Text className='expire-tip'>
                分享记录将于 {new Date(shareResult.expires_at).toLocaleString()} 过期，可随时重新生成。
              </Text>
            )}

            <Button className='done-btn' onClick={() => Taro.navigateBack()}>
              完成
            </Button>
          </View>
        </>
      )}
    </View>
  );
};

export default GiftCardShare;
