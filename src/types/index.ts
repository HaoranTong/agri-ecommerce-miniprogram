export interface SliderItem {
  img: string;
  link: string;
}

export interface PublicConfig {
  payment_qr_url: string;
  customer_service_qr: string;
  home_slider: SliderItem[];
}

export type StockStatus = 'instock' | 'outofstock' | 'onbackorder';

export interface ProductVariation {
  variation_id: number;
  attributes: Record<string, string>;
  price: string;
  stock_status: StockStatus;
  image_url?: string;
}

export interface Product {
  id: number;
  name: string;
  type: 'variable' | 'simple';
  description?: string;
  is_gift_card: boolean;
  image_url: string;
  price?: string; // 基础价格（兼容旧数据）
  min_price?: number; // 最低价格
  max_price?: number; // 最高价格
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
  phone?: string;
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

export interface CreateOrderPayload {
  variation_id: number;
  quantity: number;
  shipping_address: ShippingAddress;
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
}

export interface GiftCard {
  card_number: string;
  balance: string;
  expires_at: string;
  status: 'active' | 'used' | 'expired';
  template_name: string;
  can_reset_pin: boolean;
}

export interface GiftCardShareResult {
  share_token: string;
  share_url: string;
  expires_at: string;
}

export interface GiftCardShareDetail {
  card_number: string;
  balance: string;
  template_name: string;
  sender_nickname?: string;
  delivery_mode: 'link' | 'qrcode' | 'passcode';
  status: 'active' | 'claimed' | 'expired';
  expires_at: string;
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
  expiring_soon: number;
  expiring_date?: string;
}

export interface PointsLedgerItem {
  id: number;
  user_id: number;
  points: number;
  type: 'earn' | 'spend' | 'expire' | 'refund';
  source: string;
  source_id?: number;
  balance_after: number;
  expires_at?: string;
  created_at: string;
}

export interface AddressFormState extends ShippingAddress {
  id?: number;
  isDefault?: boolean;
}
