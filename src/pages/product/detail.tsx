import { Button, Picker, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { productService } from '../../services/api';
import type { Product, ProductVariation } from '../../types';
import './detail.scss';

const ProductDetail = () => {
  const productId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    return Number(params.id || params.productId || 0);
  }, []);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [variationOptions, setVariationOptions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await productService.getProducts();
        const found = products.find((item) => item.id === productId) || null;
        setProduct(found);
        if (found?.variations?.length) {
          setVariationOptions(found.variations.map((variation) => variation.variation_id.toString()));
          setSelectedVariation(found.variations[0]);
        }
      } catch (error) {
        console.error('获取商品详情失败', error);
        Taro.showToast({ title: '获取商品失败', icon: 'none' });
      }
    };

    loadProduct();
  }, [productId]);

  const handleVariationChange = (event: any) => {
    const index = Number(event.detail.value);
    setSelectedIndex(index);
    if (product?.variations?.[index]) {
      setSelectedVariation(product.variations[index]);
    }
  };

  const handleCreateOrder = () => {
    if (!selectedVariation) {
      Taro.showToast({ title: '请选择规格', icon: 'none' });
      return;
    }

    Taro.navigateTo({
      url: `/pages/order/create?variation_id=${selectedVariation.variation_id}&product_name=${product?.name}`
    });
  };

  if (!product) {
    return <View className="loading">商品加载中...</View>;
  }

  return (
    <View className="product-detail-page">
      <View className="card">
        <Text className="section-title">{product.name}</Text>
        {product.description && (
          <Text className="product-description">{product.description}</Text>
        )}
        <View className="info-row">
          <Text>规格选择</Text>
          <Picker mode="selector" range={variationOptions} value={selectedIndex} onChange={handleVariationChange}>
            <View className="picker-value">
              {selectedVariation?.attributes
                ? Object.values(selectedVariation.attributes).join(' / ')
                : '请选择规格'}
            </View>
          </Picker>
        </View>
        <View className="info-row">
          <Text>价格</Text>
          <Text>¥{selectedVariation?.price ?? '--'}</Text>
        </View>
      </View>

      <Button className="pay-btn" onClick={handleCreateOrder}>
        立即下单
      </Button>
    </View>
  );
};

export default ProductDetail;
