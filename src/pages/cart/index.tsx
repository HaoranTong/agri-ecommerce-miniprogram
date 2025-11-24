import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { cartService } from '../../services/api';
import type { CartItem } from '../../types';
import './index.scss';

const Cart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    try {
      const data = await cartService.getCart();
      setItems(data);
      // 默认全选
      setSelectedIds(data.map(item => item.variation_id));
    } catch (error) {
      console.error('获取购物车失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleToggleSelect = (variationId: number) => {
    if (selectedIds.includes(variationId)) {
      setSelectedIds(selectedIds.filter(id => id !== variationId));
    } else {
      setSelectedIds([...selectedIds, variationId]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.variation_id));
    }
  };

  const handleUpdateQuantity = async (variationId: number, delta: number) => {
    const item = items.find(i => i.variation_id === variationId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) {
      handleRemove(variationId);
      return;
    }

    try {
      await cartService.updateCart(variationId, newQuantity);
      setItems(items.map(i =>
        i.variation_id === variationId ? { ...i, quantity: newQuantity } : i
      ));
    } catch (error) {
      console.error('更新数量失败', error);
    }
  };

  const handleRemove = async (variationId: number) => {
    try {
      await cartService.removeFromCart(variationId);
      setItems(items.filter(i => i.variation_id !== variationId));
      setSelectedIds(selectedIds.filter(id => id !== variationId));
      Taro.showToast({ title: '已删除', icon: 'success' });
    } catch (error) {
      console.error('删除失败', error);
    }
  };

  const handleCheckout = () => {
    const selectedItems = items.filter(item => selectedIds.includes(item.variation_id));
    if (selectedItems.length === 0) {
      Taro.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    // 简化版：只支持单件商品结算
    if (selectedItems.length > 1) {
      Taro.showToast({ title: '暂不支持多件商品结算', icon: 'none' });
      return;
    }

    const item = selectedItems[0];
    Taro.navigateTo({
      url: `/pages/order/create?variation_id=${item.variation_id}&quantity=${item.quantity}`
    });
  };

  const calculateTotal = () => {
    return items
      .filter(item => selectedIds.includes(item.variation_id))
      .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
      .toFixed(2);
  };

  if (loading) {
    return <View className="cart-page loading-state">加载中...</View>;
  }

  if (items.length === 0) {
    return (
      <View className="cart-page">
        <View className="empty-state">
          <Text className="empty-icon">🛒</Text>
          <Text className="empty-text">购物车是空的</Text>
          <Button className="go-shopping-btn" onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            去逛逛
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="cart-page">
      {/* 购物车列表 */}
      <View className="cart-list">
        {items.map((item) => (
          <View key={item.variation_id} className="cart-item">
            <View
              className={`checkbox ${selectedIds.includes(item.variation_id) ? 'checked' : ''}`}
              onClick={() => handleToggleSelect(item.variation_id)}
            >
              {selectedIds.includes(item.variation_id) && '✓'}
            </View>

            <Image className="item-image" src={item.image_url || '/assets/placeholder.png'} mode="aspectFill" />

            <View className="item-info">
              <Text className="item-name">{item.product_name}</Text>
              <Text className="item-spec">{item.variation_name}</Text>
              <View className="item-bottom">
                <Text className="item-price">¥{item.price}</Text>
                <View className="quantity-control">
                  <View
                    className="control-btn"
                    onClick={() => handleUpdateQuantity(item.variation_id, -1)}
                  >
                    -
                  </View>
                  <Text className="quantity-value">{item.quantity}</Text>
                  <View
                    className="control-btn"
                    onClick={() => handleUpdateQuantity(item.variation_id, 1)}
                  >
                    +
                  </View>
                </View>
              </View>
            </View>

            <View className="remove-btn" onClick={() => handleRemove(item.variation_id)}>
              ✕
            </View>
          </View>
        ))}
      </View>

      {/* 底部结算栏 */}
      <View className="cart-footer">
        <View className="footer-left">
          <View
            className={`checkbox ${selectedIds.length === items.length ? 'checked' : ''}`}
            onClick={handleToggleSelectAll}
          >
            {selectedIds.length === items.length && '✓'}
          </View>
          <Text className="select-all-text">全选</Text>
        </View>

        <View className="footer-right">
          <View className="total-section">
            <Text className="total-label">合计：</Text>
            <Text className="total-value">¥{calculateTotal()}</Text>
          </View>
          <Button className="checkout-btn" onClick={handleCheckout}>
            结算（{selectedIds.length}）
          </Button>
        </View>
      </View>
    </View>
  );
};

export default Cart;
