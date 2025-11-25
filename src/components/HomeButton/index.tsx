import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './HomeButton.scss';

interface HomeButtonProps {
  show?: boolean;
}

const HomeButton = ({ show = true }: HomeButtonProps) => {
  if (!show) return null;

  const handleGoHome = () => {
    Taro.switchTab({ url: '/pages/index/index' });
  };

  return (
    <View className="home-button" onClick={handleGoHome}>
      <View className="home-icon">🏠</View>
      <View className="home-text">首页</View>
    </View>
  );
};

export default HomeButton;
