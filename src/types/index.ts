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
  is_new?: boolean;
  is_new_user?: boolean;
  has_profile?: boolean;
  has_phone?: boolean;
  has_realname?: boolean;
  phone?: string;
  wechat_nickname?: string;
  wechat_avatar?: string;
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
  has_profile?: boolean;
  has_phone?: boolean;
  has_realname?: boolean;
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
  total_amount_hint?: number;  // 用于提示后端订单总金额
  [key: string]: any;
}

export interface CreateOrderPayload {
  variation_id?: number;
  quantity?: number;
  shipping_address?: ShippingAddress;
  giftcard_mode?: GiftCardPurchaseFlow;
  giftcard_template_id?: number;
  giftcard_payload?: GiftCardOrderPayload;
  is_gift_card_order?: boolean;
  giftcard_hint?: string;
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
  name?: string | null;
  product_name: string;
  variation_name: string;
  price: string;
  quantity: number;
}

export interface OrderDetail extends OrderCreated {
  items?: OrderItemSummary[];
  created_at?: string;
  original_total?: string;
  discount_total?: string;
  shipping_address?: ShippingAddress;
  tracking_number?: string;
  tracking_company?: string;
  shipped_at?: string;
  return_status?: 'none' | 'requested' | string;
  return_requested_at?: string | null;
  return_images?: string[];
  message?: string;
  coupon_info?: {
    code: string;
    discount_amount: string;
    applied_at?: string;
  } | null;
  gift_card_info?: {
    card_number: string;
    used_amount: string;
    remaining_balance: string;
  } | null;
  points_usage?: {
    points_used: number;
    discount_amount: string;
  } | null;
  // 订单获得的积分 (标准字段)
  points_earned?: number;
  // 兼容性字段:后端可能返回以下字段名称,前端统一转换为 points_earned
  points_reward?: number;
  reward_points?: number;
  earned_points?: number;
  is_gift_card_order?: boolean;
  giftcard_mode?: string | null;
}

export type PaymentProvider = 'wechat' | 'offline';

export interface PaymentCreateResponse {
  success: boolean;
  provider: PaymentProvider;
  order_id: number; // 订单ID，用于查询支付状态
  payment_intent_id?: string;
  payment_payload?: {
    appId?: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: 'RSA' | 'MD5';
    paySign: string;
  };
  payment_qr_url?: string;
  customer_service_qr?: string;
  message?: string;
  debug?: {
    host?: string;
    server_name?: string;
    home_url?: string;
    site_url?: string;
    wp_content_dir?: string;
    plugin_file?: string;
  };
  debug_payment?: {
    appid?: string;
    mchid?: string;
    openid_masked?: string;
    order_id?: number;
    out_trade_no?: string;
    notify_url?: string;
    prepay_id?: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  data: {
    order_id: number;
    provider?: PaymentProvider | string | null;
    status: 'pending' | 'paid' | 'failed' | 'canceled';
    paid_at?: string | null;
  };
}

export type GiftCardDeliveryMode = 'digital_share' | 'printable';

export type GiftCardShareState = 'none' | 'shared' | 'bound' | 'consumed' | 'expired';

export interface GiftCardShareMeta {
  message?: string | null;
  theme?: string | null;
  format?: 'qr' | 'pdf' | 'both';
  template?: {
    print_template_url?: string | null;
    share_template_config?: Record<string, any> | null;
  } | null;
}

export interface GiftCardShareSnapshot {
  card_number: string;
  template_name?: string | null;
  initial_amount?: string | null;
  balance?: string | null;
  expires_at?: string | null;
  message?: string | null;
  theme?: string | null;
  order_id?: number | string | null;
}

export interface GiftCardShareLogEntry {
  id: number;
  delivery_mode: GiftCardDeliveryMode | string;
  channel: string;
  share_token?: string | null;
  print_package_url?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface GiftCardRedeemResult {
  card_number: string;
  status: string;
  order_id?: number;
  order_number?: string;
}

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
  share_state?: GiftCardShareState;
  share_meta?: GiftCardShareMeta | null;
  shared_at?: string | null;
  shared_count?: number;
  share_token_expires_at?: string | null;
  share_channel?: string | null;
  card_snapshot?: GiftCardShareSnapshot | null;
  share_history?: GiftCardShareLogEntry[];
  purchase_order_id?: number | null;
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
  bundle_items_config?: Record<string, any> | null;
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
  template: GiftCardTemplate;
}

export interface GiftCardShareStyle {
  id: string;
  name: string;
  preview_image?: string;
  config: Record<string, any>;
}

export interface GiftCardShareResult {
  card_number: string;
  template_name?: string | null;
  share_token: string;
  delivery_mode: GiftCardDeliveryMode | string;
  channel: string;
  expires_at?: string | null;
  share_url?: string | null;
  mini_program_path?: string | null;
  mini_program_qr?: string | null;
  qr_payload?: string | null;
  qr_image_url?: string | null; // 带模板图案的二维码图片URL
  print_template_url?: string | null;
  allowed_delivery_modes?: GiftCardDeliveryMode[];
  share_meta?: GiftCardShareMeta | null;
  share_state?: GiftCardShareState;
  card_snapshot?: GiftCardShareSnapshot | null;
  share_history?: GiftCardShareLogEntry[];
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
  mini_program_path?: string | null;
  qr_payload?: string | null;
  share_meta?: GiftCardShareMeta | null;
  share_state?: GiftCardShareState;
  card_snapshot?: GiftCardShareSnapshot | null;
  share_history?: GiftCardShareLogEntry[];
}

export interface CommissionRecord {
  id: number;
  order_id: number;
  amount: string;
  commission_type: 'referral' | 'agent';
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  created_at: string;
}

export interface CommissionSummary {
  totals_by_status: {
    pending: string;
    approved: string;
    rejected: string;
    paid: string;
  };
  paid_this_month: string;
}

export interface CommissionPayoutRecord {
  payout_id: number;
  amount: string;
  status: 'processing' | 'paid' | 'rejected' | 'cancelled';
  settlement_batch?: string | null;
  requested_at: string;
  paid_at?: string | null;
  note?: string | null;
}

export interface ReferralDownline {
  user_id: number;
  phone: string;
  registered_at: string;
  level: number;
  first_order_status?: 'pending' | 'completed' | 'expired' | string;
  total_orders?: number;
  lifetime_value?: string;
  channel_code?: string;
}

export interface ReferralMember {
  user_id: number;
  nickname?: string;
  level: number;
  first_order_status?: 'pending' | 'completed' | 'expired' | string;
  first_order_id?: number | null;
  joined_at: string;
}

export interface ReferralSummary {
  referral_code: string;
  total_invitees: number;
  level_one_count: number;
  level_two_count: number;
  completed_first_orders: number;
  pending_first_orders: number;
  commission_totals?: {
    pending?: string;
    approved?: string;
    rejected?: string;
    paid?: string;
  };
  reward_points_total?: number;
  reward_points_pending?: number;
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
  type: 'earn' | 'spend' | 'expire' | 'adjust';
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

export interface PointsExchangeRules {
  enable_points_exchange: boolean;
  exchange_rate: number;
  exchange_min_points: number;
  exchange_min_amount: number;
  exchange_max_amount: number;
  exchange_max_amount_per_day: number;
  exchange_max_requests_per_day: number;
  exchange_fee_rate: number;
}

export interface PointsExchangeResult {
  payout_id: number;
  points: number;
  gross_amount: string;
  fee: string;
  amount: string;
  status: string;
  requested_at?: string;
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

// 缺失的类型定义
export interface InvitationSummary {
  invite_code?: string;
  total_invitations: number;
  first_order_count: number;
  conversion_rate: string;
  pending_invitations: number;
  pending_rewards?: string;
  latest_invite?: {
    invitee_user_id: number;
    nickname: string;
    invited_at: string;
    first_order_status: string;
  } | null;
}

export interface ChannelAnalytics {
  channel: string;
  visits: number;
  new_users: number;
  first_orders: number;
  gmv: string;
}

export interface PromoPoster {
  poster_url: string;
  mini_program_path: string;
  scene: string;
  mini_program_qr?: string | null;
  share_text?: string | null;
  tracking_params?: Record<string, any>;
  personal_qr?: string | null;
  personal_poster_url?: string | null;
}

export interface AgentApplication {
  region_zone: string;
  region_province?: string;
  region_city?: string;
  level: 1 | 2 | 3;
  parent_agent_code?: string;
  team_target?: {
    monthly_gmv?: number;
  };
}

export interface AgentApplicationResult {
  agent_code: string;
  status: 'pending' | 'active' | 'rejected' | 'frozen';
  active_until?: string;
  is_active?: boolean;
  message?: string;
}
