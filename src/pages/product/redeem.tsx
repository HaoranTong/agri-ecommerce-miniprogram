import { Image, Text, View } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { productService } from '../../services/api';
import type { Product } from '../../types';
import './redeem.scss';

const ProductRedeem = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
          const recommendedVariation = product.variations?.[0]; // 推荐第一个变体
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
