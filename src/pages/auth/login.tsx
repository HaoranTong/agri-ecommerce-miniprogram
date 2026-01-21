import { View, Button, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';

import { authService } from '../../services/api';
import { getToken } from '../../utils/storage';
import './login.scss';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const consent = await Taro.showModal({
        title: '授权提示',
        content: '同意后将获取您的头像和昵称，用于完善会员资料。您也可以跳过授权继续登录。',
        confirmText: '同意授权',
        cancelText: '跳过'
      });

      let wechatProfile: { nickname?: string; avatar?: string } | undefined;

      if (consent.confirm) {
        try {
          const profileRes = await Taro.getUserProfile({
            desc: '用于完善会员资料'
          });
          const userInfo = profileRes.userInfo || (profileRes as any).userInfo;
          if (userInfo) {
            wechatProfile = {
              nickname: userInfo.nickName,
              avatar: userInfo.avatarUrl
            };
          }
        } catch (error) {
          // 用户拒绝授权时，降级为快捷登录
          console.warn('用户拒绝获取头像昵称', error);
        }
      }

      // 使用真实微信登录
      const loginRes = await Taro.login();
      const code = loginRes.code;

      if (!code) {
        Taro.showToast({ title: '获取登录凭证失败', icon: 'none' });
        return;
      }

      await authService.login(code, wechatProfile);

      // 确保 token 已保存
      const savedToken = getToken();
      if (!savedToken) {
        Taro.showToast({ title: 'Token 保存失败，请重试', icon: 'none' });
        return;
      }

      Taro.showToast({ title: '登录成功', icon: 'success' });

      // 登录成功后跳转
      setTimeout(() => {
        const redirect = Taro.getStorageSync<{ path?: string; params?: string }>('REDIRECT_AFTER_LOGIN');
        if (redirect?.path) {
          const params = redirect.params ? JSON.parse(redirect.params) : {};
          const query = Object.keys(params)
            .map((key) => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
          const url = query ? `/${redirect.path}?${query}` : `/${redirect.path}`;

          Taro.removeStorageSync('REDIRECT_AFTER_LOGIN');

          // 如果是 tabBar 页面，使用 switchTab，否则使用 navigateTo
          if (['pages/index/index', 'pages/order/list', 'pages/user/profile'].includes(redirect.path)) {
            Taro.switchTab({ url: `/${redirect.path}` });
          } else {
            Taro.navigateTo({ url });
          }
        } else {
          Taro.switchTab({ url: '/pages/index/index' });
        }
      }, 300);
    } catch (error) {
      console.error('登录失败', error);
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleGetPhoneNumber = async (event: any) => {
    if (phoneLoading) return;

    const detail = event?.detail || {};

    if (!detail.code && (!detail.encryptedData || !detail.iv)) {
      Taro.showToast({ title: '已取消授权', icon: 'none' });
      return;
    }

    try {
      setPhoneLoading(true);

      const loginRes = await Taro.login();
      const code = loginRes.code;

      if (!code) {
        Taro.showToast({ title: '获取登录凭证失败', icon: 'none' });
        return;
      }

      if (detail.code) {
        await authService.bindPhone(code, detail.code);
      } else {
        await authService.bindPhone(code, undefined, {
          encryptedData: detail.encryptedData,
          iv: detail.iv
        });
      }

      Taro.showToast({ title: '手机号绑定成功', icon: 'success' });
    } catch (error) {
      console.error('绑定手机号失败', error);
      Taro.showToast({ title: '绑定手机号失败', icon: 'none' });
    } finally {
      setPhoneLoading(false);
    }
  };

  const hasToken = !!getToken();

  return (
    <View className='login-container'>
      <View className='logo'>
        <Text className='title'>常香米坊</Text>
        <Text className='subtitle'>精选五常好米，直供到家</Text>
      </View>

      <Button className='btn-login' loading={loading} onClick={handleLogin} type='primary'>
        <Text className='btn-text'>微信快捷登录</Text>
      </Button>

      <Button
        className='btn-login'
        openType='getPhoneNumber'
        loading={phoneLoading}
        onGetPhoneNumber={handleGetPhoneNumber}
        type='primary'
      >
        <Text className='btn-text'>微信手机号一键获取</Text>
      </Button>

      {hasToken && (
        <Button
          className='btn-skip'
          onClick={() => Taro.switchTab({ url: '/pages/index/index' })}
        >
          已登录，返回商城
        </Button>
      )}

      <View className='footer'>
        <Text className='text'>登录即表示同意</Text>
        <Text className='link'>《用户协议》</Text>
        <Text className='text'>和</Text>
        <Text className='link'>《隐私政策》</Text>
      </View>
    </View>
  );
};

export default Login;
