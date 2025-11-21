import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import '../address/address.scss';

const GiftCardRedeem = () => {
  const params = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const [cardNumber, setCardNumber] = useState(params.card ? String(params.card) : '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!cardNumber || !pin) {
      Taro.showToast({ title: '请输入卡号和密码', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      await giftCardService.redeem(cardNumber, pin);
      Taro.showToast({ title: '兑换成功', icon: 'success' });
      setTimeout(() => Taro.redirectTo({ url: '/pages/giftcard/mine' }), 500);
    } catch (error) {
      console.error('兑换购物卡失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (!cardNumber || !pin) {
      Taro.showToast({ title: '请输入卡号和新密码', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      await giftCardService.resetPin(cardNumber, pin);
      Taro.showToast({ title: '密码已更新', icon: 'success' });
    } catch (error) {
      console.error('重置密码失败', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="address-page">
      <View className="address-card">
        <Text className="section-title">购物卡兑换 / 重置密码</Text>
        <View className="info-row">
          <Text>购物卡卡号</Text>
          <Input placeholder="请输入卡号" value={cardNumber} onInput={(event) => setCardNumber(event.detail.value)} />
        </View>
        <View className="info-row">
          <Text>卡密 / 新密码</Text>
          <Input placeholder="请输入密码" value={pin} onInput={(event) => setPin(event.detail.value)} />
        </View>
      </View>

      <Button className="add-btn" loading={loading} onClick={handleRedeem}>
        立即兑换
      </Button>
      <Button className="add-btn" loading={loading} onClick={handleResetPin}>
        重置密码
      </Button>
    </View>
  );
};

export default GiftCardRedeem;
