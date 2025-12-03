import { Button, Input, Picker, Switch, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cartService, orderService, pointsService, userService } from '../../services/api';
import type {
  GiftCardOrderPayload,
  GiftCardPurchaseFlow,
  PointsBalance,
  ShippingAddress,
  UserProfile
} from '../../types';
import { getSavedAddresses, getStoredUserInfo, upsertAddress, type StoredAddress } from '../../utils/storage';
import './create.scss';

const DEFAULT_ADDRESS: ShippingAddress = {
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail_address: '',
  postcode: ''
};

interface CheckoutItem {
  variation_id: number;
  product_name: string;
  variation_name: string;
  price: string;
  quantity: number;
  image_url?: string;
}

const OrderCreate = () => {
  const params = useMemo(() => Taro.getCurrentInstance().router?.params ?? {}, []);
  const fromCart = params.from === 'cart';
  const pendingGiftcardPref = useMemo(() => {
    const stored = Taro.getStorageSync('PENDING_GIFTCARD_ORDER');
    return stored || null;
  }, []);
  const giftcardTemplateId = useMemo(() => {
    if (!pendingGiftcardPref || !pendingGiftcardPref.templateId) return undefined;
    return Number(pendingGiftcardPref.templateId);
  }, [pendingGiftcardPref]);
  const storedUserInfo = useMemo(() => getStoredUserInfo(), []);
  const selectDefaultAddress = (list: StoredAddress[]) =>
    list.find((addr) => addr.isDefault) || list[0];
  const [savedAddresses, setSavedAddresses] = useState<StoredAddress[]>(() => getSavedAddresses());
  const [defaultAddressLoaded, setDefaultAddressLoaded] = useState(false); // 标记是否已加载默认地址
  const defaultAddressSnapshot = selectDefaultAddress(savedAddresses);
  
  // 从购物车来的订单
  const checkoutItems = useMemo<CheckoutItem[]>(() => {
    return fromCart ? Taro.getStorageSync('checkout_items') || [] : [];
  }, [fromCart]);
  
  // 从商品详情直接购买
  const variationId = Number(params.variation_id || params.variationId || 0);
  const productName = params.product_name || params.productName || '精选商品';
  const variationPrice = useMemo(() => {
    const price = params.price || params.variation_price;
    return price ? parseFloat(String(price)) : 0;
  }, [params.price, params.variation_price]);
  const [quantity, setQuantity] = useState(Number(params.quantity) || 1);
  // 自动填充第一个保存的地址
  const [region, setRegion] = useState<string[]>(() =>
    defaultAddressSnapshot
      ? [
          defaultAddressSnapshot.province,
          defaultAddressSnapshot.city,
          defaultAddressSnapshot.district
        ]
      : []
  );
  const [address, setAddress] = useState<ShippingAddress>(() =>
    defaultAddressSnapshot
      ? {
          name: defaultAddressSnapshot.name,
          phone: defaultAddressSnapshot.phone,
          province: defaultAddressSnapshot.province,
          city: defaultAddressSnapshot.city,
          district: defaultAddressSnapshot.district,
          detail_address: defaultAddressSnapshot.detail_address,
          postcode: defaultAddressSnapshot.postcode || ''
        }
      : DEFAULT_ADDRESS
  );
  const [addressTouched, setAddressTouched] = useState(false);
  const applyAddress = (addr: StoredAddress) => {
    setAddress({
      name: addr.name,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail_address: addr.detail_address,
      postcode: addr.postcode || ''
    });
    setRegion([addr.province, addr.city, addr.district]);
    shippingConfirmRef.current = false;
  };
  const [submitting, setSubmitting] = useState(false);
  const [isGiftCardOrder, setIsGiftCardOrder] = useState<boolean>(Boolean(pendingGiftcardPref));
  const [giftcardNotice, setGiftcardNotice] = useState<string>(
    pendingGiftcardPref?.templateName
      ? `您正在购买「${pendingGiftcardPref.templateName}」，付款成功会直接生成购物卡，无需填写收货地址。`
      : ''
  );
  const [giftcardMode, setGiftcardMode] = useState<GiftCardPurchaseFlow | undefined>(
    pendingGiftcardPref?.flow
  );
  const giftcardConfirmRef = useRef(false);
  const shippingConfirmRef = useRef(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // 积分抵扣相关状态
  const [pointsBalance, setPointsBalance] = useState<PointsBalance | null>(null);
  const [pointsSettings, setPointsSettings] = useState<{
    enable_points_discount: boolean;
    redeem_rate: number;
    min_points_to_use: number;
    max_discount_percent: number;
    min_order_amount_to_use: number;
  } | null>(null);
  const [pointsToUse, setPointsToUse] = useState<number>(0);
  const [pointsInput, setPointsInput] = useState<string>('');
  
  const giftcardPayload = useMemo<GiftCardOrderPayload | undefined>(() => {
    if (!isGiftCardOrder) {
      return undefined;
    }
    const payload: GiftCardOrderPayload = {
      source: pendingGiftcardPref ? 'template' : 'manual',
      snapshot_version: '2025-11-29'
    };
    if (pendingGiftcardPref?.templateName) {
      payload.template_name = pendingGiftcardPref.templateName;
    }
    if (pendingGiftcardPref?.flow) {
      payload.flow = pendingGiftcardPref.flow;
    }
    if (giftcardNotice) {
      payload.notice = giftcardNotice;
    }
    return payload;
  }, [isGiftCardOrder, pendingGiftcardPref, giftcardNotice]);

  useEffect(() => {
    if (pendingGiftcardPref) {
      Taro.removeStorageSync('PENDING_GIFTCARD_ORDER');
      Taro.showToast({ title: '已切换到购物卡模式', icon: 'success' });
    }
  }, [pendingGiftcardPref]);

  useEffect(() => {
    if (isGiftCardOrder && !giftcardMode) {
      setGiftcardMode(pendingGiftcardPref?.flow || 'custom');
    }
    if (!isGiftCardOrder && !pendingGiftcardPref && giftcardMode) {
      setGiftcardMode(undefined);
    }
  }, [isGiftCardOrder, giftcardMode, pendingGiftcardPref]);

  useEffect(() => {
    userService
      .getProfile()
      .then(setProfile)
      .catch(() => {});
    
    // 加载积分余额和设置
    Promise.all([
      pointsService.getBalance().catch(() => null),
      pointsService.getSettings().catch(() => null)
    ]).then(([balance, settings]) => {
      if (balance) setPointsBalance(balance);
      if (settings) setPointsSettings(settings);
      // 数据加载完成后，在下一个useEffect中自动填入最大可用积分
    });
    
    // 从后端获取用户的默认地址（优先从后端获取，确保地址是最新的）
    if (!addressTouched && !defaultAddressLoaded) {
      userService
        .getAddresses()
        .then((addressData) => {
          setDefaultAddressLoaded(true);
          
          // 如果后端有地址数据，使用后端的地址
          if (addressData?.addresses && addressData.addresses.length > 0) {
            const formattedAddresses: StoredAddress[] = addressData.addresses.map((addr, index) => ({
              id: addr.id ? (parseInt(String(addr.id).replace(/[^0-9]/g, '')) || index + 1) : index + 1,
              name: addr.name,
              phone: addr.phone,
              province: addr.province,
              city: addr.city,
              district: addr.district,
              detail_address: addr.detail_address,
              postcode: addr.postcode,
              isDefault: addr.isDefault
            }));
            setSavedAddresses(formattedAddresses);
            
            // 如果有默认地址，自动填充到表单
            if (addressData.default_address) {
              const defaultAddr = addressData.default_address;
              applyAddress({
                id: defaultAddr.id ? (parseInt(String(defaultAddr.id).replace(/[^0-9]/g, '')) || 1) : 1,
                name: defaultAddr.name,
                phone: defaultAddr.phone,
                province: defaultAddr.province,
                city: defaultAddr.city,
                district: defaultAddr.district,
                detail_address: defaultAddr.detail_address,
                postcode: defaultAddr.postcode,
                isDefault: defaultAddr.isDefault
              });
            }
          } else if (defaultAddressSnapshot) {
            // 如果后端没有地址，但本地有地址，使用本地地址
            // 这个逻辑已经在初始化时处理了
          }
        })
        .catch((error) => {
          console.error('获取用户地址失败', error);
          setDefaultAddressLoaded(true); // 即使失败也标记为已加载，避免重复请求
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDidShow(() => {
    const latest = getSavedAddresses();
    setSavedAddresses(latest);
    if (!addressTouched) {
      const nextDefault = selectDefaultAddress(latest);
      if (nextDefault) {
        applyAddress(nextDefault);
      }
    }
  });

  const handleRegionChange = (event: any) => {
    const value: string[] = event.detail.value;
    setRegion(value);
    setAddressTouched(true);
    shippingConfirmRef.current = false;
    setAddress((prev) => ({
      ...prev,
      province: value[0] || '',
      city: value[1] || '',
      district: value[2] || ''
    }));
  };

  const handleAddressChange = (key: keyof ShippingAddress, value: string) => {
    setAddressTouched(true);
    shippingConfirmRef.current = false;
    setAddress((prev) => ({
      ...prev,
      [key]: value
    }));
  };


  const hasFullAddress = useMemo(
    () => Boolean(address.name && address.phone && address.detail_address && address.province),
    [address]
  );

  const handleGiftcardToggle = (nextValue: boolean) => {
    setIsGiftCardOrder(nextValue);
    if (nextValue && !giftcardNotice) {
      setGiftcardNotice('您选择了购物卡模式，系统会直接生成购物卡资产，无需填写地址。');
    }
    if (nextValue && !giftcardMode) {
      setGiftcardMode(pendingGiftcardPref?.flow || 'custom');
    }
    if (!nextValue) {
      giftcardConfirmRef.current = false;
      if (!pendingGiftcardPref) {
        setGiftcardNotice('');
      }
    }
    shippingConfirmRef.current = false;
  };

  const buildGiftcardShipping = (): ShippingAddress => {
    const fallbackName =
      address.name ||
      profile?.first_name ||
      profile?.nickname ||
      profile?.username ||
      storedUserInfo?.wechat_nickname ||
      '购卡用户';
    const fallbackPhone = address.phone || profile?.phone || storedUserInfo?.phone || '13800000000';
    return {
      name: fallbackName,
      phone: fallbackPhone,
      province: address.province || '购物卡',
      city: address.city || '无需发货',
      district: address.district || '数字权益',
      detail_address: address.detail_address || '购物卡订单，无需物流配送',
      postcode: address.postcode || '000000'
    };
  };

  const confirmGiftcardOrder = async () => {
    if (!isGiftCardOrder || giftcardConfirmRef.current) {
      return true;
    }
    const modal = await Taro.showModal({
      title: '确认购买购物卡',
      content:
        '您勾选了“购买礼品卡”。该订单支付后不会安排发货，而是生成礼品卡资产。确定继续吗？',
      cancelText: '再想想',
      confirmText: '确定'
    });
    if (modal.confirm) {
      giftcardConfirmRef.current = true;
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!fromCart && !variationId) {
      Taro.showToast({ title: '缺少商品规格信息', icon: 'none' });
      return;
    }

    if (fromCart && checkoutItems.length === 0) {
      Taro.showToast({ title: '购物车商品已失效', icon: 'none' });
      return;
    }

    const requireShipping = !isGiftCardOrder;
    const phoneRegex = /^1[3-9]\d{9}$/;

    if (requireShipping) {
      if (!address.name || !address.phone || !address.detail_address || !address.province) {
        Taro.showToast({ title: '请完善收件人信息', icon: 'none' });
        return;
      }

      if (!phoneRegex.test(address.phone)) {
        Taro.showToast({ title: '请输入正确的手机号码', icon: 'none' });
        return;
      }
    } else if (address.phone && !phoneRegex.test(address.phone)) {
      Taro.showToast({ title: '请输入正确的手机号码', icon: 'none' });
      return;
    }

    const confirmed = await confirmGiftcardOrder();
    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      
      // 保存收货地址到本地存储
      if (hasFullAddress) {
        upsertAddress(address);
      }
      const shippingPayload = requireShipping
        ? address
        : hasFullAddress
          ? address
          : buildGiftcardShipping();
      const basePayload = {
        shipping_address: shippingPayload,
        is_gift_card_order: isGiftCardOrder,
        giftcard_hint: isGiftCardOrder ? giftcardNotice || '购物卡订单' : undefined,
        giftcard_template_id: isGiftCardOrder ? giftcardTemplateId : undefined,
        giftcard_mode: isGiftCardOrder ? giftcardMode : undefined,
        giftcard_payload: isGiftCardOrder ? giftcardPayload : undefined,
        points_to_use: pointsToUse > 0 ? pointsToUse : undefined
      };
      
      if (fromCart) {
        // 从购物车结算：创建多个订单
        const orderIds: number[] = [];
        const variationIds: number[] = [];
        
        for (const item of checkoutItems) {
          const order = await orderService.createOrder({
            variation_id: item.variation_id,
            quantity: item.quantity,
            ...basePayload
          });
          orderIds.push(order.order_id);
          variationIds.push(item.variation_id);
        }
        
        // 清除购物车中已购商品
        for (const vid of variationIds) {
          await cartService.removeFromCart(vid);
        }
        
        // 清除缓存
        Taro.removeStorageSync('checkout_items');
        
        Taro.showToast({ title: '订单创建成功', icon: 'success' });
        
        // 跳转到订单列表
        setTimeout(() => {
          Taro.redirectTo({
            url: '/pages/order/list'
          });
        }, 1000);
      } else {
        // 从商品详情直接购买
        const order = await orderService.createOrder({
          variation_id: variationId,
          quantity,
          ...basePayload
        });
        
        // 跳转到待支付页面进行二次确认
        Taro.showToast({ title: '订单创建成功', icon: 'success' });
        
        setTimeout(() => {
          const confirmUrl = isGiftCardOrder
            ? `/pages/order/order-confirm?orderId=${order.order_id}&from=giftcard_manual`
            : `/pages/order/order-confirm?orderId=${order.order_id}`;
          Taro.redirectTo({
            url: confirmUrl
          });
        }, 1000);
      }
    } catch (error) {
      console.error('创建订单失败', error);
      Taro.showToast({ title: '创建订单失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 计算订单总金额（数值）
  const orderTotal = useMemo(() => {
    if (fromCart) {
      return checkoutItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
    }
    // 从商品详情购买，使用传递的价格参数
    return variationPrice > 0 ? variationPrice * quantity : 0;
  }, [fromCart, checkoutItems, variationPrice, quantity]);
  
  // 计算最大可用积分
  const maxPointsToUse = useMemo(() => {
    if (!pointsSettings || !pointsBalance || !pointsSettings.enable_points_discount) {
      return 0;
    }
    
    const availablePoints = pointsBalance.available || 0;
    if (availablePoints < pointsSettings.min_points_to_use) {
      return 0;
    }
    
    if (orderTotal < pointsSettings.min_order_amount_to_use) {
      return 0;
    }
    
    // 计算最大可抵扣金额
    const maxDiscountAmount = orderTotal * (pointsSettings.max_discount_percent / 100);
    
    // 根据抵扣金额计算需要的积分
    const maxPointsByOrder = Math.floor(maxDiscountAmount * pointsSettings.redeem_rate);
    
    // 取用户可用积分和订单允许的最大积分的最小值
    return Math.min(availablePoints, maxPointsByOrder);
  }, [pointsSettings, pointsBalance, orderTotal]);
  
  // 计算积分抵扣金额
  const pointsDiscountAmount = useMemo(() => {
    if (!pointsSettings || pointsToUse <= 0) {
      return 0;
    }
    return pointsToUse / pointsSettings.redeem_rate;
  }, [pointsSettings, pointsToUse]);
  
  // 计算最终应付金额
  const finalTotal = useMemo(() => {
    return Math.max(0, orderTotal - pointsDiscountAmount);
  }, [orderTotal, pointsDiscountAmount]);
  
  // 自动填入最大可用积分（仅在首次加载时自动填入一次）
  const pointsInitializedRef = useRef(false);
  
  useEffect(() => {
    // 只在首次计算出maxPointsToUse且还没有初始化时，自动填入最大可用积分
    if (!pointsInitializedRef.current && maxPointsToUse > 0) {
      setPointsToUse(maxPointsToUse);
      setPointsInput(String(maxPointsToUse));
      pointsInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPointsToUse]);
  
  // 处理积分输入变化（允许用户自由输入和删除）
  const handlePointsInputChange = (value: string) => {
    // 标记已经手动修改，防止自动填入逻辑覆盖
    pointsInitializedRef.current = true;
    
    // 直接更新输入框的值
    setPointsInput(value);
    
    // 如果输入为空，设置为0
    if (!value || value.trim() === '') {
      setPointsToUse(0);
      return;
    }
    
    // 解析输入值
    const numValue = parseInt(value, 10);
    
    // 如果解析失败或小于0，设置为0但允许继续输入
    if (Number.isNaN(numValue) || numValue < 0) {
      setPointsToUse(0);
      return;
    }
    
    // 更新积分使用量（允许任何数字，不在此处限制）
    setPointsToUse(numValue);
  };
  
  // 处理输入框失去焦点时的验证和调整（不允许超过最大使用限制）
  const handlePointsInputBlur = () => {
    const currentValue = pointsInput.trim();
    
    // 如果输入为空，设置为0
    if (!currentValue) {
      setPointsToUse(0);
      setPointsInput('');
      return;
    }
    
    const numValue = parseInt(currentValue, 10);
    
    // 如果解析失败，重置为最大可用积分或0
    if (Number.isNaN(numValue) || numValue < 0) {
      if (maxPointsToUse > 0) {
        setPointsToUse(maxPointsToUse);
        setPointsInput(String(maxPointsToUse));
      } else {
        setPointsToUse(0);
        setPointsInput('');
      }
      return;
    }
    
    if (!pointsBalance || !pointsSettings || maxPointsToUse <= 0) {
      return;
    }
    
    const availablePoints = pointsBalance.available || 0;
    let finalPoints = numValue;
    
    // 不允许超过最大可用积分
    if (finalPoints > maxPointsToUse) {
      finalPoints = maxPointsToUse;
    }
    
    // 不允许超过可用积分余额
    if (finalPoints > availablePoints) {
      finalPoints = Math.min(availablePoints, maxPointsToUse);
    }
    
    // 如果被调整了，更新输入框和提示
    if (finalPoints !== numValue) {
      setPointsToUse(finalPoints);
      setPointsInput(String(finalPoints));
      Taro.showToast({ 
        title: `已自动调整为最多可用积分${finalPoints}`, 
        icon: 'none',
        duration: 2000
      });
    } else {
      // 正常情况，更新积分使用量
      setPointsToUse(finalPoints);
    }
  };
  

  return (
    <View className='order-detail-page'>
      <View className='card'>
        <Text className='section-title highlight-title'>确认商品</Text>
        {fromCart ? (
          checkoutItems.map((item, index) => (
            <View key={index} className='checkout-item-block'>
              <View className='info-row'>
                <Text className='label'>商品名称:</Text>
                <Text className='value'>{item.product_name}</Text>
              </View>
              <View className='info-row'>
                <Text className='label'>商品编号:</Text>
                <Text className='value'>{item.variation_id}</Text>
              </View>
              {/* 将规格属性拆分为单独的行 */}
              {item.variation_name.split(' | ').map((attr, attrIndex) => {
                const [attrName, attrValue] = attr.split(': ');
                return (
                  <View key={attrIndex} className='info-row'>
                    <Text className='label'>{attrName}:</Text>
                    <Text className='value'>{attrValue}</Text>
                  </View>
                );
              })}
              <View className='info-row'>
                <Text className='label'>单价:</Text>
                <Text className='value price'>¥{item.price}</Text>
              </View>
              <View className='info-row'>
                <Text className='label'>数量:</Text>
                <Text className='value'>×{item.quantity}</Text>
              </View>
              <View className='info-row highlight'>
                <Text className='label'>小计:</Text>
                <Text className='value subtotal'>¥{(parseFloat(item.price) * item.quantity).toFixed(2)}</Text>
              </View>
              {index < checkoutItems.length - 1 && <View className='divider' />}
            </View>
          ))
        ) : (
          <>
            <View className='info-row'>
              <Text>商品名称</Text>
              <Text>{productName}</Text>
            </View>
            <View className='info-row'>
              <Text>规格 ID</Text>
              <Text>{variationId}</Text>
            </View>
            <View className='info-row'>
              <Text>购买数量</Text>
              <Input
                type='number'
                value={String(quantity)}
                onInput={(event) => {
                  const next = parseInt(event.detail.value || '1', 10) || 1;
                  setQuantity(Math.max(1, next));
                }}
              />
            </View>
          </>
        )}
      </View>

      <View className='card giftcard-toggle-card'>
        <View className='toggle-row'>
          <View className='toggle-texts'>
            <Text className='toggle-title'>购买购物卡</Text>
            <Text className='toggle-desc'>勾选后直接生成购物卡，无需填写收货地址，提交订单即可完成购卡。</Text>
          </View>
          <Switch
            checked={isGiftCardOrder}
            color='#1dbf73'
            style={{ transform: 'scale(0.85)' }}
            onChange={(event) => handleGiftcardToggle(event.detail.value)}
          />
        </View>
        {giftcardNotice && <Text className='giftcard-notice'>{giftcardNotice}</Text>}
        {isGiftCardOrder && hasFullAddress && (
          <Text className='giftcard-note'>您已填写地址，系统仍会生成购物卡资产，不会安排发货。</Text>
        )}
      </View>

      <View className='card'>
        <Text className='section-title highlight-title'>收货信息</Text>
        <View className='info-row'>
          <Text>收件人</Text>
          <Input
            placeholder='请输入收件人姓名'
            value={address.name}
            onInput={(event) => handleAddressChange('name', event.detail.value)}
          />
        </View>
        <View className='info-row'>
          <Text>联系电话</Text>
          <Input
            placeholder='请输入手机号'
            value={address.phone}
            onInput={(event) => handleAddressChange('phone', event.detail.value)}
          />
        </View>
        <View className='info-row'>
          <Text>所在地区</Text>
          <Picker mode='region' value={region} onChange={handleRegionChange}>
            <View className='picker-value'>
              {address.province ? `${address.province} ${address.city} ${address.district}` : '请选择省市区'}
            </View>
          </Picker>
        </View>
        <View className='info-row'>
          <Text>详细地址</Text>
          <Input
            placeholder='街道、楼栋、房号'
            value={address.detail_address}
            onInput={(event) => handleAddressChange('detail_address', event.detail.value)}
          />
        </View>
        <View className='info-row'>
          <Text>邮编</Text>
          <Input
            placeholder='可选'
            value={address.postcode || ''}
            onInput={(event) => handleAddressChange('postcode', event.detail.value)}
          />
        </View>
      </View>

      {/* 积分抵扣区域 */}
      {pointsSettings?.enable_points_discount && pointsBalance && orderTotal > 0 && (
        <View className='card points-card'>
          <Text className='section-title highlight-title'>积分抵扣</Text>
          <View className='points-info-row'>
            <Text className='points-label'>可用积分：</Text>
            <Text className='points-value'>{pointsBalance.available || 0}</Text>
          </View>
          
          {maxPointsToUse > 0 ? (
            <>
              <View className='points-input-row'>
                <Text className='points-label'>使用积分：</Text>
                <Input
                  className='points-input'
                  type='number'
                  value={pointsInput}
                  placeholder='请输入积分数量'
                  onInput={(e) => handlePointsInputChange(e.detail.value)}
                  onBlur={handlePointsInputBlur}
                />
              </View>
              
              <View className='points-discount-row'>
                <Text className='points-label'>积分抵扣：</Text>
                <Text className='points-discount'>-¥{pointsDiscountAmount.toFixed(2)}</Text>
              </View>
              
              <View className='points-tip-row'>
                <Text className='points-tip-text'>最多可使用 {maxPointsToUse} 积分（可修改）</Text>
              </View>
              
              {pointsBalance.available < pointsSettings.min_points_to_use && (
                <Text className='points-tip'>当前积分低于最低使用要求（{pointsSettings.min_points_to_use}积分）</Text>
              )}
            </>
          ) : (
            <View className='points-tip'>
              {pointsBalance.available < pointsSettings.min_points_to_use 
                ? `积分不足，最低需要使用${pointsSettings.min_points_to_use}积分`
                : orderTotal < pointsSettings.min_order_amount_to_use
                ? `订单金额需满¥${pointsSettings.min_order_amount_to_use}才能使用积分`
                : '当前订单不满足积分抵扣条件'}
            </View>
          )}
        </View>
      )}

      {/* 订单总金额显示（购物车或商品详情） */}
      {orderTotal > 0 && (
        <View className='card total-card'>
          <View className='info-row total-row'>
            <Text className='total-label'>订单总额</Text>
            <Text className='total-value'>¥{orderTotal.toFixed(2)}</Text>
          </View>
          {pointsToUse > 0 && (
            <>
              <View className='info-row'>
                <Text className='total-label'>积分抵扣</Text>
                <Text className='total-value discount'>-¥{pointsDiscountAmount.toFixed(2)}</Text>
              </View>
              <View className='info-row total-row'>
                <Text className='total-label'>最终应付</Text>
                <Text className='total-value final'>¥{finalTotal.toFixed(2)}</Text>
              </View>
            </>
          )}
        </View>
      )}

      <Button className='pay-btn' loading={submitting} onClick={handleSubmit}>
        {fromCart ? `提交订单（共${checkoutItems.length}件）` : '提交订单'}
      </Button>
    </View>
  );
};

export default OrderCreate;
