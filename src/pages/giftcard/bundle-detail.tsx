import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCardBundleItem, GiftCardTemplate } from '../../types';
import './bundle-detail.scss';

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

const resolveItemName = (item: GiftCardBundleItem, index: number) =>
  item.name || item.product_name || item.title || `组合商品 ${index + 1}`;

const resolveItemDesc = (item: GiftCardBundleItem) =>
  item.description || item.subtitle || '';

const BundleDetail = () => {
  const params = Taro.getCurrentInstance().router?.params ?? {};
  const templateId = Number(params.id || params.templateId || 0);
  const [template, setTemplate] = useState<GiftCardTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setError('未找到礼品卡模板');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const detail = await giftCardService.getTemplateDetail(templateId);
      setTemplate(detail);
      Taro.setNavigationBarTitle({ title: detail.name });
    } catch (err) {
      console.error('加载礼品卡组合详情失败', err);
      setError(err instanceof Error ? err.message || '加载失败' : '加载失败');
      Taro.showToast({ title: '加载失败', icon: 'none' });
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

  const bundleValueText = useMemo(() => {
    if (template?.fixed_amount) {
      return `组合面值 ¥${template.fixed_amount}`;
    }
    let total = 0;
    let hasPrice = true;
    bundleItems.forEach((item) => {
      const amount = item.price !== undefined && item.price !== null ? Number(item.price) : NaN;
      if (Number.isNaN(amount)) {
        hasPrice = false;
        return;
      }
      const qty = item.quantity ?? 1;
      total += amount * qty;
    });
    if (hasPrice && total > 0) {
      return `约 ¥${total.toFixed(2)}`;
    }
    return '以组合售价结算';
  }, [bundleItems, template]);

  const handleCheckout = () => {
    if (!template) return;
    Taro.navigateTo({ url: `/pages/giftcard/bundle-checkout?id=${template.id}` });
  };

  if (loading) {
    return <View className='bundle-detail-page loading'>加载中...</View>;
  }

  if (error || !template) {
    return (
      <View className='bundle-detail-page empty-state'>
        <Text className='empty-text'>{error || '礼品卡模板不存在'}</Text>
        <Button onClick={loadTemplate}>重新加载</Button>
      </View>
    );
  }

  return (
    <View className='bundle-detail-page'>
      <View className='hero-card'>
        <Text className='template-name'>{template.name}</Text>
        <Text className='template-value'>{bundleValueText}</Text>
        <View className='meta-row'>
          <Text className='label'>有效期</Text>
          <Text className='value'>{template.valid_days} 天</Text>
        </View>
        <View className='meta-row'>
          <Text className='label'>交付方式</Text>
          <Text className='value'>{formatDeliveryModes(template.delivery_modes)}</Text>
        </View>
        {template.success_copywriting && (
          <Text className='success-copy'>{template.success_copywriting}</Text>
        )}
      </View>

      <View className='section'>
        <Text className='section-title'>组合内容</Text>
        {bundleItems.length === 0 && <Text className='placeholder'>暂未配置具体商品，请联系管理员</Text>}
        {bundleItems.map((item, index) => (
          <View className='bundle-item' key={`${item.variation_id || item.product_id || index}`}>
            {item.image_url ? (
              <Image className='item-image' mode='aspectFill' src={item.image_url} />
            ) : (
              <View className='image-placeholder'>图</View>
            )}
            <View className='item-content'>
              <Text className='item-name'>{resolveItemName(item, index)}</Text>
              {resolveItemDesc(item) ? <Text className='item-desc'>{resolveItemDesc(item)}</Text> : null}
              {item.attributes && (
                <View className='attr-row'>
                  {Object.entries(item.attributes).map(([key, value]) => (
                    <Text key={key} className='attr-chip'>
                      {key}：{String(value)}
                    </Text>
                  ))}
                </View>
              )}
              <View className='item-meta'>
                <Text className='quantity'>数量 ×{item.quantity ?? 1}</Text>
                {item.price !== undefined && item.price !== null && (
                  <Text className='price'>¥{Number(item.price).toFixed(2)}</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className='tips-card'>
        <Text className='tips-title'>赠送说明</Text>
        <Text className='tips-text'>下单后需完成支付或上传凭证，审核通过后系统会自动生成礼品卡。</Text>
        <Text className='tips-text'>礼品卡将沉淀在“我的礼品卡”，可随时查看卡号、PIN 并分享给好友。</Text>
      </View>

      <Button className='checkout-btn' onClick={handleCheckout}>
        赠送此组合
      </Button>
    </View>
  );
};

export default BundleDetail;
