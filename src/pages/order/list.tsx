import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { orderService } from '../../services/api';
import type { OrderDetail } from '../../types';
import './detail.scss';

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
    return <View className="loading">订单加载中...</View>;
  }

  if (!orders.length) {
    return <View className="order-detail-page">暂无订单记录</View>;
  }

  return (
    <View className="order-detail-page">
      {orders.map((order) => (
        <View className="card" key={order.order_id}>
          <Text className="section-title">订单号：{order.order_number}</Text>
          <View className="info-row">
            <Text>状态</Text>
            <Text>{order.status}</Text>
          </View>
          <View className="info-row">
            <Text>金额</Text>
            <Text>¥{order.total}</Text>
          </View>
          <Button
            className="pay-btn"
            onClick={() => Taro.navigateTo({ url: `/pages/order/detail?id=${order.order_id}` })}
          >
            查看详情
          </Button>
        </View>
      ))}
    </View>
  );
};

export default OrderList;
