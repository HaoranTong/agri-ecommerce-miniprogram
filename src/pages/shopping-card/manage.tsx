import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import { getStoredUserInfo } from '../../utils/storage';
import type { GiftCard, GiftCardDeliveryMode, GiftCardShareLogEntry } from '../../types';
import './manage.scss';

const FORMAT_DELIVERY = (mode?: GiftCardDeliveryMode | string | null) => {
  if (!mode) return '数字分享';
  if (mode === 'printable') return '打印卡';
  return '数字分享';
};

const resolveCardAmount = (card: GiftCard) => {
  const candidates = [
    card.balance,
    card.initial_amount,
    card.card_snapshot?.balance,
    card.card_snapshot?.initial_amount
  ];

  const prioritized = candidates.find((value) => {
    if (value === null || value === undefined) return false;
    const num = Number(value);
    return !Number.isNaN(num) && num > 0;
  }) ?? candidates.find((value) => value !== null && value !== undefined);

  return prioritized ? Number(prioritized).toFixed(2) : null;
};

const GiftCardManage = () => {
  const params = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const focusCard = params.card as string | undefined;
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [historyMode, setHistoryMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [managingCard, setManagingCard] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, GiftCardShareLogEntry[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await giftCardService.listMine({
        scope: historyMode ? 'history' : 'default',
        within_days: historyMode ? 365 : undefined,
        force: true,
        showLoading: false
      });
      setCards(data);
      if (focusCard) {
        setExpanded(focusCard);
      }
    } catch (error) {
      console.error('加载礼品卡失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [focusCard, historyMode]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useDidShow(() => {
    loadCards();
  });

  const handleToggleHistory = async (cardNumber: string) => {
    if (expanded === cardNumber) {
      setExpanded(null);
      return;
    }
    setExpanded(cardNumber);
    if (historyMap[cardNumber]) {
      return;
    }
    try {
      setHistoryLoading(cardNumber);
      const logs = await giftCardService.getShareHistory(cardNumber);
      setHistoryMap((prev) => ({ ...prev, [cardNumber]: logs }));
    } catch (error) {
      console.error('加载记录失败', error);
      Taro.showToast({ title: '记录加载失败', icon: 'none' });
    } finally {
      setHistoryLoading(null);
    }
  };

  const handleViewOrder = (card: GiftCard) => {
    const purchaseOrderId = (card as any)?.purchase_order_id || card.card_snapshot?.order_id;
    if (purchaseOrderId) {
      Taro.navigateTo({ url: `/pages/order/detail?orderId=${purchaseOrderId}` });
      return;
    }
    Taro.showToast({ title: '未找到订单信息', icon: 'none' });
  };

  const handleRevoke = async (cardNumber: string) => {
    setManagingCard(cardNumber);
    try {
      await giftCardService.revokeShare(cardNumber);
      Taro.showToast({ title: '已撤销分享', icon: 'success' });
      loadCards();
    } catch (error) {
      console.error('撤销分享失败', error);
      Taro.showToast({ title: '撤销失败', icon: 'none' });
    } finally {
      setManagingCard(null);
    }
  };

  const resolveStatusMeta = (card: GiftCard, shareState: string, canRedeem: boolean, isHolder: boolean) => {
    if (shareState === 'shared') {
      return { label: '已分享/待领取', key: 'shared' };
    }
    if (shareState === 'consumed') {
      return { label: '已兑换', key: 'consumed' };
    }
    if (shareState === 'expired') {
      return { label: '已过期', key: 'expired' };
    }
    if (shareState === 'bound') {
      if (!isHolder) {
        return { label: '已分享', key: 'bound' };
      }
      return { label: '待兑换', key: 'redeemable' };
    }
    if (canRedeem) {
      return { label: '待兑换', key: 'redeemable' };
    }
    return { label: '未分享', key: 'none' };
  };

  const handleQuickRedeem = (cardNumber: string) => {
    Taro.navigateTo({ url: `/pages/shopping-card/redeem?card=${cardNumber}` });
  };

  const renderHistory = (card: GiftCard) => {
    if (expanded !== card.card_number) {
      return null;
    }
    const logs = historyMap[card.card_number] ?? card.share_history ?? [];
    return (
      <View className='history-block expanded'>
        <View className='history-header'>
          <Text>操作记录</Text>
          <Text className='history-toggle' onClick={() => handleToggleHistory(card.card_number)}>
            收起
          </Text>
        </View>
        {historyLoading === card.card_number ? (
          <View className='history-empty'>记录加载中...</View>
        ) : logs.length ? (
          <View className='history-list'>
            {logs.map((log) => (
              <View className='history-item' key={log.id || `${log.delivery_mode}-${log.created_at}`}>
                <Text className='history-time'>{log.created_at}</Text>
                <Text className='history-meta'>
                  {FORMAT_DELIVERY(log.delivery_mode)} · {log.channel}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className='history-empty'>暂无记录</View>
        )}
      </View>
    );
  };

  if (loading) {
    return <View className='giftcard-manage-page loading-state'>加载中...</View>;
  }

  const storedUser = getStoredUserInfo();
  const currentUserId = storedUser?.user_id ? Number(storedUser.user_id) : 0;

  const visibleCards = cards.filter((card) => {
    const shareState = card.share_state || 'none';
    const amountText = resolveCardAmount(card);
    const pendingActivation = card.status === 'pending_activation';
    const locked = card.status === 'locked';
    const voided = card.status === 'void';
    const restricted = pendingActivation || locked || voided;
    const holderId = card.redeemer_id ? card.redeemer_id : card.purchaser_id;
    const isHolder = historyMode ? (currentUserId > 0 ? holderId === currentUserId : shareState !== 'shared') : true;
    const canRedeem = !restricted
      && isHolder
      && (shareState === 'none' || shareState === 'bound')
      && card.status === 'active'
      && Number(amountText ?? 0) > 0;
    if (historyMode) return true;
    return canRedeem || shareState === 'shared';
  });

  return (
    <View className='giftcard-manage-page'>
      <View className='history-toggle-bar'>
        <Text className='history-title'>{historyMode ? '历史购物卡（近一年）' : '可用购物卡'}</Text>
        <Button
          className='history-btn'
          onClick={() => {
            setHistoryMode((prev) => !prev);
          }}
        >
          {historyMode ? '返回可用列表' : '历史购物卡'}
        </Button>
      </View>
      {visibleCards.length === 0 && (
        <View className='empty-block'>
          <Text className='empty-text'>{historyMode ? '近一年暂无历史购物卡' : '暂无可用购物卡'}</Text>
          {!historyMode && (
            <Button className='primary-btn' onClick={() => Taro.navigateTo({ url: '/pages/shopping-card/templates' })}>
              去购买
            </Button>
          )}
        </View>
      )}
      {visibleCards.map((card) => {
        const shareState = card.share_state || 'none';
        const deliveryModes = card.delivery_modes && card.delivery_modes.length > 0
          ? card.delivery_modes
          : ['digital_share'];
        const amountText = resolveCardAmount(card);
        const pendingActivation = card.status === 'pending_activation';
        const locked = card.status === 'locked';
        const voided = card.status === 'void';
        const restricted = pendingActivation || locked || voided;
        const holderId = card.redeemer_id ? card.redeemer_id : card.purchaser_id;
        const isHolder = historyMode ? (currentUserId > 0 ? holderId === currentUserId : shareState !== 'shared') : true;
        const canRedeem = !restricted
          && isHolder
          && (shareState === 'none' || shareState === 'bound')
          && card.status === 'active'
          && Number(amountText ?? 0) > 0;
        const isHistoryExpanded = expanded === card.card_number;
        const canRevoke = shareState === 'shared' && !restricted;
        // 已分享的购物卡不能再次分享，除非撤销分享
        const canShare = !restricted && shareState !== 'shared' && shareState !== 'consumed';
        const statusNote = pendingActivation
          ? '付款审核中，卡片确认入账后自动激活。'
          : locked
          ? '卡片已被后台锁定，暂不可分享或兑换。'
          : voided
          ? '卡片已被作废，仅供记录查询。'
          : shareState === 'shared'
          ? '已分享未领取，请等待对方领取或撤销分享后重新分享。'
          : '';
        const cachedHistory = historyMap[card.card_number];
        const hasHistory = Boolean((cachedHistory && cachedHistory.length) || (card.share_history && card.share_history.length));
        const statusMeta = resolveStatusMeta(card, shareState, canRedeem, isHolder);
        return (
          <View className='manage-card' key={card.card_number}>
            <View className='card-header'>
              <View>
                <Text className='card-name'>{card.template_name || '礼品卡'}</Text>
                <Text className='card-number'>卡号：{card.card_number}</Text>
              </View>
              <View
                className={`status-pill status-${statusMeta.key} ${canRedeem ? 'actionable' : ''}`}
                onClick={() => {
                  if (canRedeem) {
                    handleQuickRedeem(card.card_number);
                  }
                }}
              >
                {statusMeta.label}
              </View>
            </View>
            <View className='card-meta'>
              <Text>面值 ¥{amountText ?? '--'}</Text>
              <Text>有效期：{card.expires_at || '长期有效'}</Text>
            </View>
            <View className='card-meta'>
              <Text>最近分享：{card.shared_at || '暂无'}</Text>
              <Text>支持：{deliveryModes.map((mode) => FORMAT_DELIVERY(mode)).join(' / ')}</Text>
            </View>

            {statusNote && (
              <Text className={`status-note ${locked || voided ? 'danger' : ''}`}>{statusNote}</Text>
            )}

            <View className='action-grid'>
              <Button className='action-btn' onClick={() => handleViewOrder(card)}>
                查看订单
              </Button>
              <Button
                className={`action-btn ${!canShare ? 'disabled' : ''}`}
                disabled={!canShare}
                onClick={() => {
                  if (!canShare) {
                    if (shareState === 'shared') {
                      Taro.showToast({ 
                        title: '该购物卡已分享，请先撤销分享', 
                        icon: 'none',
                        duration: 2000
                      });
                    }
                    return;
                  }
                  // 在管理页面点击分享，直接跳转到该购物卡的订单详情确认页
                  Taro.navigateTo({ 
                    url: `/pages/shopping-card/share-confirm?card=${card.card_number}` 
                  });
                }}
              >
                {restricted
                  ? locked
                    ? '已锁定'
                    : voided
                    ? '已作废'
                    : '待审核'
                  : shareState === 'shared'
                  ? '已分享未领取'
                  : '分享/赠送'}
              </Button>
              <Button
                className={`action-btn ${!canRevoke ? 'disabled' : ''}`}
                disabled={!canRevoke}
                loading={managingCard === card.card_number}
                onClick={() => {
                  if (!canRevoke) return;
                  handleRevoke(card.card_number);
                }}
              >
                撤销分享
              </Button>
              <Button
                className='action-btn'
                loading={historyLoading === card.card_number}
                onClick={() => handleToggleHistory(card.card_number)}
              >
                {isHistoryExpanded ? '收起记录' : hasHistory ? '查看记录' : '加载记录'}
              </Button>
            </View>

            {renderHistory(card)}
          </View>
        );
      })}
    </View>
  );
};

export default GiftCardManage;
