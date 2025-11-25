import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { orderService } from '../../services/api';
import type { OrderDetail } from '../../types';
import './list.scss';

const OrderList = () => {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return (
      <View className="order-list-page">
        <View className="loading">订单加载中...</View>
      </View>
    );
  }

  if (!orders.length) {
    return (
      <View className="order-list-page">
        <View className="empty-state">
          <Text className="empty-icon">📦</Text>
          <Text className="empty-text">暂无订单记录</Text>
          <Button className="go-shopping" onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            去逛逛
          </Button>
        </View>
      </View>
    );
  }

  const getStatusText = (order: OrderDetail) => {
    const { status, has_payment_proof } = order;
    
    // 如果已上传支付凭证，显示特殊状态
    if (status === 'pending' && has_payment_proof) {
      return '审核中';
    }
    
    if (status === 'processing' && has_payment_proof) {
      return '待发货';
    }
    
    const statusMap: Record<string, string> = {
      'pending': '待支付',
      'processing': '处理中',
      'on-hold': '待确认',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunded': '已退款',
      'failed': '支付失败'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (order: OrderDetail) => {
    const { status, has_payment_proof } = order;
    
    // 如果已上传支付凭证，使用蓝色表示审核中
    if ((status === 'pending' || status === 'processing') && has_payment_proof) {
      return '#2196f3';
    }
    
    const colorMap: Record<string, string> = {
      'pending': '#ff9800',
      'processing': '#2196f3',
      'on-hold': '#ff9800',
      'completed': '#4caf50',
      'cancelled': '#9e9e9e',
      'refunded': '#f44336',
      'failed': '#f44336'
    };
    return colorMap[status] || '#666';
  };

  return (
    <View className="order-list-page">
      {orders.map((order) => (
        <View className="order-card" key={order.order_id} onClick={() => Taro.navigateTo({ url: `/pages/order/detail?orderId=${order.order_id}` })}>
          {/* 订单头部 */}
          <View className="order-header">
            <View className="order-info">
              <Text className="order-number">订单号: {order.order_number}</Text>
              <Text className="order-date">{order.created_at || new Date().toLocaleDateString()}</Text>
            </View>
            <View className="order-status" style={{ color: getStatusColor(order) }}>
              {getStatusText(order)}
              {order.has_payment_proof && (
                <Text className="proof-badge"> ✓</Text>
              )}
            </View>
          </View>

          {/* 订单商品 */}
          <View className="order-items">
            {order.items && order.items.slice(0, 3).map((item, index) => (
              <View className="order-item" key={index}>
                <View className="item-info">
                  <Text className="item-name">{item.product_name}</Text>
                  {item.variation_name && (
                    <Text className="item-spec">{item.variation_name}</Text>
                  )}
                </View>
                <View className="item-right">
                  <Text className="item-price">¥{item.price}</Text>
                  <Text className="item-quantity">x{item.quantity}</Text>
                </View>
              </View>
            ))}
            {order.items && order.items.length > 3 && (
              <Text className="more-items">还有 {order.items.length - 3} 件商品...</Text>
            )}
          </View>

          {/* 订单底部 */}
          <View className="order-footer">
            <View className="total-section">
              <Text className="total-label">订单总额:</Text>
              <Text className="total-value">¥{order.total}</Text>
            </View>
            <Button className="action-btn" size="mini">
              {order.status === 'pending' ? '去支付' : '查看详情'}
            </Button>
          </View>
        </View>
      ))}
    </View>
  );
};

export default OrderList;
