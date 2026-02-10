import { Image, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import { configService, productService } from '../../services/api';
import type { Product, PublicConfig } from '../../types';
import Skeleton from '../../components/Skeleton';
import HelpTooltip from '../../components/HelpTooltip';
import './index.scss';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [banner, setBanner] = useState<PublicConfig | null>(null);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [productList, config] = await Promise.all([
        productService.getProducts(),
        configService.getPublicConfig()
      ]);
      setProducts(Array.isArray(productList) ? productList : []);
      const normalizedConfig = config
        ? {
            ...config,
            home_slider: Array.isArray(config.home_slider) ? config.home_slider : []
          }
        : null;
      setBanner(normalizedConfig);
    } catch (error) {
      console.error('加载首页数据失败', error);
      Taro.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    loadData();
    const guide = Taro.getStorageSync('GIFT_CARD_FLOW_HINT');
    if (guide?.message) {
      Taro.showModal({
        title: '礼品卡购卡提示',
        content: guide.message,
        showCancel: false,
        confirmText: '知道了'
      });
      Taro.removeStorageSync('GIFT_CARD_FLOW_HINT');
    }
  });

  const handleProductSelect = (product: Product) => {
    const fromCart = Boolean(Taro.getStorageSync('CART_CONTINUE_SHOPPING'));
    Taro.navigateTo({
      url: `/pages/product/detail?id=${product.id}${fromCart ? '&from=cart' : ''}`
    });
  };

  const handleVariantSelect = (product: Product, variation: any) => {
    const fromCart = Boolean(Taro.getStorageSync('CART_CONTINUE_SHOPPING'));
    // 跳转到详情页并预选规格
    Taro.navigateTo({
      url: `/pages/product/detail?id=${product.id}&variation_id=${variation.variation_id}${fromCart ? '&from=cart' : ''}`
    });
  };

  const slides = banner && Array.isArray(banner.home_slider) ? banner.home_slider : [];

  return (
    <View className='index-page'>
      {/* 轮播图 */}
      {slides.length > 0 && (
        <Swiper className='hero-swiper' circular autoplay indicatorDots>
          {slides.map((slide, index) => {
            const slideImg = slide?.img || '';
            return (
            <SwiperItem key={index}>
              <Image
                className='hero-image'
                src={slideImg}
                mode='aspectFill'
                onClick={() => slide.link && Taro.navigateTo({ url: slide.link })}
              />
            </SwiperItem>
          );
          })}
        </Swiper>
      )}
      {slides.length > 0 && (
        <View className='banner-tip'>
          <Text>活动提示</Text>
          <HelpTooltip page='index/index' location='banner' />
        </View>
      )}

      {loading && (
        <View className='skeleton-section'>
          <Skeleton type='product' count={6} />
        </View>
      )}

      {!loading && products.length === 0 && (
        <View className='empty'>暂无商品，敬请期待</View>
      )}

      {/* 商品列表 */}
      <View className='product-list'>
        {products.map((product) => {
          const recommendedVariation = pickRecommendedVariation(product);
          const recommendedInStock = recommendedVariation ? isVariationInStock(recommendedVariation) : true;
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
                    ¥{product.min_price} - ¥{product.max_price}
                  </Text>
                </View>
                
                {/* 推荐规格 */}
                {recommendedVariation && (
                  <View 
                    className={`recommended-spec ${recommendedInStock ? '' : 'disabled'}`}
                    onClick={() => recommendedInStock && handleVariantSelect(product, recommendedVariation)}
                  >
                    <Text className='spec-label'>推荐：</Text>
                    <Text className='spec-value'>
                      {Object.keys(recommendedVariation.attributes).join(' ')} 🔥
                    </Text>
                    {!recommendedInStock && <Text className='spec-badge'>缺货</Text>}
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

export default Index;
