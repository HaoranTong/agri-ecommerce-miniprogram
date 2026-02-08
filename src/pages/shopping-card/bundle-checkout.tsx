import { Button, Input, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService, orderService } from '../../services/api';
import type { GiftCardBundleItem, GiftCardTemplate } from '../../types';
import { decimalMult } from '../../utils/decimal';
import './bundle-checkout.scss';

const phoneRegex = /^1[3-9]\d{9}$/;

const BundleCheckout = () => {
  const params = Taro.getCurrentInstance().router?.params ?? {};
  const templateId = Number(params.id || params.templateId || 0);

  const [template, setTemplate] = useState<GiftCardTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState('祝你生日快乐，期待与你分享美味时刻');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [remark, setRemark] = useState('');

  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setLoading(false);
      Taro.showToast({ title: '缺少模板信息', icon: 'none' });
      return;
    }
    try {
      setLoading(true);
      const detail = await giftCardService.getTemplateDetail(templateId);
      setTemplate(detail);
      Taro.setNavigationBarTitle({ title: detail.name });
    } catch (error) {
      console.error('加载组合模板失败', error);
      Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const bundleItems = useMemo(() => {
    if (!template || !Array.isArray(template.bundle_items)) {
      return [] as GiftCardBundleItem[];
    }
    return template.bundle_items;
  }, [template]);

  const faceValueText = useMemo(() => {
    if (template?.fixed_amount) {
      return `组合面值 ¥${template.fixed_amount}`;
    }
    let total = 0;
    let hasPrice = true;
    bundleItems.forEach((item) => {
      const price = item.price !== undefined && item.price !== null ? Number(item.price) : NaN;
      if (Number.isNaN(price)) {
        hasPrice = false;
        return;
      }
      total += decimalMult(price, item.quantity ?? 1, 2);
    });
    if (hasPrice && total > 0) {
      return `约 ¥${total.toFixed(2)}`;
    }
    return '以组合售价结算';
  }, [bundleItems, template]);

  const validate = () => {
    if (!template) {
      Taro.showToast({ title: '模板未加载完成', icon: 'none' });
      return false;
    }
    if (!recipientName.trim()) {
      Taro.showToast({ title: '请填写受赠人昵称', icon: 'none' });
      return false;
    }
    if (recipientPhone.trim() && !phoneRegex.test(recipientPhone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号码', icon: 'none' });
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
        giftcard_mode: 'bundle' as const,
        giftcard_template_id: template.id,
        giftcard_payload: {
          message: message.trim(),
          recipient_hint: recipientName.trim(),
          recipient_contact: recipientPhone.trim() || undefined,
          remark: remark.trim() || undefined
        }
      };
      const order = await orderService.createOrder(payload);
      Taro.showToast({ title: '订单已创建', icon: 'success' });
      setTimeout(() => {
        Taro.redirectTo({ url: `/pages/order/order-confirm?orderId=${order.order_id}&from=giftcard_bundle` });
      }, 600);
    } catch (error) {
      console.error('提交礼品卡组合订单失败', error);
      Taro.showToast({ title: error instanceof Error ? error.message || '提交失败' : '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View className='bundle-checkout-page loading'>加载中...</View>;
  }

  if (!template) {
    return (
      <View className='bundle-checkout-page empty-state'>
        <Text>未查询到礼品卡模板</Text>
        <Button onClick={loadTemplate}>重新加载</Button>
      </View>
    );
  }

  return (
    <View className='bundle-checkout-page'>
      <View className='summary-card'>
        <Text className='title'>{template.name}</Text>
        <Text className='value'>{faceValueText}</Text>
        <Text className='hint'>成功后将生成礼品卡，去“我的礼品卡”即可查看/分享</Text>
      </View>

      <View className='section'>
        <Text className='section-title'>赠言</Text>
        <Textarea
          className='message-input'
          value={message}
          maxlength={120}
          onInput={(event) => setMessage(event.detail.value)}
          placeholder='写下想对TA说的话'
        />
      </View>

      <View className='section'>
        <Text className='section-title'>受赠人信息</Text>
        <View className='form-row'>
          <Text className='label'>受赠人昵称</Text>
          <Input
            className='input'
            value={recipientName}
            placeholder='方便识别礼品卡归属'
            onInput={(event) => setRecipientName(event.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='label'>手机（可选）</Text>
          <Input
            className='input'
            type='number'
            value={recipientPhone}
            placeholder='便于客服联系'
            maxlength={11}
            onInput={(event) => setRecipientPhone(event.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='label'>备注（可选）</Text>
          <Input
            className='input'
            value={remark}
            placeholder='如有额外说明可填写'
            onInput={(event) => setRemark(event.detail.value)}
          />
        </View>
      </View>

      <View className='section tips'>
        <Text className='section-title'>支付提示</Text>
        <Text className='tip-text'>创建订单后完成微信支付，系统将自动发放购物卡。</Text>
        <Text className='tip-text'>如需加急处理，可联系企业客服并提供订单号。</Text>
      </View>

      <Button className='submit-btn' loading={submitting} onClick={handleSubmit}>
        {submitting ? '提交中' : '提交订单并去支付'}
      </Button>
    </View>
  );
};

export default BundleCheckout;
