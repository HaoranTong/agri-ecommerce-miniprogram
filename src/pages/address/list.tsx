import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import { getSavedAddresses, removeAddress, type StoredAddress } from '../../utils/storage';
import './list.scss';

const AddressList = () => {
  const [addresses, setAddresses] = useState<StoredAddress[]>([]);

  useDidShow(() => {
    setAddresses(getSavedAddresses());
  });

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/address/edit' });
  };

  const handleEdit = (id: number) => {
    Taro.navigateTo({ url: `/pages/address/edit?id=${id}` });
  };

  const handleDelete = (id: number) => {
    const updated = removeAddress(id);
    setAddresses(updated);
    Taro.showToast({ title: '已删除', icon: 'none' });
  };

  const handleSelect = (address: StoredAddress) => {
    const eventChannel = Taro.getCurrentInstance().page?.getOpenerEventChannel?.();
    eventChannel?.emit('selectAddress', address);
    Taro.navigateBack();
  };

  const handleGoHome = () => {
    Taro.switchTab({ url: '/pages/index/index' });
  };

  return (
    <View className="address-page">
      {/* 顶部返回首页按钮 */}
      <View className="top-home-btn" onClick={handleGoHome}>
        <Text className="home-icon">🏠</Text>
        <Text className="home-text">首页</Text>
      </View>

      {addresses.length === 0 ? (
        <View className="empty-state">
          <Text className="empty-icon">📍</Text>
          <Text className="empty-title">暂无收货地址</Text>
          <Text className="empty-tip">添加收货地址，方便下单结算</Text>
        </View>
      ) : (
        <View className="address-list">
          {addresses.map((addr, index) => (
            <View className="address-card" key={addr.id}>
              <View className="card-header">
                <View className="address-badge">地址 {index + 1}</View>
                <View className="address-main">
                  <Text className="address-name">{addr.name}</Text>
                  <Text className="address-phone">{addr.phone}</Text>
                </View>
              </View>
              <View className="address-content">
                <Text className="address-detail">
                  {addr.province} {addr.city} {addr.district}
                </Text>
                <Text className="address-street">{addr.detail_address}</Text>
              </View>
              <View className="address-actions">
                <Button className="action-btn secondary" onClick={() => handleEdit(addr.id)}>
                  编辑
                </Button>
                <Button className="action-btn secondary" onClick={() => handleDelete(addr.id)}>
                  删除
                </Button>
                <Button className="action-btn primary" onClick={() => handleSelect(addr)}>
                  使用该地址
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}

      <Button className="add-address-btn" onClick={handleAdd}>
        ➕ 新增收货地址
      </Button>
    </View>
  );
};

export default AddressList;
