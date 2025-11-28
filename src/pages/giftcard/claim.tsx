import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import { giftCardService } from '../../services/api';
import './claim.scss';

const GiftCardClaim = () => {
  const [token, setToken] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    card_number: string;
    balance?: string | null;
    status?: string;
  } | null>(null);

  const handleClaim = async () => {
    if (!token.trim()) {
      Taro.showToast({ title: '请输入分享口令或Token', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      const result = await giftCardService.claim(token.trim(), pinCode.trim() || undefined);
      setClaimResult(result);
      setClaimed(true);
      Taro.showToast({ title: '领取成功！', icon: 'success' });
    } catch (error: any) {
      console.error('领取失败', error);
      const message = error?.message || '领取失败';
      
      if (message.includes('PIN')) {
        Taro.showToast({ title: '需要输入PIN码', icon: 'none' });
      } else if (message.includes('claimed')) {
        Taro.showToast({ title: '礼品卡已被领取', icon: 'none' });
      } else if (message.includes('expired')) {
        Taro.showToast({ title: '分享链接已过期', icon: 'none' });
      } else {
        Taro.showToast({ title: message, icon: 'none' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewCards = () => {
    Taro.navigateTo({ url: '/pages/giftcard/mine' });
  };

  return (
    <View className='gift-card-claim-page'>
      {!claimed ? (
        <View className='claim-form'>
          <Text className='page-title'>🎁 领取礼品卡</Text>
          <Text className='page-subtitle'>输入分享口令或扫描二维码领取好友赠送的礼品卡</Text>

          <View className='form-section'>
            <View className='form-item'>
              <Text className='form-label'>分享口令 / Token *</Text>
              <Input
                className='form-input'
                placeholder='请输入分享口令'
                value={token}
                onInput={(e) => setToken(e.detail.value)}
              />
            </View>

            <View className='form-item'>
              <Text className='form-label'>PIN码（如需要）</Text>
              <Input
                className='form-input'
                placeholder='某些礼品卡需要PIN码'
                value={pinCode}
                password
                maxlength={6}
                onInput={(e) => setPinCode(e.detail.value)}
              />
              <Text className='form-tip'>如果赠送者设置了PIN码保护，需要输入正确的PIN码才能领取</Text>
            </View>
          </View>

          <Button
            className='claim-btn'
            onClick={handleClaim}
            loading={loading}
            disabled={loading}
          >
            {loading ? '领取中...' : '立即领取'}
          </Button>

          <View className='help-section'>
            <Text className='help-title'>💡 如何获取分享口令？</Text>
            <View className='help-list'>
              <Text className='help-item'>• 好友通过 &quot;分享礼品卡&quot; 功能生成口令</Text>
              <Text className='help-item'>• 复制好友发送的分享链接中的 Token</Text>
              <Text className='help-item'>• 扫描好友分享的二维码自动填充</Text>
            </View>
          </View>
        </View>
      ) : (
        <View className='claim-success'>
          <View className='success-icon'>✨</View>
          <Text className='success-title'>领取成功！</Text>
          
          {claimResult && (
            <View className='result-card'>
              <View className='result-item'>
                <Text className='result-label'>礼品卡号</Text>
                <Text className='result-value'>{claimResult.card_number}</Text>
              </View>
              <View className='result-item'>
                <Text className='result-label'>卡内余额</Text>
                <Text className='result-value balance'>¥{claimResult.balance ?? '--'}</Text>
              </View>
            </View>
          )}

          <Text className='success-tip'>
            礼品卡已添加到您的账户，可在 &quot;我的礼品卡&quot; 中查看
          </Text>

          <Button className='view-btn' onClick={handleViewCards}>
            查看我的礼品卡
          </Button>
          
          <Button className='back-btn' onClick={() => Taro.navigateBack()}>
            返回
          </Button>
        </View>
      )}
    </View>
  );
};

export default GiftCardClaim;
