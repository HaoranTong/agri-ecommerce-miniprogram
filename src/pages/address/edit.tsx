import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { getSavedAddresses, upsertAddress } from '../../utils/storage';
import type { AddressFormState } from '../../types';
import './edit.scss';

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

  const handleGoHome = () => {
    Taro.switchTab({ url: '/pages/index/index' });
  };

  return (
    <View className='address-edit-page'>
      {/* 顶部返回首页按钮 */}
      <View className='top-home-btn' onClick={handleGoHome}>
        <Text className='home-icon'>🏠</Text>
        <Text className='home-text'>首页</Text>
      </View>

      <View className='form-card'>
        <Text className='form-title'>{editingId ? '📝 编辑收货地址' : '➕ 新增收货地址'}</Text>
        
        <View className='form-item'>
          <Text className='form-label'>收件人</Text>
          <Input
            className='form-input'
            placeholder='请输入收件人姓名'
            value={form.name}
            onInput={(event) => handleChange('name', event.detail.value)}
          />
        </View>
        
        <View className='form-item'>
          <Text className='form-label'>手机号</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='请输入手机号码'
            value={form.phone}
            onInput={(event) => handleChange('phone', event.detail.value)}
          />
        </View>
        
        <View className='form-item'>
          <Text className='form-label'>所在地区</Text>
          <Picker mode='region' value={region} onChange={handleRegionChange}>
            <View className='form-picker'>
              {form.province ? `${form.province} ${form.city} ${form.district}` : '请选择省市区'}
            </View>
          </Picker>
        </View>
        
        <View className='form-item'>
          <Text className='form-label'>详细地址</Text>
          <Input
            className='form-input'
            placeholder='街道、门牌号等详细信息'
            value={form.detail_address}
            onInput={(event) => handleChange('detail_address', event.detail.value)}
          />
        </View>
        
        <View className='form-item'>
          <Text className='form-label'>邮政编码</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='选填'
            value={form.postcode || ''}
            onInput={(event) => handleChange('postcode', event.detail.value)}
          />
        </View>
      </View>

      <Button className='save-btn' onClick={handleSubmit}>
        💾 保存地址
      </Button>
    </View>
  );
};

export default AddressEdit;
