import { Image, Text, View } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { productService } from '../../services/api';
import type { Product } from '../../types';
import './redeem.scss';

const ProductRedeem = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const isVariationInStock = (variation: any) => {
    if (!variation) return true;
    const rawQuantity = variation.stock_quantity;
    if (rawQuantity !== null && rawQuantity !== undefined) {
      const parsed = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) : rawQuantity;
      if (!Number.isNaN(parsed)) {
        return parsed > 0;
      }
    }
    if (typeof variation.in_stock === 'boolean') {
      return variation.in_stock;
    }
    const stockStatus = variation.stock_status;
    if (stockStatus) {
      return !['outofstock', 'out_of_stock', 'soldout', 'sold_out'].includes(stockStatus);
    }
    return true;
  };

  const pickRecommendedVariation = (product: Product) => {
    if (!product.variations || product.variations.length === 0) return null;
    return product.variations.find((v) => isVariationInStock(v)) || product.variations[0];
  };

  const loadProducts = async (showSkeleton = true) => {
    try {
      if (showSkeleton) {
        setLoading(true);
      }
      const productList = await productService.getRedeemableProducts();
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      console.error('获取积分兑换商品列表失败', error);
      Taro.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
    } finally {
      if (showSkeleton) {
        setLoading(false);
      }
      Taro.stopPullDownRefresh();
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  usePullDownRefresh(() => {
    loadProducts(false);
  });

  const handleProductSelect = (product: Product) => {
    Taro.navigateTo({
      url: `/pages/product/detail?id=${product.id}&from=points_redeem`
    });
  };

  const handleVariantSelect = (product: Product, variation: any) => {
    // 跳转到详情页并预选规格
    Taro.navigateTo({
      url: `/pages/product/detail?id=${product.id}&variation_id=${variation.variation_id}&from=points_redeem`
    });
  };

  return (
    <View className='product-redeem-page'>
      <View className='page-header'>
        <Text className='page-title'>积分兑换商品</Text>
        <Text className='page-subtitle'>使用积分兑换心仪商品</Text>
      </View>

      {loading && products.length === 0 && (
        <View className='loading'>加载中...</View>
      )}

      {!loading && products.length === 0 && (
        <View className='empty'>
          <Text className='empty-text'>暂无可兑换商品</Text>
          <Text className='empty-tip'>请稍后再来查看</Text>
        </View>
      )}

      {/* 商品列表 */}
      <View className='product-list'>
        {products.map((product) => {
          const recommendedVariation = pickRecommendedVariation(product);
          return (
            <View key={product.id} className='product-item'>
              {/* 商品图片（满屏宽） */}
              <Image
                className='product-main-image'
                src={recommendedVariation?.image_url || product.image_url || ''}
                mode='widthFix'
                onClick={() => handleProductSelect(product)}
              />
              
              {/* 商品信息 */}
              <View className='product-info'>
                <Text className='product-name'>{product.name}</Text>
                <View className='price-row'>
                  <Text className='price-range'>
                    {product.min_price === product.max_price
                      ? `¥${product.min_price}`
                      : `¥${product.min_price} - ¥${product.max_price}`}
                  </Text>
                  {product.type === 'variable' && (
                    <Text className='price-tip'>起</Text>
                  )}
                </View>
                
                {/* 推荐规格 */}
                {recommendedVariation && (
                  <View 
                    className='recommended-spec'
                    onClick={() => handleVariantSelect(product, recommendedVariation)}
                  >
                    <Text className='spec-label'>推荐：</Text>
                    <Text className='spec-value'>
                      {Object.keys(recommendedVariation.attributes).join(' ')} 🔥
                    </Text>
                  </View>
                )}
                
                {/* 更多规格提示 */}
                {product.variations && product.variations.length > 1 && (
                  <Text className='more-specs' onClick={() => handleProductSelect(product)}>
                    更多规格 ({product.variations.length}个) →
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default ProductRedeem;
