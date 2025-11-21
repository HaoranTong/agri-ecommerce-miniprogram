import { Image, Text, View } from '@tarojs/components';

import type { Product, ProductVariation } from '../../types';
import styles from './index.module.scss';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  onChooseVariant?: (product: Product, variation: ProductVariation) => void;
}

const ProductCard = ({ product, onSelect, onChooseVariant }: ProductCardProps) => {
  const handleClick = () => {
    onSelect?.(product);
  };

  const firstVariation = product.variations[0];

  return (
    <View className={styles.card} onClick={handleClick} hoverClass={styles.cardHover}>
      <Image
        className={styles.cover}
        src={firstVariation?.image_url || product.image_url}
        mode="aspectFill"
      />
      <View className={styles.info}>
        <Text className={styles.title}>{product.name}</Text>
        {product.description && (
          <Text className={styles.description}>{product.description}</Text>
        )}
        {firstVariation && (
          <View className={styles.priceRow}>
            <Text className={styles.price}>¥{firstVariation.price}</Text>
            <Text className={styles.badge}>{firstVariation.stock_status === 'instock' ? '现货' : '缺货'}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default ProductCard;
