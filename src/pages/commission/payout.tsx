import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { commissionService, pointsService } from '../../services/api';
import type { CommissionPayoutRecord, CommissionSummary, PointsBalance, PointsExchangeRules } from '../../types';
import { decimalCompare } from '../../utils/decimal';
import HelpTooltip from '../../components/HelpTooltip';
import './payout.scss';

const CommissionPayout = () => {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [payouts, setPayouts] = useState<CommissionPayoutRecord[]>([]);
  const [pointsBalance, setPointsBalance] = useState<PointsBalance | null>(null);
  const [exchangeRules, setExchangeRules] = useState<PointsExchangeRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exchangeSubmitting, setExchangeSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    account_name: '',
    account_no: '',
    bank_name: ''
  });
  const [exchangeForm, setExchangeForm] = useState({
    points: ''
  });

  const availableAmount = useMemo(() => {
    const raw = summary?.totals_by_status?.approved ?? '0';
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [summary]);

  const paidThisMonth = summary?.paid_this_month ?? '0.00';
  const pendingAmount = summary?.totals_by_status?.pending ?? '0.00';

  const loadData = async (showSkeleton = true) => {
    try {
      if (showSkeleton) {
        setLoading(true);
      }
      const [summaryData, payoutData, balanceData, exchangeData] = await Promise.all([
        commissionService.getSummary().catch(() => null),
        commissionService.listPayouts({ page: 1, per_page: 20 }).catch(() => ({ items: [] })),
        pointsService.getBalance().catch(() => null),
        pointsService.getExchangeRules().catch(() => null)
      ]);
      setSummary(summaryData);
      setPayouts(payoutData.items || []);
      setPointsBalance(balanceData);
      setExchangeRules(exchangeData);
    } catch (error) {
      console.error('获取提现数据失败', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      if (showSkeleton) {
        setLoading(false);
      }
      Taro.stopPullDownRefresh();
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  usePullDownRefresh(() => {
    loadData(false);
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const updateExchangeForm = (key: keyof typeof exchangeForm, value: string) => {
    setExchangeForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const formatAmount = (value: string | number) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(num)) {
      return '0.00';
    }
    return num.toFixed(2);
  };

  const getStatusText = (status: CommissionPayoutRecord['status']) => {
    const map: Record<CommissionPayoutRecord['status'], string> = {
      processing: '处理中',
      paid: '已打款',
      rejected: '已驳回',
      cancelled: '已取消'
    };
    return map[status] || status;
  };

  const handleSubmit = async () => {
    if (submitting) return;


    const amount = parseFloat(form.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    if (decimalCompare(amount, availableAmount) > 0) {
      Taro.showToast({ title: '可提现金额不足', icon: 'none' });
      return;
    }

    try {
      setSubmitting(true);
      await commissionService.requestPayout({
        amount,
        payout_method: 'manual',
        account_name: form.account_name || undefined,
        account_no: form.account_no || undefined,
        bank_name: form.bank_name || undefined
      });
      Taro.showToast({ title: '已提交申请', icon: 'success' });
      setForm({ amount: '', account_name: '', account_no: '', bank_name: '' });
      await loadData(false);
    } catch (error) {
      console.error('提交提现失败', error);
      Taro.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const exchangePreview = useMemo(() => {
    if (!exchangeRules) return null;
    const points = parseInt(exchangeForm.points, 10);
    if (!points || Number.isNaN(points) || points <= 0) return null;
    if (exchangeRules.exchange_rate <= 0) return null;
    const gross = points / exchangeRules.exchange_rate;
    const fee = exchangeRules.exchange_fee_rate > 0 ? gross * (exchangeRules.exchange_fee_rate / 100) : 0;
    const net = gross - fee;
    return {
      points,
      gross,
      fee,
      net
    };
  }, [exchangeForm.points, exchangeRules]);

  const handleExchangeSubmit = async () => {
    if (exchangeSubmitting) return;
    if (!exchangeRules?.enable_points_exchange) {
      Taro.showToast({ title: '积分兑换未开启', icon: 'none' });
      return;
    }

    const points = parseInt(exchangeForm.points, 10);
    if (!points || Number.isNaN(points) || points <= 0) {
      Taro.showToast({ title: '请输入有效积分', icon: 'none' });
      return;
    }
    if (exchangeRules.exchange_min_points > 0 && points < exchangeRules.exchange_min_points) {
      Taro.showToast({ title: '未达到最低兑换积分', icon: 'none' });
      return;
    }
    if (pointsBalance && points > pointsBalance.available) {
      Taro.showToast({ title: '积分不足', icon: 'none' });
      return;
    }
    const grossAmount = exchangePreview?.gross ?? 0;
    if (exchangeRules.exchange_min_amount > 0 && grossAmount < exchangeRules.exchange_min_amount) {
      Taro.showToast({ title: '未达到最低兑换金额', icon: 'none' });
      return;
    }
    if (exchangeRules.exchange_max_amount > 0 && grossAmount > exchangeRules.exchange_max_amount) {
      Taro.showToast({ title: '超过单次兑换上限', icon: 'none' });
      return;
    }

    try {
      setExchangeSubmitting(true);
      await pointsService.exchangePoints({
        points,
        payout_method: 'manual',
        account_name: form.account_name || undefined,
        account_no: form.account_no || undefined,
        bank_name: form.bank_name || undefined
      });
      Taro.showToast({ title: '兑换申请已提交', icon: 'success' });
      setExchangeForm({ points: '' });
      await loadData(false);
    } catch (error) {
      console.error('积分兑换失败', error);
      Taro.showToast({ title: '兑换失败', icon: 'none' });
    } finally {
      setExchangeSubmitting(false);
    }
  };

  if (loading) {
    return <View className='commission-payout-page loading-state'>加载中...</View>;
  }

  return (
    <View className='commission-payout-page'>
      <View className='summary-card'>
        <View className='summary-main'>
          <View className='info-row'>
            <Text className='summary-label'>可提现佣金</Text>
            <HelpTooltip page='commission/payout' location='available_amount' />
          </View>
          <Text className='summary-value'>¥{formatAmount(availableAmount)}</Text>
        </View>
        <View className='summary-meta'>
          <View className='meta-item'>
            <Text className='meta-label'>本月已结算</Text>
            <Text className='meta-value'>¥{formatAmount(paidThisMonth)}</Text>
          </View>
          <View className='meta-item'>
            <Text className='meta-label'>待审核</Text>
            <Text className='meta-value'>¥{formatAmount(pendingAmount)}</Text>
          </View>
        </View>
      </View>

      <View className='form-card'>
        <Text className='form-title'>提现申请</Text>
        <View className='form-row'>
          <Text className='form-label'>提现金额</Text>
          <Input
            className='form-input'
            type='digit'
            placeholder='请输入金额'
            value={form.amount}
            onInput={(e) => updateForm('amount', e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='form-label'>收款姓名</Text>
          <Input
            className='form-input'
            type='text'
            placeholder='可选'
            value={form.account_name}
            onInput={(e) => updateForm('account_name', e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='form-label'>收款账号</Text>
          <Input
            className='form-input'
            type='text'
            placeholder='银行卡/支付宝/微信号'
            value={form.account_no}
            onInput={(e) => updateForm('account_no', e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='form-label'>开户行</Text>
          <Input
            className='form-input'
            type='text'
            placeholder='可选'
            value={form.bank_name}
            onInput={(e) => updateForm('bank_name', e.detail.value)}
          />
        </View>
        <Button className='submit-btn' loading={submitting} onClick={handleSubmit}>
          申请提现
          <HelpTooltip page='commission/payout' location='submit_button' />
        </Button>
      </View>

      <View className='form-card'>
        <Text className='form-title'>积分兑换提现</Text>
        {!exchangeRules?.enable_points_exchange ? (
          <View className='empty-state'>积分兑换功能暂未开启</View>
        ) : (
          <>
            <View className='info-row'>
              <Text className='form-label'>可用积分</Text>
              <Text>{pointsBalance?.available ?? 0}</Text>
            </View>
            <View className='info-row'>
              <Text className='form-label'>兑换比例</Text>
              <Text>{exchangeRules.exchange_rate} 积分 = ¥1</Text>
            </View>
            <View className='info-row'>
              <Text className='form-label'>手续费</Text>
              <Text>{exchangeRules.exchange_fee_rate}%</Text>
            </View>
            <View className='form-row'>
              <Text className='form-label'>兑换积分</Text>
              <Input
                className='form-input'
                type='number'
                placeholder='请输入积分'
                value={exchangeForm.points}
                onInput={(e) => updateExchangeForm('points', e.detail.value)}
              />
            </View>
            {exchangePreview && (
              <View className='info-row'>
                <Text className='form-label'>预计到账</Text>
                <Text>
                  ¥{formatAmount(exchangePreview.net)}（含手续费 ¥{formatAmount(exchangePreview.fee)}）
                </Text>
              </View>
            )}
            <Button className='submit-btn' loading={exchangeSubmitting} onClick={handleExchangeSubmit}>
              兑换并提现
            </Button>
          </>
        )}
      </View>

      <View className='history-card'>
        <View className='info-row'>
          <Text className='history-title'>提现记录</Text>
          <HelpTooltip page='commission/payout' location='payout_history' />
        </View>
        {payouts.length === 0 ? (
          <View className='empty-state'>暂无提现记录</View>
        ) : (
          payouts.map((item) => (
            <View className='history-item' key={item.payout_id}>
              <View className='history-top'>
                <Text className='history-amount'>¥{formatAmount(item.amount)}</Text>
                <Text className={`history-status status-${item.status}`}>{getStatusText(item.status)}</Text>
              </View>
              <View className='history-bottom'>
                <Text className='history-meta'>申请时间：{item.requested_at || '-'}</Text>
                <Text className='history-meta'>批次：{item.settlement_batch || '-'}</Text>
              </View>
              {item.note && <Text className='history-note'>备注：{item.note}</Text>}
            </View>
          ))
        )}
      </View>
    </View>
  );
};

export default CommissionPayout;
