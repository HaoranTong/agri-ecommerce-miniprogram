import { Button, Image, Text, Textarea, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import QRCode from 'qrcode-generator';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { debugService, giftCardService, userService } from '../../services/api';
import { getStoredUserInfo } from '../../utils/storage';
import type { GiftCard, GiftCardDeliveryMode, GiftCardShareResult, GiftCardShareStyle } from '../../types';
import './share.scss';

const getBalanceNumber = (balance: string | null) => Number(balance ?? 0);

const MODE_META: Record<GiftCardDeliveryMode, { icon: string; label: string; tip: string }> = {
  digital_share: {
    icon: '📱',
    label: '二维码/链接',
    tip: '生成 myshop://giftcard 二维码，好友扫码后即可填写收件信息'
  },
  printable: {
    icon: '🖨️',
    label: '打印祝福卡',
    tip: '复制打印模板，在浏览器套用祝福语导出 PDF 或实体卡'
  }
};

const FALLBACK_MODES: GiftCardDeliveryMode[] = ['digital_share', 'printable'];

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

const formatDeliveryMode = (mode?: GiftCardDeliveryMode | string | null) => {
  if (!mode) return '未知方式';
  return MODE_META[mode as GiftCardDeliveryMode]?.label || mode;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    // iOS 兼容：将 "yyyy-MM-dd HH:mm:ss" 格式转换为 "yyyy-MM-ddTHH:mm:ss"
    const isoValue = value.replace(' ', 'T');
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    console.error('时间格式化失败', error);
    return value;
  }
};

const GiftCardShare = () => {
  const router = useRouter();
  const logShareDebug = (stage: string, payload: Record<string, any>) => {
    try {
      const data = { stage, ts: Date.now(), ...payload };
      console.info('[GiftCardShare]', data);
      Taro.setStorageSync('GIFT_CARD_DEBUG_LAST', data);
      debugService.logClient(`share:${stage}`, data).catch(() => undefined);
    } catch {
      // ignore
    }
  };
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<GiftCardDeliveryMode>('digital_share');
  const [message, setMessage] = useState('');
  const [isMessageCustomized, setIsMessageCustomized] = useState(false);
  const [shareStyles, setShareStyles] = useState<GiftCardShareStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<GiftCardShareResult | null>(null);
  const [qrMatrix, setQrMatrix] = useState<boolean[][]>([]);
  const [forceMatrix, setForceMatrix] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
  const presetCardFromRoute = (router?.params?.card as string) || '';

  const getAvailableModes = (card?: GiftCard): GiftCardDeliveryMode[] => {
    const candidates = card?.delivery_modes?.length ? card.delivery_modes : FALLBACK_MODES;
    return candidates.filter((mode): mode is GiftCardDeliveryMode => Boolean(MODE_META[mode as GiftCardDeliveryMode]));
  };

  // 函数不依赖可变外部值，移除不必要依赖
  const isShareableCard = useCallback(
    (card: GiftCard) => card.status === 'active' && getBalanceNumber(card.balance) > 0 && card.share_state !== 'consumed',
    []
  );

  const shareableCards = useMemo(
    () => cards.filter((card) => isShareableCard(card)),
    [cards, isShareableCard]
  );

  const selectedCardInfo = useMemo(
    () => shareableCards.find((card) => card.card_number === selectedCard),
    [shareableCards, selectedCard]
  );

  const availableModes = useMemo(() => getAvailableModes(selectedCardInfo), [selectedCardInfo]);

  const selectedStyle = useMemo(() => {
    if (!shareStyles.length) return null;
    if (selectedStyleId) {
      return shareStyles.find((style) => style.id === selectedStyleId) ?? shareStyles[0];
    }
    return shareStyles[0];
  }, [shareStyles, selectedStyleId]);

  const deriveDefaultMessage = useCallback(
    (style?: GiftCardShareStyle | null, card?: GiftCard | null) => {
      if (style?.config?.default_message) {
        return String(style.config.default_message);
      }
      if (card?.share_meta?.message) {
        return card.share_meta.message;
      }
      return '送你一份精心准备的好礼，愿你喜欢。';
    },
    []
  );

  const qrImageUrl = useMemo(
    () => (forceMatrix ? '' : shareResult?.mini_program_qr || shareResult?.qr_image_url || ''),
    [forceMatrix, shareResult?.mini_program_qr, shareResult?.qr_image_url]
  );
  // 购物卡分享必须携带 share_token，否则接收方无法领取。
  // share_token 可能为空的场景：
  // 1) 分享接口失败（网络/超时/权限）
  // 2) 分享接口返回异常数据
  // 3) 用户点击过快，分享结果尚未生成
  // 因此没有 token 时要禁止分享，并提示用户重新生成。
  const getStoredShareToken = () => {
    try {
      return Taro.getStorageSync<{ share_token?: string }>('GIFT_CARD_SHARE_CONTEXT')?.share_token || '';
    } catch {
      return '';
    }
  };
  const shareToken = shareTokenState || shareResult?.share_token || getStoredShareToken();
  const canShare = Boolean(shareToken);

  useEffect(() => {
    if (qrImageUrl) {
      setQrMatrix([]);
      return;
    }
    setQrMatrix(buildQrMatrix(shareResult?.qr_payload));
  }, [shareResult?.qr_payload, qrImageUrl]);

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

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        setStylesLoading(true);
        const data = await giftCardService.listShareStyles();
        setShareStyles(data);
        setSelectedStyleId((prev) => prev ?? data[0]?.id ?? null);
      } catch (error) {
        console.error('获取分享模板失败', error);
        Taro.showToast({ title: '分享模板加载失败', icon: 'none' });
      } finally {
        setStylesLoading(false);
      }
    };
    fetchStyles();
  }, []);

  useEffect(() => {
    if (!selectedCardInfo) return;
    if (!selectedStyle && !stylesLoading && shareStyles.length) {
      setSelectedStyleId(shareStyles[0]?.id ?? null);
      return;
    }
    if (isMessageCustomized) return;
    setMessage(deriveDefaultMessage(selectedStyle, selectedCardInfo));
  }, [
    selectedCardInfo,
    selectedStyle,
    deriveDefaultMessage,
    isMessageCustomized,
    shareStyles,
    stylesLoading
  ]);

  useEffect(() => {
    if (!availableModes.length) return;
    if (!availableModes.includes(deliveryMode)) {
      setDeliveryMode(availableModes[0]);
    }
  }, [availableModes, deliveryMode]);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await giftCardService.listMine();
      setCards(data);
      const eligible = data.filter((card) => isShareableCard(card));
      if (eligible.length > 0) {
        const matchedCard = presetCardFromRoute
          ? eligible.find((card) => card.card_number === presetCardFromRoute)
          : undefined;
        const defaultCard = matchedCard || eligible[0];
        setSelectedCard(defaultCard.card_number);
        const modes = getAvailableModes(defaultCard);
        setDeliveryMode(modes[0] ?? 'digital_share');
      } else {
        setSelectedCard('');
      }
    } catch (error) {
      console.error('获取礼品卡列表失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [presetCardFromRoute, isShareableCard]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    if (!shareableCards.length) {
      setSelectedCard('');
      return;
    }
    if (!selectedCard || !shareableCards.some((card) => card.card_number === selectedCard)) {
      setSelectedCard(shareableCards[0].card_number);
    }
  }, [shareableCards, selectedCard]);

  const handleSelectCard = (card: GiftCard) => {
    setSelectedCard(card.card_number);
    setIsMessageCustomized(false);
    const modes = getAvailableModes(card);
    setDeliveryMode(modes[0] ?? 'digital_share');
    setShareResult(null);
    setMessage(deriveDefaultMessage(selectedStyle, card));
  };

  const handleSelectStyle = (style: GiftCardShareStyle) => {
    setSelectedStyleId(style.id);
    setIsMessageCustomized(false);
    setShareResult(null);
    setMessage(deriveDefaultMessage(style, selectedCardInfo));
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setIsMessageCustomized(true);
  };

  const handleResetMessage = () => {
    if (!selectedCardInfo) return;
    setMessage(deriveDefaultMessage(selectedStyle, selectedCardInfo));
    setIsMessageCustomized(false);
  };

  const handleShare = async () => {
    if (!selectedCard) {
      Taro.showToast({ title: '请选择礼品卡', icon: 'none' });
      return;
    }

    if (!selectedStyleId) {
      Taro.showToast({ title: '请选择分享模板', icon: 'none' });
      return;
    }

    const eligible = await ensureShareEligibility();
    if (!eligible) return;

    setSubmitting(true);
    try {
      const result = await giftCardService.share({
        card_number: selectedCard,
        delivery_mode: deliveryMode,
        channel: 'miniprogram',
        message: message.trim() || undefined,
        theme: selectedStyleId,
        format: 'both'
      });
      setShareResult(result);
      if (result?.share_token) {
        setShareTokenState(result.share_token);
        Taro.setStorageSync('GIFT_CARD_SHARE_CONTEXT', {
          card_number: result.card_number,
          share_token: result.share_token
        });
      }
      logShareDebug('share_success', {
        card_number: result?.card_number,
        share_token: result?.share_token,
        mini_program_path: result?.mini_program_path
      });
      setForceMatrix(false);
      Taro.showToast({ title: '分享已生成', icon: 'success' });
    } catch (error) {
      console.error('分享失败', error);
      const errMsg = (error as any)?.message || '分享失败';
      Taro.showToast({ title: errMsg, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text?: string | null, successMsg = '已复制') => {
    if (!text) {
      Taro.showToast({ title: '暂无可复制内容', icon: 'none' });
      return;
    }
    Taro.setClipboardData({
      data: text,
      success: () => Taro.showToast({ title: successMsg, icon: 'success' })
    });
  };

  const handleReset = () => {
    setShareResult(null);
    setQrMatrix([]);
    setShareTokenState('');
    Taro.removeStorageSync('GIFT_CARD_SHARE_CONTEXT');
  };

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
    return <View className='gift-card-share-page loading-state'>加载中...</View>;
  }

  if (cards.length === 0) {
    return (
      <View className='gift-card-share-page'>
        <View className='empty-state'>
          <Text className='empty-text'>暂无可分享的礼品卡</Text>
          <View className='empty-actions'>
            <Button className='back-btn' onClick={() => Taro.navigateTo({ url: '/pages/shopping-card/templates' })}>
              去购卡
            </Button>
            <Button className='back-btn secondary' onClick={() => Taro.navigateBack()}>
              返回
            </Button>
          </View>
        </View>
      </View>
    );
  }

  if (shareableCards.length === 0) {
    return (
      <View className='gift-card-share-page'>
        <View className='unavailable-tip'>
          <Text className='tip-title'>暂无可分享的购物卡</Text>
          <Text className='tip-desc'>已购卡需等待审核激活或解除锁定后才能分享，可前往“管理购物卡”查看状态。</Text>
          <Button
            className='tip-btn'
            onClick={() => Taro.navigateTo({ url: '/pages/shopping-card/manage' })}
          >
            去管理购物卡
          </Button>
        </View>
      </View>
    );
  }

  const modeTip = MODE_META[deliveryMode]?.tip;
  const historyList = shareResult?.share_history || selectedCardInfo?.share_history || [];
  const snapshot = shareResult?.card_snapshot || selectedCardInfo?.card_snapshot;

  return (
    <View className='gift-card-share-page'>
      <View className='section'>
        <Text className='section-title'>选择要分享的礼品卡</Text>
        <View className='card-list'>
          {shareableCards.map((card) => {
            const balanceValue = card.balance ?? '--';
            const templateName = card.template_name || '礼品卡';
            return (
              <View
                key={card.card_number}
                className={`card-item ${selectedCard === card.card_number ? 'selected' : ''}`}
                onClick={() => handleSelectCard(card)}
              >
                <View className='card-info'>
                  <Text className='card-name'>{templateName}</Text>
                  <Text className='card-number'>{card.card_number}</Text>
                </View>
                <View className='card-balance'>
                  <Text className='balance-label'>余额</Text>
                  <Text className='balance-value'>¥{balanceValue}</Text>
                </View>
                {selectedCard === card.card_number && <View className='check-icon'>✓</View>}
              </View>
            );
          })}
        </View>
      </View>

      {selectedCardInfo && (
        <View className='section snapshot-section'>
          <Text className='section-title'>卡片摘要</Text>
          <View className='snapshot-card'>
            <Text className='snapshot-name'>{snapshot?.template_name || selectedCardInfo.template_name || '礼品卡'}</Text>
            <Text className='snapshot-row'>卡号：{selectedCard}</Text>
            <Text className='snapshot-row'>余额：¥{snapshot?.balance ?? selectedCardInfo.balance ?? '--'}</Text>
            <Text className='snapshot-row'>
              有效期：
              {snapshot?.expires_at || selectedCardInfo.expires_at
                ? formatDateTime(snapshot?.expires_at || selectedCardInfo.expires_at)
                : '长期有效'}
            </Text>
            {selectedCardInfo.share_state && (
              <Text className='snapshot-row'>当前状态：{selectedCardInfo.share_state === 'shared' ? '已分享，等待领取' : '未分享'}</Text>
            )}
          </View>
        </View>
      )}

      <View className='section'>
        <Text className='section-title'>选择分享模板</Text>
        {stylesLoading ? (
          <View className='template-loading'>模板加载中...</View>
        ) : shareStyles.length ? (
          <View className='template-grid'>
            {shareStyles.map((style) => (
              <View
                key={style.id}
                className={`template-card ${selectedStyleId === style.id ? 'active' : ''}`}
                onClick={() => handleSelectStyle(style)}
              >
                <Image
                  className='template-preview'
                  mode='aspectFill'
                  src={style.preview_image || 'https://dummyimage.com/240x360/ebecef/7f859c&text=Template'}
                />
                <Text className='template-name'>{style.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className='template-empty'>暂无可选模板，将使用系统默认样式生成分享图。</View>
        )}
      </View>

      <View className='section'>
        <Text className='section-title'>祝福语 / 留言</Text>
        <View className='message-box'>
          <Textarea
            className='message-input'
            maxlength={80}
            placeholder='写一句祝福语，最多80字'
            value={message}
            onInput={(e) => handleMessageChange(e.detail.value)}
          />
          <Text className='message-count'>{message.length}/80</Text>
        </View>
        <View className='message-actions'>
          <Text className='reset-link' onClick={handleResetMessage}>
            恢复默认祝福语
          </Text>
        </View>
      </View>

      <View className='section'>
        <Text className='section-title'>选择分享方式</Text>
        <View className='mode-list'>
          {availableModes.map((mode) => {
            const meta = MODE_META[mode];
            return (
              <View
                key={mode}
                className={`mode-item ${deliveryMode === mode ? 'selected' : ''}`}
                onClick={() => setDeliveryMode(mode)}
              >
                <Text className='mode-icon'>{meta.icon}</Text>
                <Text className='mode-label'>{meta.label}</Text>
                {deliveryMode === mode && <View className='check-icon'>✓</View>}
              </View>
            );
          })}
        </View>
        <Text className='mode-tip'>
          {modeTip || '生成的二维码和 PDF 都会应用所选模板，好友扫码或打印扫码即可领取。'}
        </Text>
      </View>

      <View className='action-section'>
        <Button className='share-btn' loading={submitting} onClick={handleShare}>
          {submitting ? '生成中...' : '生成分享内容'}
        </Button>
      </View>

      {shareResult && (
        <View className='result-section'>
          <Text className='result-title'>二维码 / 分享信息</Text>
          {isDevelopEnv && (
            <View className='env-warning'>
              <Text className='env-warning-text'>
                当前为开发版二维码，仅开发者/体验成员可打开；非成员扫码会提示版本过期。请使用体验版/正式版或将对方加入体验成员。
              </Text>
            </View>
          )}
          {qrImageUrl ? (
            <View className='qr-wrapper'>
              <Image
                className='qr-image'
                mode='widthFix'
                src={qrImageUrl}
                showMenuByLongpress
                onError={() => {
                  setForceMatrix(true);
                  Taro.showToast({ title: '图片加载失败，已切换备用二维码', icon: 'none' });
                }}
              />
              <Button
                className='copy-btn'
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
                分享电子二维码
              </Button>
              {!canShare && (
                <Text className='result-tip'>分享码缺失，请点击“生成分享内容”重新生成。</Text>
              )}
            </View>
          ) : qrMatrix.length > 0 ? (
            <View className='qr-wrapper'>
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
              <Button
                className='copy-btn'
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
                分享电子二维码
              </Button>
              {!canShare && (
                <Text className='result-tip'>分享码缺失，请点击“生成分享内容”重新生成。</Text>
              )}
            </View>
          ) : (
            <View className='result-card'>
              <Text className='result-label'>二维码信息</Text>
              <View className='result-content'>
                <Text className='result-text'>该分享未生成二维码，可直接复制链接使用。</Text>
              </View>
            </View>
          )}

          {shareResult.mini_program_path && (
            <View className='result-card'>
              <Text className='result-label'>小程序路径</Text>
              <View className='result-content'>
                <Text className='result-text'>{shareResult.mini_program_path}</Text>
              </View>
              <Button className='copy-btn' onClick={() => handleCopy(shareResult.mini_program_path, '路径已复制')}>
                复制路径
              </Button>
            </View>
          )}

          {shareResult.share_token && (
            <View className='result-card'>
              <Text className='result-label'>备用领取码</Text>
              <View className='result-content passcode'>
                <Text className='result-text'>{shareResult.share_token}</Text>
              </View>
              <Button className='copy-btn' onClick={() => handleCopy(shareResult.share_token, '口令已复制')}>
                复制领取码
              </Button>
            </View>
          )}

          {shareResult.print_template_url && (
            <View className='result-card'>
              <Text className='result-label'>打印模板 URL</Text>
              <View className='result-content'>
                <Text className='result-text'>{shareResult.print_template_url}</Text>
              </View>
              <Button className='copy-btn' onClick={() => handleCopy(shareResult.print_template_url, '模板链接已复制')}>
                复制模板链接
              </Button>
            </View>
          )}

          {shareResult.expires_at && (
            <Text className='expire-tip'>有效期至：{formatDateTime(shareResult.expires_at)}</Text>
          )}

          <Button className='done-btn' onClick={handleReset}>
            重新调整
          </Button>
        </View>
      )}

      {historyList.length > 0 && (
        <View className='history-section'>
          <Text className='history-title'>最近分享记录</Text>
          {historyList.map((log) => {
            const historyKey = log.id || `${log.delivery_mode || 'mode'}-${log.created_at}`;
            return (
              <View className='history-item' key={historyKey}>
                <Text className='history-time'>{formatDateTime(log.created_at)}</Text>
                <Text className='history-meta'>
                  {formatDeliveryMode(log.delivery_mode)} · {log.channel || 'miniprogram'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default GiftCardShare;
