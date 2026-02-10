import { Button, Image, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { cartService, productService } from '../../services/api';
import type { Product, ProductVariation } from '../../types';
import HelpTooltip from '../../components/HelpTooltip';
import './detail.scss';

const ProductDetail = () => {
  const params = useMemo(() => {
    const routerParams = Taro.getCurrentInstance().router?.params ?? {};
    return {
      productId: Number(routerParams.id || routerParams.productId || 0),
      variationId: routerParams.variation_id ? Number(routerParams.variation_id) : null,
      fromPointsRedeem: routerParams.from === 'points_redeem', // 是否从积分兑换页面跳转
      fromCartContinue: routerParams.from === 'cart' || Boolean(Taro.getStorageSync('CART_CONTINUE_SHOPPING'))
    };
  }, []);

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const getVariationStockQuantity = useCallback((variation: ProductVariation) => {
    const rawQuantity = (variation as any).stock_quantity;
    if (rawQuantity === null || rawQuantity === undefined) return null;
    const parsed = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) : rawQuantity;
    if (Number.isNaN(parsed)) return null;
    return parsed as number;
  }, []);

  const isVariationInStock = useCallback((variation: ProductVariation) => {
    const stockQuantity = getVariationStockQuantity(variation);
    if (typeof stockQuantity === 'number') {
      return stockQuantity > 0;
    }
    if (typeof variation.in_stock === 'boolean') {
      return variation.in_stock;
    }
    const stockStatus = (variation as any).stock_status as string | undefined;
    if (stockStatus) {
      return !['outofstock', 'out_of_stock', 'soldout', 'sold_out'].includes(stockStatus);
    }
    return true;
  }, [getVariationStockQuantity]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        // 如果是从积分兑换页面跳转，使用积分兑换商品列表（只包含允许的变体）
        const products = params.fromPointsRedeem
          ? await productService.getRedeemableProducts()
          : await productService.getProducts();
        const found = products.find((item) => item.id === params.productId) || null;
        setProduct(found);

        if (found?.variations?.length) {
          // 优先级1: URL 带了 variation_id
          let targetVariation = params.variationId
            ? found.variations.find(v => v.variation_id === params.variationId)
            : null;
          
          // 优先级2: 检查登录前保存的变体
          if (!targetVariation) {
            const saved = Taro.getStorageSync('SELECTED_VARIATION_BEFORE_LOGIN');
            if (saved && saved.productId === found.id) {
              targetVariation = found.variations.find(v => v.variation_id === saved.variationId);
              Taro.removeStorageSync('SELECTED_VARIATION_BEFORE_LOGIN');
              console.log('[Detail] 恢复登录前选择的变体:', saved.variationId);
            }
          }
          
          // 优先级3: 默认第一个有库存的规格
          const fallbackVariation = found.variations.find((v) => isVariationInStock(v)) || found.variations[0];
          setSelectedVariation(targetVariation || fallbackVariation);
        }
      } catch (error) {
        console.error('获取商品详情失败', error);
        Taro.showToast({ title: '获取商品失败', icon: 'none' });
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [params.productId, params.variationId, params.fromPointsRedeem, isVariationInStock]);

  const handleVariationSelect = (variation: ProductVariation) => {
    setSelectedVariation(variation);
  };

  const handleAddToCart = async (autoReturnToCart = false) => {
    if (!selectedVariation) {
      Taro.showToast({ title: '请选择规格', icon: 'none' });
      return;
    }

    if (!isVariationInStock(selectedVariation)) {
      Taro.showToast({ title: '该规格已售罄', icon: 'none' });
      return;
    }

    // 保存当前选中的变体ID，用于登录后恢复
    Taro.setStorageSync('SELECTED_VARIATION_BEFORE_LOGIN', {
      productId: product!.id,
      variationId: selectedVariation.variation_id
    });

    try {
      await cartService.addToCart(selectedVariation.variation_id, quantity);

      if (autoReturnToCart || params.fromCartContinue) {
        Taro.showToast({ title: '已加入购物车', icon: 'success' });
        setTimeout(() => {
          Taro.switchTab({ url: '/pages/cart/index' });
        }, 300);
        return;
      }
      
      // 显示成功提示，并提供跳转选项
      Taro.showModal({
        title: '添加成功',
        content: '商品已加入购物车',
        confirmText: '去购物车',
        cancelText: '继续购物',
        success: (res) => {
          if (res.confirm) {
            Taro.switchTab({ url: '/pages/cart/index' });
          }
        }
      });
    } catch (error) {
      console.error('加入购物车失败', error);
      // 错误处理已经在 handleUnauthorized 中完成
    }
  };

  const handleBuyNow = () => {
    if (!selectedVariation) {
      Taro.showToast({ title: '请选择规格', icon: 'none' });
      return;
    }

    if (!isVariationInStock(selectedVariation)) {
      Taro.showToast({ title: '该规格已售罄', icon: 'none' });
      return;
    }

    if (params.fromCartContinue) {
      handleAddToCart(true);
      return;
    }

    const price = typeof selectedVariation.price === 'string' 
      ? selectedVariation.price 
      : String(selectedVariation.price || 0);

    const specInfo = getSpecInfo();
    const specParts = [
      specInfo.quality !== '-' ? specInfo.quality : '',
      specInfo.packaging !== '-' ? specInfo.packaging : '',
      specInfo.weight !== '-' ? specInfo.weight : ''
    ].filter(Boolean);
    const variationName = specParts.join('|');

    Taro.navigateTo({
      url: `/pages/order/create?variation_id=${selectedVariation.variation_id}&product_name=${encodeURIComponent(product?.name || '商品')}&price=${price}&variation_name=${encodeURIComponent(variationName)}`
    });
  };

  if (loading) {
    return <View className='loading-container'>商品加载中...</View>;
  }

  if (!product) {
    return <View className='error-container'>商品不存在</View>;
  }

  // 构建图片列表
  const images = (
    [selectedVariation?.image_url ?? null, product.image_url ?? null]
      .filter((img): img is string => typeof img === 'string' && img.length > 0)
  ).filter((img, index, self) => self.indexOf(img) === index);

  // 提取规格属性信息（修复版）
  const getSpecInfo = () => {
    if (!selectedVariation) {
      return {
        packaging: '-',
        weight: '-',
        quality: '-',
        isVacuum: '-'
      };
    }

    const attrs = selectedVariation.attributes; // { "真空袋装": "vacuum", "5千克": "5kg", "有机认证": "organic" }
    let packaging = '-';
    let weight = '-';
    let quality = '普通种植';
    let isVacuum = '否';

    // 遍历所有属性
    Object.keys(attrs).forEach(key => {
      
      // 包装方式
      if (key.includes('袋装') || key.includes('礼盒')) {
        packaging = key;
      }
      
      // 重量规格
      if (key.includes('kg') || key.includes('千克') || key.includes('斤')) {
        weight = key;
      }
      
      // 品质（有机认证）
      if (key.includes('有机')) {
        quality = '有机认证';
      }
      
      // 真空包装
      if (key.includes('真空')) {
        isVacuum = '是';
      }
    });

    return { packaging, weight, quality, isVacuum };
  };

  const specInfo = getSpecInfo();

  // 商品详情表数据（参考京东）
  const specs = [
    { label: '商品名称', value: product.name },
    { label: '商品编号', value: selectedVariation?.variation_id.toString() || product.id.toString() },
    { label: '包装', value: specInfo.packaging },
    { label: '规格', value: specInfo.weight },
    { label: '品质', value: specInfo.quality },
    { label: '保质期', value: '12个月（365天）' },
    { label: '原料产地', value: '黑龙江五常' },
    { label: '是否真空包装', value: specInfo.isVacuum },
    {
      label: '库存状态',
      value: selectedVariation ? (isVariationInStock(selectedVariation) ? '现货' : '缺货') : '-'
    }
  ];

  return (
    <View className='product-detail-page'>
      {/* 图片/视频轮播 */}
      <View className='media-section'>
        {images.length > 0 ? (
          <Swiper className='media-swiper' indicatorDots circular>
            {images.map((img, index) => (
              <SwiperItem key={index}>
                <Image className='product-image' src={img} mode='aspectFill' />
              </SwiperItem>
            ))}
          </Swiper>
        ) : (
          <View className='placeholder-image'>
            <Text className='placeholder-text'>暂无图片</Text>
          </View>
        )}
      </View>

      {/* 商品基本信息 */}
      <View className='info-section'>
        <View className='price-section'>
          <Text className='price-symbol'>¥</Text>
          <Text className='price-value'>{selectedVariation?.price || product.min_price || '--'}</Text>
        </View>
        <Text className='product-name'>{product.name}</Text>
        <Text className='product-desc'>
          {product.description && product.description.length > 80
            ? `${product.description.slice(0, 80)}...`
            : product.description || '优质农产品，产地直供'}
        </Text>
      </View>

      {/* 规格选择 */}
      <View className='spec-section'>
        <View className='info-row'>
          <Text className='section-title'>选择规格</Text>
          <HelpTooltip page='product/detail' location='spec_selector' />
        </View>
        <View className='spec-options'>
          {product.variations?.map((variation) => (
            <View
              key={variation.variation_id}
              className={`spec-option ${selectedVariation?.variation_id === variation.variation_id ? 'active' : ''} ${!isVariationInStock(variation) ? 'disabled' : ''}`}
              onClick={() => isVariationInStock(variation) && handleVariationSelect(variation)}
            >
              <Text className='spec-text'>
                {Object.keys(variation.attributes).join(' ')}
              </Text>
              {!isVariationInStock(variation) && <Text className='spec-badge'>缺货</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* 数量选择 */}
      <View className='spec-section'>
        <Text className='section-title'>购买数量</Text>
        <View className='quantity-selector'>
          <View 
            className={`quantity-btn ${quantity <= 1 ? 'disabled' : ''}`}
            onClick={() => quantity > 1 && setQuantity(quantity - 1)}
          >
            <Text className='btn-text'>-</Text>
          </View>
          <Text className='quantity-value'>{quantity}</Text>
          <View 
            className='quantity-btn'
            onClick={() => setQuantity(quantity + 1)}
          >
            <Text className='btn-text'>+</Text>
          </View>
        </View>
      </View>

      {/* 规格参数 */}
      <View className='section-block'>
        <View className='section-header'>
          <Text className='section-icon'>📋</Text>
          <Text className='section-title'>规格参数</Text>
          <HelpTooltip page='product/detail' location='stock_tip' />
        </View>
        <View className='specs-table'>
          {specs.map((spec, index) => (
            <View key={index} className='spec-row'>
              <Text className='spec-label'>{spec.label}</Text>
              <Text className='spec-value'>{spec.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 商品详情 */}
      <View className='section-block'>
        <View className='section-header'>
          <Text className='section-icon'>📖</Text>
          <Text className='section-title'>商品介绍</Text>
        </View>
        <View className='detail-content'>
          <Text className='content-text'>{product.description || '暂无详细介绍'}</Text>
          {images.length > 0 && (
            <View className='detail-images'>
              {images.map((img, index) => (
                <Image key={index} className='detail-img' src={img} mode='widthFix' />
              ))}
            </View>
          )}
        </View>
      </View>

      {/* 用户评价 */}
      <View className='section-block'>
        <View className='section-header'>
          <Text className='section-icon'>💬</Text>
          <Text className='section-title'>用户评价</Text>
        </View>
        <View className='reviews-content'>
          <View className='empty-reviews'>
            <Text className='empty-text'>暂无评价</Text>
            <Text className='empty-hint'>快来成为第一个评价的人吧~</Text>
          </View>
        </View>
      </View>

      {/* 底部操作栏 */}
      <View className='action-bar'>
        <View className='action-left'>
          <View className='action-icon-btn' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            <Text className='icon-text'>🏠</Text>
            <Text className='icon-label'>首页</Text>
          </View>
          <View className='action-icon-btn' onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}>
            <Text className='icon-text'>🛒</Text>
            <Text className='icon-label'>购物车</Text>
          </View>
        </View>
        <View className='action-buttons'>
          <Button className='btn-cart' onClick={handleAddToCart}>加入购物车</Button>
          <Button className='btn-buy' onClick={handleBuyNow}>立即购买</Button>
        </View>
      </View>
    </View>
  );
};

export default ProductDetail;
