import { PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';
import { debugService } from './services/api';
import { setAttributionParams, type AttributionParams } from './utils/storage';
import './app.scss';

function App({ children }: PropsWithChildren) {
  const syncAttributionParams = (options?: any) => {
    if (!options) return;
    const query = options?.query || {};
    const channel = query.channel ? String(query.channel) : '';
    const sceneParam = query.scene ? String(query.scene) : '';
    const sceneCode = sceneParam || (options?.scene != null ? String(options.scene) : '');
    const referrerCode = query.referrer_code ? String(query.referrer_code) : '';
    const landingPage = options?.path ? String(options.path) : '';

    const payload: AttributionParams = {};
    if (channel) payload.channel = channel;
    if (sceneCode) payload.scene = sceneCode;
    if (referrerCode) {
      payload.referrer_code = referrerCode;
    } else if (sceneCode) {
      const match = /^U\d+[A-Za-z0-9]{4}$/.test(sceneCode) ? sceneCode : sceneCode.startsWith('rc_') ? sceneCode.slice(3) : '';
      if (match) {
        payload.referrer_code = match;
      }
    }
    if (landingPage) payload.landing_page = landingPage;

    if (Object.keys(payload).length > 0) {
      payload.recorded_at = new Date().toISOString();
      setAttributionParams(payload);
    }
  };
  const redirectToGiftCardClaim = () => {
    try {
      const options = (Taro.getLaunchOptionsSync && Taro.getLaunchOptionsSync()) as any;
      const query = options?.query || {};
      const rawToken = query.giftcard_token || query.token || '';
      const scene = query.scene || '';
      let token = rawToken;
      if (!token && scene) {
        try {
          token = decodeURIComponent(scene);
        } catch {
          token = scene;
        }
      }
      const persisted = Taro.getStorageSync<string>('GIFT_CARD_CLAIM_TOKEN');
      if (!token && persisted) {
        token = persisted;
      }

      if (!token) return;

      if (token && token !== persisted) {
        Taro.setStorageSync('GIFT_CARD_CLAIM_TOKEN', token);
      }

      const pages = Taro.getCurrentPages();
      const current = pages[pages.length - 1];
      if (current?.route === 'pages/shopping-card/claim') return;
      if (current?.route === 'pages/auth/login') return;

      Taro.redirectTo({ url: `/pages/shopping-card/claim?token=${encodeURIComponent(token)}` });
    } catch {
      // ignore
    }
  };

  Taro.useLaunch(() => {
    console.log('App launched');
    try {
      const launchOptions = (Taro.getLaunchOptionsSync && Taro.getLaunchOptionsSync()) as any;
      syncAttributionParams(launchOptions);
      debugService.logClient('app:launch', {
        query: launchOptions?.query || {},
        scene: launchOptions?.scene,
        path: launchOptions?.path
      }).catch(() => undefined);
    } catch {
      // ignore
    }
    redirectToGiftCardClaim();
  });

  Taro.useDidShow(() => {
    // App 显示时的逻辑
    try {
      const enterOptions = (Taro.getEnterOptionsSync && Taro.getEnterOptionsSync()) as any;
      syncAttributionParams(enterOptions);
      debugService.logClient('app:show', {
        query: enterOptions?.query || {},
        scene: enterOptions?.scene,
        path: enterOptions?.path,
        referrerInfo: enterOptions?.referrerInfo || {}
      }).catch(() => undefined);
    } catch {
      // ignore
    }
    redirectToGiftCardClaim();
  });

  return <>{children}</>;
}

export default App;
