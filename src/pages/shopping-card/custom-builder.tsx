import { Button, Image, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { giftCardService, productService } from '../../services/api';
import type { GiftCardTemplate, Product, ProductVariation } from '../../types';
import './custom-builder.scss';

interface VariationSnapshot {
  variation_id: number;
  product_id: number;
  product_name: string;
  variation_name: string;
  price: number;
  attributes: Record<string, string>;
  image_url?: string | null;
}

const STORAGE_KEY = 'GIFT_CARD_CUSTOM_SELECTION';

const flattenVariations = (products: Product[]): VariationSnapshot[] => {
  const snapshots: VariationSnapshot[] = [];
  products.forEach((product) => {
    if (product.variations && product.variations.length > 0) {
      product.variations.forEach((variation: ProductVariation) => {
        const price = Number(variation.price ?? product.price ?? 0);
        snapshots.push({
          variation_id: variation.variation_id,
          product_id: product.id,
          product_name: product.name,
          variation_name: Object.entries(variation.attributes || {})
            .map(([key, value]) => `${key}:${value}`)
            .join(' | '),
          price,
          attributes: variation.attributes || {},
          image_url: variation.image_url || product.image_url || null
        });
      });
      return;
    }

    const price = Number(product.price ?? product.min_price ?? 0);
    snapshots.push({
      variation_id: product.id,
      product_id: product.id,
      product_name: product.name,
      variation_name: '默认规格',
      price,
      attributes: {},
      image_url: product.image_url || null
    });
  });
  return snapshots;
};

const CustomBuilder = () => {
  const params = Taro.getCurrentInstance().router?.params ?? {};
  const templateId = Number(params.id || params.templateId || 0);

  const [template, setTemplate] = useState<GiftCardTemplate | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedMap, setSelectedMap] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = async () => {
      if (!templateId) {
        setError('缺少模板 ID');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [detail, products] = await Promise.all([
          giftCardService.getTemplateDetail(templateId),
          productService.getProducts()
        ]);
        setTemplate(detail);
        setAllProducts(products);
        Taro.setNavigationBarTitle({ title: detail.name });
      } catch (err) {
        console.error('加载任意组合模板或商品失败', err);
        setError(err instanceof Error ? err.message || '加载失败' : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [templateId]);

  useEffect(() => {
    const stored = Taro.getStorageSync(STORAGE_KEY);
    if (stored && stored.templateId === templateId && Array.isArray(stored.selections)) {
      const initial: Record<number, number> = {};
      stored.selections.forEach((item: { variation_id: number; quantity: number }) => {
        initial[item.variation_id] = item.quantity;
      });
      setSelectedMap(initial);
    }
  }, [templateId]);

  const allowedVariations = useMemo(() => {
    if (!template) return [] as VariationSnapshot[];
    const flattened = flattenVariations(allProducts);
    const allowedVariationIds = template.allowed_variation_ids;
    const allowedProductIds = template.allowed_product_ids;

    return flattened.filter((item) => {
      if (allowedVariationIds && allowedVariationIds.length > 0) {
        return allowedVariationIds.includes(item.variation_id);
      }
      if (allowedProductIds && allowedProductIds.length > 0) {
        return allowedProductIds.includes(item.product_id);
      }
      return true;
    });
  }, [allProducts, template]);

  const filteredVariations = useMemo(() => {
    if (!keyword.trim()) return allowedVariations;
    return allowedVariations.filter((item) => {
      const target = `${item.product_name} ${item.variation_name}`;
      return target.toLowerCase().includes(keyword.trim().toLowerCase());
    });
  }, [allowedVariations, keyword]);

  const totalQuantity = useMemo(
    () => Object.values(selectedMap).reduce((sum, qty) => sum + qty, 0),
    [selectedMap]
  );

  const totalAmount = useMemo(() => {
    return Object.entries(selectedMap).reduce((sum, [variationId, qty]) => {
      const snapshot = allowedVariations.find((item) => item.variation_id === Number(variationId));
      if (!snapshot) return sum;
      return sum + snapshot.price * qty;
    }, 0);
  }, [allowedVariations, selectedMap]);

  const handleAdjust = (variationId: number, nextQty: number) => {
    const snapshot = allowedVariations.find((item) => item.variation_id === variationId);
    if (!snapshot) {
      Taro.showToast({ title: '该商品不可选择', icon: 'none' });
      return;
    }

    setSelectedMap((prev) => {
      const updated = { ...prev };
      if (nextQty <= 0) {
        delete updated[variationId];
      } else {
        updated[variationId] = nextQty;
      }

      const nextTotalQuantity = Object.values(updated).reduce((sum, qty) => sum + qty, 0);
      if (template?.max_items && nextTotalQuantity > template.max_items) {
        Taro.showToast({ title: `最多选择 ${template.max_items} 件`, icon: 'none' });
        return prev;
      }

      const nextTotalAmount = Object.entries(updated).reduce((sum, [vid, qty]) => {
        const variationSnapshot = allowedVariations.find((item) => item.variation_id === Number(vid));
        if (!variationSnapshot) return sum;
        return sum + variationSnapshot.price * qty;
      }, 0);
      if (template?.max_total && nextTotalAmount > template.max_total) {
        Taro.showToast({ title: `金额不可超过 ¥${template.max_total}`, icon: 'none' });
        return prev;
      }

      return updated;
    });
  };

  const validateSelection = () => {
    if (!template) {
      Taro.showToast({ title: '模板未加载', icon: 'none' });
      return false;
    }
    if (Object.keys(selectedMap).length === 0) {
      Taro.showToast({ title: '请先选择商品', icon: 'none' });
      return false;
    }
    if (template.max_items && totalQuantity > template.max_items) {
      Taro.showToast({ title: `最多选择 ${template.max_items} 件`, icon: 'none' });
      return false;
    }
    if (template.max_total && totalAmount > template.max_total) {
      Taro.showToast({ title: `金额不可超过 ¥${template.max_total}`, icon: 'none' });
      return false;
    }
    return true;
  };

  const handleProceed = () => {
    if (!template) return;
    if (!validateSelection()) return;

    const selections = Object.entries(selectedMap).map(([variationId, quantity]) => {
      const snapshot = allowedVariations.find((item) => item.variation_id === Number(variationId));
      if (!snapshot) return null;
      return {
        variation_id: snapshot.variation_id,
        quantity,
        product_name: snapshot.product_name,
        variation_name: snapshot.variation_name,
        price: snapshot.price,
        image_url: snapshot.image_url || undefined
      };
    }).filter(Boolean);

    Taro.setStorageSync(STORAGE_KEY, {
      templateId: template.id,
      selections,
      totalAmount,
      totalQuantity
    });

    Taro.navigateTo({ url: `/pages/shopping-card/custom-checkout?id=${template.id}` });
  };

  if (loading) {
    return <View className='custom-builder-page loading'>加载中...</View>;
  }

  if (error || !template) {
    return (
      <View className='custom-builder-page empty-state'>
        <Text className='empty-text'>{error || '模板不存在'}</Text>
        <Button onClick={() => Taro.reLaunch({ url: '/pages/shopping-card/templates' })}>返回模板列表</Button>
      </View>
    );
  }

  return (
    <View className='custom-builder-page'>
      <View className='template-summary'>
        <Text className='template-name'>{template.name}</Text>
        <Text className='rule-text'>可选商品数量上限：{template.max_items || '不限'}</Text>
        <Text className='rule-text'>金额上限：{template.max_total ? `¥${template.max_total}` : '不限'}</Text>
      </View>

      <View className='search-bar'>
        <Input
          className='search-input'
          value={keyword}
          placeholder='搜索商品或规格'
          onInput={(event) => setKeyword(event.detail.value)}
        />
      </View>

      <View className='product-list'>
        {filteredVariations.length === 0 && <Text className='placeholder'>暂无可选商品</Text>}
        {filteredVariations.map((item) => {
          const qty = selectedMap[item.variation_id] || 0;
          return (
            <View className='product-card' key={item.variation_id}>
              {item.image_url ? (
                <Image className='cover' mode='aspectFill' src={item.image_url} />
              ) : (
                <View className='cover placeholder'>图</View>
              )}
              <View className='info'>
                <Text className='product-name'>{item.product_name}</Text>
                <Text className='variation-name'>{item.variation_name}</Text>
                <Text className='price'>¥{item.price.toFixed(2)}</Text>
              </View>
              <View className='quantity-control'>
                <Button
                  className='adjust'
                  disabled={qty === 0}
                  onClick={() => handleAdjust(item.variation_id, qty - 1)}
                >
                  -
                </Button>
                <Text className='qty'>{qty}</Text>
                <Button className='adjust' onClick={() => handleAdjust(item.variation_id, qty + 1)}>
                  +
                </Button>
              </View>
            </View>
          );
        })}
      </View>

      <View className='summary-bar'>
        <View>
          <Text className='summary-count'>已选 {totalQuantity} 件</Text>
          <Text className='summary-amount'>合计 ¥{totalAmount.toFixed(2)}</Text>
        </View>
        <Button className='next-btn' onClick={handleProceed}>
          下一步
        </Button>
      </View>
    </View>
  );
};

export default CustomBuilder;
