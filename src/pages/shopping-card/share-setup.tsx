import { Button, Image, Text, Textarea, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { giftCardService } from '../../services/api';
import type { GiftCard, GiftCardShareStyle } from '../../types';
import './share-setup.scss';

const GiftCardShareSetup = () => {
  const router = useRouter();
  const cardNumber = (router?.params?.card as string) || '';
  const [card, setCard] = useState<GiftCard | null>(null);
  const [shareStyles, setShareStyles] = useState<GiftCardShareStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [stylesLoading, setStylesLoading] = useState(true);

  const selectedStyle = useMemo(() => {
    if (!shareStyles.length) return null;
    if (selectedStyleId) {
      return shareStyles.find((style) => style.id === selectedStyleId) ?? shareStyles[0];
    }
    return shareStyles[0];
  }, [shareStyles, selectedStyleId]);

  const deriveDefaultMessage = useCallback(
    (style?: GiftCardShareStyle | null) => {
      if (style?.config?.default_message) {
        return String(style.config.default_message);
      }
      return '送你一份精心准备的好礼，愿你喜欢。';
    },
    []
  );

  useEffect(() => {
    if (selectedStyle && !message) {
      setMessage(deriveDefaultMessage(selectedStyle));
    }
  }, [selectedStyle, deriveDefaultMessage, message]);

  const loadData = useCallback(async () => {
    if (!cardNumber) {
      Taro.showToast({ title: '购物卡号缺失', icon: 'none' });
      Taro.navigateBack();
      return;
    }

    setLoading(true);
    try {
      // 获取购物卡信息
      const cards = await giftCardService.listMine();
      const foundCard = cards.find((c) => c.card_number === cardNumber);
      if (!foundCard) {
        Taro.showToast({ title: '购物卡不存在', icon: 'none' });
        Taro.navigateBack();
        return;
      }
      setCard(foundCard);

      // 获取分享模板列表
      setStylesLoading(true);
      try {
        const styles = await giftCardService.listShareStyles();
        setShareStyles(styles);
        if (styles.length > 0) {
          setSelectedStyleId(styles[0].id);
        }
      } catch (error) {
        console.error('获取分享模板失败', error);
        Taro.showToast({ title: '模板加载失败', icon: 'none' });
      } finally {
        setStylesLoading(false);
      }
    } catch (error) {
      console.error('加载数据失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [cardNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectStyle = (style: GiftCardShareStyle) => {
    setSelectedStyleId(style.id);
    // 如果用户没有自定义留言，则使用新模板的默认留言
    if (!message || message === deriveDefaultMessage(selectedStyle)) {
      setMessage(deriveDefaultMessage(style));
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
  };

  const handleResetMessage = () => {
    if (selectedStyle) {
      setMessage(deriveDefaultMessage(selectedStyle));
    }
  };

  const handleConfirm = () => {
    if (!card || !selectedStyleId) {
      Taro.showToast({ title: '请选择分享模板', icon: 'none' });
      return;
    }

    // 跳转到分享结果页，传递参数
    Taro.navigateTo({
      url: `/pages/shopping-card/share-result?card=${card.card_number}&style=${selectedStyleId}&message=${encodeURIComponent(message.trim() || '')}`
    });
  };

  const handleBack = () => {
    Taro.navigateBack();
  };

  if (loading) {
    return (
      <View className='share-setup-page loading-state'>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View className='share-setup-page'>
        <View className='error-state'>
          <Text>购物卡不存在</Text>
          <Button className='back-btn' onClick={handleBack}>
            返回
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className='share-setup-page'>
      <View className='section'>
        <Text className='section-title'>选择分享模板</Text>
        {stylesLoading ? (
          <View className='template-loading'>模板加载中...</View>
        ) : shareStyles.length > 0 ? (
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
          <View className='template-empty'>暂无可选模板</View>
        )}
      </View>

      <View className='section'>
        <View className='section-header'>
          <Text className='section-title'>祝福语 / 留言</Text>
          <Text className='reset-link' onClick={handleResetMessage}>
            恢复默认
          </Text>
        </View>
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
      </View>

      <View className='action-buttons'>
        <Button className='btn btn-back' onClick={handleBack}>
          返回
        </Button>
        <Button className='btn btn-confirm' onClick={handleConfirm}>
          确认
        </Button>
      </View>
    </View>
  );
};

export default GiftCardShareSetup;

