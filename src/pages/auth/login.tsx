import { View, Button, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';

import { authService } from '../../services/api';
import { getToken } from '../../utils/storage';

const Login = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const { code } = await Taro.login();

      if (!code) {
        Taro.showToast({ title: '获取登录凭证失败', icon: 'none' });
        return;
      }

      await authService.login(code);
      Taro.switchTab({ url: '/pages/index/index' });
    } catch (error) {
      console.error('登录失败', error);
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const hasToken = !!getToken();

  return (
    <View className="login-container">
      <View className="logo">
        <Text className="title">常香米坊</Text>
        <Text className="subtitle">精选五常好米，直供到家</Text>
      </View>

      <Button className="btn-login" loading={loading} onClick={handleLogin} type="primary">
        <Text className="btn-text">微信快捷登录</Text>
      </Button>

      {hasToken && (
        <Button
          className="btn-skip"
          onClick={() => Taro.switchTab({ url: '/pages/index/index' })}
        >
          已登录，返回商城
        </Button>
      )}

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
