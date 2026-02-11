import { View, Button, Text, Checkbox, CheckboxGroup } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';

import { authService, debugService } from '../../services/api';
import { getToken, setAttributionParams, type AttributionParams } from '../../utils/storage';
import { parseReferrerFromScene } from '../../utils/referral';
import HelpTooltip from '../../components/HelpTooltip';
import './login.scss';

const Login = () => {
  const logLoginDebug = (stage: string, payload: Record<string, any>) => {
    try {
      const data = { stage, ts: Date.now(), ...payload };
      Taro.setStorageSync('GIFT_CARD_DEBUG_LAST', data);
      debugService.logClient(`login:${stage}`, data).catch(() => undefined);
    } catch {
      // ignore
    }
  };
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);


  const resolveGiftCardToken = () => {
    try {
      const currentParams = Taro.getCurrentInstance().router?.params ?? {};
      const directToken = (currentParams.token as string) || (currentParams.giftcard_token as string) || '';
      const scene = (currentParams.scene as string) || '';
      let token = directToken;
      if (!token && scene) {
        try {
          token = decodeURIComponent(scene);
        } catch {
          token = scene;
        }
      }
      if (!token) {
        const enterOptions = (Taro.getEnterOptionsSync && Taro.getEnterOptionsSync()) as any;
        const launchOptions = (Taro.getLaunchOptionsSync && Taro.getLaunchOptionsSync()) as any;
        const query = enterOptions?.query || launchOptions?.query || {};
        token = query.giftcard_token || query.token || '';
        const qsScene = query.scene || '';
        if (!token && qsScene) {
          try {
            token = decodeURIComponent(qsScene);
          } catch {
            token = qsScene;
          }
        }
      }
      return token;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const token = resolveGiftCardToken();
    if (token) {
      Taro.setStorageSync('GIFT_CARD_CLAIM_TOKEN', token);
      logLoginDebug('token_resolved', { token });
    }
  }, []);

  useEffect(() => {
    try {
      const routerParams = Taro.getCurrentInstance().router?.params ?? {};
      const sceneParam = routerParams.scene ? String(routerParams.scene) : '';
      const referrerCode = routerParams.referrer_code ? String(routerParams.referrer_code) : '';
      const referrerFromScene = parseReferrerFromScene(sceneParam);
      if (!sceneParam && !referrerCode) return;

      const payload: AttributionParams = {};
      if (sceneParam) payload.scene = sceneParam;
      if (referrerCode) {
        payload.referrer_code = referrerCode;
      } else if (referrerFromScene) {
        payload.referrer_code = referrerFromScene;
      }

      if (Object.keys(payload).length > 0) {
        payload.recorded_at = new Date().toISOString();
        setAttributionParams(payload);
      }
    } catch {
      // ignore
    }
  }, []);

  // 仅以 code 登录，不要求头像/昵称/手机号
  const doWechatLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);

      // 获取登录凭证
      const loginRes = await Taro.login();
      const code = loginRes.code;

      if (!code) {
        Taro.showToast({ title: '获取登录凭证失败', icon: 'none' });
        return;
      }

      await authService.login(code);
      const savedToken = getToken();
      if (!savedToken) {
        Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
        return;
      }
      logLoginDebug('wechat_login_success', {});
      Taro.showToast({ title: '登录成功', icon: 'success' });
      navigateAfterLogin();
    } catch (error) {
      console.error('登录失败', error);
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = async () => {
    if (loading) return;

    if (!agreed) {
      Taro.showToast({ title: '请先勾选我已阅读并同意', icon: 'none' });
      return;
    }

    await doWechatLogin();
  };

  // 统一的登录后跳转逻辑
  const navigateAfterLogin = () => {
    let claimToken = Taro.getStorageSync<string>('GIFT_CARD_CLAIM_TOKEN');
    if (!claimToken) {
      claimToken = resolveGiftCardToken();
      if (claimToken) {
        Taro.setStorageSync('GIFT_CARD_CLAIM_TOKEN', claimToken);
      }
    }
    if (claimToken) {
      logLoginDebug('redirect_to_claim', { token: claimToken });
      Taro.redirectTo({ url: `/pages/shopping-card/claim?token=${encodeURIComponent(claimToken)}` });
      return;
    }
    const redirect = Taro.getStorageSync<{ path?: string; params?: Record<string, any> }>('REDIRECT_AFTER_LOGIN');
    if (redirect?.path) {
      const params = redirect.params || {};
      const query = Object.keys(params)
        .map((key) => `${key}=${params[key]}`)
        .join('&');
      const url = query ? `/${redirect.path}?${query}` : `/${redirect.path}`;

      Taro.removeStorageSync('REDIRECT_AFTER_LOGIN');

      if (['pages/index/index', 'pages/order/list', 'pages/user/profile'].includes(redirect.path)) {
        logLoginDebug('redirect_switch_tab', { path: redirect.path });
        Taro.switchTab({ url: `/${redirect.path}` });
      } else {
        logLoginDebug('redirect_navigate', { path: redirect.path, url });
        Taro.navigateTo({ url });
      }
    } else {
      logLoginDebug('redirect_default_home', {});
      Taro.switchTab({ url: '/pages/index/index' });
    }
  };

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

      <Button
        className='btn-login'
        loading={loading}
        disabled={loading}
        onClick={handleWechatLogin}
        type='primary'
      >
        <Text className='btn-text'>微信登录</Text>
        <HelpTooltip page='auth/login' location='wechat_login_button' />
      </Button>

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
