import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import tooltipCopy from '../../assets/help-tooltips.json';
import './index.scss';

type TooltipItem = {
  page: string;
  location: string;
  trigger?: string;
  copy: string;
};

type HelpTooltipProps = {
  page: string;
  location: string;
  label?: string;
};

const findCopy = (page: string, location: string) => {
  const items = (tooltipCopy as { items?: TooltipItem[] })?.items ?? [];
  return items.find((item) => item.page === page && item.location === location);
};

const HelpTooltip = ({ page, location, label = '?' }: HelpTooltipProps) => {
  const item = findCopy(page, location);
  if (!item?.copy) return null;

  const handleClick = () => {
    Taro.showModal({
      title: '提示',
      content: item.copy,
      showCancel: false
    });
  };

  return (
    <View className='help-tooltip' onClick={handleClick}>
      <Text className='help-tooltip__icon'>{label}</Text>
    </View>
  );
};

export default HelpTooltip;
