import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import QRCode from 'qrcode-generator';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { debugService, giftCardService, userService } from '../../services/api';
import { getStoredUserInfo, getToken } from '../../utils/storage';
import type { GiftCardShareResult } from '../../types';
import './share-result.scss';

// 生成二维码矩阵
const buildQrMatrix = (payload?: string | null) => {
  if (!payload) return [];
  try {
    const qr = QRCode(0, 'M');
    qr.addData(payload);
    qr.make();
    const size = qr.getModuleCount();
    const matrix: boolean[][] = [];
    for (let row = 0; row < size; row += 1) {
      const rowData: boolean[] = [];
      for (let col = 0; col < size; col += 1) {
        rowData.push(qr.isDark(row, col));
      }
      matrix.push(rowData);
    }
    return matrix;
  } catch (error) {
    console.error('二维码生成失败', error);
    return [];
  }
};

const GiftCardShareResult = () => {
  const router = useRouter();
  const logShareDebug = (stage: string, payload: Record<string, any>) => {
    try {
      const data = { stage, ts: Date.now(), ...payload };
      console.info('[GiftCardShareResult]', data);
      Taro.setStorageSync('GIFT_CARD_DEBUG_LAST', data);
      debugService.logClient(`share-result:${stage}`, data).catch(() => undefined);
    } catch {
      // ignore
    }
  };
  const cardNumber = (router?.params?.card as string) || '';
  const styleId = (router?.params?.style as string) || '';
  const message = decodeURIComponent((router?.params?.message as string) || '');
  const [shareResult, setShareResult] = useState<GiftCardShareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing] = useState(false);
  const [forceMatrix, setForceMatrix] = useState(false);
  const [shareTokenState, setShareTokenState] = useState('');
  const miniEnvVersion = useMemo(() => {
    try {
      const info = (Taro.getAccountInfoSync && Taro.getAccountInfoSync()) as any;
      return info?.miniProgram?.envVersion || 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);
  const isDevelopEnv = miniEnvVersion === 'develop';
  // 购物卡分享必须携带 share_token，否则接收方无法领取。
  // share_token 可能为空的场景：
  // 1) 分享接口失败（网络/超时/权限）
  // 2) 分享接口返回异常数据
  // 3) 用户点击过快，分享结果尚未生成
  const getStoredShareToken = () => {
    try {
      return Taro.getStorageSync<{ share_token?: string }>('GIFT_CARD_SHARE_CONTEXT')?.share_token || '';
    } catch {
      return '';
    }
  };
  const shareToken = shareTokenState || shareResult?.share_token || getStoredShareToken();
  const canShare = Boolean(shareToken);

  const resolveClaimToken = useCallback(() => {
    const directToken = (router?.params?.token as string) || (router?.params?.giftcard_token as string) || '';
    const scene = (router?.params?.scene as string) || '';
    let token = directToken;
    if (!token && scene) {
      try {
        token = decodeURIComponent(scene);
      } catch {
        token = scene;
      }
    }
    if (!token) {
      try {
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
      } catch {
        // ignore
      }
    }
    if (!token) {
      const persisted = Taro.getStorageSync<string>('GIFT_CARD_CLAIM_TOKEN');
      if (persisted) token = persisted;
    }
    return token;
  }, [router?.params]);

  const ensureShareEligibility = useCallback(async () => {
    try {
      const cached = getStoredUserInfo();
      const cachedHasRealname = Boolean(cached?.has_realname);
      const cachedHasPhone = Boolean(cached?.has_phone || cached?.phone);
      if (cachedHasRealname && cachedHasPhone) {
        return true;
      }

      const profile = await userService.getProfile({
        showLoading: false,
        timeout: 8000,
        suppressErrorToast: true
      });
      const hasRealname = Boolean(profile.first_name && profile.first_name.trim());
      const hasPhone = Boolean(profile.phone && profile.phone.trim());

      if (hasRealname && hasPhone) {
        return true;
      }

      const res = await Taro.showModal({
        title: '请完善实名信息',
        content: '生成分享二维码前需完善真实姓名和手机号。',
        confirmText: '去完善',
        cancelText: '稍后'
      });

      if (res.confirm) {
        Taro.navigateTo({ url: '/pages/user/edit-profile' });
      } else {
        Taro.navigateBack();
      }

      return false;
    } catch (error: any) {
      console.error('校验实名信息失败', error);
      const cached = getStoredUserInfo();
      const cachedHasRealname = Boolean(cached?.has_realname);
      const cachedHasPhone = Boolean(cached?.has_phone || cached?.phone);
      if (cachedHasRealname && cachedHasPhone) {
        return true;
      }
      Taro.showToast({ title: '网络超时，无法校验实名信息', icon: 'none' });
      return false;
    }
  }, []);

  const loadShareResult = useCallback(async () => {
    if (!cardNumber || !styleId) {
      const token = resolveClaimToken();
      if (token) {
        logShareDebug('redirect_to_claim_from_share_result', { token, reason: 'missing_card_or_style' });
        setRedirecting(true);
        Taro.redirectTo({ url: `/pages/shopping-card/claim?token=${encodeURIComponent(token)}` });
        return;
      }
      Taro.showToast({ title: '参数缺失', icon: 'none' });
      Taro.navigateBack();
      return;
    }

    const authToken = getToken();
    if (!authToken) {
      const redirectData = {
        path: 'pages/shopping-card/share-result',
        params: {
          card: cardNumber,
          style: styleId,
          message
        }
      };
      Taro.setStorageSync('REDIRECT_AFTER_LOGIN', redirectData);
      logShareDebug('redirect_to_login', { reason: 'missing_auth' });
      Taro.redirectTo({ url: '/pages/auth/login' });
      return;
    }

    setLoading(true);
    try {
      const cards = await giftCardService.listMine({
        showLoading: false,
        suppressErrorToast: true,
        suppressLog: true,
        cacheMs: 0
      });
      const owned = cards.find((c) => c.card_number === cardNumber);
      if (!owned) {
        Taro.showToast({ title: '无权分享该礼品卡', icon: 'none' });
        const token = resolveClaimToken();
        if (token) {
          Taro.redirectTo({ url: `/pages/shopping-card/claim?token=${encodeURIComponent(token)}` });
        } else {
          Taro.navigateBack();
        }
        return;
      }

      const eligible = await ensureShareEligibility();
      if (!eligible) {
        return;
      }

      // 调用分享API生成分享内容
      const result = await giftCardService.share({
        card_number: cardNumber,
        delivery_mode: 'digital_share',
        channel: 'miniprogram',
        message: message.trim() || undefined,
        theme: styleId,
        format: 'both'
      });
      
      if (result) {
        setShareResult(result);
        if (result?.share_token) {
          setShareTokenState(result.share_token);
          Taro.setStorageSync('GIFT_CARD_SHARE_CONTEXT', {
            card_number: result.card_number,
            share_token: result.share_token
          });
        }
        logShareDebug('share_result_ready', {
          card_number: result?.card_number,
          share_token: result?.share_token,
          mini_program_path: result?.mini_program_path
        });
        setForceMatrix(false);
        // 在小程序环境中，Image 组件会自动处理图片预加载
      } else {
        throw new Error('API返回数据为空');
      }
    } catch (error: any) {
      console.error('生成分享内容失败', error);
      const errorMsg = error?.message || error?.errMsg || '生成失败，请稍后重试';
      Taro.showToast({ title: errorMsg, icon: 'none', duration: 3000 });
      // 设置错误状态，让用户可以看到错误信息
      setShareResult(null);
    } finally {
      setLoading(false);
    }
  }, [cardNumber, styleId, message, ensureShareEligibility, resolveClaimToken]);

  useEffect(() => {
    loadShareResult();
  }, [loadShareResult]);

  useEffect(() => {
    if (shareResult?.share_token) {
      setShareTokenState(shareResult.share_token);
    }
  }, [shareResult?.share_token]);

  useEffect(() => {
    if (canShare) {
      Taro.showShareMenu({ withShareTicket: false }).catch(() => undefined);
    } else if (typeof Taro.hideShareMenu === 'function') {
      Taro.hideShareMenu();
    }
  }, [canShare]);

  // 计算二维码矩阵（必须在所有条件返回之前）
  const qrImageUrl = forceMatrix ? '' : shareResult?.mini_program_qr || shareResult?.qr_image_url || '';
  const qrPayload = shareResult?.qr_payload || '';
  
  const qrMatrix = useMemo(() => {
    if (qrImageUrl) return null; // 如果有图片URL，就不需要前端生成
    return buildQrMatrix(qrPayload);
  }, [qrImageUrl, qrPayload]);

  const handleSaveToAlbum = async () => {
    if (!shareResult) return;

    setSaving(true);
    try {
      // 获取二维码图片URL或payload
      const imageUrl = shareResult.mini_program_qr || shareResult.qr_image_url || '';
      const payload = shareResult.qr_payload || '';
      
      if (!imageUrl && !payload) {
        Taro.showToast({ title: '图片生成失败', icon: 'none' });
        return;
      }

      let tempFilePath = '';

      if (imageUrl) {
        // 如果有图片URL，下载后保存
        try {
          const downloadResult = await Taro.downloadFile({
            url: imageUrl
          });

          if (downloadResult.statusCode === 200) {
            tempFilePath = downloadResult.tempFilePath;
          } else {
            throw new Error('下载失败');
          }
        } catch {
          // 如果下载失败，提示用户
          Taro.showToast({ title: '图片下载失败，请稍后重试', icon: 'none' });
          return;
        }
      } else {
        // 如果没有图片URL，使用Canvas生成二维码图片
        // 注意：小程序中Canvas生成图片需要异步处理
        Taro.showToast({ title: '正在生成图片...', icon: 'loading', duration: 2000 });
        
        // 使用Canvas生成二维码（需要获取Canvas上下文）
        // 这里先提示用户，实际实现需要Canvas API
        Taro.showModal({
          title: '提示',
          content: '当前二维码为临时显示，完整功能需要后端生成带模板的图片。请截图保存或使用其他方式分享。',
          showCancel: false
        });
        return;
      }

      if (tempFilePath) {
        // 保存图片到相册
        await Taro.saveImageToPhotosAlbum({
          filePath: tempFilePath
        });
        Taro.showToast({ title: '已保存到相册', icon: 'success' });
      }
    } catch (error: any) {
      if (error.errMsg?.includes('auth deny')) {
        Taro.showModal({
          title: '需要授权',
          content: '保存图片需要相册权限，请在设置中开启',
          showCancel: false
        });
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' });
      }
    } finally {
      setSaving(false);
    }
  };

  // 分享按钮由 openType=share 触发，分享内容由 useShareAppMessage 提供。

  // Provide share content for the native share action (Button open-type="share")
  Taro.useShareAppMessage(() => {
    // 没有 token 时禁止分享，避免生成无效分享路径。
    const token = shareTokenState || shareResult?.share_token || getStoredShareToken();
    if (!token) return { title: '礼品卡分享', path: '/pages/index/index' };
    logShareDebug('share_app_message', {
      token,
      card_number: shareResult?.card_number,
      path: `/pages/shopping-card/claim?token=${token}`
    });
    const title =
      shareResult.share_meta?.message?.trim() ||
      (shareResult.card_snapshot?.template_name
        ? `送你一张${shareResult.card_snapshot.template_name}礼品卡`
        : '我给你一张礼品卡，点开查看');
    const path = `/pages/shopping-card/claim?token=${token}`;
    const imageUrl = shareResult.mini_program_qr || shareResult.qr_image_url || '';
    return {
      title,
      path,
      imageUrl
    } as any;
  });

  if (loading) {
    return (
      <View className='share-result-page loading-state'>
        <Text>生成中...</Text>
      </View>
    );
  }

  if (redirecting) {
    return (
      <View className='share-result-page loading-state'>
        <Text>正在跳转...</Text>
      </View>
    );
  }

  if (!shareResult) {
    return (
      <View className='share-result-page'>
        <View className='error-state'>
          <Text>生成失败</Text>
          <Button
            className='back-btn'
            onClick={() => {
              const pages = Taro.getCurrentPages();
              if (pages.length > 1) {
                Taro.navigateBack();
              } else {
                Taro.switchTab({ url: '/pages/index/index' });
              }
            }}
          >
            返回
          </Button>
        </View>
      </View>
    );
  }

  // const cardSnapshot = shareResult.card_snapshot;

  return (
    <View className='share-result-page'>
      <View className='result-preview'>
        <Text className='preview-title'>分享卡片预览</Text>
        {isDevelopEnv && (
          <View className='env-warning'>
            <Text className='env-warning-text'>
              当前为开发版二维码，仅开发者/体验成员可打开；非成员扫码会提示版本过期。请使用体验版/正式版或将对方加入体验成员。
            </Text>
          </View>
        )}
        
        {qrImageUrl ? (
          <View className='preview-image-wrapper'>
            <Image
              className='preview-image'
              mode='widthFix'
              src={qrImageUrl}
              lazyLoad={false}
              showMenuByLongpress
              onError={() => {
                setForceMatrix(true);
                Taro.showToast({ title: '图片加载失败，使用备用方案', icon: 'none', duration: 2000 });
              }}
            />
          </View>
        ) : qrMatrix && qrMatrix.length > 0 ? (
          <View className='preview-image-wrapper'>
            <View
              className='qr-grid'
              style={{
                gridTemplateColumns: `repeat(${qrMatrix.length}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${qrMatrix.length}, minmax(0, 1fr))`
              }}
            >
              {qrMatrix.map((row, rowIndex) =>
                row.map((dark, colIndex) => (
                  <View
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${rowIndex}-${colIndex}`}
                    className={`qr-cell ${dark ? 'dark' : 'light'}`}
                  />
                ))
              )}
            </View>
          </View>
        ) : (
          <View className='preview-placeholder'>
            <Text>图片加载中...</Text>
          </View>
        )}

        {/* 购物卡信息已整合到图片中，这里不再单独显示 */}
      </View>

      <View className='action-buttons'>
        <Button
          className='btn btn-share'
          loading={sharing}
          openType='share'
          disabled={!canShare}
          onClick={() => {
            if (!canShare) {
              Taro.showToast({ title: '分享生成失败，请重新生成后再分享', icon: 'none' });
              return;
            }
            const pages = Taro.getCurrentPages();
            const current = pages[pages.length - 1] as any;
            logShareDebug('share_button_click', {
              token: shareToken,
              route: current?.route,
              params: current?.options || {}
            });
          }}
        >
          {sharing ? '分享中...' : '分享电子二维码'}
        </Button>
        {!canShare && (
          <Text className='tip-text'>分享码缺失，请返回重新生成分享内容。</Text>
        )}
        <Button
          className='btn btn-save'
          loading={saving}
          onClick={handleSaveToAlbum}
        >
          {saving ? '保存中...' : '保存购物卡'}
        </Button>
      </View>

      <View className='tips'>
        <Text className='tip-text'>• 分享电子二维码：点击后会弹出分享面板，选择渠道即可分享</Text>
        <Text className='tip-text'>• 保存购物卡：保存到相册后可打印或通过其他方式分享</Text>
      </View>
    </View>
  );
};

export default GiftCardShareResult;

