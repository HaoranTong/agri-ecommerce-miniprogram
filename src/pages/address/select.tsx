import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import { getSavedAddresses, type StoredAddress } from '../../utils/storage';
import './address.scss';

const AddressSelect = () => {
  const [addresses, setAddresses] = useState<StoredAddress[]>([]);

  useDidShow(() => {
    setAddresses(getSavedAddresses());
  });

  const handleUse = (address: StoredAddress) => {
    const eventChannel = Taro.getCurrentInstance().page?.getOpenerEventChannel?.();
    eventChannel?.emit('selectAddress', address);
    Taro.navigateBack();
  };

  return (
    <View className='address-page'>
      <View className='address-list'>
        {addresses.length === 0 && <View className='empty'>暂无地址信息</View>}
        {addresses.map((addr) => (
          <View className='address-card' key={addr.id}>
            <View className='address-main'>
              <Text className='address-name'>{addr.name}</Text>
              <Text className='address-phone'>{addr.phone}</Text>
            </View>
            <Text className='address-detail'>
              {addr.province} {addr.city} {addr.district} {addr.detail_address}
            </Text>
            <Button className='add-btn' onClick={() => handleUse(addr)}>
              选择该地址
            </Button>
          </View>
        ))}
      </View>

      <Button className='add-btn' onClick={() => Taro.navigateTo({ url: '/pages/address/edit' })}>
        新增地址
      </Button>
    </View>
  );
};

export default AddressSelect;
