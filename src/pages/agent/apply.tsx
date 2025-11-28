import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import './apply.scss';

const AgentApply = () => {
  const [formData, setFormData] = useState({
    region_type: 'city',
    region_code: '',
    parent_agent_code: '',
    company_name: '',
    contact_name: '',
    contact_phone: ''
  });

  const regionTypes = ['province', 'city', 'district'];
  const regionTypeLabels = ['省级代理', '市级代理', '区县代理'];

  const handleRegionTypeChange = (e: any) => {
    const index = e.detail.value;
    setFormData({ ...formData, region_type: regionTypes[index] });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    // 验证必填项
    if (!formData.region_code) {
      Taro.showToast({ title: '请输入区域编码', icon: 'none' });
      return;
    }
    if (!formData.contact_name || !formData.contact_phone) {
      Taro.showToast({ title: '请填写联系信息', icon: 'none' });
      return;
    }

    try {
      Taro.showLoading({ title: '提交中...' });
      
      // 调用后端 /agents/apply 接口
      const res = await Taro.request({
        url: 'https://agri-ecommerce.test/wp-json/myshop/v1/agents/apply',
        method: 'POST',
        header: {
          'Authorization': `Bearer ${Taro.getStorageSync('MYSHOP_AUTH_TOKEN')}`,
          'Content-Type': 'application/json'
        },
        data: formData
      });

      Taro.hideLoading();

      if (res.statusCode === 200) {
        Taro.showToast({ title: '申请成功！', icon: 'success' });
        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      } else {
        const message = res.data?.message || '申请失败';
        Taro.showToast({ title: message, icon: 'none' });
      }
    } catch (error: any) {
      Taro.hideLoading();
      console.error('代理申请失败', error);
      Taro.showToast({ title: '申请失败，请稍后重试', icon: 'none' });
    }
  };

  return (
    <View className='agent-apply-page'>
      <View className='form-card'>
        <Text className='form-title'>代理商申请</Text>

        <View className='form-item'>
          <Text className='form-label'>代理类型 *</Text>
          <Picker
            mode='selector'
            range={regionTypeLabels}
            onChange={handleRegionTypeChange}
          >
            <View className='picker'>
              {regionTypeLabels[regionTypes.indexOf(formData.region_type)]}
            </View>
          </Picker>
        </View>

        <View className='form-item'>
          <Text className='form-label'>区域编码 *</Text>
          <Input
            className='form-input'
            placeholder='如：440300（深圳市）'
            value={formData.region_code}
            onInput={(e) => handleInputChange('region_code', e.detail.value)}
          />
          <Text className='form-tip'>请输入6位行政区划代码</Text>
        </View>

        <View className='form-item'>
          <Text className='form-label'>上级代理编码（可选）</Text>
          <Input
            className='form-input'
            placeholder='如果有推荐人，请填写其代理编码'
            value={formData.parent_agent_code}
            onInput={(e) => handleInputChange('parent_agent_code', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>公司名称（可选）</Text>
          <Input
            className='form-input'
            placeholder='请输入公司全称'
            value={formData.company_name}
            onInput={(e) => handleInputChange('company_name', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>联系人 *</Text>
          <Input
            className='form-input'
            placeholder='请输入联系人姓名'
            value={formData.contact_name}
            onInput={(e) => handleInputChange('contact_name', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>联系电话 *</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='请输入联系电话'
            value={formData.contact_phone}
            onInput={(e) => handleInputChange('contact_phone', e.detail.value)}
          />
        </View>

        <Button className='submit-btn' onClick={handleSubmit}>
          提交申请
        </Button>
      </View>

      <View className='tips-card'>
        <Text className='tips-title'>📋 申请说明</Text>
        <View className='tips-list'>
          <Text className='tips-item'>• 每个区域同一时间只能有一个代理商</Text>
          <Text className='tips-item'>• 区域编码请参考国家行政区划代码</Text>
          <Text className='tips-item'>• 申请成功后将自动分配代理编码</Text>
          <Text className='tips-item'>• 如有上级代理，系统会自动建立层级关系</Text>
        </View>
      </View>
    </View>
  );
};

export default AgentApply;
