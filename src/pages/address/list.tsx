import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import { getSavedAddresses, removeAddress, type StoredAddress } from '../../utils/storage';
import './address.scss';

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

  return (
    <View className="address-page">
      <View className="address-list">
        {addresses.length === 0 && (
          <View className="empty">暂无地址，请先新增</View>
        )}
        {addresses.map((addr) => (
          <View className="address-card" key={addr.id}>
            <View className="address-main">
              <Text className="address-name">{addr.name}</Text>
              <Text className="address-phone">{addr.phone}</Text>
            </View>
            <Text className="address-detail">
              {addr.province} {addr.city} {addr.district} {addr.detail_address}
            </Text>
            <View className="address-actions">
              <Button size="mini" onClick={() => handleEdit(addr.id)}>
                编辑
              </Button>
              <Button size="mini" onClick={() => handleDelete(addr.id)}>
                删除
              </Button>
              <Button size="mini" type="primary" onClick={() => handleSelect(addr)}>
                使用该地址
              </Button>
            </View>
          </View>
        ))}
      </View>

      <Button className="add-btn" onClick={handleAdd}>
        新增收货地址
      </Button>
    </View>
  );
};

export default AddressList;
