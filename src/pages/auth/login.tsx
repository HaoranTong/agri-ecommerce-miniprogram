import { View, Button, Text } from '@tarojs/components';
import { useState } from 'react'; // ✅ 关键修正
import Taro from '@tarojs/taro';

const Login = () => {
  const [loading, setLoading] = useState(false);

  const onGetUserInfo = async (e: any) => {
    if (!e.detail.userInfo) {
      Taro.showToast({ title: '请授权获取头像和昵称', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      
      // 获取微信登录 code
      const loginRes = await Taro.login();
      const code = loginRes.code;

      // 模拟调用后端 API
      const res = await Taro.request({
        url: 'https://your-api.com/api/login',
        method: 'POST',
        data: {
          code,
          encryptedData: e.detail.encryptedData,
          iv: e.detail.iv,
          rawData: e.detail.rawData,
          signature: e.detail.signature,
        },
      });

      const token = res.data.token;
      Taro.setStorageSync('token', token);
      Taro.switchTab({ url: '/pages/home/index' });

    } catch (error) {
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="login-container">
      <View className="logo">
        <Text className="title">常香米坊</Text>
      </View>

      <Button
        className="btn-login"
        openType="getUserInfo"
        onGetUserInfo={onGetUserInfo}
        loading={loading}
      >
        <Text className="btn-text">微信登录</Text>
      </Button>

      <View className="footer">
        <Text className="text">登录即表示同意</Text>
        <Text className="link">《用户协议》</Text>
        <Text className="text">和</Text>
        <Text className="link">《隐私政策》</Text>
      </View>
    </View>
  );
};

export default Login;