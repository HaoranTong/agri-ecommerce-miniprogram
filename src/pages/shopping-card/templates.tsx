import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import StoredValueModal from '../../components/giftcard/StoredValueModal';
import { giftCardService } from '../../services/api';
import type { GiftCardTemplate, GiftCardPurchaseResult } from '../../types';
import './templates.scss';

const typeMap: Record<string, string> = {
  fixed_amount: '储值卡',
  product_bundle: '商品兑换卡',
  custom_bundle: '任意组合卡'
};

const deliveryModeMap: Record<string, string> = {
  digital_share: '数字分享',
  printable: '打印卡'
};

const formatDeliveryModes = (modes?: string[]) => {
  if (!modes || modes.length === 0) {
    return '数字分享 + 打印卡';
  }
  return modes.map((mode) => deliveryModeMap[mode] || mode).join(' / ');
};

const resolvePurchaseFlow = (template: GiftCardTemplate): 'stored_value' | 'bundle' | 'custom' => {
  if (template.purchase_flow) {
    return template.purchase_flow;
  }
  if (template.type === 'product_bundle') {
    return 'bundle';
  }
  if (template.type === 'custom_bundle') {
    return 'custom';
  }
  return 'stored_value';
};

const formatAmountInfo = (template: GiftCardTemplate) => {
  const flow = resolvePurchaseFlow(template);
  if (flow === 'stored_value') {
    if (template.fixed_amount) {
      return `面额 ¥${template.fixed_amount}`;
    }
    if (template.amount_options && template.amount_options.length) {
      return `预设 ¥${template.amount_options.join(' / ¥')}`;
    }
    const min = template.min_amount ? `¥${template.min_amount}` : '';
    const max = template.max_amount ? `¥${template.max_amount}` : '';
    if (min && max) return `可自定义 ${min} - ${max}`;
    if (min) return `不少于 ${min}`;
    if (max) return `不超过 ${max}`;
    return '可自定义金额';
  }

  if (flow === 'bundle') {
    return '兑换指定组合';
  }

  if (flow === 'custom') {
    return '自选商品组合';
  }

  return template.fixed_amount ? `¥${template.fixed_amount}` : '权益查看详情';
};

const GiftCardTemplates = () => {
  const [templates, setTemplates] = useState<GiftCardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [storedValueVisible, setStoredValueVisible] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<GiftCardTemplate | null>(null);
  const [storedValueSubmitting, setStoredValueSubmitting] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await giftCardService.listTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('加载礼品卡模板失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const presentPurchaseResult = async (result: GiftCardPurchaseResult) => {
    const modalResult = await Taro.showModal({
      title: '购卡成功',
      content: `卡号：${result.card_number}\n已自动加入“我的购物卡”，可在卡包中查看和分享。`,
      confirmText: '去分享',
      cancelText: '查看礼品卡'
    });

    if (modalResult.confirm) {
      Taro.navigateTo({ url: '/pages/shopping-card/share-list' });
    } else {
      Taro.navigateTo({ url: '/pages/shopping-card/mine?highlight=new' });
    }
  };

  const handleDirectPurchase = async (template: GiftCardTemplate) => {
    if (purchasingId) return;

    try {
      const confirmResult = await Taro.showModal({
        title: '确认购卡',
        content: `确定购买「${template.name}」吗？`,
        confirmText: '立即购买'
      });
      if (!confirmResult.confirm) {
        return;
      }

      setPurchasingId(template.id);
      const result = await giftCardService.purchase(template.id);
      await presentPurchaseResult(result);
    } catch (error) {
      console.error('购买礼品卡失败', error);
      if (error instanceof Error) {
        Taro.showToast({ title: error.message || '购买失败', icon: 'none' });
      } else {
        Taro.showToast({ title: '购买失败', icon: 'none' });
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const handleStoredValueSubmit = async (amount: number) => {
    if (!currentTemplate) return;

    try {
      setStoredValueSubmitting(true);
      const result = await giftCardService.purchase(currentTemplate.id, { amount });
      setStoredValueVisible(false);
      setCurrentTemplate(null);
      await presentPurchaseResult(result);
    } catch (error) {
      console.error('储值卡购卡失败', error);
      if (error instanceof Error) {
        Taro.showToast({ title: error.message || '购卡失败', icon: 'none' });
      } else {
        Taro.showToast({ title: '购卡失败', icon: 'none' });
      }
    } finally {
      setStoredValueSubmitting(false);
    }
  };

  const redirectToCustomFlow = async (template: GiftCardTemplate) => {
    const modal = await Taro.showModal({
      title: '任意组合礼品卡',
      content: '任意组合礼品卡需要像普通购物一样挑选商品。完成选品后，在提交订单时勾选“购买礼品卡”。是否立即前往首页？',
      cancelText: '稍后再去',
      confirmText: '去首页'
    });
    if (!modal.confirm) return;

    Taro.setStorageSync('PENDING_GIFTCARD_ORDER', {
      flow: 'custom',
      templateId: template.id,
      templateName: template.name,
      autoCheck: true
    });
    Taro.setStorageSync('GIFT_CARD_FLOW_HINT', {
      message: `已开启「${template.name}」礼品卡模式，请从首页挑选商品并在下单页勾选“购买礼品卡”。`
    });
    Taro.switchTab({ url: '/pages/index/index' });
  };

  const handlePurchase = (template: GiftCardTemplate) => {
    const flow = resolvePurchaseFlow(template);
    if (flow === 'stored_value') {
      setCurrentTemplate(template);
      setStoredValueVisible(true);
      return;
    }

    if (flow === 'bundle') {
      Taro.navigateTo({ url: `/pages/shopping-card/bundle-detail?id=${template.id}` });
      return;
    }

    if (flow === 'custom') {
      redirectToCustomFlow(template);
      return;
    }

    handleDirectPurchase(template);
  };

  if (loading) {
    return <View className='giftcard-templates-page loading-state'>加载中...</View>;
  }

  if (!templates.length) {
    return (
      <View className='giftcard-templates-page empty-state'>
        <Text className='empty-text'>暂无可用的礼品卡模板</Text>
        <Button className='refresh-btn' onClick={loadTemplates}>
          重新加载
        </Button>
      </View>
    );
  }

  return (
    <View className='giftcard-templates-page'>
      {templates.map((template) => {
        const amountText = formatAmountInfo(template);
        return (
          <View className='template-card' key={template.id}>
            <View className='template-header'>
              <Text className='template-name'>{template.name}</Text>
              <Text className='template-type'>{typeMap[template.type] || template.type}</Text>
            </View>
            <View className='template-body'>
              <View className='template-row'>
                <Text className='label'>面额 / 权益</Text>
                <Text className='value highlight'>{amountText}</Text>
              </View>
              <View className='template-row'>
                <Text className='label'>有效期</Text>
                <Text className='value'>{template.valid_days} 天</Text>
              </View>
              <View className='template-row'>
                <Text className='label'>交付方式</Text>
                <Text className='value'>{formatDeliveryModes(template.delivery_modes)}</Text>
              </View>
            </View>
            <Button
              className='buy-btn'
              onClick={() => handlePurchase(template)}
              disabled={purchasingId === template.id}
            >
              {purchasingId === template.id ? '处理中...' : '立即购卡'}
            </Button>
            {template.success_copywriting && (
              <Text className='template-footnote'>{template.success_copywriting}</Text>
            )}
          </View>
        );
      })}
      <StoredValueModal
        visible={storedValueVisible}
        template={currentTemplate}
        submitting={storedValueSubmitting}
        onClose={() => {
          if (storedValueSubmitting) return;
          setStoredValueVisible(false);
          setCurrentTemplate(null);
        }}
        onSubmit={handleStoredValueSubmit}
      />
    </View>
  );
};

export default GiftCardTemplates;
