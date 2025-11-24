import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { pointsService } from '../../services/api';
import type { PointsLedgerItem } from '../../types';
import './ledger.scss';

const PointsLedger = () => {
  const [items, setItems] = useState<PointsLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const loadLedger = async (currentPage: number, filter: string, append = false) => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, per_page: 20 };
      if (filter !== 'all') {
        params.type = filter;
      }
      const { items: newItems, total } = await pointsService.getLedger(params);
      
      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      
      setHasMore(items.length + newItems.length < total);
    } catch (error) {
      console.error('获取积分流水失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger(1, activeFilter);
  }, [activeFilter]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadLedger(nextPage, activeFilter, true);
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      earn: '获得',
      spend: '消费',
      expire: '过期',
      refund: '退款'
    };
    return map[type] || type;
  };

  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      earn: 'green',
      spend: 'red',
      expire: 'gray',
      refund: 'orange'
    };
    return map[type] || 'default';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  };

  return (
    <View className="points-ledger-page">
      {/* 筛选器 */}
      <View className="filter-bar">
        <View
          className={`filter-item ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          <Text>全部</Text>
        </View>
        <View
          className={`filter-item ${activeFilter === 'earn' ? 'active' : ''}`}
          onClick={() => handleFilterChange('earn')}
        >
          <Text>获得</Text>
        </View>
        <View
          className={`filter-item ${activeFilter === 'spend' ? 'active' : ''}`}
          onClick={() => handleFilterChange('spend')}
        >
          <Text>消费</Text>
        </View>
        <View
          className={`filter-item ${activeFilter === 'expire' ? 'active' : ''}`}
          onClick={() => handleFilterChange('expire')}
        >
          <Text>过期</Text>
        </View>
      </View>

      {/* 流水列表 */}
      {loading && items.length === 0 ? (
        <View className="loading-state">加载中...</View>
      ) : items.length === 0 ? (
        <View className="empty-state">暂无积分记录</View>
      ) : (
        <View className="ledger-list">
          {items.map((item) => (
            <View key={item.id} className="ledger-item">
              <View className="item-left">
                <Text className={`type-badge ${getTypeColor(item.type)}`}>
                  {getTypeLabel(item.type)}
                </Text>
                <View className="item-info">
                  <Text className="item-source">{item.source}</Text>
                  <Text className="item-date">{formatDate(item.created_at)}</Text>
                </View>
              </View>
              <View className="item-right">
                <Text className={`points-change ${item.points > 0 ? 'positive' : 'negative'}`}>
                  {item.points > 0 ? '+' : ''}{item.points}
                </Text>
                <Text className="balance-after">余额 {item.balance_after}</Text>
              </View>
            </View>
          ))}

          {hasMore && (
            <View className="load-more" onClick={handleLoadMore}>
              <Text>{loading ? '加载中...' : '加载更多'}</Text>
            </View>
          )}

          {!hasMore && items.length > 0 && (
            <View className="no-more">
              <Text>没有更多了</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default PointsLedger;
