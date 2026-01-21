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
        const redirect = Taro.getStorageSync<{ path?: string; params?: Record<string, any> }>('REDIRECT_AFTER_LOGIN');
        if (redirect?.path) {
          const params = redirect.params || {};
          // 参数值可能已经是URL编码的，直接拼接（微信小程序会自动处理）
          const query = Object.keys(params)
            .map((key) => `${key}=${params[key]}`)
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

      // 1. 先调用登录接口获取 token（如果还没有登录）
      const loginRes = await Taro.login();
      const code = loginRes.code;

      if (!code) {
        Taro.showToast({ title: '获取登录凭证失败', icon: 'none' });
        return;
      }

      // 检查是否已有token
      const existingToken = getToken();
      if (!existingToken) {
        // 如果没有token，先登录
        await authService.login(code);
        
        // 验证token是否保存成功
        const savedToken = getToken();
        if (!savedToken) {
          Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
          return;
        }
      }

      // 2. 获取新的code用于手机号绑定
      const phoneLoginRes = await Taro.login();
      const phoneCode = phoneLoginRes.code;

      if (!phoneCode) {
        Taro.showToast({ title: '获取凭证失败', icon: 'none' });
        return;
      }

      // 3. 调用绑定手机号接口
      if (detail.code) {
        await authService.bindPhone(phoneCode, detail.code);
      } else {
        await authService.bindPhone(phoneCode, undefined, {
          encryptedData: detail.encryptedData,
          iv: detail.iv
        });
      }

      Taro.showToast({ title: '手机号绑定成功', icon: 'success' });

      // 绑定成功后跳转
      setTimeout(() => {
        const redirect = Taro.getStorageSync<{ path?: string; params?: Record<string, any> }>('REDIRECT_AFTER_LOGIN');
        if (redirect?.path) {
          const params = redirect.params || {};
          // 参数值可能已经是URL编码的，直接拼接（微信小程序会自动处理）
          const query = Object.keys(params)
            .map((key) => `${key}=${params[key]}`)
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
      console.error('绑定手机号失败', error);
      Taro.showToast({ title: '绑定手机号失败', icon: 'none' });
    } finally {
      setPhoneLoading(false);
    }
  };

  const hasToken = !!getToken();

  // Step 1: 微信登录 - 获取 code 并登录
  const handleWechatLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);

      // 获取用户信息（头像、昵称）
      let userProfile = null;
      try {
        const profileRes = await Taro.getUserProfile({
          desc: '用于完善用户资料',
        });
        console.log('用户信息:', profileRes.userInfo);
        userProfile = profileRes.userInfo;
        // 保存到本地storage
        Taro.setStorageSync('USER_PROFILE', userProfile);
      } catch (error) {
        console.log('用户拒绝授权用户信息', error);
        // 继续登录流程，不阻塞
      }

      // 获取登录凭证
      const loginRes = await Taro.login();
      const code = loginRes.code;

      if (!code) {
        Taro.showToast({ title: '获取登录凭证失败', icon: 'none' });
        return;
      }

      // 调用后端登录接口
      await authService.login(code);
      const savedToken = getToken();
      if (!savedToken) {
        Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
        return;
      }

      // 如果获取到用户信息，上传到后端保存
      if (userProfile && !userProfile.is_demote) {
        try {
          await authService.updateProfile({
            nickname: userProfile.nickName,
            avatar: userProfile.avatarUrl,
            gender: userProfile.gender
          });
          console.log('用户信息已上传到后端');
        } catch (error) {
          console.log('用户信息上传失败', error);
          // 不阻塞流程
        }
      }

      Taro.showToast({ title: '登录成功', icon: 'success' });

      // 显示手机号授权提示
      setShowPhoneAuth(true);
    } catch (error) {
      console.error('登录失败', error);
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: 手机号授权（可选）
  const handlePhoneAuth = async (e: any) => {
    const { code: phoneCode, errMsg } = e.detail;

    if (!phoneCode) {
      console.log('用户拒绝授权手机号', errMsg);
      // 用户拒绝，跳过手机号绑定
      handleSkipPhoneAuth();
      return;
    }

    try {
      setPhoneLoading(true);
      
      // 获取新的登录凭证用于验证身份
      const loginRes = await Taro.login();
      const loginCode = loginRes.code;
      
      if (!loginCode) {
        throw new Error('获取登录凭证失败');
      }
      
      // 调用后端接口：传递登录code + 手机号授权码
      await authService.bindPhone(loginCode, phoneCode);
      Taro.showToast({ title: '手机号绑定成功', icon: 'success' });
      
      // 绑定成功后跳转
      setTimeout(() => {
        navigateAfterLogin();
      }, 300);
    } catch (error) {
      console.error('手机号绑定失败', error);
      Taro.showToast({ title: '手机号绑定失败', icon: 'none' });
      // 即使失败也允许跳过
      setTimeout(() => {
        navigateAfterLogin();
      }, 1000);
    } finally {
      setPhoneLoading(false);
    }
  };

  // 跳过手机号授权
  const handleSkipPhoneAuth = () => {
    console.log('用户跳过手机号授权');
    navigateAfterLogin();
  };

  // 统一的登录后跳转逻辑
  const navigateAfterLogin = () => {
    const redirect = Taro.getStorageSync<{ path?: string; params?: Record<string, any> }>('REDIRECT_AFTER_LOGIN');
    if (redirect?.path) {
      const params = redirect.params || {};
      const query = Object.keys(params)
        .map((key) => `${key}=${params[key]}`)
        .join('&');
      const url = query ? `/${redirect.path}?${query}` : `/${redirect.path}`;

      Taro.removeStorageSync('REDIRECT_AFTER_LOGIN');

      if (['pages/index/index', 'pages/order/list', 'pages/user/profile'].includes(redirect.path)) {
        Taro.switchTab({ url: `/${redirect.path}` });
      } else {
        Taro.navigateTo({ url });
      }
    } else {
      Taro.switchTab({ url: '/pages/index/index' });
    }
  };

  const [showPhoneAuth, setShowPhoneAuth] = useState(false);

  return (
    <View className='login-container'>
      <View className='logo'>
        <Text className='title'>常香米坊</Text>
        <Text className='subtitle'>精选五常好米，直供到家</Text>
      </View>

      {!showPhoneAuth ? (
        // 第一步：微信登录按钮
        <Button
          className='btn-login'
          loading={loading}
          onClick={handleWechatLogin}
          type='primary'
        >
          <Text className='btn-text'>微信登录</Text>
        </Button>
      ) : (
        // 第二步：手机号授权（登录成功后显示）
        <View className='phone-auth-section'>
          <Text className='auth-title'>为了更好地为您服务</Text>
          <Text className='auth-desc'>需要获取您的手机号用于订单联系</Text>
          
          <Button
            className='btn-phone'
            openType='getPhoneNumber'
            onGetPhoneNumber={handlePhoneAuth}
            loading={phoneLoading}
            type='primary'
          >
            <Text className='btn-text'>授权手机号</Text>
          </Button>

          <Button
            className='btn-skip'
            onClick={handleSkipPhoneAuth}
            disabled={phoneLoading}
          >
            <Text className='btn-text'>暂不授权</Text>
          </Button>
        </View>
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
