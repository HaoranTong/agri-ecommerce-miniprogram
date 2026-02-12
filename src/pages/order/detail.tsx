import { Button, Checkbox, CheckboxGroup, Image, Input, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { configService, orderService } from '../../services/api';
import type { OrderDetail as OrderDetailType } from '../../types';
import HelpTooltip from '../../components/HelpTooltip';
import './detail.scss';

const OrderDetail = () => {
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerServiceQr, setCustomerServiceQr] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnContact, setReturnContact] = useState('');
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [returnUploading, setReturnUploading] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnConfirmed, setReturnConfirmed] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactDraft, setContactDraft] = useState('');

  const orderId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    return params.id || params.orderId || params.order_id || params.out_order_id || '';
  }, []);

  const getStatusInfo = (currentOrder: OrderDetailType) => {
    const { status, return_status, is_gift_card_order } = currentOrder;

    if (return_status === 'requested') {
      return { text: '申请退货', color: '#ff5722', icon: '🔄', tip: '已提交退货申请，等待客服处理' };
    }
    if (return_status === 'approved') {
      return { text: '退货已同意', color: '#ff9800', icon: '🧾', tip: '客服已同意退货，请按指引操作' };
    }
    if (return_status === 'rejected') {
      return { text: '退货已拒绝', color: '#9e9e9e', icon: '⚠️', tip: '退货申请未通过' };
    }
    if (return_status === 'refunded') {
      return { text: '已退款', color: '#4caf50', icon: '✅', tip: '退款已完成' };
    }
    
    if (status === 'pending') {
      return { text: '待支付', color: '#ff9800', icon: '⏱️', tip: '请尽快完成支付' };
    }
    if (status === 'processing') {
      if (is_gift_card_order) {
        return { text: '支付成功/待发卡', color: '#2196f3', icon: '🎁', tip: '购物卡正在发放' };
      }
      return { text: '支付成功/待发货', color: '#2196f3', icon: '📦', tip: '商家正在准备商品' };
    }
    if (status === 'on-hold') {
      if (is_gift_card_order) {
        return { text: '待发卡', color: '#2196f3', icon: '🎁', tip: '购物卡正在发放' };
      }
      return { text: '已发货', color: '#4caf50', icon: '🚚', tip: '包裹正在运输中' };
    }
    if (status === 'completed') {
      if (is_gift_card_order) {
        return { text: '已发卡', color: '#4caf50', icon: '✅', tip: '购物卡已发放' };
      }
      return { text: '已签收', color: '#4caf50', icon: '✅', tip: '订单已完成' };
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

  const loadPublicConfig = useCallback(async () => {
    try {
      const config = await configService.getPublicConfig();
      setCustomerServiceQr(config?.customer_service_qr || '');
    } catch (error) {
      // 忽略配置失败，避免阻塞主流程
    }
  }, []);

  useEffect(() => {
    loadPublicConfig();
  }, [loadPublicConfig]);

  const toNumber = (value?: string | number | null) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const handleGoPayment = () => {
    if (!order?.order_id) return;
    const payable = toNumber(order.total);
    if (payable <= 0) {
      Taro.redirectTo({ url: `/pages/order/payment-success?orderId=${order.order_id}` });
      return;
    }
    Taro.navigateTo({ url: `/pages/order/payment?orderId=${order.order_id}` });
  };

  const handleContactService = () => {
    const qrUrl = order?.customer_service_qr || customerServiceQr;
    if (qrUrl) {
      Taro.previewImage({
        urls: [qrUrl],
        current: qrUrl
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

  const handleGoCart = () => {
    Taro.switchTab({ url: '/pages/cart/index' });
  };

  const handleGoProfile = () => {
    Taro.switchTab({ url: '/pages/user/profile' });
  };

  const handleRequestReturn = () => {
    if (!order) return;
    if (!(order.status === 'processing' || order.status === 'completed')) {
      Taro.showToast({ title: '当前订单状态不可申请退货', icon: 'none' });
      return;
    }
    if (order.return_status && order.return_status !== 'none') {
      Taro.showToast({ title: '退货已处理中', icon: 'none' });
      return;
    }
    setReturnReason('');
    setReturnContact('');
    setReturnImages([]);
    setContactDraft('');
    setReturnConfirmed(false);
    setShowReturnModal(true);
  };

  const handleChooseReturnImages = async () => {
    if (!order) return;
    if (returnUploading) return;
    const remaining = 3 - returnImages.length;
    if (remaining <= 0) {
      Taro.showToast({ title: '最多上传3张图片', icon: 'none' });
      return;
    }

    try {
      const result = await Taro.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      if (!result.tempFilePaths?.length) return;

      setReturnUploading(true);
      const uploaded: string[] = [];
      for (const path of result.tempFilePaths) {
        const url = await orderService.uploadReturnImage(order.order_id, path);
        if (url) {
          uploaded.push(url);
        }
      }
      setReturnImages((prev) => [...prev, ...uploaded]);
    } catch (error) {
      Taro.showToast({ title: '图片上传失败，请重试', icon: 'none' });
    } finally {
      setReturnUploading(false);
    }
  };

  const handleRemoveReturnImage = (index: number) => {
    setReturnImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReturn = async () => {
    if (!order || returnSubmitting) return;

    if (!customerServiceQr) {
      Taro.showToast({ title: '请先添加客服微信', icon: 'none' });
      return;
    }

    if (!returnConfirmed) {
      Taro.showToast({ title: '请确认已添加客服微信', icon: 'none' });
      return;
    }

    if (!returnReason.trim()) {
      Taro.showToast({ title: '请填写退货原因', icon: 'none' });
      return;
    }

    if (!returnContact.trim()) {
      Taro.showToast({ title: '请填写联系方式（微信/手机号）', icon: 'none' });
      return;
    }

    try {
      setReturnSubmitting(true);
      const result = await orderService.requestReturn(order.order_id, {
        reason: returnReason.trim(),
        contact: returnContact.trim(),
        images: returnImages
      });
      setOrder({
        ...order,
        return_status: result.return_status,
        return_requested_at: result.return_requested_at
      });
      setShowReturnModal(false);
      Taro.showToast({ title: '已提交退货申请', icon: 'success' });
    } catch (error) {
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' });
    } finally {
      setReturnSubmitting(false);
    }
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
          <HelpTooltip page='order/detail' location='order_status' />
        </View>
      </View>

      {/* 物流信息 */}
      {order.tracking_number && (
        <View className='card logistics-card'>
          <View className='info-row'>
            <Text className='card-title'>🚚 物流信息</Text>
            <HelpTooltip page='order/detail' location='tracking_info' />
          </View>
          <View className='logistics-content'>
            <View className='info-row'>
              <Text className='label'>物流公司</Text>
              <Text className='value'>{order.tracking_company || '暂无'}</Text>
            </View>
            <View className='info-row'>
              <Text className='label'>运单号码</Text>
              <Text className='value tracking'>{order.tracking_number}</Text>
            </View>
            {order.shipped_at && (
              <View className='info-row'>
                <Text className='label'>发货时间</Text>
                <Text className='value'>{order.shipped_at}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {order.return_status === 'requested' && (
        <View className='card'>
          <Text className='card-title'>📌 退货申请</Text>
          <View className='info-row'>
            <Text className='label'>状态</Text>
            <Text className='value'>已提交</Text>
          </View>
          {order.return_requested_at && (
            <View className='info-row'>
              <Text className='label'>提交时间</Text>
              <Text className='value'>{order.return_requested_at}</Text>
            </View>
          )}
        </View>
      )}

      {/* 商品信息 */}
      <View className='card'>
        <Text className='card-title'>📦 商品信息</Text>
        {order.items?.map((item, index) => (
          <View key={index} className='product-item'>
            <View className='product-info'>
              <Text className='product-name'>{item.product_name || item.name}</Text>
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
        <Button className='contact-btn' onClick={handleRequestReturn}>
          申请退货
          <HelpTooltip page='order/detail' location='refund_button' />
        </Button>
        {order.status === 'pending' && (
          <Button className='pay-btn' onClick={handleGoPayment}>
            去支付
          </Button>
        )}
      </View>

      {showReturnModal && (
        <View className='return-modal-mask' onClick={() => setShowReturnModal(false)}>
          <View className='return-modal' onClick={(event) => event.stopPropagation()}>
            <Text className='return-title'>申请退货/售后</Text>
            <Text className='return-tip'>请先添加客服微信，再填写退货原因，客服将尽快与您联系。</Text>
            <View className='return-qr'>
              <Text className='return-label'>客服微信二维码</Text>
              {customerServiceQr ? (
                <Image
                  className='return-qr-img'
                  src={customerServiceQr}
                  mode='widthFix'
                  onClick={() =>
                    Taro.previewImage({
                      urls: [customerServiceQr],
                      current: customerServiceQr
                    })
                  }
                />
              ) : (
                <Text className='return-qr-placeholder'>客服二维码未配置，请联系管理员</Text>
              )}
            </View>
            <Text className='return-qr-hint'>点击上面二维码，长按识别添加或直接打开客服微信申请退货</Text>
            <CheckboxGroup
              onChange={(e) => {
                const values: string[] = e?.detail?.value || [];
                setReturnConfirmed(values.includes('confirmed'));
              }}
            >
              <View className='return-confirm'>
                <Checkbox className='return-checkbox' value='confirmed' checked={returnConfirmed} />
                <Text className='return-confirm-text'>我已添加客服微信，将在微信中沟通</Text>
              </View>
            </CheckboxGroup>
            <View className='return-field'>
              <Text className='return-label'>退货原因</Text>
              <Textarea
                className='return-textarea'
                placeholder='例如：商品破损/错发/不满意等'
                value={returnReason}
                maxlength={200}
                onInput={(e) => setReturnReason(e.detail.value)}
              />
            </View>
            <View className='return-field'>
              <Text className='return-label'>联系方式（微信/手机号）</Text>
              <Button
                className='return-contact-btn'
                onClick={() => {
                  setContactDraft(returnContact);
                  setShowContactModal(true);
                }}
              >
                {returnContact ? `已填写：${returnContact}` : '点击填写联系方式'}
              </Button>
            </View>
            <View className='return-field'>
              <Text className='return-label'>问题图片（最多3张）</Text>
              <View className='return-images'>
                {returnImages.map((img, index) => (
                  <View className='return-image-item' key={img}>
                    <Image
                      className='return-image'
                      src={img}
                      mode='aspectFill'
                      onClick={() =>
                        Taro.previewImage({
                          urls: returnImages,
                          current: img
                        })
                      }
                    />
                    <Text className='return-image-remove' onClick={() => handleRemoveReturnImage(index)}>
                      ✕
                    </Text>
                  </View>
                ))}
                {returnImages.length < 3 && (
                  <View className='return-image-add' onClick={handleChooseReturnImages}>
                    <Text>{returnUploading ? '上传中...' : '添加图片'}</Text>
                  </View>
                )}
              </View>
            </View>
            <View className='return-actions'>
              <Button className='return-cancel' onClick={() => setShowReturnModal(false)}>
                取消
              </Button>
              <Button
                className='return-submit'
                loading={returnSubmitting}
                onClick={handleSubmitReturn}
              >
                提交申请
              </Button>
            </View>
          </View>
        </View>
      )}

      {showContactModal && (
        <View className='return-modal-mask' onClick={() => setShowContactModal(false)}>
          <View className='return-modal' onClick={(event) => event.stopPropagation()}>
            <Text className='return-title'>填写联系方式</Text>
            <Text className='return-tip'>请输入手机号码或微信号码，便于客服与您联系。</Text>
            <Input
              className='return-input'
              placeholder='请输入手机号码或微信号'
              value={contactDraft}
              onInput={(e) => setContactDraft(e.detail.value)}
            />
            <View className='return-actions'>
              <Button className='return-cancel' onClick={() => setShowContactModal(false)}>
                取消
              </Button>
              <Button
                className='return-submit'
                onClick={() => {
                  const trimmed = contactDraft.trim();
                  if (!trimmed) {
                    Taro.showToast({ title: '请输入联系方式', icon: 'none' });
                    return;
                  }
                  setReturnContact(trimmed);
                  setShowContactModal(false);
                }}
              >
                保存
              </Button>
            </View>
          </View>
        </View>
      )}

      <View className='bottom-nav'>
        <Button className='nav-btn' onClick={handleGoHome}>
          首页
        </Button>
        <Button className='nav-btn' onClick={handleGoCart}>
          购物车
        </Button>
        <Button className='nav-btn' onClick={handleGoProfile}>
          我的
        </Button>
      </View>
    </View>
  );
};

export default OrderDetail;
