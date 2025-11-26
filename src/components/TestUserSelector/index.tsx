import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.scss';

/**
 * 测试用户选择组件
 * 仅在开发环境显示，用于快速切换测试账号
 */
const TestUserSelector = () => {
  const [visible, setVisible] = useState(false);
  
  // 测试用户列表（与后端保持一致）
  const testUsers = [
    { code: 'test001', name: '测试用户001', desc: '主测试账号' },
    { code: 'test002', name: '测试用户002', desc: '副测试账号' },
    { code: 'test003', name: '测试用户003', desc: '代理商测试' },
    { code: 'admin', name: '管理员测试账号', desc: '权限测试' }
  ];
  
  const handleSelectUser = (code: string) => {
    // 保存选择的测试用户
    Taro.setStorageSync('DEV_TEST_USER_CODE', code);
    Taro.showToast({
      title: `已切换到: ${code}`,
      icon: 'success'
    });
    setVisible(false);
    
    // 重新登录
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/auth/login' });
    }, 1000);
  };
  
  const handleClearSelection = () => {
    Taro.removeStorageSync('DEV_TEST_USER_CODE');
    Taro.showToast({
      title: '已清除，将使用真实登录',
      icon: 'success'
    });
    setVisible(false);
  };
  
  return (
    <View className="test-user-selector">
      {/* 触发按钮 */}
      <View 
        className="toggle-btn" 
        onClick={() => setVisible(!visible)}
      >
        🧪
      </View>
      
      {/* 选择面板 */}
      {visible && (
        <View className="selector-panel">
          <View className="panel-header">
            <Text className="panel-title">选择测试账号</Text>
            <View className="close-btn" onClick={() => setVisible(false)}>✕</View>
          </View>
          
          <View className="user-list">
            {testUsers.map(user => (
              <View 
                key={user.code}
                className="user-item"
                onClick={() => handleSelectUser(user.code)}
              >
                <View className="user-info">
                  <Text className="user-name">{user.name}</Text>
                  <Text className="user-code">code: {user.code}</Text>
                </View>
                <Text className="user-desc">{user.desc}</Text>
              </View>
            ))}
          </View>
          
          <View className="panel-footer">
            <Button className="clear-btn" onClick={handleClearSelection}>
              清除选择（使用真实登录）
            </Button>
          </View>
        </View>
      )}
    </View>
  );
};

export default TestUserSelector;
