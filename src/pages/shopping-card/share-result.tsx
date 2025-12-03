import { Button, Image, Text, View, Canvas } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import QRCode from 'qrcode-generator';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
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
  const cardNumber = (router?.params?.card as string) || '';
  const styleId = (router?.params?.style as string) || '';
  const message = decodeURIComponent((router?.params?.message as string) || '');
  const [shareResult, setShareResult] = useState<GiftCardShareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadShareResult = useCallback(async () => {
    if (!cardNumber || !styleId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' });
      Taro.navigateBack();
      return;
    }

    setLoading(true);
    try {
      // 调用分享API生成分享内容
      const result = await giftCardService.share({
        card_number: cardNumber,
        delivery_mode: 'digital_share',
        channel: 'miniprogram',
        message: message.trim() || undefined,
        theme: styleId,
        format: 'both'
      });
      
      console.log('分享API返回结果:', result);
      console.log('二维码图片URL:', result?.qr_image_url);
      console.log('二维码Payload:', result?.qr_payload);
      
      if (result) {
        setShareResult(result);
        // 在小程序环境中，不需要手动预加载图片，Image组件会自动处理
        // 如果需要预加载，可以使用 Taro.downloadFile
        if (result.qr_image_url || result.mini_program_qr) {
          const imgUrl = result.qr_image_url || result.mini_program_qr;
          console.log('图片URL:', imgUrl);
          // 可选：使用 Taro.downloadFile 预加载（但不阻塞UI）
          // Taro.downloadFile({ url: imgUrl }).catch(() => {});
        }
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
  }, [cardNumber, styleId, message]);

  useEffect(() => {
    loadShareResult();
  }, [loadShareResult]);

  // 计算二维码矩阵（必须在所有条件返回之前）
  const qrImageUrl = shareResult?.qr_image_url || shareResult?.mini_program_qr || '';
  const qrPayload = shareResult?.qr_payload || '';
  
  // 调试信息
  useEffect(() => {
    if (qrImageUrl) {
      console.log('二维码图片URL:', qrImageUrl);
    }
  }, [qrImageUrl]);
  const qrMatrix = useMemo(() => {
    if (qrImageUrl) return null; // 如果有图片URL，就不需要前端生成
    return buildQrMatrix(qrPayload);
  }, [qrImageUrl, qrPayload]);

  const handleSaveToAlbum = async () => {
    if (!shareResult) return;

    setSaving(true);
    try {
      // 获取二维码图片URL或payload
      const imageUrl = shareResult.qr_image_url || shareResult.mini_program_qr || '';
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
        } catch (error) {
          console.error('下载图片失败', error);
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
      console.error('保存失败', error);
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

  const handleShare = async () => {
    if (!shareResult) return;

    setSharing(true);
    try {
      // 获取二维码图片URL或payload
      const imageUrl = shareResult.qr_image_url || shareResult.mini_program_qr || '';
      const payload = shareResult.qr_payload || '';
      
      if (!imageUrl && !payload) {
        Taro.showToast({ title: '图片生成失败', icon: 'none' });
        return;
      }

      // 如果有图片URL，下载后预览
      if (imageUrl) {
        try {
          const downloadResult = await Taro.downloadFile({
            url: imageUrl
          });

          if (downloadResult.statusCode === 200) {
            // 使用预览图片功能，用户可以长按保存或分享
            await Taro.previewImage({
              urls: [downloadResult.tempFilePath],
              current: downloadResult.tempFilePath
            });
            Taro.showToast({ title: '长按图片可保存或分享', icon: 'none', duration: 2000 });
          } else {
            Taro.showToast({ title: '下载失败', icon: 'none' });
          }
        } catch (error) {
          console.error('下载图片失败', error);
          Taro.showToast({ title: '图片加载失败，请使用保存功能', icon: 'none' });
        }
      } else {
        // 如果没有图片URL，提示用户使用保存功能
        Taro.showToast({ title: '请使用保存功能保存二维码', icon: 'none' });
      }
    } catch (error) {
      console.error('分享失败', error);
      // 如果预览失败，提供保存选项
      Taro.showModal({
        title: '分享失败',
        content: '是否保存图片到相册后手动分享？',
        success: (res) => {
          if (res.confirm) {
            handleSaveToAlbum();
          }
        }
      });
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View className='share-result-page loading-state'>
        <Text>生成中...</Text>
      </View>
    );
  }

  if (!shareResult) {
    return (
      <View className='share-result-page'>
        <View className='error-state'>
          <Text>生成失败</Text>
          <Button className='back-btn' onClick={() => Taro.navigateBack()}>
            返回
          </Button>
        </View>
      </View>
    );
  }

  const cardSnapshot = shareResult.card_snapshot;

  return (
    <View className='share-result-page'>
      <View className='result-preview'>
        <Text className='preview-title'>分享卡片预览</Text>
        
        {qrImageUrl ? (
          <View className='preview-image-wrapper'>
            <Image
              className='preview-image'
              mode='widthFix'
              src={qrImageUrl}
              lazyLoad={false}
              showMenuByLongpress
              onLoad={() => {
                console.log('图片加载成功:', qrImageUrl);
              }}
              onError={(e) => {
                console.error('图片加载失败:', qrImageUrl, e);
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
          onClick={handleShare}
        >
          {sharing ? '分享中...' : '分享电子二维码'}
        </Button>
        <Button
          className='btn btn-save'
          loading={saving}
          onClick={handleSaveToAlbum}
        >
          {saving ? '保存中...' : '保存购物卡'}
        </Button>
      </View>

      <View className='tips'>
        <Text className='tip-text'>• 分享电子二维码：可直接分享给好友，好友长按识别即可领取</Text>
        <Text className='tip-text'>• 保存购物卡：保存到相册后可打印或通过其他方式分享</Text>
      </View>
    </View>
  );
};

export default GiftCardShareResult;

