import { PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';
import { debugService } from './services/api';
import { getAttributionParams, getToken, setAttributionParams, type AttributionParams } from './utils/storage';
import { parseReferrerFromScene } from './utils/referral';
import './app.scss';

function App({ children }: PropsWithChildren) {
  const parseGiftCardScene = (scene?: string) => {
    if (!scene) return { token: '', referrerCode: '' };
    if (scene.startsWith('gc_')) {
      const rest = scene.slice(3);
      const rcIndex = rest.indexOf('_rc_');
      if (rcIndex > -1) {
        return {
          token: rest.slice(0, rcIndex),
          referrerCode: rest.slice(rcIndex + 4)
        };
      }
      return { token: rest, referrerCode: '' };
    }
    return { token: '', referrerCode: '' };
  };

  const syncAttributionParams = (options?: any) => {
    if (!options) return;
    const query = options?.query || {};
    const channel = query.channel ? String(query.channel) : '';
    const sceneParam = query.scene ? String(query.scene) : '';
    const sceneCode = sceneParam || (options?.scene != null ? String(options.scene) : '');
    const referrerCode = query.referrer_code ? String(query.referrer_code) : '';
    const giftcardScene = parseGiftCardScene(sceneCode);
    const landingPage = options?.path ? String(options.path) : '';

    const payload: AttributionParams = {};
    if (channel) payload.channel = channel;
    if (sceneCode) payload.scene = sceneCode;
    if (referrerCode) {
      payload.referrer_code = referrerCode;
    } else if (giftcardScene.referrerCode) {
      payload.referrer_code = giftcardScene.referrerCode;
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
          const decoded = decodeURIComponent(scene);
          const parsed = parseGiftCardScene(decoded);
          token = parsed.token || decoded;
        } catch {
          const parsed = parseGiftCardScene(scene);
          token = parsed.token || scene;
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

  // Only force login for referral entry (referrer_code/scene). Normal entry stays on home.
  const redirectToLoginIfReferral = () => {
    try {
      const token = getToken();
      if (token) return;

      const attribution = getAttributionParams();
      const referrerCode = attribution?.referrer_code || '';
      const scene = attribution?.scene || '';
      const referrerFromScene = parseReferrerFromScene(scene);
      const effectiveReferrer = referrerCode || referrerFromScene;
      if (!effectiveReferrer) return;

      const pages = Taro.getCurrentPages();
      const current = pages[pages.length - 1];
      const currentRoute = current?.route || '';
      if (currentRoute.includes('auth/login')) return;
      if (currentRoute.includes('shopping-card/claim')) return;

      const query: string[] = [];
      if (effectiveReferrer) query.push(`referrer_code=${encodeURIComponent(effectiveReferrer)}`);
      if (scene) query.push(`scene=${encodeURIComponent(scene)}`);
      const qs = query.length ? `?${query.join('&')}` : '';
      Taro.reLaunch({ url: `/pages/auth/login${qs}` });
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
    redirectToLoginIfReferral();
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
    redirectToLoginIfReferral();
  });

  return <>{children}</>;
}

export default App;
