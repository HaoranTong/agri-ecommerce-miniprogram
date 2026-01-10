import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './empty-state.scss';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
  actionText?: string;
  actionUrl?: string;
  onAction?: () => void;
  showAction?: boolean;
  type?: 'default' | 'order' | 'product' | 'address' | 'cart';
}

const EmptyState = ({
  icon = '📦',
  title = '暂无数据',
  description = '这里空空如也',
  actionText,
  actionUrl,
  onAction,
  showAction = true,
  type = 'default'
}: EmptyStateProps) => {
  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionUrl) {
      Taro.navigateTo({ url: actionUrl });
    }
  };

  const getDefaultConfig = () => {
    switch (type) {
      case 'order':
        return {
          icon: '📋',
          title: '暂无订单',
          description: '还没有任何订单记录，快去选购心仪商品吧',
          actionText: '去购物'
        };
      case 'product':
        return {
          icon: '🛍️',
          title: '暂无商品',
          description: '商品正在上架中，敬请期待',
          actionText: ''
        };
      case 'address':
        return {
          icon: '📍',
          title: '暂无收货地址',
          description: '添加收货地址，方便快速下单',
          actionText: '添加地址'
        };
      case 'cart':
        return {
          icon: '🛒',
          title: '购物车为空',
          description: '快去挑选心仪的商品吧',
          actionText: '去逛逛'
        };
      default:
        return {
          icon,
          title,
          description,
          actionText
        };
    }
  };

  const config = getDefaultConfig();

  return (
    <View className={`empty-state empty-state--${type}`}>
      <View className='empty-icon'>{config.icon}</View>
      <Text className='empty-title'>{config.title}</Text>
      <Text className='empty-description'>{config.description}</Text>
      {showAction && config.actionText && (
        <Button 
          className='empty-action' 
          onClick={handleAction}
          size='mini'
        >
          {config.actionText}
        </Button>
      )}
    </View>
  );
};

export default EmptyState;