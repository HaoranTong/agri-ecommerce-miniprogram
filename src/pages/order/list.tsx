import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { orderService } from '../../services/api';
import type { OrderDetail } from '../../types';
import Skeleton from '../../components/Skeleton';
import './list.scss';

const OrderList = () => {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const filterGiftCardOnly = params.filter === 'giftcard' || params.scene === 'giftcard';
  const [filterMode, setFilterMode] = useState<'all' | 'giftcard'>(
    filterGiftCardOnly ? 'giftcard' : 'all'
  );

  const loadOrders = async () => {
    try {
      const data = await orderService.listOrders();
      setOrders(data);
    } catch (error) {
      console.error('获取订单列表失败', error);
      Taro.showToast({ title: '获取订单失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const displayOrders = useMemo(() => {
    if (filterMode === 'giftcard') {
      return orders.filter((order) => order.is_gift_card_order);
    }
    return orders;
  }, [orders, filterMode]);

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return (
      <View className='order-list-page'>
        <View className='skeleton-section'>
          <Skeleton type='order' count={3} />
        </View>
      </View>
    );
  }

  const renderFilterTabs = () => (
    <View className='filter-tabs'>
      {['all', 'giftcard'].map((mode) => (
        <View
          key={mode}
          className={`filter-tab ${filterMode === mode ? 'active' : ''}`}
          onClick={() => setFilterMode(mode as 'all' | 'giftcard')}
        >
          {mode === 'all' ? '全部' : '购物卡'}
        </View>
      ))}
    </View>
  );

  if (!displayOrders.length) {
    return (
      <View className='order-list-page'>
        {renderFilterTabs()}
        {filterMode === 'giftcard' && (
          <View className='filter-tip'>仅展示与购物卡相关的订单</View>
        )}
        <View className='empty-state'>
          <Text className='empty-icon'>📦</Text>
          <Text className='empty-text'>
            {filterMode === 'giftcard' ? '暂无购物卡相关订单' : '暂无订单记录'}
          </Text>
          <Button className='go-shopping' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            去逛逛
          </Button>
        </View>
      </View>
    );
  }

  const getStatusText = (order: OrderDetail) => {
    const { status, return_status } = order;

    if (return_status === 'requested') {
      return '申请退货';
    }
    if (return_status === 'approved') {
      return '退货已同意';
    }
    if (return_status === 'rejected') {
      return '退货已拒绝';
    }
    if (return_status === 'refunded') {
      return '已退款';
    }
    
    if (order.is_gift_card_order) {
      const giftCardStatusMap: Record<string, string> = {
        'pending': '待支付',
        'processing': '支付成功/待发卡',
        'on-hold': '待发卡',
        'completed': '已发卡',
        'cancelled': '已取消',
        'refunded': '已退款',
        'failed': '支付失败'
      };
      return giftCardStatusMap[status] || status;
    }

    const statusMap: Record<string, string> = {
      'pending': '待支付',
      'processing': '支付成功/待发货',
      'on-hold': '已发货',
      'completed': '已签收',
      'cancelled': '已取消',
      'refunded': '已退款',
      'failed': '支付失败'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (order: OrderDetail) => {
    const { status, return_status } = order;

    if (return_status === 'requested') {
      return '#ff5722';
    }
    if (return_status === 'approved') {
      return '#ff9800';
    }
    if (return_status === 'rejected') {
      return '#9e9e9e';
    }
    if (return_status === 'refunded') {
      return '#4caf50';
    }
    
    const colorMap: Record<string, string> = {
      'pending': '#ff9800',
      'processing': '#2196f3',
      'on-hold': '#4caf50',
      'completed': '#4caf50',
      'cancelled': '#9e9e9e',
      'refunded': '#f44336',
      'failed': '#f44336'
    };
    return colorMap[status] || '#666';
  };

  return (
    <View className='order-list-page'>
      {renderFilterTabs()}
      {filterMode === 'giftcard' && (
        <View className='filter-tip'>仅展示与购物卡相关的订单</View>
      )}
      {displayOrders.map((order) => (
        <View className='order-card' key={order.order_id} onClick={() => Taro.navigateTo({ url: `/pages/order/detail?orderId=${order.order_id}` })}>
          {/* 订单头部 */}
          <View className='order-header'>
            <View className='order-info'>
              <Text className='order-number'>订单号: {order.order_number}</Text>
              <Text className='order-date'>{order.created_at || new Date().toLocaleDateString()}</Text>
            </View>
            <View className='order-status' style={{ color: getStatusColor(order) }}>
              {getStatusText(order)}
            </View>
          </View>
          {order.is_gift_card_order && (
            <View className='order-tags'>
              <Text className='giftcard-tag'>购物卡</Text>
            </View>
          )}

          {/* 订单商品 */}
          <View className='order-items'>
            {order.items && order.items.slice(0, 3).map((item, index) => (
              <View className='order-item' key={index}>
                <View className='item-info'>
                  <Text className='item-name'>{item.name || item.product_name}</Text>
                  {item.variation_name && (
                    <Text className='item-spec'>{item.variation_name}</Text>
                  )}
                </View>
                <View className='item-right'>
                  <Text className='item-price'>¥{item.price}</Text>
                  <Text className='item-quantity'>x{item.quantity}</Text>
                </View>
              </View>
            ))}
            {order.items && order.items.length > 3 && (
              <Text className='more-items'>还有 {order.items.length - 3} 件商品...</Text>
            )}
          </View>

          {/* 订单底部 */}
          <View className='order-footer'>
            <View className='total-section'>
              <Text className='total-label'>订单总额:</Text>
              <Text className='total-value'>¥{order.total}</Text>
            </View>
            <Button className='action-btn' size='mini'>
              {order.status === 'pending' ? '去支付' : '查看详情'}
            </Button>
          </View>
        </View>
      ))}
    </View>
  );
};

export default OrderList;
