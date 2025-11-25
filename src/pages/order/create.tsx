import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useMemo, useState } from 'react';

import { cartService, orderService } from '../../services/api';
import type { ShippingAddress } from '../../types';
import { getSavedAddresses, upsertAddress } from '../../utils/storage';
import './create.scss';

const DEFAULT_ADDRESS: ShippingAddress = {
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail_address: '',
  postcode: ''
};

interface CheckoutItem {
  variation_id: number;
  product_name: string;
  variation_name: string;
  price: string;
  quantity: number;
  image_url?: string;
}

const OrderCreate = () => {
  const params = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const fromCart = params.from === 'cart';
  
  // 从购物车来的订单
  const checkoutItems: CheckoutItem[] = fromCart ? Taro.getStorageSync('checkout_items') || [] : [];
  
  // 从商品详情直接购买
  const variationId = Number(params.variation_id || params.variationId || 0);
  const productName = params.product_name || params.productName || '精选商品';
  const [quantity, setQuantity] = useState(Number(params.quantity) || 1);
  // 自动填充第一个保存的地址
  const savedAddresses = getSavedAddresses();
  const initialAddress = savedAddresses.length > 0 ? savedAddresses[0] : DEFAULT_ADDRESS;
  const initialRegion = savedAddresses.length > 0 
    ? [savedAddresses[0].province, savedAddresses[0].city, savedAddresses[0].district]
    : [];

  const [region, setRegion] = useState<string[]>(initialRegion);
  const [address, setAddress] = useState<ShippingAddress>({
    name: initialAddress.name,
    phone: initialAddress.phone,
    province: initialAddress.province,
    city: initialAddress.city,
    district: initialAddress.district,
    detail_address: initialAddress.detail_address,
    postcode: initialAddress.postcode || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleRegionChange = (event: any) => {
    const value: string[] = event.detail.value;
    setRegion(value);
    setAddress((prev) => ({
      ...prev,
      province: value[0] || '',
      city: value[1] || '',
      district: value[2] || ''
    }));
  };

  const handleAddressChange = (key: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    if (!fromCart && !variationId) {
      Taro.showToast({ title: '缺少商品规格信息', icon: 'none' });
      return;
    }

    if (fromCart && checkoutItems.length === 0) {
      Taro.showToast({ title: '购物车商品已失效', icon: 'none' });
      return;
    }

    if (!address.name || !address.phone || !address.detail_address || !address.province) {
      Taro.showToast({ title: '请完善收件人信息', icon: 'none' });
      return;
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(address.phone)) {
      Taro.showToast({ title: '请输入正确的手机号码', icon: 'none' });
      return;
    }

    try {
      setSubmitting(true);
      
      // 保存收货地址到本地存储
      upsertAddress(address);
      
      if (fromCart) {
        // 从购物车结算：创建多个订单
        const orderIds: number[] = [];
        const variationIds: number[] = [];
        
        for (const item of checkoutItems) {
          const order = await orderService.createOrder({
            variation_id: item.variation_id,
            quantity: item.quantity,
            shipping_address: address
          });
          orderIds.push(order.order_id);
          variationIds.push(item.variation_id);
        }
        
        // 清除购物车中已购商品
        for (const vid of variationIds) {
          await cartService.removeFromCart(vid);
        }
        
        // 清除缓存
        Taro.removeStorageSync('checkout_items');
        
        Taro.showToast({ title: '订单创建成功', icon: 'success' });
        
        // 跳转到订单列表
        setTimeout(() => {
          Taro.redirectTo({
            url: '/pages/order/list'
          });
        }, 1000);
      } else {
        // 从商品详情直接购买
        const order = await orderService.createOrder({
          variation_id: variationId,
          quantity,
          shipping_address: address
        });
        
        // 跳转到待支付页面进行二次确认
        Taro.showToast({ title: '订单创建成功', icon: 'success' });
        
        setTimeout(() => {
          Taro.redirectTo({
            url: `/pages/order/order-confirm?orderId=${order.order_id}`
          });
        }, 1000);
      }
    } catch (error) {
      console.error('创建订单失败', error);
      Taro.showToast({ title: '创建订单失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    if (fromCart) {
      return checkoutItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0).toFixed(2);
    }
    return '0.00';
  };

  return (
    <View className="order-detail-page">
      <View className="card">
        <Text className="section-title highlight-title">确认商品</Text>
        {fromCart ? (
          checkoutItems.map((item, index) => (
            <View key={index} className="checkout-item-block">
              <View className="info-row">
                <Text className="label">商品名称:</Text>
                <Text className="value">{item.product_name}</Text>
              </View>
              <View className="info-row">
                <Text className="label">商品编号:</Text>
                <Text className="value">{item.variation_id}</Text>
              </View>
              {/* 将规格属性拆分为单独的行 */}
              {item.variation_name.split(' | ').map((attr, attrIndex) => {
                const [attrName, attrValue] = attr.split(': ');
                return (
                  <View key={attrIndex} className="info-row">
                    <Text className="label">{attrName}:</Text>
                    <Text className="value">{attrValue}</Text>
                  </View>
                );
              })}
              <View className="info-row">
                <Text className="label">单价:</Text>
                <Text className="value price">¥{item.price}</Text>
              </View>
              <View className="info-row">
                <Text className="label">数量:</Text>
                <Text className="value">×{item.quantity}</Text>
              </View>
              <View className="info-row highlight">
                <Text className="label">小计:</Text>
                <Text className="value subtotal">¥{(parseFloat(item.price) * item.quantity).toFixed(2)}</Text>
              </View>
              {index < checkoutItems.length - 1 && <View className="divider" />}
            </View>
          ))
        ) : (
          <>
            <View className="info-row">
              <Text>商品名称</Text>
              <Text>{productName}</Text>
            </View>
            <View className="info-row">
              <Text>规格 ID</Text>
              <Text>{variationId}</Text>
            </View>
            <View className="info-row">
              <Text>购买数量</Text>
              <Input
                type="number"
                value={String(quantity)}
                onInput={(event) => {
                  const next = parseInt(event.detail.value || '1', 10) || 1;
                  setQuantity(Math.max(1, next));
                }}
              />
            </View>
          </>
        )}
      </View>

      <View className="card">
        <Text className="section-title highlight-title">收货信息</Text>
        <View className="info-row">
          <Text>收件人</Text>
          <Input
            placeholder="请输入收件人姓名"
            value={address.name}
            onInput={(event) => handleAddressChange('name', event.detail.value)}
          />
        </View>
        <View className="info-row">
          <Text>联系电话</Text>
          <Input
            placeholder="请输入手机号"
            value={address.phone}
            onInput={(event) => handleAddressChange('phone', event.detail.value)}
          />
        </View>
        <View className="info-row">
          <Text>所在地区</Text>
          <Picker mode="region" value={region} onChange={handleRegionChange}>
            <View className="picker-value">
              {address.province ? `${address.province} ${address.city} ${address.district}` : '请选择省市区'}
            </View>
          </Picker>
        </View>
        <View className="info-row">
          <Text>详细地址</Text>
          <Input
            placeholder="街道、楼栋、房号"
            value={address.detail_address}
            onInput={(event) => handleAddressChange('detail_address', event.detail.value)}
          />
        </View>
        <View className="info-row">
          <Text>邮编</Text>
          <Input
            placeholder="可选"
            value={address.postcode || ''}
            onInput={(event) => handleAddressChange('postcode', event.detail.value)}
          />
        </View>
      </View>

      {fromCart && (
        <View className="card total-card">
          <View className="info-row total-row">
            <Text className="total-label">订单总额</Text>
            <Text className="total-value">¥{calculateTotal()}</Text>
          </View>
        </View>
      )}

      <Button className="pay-btn" loading={submitting} onClick={handleSubmit}>
        {fromCart ? `提交订单（共${checkoutItems.length}件）` : '提交订单'}
      </Button>
    </View>
  );
};

export default OrderCreate;
