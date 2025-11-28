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

  const handleTagClick = (e: any, variation: ProductVariation) => {
    e.stopPropagation(); // 阻止事件冒泡到父级
    onChooseVariant?.(product, variation);
  };

  const firstVariation = Array.isArray(product.variations) ? product.variations[0] : undefined;

  // 显示所有变体标签（不限制数量）
  const quickTags = product.variations || [];

  // 格式化价格区间
  const priceDisplay = product.min_price && product.max_price
    ? product.min_price === product.max_price
      ? `¥${product.min_price}`
      : `¥${product.min_price} - ¥${product.max_price}`
    : firstVariation?.price
    ? `¥${firstVariation.price}`
    : '';

  const coverSrc = firstVariation?.image_url || product.image_url || '';

  return (
    <View className={styles.card} onClick={handleClick} hoverClass={styles.cardHover}>
      <Image
        className={styles.cover}
        src={coverSrc}
        mode="aspectFill"
      />
      <View className={styles.info}>
        <Text className={styles.title}>{product.name}</Text>
        {product.description && (
          <Text className={styles.description}>
            {product.description.length > 50 
              ? `${product.description.slice(0, 50)}...` 
              : product.description}
          </Text>
        )}
        <View className={styles.priceRow}>
          <Text className={styles.price}>{priceDisplay}</Text>
        </View>
        {quickTags.length > 0 && (
          <View className={styles.tagContainer}>
            {quickTags.map((variation) => {
              // 提取中文属性名（key 就是中文名，如"普通袋装"、"10千克"）
              const specLabel = Object.keys(variation.attributes).join(' ');
              return (
                <View
                  key={variation.variation_id}
                  className={styles.tag}
                  onClick={(e) => handleTagClick(e, variation)}
                  hoverClass={styles.tagHover}
                >
                  <Text className={styles.tagText}>{specLabel}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

export default ProductCard;
