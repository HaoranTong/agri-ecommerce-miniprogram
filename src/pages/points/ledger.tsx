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
  const [activeStatus, setActiveStatus] = useState<string>('all');

  const loadLedger = async (
    currentPage: number,
    filter: string,
    status: string,
    append = false
  ) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: currentPage, per_page: 20 };
      if (filter !== 'all') {
        params.type = filter;
      }
      if (status !== 'all') {
        params.status = status;
      }
      const { items: newItems, total } = await pointsService.getLedger(params);

      setItems((prev) => {
        const merged = append ? [...prev, ...newItems] : newItems;
        setHasMore(merged.length < total);
        return merged;
      });
    } catch (error) {
      console.error('获取积分流水失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadLedger(1, activeFilter, activeStatus);
  }, [activeFilter, activeStatus]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadLedger(nextPage, activeFilter, activeStatus, true);
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

  const formatDescription = (item: PointsLedgerItem) => {
    if (item.description) return item.description;
    if (item.channel === 'order_complete' && item.reference_order_id) {
      return `订单 ${item.reference_order_id} 完成获得积分`;
    }
    if (item.channel === 'order_spend' && item.reference_order_id) {
      return `订单 ${item.reference_order_id} 抵扣积分`;
    }
    return item.channel || '积分调整';
  };

  const handleGoOrder = (orderId?: number | null) => {
    if (!orderId) return;
    Taro.navigateTo({ url: `/pages/order/detail?orderId=${orderId}` });
  };

  return (
    <View className="points-ledger-page">
      <View className="filter-bar">
        <View className="filter-row">
          {['all', 'earn', 'spend', 'expire', 'refund'].map((type) => (
            <View
              key={type}
              className={`filter-item ${activeFilter === type ? 'active' : ''}`}
              onClick={() => handleFilterChange(type)}
            >
              <Text>
                {type === 'all' ? '全部' : getTypeLabel(type)}
              </Text>
            </View>
          ))}
        </View>
        <View className="filter-row secondary">
          {['all', 'pending', 'confirmed'].map((status) => (
            <View
              key={status}
              className={`filter-item ${activeStatus === status ? 'active' : ''}`}
              onClick={() => handleStatusChange(status)}
            >
              <Text>
                {status === 'all' ? '全部状态' : status === 'pending' ? '待入账' : '已入账'}
              </Text>
            </View>
          ))}
        </View>
      </View>

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
                  <Text className="item-source">{formatDescription(item)}</Text>
                  <Text className="item-date">{formatDate(item.created_at)}</Text>
                  {item.reference_order_id && (
                    <Text
                      className="item-link"
                      onClick={() => handleGoOrder(item.reference_order_id)}
                    >
                      查看订单 →
                    </Text>
                  )}
                </View>
              </View>
              <View className="item-right">
                <Text className={`points-change ${item.delta > 0 ? 'positive' : 'negative'}`}>
                  {item.delta > 0 ? '+' : ''}{item.delta}
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
