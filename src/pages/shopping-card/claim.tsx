import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCardShareDetail } from '../../types';
import { getToken } from '../../utils/storage';
import './claim.scss';

const formatDateTime = (value?: string | null) => {
  if (!value) return '长期有效';
  try {
    // iOS 兼容：将 "yyyy-MM-dd HH:mm:ss" 格式转换为 "yyyy-MM-ddTHH:mm:ss"
    const isoValue = value.replace(' ', 'T');
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch (error) {
    return value || '';
  }
};

const GiftCardClaim = () => {
  const router = useRouter();
  const token = useMemo(() => {
    const directToken = (router.params?.token as string) || '';
    if (directToken) return directToken;
    const scene = (router.params?.scene as string) || '';
    if (!scene) return '';
    try {
      return decodeURIComponent(scene);
    } catch (error) {
      return scene;
    }
  }, [router.params]);
  const [detail, setDetail] = useState<GiftCardShareDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('缺少分享参数');
      return;
    }

    // 检查是否已登录，如果未登录则跳转到登录页
    const authToken = getToken();
    if (!authToken) {
      // 保存当前路径，登录后返回
      const pages = Taro.getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentPath = currentPage?.route || '';
      const redirectData = {
        path: currentPath || 'pages/shopping-card/claim',
        params: {
          ...(currentPage?.options || {}),
          token
        }
      };

      Taro.setStorageSync('REDIRECT_AFTER_LOGIN', redirectData);
      Taro.redirectTo({
        url: '/pages/auth/login'
      });
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await giftCardService.getShareDetail(token);
        setDetail(data);
        setError('');
      } catch (err) {
        console.error('获取分享信息失败', err);
        const message = err instanceof Error ? err.message || '分享链接无效' : '分享链接无效';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [token, router.params]);

  const handleClaim = async () => {
    if (!token) return;
    try {
      setClaiming(true);
      await giftCardService.claim(token);
      Taro.showToast({ title: '领取成功', icon: 'success' });
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/shopping-card/mine?highlight=new' });
      }, 800);
    } catch (err) {
      console.error('领取失败', err);
      const message = err instanceof Error ? err.message || '领取失败' : '领取失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return <View className='gift-card-claim-page loading-state'>领取信息加载中...</View>;
  }

  if (error || !detail) {
    return (
      <View className='gift-card-claim-page error-state'>
        <Text className='error-icon'>⚠️</Text>
        <Text className='error-title'>无法领取</Text>
        <Text className='error-desc'>{error || '分享链接已失效或不存在'}</Text>
        <Button className='back-btn' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
          回到首页
        </Button>
      </View>
    );
  }

  const templateConfig = detail.share_meta?.template
    ?.share_template_config as { preview_image?: string } | undefined;
  const previewImage = templateConfig?.preview_image || detail.share_meta?.template?.print_template_url;

  return (
    <View className='gift-card-claim-page'>
      <View className='claim-hero'>
        {previewImage && <Image className='hero-image' mode='aspectFill' src={previewImage} />}
        <View className='hero-content'>
          <Text className='hero-label'>好友赠送的购物卡</Text>
          <Text className='hero-title'>{detail.template_name || detail.template?.name || '购物卡'}</Text>
          <Text className='hero-amount'>¥{detail.balance ?? '--'}</Text>
          <Text className='hero-expire'>有效期：{formatDateTime(detail.expires_at)}</Text>
          {detail.share_meta?.message && (
            <Text className='hero-message'>“{detail.share_meta.message}”</Text>
          )}
        </View>
      </View>

      <View className='info-panel'>
        <View className='info-item'>
          <Text className='label'>卡号</Text>
          <Text className='value'>{detail.card_number}</Text>
        </View>
        <View className='info-item'>
          <Text className='label'>来源</Text>
          <Text className='value'>{detail.share_channel ? detail.share_channel : '好友分享'}</Text>
        </View>
      </View>

      <View className='claim-steps'>
        <Text className='steps-title'>领取后会发生什么？</Text>
        <Text className='step'>1. 礼品卡将立即保存到“我的购物卡”。</Text>
        <Text className='step'>2. 可在卡包中随时查看、分享或再次赠送。</Text>
        <Text className='step'>3. 兑换时填写收货地址，系统生成 0 元订单安排配送。</Text>
      </View>

      <Button className='claim-btn' loading={claiming} onClick={handleClaim}>
        {claiming ? '领取中...' : '确认领取并保存'}
      </Button>
      <Button
        className='secondary-btn'
        onClick={() => Taro.switchTab({ url: '/pages/index/index' })}
      >
        我先逛逛
      </Button>
    </View>
  );
};

export default GiftCardClaim;
