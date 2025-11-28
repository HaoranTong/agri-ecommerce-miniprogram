import { Button, Input, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { giftCardService, orderService } from '../../services/api';
import type { GiftCardTemplate } from '../../types';
import './custom-checkout.scss';

const STORAGE_KEY = 'GIFT_CARD_CUSTOM_SELECTION';
const phoneRegex = /^1[3-9]\d{9}$/;

interface SelectedItemSnapshot {
  variation_id: number;
  quantity: number;
  product_name: string;
  variation_name: string;
  price: number;
  image_url?: string;
}

const CustomCheckout = () => {
  const params = Taro.getCurrentInstance().router?.params ?? {};
  const templateId = Number(params.id || params.templateId || 0);

  const [template, setTemplate] = useState<GiftCardTemplate | null>(null);
  const [selection, setSelection] = useState<SelectedItemSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('送你一份定制好礼，愿你喜欢');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!templateId) {
        setLoading(false);
        Taro.showToast({ title: '缺少模板参数', icon: 'none' });
        return;
      }
      const stored = Taro.getStorageSync(STORAGE_KEY);
      if (!stored || stored.templateId !== templateId) {
        setLoading(false);
        Taro.showToast({ title: '请先选择组合商品', icon: 'none' });
        setTimeout(() => {
          Taro.redirectTo({ url: `/pages/giftcard/custom-builder?id=${templateId}` });
        }, 1000);
        return;
      }
      try {
        setSelection(stored.selections || []);
        setLoading(true);
        const detail = await giftCardService.getTemplateDetail(templateId);
        setTemplate(detail);
        Taro.setNavigationBarTitle({ title: `${detail.name}-下单` });
      } catch (error) {
        console.error('加载任意组合 checkout 数据失败', error);
        Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [templateId]);

  const totalAmount = useMemo(() => {
    return selection.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selection]);

  const totalQuantity = useMemo(() => {
    return selection.reduce((sum, item) => sum + item.quantity, 0);
  }, [selection]);

  const validate = () => {
    if (!template) {
      Taro.showToast({ title: '模板未加载', icon: 'none' });
      return false;
    }
    if (!selection.length) {
      Taro.showToast({ title: '请返回上一页选择商品', icon: 'none' });
      return false;
    }
    if (!recipientName.trim()) {
      Taro.showToast({ title: '请填写受赠人昵称', icon: 'none' });
      return false;
    }
    if (recipientPhone.trim() && !phoneRegex.test(recipientPhone.trim())) {
      Taro.showToast({ title: '请输入正确手机号', icon: 'none' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !template) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        giftcard_mode: 'custom' as const,
        giftcard_template_id: template.id,
        giftcard_payload: {
          message: message.trim(),
          recipient_hint: recipientName.trim(),
          recipient_contact: recipientPhone.trim() || undefined,
          remark: remark.trim() || undefined,
          selected_items: selection.map((item) => ({
            variation_id: item.variation_id,
            quantity: item.quantity
          })),
          total_amount_hint: totalAmount
        }
      };

      const order = await orderService.createOrder(payload);
      Taro.removeStorageSync(STORAGE_KEY);
      Taro.showToast({ title: '订单已创建', icon: 'success' });
      setTimeout(() => {
        Taro.redirectTo({ url: `/pages/order/order-confirm?orderId=${order.order_id}&from=giftcard_custom` });
      }, 600);
    } catch (error) {
      console.error('任意组合下单失败', error);
      Taro.showToast({ title: error instanceof Error ? error.message || '提交失败' : '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View className='custom-checkout-page loading'>加载中...</View>;
  }

  if (!template) {
    return (
      <View className='custom-checkout-page empty-state'>
        <Text>未找到礼品卡模板</Text>
      </View>
    );
  }

  return (
    <View className='custom-checkout-page'>
      <View className='summary-card'>
        <Text className='title'>{template.name}</Text>
        <Text className='value'>已选 {totalQuantity} 件 · ¥{totalAmount.toFixed(2)}</Text>
        <Text className='hint'>提交订单后完成支付，系统即会生成礼品卡权益</Text>
      </View>

      <View className='section'>
        <Text className='section-title'>自选商品</Text>
        {selection.map((item) => (
          <View className='selected-item' key={item.variation_id}>
            <View className='info'>
              <Text className='name'>{item.product_name}</Text>
              <Text className='spec'>{item.variation_name}</Text>
            </View>
            <View className='meta'>
              <Text className='qty'>×{item.quantity}</Text>
              <Text className='price'>¥{item.price.toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className='section'>
        <Text className='section-title'>赠言</Text>
        <Textarea
          className='message-input'
          value={message}
          maxlength={150}
          onInput={(event) => setMessage(event.detail.value)}
          placeholder='写下祝福'
        />
      </View>

      <View className='section'>
        <Text className='section-title'>受赠人信息</Text>
        <View className='form-row'>
          <Text className='label'>受赠人昵称</Text>
          <Input
            className='input'
            value={recipientName}
            placeholder='便于识别礼品卡归属'
            onInput={(event) => setRecipientName(event.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='label'>手机（可选）</Text>
          <Input
            className='input'
            type='number'
            maxlength={11}
            value={recipientPhone}
            placeholder='便于客服联系'
            onInput={(event) => setRecipientPhone(event.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='label'>备注（可选）</Text>
          <Input
            className='input'
            value={remark}
            placeholder='如需额外说明可填写'
            onInput={(event) => setRemark(event.detail.value)}
          />
        </View>
      </View>

      <View className='section tips'>
        <Text className='section-title'>支付提示</Text>
        <Text className='tip-text'>创建订单后请上传支付凭证，审核完成即发放礼品卡。</Text>
      </View>

      <Button className='submit-btn' loading={submitting} onClick={handleSubmit}>
        {submitting ? '提交中' : '提交订单'}
      </Button>
    </View>
  );
};

export default CustomCheckout;
