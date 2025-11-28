import { Input, Button, View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { userService } from '../../services/api';
import type { UserProfile } from '../../types';
import './edit-profile.scss';

const EditProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    first_name: '',
    phone: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await userService.getProfile();
      console.log('[EditProfile] 用户资料:', response);
      setProfile(response);
      setFormData({
        nickname: response.nickname || '',
        first_name: response.first_name || '',
        phone: response.phone || ''
      });
    } catch (error) {
      console.error('加载用户信息失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
  };

  const handleInput = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    // 验证
    if (!formData.nickname.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    if (!formData.first_name.trim()) {
      Taro.showToast({ title: '请输入真实姓名', icon: 'none' });
      return;
    }

    if (!formData.phone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      console.log('[EditProfile] 提交数据:', formData);
      const result = await userService.updateProfile(formData);
      console.log('[EditProfile] 保存结果:', result);
      
      // 更新本地状态
      setProfile(result);
      setFormData({
        nickname: result.nickname || '',
        first_name: result.first_name || '',
        phone: result.phone || ''
      });
      
      Taro.showToast({ title: '保存成功', icon: 'success' });
      // 延迟返回，确保profile页面能接收到最新数据
      setTimeout(() => {
        Taro.navigateBack();
      }, 1000);
    } catch (error) {
      console.error('[EditProfile] 保存失败:', error);
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className='edit-profile-page'>
      <View className='form-section'>
        <View className='form-item readonly'>
          <Text className='form-label'>用户名</Text>
          <Text className='form-value'>{profile?.username || '-'}</Text>
          <Text className='form-tip'>系统生成，不可修改</Text>
        </View>

        <View className='form-item'>
          <Text className='form-label'>昵称 <Text className='required'>*</Text></Text>
          <Input
            className='form-input'
            placeholder='请输入昵称'
            value={formData.nickname}
            onInput={(e) => handleInput('nickname', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>真实姓名 <Text className='required'>*</Text></Text>
          <Input
            className='form-input'
            placeholder='请输入真实姓名'
            value={formData.first_name}
            onInput={(e) => handleInput('first_name', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>手机号 <Text className='required'>*</Text></Text>
          <Input
            className='form-input'
            type='number'
            placeholder='请输入手机号'
            value={formData.phone}
            onInput={(e) => handleInput('phone', e.detail.value)}
            maxlength={11}
          />
        </View>

        {profile?.is_test_user && (
          <View className='test-user-badge'>
            🧪 测试账号: {profile.test_code}
          </View>
        )}
      </View>

      <View className='button-group'>
        <Button
          className='save-button'
          type='primary'
          loading={loading}
          onClick={handleSubmit}
        >
          保存
        </Button>
      </View>
    </View>
  );
};

export default EditProfile;
