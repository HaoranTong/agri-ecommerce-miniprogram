import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import { agentApplicationService } from '../../services/api';
import type { AgentApplication } from '../../types';
import HelpTooltip from '../../components/HelpTooltip';
import './apply.scss';

const AgentApply = () => {
  const zoneOptions = ['东北大区', '华北大区', '华东大区', '华中大区', '华南大区', '西南大区', '西北大区'];
  const levelOptions = [
    { label: '大区代理', value: 1 },
    { label: '省级代理', value: 2 },
    { label: '城市代理', value: 3 }
  ] as const;

  const [region, setRegion] = useState<string[]>([]);
  const [formData, setFormData] = useState<AgentApplication>({
    region_zone: zoneOptions[0],
    level: 1,
    parent_agent_code: '',
    team_target: {}
  });

  const handleZoneChange = (e: any) => {
    const index = Number(e.detail.value);
    setFormData({ ...formData, region_zone: zoneOptions[index] });
  };

  const handleLevelChange = (e: any) => {
    const index = Number(e.detail.value);
    const level = levelOptions[index]?.value ?? 1;
    setFormData((prev) => ({
      ...prev,
      level,
      region_province: level === 1 ? undefined : prev.region_province,
      region_city: level === 3 ? prev.region_city : undefined
    }));
  };

  const handleRegionChange = (e: any) => {
    const value = e.detail.value || [];
    const province = value[0];
    const city = value[1];
    setRegion(value);
    setFormData((prev) => ({
      ...prev,
      region_province: province,
      region_city: prev.level === 3 ? city : undefined
    }));
  };

  const handleInputChange = (field: keyof AgentApplication, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.region_zone) {
      Taro.showToast({ title: '请选择所属大区', icon: 'none' });
      return;
    }

    if (formData.level >= 2 && !formData.region_province) {
      Taro.showToast({ title: '请选择省份', icon: 'none' });
      return;
    }
    if (formData.level === 3 && !formData.region_city) {
      Taro.showToast({ title: '请选择城市', icon: 'none' });
      return;
    }

    try {
      // 调用后端 /agents/apply 接口
      const payload: AgentApplication = {
        ...formData,
        team_target:
          formData.team_target && formData.team_target.monthly_gmv && formData.team_target.monthly_gmv > 0
            ? formData.team_target
            : undefined
      };

      await agentApplicationService.apply(payload);
      
      Taro.showToast({
        title: '申请成功！',
        icon: 'success'
      });
      
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
      
    } catch (error: any) {
      console.error('代理申请失败', error);
      const message = error?.message || '申请失败，请稍后重试';
      Taro.showToast({ title: message, icon: 'none' });
    }
  };

  const selectedLevelLabel = levelOptions.find((item) => item.value === formData.level)?.label || '大区代理';
  const displayRegion =
    formData.level === 1
      ? '无需选择省市'
      : formData.region_province
        ? formData.level === 2
          ? formData.region_province
          : `${formData.region_province} ${formData.region_city || ''}`.trim()
        : '请选择省市';

  return (
    <View className='agent-apply-page'>
      <View className='form-card'>
        <Text className='form-title'>代理商申请</Text>

        <View className='form-item'>
          <Text className='form-label'>所属大区 *</Text>
          <Picker mode='selector' range={zoneOptions} onChange={handleZoneChange}>
            <View className='picker'>{formData.region_zone}</View>
          </Picker>
        </View>

        <View className='form-item'>
          <Text className='form-label'>代理层级 *</Text>
          <Picker
            mode='selector'
            range={levelOptions.map((item) => item.label)}
            onChange={handleLevelChange}
          >
            <View className='picker'>
              {selectedLevelLabel}
            </View>
          </Picker>
        </View>

        <View className='form-item'>
          <Text className='form-label'>代理区域 *</Text>
          {formData.level === 1 ? (
            <View className='picker'>{displayRegion}</View>
          ) : (
            <Picker mode='region' value={region} onChange={handleRegionChange}>
              <View className='picker'>{displayRegion}</View>
            </Picker>
          )}
          <Text className='form-tip'>大区代理无需选择省市；省级/城市代理请选择对应区域</Text>
        </View>

        <View className='form-item'>
          <Text className='form-label'>上级代理编码（可选）</Text>
          <Input
            className='form-input'
            placeholder='如果有推荐人，请填写其代理编码'
            value={formData.parent_agent_code || ''}
            onInput={(e) => handleInputChange('parent_agent_code', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>团队月度目标（可选）</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='如：100000'
            value={formData.team_target?.monthly_gmv?.toString() || ''}
            onInput={(e) =>
              setFormData({
                ...formData,
                team_target: {
                  monthly_gmv: Number(e.detail.value || 0)
                }
              })
            }
          />
        </View>

        <Button className='submit-btn' onClick={handleSubmit}>
          提交申请
          <HelpTooltip page='agent/apply' location='apply_button' />
        </Button>
      </View>

      <View className='tips-card'>
        <Text className='tips-title'>📋 申请说明</Text>
        <View className='tips-list'>
          <Text className='tips-item'>• 代理需后台审核确认后生效</Text>
          <Text className='tips-item'>• 同一区域仅允许一个有效代理</Text>
          <Text className='tips-item'>• 省级/城市代理会自动关联上级</Text>
          <Text className='tips-item'>• 申请成功后可在代理中心查看状态</Text>
        </View>
      </View>
    </View>
  );
};

export default AgentApply;
