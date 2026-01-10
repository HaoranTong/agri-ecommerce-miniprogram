import { Button, Image, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { couponService, giftCardService, orderService } from '../../services/api';
import type { GiftCard, OrderDetail } from '../../types';
import { showErrorToast, analyzeError } from '../../utils/errorHandler';
import EmptyState from '../../components/EmptyState';
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
  
  // 优惠券相关状态
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState<{
    code: string;
    discount_amount: string;
    description?: string;
  } | null>(null);
  
  // 购物卡相关状态
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [storedValueCards, setStoredValueCards] = useState<GiftCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [giftCardInfo, setGiftCardInfo] = useState<{
    card_number: string;
    used_amount: string;
    remaining_balance: string;
  } | null>(null);
  
  // 计算最终应付金额
  const finalTotal = useMemo(() => {
    if (!order) return 0;
    let total = parseFloat(order.total || '0');
    if (couponInfo) {
      total -= parseFloat(couponInfo.discount_amount || '0');
    }
    if (giftCardInfo) {
      total -= parseFloat(giftCardInfo.used_amount || '0');
    }
    return Math.max(0, total);
  }, [order, couponInfo, giftCardInfo]);

  const storedValueCardCount = storedValueCards.length;

  const loadOrder = useCallback(async () => {
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
      
      // 恢复优惠券和购物卡使用状态
      if (data.coupon_info) {
        setCouponInfo({
          code: data.coupon_info.code,
          discount_amount: data.coupon_info.discount_amount,
          description: undefined
        });
      }
      if (data.gift_card_info) {
        setGiftCardInfo({
          card_number: data.gift_card_info.card_number,
          used_amount: data.gift_card_info.used_amount,
          remaining_balance: data.gift_card_info.remaining_balance
        });
      }
    } catch (error) {
      console.error('[OrderConfirm] 获取订单失败', error);
      const appError = analyzeError(error);
      showErrorToast(appError, '获取订单信息失败');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // 加载储值购物卡列表
  const fetchStoredCards = useCallback(
    async (showSpinner = false) => {
      try {
        if (showSpinner) setLoadingCards(true);
        const cards = await giftCardService.getStoredValueCards();
        setStoredValueCards(cards);
      } catch (error) {
        console.error('加载储值卡失败', error);
        if (showSpinner) {
          const appError = analyzeError(error);
          showErrorToast(appError, '加载储值卡失败');
        }
      } finally {
        if (showSpinner) setLoadingCards(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStoredCards(false);
  }, [fetchStoredCards]);

  // 验证并应用优惠券
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      Taro.showToast({ title: '请输入优惠券号码', icon: 'none' });
      return;
    }

    try {
      Taro.showLoading({ title: '验证中...', mask: true });
      
      // 先验证优惠券（仅校验，不保留未使用的返回值）
      await couponService.validate(couponCode.trim());
      
      // 应用到订单
      const result = await orderService.applyCoupon(orderId, couponCode.trim());
      
      Taro.hideLoading();
      
      setCouponInfo({
        code: result.coupon_code,
        discount_amount: result.discount_amount,
        description: result.coupon_description
      });
      setShowCouponModal(false);
      setCouponCode('');
      
      // 重新加载订单信息
      await loadOrder();
      
      Taro.showToast({ 
        title: `优惠券已使用，已优惠¥${result.discount_amount}`, 
        icon: 'success' 
      });
    } catch (error: any) {
      Taro.hideLoading();
      const appError = analyzeError(error);
      const customMessage = '优惠券验证失败';
      showErrorToast(appError, customMessage);
    }
  };

  // 使用购物卡支付
  const handleApplyGiftCard = async (cardNumber: string) => {
    try {
      Taro.showLoading({ title: '使用中...', mask: true });
      
      const result = await orderService.applyGiftCard(orderId, cardNumber);
      
      Taro.hideLoading();
      
      setGiftCardInfo({
        card_number: result.card_number,
        used_amount: result.used_amount,
        remaining_balance: result.remaining_balance
      });
      setShowGiftCardModal(false);
      
      // 重新加载订单信息
      await loadOrder();
      await fetchStoredCards(false);
      
      Taro.showToast({ 
        title: `购物卡已使用，已支付¥${result.used_amount}`, 
        icon: 'success' 
      });
      
      // 如果订单金额为0，提示用户
      if (parseFloat(result.final_total) <= 0) {
        setTimeout(() => {
          Taro.showModal({
            title: '支付完成',
            content: '订单已使用购物卡全额支付，无需再上传付款凭证。',
            showCancel: false
          });
        }, 1000);
      }
    } catch (error: any) {
      Taro.hideLoading();
      const appError = analyzeError(error);
      const customMessage = '使用购物卡失败';
      showErrorToast(appError, customMessage);
    }
  };

  // 打开购物卡选择弹窗
  const handleOpenGiftCardModal = async () => {
    setShowGiftCardModal(true);
    if (!storedValueCards.length) {
      await fetchStoredCards(true);
    }
  };

  if (loading) {
    return <View className='loading'>加载中...</View>;
  }

  if (!order) {
    return (
      <View className='order-detail-page'>
        <EmptyState
          type='default'
          title='未找到订单信息'
          description='订单可能已被删除或不存在，请检查后重试'
          actionText='返回首页'
          actionUrl='/pages/index/index'
        />
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
      
      const appError = analyzeError(error);
      if (appError.type === 'network') {
        Taro.showModal({
          title: '上传超时',
          content: '网络连接超时，请检查网络后重试。如多次失败，请联系客服直接发送凭证。',
          showCancel: false
        });
      } else {
        showErrorToast(appError, '上传失败，请重试');
      }
    }
  };

  return (
    <View className='payment-page'>
      {/* 支付说明 */}
      <View className='notice-card'>
        <Text className='notice-title'>💳 支付说明</Text>
        <View className='notice-step'>
          <Text className='step-num'>1</Text>
          <Text className='step-text'>长按下载保存收款二维码到相册</Text>
        </View>
        <View className='notice-step'>
          <Text className='step-num'>2</Text>
          <Text className='step-text'>微信扫描保存到相册的收款码完成付款</Text>
        </View>
        <View className='notice-step'>
          <Text className='step-num'>3</Text>
          <Text className='step-text'>截图保存付款成功信息</Text>
        </View>
        <View className='notice-step'>
          <Text className='step-num'>4</Text>
          <Text className='step-text'>点击下方按钮上传支付凭证（也可添加客服发送）</Text>
        </View>
      </View>

      {/* 收款二维码 */}
      <View className='qr-card'>
        <Text className='qr-title'>微信收款码</Text>
        {order.payment_qr_url ? (
          <Image src={order.payment_qr_url} className='qr-image' mode='widthFix' />
        ) : (
          <View className='qr-placeholder'>
            <Text>收款码未配置</Text>
          </View>
        )}
      </View>

      {/* 客服二维码（可选） */}
      {order.customer_service_qr && (
        <View className='qr-card'>
          <Text className='qr-title'>客服企业微信（可选）</Text>
          <Image src={order.customer_service_qr} className='qr-image' mode='widthFix' />
        </View>
      )}

      {/* 优惠券和购物卡使用区域 */}
      <View className='payment-options-card'>
        <View className='options-buttons'>
          <Button 
            className='option-btn coupon-btn' 
            onClick={() => setShowCouponModal(true)}
            disabled={!!couponInfo}
          >
            {couponInfo ? '✓ 已使用优惠券' : '🎫 使用优惠券'}
          </Button>
          <Button 
            className='option-btn giftcard-btn' 
            onClick={handleOpenGiftCardModal}
            disabled={!!giftCardInfo}
          >
            {giftCardInfo ? '✓ 已使用购物卡' : '💳 使用购物卡'}
          </Button>
        </View>

        <Text className='asset-hint'>
          储值卡：{storedValueCardCount ? `可用 ${storedValueCardCount} 张` : '暂无可用'}
          {' · '}
          优惠券：请使用后台发放的券码
          {!storedValueCardCount && (
            <Text
              className='asset-link'
              onClick={() => Taro.navigateTo({ url: '/pages/shopping-card/templates' })}
            >
              去购卡
            </Text>
          )}
        </Text>

        {/* 使用情况提醒 */}
        {(couponInfo || giftCardInfo) && (
          <View className='payment-summary'>
            {couponInfo && (
              <View className='summary-item'>
                <Text className='summary-label'>优惠券优惠：</Text>
                <Text className='summary-value discount'>-¥{couponInfo.discount_amount}</Text>
              </View>
            )}
            {giftCardInfo && (
              <>
                <View className='summary-item'>
                  <Text className='summary-label'>购物卡支付：</Text>
                  <Text className='summary-value discount'>-¥{giftCardInfo.used_amount}</Text>
                </View>
                <View className='summary-item'>
                  <Text className='summary-label'>购物卡剩余：</Text>
                  <Text className='summary-value'>¥{giftCardInfo.remaining_balance}</Text>
                </View>
              </>
            )}
            <View className='summary-item total-row'>
              <Text className='summary-label total-label'>最终应付：</Text>
              <Text className='summary-value total-value'>¥{finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* 上传凭证按钮 */}
      <Button className='upload-btn' onClick={handleUpload}>
        {finalTotal <= 0 ? '已全额支付' : '上传支付凭证'}
      </Button>

      {/* 优惠券输入弹窗 */}
      {showCouponModal && (
        <View className='modal-overlay' onClick={() => setShowCouponModal(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <View className='modal-header'>
              <Text className='modal-title'>使用优惠券</Text>
              <Text className='modal-close' onClick={() => setShowCouponModal(false)}>✕</Text>
            </View>
            <View className='modal-body'>
              <Input
                className='coupon-input'
                placeholder='请输入优惠券号码'
                value={couponCode}
                onInput={(e) => setCouponCode(e.detail.value)}
                maxlength={50}
              />
              <Button className='modal-confirm-btn' onClick={handleApplyCoupon}>
                确认使用
      </Button>
            </View>
          </View>
        </View>
      )}

      {/* 购物卡选择弹窗 */}
      {showGiftCardModal && (
        <View className='modal-overlay' onClick={() => setShowGiftCardModal(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <View className='modal-header'>
              <Text className='modal-title'>选择购物卡</Text>
              <Text className='modal-close' onClick={() => setShowGiftCardModal(false)}>✕</Text>
            </View>
            <View className='modal-body'>
              {loadingCards ? (
                <View className='modal-loading'>加载中...</View>
              ) : storedValueCards.length === 0 ? (
                <View className='modal-empty'>
                  暂无可用储值卡
                  <Button
                    className='modal-link'
                    onClick={() => {
                      setShowGiftCardModal(false);
                      Taro.navigateTo({ url: '/pages/shopping-card/mine' });
                    }}
                  >
                    去购物卡中心
                  </Button>
                </View>
              ) : (
                <View className='giftcard-list'>
                  {storedValueCards.map((card) => (
                    <View
                      key={card.card_number}
                      className='giftcard-item'
                      onClick={() => handleApplyGiftCard(card.card_number)}
                    >
                      <View className='giftcard-info'>
                        <Text className='giftcard-number'>{card.card_number}</Text>
                        <Text className='giftcard-balance'>余额：¥{card.balance}</Text>
                      </View>
                      <Text className='giftcard-select'>选择</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default OrderPayment;
