import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { referralService, invitationService, pointsService, promoService } from '../../services/api';
import type { PointsLedgerItem, PromoPoster, ReferralMember, ReferralSummary } from '../../types';
import HelpTooltip from '../../components/HelpTooltip';
import './index.scss';

const ReferralIndex = () => {
  const router = useRouter();
  const [members, setMembers] = useState<ReferralMember[]>([]);
  const [rewardLedger, setRewardLedger] = useState<PointsLedgerItem[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharePanel, setSharePanel] = useState<'qr' | 'poster' | null>(null);
  const [posterData, setPosterData] = useState<PromoPoster | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState('');

  const sharePath = useMemo(() => {
    if (!referralCode) return '';
    return `pages/auth/login?referrer_code=${encodeURIComponent(referralCode)}`;
  }, [referralCode]);

  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [codeData, summaryData] = await Promise.all([
          referralService.getCode().catch(() => null),
          referralService.getSummary().catch(() => null)
        ]);

        if (codeData?.referral_code) {
          setReferralCode(codeData.referral_code);
        }
        setSummary(summaryData);
      } catch (error) {
        console.error('加载分销数据失败', error);
        Taro.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    referralService.listMembers().then(setMembers).catch(() => setMembers([]));
    pointsService
      .getLedger({ page: 1, per_page: 20, type: 'earn', channel_prefix: 'referral_reward' })
      .then((data) => setRewardLedger(data.items || []))
      .catch(() => setRewardLedger([]));
    referralService.getQr().then((data) => {
      if (data?.qr_url) setQrUrl(data.qr_url);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!referralCode) return;
    const loadPoster = async () => {
      try {
        const data = await promoService.getPoster({ type: 'invite', referrer_code: referralCode });
        setPosterData(data);
      } catch (error) {
        try {
          const data = await promoService.getPoster({ referrer_code: referralCode });
          setPosterData(data);
        } catch (err) {
          setPosterData(null);
        }
      }
    };
    loadPoster();
  }, [referralCode]);

  useEffect(() => {
    const openShare = router?.params?.openShare;
    if (openShare && referralCode) {
      setSharePanel('qr');
    }
  }, [router?.params?.openShare, referralCode]);

  useEffect(() => {
    if (sharePanel === 'qr') {
      setShareImageUrl(qrUrl || posterData?.mini_program_qr || '');
    } else if (sharePanel === 'poster') {
      setShareImageUrl(posterData?.personal_poster_url || posterData?.poster_url || '');
    } else {
      setShareImageUrl('');
    }
  }, [posterData?.mini_program_qr, posterData?.personal_poster_url, posterData?.poster_url, qrUrl, sharePanel]);

  // 渠道归因追踪
  useEffect(() => {
    const trackChannelVisit = async () => {
      try {
        const options = Taro.getLaunchOptionsSync();
        const query = options.query || {};
        
        // 检查是否有渠道参数
        if (query.channel || query.scene || query.referrer_code) {
          await invitationService.track({
            channel: query.channel,
            scene: query.scene,
            referrer_code: query.referrer_code
          });
        }
      } catch (error) {
        console.warn('渠道追踪失败', error);
      }
    };

    trackChannelVisit();
  }, []);

  const buildSharePath = (basePath: string) => {
    if (!referralCode) return basePath;
    if (basePath.includes('?')) {
      return `${basePath}&referrer_code=${encodeURIComponent(referralCode)}`;
    }
    return `${basePath}?referrer_code=${encodeURIComponent(referralCode)}`;
  };

  Taro.useShareAppMessage(() => {
    if (!referralCode) {
      return {
        title: '邀请你体验精选农产品',
        path: 'pages/index/index'
      };
    }

    const posterPath = posterData?.mini_program_path || 'pages/index/index';
    const effectivePath = sharePanel === 'poster' ? buildSharePath(posterPath) : sharePath;

    return {
      title: '邀请你体验精选农产品',
      path: effectivePath,
      ...(shareImageUrl ? { imageUrl: shareImageUrl } : {})
    };
  });

  const handleCopyLink = async () => {
    if (!sharePath) return;
    await Taro.setClipboardData({ data: sharePath });
    Taro.showToast({ title: '邀请链接已复制', icon: 'success' });
  };

  const ensureQrLoaded = async () => {
    if (qrUrl) return;
    try {
      const data = await referralService.getQr();
      if (data?.qr_url) {
        setQrUrl(data.qr_url);
      } else {
        Taro.showToast({ title: '二维码生成中，请稍后再试', icon: 'none' });
      }
    } catch (error) {
      Taro.showToast({ title: '二维码生成失败，请稍后再试', icon: 'none' });
    }
  };

  const handlePreviewPoster = async (url?: string | null) => {
    if (!url) return;
    try {
      await Taro.previewImage({ urls: [url] });
    } catch (error) {
      console.warn('预览失败', error);
    }
  };

  const saveImage = async (url: string, filename: string) => {
    if (!url || saving) return;
    try {
      setSaving(true);
      if (url.startsWith('data:image')) {
        const base64 = url.split(',')[1] || '';
        const buffer = Taro.base64ToArrayBuffer(base64);
        const fs = Taro.getFileSystemManager();
        const filePath = `${Taro.env.USER_DATA_PATH}/${filename}-${Date.now()}.png`;
        await new Promise<void>((resolve, reject) => {
          fs.writeFile({
            filePath,
            data: buffer,
            encoding: 'binary',
            success: () => resolve(),
            fail: (err) => reject(err)
          });
        });
        await Taro.saveImageToPhotosAlbum({ filePath });
        Taro.showToast({ title: `${filename}已保存`, icon: 'success' });
      } else {
        const download = await Taro.downloadFile({ url });
        if (download.statusCode === 200) {
          await Taro.saveImageToPhotosAlbum({ filePath: download.tempFilePath });
          Taro.showToast({ title: `${filename}已保存`, icon: 'success' });
        } else {
          Taro.showToast({ title: '保存失败', icon: 'none' });
        }
      }
    } catch (error) {
      console.error('保存图片失败', error);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className='referral-page loading-state'>
        <Text className='loading-text'>加载中...</Text>
      </View>
    );
  }

  return (
    <View className='referral-page'>
      <View className='hero'>
        <Text className='hero-title'>邀请好友赢积分</Text>
        <Text className='hero-subtitle'>分享专属链接或二维码，好友注册并下单后奖励积分</Text>
      </View>

      {referralCode && (
        <View className='code-card'>
          <View className='info-row'>
            <Text className='section-title'>邀请分享</Text>
            <HelpTooltip page='referral/index' location='invite_code' />
          </View>
          <Text className='invite-tip'>通过二维码或海报分享，好友登录即绑定推荐关系</Text>
          <View className='action-row'>
            <Button
              className='action-btn'
              onClick={async () => {
                await ensureQrLoaded();
                setSharePanel('qr');
              }}
            >
              推广二维码
            </Button>
            <Button
              className='action-btn ghost'
              onClick={async () => {
                if (!posterData && referralCode) {
                  try {
                    const data = await promoService.getPoster({ type: 'invite', referrer_code: referralCode });
                    setPosterData(data);
                  } catch (error) {
                    try {
                      const data = await promoService.getPoster({ referrer_code: referralCode });
                      setPosterData(data);
                    } catch {
                      setPosterData(null);
                    }
                  }
                }
                setSharePanel('poster');
              }}
            >
              邀请海报
            </Button>
          </View>
        </View>
      )}

      {/* 邀请统计 */}
      {summary && (
        <View className='stats-card'>
          <View className='info-row'>
            <Text className='section-title'>邀请统计</Text>
            <HelpTooltip page='referral/index' location='invite_stats' />
          </View>
          <View className='stats-grid'>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.total_invitees}</Text>
              <Text className='stat-label'>总邀请人数</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.completed_first_orders}</Text>
              <Text className='stat-label'>首单完成</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.level_one_count}</Text>
              <Text className='stat-label'>一级人数</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.level_two_count}</Text>
              <Text className='stat-label'>二级人数</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-number'>{summary.reward_points_total ?? 0}</Text>
              <Text className='stat-label'>累计奖励积分</Text>
            </View>
          </View>
        </View>
      )}

      {/* 我的邀请 */}
      <View className='list-card'>
        <Text className='section-title'>我的邀请</Text>
        {members.length === 0 && <View className='empty'>暂无下级用户</View>}
        {members.map((item) => (
          <View className='member-row' key={item.user_id}>
            <View className='member-info'>
              <Text className='member-name'>{item.nickname || '匿名用户'}</Text>
              <Text className='member-meta'>
                {item.level}级 · 注册时间 {item.joined_at}
              </Text>
            </View>
            <Text className='member-tag'>{item.first_order_status || 'pending'}</Text>
          </View>
        ))}
      </View>

      {/* 奖励积分明细 */}
      <View className='list-card'>
        <Text className='section-title'>奖励积分明细</Text>
        {rewardLedger.length === 0 && <View className='empty'>暂无奖励记录</View>}
        {rewardLedger.map((item) => (
          <View className='reward-row' key={item.id}>
            <View className='reward-info'>
              <Text className='reward-title'>订单 {item.reference_order_id ?? '-'}</Text>
              <Text className='reward-meta'>{item.created_at}</Text>
            </View>
            <Text className='reward-amount'>+{item.delta}</Text>
          </View>
        ))}
      </View>

      {/* 渠道分析接口仅运营可用，前端不展示 */}

      {sharePanel && (
        <View className='share-overlay' onClick={() => setSharePanel(null)}>
          <View className='share-panel' onClick={(e) => e.stopPropagation()}>
            <View className='panel-header'>
              <Text className='panel-title'>{sharePanel === 'qr' ? '推广二维码' : '邀请海报'}</Text>
              <Text className='panel-close' onClick={() => setSharePanel(null)}>
                ✕
              </Text>
            </View>
            {sharePanel === 'qr' && (
              <View className='panel-body'>
                {qrUrl || posterData?.mini_program_qr ? (
                  <Image
                    className='qr-image'
                    src={qrUrl || posterData?.mini_program_qr || ''}
                    mode='aspectFit'
                  />
                ) : (
                  <View className='empty'>二维码生成中，请稍后重试</View>
                )}
                <View className='link-block'>
                  <Text className='link-label'>邀请链接</Text>
                  <Text className='link-text'>{sharePath}</Text>
                  <Button className='link-copy' onClick={handleCopyLink}>
                    复制链接
                  </Button>
                </View>
                <Text className='panel-tip'>好友扫码即可打开小程序并绑定推荐关系</Text>
                <View className='panel-actions'>
                  <Button
                    className='panel-btn'
                    loading={saving}
                    onClick={() => saveImage(qrUrl || posterData?.mini_program_qr || '', '二维码')}
                  >
                    保存二维码
                  </Button>
                  <Button className='panel-btn ghost' openType='share'>
                    分享
                  </Button>
                </View>
              </View>
            )}
            {sharePanel === 'poster' && (
              <View className='panel-body'>
                {posterData?.personal_poster_url || posterData?.poster_url ? (
                  <Image
                    className='poster-image'
                    src={posterData?.personal_poster_url || posterData?.poster_url || ''}
                    mode='widthFix'
                    onClick={() => handlePreviewPoster(posterData?.personal_poster_url || posterData?.poster_url)}
                  />
                ) : (
                  <View className='empty'>暂无可用海报，请稍后重试</View>
                )}
                <Text className='panel-tip'>分享海报给好友，扫码即可进入</Text>
                {(posterData?.personal_poster_url || posterData?.poster_url) && (
                  <View className='panel-actions'>
                    <Button
                      className='panel-btn'
                      loading={saving}
                      onClick={() => saveImage(posterData?.personal_poster_url || posterData?.poster_url || '', '海报')}
                    >
                      保存海报
                    </Button>
                    <Button className='panel-btn ghost' openType='share'>
                      分享
                    </Button>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default ReferralIndex;
