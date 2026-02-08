import { Button, Input, Text, View } from '@tarojs/components';
import { useEffect, useMemo, useState } from 'react';

import type { GiftCardTemplate } from '../../types';
import { decimalCompare } from '../../utils/decimal';
import './stored-value-modal.scss';

interface StoredValueModalProps {
  visible: boolean;
  template: GiftCardTemplate | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}

const formatAmount = (value?: number | string | null) => {
  if (value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '';
  return num.toFixed(2);
};

const StoredValueModal = ({ visible, template, submitting = false, onClose, onSubmit }: StoredValueModalProps) => {
  const amountOptions = useMemo(() => {
    if (!template) return [];
    if (template.amount_options && template.amount_options.length > 0) {
      return template.amount_options.map((value) => Number(value));
    }
    if (template.fixed_amount) {
      return [parseFloat(template.fixed_amount)];
    }
    return [];
  }, [template]);

  const minAmount = template?.min_amount ?? (amountOptions.length ? amountOptions[0] : undefined);
  const maxAmount = template?.max_amount ?? undefined;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (template && visible) {
      const defaultAmount = amountOptions[0] ?? (template.fixed_amount ? parseFloat(template.fixed_amount) : null);
      setSelectedAmount(defaultAmount ?? null);
      setCustomAmount('');
      setError('');
    }
  }, [template, visible, amountOptions]);

  if (!visible || !template) {
    return null;
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getFinalAmount = (): number | null => {
    if (customAmount.trim()) {
      const parsed = parseFloat(customAmount);
      if (Number.isNaN(parsed)) {
        setError('请输入正确的金额');
        return null;
      }
      return parsed;
    }
    return selectedAmount;
  };

  const validateAmount = (amount: number | null) => {
    if (amount === null) {
      setError('请选择或输入购卡金额');
      return false;
    }
    if (minAmount && decimalCompare(amount, minAmount) < 0) {
      setError(`金额需不低于 ¥${formatAmount(minAmount)}`);
      return false;
    }
    if (maxAmount && decimalCompare(amount, maxAmount) > 0) {
      setError(`金额需不超过 ¥${formatAmount(maxAmount)}`);
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = () => {
    const amount = getFinalAmount();
    if (!validateAmount(amount)) {
      return;
    }
    onSubmit(amount!);
  };

  return (
    <View className='stored-value-modal__mask' catchMove>
      <View className='stored-value-modal__container'>
        <Text className='modal-title'>购买储值卡</Text>
        <Text className='modal-subtitle'>{template.name}</Text>

        {amountOptions.length > 0 && (
          <View className='preset-amounts'>
            {amountOptions.map((value) => (
              <View
                key={value}
                className={`amount-chip ${selectedAmount === value ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedAmount(value);
                  setCustomAmount('');
                }}
              >
                ¥{formatAmount(value)}
              </View>
            ))}
          </View>
        )}

        <View className='custom-amount-block'>
          <Text className='field-label'>自定义金额</Text>
          <View className='amount-input'>
            <Text className='currency'>¥</Text>
            <Input
              type='digit'
              value={customAmount}
              placeholder={minAmount ? `不少于 ¥${formatAmount(minAmount)}` : '请输入金额'}
              onInput={(event) => handleCustomAmountChange(event.detail.value)}
            />
          </View>
          {minAmount && (
            <Text className='helper-text'>最低 ¥{formatAmount(minAmount)}{maxAmount ? `，最高 ¥${formatAmount(maxAmount)}` : ''}</Text>
          )}
        </View>

        {error && <Text className='error-text'>{error}</Text>}

        <View className='modal-actions'>
          <Button className='secondary' onClick={onClose} disabled={submitting}>
            稍后再说
          </Button>
          <Button className='primary' loading={submitting} onClick={handleSubmit}>
            去支付
          </Button>
        </View>

        <Text className='tips'>
          支付完成并审核通过后，储值卡将发放至“我的礼品卡”，可前往查看卡号、PIN 并分享给好友。
        </Text>
      </View>
    </View>
  );
};

export default StoredValueModal;
