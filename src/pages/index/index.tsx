import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import ProductCard from '../../components/ProductCard';
import { configService, productService } from '../../services/api';
import type { Product, PublicConfig } from '../../types';
import './index.scss';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [banner, setBanner] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [productList, config] = await Promise.all([
        productService.getProducts(),
        configService.getPublicConfig()
      ]);
      setProducts(productList);
      setBanner(config);
    } catch (error) {
      console.error('加载首页数据失败', error);
      Taro.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductSelect = (product: Product) => {
    Taro.navigateTo({
      url: `/pages/product/detail?id=${product.id}`
    });
  };

  return (
    <View className="index-page">
      {banner?.home_slider?.length && (
        <Swiper className="hero-swiper" circular autoplay>
          {banner.home_slider.map((slide) => (
            <SwiperItem key={slide.img}>
              <View
                className="hero-slide"
                style={{ backgroundImage: `url(${slide.img})` }}
                onClick={() => slide.link && Taro.navigateTo({ url: slide.link })}
              />
            </SwiperItem>
          ))}
        </Swiper>
      )}

      <View className="section-header">
        <Text className="section-title">精选好米</Text>
        <Text className="section-subtitle">源自五常产区，现磨现发</Text>
      </View>

      {loading && <View className="loading">加载中...</View>}

      {!loading && products.length === 0 && (
        <View className="empty">暂无商品，敬请期待</View>
      )}

      <View className="product-list">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={handleProductSelect} />
        ))}
      </View>
    </View>
  );
};

export default Index;