import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { pointsService } from '../../services/api';
import type { PointsMission } from '../../types';
import './missions.scss';

const PointsMissions = () => {
  const [missions, setMissions] = useState<PointsMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadMissions = async () => {
    try {
      setLoading(true);
      const data = await pointsService.getMissions();
      setMissions(data);
    } catch (error) {
      console.error('获取积分任务失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const handleClaim = async (missionId: string) => {
    try {
      setClaimingId(missionId);
      const result = await pointsService.claimMission(missionId);
      Taro.showToast({
        title: `+${result.awarded_points} 积分`,
        icon: 'success'
      });
      await loadMissions();
    } catch (error) {
      console.error('领取任务奖励失败', error);
      Taro.showToast({ title: '领取失败', icon: 'none' });
    } finally {
      setClaimingId(null);
    }
  };

  const canClaim = (mission: PointsMission) =>
    mission.status === 'available' && mission.progress >= mission.goal;

  const renderStatusTag = (mission: PointsMission) => {
    if (mission.status === 'completed') {
      return <Text className='status completed'>已完成</Text>;
    }
    if (mission.status === 'claimed') {
      return <Text className='status claimed'>已领取</Text>;
    }
    if (mission.status === 'locked') {
      return <Text className='status locked'>未解锁</Text>;
    }
    if (canClaim(mission)) {
      return <Text className='status claimable'>可领取</Text>;
    }
    return <Text className='status ongoing'>进行中</Text>;
  };

  return (
    <View className='points-missions-page'>
      {loading && missions.length === 0 ? (
        <View className='page-state'>加载中...</View>
      ) : missions.length === 0 ? (
        <View className='page-state'>暂无可参与的积分任务</View>
      ) : (
        missions.map((mission) => {
          const progressPercent = Math.min(
            100,
            Math.round(decimalMult(decimalDiv(mission.progress, mission.goal), 100))
          );
          return (
            <View className='mission-card' key={mission.mission_id}>
              <View className='mission-header'>
                <View>
                  <Text className='mission-title'>{mission.title}</Text>
                  <Text className='mission-desc'>{mission.description}</Text>
                </View>
                {renderStatusTag(mission)}
              </View>

              <View className='mission-meta'>
                <Text className='meta-item'>奖励：+{mission.reward_points} 积分</Text>
                {mission.expires_at && (
                  <Text className='meta-item'>有效期至 {mission.expires_at}</Text>
                )}
              </View>

              <View className='progress-bar'>
                <View className='progress-track'>
                  <View
                    className='progress-fill'
                    style={{ width: `${progressPercent}%` }}
                  />
                </View>
                <Text className='progress-text'>
                  {mission.progress}/{mission.goal}
                </Text>
              </View>

              <View className='mission-actions'>
                <Button
                  className='action-btn'
                  loading={claimingId === mission.mission_id}
                  disabled={!canClaim(mission) || claimingId === mission.mission_id}
                  onClick={() => handleClaim(mission.mission_id)}
                >
                  {canClaim(mission) ? '领取奖励' : '待完成'}
                </Button>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

export default PointsMissions;
