import { View, Button, Text, Checkbox, CheckboxGroup } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';

import { authService, userService } from '../../services/api';
import { getToken } from '../../utils/storage';
import './login.scss';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPrivacyAuth, setShowPrivacyAuth] = useState(false);

  // Step 1: 微信登录 - 获取 code 并登录
  const checkPrivacyAuthorization = async () => {
    if (typeof Taro.getPrivacySetting !== 'function') {
      return false;
    }

    try {
      const needAuth = await new Promise<boolean>((resolve) => {
        Taro.getPrivacySetting({
          success: (res: any) => resolve(Boolean(res?.needAuthorization)),
          fail: () => resolve(false)
        });
      });
      return needAuth;
    } catch (error) {
      return false;
    }
  };

  const doWechatLogin = async (profile?: Taro.UserInfo | null) => {
    if (loading) return;

    try {
      setLoading(true);
      const userProfile = profile || null;
      if (userProfile) {
        // 保存到本地storage
        Taro.setStorageSync('USER_PROFILE', userProfile);
      }

      // 获取登录凭证
      const loginRes = await Taro.login();
      const code = loginRes.code;

      if (!code) {
        Taro.showToast({ title: '获取登录凭证失败', icon: 'none' });
        return;
      }

      // 调用后端登录接口（携带昵称/头像，作为兜底保存）
      const wechatProfile = userProfile
        ? {
            nickname: userProfile.nickName,
            avatar: userProfile.avatarUrl
          }
        : undefined;

      await authService.login(code, wechatProfile);
      const savedToken = getToken();
      if (!savedToken) {
        Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
        return;
      }

      // 如果获取到用户信息，上传到后端保存
      if (userProfile) {
        try {
          await userService.updateProfile({
            nickname: userProfile.nickName,
            avatar: userProfile.avatarUrl,
            gender: userProfile.gender
          });
        } catch (error) {
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

  const requestWechatProfile = async () => {
    try {
      const profileRes = await Taro.getUserProfile({
        desc: '用于完善用户资料'
      });
      return profileRes.userInfo || null;
    } catch (error) {
      Taro.showToast({ title: '已拒绝授权，昵称头像将不显示', icon: 'none' });
      return null;
    }
  };

  const handleWechatLogin = async () => {
    if (loading) return;

    if (!agreed) {
      Taro.showToast({ title: '请先勾选我已阅读并同意', icon: 'none' });
      return;
    }
    const needAuth = await checkPrivacyAuthorization();
    if (needAuth) {
      setShowPrivacyAuth(true);
      return;
    }

    const profile = await requestWechatProfile();

    await doWechatLogin(profile);
  };

  const handleAgreePrivacyAuthorization = async () => {
    setShowPrivacyAuth(false);
    const profile = await requestWechatProfile();
    await doWechatLogin(profile);
  };

  // Step 2: 手机号授权（可选）
  const handlePhoneAuth = async (e: any) => {
    const { code: phoneCode } = e.detail;

    if (!phoneCode) {
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

  const handleAgreeChange = (e: any) => {
    const values: string[] = e?.detail?.value || [];
    setAgreed(values.includes('agree'));
  };

  const handleOpenTerms = () => {
    Taro.navigateTo({ url: '/pages/legal/terms' });
  };

  const handleOpenPrivacy = () => {
    if (typeof Taro.openPrivacyContract === 'function') {
      Taro.openPrivacyContract({
        fail: () => {
          Taro.navigateTo({ url: '/pages/legal/privacy' });
        }
      });
    } else {
      Taro.navigateTo({ url: '/pages/legal/privacy' });
    }
  };

  return (
    <View className='login-container'>
      <View className='logo'>
        <Text className='title'>安家大米</Text>
        <Text className='subtitle'>精选五常好米，直供到家</Text>
      </View>

      {!showPhoneAuth ? (
        // 第一步：微信登录按钮
        <Button
          className='btn-login'
          loading={loading}
          disabled={loading}
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

      {showPrivacyAuth && (
        <View className='privacy-modal'>
          <View className='privacy-card'>
            <Text className='privacy-title'>隐私授权提示</Text>
            <Text className='privacy-desc'>需要您同意《用户隐私保护指引》后，才能获取头像昵称等信息。</Text>
            <View className='privacy-actions'>
              <Button className='privacy-link' onClick={handleOpenPrivacy}>
                查看隐私指引
              </Button>
              <Button
                className='privacy-agree'
                openType='agreePrivacyAuthorization'
                onAgreePrivacyAuthorization={handleAgreePrivacyAuthorization}
              >
                同意并继续
              </Button>
            </View>
          </View>
        </View>
      )}

      <View className='footer'>
        <CheckboxGroup onChange={handleAgreeChange}>
          <View className='agreement'>
            <Checkbox className='agreement-checkbox' value='agree' checked={agreed} />
            <Text className='text'>我已阅读并同意</Text>
            <Text className='link' onClick={handleOpenTerms}>《用户协议》</Text>
            <Text className='text'>和</Text>
            <Text className='link' onClick={handleOpenPrivacy}>《隐私政策》</Text>
          </View>
        </CheckboxGroup>
      </View>
    </View>
  );
};

export default Login;
