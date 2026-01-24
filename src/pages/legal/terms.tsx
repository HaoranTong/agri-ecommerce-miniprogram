import { View, Text, ScrollView } from '@tarojs/components';
import './terms.scss';

const Terms = () => {
  return (
    <ScrollView className='legal-page' scrollY>
      <View className='legal-card'>
        <Text className='legal-title'>用户协议</Text>

        <Text className='legal-section-title'>一、协议主体</Text>
        <Text className='legal-text'>本小程序由五常市饭包儿米业有限公司提供服务。</Text>

        <Text className='legal-section-title'>二、服务说明</Text>
        <Text className='legal-text'>我们为用户提供商品浏览、下单、支付、物流查询等服务。</Text>

        <Text className='legal-section-title'>三、用户义务</Text>
        <Text className='legal-text'>用户应如实提供必要信息，遵守法律法规，不进行任何违法或损害平台的行为。</Text>

        <Text className='legal-section-title'>四、隐私与个人信息</Text>
        <Text className='legal-text'>个人信息的处理规则以《用户隐私保护指引》及本页面的说明为准。</Text>

        <Text className='legal-section-title'>五、联系方式</Text>
        <Text className='legal-text'>电话：18504517642</Text>
        <Text className='legal-text'>邮箱：fanbaoer@163.com</Text>
      </View>
    </ScrollView>
  );
};

export default Terms;
