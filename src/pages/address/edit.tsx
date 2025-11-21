import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { getSavedAddresses, upsertAddress } from '../../utils/storage';
import type { AddressFormState } from '../../types';
import './address.scss';

const DEFAULT_ADDRESS: AddressFormState = {
  id: undefined,
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail_address: '',
  postcode: ''
};

const AddressEdit = () => {
  const params = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const editingId = params.id ? Number(params.id) : undefined;
  const [form, setForm] = useState<AddressFormState>(DEFAULT_ADDRESS);
  const [region, setRegion] = useState<string[]>([]);

  useEffect(() => {
    if (!editingId) return;
    const addresses = getSavedAddresses();
    const target = addresses.find((addr) => addr.id === editingId);
    if (target) {
      setForm(target);
      setRegion([target.province, target.city, target.district]);
    }
  }, [editingId]);

  const handleChange = (key: keyof AddressFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRegionChange = (event: any) => {
    const value: string[] = event.detail.value;
    setRegion(value);
    handleChange('province', value[0] || '');
    handleChange('city', value[1] || '');
    handleChange('district', value[2] || '');
  };

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.detail_address || !form.province) {
      Taro.showToast({ title: '请完善收货信息', icon: 'none' });
      return;
    }
    upsertAddress({ ...form, id: editingId });
    Taro.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 400);
  };

  return (
    <View className="address-page">
      <View className="address-card">
        <View className="info-row">
          <Text>收件人</Text>
          <Input
            placeholder="姓名"
            value={form.name}
            onInput={(event) => handleChange('name', event.detail.value)}
          />
        </View>
        <View className="info-row">
          <Text>手机号</Text>
          <Input
            placeholder="联系方式"
            value={form.phone}
            onInput={(event) => handleChange('phone', event.detail.value)}
          />
        </View>
        <View className="info-row">
          <Text>地区</Text>
          <Picker mode="region" value={region} onChange={handleRegionChange}>
            <View className="picker-value">
              {form.province ? `${form.province} ${form.city} ${form.district}` : '请选择省市区'}
            </View>
          </Picker>
        </View>
        <View className="info-row">
          <Text>详细地址</Text>
          <Input
            placeholder="街道、楼栋等"
            value={form.detail_address}
            onInput={(event) => handleChange('detail_address', event.detail.value)}
          />
        </View>
        <View className="info-row">
          <Text>邮编</Text>
          <Input
            placeholder="可选"
            value={form.postcode || ''}
            onInput={(event) => handleChange('postcode', event.detail.value)}
          />
        </View>
      </View>

      <Button className="add-btn" onClick={handleSubmit}>
        保存
      </Button>
    </View>
  );
};

export default AddressEdit;
