export interface SliderItem {
  img: string;
  link: string;
}

export interface PublicConfig {
  payment_qr_url: string;
  customer_service_qr: string;
  home_slider: SliderItem[];
}

export interface ProductVariation {
  variation_id: number;
  attributes: Record<string, string>;
  price: string | number;
  image_url?: string;
  in_stock?: boolean;
}

export interface Product {
  id: number;
  name: string;
  type: 'variable' | 'simple' | 'variation';
  description?: string;
  image_url: string | null;
  price?: string | number;
  min_price?: string | number;
  max_price?: string | number;
  variations: ProductVariation[];
}

export interface LoginResponse {
  token: string;
  user_id: number;
  is_new: boolean;
  phone?: string;
  wechat_nickname?: string;
  invite_code?: string;
}

export interface UserProfile {
  user_id: number;
  username: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  openid?: string;
  referral_code?: string;
  points_balance?: number;
  is_test_user?: boolean;
  test_code?: string;
  // 兼容旧字段
  wechat_nickname?: string;
  wechat_avatar?: string;
  invite_code?: string;
  referrer_id?: number | null;
  total_points?: number;
  membership_level?: string;
  is_agent?: boolean;
  agent_code?: string | null;
  has_cart?: boolean;
}

export interface CartItem {
  product_id: number;
  variation_id: number;
  quantity: number;
  product_name: string;
  variation_name: string;
  price: string;
  image_url?: string;
}

export interface CartSummary {
  items: CartItem[];
  total_quantity: number;
  subtotal: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail_address: string;
  postcode?: string;
}

export type GiftCardPurchaseFlow = 'stored_value' | 'bundle' | 'custom';

export interface GiftCardOrderPayload {
  amount?: number;
  selected_items?: Array<{ variation_id: number; quantity: number }>;
  message?: string;
  recipient_hint?: string;
  recipient_contact?: string;
  remark?: string;
  [key: string]: any;
}

export interface CreateOrderPayload {
  variation_id?: number;
  quantity?: number;
  shipping_address?: ShippingAddress;
  giftcard_mode?: GiftCardPurchaseFlow;
  giftcard_template_id?: number;
  giftcard_payload?: GiftCardOrderPayload;
  remark?: string;
}

export interface OrderCreated {
  order_id: number;
  order_number: string;
  status: string;
  total: string;
  payment_qr_url: string;
  customer_service_qr: string;
}

export interface OrderItemSummary {
  product_id: number;
  variation_id: number;
  product_name: string;
  variation_name: string;
  price: string;
  quantity: number;
}

export interface OrderDetail extends OrderCreated {
  items?: OrderItemSummary[];
  created_at?: string;
  shipping_address?: ShippingAddress;
  payment_proof_url?: string;
  payment_proof_submitted_at?: string;
  has_payment_proof?: boolean;
  tracking_number?: string;
  tracking_company?: string;
}

export type GiftCardDeliveryMode = 'digital_share' | 'printable';

export interface GiftCard {
  card_number: string;
  status: string;
  bind_status: 'unbound' | 'bound' | string;
  template_type: string;
  initial_amount: string | null;
  balance: string | null;
  expires_at: string | null;
  purchaser_id?: number;
  redeemer_id?: number | null;
  currency?: string | null;
  created_at?: string;
  updated_at?: string;
  template_id?: number;
  template_name?: string;
  delivery_modes?: GiftCardDeliveryMode[];
  print_template_url?: string | null;
  can_reset_pin?: boolean;
}

export interface GiftCardBundleItem {
  product_id?: number | null;
  variation_id?: number | null;
  name?: string | null;
  product_name?: string | null;
  title?: string | null;
  description?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  quantity?: number | null;
  price?: string | number | null;
  attributes?: Record<string, any> | null;
  [key: string]: any;
}

export interface GiftCardTemplate {
  id: number;
  name: string;
  type: string;
  fixed_amount?: string | null;
  currency?: string | null;
  product_id?: number | null;
  variation_ids?: number[];
  bundle_items?: Record<string, any> | null;
  delivery_modes?: string[];
  valid_days: number;
  share_template_config?: Record<string, any> | null;
  print_template_url?: string | null;
  purchase_flow?: GiftCardPurchaseFlow;
  amount_options?: number[] | null;
  min_amount?: number | null;
  max_amount?: number | null;
  allowed_product_ids?: number[] | null;
  allowed_variation_ids?: number[] | null;
  max_items?: number | null;
  max_total?: number | null;
  success_copywriting?: string | null;
  bundle_items?: GiftCardBundleItem[] | null;
}

export interface GiftCardPurchaseResult {
  card_number: string;
  card_pin: string;
  template: GiftCardTemplate;
}

export interface GiftCardShareResult {
  card_number: string;
  template_name?: string | null;
  share_token: string;
  delivery_mode: GiftCardDeliveryMode | string;
  channel: string;
  expires_at?: string | null;
  share_url?: string | null;
  qrcode_url?: string | null;
  print_template_url?: string | null;
  allowed_delivery_modes?: GiftCardDeliveryMode[];
}

export interface GiftCardShareDetail {
  card_number: string;
  template_id: number;
  template_type: string;
  initial_amount: string | null;
  balance: string | null;
  expires_at: string | null;
  share_channel: string | null;
  share_token_expires_at: string | null;
  status: string;
  bind_status: string;
  template: GiftCardTemplate | null;
  template_name?: string | null;
  sender_nickname?: string | null;
  delivery_mode?: 'link' | 'qrcode' | 'passcode' | string | null;
  share_url?: string | null;
}

export interface CommissionRecord {
  id: number;
  order_id: number;
  amount: string;
  commission_type: 'referral' | 'agent';
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
}

export interface ReferralDownline {
  user_id: number;
  phone: string;
  registered_at: string;
  level: number;
}

export interface AgentProfile {
  is_agent: boolean;
  agent_code: string | null;
  level: number;
  parent_agent_id: number | null;
  total_downline_agents: number;
  total_sales_amount: string;
}

export interface AgentDownline {
  agent_user_id: number;
  agent_code: string;
  registered_at: string;
  level: number;
  sales_amount: string;
}

export interface PointsBalance {
  available: number;
  pending: number;
  frozen?: number;
  expiring_soon?: number;
  expiring_date?: string | null;
  recent_earnings?: number;
  total_earned: number;
  total_spent: number;
}

export interface PointsLedgerItem {
  id: number;
  type: 'earn' | 'spend' | 'expire' | 'refund';
  delta: number;
  balance_after: number;
  status: 'pending' | 'confirmed' | string;
  channel?: string;
  reference_order_id?: number | null;
  reservation_id?: string | null;
  expire_at?: string | null;
  created_at: string;
  description?: string;
}

export interface PointsRule {
  rule_id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive';
}

export interface PointsMission {
  mission_id: string;
  title: string;
  description: string;
  reward_points: number;
  status: 'available' | 'completed' | 'claimed' | 'locked';
  progress: number;
  goal: number;
  expires_at?: string | null;
  completed_at?: string | null;
}

export interface PointsRedeemOption {
  option_id: string;
  type: 'coupon' | 'gift_card' | 'product' | 'other';
  title: string;
  description?: string;
  cost_points: number;
  stock?: number | null;
  status: 'active' | 'coming_soon' | 'sold_out';
  meta?: Record<string, any>;
}

export interface PointsRedeemResult {
  option_id: string;
  cost_points: number;
  new_balance: number;
  coupon_code?: string;
  gift_card_number?: string;
  message?: string;
}

export interface AddressFormState extends ShippingAddress {
  id?: number;
  isDefault?: boolean;
}
