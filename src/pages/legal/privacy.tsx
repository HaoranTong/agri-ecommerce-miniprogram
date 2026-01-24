import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './privacy.scss';

const Privacy = () => {
  const handleOpenPrivacyContract = () => {
    if (typeof Taro.openPrivacyContract === 'function') {
      Taro.openPrivacyContract({
        fail: () => {
          Taro.showToast({ title: '暂时无法打开隐私指引', icon: 'none' });
        }
      });
    } else {
      Taro.showToast({ title: '当前版本不支持隐私指引', icon: 'none' });
    }
  };

  return (
    <ScrollView className='legal-page' scrollY>
      <View className='legal-card'>
        <Text className='legal-title'>隐私政策</Text>

        <Text className='legal-text'>微信平台提供《用户隐私保护指引》。请点击下方按钮查看完整内容。</Text>

        <Button className='legal-btn' type='primary' onClick={handleOpenPrivacyContract}>
          查看用户隐私保护指引
        </Button>

        <Text className='legal-section-title'>联系方式</Text>
        <Text className='legal-text'>电话：18504517642</Text>
        <Text className='legal-text'>邮箱：fanbaoer@163.com</Text>
      </View>
    </ScrollView>
  );
};

export default Privacy;
