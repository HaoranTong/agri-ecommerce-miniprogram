import { View } from '@tarojs/components';
import './skeleton.scss';

interface SkeletonProps {
  type?: 'card' | 'list' | 'detail' | 'product' | 'order';
  count?: number;
  active?: boolean;
}

export const Skeleton = ({ type = 'card', count = 1, active = true }: SkeletonProps) => {
  const renderCardSkeleton = () => (
    <View className={`skeleton-card ${active ? 'active' : ''}`}>
      <View className='skeleton-image' />
      <View className='skeleton-content'>
        <View className='skeleton-text' />
        <View className='skeleton-text short' />
        <View className='skeleton-price' />
      </View>
    </View>
  );

  const renderListSkeleton = () => (
    <View className={`skeleton-list-item ${active ? 'active' : ''}`}>
      <View className='skeleton-avatar' />
      <View className='skeleton-content'>
        <View className='skeleton-text' />
        <View className='skeleton-text short' />
      </View>
    </View>
  );

  const renderDetailSkeleton = () => (
    <View className={`skeleton-detail ${active ? 'active' : ''}`}>
      <View className='skeleton-header'>
        <View className='skeleton-title' />
        <View className='skeleton-subtitle' />
      </View>
      <View className='skeleton-body'>
        <View className='skeleton-text' />
        <View className='skeleton-text' />
        <View className='skeleton-text short' />
      </View>
    </View>
  );

  const renderProductSkeleton = () => (
    <View className={`skeleton-product ${active ? 'active' : ''}`}>
      <View className='skeleton-product-image' />
      <View className='skeleton-product-info'>
        <View className='skeleton-text' />
        <View className='skeleton-text short' />
        <View className='skeleton-price-row'>
          <View className='skeleton-price' />
          <View className='skeleton-button' />
        </View>
      </View>
    </View>
  );

  const renderOrderSkeleton = () => (
    <View className={`skeleton-order ${active ? 'active' : ''}`}>
      <View className='skeleton-order-header'>
        <View className='skeleton-order-id' />
        <View className='skeleton-order-status' />
      </View>
      <View className='skeleton-order-items'>
        <View className='skeleton-item'>
          <View className='skeleton-item-image' />
          <View className='skeleton-item-info'>
            <View className='skeleton-text' />
            <View className='skeleton-text short' />
          </View>
        </View>
      </View>
      <View className='skeleton-order-footer'>
        <View className='skeleton-total' />
      </View>
    </View>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'list':
        return renderListSkeleton();
      case 'detail':
        return renderDetailSkeleton();
      case 'product':
        return renderProductSkeleton();
      case 'order':
        return renderOrderSkeleton();
      default:
        return renderCardSkeleton();
    }
  };

  return (
    <View className='skeleton-container'>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index}>{renderSkeleton()}</View>
      ))}
    </View>
  );
};

export default Skeleton;