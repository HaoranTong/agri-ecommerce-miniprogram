import { Input, Button, View, Text, Image } from '@tarojs/components';
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

  const canChooseAvatar = typeof Taro.canIUse === 'function'
    ? Taro.canIUse('button.open-type.chooseAvatar')
    : false;

  const logUserProfile = (stage: string, payload?: any) => {
    try {
      console.info(`[EditProfile][getUserProfile] ${stage}`, payload || '');
    } catch (error) {
      // ignore
    }
  };

  const notifyUserProfileFail = async (error: any) => {
    const errMsg = String(error?.errMsg || '');
    logUserProfile('fail', { errMsg, error });

    if (/deny|拒绝|authorize|auth/i.test(errMsg)) {
      await Taro.showModal({
        title: '无法获取昵称/头像',
        content: '微信侧未授权或已拒绝。请到微信「设置 > 隐私 > 授权管理」中找到本小程序重新授权后再试。',
        showCancel: false
      });
      return;
    }

    Taro.showToast({ title: '获取微信信息失败', icon: 'none' });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await userService.getProfile();
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

    // 验证（资料允许为空，但手机号需格式正确）
    if (formData.phone.trim() && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    try {
      setLoading(true);
      const result = await userService.updateProfile(formData);
      
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

  const handleFetchWechatProfile = async () => {
    if (loading) return;

    if (!canChooseAvatar && typeof Taro.getUserProfile !== 'function') {
      logUserProfile('not_supported');
      Taro.showToast({ title: '当前环境不支持获取微信信息', icon: 'none' });
      return;
    }

    try {
      logUserProfile('request');
      const res = await Taro.getUserProfile({
        desc: '用于同步个人中心展示'
      });
      logUserProfile('success', res);
      const userInfo = res?.userInfo || null;
      if (!userInfo?.nickName && !userInfo?.avatarUrl) {
        Taro.showToast({ title: '未获取到微信信息', icon: 'none' });
        return;
      }

      setLoading(true);
      const result = await userService.updateProfile({
        nickname: userInfo.nickName,
        avatar: userInfo.avatarUrl,
        gender: userInfo.gender
      });

      setProfile(result);
      setFormData((prev) => ({
        ...prev,
        nickname: result.nickname || userInfo.nickName || prev.nickname
      }));
      Taro.showToast({ title: '微信信息已更新', icon: 'success' });
    } catch (error) {
      await notifyUserProfileFail(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseAvatar = async (e: any) => {
    if (loading) return;
    const url = e?.detail?.avatarUrl || '';
    if (!url) return;

    try {
      setLoading(true);
      const result = await userService.uploadAvatar(url);

      setProfile(result);
      Taro.showToast({ title: '头像已更新', icon: 'success' });
    } catch (error) {
      Taro.showToast({ title: '头像更新失败', icon: 'none' });
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
          <Text className='form-label'>昵称</Text>
          <Input
            className='form-input'
            placeholder='请输入昵称'
            value={formData.nickname}
            onInput={(e) => handleInput('nickname', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>真实姓名</Text>
          <Input
            className='form-input'
            placeholder='请输入真实姓名'
            value={formData.first_name}
            onInput={(e) => handleInput('first_name', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>手机号</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='请输入手机号'
            value={formData.phone}
            onInput={(e) => handleInput('phone', e.detail.value)}
            maxlength={11}
          />
        </View>

        <View className='form-item wechat-auth'>
          <Text className='form-label'>微信头像昵称</Text>
            <View className='wechat-actions'>
              <View className='wechat-avatar'>
                <Image
                  className='wechat-avatar-img'
                  src={profile?.avatar || 'https://mmbiz.qpic.cn/mmbiz_png/Okj5cBvW2mV6aG9rZ0m1t3KzR5B9dJtv6LzVVqQwXn8mVib1mlwC2R2R2GQn9s7A0XfKq9c8nqQKJqX9uGxS6jQ/0?wx_fmt=png'}
                  mode='aspectFill'
                />
                {canChooseAvatar ? (
                  <Button className='wechat-btn' openType='chooseAvatar' onChooseAvatar={handleChooseAvatar} loading={loading}>
                    更换头像
                  </Button>
                ) : (
                  <Button className='wechat-btn' onClick={handleFetchWechatProfile} loading={loading}>
                    获取头像
                  </Button>
                )}
              </View>
            </View>
          <Text className='form-tip'>如未获取到昵称/头像，可点击此按钮重新授权</Text>
        </View>

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
