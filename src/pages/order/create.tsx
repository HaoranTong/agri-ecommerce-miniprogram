import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useMemo, useState } from 'react';

import { orderService } from '../../services/api';
import type { ShippingAddress } from '../../types';
import './detail.scss';

const DEFAULT_ADDRESS: ShippingAddress = {
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail_address: '',
  postcode: ''
};

const OrderCreate = () => {
  const params = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const variationId = Number(params.variation_id || params.variationId || 0);
  const productName = params.product_name || params.productName || '精选商品';
  const [quantity, setQuantity] = useState(1);
  const [region, setRegion] = useState<string[]>([]);
  const [address, setAddress] = useState<ShippingAddress>(DEFAULT_ADDRESS);
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
    if (!variationId) {
      Taro.showToast({ title: '缺少商品规格信息', icon: 'none' });
      return;
    }

    if (!address.name || !address.phone || !address.detail_address || !address.province) {
      Taro.showToast({ title: '请完善收件人信息', icon: 'none' });
      return;
    }

    try {
      setSubmitting(true);
      const order = await orderService.createOrder({
        variation_id: variationId,
        quantity,
        shipping_address: address
      });
      Taro.redirectTo({
        url: `/pages/order/confirm?orderId=${order.order_id}`
      });
    } catch (error) {
      console.error('创建订单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="order-detail-page">
      <View className="card">
        <Text className="section-title">确认商品</Text>
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
      </View>

      <View className="card">
        <Text className="section-title">收货信息</Text>
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

      <Button className="pay-btn" loading={submitting} onClick={handleSubmit}>
        提交订单
      </Button>
    </View>
  );
};

export default OrderCreate;
