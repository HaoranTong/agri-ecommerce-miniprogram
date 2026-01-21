

- ✅ 与《数据模型定义 V2.1》字段一一对应  
- ✅ 覆盖一期（MVP）、二期（购物卡 + 分销 + 代理商）全部功能  
- ✅ 预留三期关键扩展路径（不实现但占位）  
- ✅ 所有接口路径、字段名、错误码 **永久冻结，不可变更**  
- ✅ 补全此前遗漏：商品列表、付款截图上传、代理商全套接口
- ✅ **V2.3.2更新**：优化登录流程，支持头像性别上传，支付接口返回order_id

------

# 📡 微信小程序 × WordPress 无头电商系统

## **完整 API 接口契约（V2.3.2 - 2026-01-21 更新）**

> **文档状态**：✅ 冻结（Final Frozen Baseline）+ V2.3.2 增量更新
> **适用项目阶段**：一期（MVP） + 二期（虚拟购物卡 / 社交裂变 / 代理商）
> **Base URL**：`https://yourdomain.com/wp-json/myshop/v1`
> **认证方式**：Bearer JWT Token（通过 `Authorization: Bearer <token>` 传递）
> **编码**：UTF-8
> **时间格式**：ISO 8601（如 `"2025-11-18T21:30:00+08:00"`）
>
> **V2.3.2 变更记录**（2026-01-21）：
> 1. `POST /auth/login` - 移除 wechat_nickname 和 wechat_avatar 参数
> 2. `PUT /user/profile` - 新增 avatar 和 gender 参数支持
> 3. `POST /payments/create` - 响应新增 order_id 字段
> **冻结规则**：  
>
> - 所有 **URL 路径**、**请求/响应字段名**、**核心语义** 一经发布不得修改  
> - 新功能只能通过 **新增接口** 实现
------



------

## 一、公共接口（无需认证）

### GET `/config/public`

**用途**：获取小程序启动所需公共配置与首页营销位数据
**成功响应（200）**：

```json
{
  "payment_qr_url": "https://yourdomain.com/uploads/pay-qr.jpg",
  "customer_service_qr": "https://yourdomain.com/uploads/cs-qr.jpg",
  "home_slider": [
    {
      "id": "banner-001",
      "img": "https://yourdomain.com/uploads/slide1.jpg",
      "link": "/pages/product/detail?id=101",
      "title": "新品稻花香上新",
      "subtitle": "限时 9 折"
    }
  ],
  "marketing_blocks": [
    {
      "code": "featured",
      "title": "精选推荐",
      "style": "grid",
      "items": [
        {
          "type": "product",
          "target": 101,
          "img": "https://yourdomain.com/uploads/featured1.jpg",
          "label": "热销"
        }
      ]
    },
    {
      "code": "campaign",
      "title": "限时活动",
      "style": "banner",
      "items": [
        {
          "type": "link",
          "target": "/pages/promo/index?scene=wechat",
          "img": "https://yourdomain.com/uploads/campaign1.jpg"
        }
      ]
    }
  ],
  "last_updated_at": "2025-11-20T10:00:00+08:00"
}
```

------

### GET `/products`

**用途**：获取所有可售商品列表（含变体）
**成功响应（200）**：

```json
{
  "products": [
    {
      "id": 101,
      "name": "五常稻花香大米",
      "type": "variable",
      "description": "产自黑龙江五常核心产区，一年一季新米，真空锁鲜",
      "price": "58.00",
      "min_price": "58.00",
      "max_price": "88.00",
      "image_url": "https://yourdomain.com/wp-content/uploads/2025/11/rice.jpg",
      "variations": [
        {
          "variation_id": 205,
          "attributes": {
            "规格": "5kg",
            "等级": "特级"
          },
          "price": 58,
          "image_url": "https://.../5kg.jpg",
          "in_stock": true
        }
      ]
    }
  ]
}
```

> ⚠️ 当前实现不会返回 `is_gift_card`、`stock_status` 等字段；变体 `attributes` 的 value 为 WooCommerce 原生 slug，需要前端自行映射展示。

------

### GET `/products/redeem`

**用途**：获取支持积分兑换的商品列表，返回的商品和变体均已在后台积分管理插件中配置为可用积分兑换。

**成功响应（200）**：

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "name": "五常稻花香大米",
      "type": "variable",
      "description": "产自黑龙江五常核心产区，一年一季新米，真空锁鲜",
      "price": "58.00",
      "min_price": "58.00",
      "max_price": "88.00",
      "image_url": "https://yourdomain.com/wp-content/uploads/2025/11/rice.jpg",
      "variations": [
        {
          "variation_id": 205,
          "attributes": {
            "规格": "5kg",
            "等级": "特级"
          },
          "price": 58,
          "image_url": "https://.../5kg.jpg",
          "in_stock": true
        }
      ]
    }
  ]
}
```

> ⚠️ 此接口返回的商品和变体均已在后台"积分管理 → 积分兑换商品设置"中配置。如果只配置了特定变体，则只返回这些变体；如果配置了商品但没有配置变体，则返回该商品的所有变体。接口会自动清理已下架或已删除的商品和变体，确保返回的数据是最新的。

------

## 二、认证与用户

### POST `/auth/login`

**用途**：微信授权登录，获取 JWT token
**请求体**：

```json
{
  "code": "wx_login_code_from_miniprogram"
}
```

> ⚠️ **V2.3.2 更新**：登录接口不再接收 `wechat_nickname` 和 `wechat_avatar`。前端应在登录成功后，如果获取到真实用户信息（非降级数据），调用 `PUT /user/profile` 上传头像和昵称。

**成功响应（200）**（`myshop-core/api/auth-controller.php` 当前实现）：

```json
{
  "success": true,
  "data": {
    "user_id": 42,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx",
    "openid": "oMockUser1234567890ab",
    "wechat_nickname": "可选",
    "wechat_avatar": "可选",
    "phone": "可选"
  }
}
```

> ⚠️ 若后端未存储微信资料，则 `wechat_nickname` / `wechat_avatar` / `phone` 可为空或不返回。

------

### POST `/auth/phone`

**用途**：绑定微信手机号（用户主动点击授权按钮后调用）

**请求体（二选一）**：

**方案 A：手机号授权 code**

```json
{
  "code": "wx_login_code_from_miniprogram",
  "phone_code": "wx_phone_code_from_getPhoneNumber"
}
```

**方案 B：兼容旧加密字段**

```json
{
  "code": "wx_login_code_from_miniprogram",
  "encrypted_data": "...",
  "iv": "..."
}
```

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "phone": "13800138000"
  }
}
```

------

### GET `/me`

**用途**：获取当前用户完整资料
**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "user_id": 42,
    "username": "test_test001",
    "nickname": "测试用户001",
    "first_name": "测试用户001",
    "last_name": "",
    "email": "test001@test.myshop.local",
    "phone": "13800138001",
    "avatar": "https://yourdomain.com/avatar.jpg",
    "openid": "oTest_User_001_FixedOpenID",
    "referral_code": "REF000042",
    "points_balance": 280,
    "is_test_user": true,
    "test_code": "test001"
  }
}
```

> ⚠️ 当前实现暂未返回 `membership_level`、`is_agent`、`agent_code`、`has_cart` 等字段，如需这些字段需扩展 `User_Controller::get_profile`。

------

### GET `/user/profile`

**用途**：获取当前登录用户的完整资料，前端 `UserProfile` 组件依赖下列字段渲染头像、昵称、积分、代理状态等信息。

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "user_id": 42,
    "username": "138****8000",
    "nickname": "禾野小店",
    "first_name": "张",
    "last_name": "三",
    "email": "demo@example.com",
    "phone": "13800138000",
    "avatar": "https://cdn.example.com/avatar.jpg",
    "points_balance": 260,
    "total_points": 580,
    "membership_level": "gold",
    "is_test_user": false,
    "test_code": null,
    "invite_code": "MYSHOP66",
    "referrer_id": 18,
    "is_agent": true,
    "agent_code": "AGT-0088",
    "has_cart": true,
    "wechat_nickname": "wx-nick",
    "wechat_avatar": "https://wx.qq.com/avatar.png"
  }
}
```

> 其中 `points_balance` 若暂不可用需返回 `null` 并由前端提示“稍后刷新”；`is_agent` / `agent_code` 用于展示代理入口，没有代理身份时返回 `false` 与 `null`。

------

### PUT `/user/profile`

**用途**：修改昵称 / 真实姓名 / 手机号 / 微信头像 / 性别

**请求体**：

```json
{
  "nickname": "测试用户001",
  "first_name": "张三",
  "phone": "13800138001",
  "avatar": "https://thirdwx.qlogo.cn/mmopen/vi_32/...",
  "gender": 1
}
```

> **V2.3.2 更新**：新增 `avatar`（微信头像URL）和 `gender`（0=未知/1=男/2=女）字段。前端在调用 `getUserProfile` 获取到真实用户信息后（非 `is_demote` 数据），应调用此接口上传到后端。
> 
> 所有字段均为可选，手机号按中国大陆 11 位规则校验。

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "user_id": 42,
    "username": "test_test001",
    "nickname": "测试用户001",
    "first_name": "张三",
    "phone": "13800138001",
    "avatar": null,
    "points_balance": 280
  }
}
```

> ⚠️ 接口返回最新的整份用户资料，前端需用返回值刷新本地缓存。

------

### GET `/user/addresses`

**用途**：获取当前登录用户的收货地址列表和默认地址，用于订单创建页面自动填充默认地址。

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "addresses": [
      {
        "id": "addr_1234567890",
        "name": "张三",
        "phone": "13800138000",
        "province": "北京市",
        "city": "北京市",
        "district": "朝阳区",
        "detail_address": "XX街道XX号",
        "postcode": "100000",
        "isDefault": true,
        "created_at": "2025-01-20T10:00:00+08:00"
      },
      {
        "id": "addr_0987654321",
        "name": "李四",
        "phone": "13900139000",
        "province": "上海市",
        "city": "上海市",
        "district": "浦东新区",
        "detail_address": "YY路YY号",
        "postcode": "200000",
        "isDefault": false,
        "created_at": "2025-01-21T15:30:00+08:00"
      }
    ],
    "default_address": {
      "id": "addr_1234567890",
      "name": "张三",
      "phone": "13800138000",
      "province": "北京市",
      "city": "北京市",
      "district": "朝阳区",
      "detail_address": "XX街道XX号",
      "postcode": "100000",
      "isDefault": true,
      "created_at": "2025-01-20T10:00:00+08:00"
    }
  }
}
```

> ⚠️ 如果用户没有地址，`addresses` 返回空数组，`default_address` 返回 `null`。如果没有设置默认地址，`default_address` 返回第一个地址或 `null`。地址数据存储在 WordPress 用户元数据 `_myshop_addresses` 中，订单创建时自动保存新地址。

------

## 三、邀请裂变与渠道归因

### GET `/invitations/summary`

**用途**：查询当前登录用户的邀请绩效概览
**成功响应（200）**：

```json
{
  "invite_code": "U42ABC",
  "total_invites": 18,
  "first_order_count": 9,
  "pending_rewards": "56.80",
  "latest_invite": {
    "invitee_user_id": 128,
    "nickname": "新米粉",
    "invited_at": "2025-11-21T18:30:00+08:00",
    "first_order_status": "pending"
  }
}
```

------

### POST `/invitations/track`

**用途**：记录渠道参数、scene 场景码访问日志
**请求体**：

```json
{
  "scene": "xhs-202511",
  "channel": "xiaohongshu",
  "inviter_id": 42,
  "landing_page": "/pages/index/index",
  "extra": {
    "campaign": "winter-sale",
    "utm_medium": "feed"
  }
}
```

**成功响应（201）**：

```json
{
  "log_id": 5566,
  "recorded_at": "2025-11-21T21:00:00+08:00"
}
```

------

### GET `/analytics/channel`

**用途**：获取渠道归因 KPI（需运营权限，可分页）
**查询参数**：`?from=2025-11-01&to=2025-11-30&page=1&page_size=20`

**成功响应（200）**：

```json
{
  "range": {
    "from": "2025-11-01",
    "to": "2025-11-30"
  },
  "channels": [
    {
      "channel": "xiaohongshu",
      "visits": 1350,
      "new_users": 420,
      "first_orders": 188,
      "gmv": "23560.00"
    },
    {
      "channel": "douyin",
      "visits": 980,
      "new_users": 305,
      "first_orders": 102,
      "gmv": "14680.00"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

------

### GET `/promo/poster`

**用途**：获取带邀请参数的营销海报/素材链接（运营配置的模板）
**查询参数**：`?scene=invite&template_code=poster-2025-winter`

**成功响应（200）**：

```json
{
  "template_code": "poster-2025-winter",
  "title": "冬季新品裂变海报",
  "image_url": "https://yourdomain.com/uploads/posters/winter-2025.png",
  "mini_program_qr": "https://yourdomain.com/qrcode/poster-2025-winter.png",
  "share_text": "扫码领取冬日好礼，好友下单你得积分！",
  "scene": "invite",
  "valid_until": "2025-12-31T23:59:59+08:00",
  "tracking_params": {
    "invite_code": "U42ABC",
    "channel": "poster"
  }
}
```

**失败示例（404）**：

```json
{
  "error_code": "poster_not_found",
  "message": "未找到可用的海报模板",
  "status": 404
}
```

------

## 四、购物车

### GET `/cart`

**成功响应（200）**：

```json
[
  {
    "product_id": 101,
    "variation_id": 205,
    "product_name": "五常稻花香大米",
    "variation_name": "规格: 5kg | 等级: 特级",
    "quantity": 2,
    "price": "58.00",
    "image_url": "https://yourdomain.com/uploads/thumb-101.jpg"
  }
]
```

> ⚠️ 当前 `Cart_Controller::get_cart` 仅返回条目数组，不包含 `subtotal`、`payable_total`、`gift_card_credits` 等汇总信息，若要展示需前端自行计算或扩展后端。

### POST `/cart`

**请求体**：

```json
{ "product_id": 101, "variation_id": 205, "quantity": 1 }
```

**响应**：同 GET `/cart`

**失败示例（409）**：

```json
{
  "error_code": "out_of_stock",
  "message": "商品库存不足",
  "status": 409
}
```

### DELETE `/cart`

**用途**：清空购物车
**响应**：204 No Content

------

### PUT `/cart/{variation_id}`

**用途**：更新购物车中指定 SKU 的数量

**路径参数**：

- `variation_id`: integer (required)

**请求体**：

```json
{ "quantity": 2 }
```

**成功响应（200）**：同 GET `/cart`

**失败示例（400）**：

```json
{
  "error_code": "invalid_request",
  "message": "缺少 variation_id 或 quantity",
  "status": 400
}
```

------

### DELETE `/cart/{variation_id}`

**用途**：移除购物车中指定 SKU

**路径参数**：

- `variation_id`: integer (required)

**响应**：204 No Content

------

## 五、订单

### POST `/orders`

**请求体**：

```json
{
  "variation_id": 205,
  "quantity": 2,
  "points_to_use": 0,
  "shipping_address": {
    "name": "张三",
    "phone": "13800138000",
    "province": "黑龙江省",
    "city": "哈尔滨市",
    "district": "五常市",
    "detail_address": "XX镇XX村稻花香农场1号",
    "postcode": "150200"   // ← 可选
  }
}
```

**成功响应（201）**：

```json
{
  "order_id": 1001,
  "order_number": "1001",
  "status": "pending",
  "total": "116.00",
  "items": [
    {
      "product_id": 101,
      "variation_id": 205,
      "quantity": 2,
      "price": "58.00"
    }
  ],
  "payment_qr_url": "https://yourdomain.com/uploads/pay-qr.jpg",
  "customer_service_qr": "https://yourdomain.com/uploads/cs-qr.jpg",
  "message": "请扫码向客服付款，并添加企业微信发送付款截图，我们将尽快为您发货。"
}
```

> 可选参数 `points_to_use` 将触发 `Order_Controller::calculate_points_discount`，若超过可用积分会直接返回错误。**积分扣除时机**：如果使用了积分抵扣，积分会在订单创建时立即扣除（不再等待订单状态变为 processing），确保积分余额准确。扣除记录写入 `myshop_point_ledger` 表，`channel` 为 `order_discount`，`type` 为 `spend`。

------

### GET `/orders`

**用途**：获取当前用户订单列表（含付款凭证状态、审核备注）
**成功响应（200）**：

```json
[
  {
    "order_id": 1001,
    "order_number": "1001",
    "status": "processing",
    "total": "116.00",
    "created_at": "2025-11-20 12:30:00",
    "items": [
      {
        "product_id": 101,
        "variation_id": 205,
        "name": "五常稻花香大米 5kg",
        "quantity": 2,
        "price": "116.00"
      }
    ],
    "tracking_number": "",
    "tracking_company": "",
    "shipped_at": ""
  }
]
```

> ✅ **后端已更新（V2.3.1）**：列表接口不再返回支付相关字段（扫码支付已移除）。

------

### GET `/orders/{order_id}`

**用途**：订单详情页、支付页、支付成功页等均依赖该接口获取完整信息，包括收货地址、积分奖励等。

**成功响应（200）**：

```json
{
  "order_id": 1001,
  "order_number": "1001",
  "status": "pending",
  "total": "116.00",
  "original_total": "116.00",
  "discount_total": "0.00",
  "points_usage": {
    "points_used": 0,
    "discount_amount": "0.00"
  },
  "points_reward": 116,
  "points_earned": 116,
  "reward_points": 116,
  "earned_points": 116,
  "created_at": "2025-11-20 12:30:00",
  "tracking_number": null,
  "tracking_company": null,
  "items": [
    {
      "product_id": 101,
      "variation_id": 205,
      "product_name": "五常稻花香大米 5kg",
      "variation_name": "规格: 5kg | 产地: 五常",
      "quantity": 2,
      "price": "58.00"
    }
  ],
  "shipping_address": {
    "name": "张三",
    "phone": "13800138000",
    "province": "黑龙江省",
    "city": "哈尔滨市",
    "district": "五常市",
    "detail_address": "稻花香农场1号",
    "postcode": "150200"
  },
  "coupon_info": null,
  "gift_card_info": null,
  "is_gift_card_order": false
}
```

> ✅ **后端已更新（V2.3.1）**：
> - 已移除：`payment_qr_url`, `customer_service_qr`, `has_payment_proof`, `payment_proof_url`, `payment_proof_submitted_at`
> - 新增积分奖励字段（多种命名兼容）：`points_reward`, `points_earned`, `reward_points`, `earned_points`
> - `points_reward` 为本次订单预计可获得积分（仅在 pending/on-hold 状态时计算），前端支付页用于提示「本次购买可得积分」。
> - 积分按 1:1 计算（实际应付金额取整）。

------

### POST `/orders/{order_id}/apply-coupon`

**用途**：对指定订单应用优惠券

**路径参数**：

- `order_id`: integer (required)

**请求体**：

```json
{
  "coupon_code": "COUPON123"
}
```

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "order_id": 1001,
    "coupon_code": "COUPON123",
    "discount_amount": "10.00",
    "original_total": "116.00",
    "final_total": "106.00"
  }
}
```

**失败示例（404）**：

```json
{
  "error_code": "coupon_not_found",
  "message": "优惠券不存在",
  "status": 404
}
```

------

### POST `/orders/{order_id}/apply-gift-card`

**用途**：使用储值购物卡支付订单（可部分支付）

**路径参数**：

- `order_id`: integer (required)

**请求体**：

```json
{
  "card_number": "GC20251118001"
}
```

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "order_id": 1001,
    "card_number": "GC20251118001",
    "used_amount": "50.00",
    "remaining_balance": "150.00",
    "original_total": "116.00",
    "final_total": "66.00"
  }
}
```

**失败示例（400）**：

```json
{
  "error_code": "invalid_order_status",
  "message": "当前订单状态不允许使用购物卡",
  "status": 400
}
```

------

### POST `/coupons/validate`

**用途**：验证优惠券是否可用

**请求体**：

```json
{
  "code": "COUPON123"
}
```

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "code": "COUPON123",
    "discount_type": "fixed_cart",
    "amount": 10,
    "description": "新客专享",
    "minimum_amount": null,
    "maximum_amount": null
  }
}
```

**失败示例（400）**：

```json
{
  "error_code": "coupon_invalid",
  "message": "优惠券无效",
  "status": 400
}
```

------

## 六A、支付模块（新增）

> ✅ **后端已更新（V2.3.1）**：小程序内仅支持微信支付（`wechat`），已移除 `offline` 扫码支付选项。

### POST `/payments/create`

**用途**：创建支付单，返回前端拉起微信支付所需参数。

**请求体**：

```json
{
  "order_id": 1001,
  "provider": "wechat"
}
```

`provider` 只支持：`wechat`（默认值）。后续可扩展 `balance | gift_card | other`）

**成功响应（200）**：

微信支付（小程序）：

```json
{
  "success": true,
  "provider": "wechat",
  "order_id": 1001,
  "payment_payload": {
    "appId": "wx1234567890",
    "timeStamp": "1700000000",
    "nonceStr": "random-string",
    "package": "prepay_id=wx1234567890",
    "signType": "RSA",
    "paySign": "signature"
  }
}
```

> **V2.3.2 更新**：新增 `order_id` 字段，返回订单ID便于前端后续查询支付状态。
> 
> `payment_payload` 直接透传给 `wx.requestPayment`，字段名与微信支付小程序规范一致。

**失败示例（400）**：

```json
{
  "error_code": "payment_method_not_supported",
  "message": "仅支持微信支付",
  "status": 400
}
```

------

### GET `/payments/status`

**用途**：查询订单支付状态（便于前端轮询或支付后补偿校验）

**查询参数**：

- `order_id`: integer (required)
- `provider`: string (optional)

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "order_id": 1001,
    "provider": "wechat",
    "status": "paid",
    "paid_at": "2025-11-20T12:45:11+08:00"
  }
}
```

`status` 枚举：`pending | paid | failed | canceled`

------

### POST `/payments/notify/wechat`

**用途**：微信支付回调（服务端使用，前端不调用）

**说明**：
- 需验签（`Wechatpay-Timestamp` / `Wechatpay-Nonce` / `Wechatpay-Signature` / `Wechatpay-Serial`）
- 需解密回调体 `resource`（AES-256-GCM，使用 API v3 Key）
- 成功后将订单状态更新为已支付，并记录 `transaction_id`

------

## 六、虚拟购物卡（二期）

### POST `/gift-cards/redeem`

**请求体**：

```json
{ "card_number": "GC20251118001", "card_pin": "123456" }
```

**成功响应（200）**：

```json
{
  "success": true,
  "message": "礼品卡兑换成功",
  "data": {
    "card_number": "GC20251118001",
    "status": "redeemed"
  }
}
```

**失败示例（401）**：

```json
{
  "code": "card_invalid_pin",
  "message": "礼品卡密码错误",
  "data": {
    "status": 401
  }
}
```

> ⚠️ 现有实现未返回 `available_balance` / `redeemable_items` 等扩展信息，仅标记礼品卡状态；如需更多字段需扩展 `Gift_Card_Controller::redeem_card`。

------

### POST `/gift-cards/{card_id}/reset-pin`

> ⚠️ 当前 `Gift_Card_Controller` 尚未实现该接口，后端无对应路由。

------

### POST `/gift-cards/{card_id}/reveal-pin`

> ⚠️ 当前 `Gift_Card_Controller` 尚未实现该接口，后端无对应路由。

------

### POST `/gift-cards/share`

**用途**：购卡人生成赠礼 token（链接/二维码需由前端或后台模版渲染）

**请求体**：

```json
{
  "card_number": "GC20251118001",
  "delivery_mode": "digital_share",
  "channel": "wechat"
}
```

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "share_token": "SHR20251122XYZ",
    "delivery_mode": "digital_share",
    "channel": "wechat",
    "expires_at": "2025-12-22 23:59:59"
  }
}
```

> 当前实现不会直接生成 `share_url`、`mini_program_qr` 等素材链接，需要结合模板配置自行渲染。

------

### GET `/gift-cards/share/{token}`

**用途**：查询分享 token 当前状态与礼品卡模板信息

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "card_number": "GC20251118001",
    "template_id": 12,
    "template_type": "fixed_amount",
    "initial_amount": "200.00",
    "balance": "200.00",
    "expires_at": "2026-11-18 23:59:59",
    "share_channel": "wechat",
    "share_token_expires_at": "2025-12-22 23:59:59",
    "status": "active",
    "bind_status": "unbound",
    "template": {
      "id": 12,
      "name": "稻香 200 元礼卡",
      "type": "fixed_amount",
      "fixed_amount": "200.00",
      "delivery_modes": ["digital_share"],
      "valid_days": 365
    }
  }
}
```

> 若 token 已失效会返回 `share_expired`/410；若已被领取会返回当前绑定状态供前端提示。

------

### POST `/gift-cards/share/{token}/claim`

**用途**：受赠用户通过分享 token 领取礼品卡

**路径参数**：`token`

**请求体**：_无（仅需携带 JWT）_

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "card_number": "GC20251118001",
    "status": "bound"
  }
}
```

**失败示例（410）**：

```json
{
  "code": "share_expired",
  "message": "分享链接已过期",
  "data": {
    "status": 410
  }
}
```

------

### GET `/gift-cards`

> ⚠️ 文档冻结版本中的 `/gift-cards/mine` 在当前插件中并未注册，对应功能由 `/gift-cards` 提供。

**成功响应（200）**：

```json
{
  "success": true,
  "data": [
    {
      "card_number": "GC20251118001",
      "status": "active",
      "bind_status": "unbound",
      "template_type": "fixed_amount",
      "template_name": "稻香 200 元礼卡",
      "initial_amount": "200.00",
      "balance": "200.00",
      "currency": "CNY",
      "expires_at": "2026-11-18T23:59:59+08:00",
      "purchaser_id": 42,
      "redeemer_id": null,
      "can_reset_pin": false,
      "share_channel": "wechat",
      "created_at": "2025-11-22 09:00:00",
      "updated_at": "2025-11-22 09:00:00"
    }
  ]
}
```

> 若模板名称、重置密码能力等衍生字段不可用，则返回 `null`；前端需要根据 `can_reset_pin` 决定是否展示“重置密码”入口。

------

### GET `/gift-cards/share-styles`

**用途**：获取可用的分享样式列表（分享海报/卡片样式）

**成功响应（200）**：

```json
{
  "success": true,
  "data": [
    {
      "theme": "default",
      "title": "默认样式",
      "preview_url": "https://yourdomain.com/wp-content/plugins/myshop-core/assets/giftcard/share-default.json"
    }
  ]
}
```

------

## 七、积分中心（二期）

### GET `/points/balance`

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "available": 260,
    "pending": 20,
    "frozen": 0,
    "expiring_soon": 40,
    "expiring_date": "2025-12-31",
    "recent_earnings": 60,
    "total_earned": 560,
    "total_spent": 300
  }
}
```

> `frozen` 表示订单待确认的已预占积分；`expiring_soon` / `expiring_date` 用于展示即将过期提醒，均从 `myshop_points_ledger` 聚合。`recent_earnings` 表示近 30 天累计获得积分，可用于仪表盘动态提示。

------

### GET `/points/ledger`

**查询参数**：

- `page` / `per_page`
- `type`: `earn | spend | expire | refund`
- `status`: `pending | confirmed`
- `from` / `to`: `YYYY-MM-DD`（可选，按 `created_at` 过滤）

**成功响应（200）**：

```json
{
  "success": true,
  "data": [
    {
      "id": 9001,
      "type": "earn",
      "delta": 60,
      "balance_after": 260,
      "status": "confirmed",
      "channel": "order_complete",
      "reference_order_id": 1005,
      "reservation_id": null,
      "expire_at": "2026-11-21",
      "created_at": "2025-11-21 12:00:00",
      "description": "订单 1005 完成"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 35,
    "total_pages": 2
  }
}
```

> `description` 字段尚未存储，前端可根据 `channel` / `type` 组合出展示文案。

------

### POST `/points/spend`

**请求体**：

```json
{ "points": 120, "reason": "order_discount" }
```

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "new_balance": 140,
    "deducted": 120
  }
}
```

**失败示例（400）**：

```json
{
  "code": "insufficient_points",
  "message": "积分不足",
  "data": {
    "status": 400
  }
}
```

------

### POST `/points/grant`（内部管理接口）

**用途**：运营或脚本向指定用户发放积分，需要具备 `manage_options` 权限或携带 `X-Myshop-Admin-Key`。

**请求体**：

```json
{
  "points": 200,
  "reason": "manual_grant",
  "target_user_id": 42
}
```

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "target_user_id": 42,
    "new_balance": 460,
    "granted": 200
  }
}
```

> 旧文档中的 `/points/redeem`（reserve/confirm/release）尚未落地实现。

------

### GET `/points/settings`

**用途**：获取积分抵扣相关配置（用于下单页计算抵扣规则）

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "enable_points_discount": true,
    "redeem_rate": 100,
    "min_points_to_use": 100,
    "max_discount_percent": 50,
    "min_order_amount_to_use": 0
  }
}
```

------

### 积分中心模块设计

| 模块 | 描述 | 关键接口 |
| --- | --- | --- |
| 汇总看板 | 展示可用/冻结/待入账/即将过期积分，以及最近获得积分 | `GET /points/balance` |
| 积分流水 | 分页筛选积分增减记录，支持类型/日期过滤 | `GET /points/ledger` |
| 获取规则 | 固定规则（下单返积分、邀请奖励、每日签到等） | `GET /points/rules` |
| 任务中心 | 运营投放的限时任务（完善资料、首次下单等），完成后可领取一次性积分 | `GET /points/missions`、`POST /points/missions/{mission_id}/claim` |
| 积分兑换 | 使用积分兑换优惠券或礼品卡，或折抵订单金额 | `GET /points/redeem/options`、`POST /points/redeem`、`POST /orders (points_to_use)` |
| 到期提醒 | 查询 30 天内过期积分，用于 UI 和消息推送 | `GET /points/balance`（`expiring_soon` 字段） |

#### GET `/points/rules`

**用途**：前端渲染“积分规则说明”列表，便于与运营约定的文案保持一致。

**成功响应（200）**：

```json
{
  "success": true,
  "data": [
    {
      "rule_id": "order_reward",
      "title": "下单返积分",
      "description": "每消费 1 元获得 1 积分，订单完成后发放",
      "status": "active"
    },
    {
      "rule_id": "referral_reward",
      "title": "邀请好友注册",
      "description": "好友首单完成后额外获得 50 积分",
      "status": "active"
    }
  ]
}
```

> 规则内容来自 `myshop_points_rules` 或配置文件，便于非技术同学维护。

#### GET `/points/missions`

**用途**：任务中心列表（可配置任务展示顺序、有效期、奖励积分、完成条件）。

**成功响应（200）**：

```json
{
  "success": true,
  "data": [
    {
      "mission_id": "complete_profile",
      "title": "完善个人资料",
      "description": "补齐昵称、真实姓名、手机号",
      "reward_points": 30,
      "status": "available",
      "progress": 1,
      "goal": 1,
      "expires_at": null
    },
    {
      "mission_id": "first_order",
      "title": "完成首单",
      "description": "首次付款后额外奖励 100 积分",
      "reward_points": 100,
      "status": "completed",
      "progress": 1,
      "goal": 1,
      "completed_at": "2025-11-22 10:30:00"
    }
  ]
}
```

#### POST `/points/missions/{mission_id}/claim`

**用途**：用户满足条件后主动领取任务奖励（防止重复发放）。

```json
{
  "success": true,
  "data": {
    "mission_id": "complete_profile",
    "awarded_points": 30,
    "new_balance": 290
  }
}
```

#### GET `/points/redeem/options`

**用途**：列出可兑换的优惠券、礼品卡或实物（积分商城）。

```json
{
  "success": true,
  "data": [
    {
      "option_id": "coupon_10",
      "type": "coupon",
      "title": "10 元无门槛券",
      "cost_points": 120,
      "stock": 999,
      "description": "适用全场，自兑换起 7 天有效",
      "status": "active"
    },
    {
      "option_id": "giftcard_50",
      "type": "gift_card",
      "title": "50 元礼品卡",
      "cost_points": 500,
      "status": "coming_soon"
    }
  ]
}
```

#### POST `/points/redeem`

**用途**：扣减积分并发放兑换物（优惠券码、礼品卡、虚拟商品）。

```json
{
  "option_id": "coupon_10"
}
```

**成功响应（200）**：

```json
{
  "success": true,
  "data": {
    "option_id": "coupon_10",
    "awarded_coupon_code": "CPN-2025-001234",
    "cost_points": 120,
    "new_balance": 140
  }
}
```

> 若库存不足或积分不足，分别返回 `option_out_of_stock` / `insufficient_points`。

#### 与下单抵扣的结合

- `POST /orders` 支持 `points_to_use` 字段，**积分在订单创建时立即扣除**（不再预占），扣除记录状态为 `confirmed`，确保积分余额准确。若订单取消则通过退款机制退还积分。
- `myshop_points_ledger` 中 `reservation_id` 可追踪每次下单抵扣记录，便于在流水详情中跳转到订单页面。
- 前端在订单确认页展示「可用积分/本单最多可抵扣」提示，调用 `GET /points/balance` 获取 `available` 值并计算最大抵扣额度。

#### 积分中心前端信息架构（Taro 小程序）

- `/pages/points/summary`: 展示可用积分、即将过期、任务入口、兑换入口、规则说明。
- `/pages/points/ledger`: 支持筛选 `type/status/date`，并提供跳转到相关订单或任务详情。
- `/pages/points/missions`: 列出任务并在满足条件后调用 `claim`。
- `/pages/points/redeem`: 展示兑换选项、库存、所需积分，调用 `/points/redeem` 完成兑换。
- `/pages/points/rules`: 静态或动态文案，调用 `GET /points/rules`。

> 以上页面需结合登录态与接口权限，未登录时统一跳转登录页。

------

## 八、消费者分销（二级裂变）

### GET `/referrals/my-downlines`

**成功响应（200）**：

```json
{
  "downlines": [
    {
      "user_id": 201,
      "phone": "139****1234",
      "registered_at": "2025-11-10T10:00:00+08:00",
      "level": 1,
      "first_order_status": "completed",
      "total_orders": 3,
      "lifetime_value": "486.00",
      "channel_code": "xhs-202511"
    },
    {
      "user_id": 202,
      "phone": "137****5678",
      "registered_at": "2025-11-15T14:30:00+08:00",
      "level": 2,
      "first_order_status": "pending",
      "total_orders": 0,
      "lifetime_value": "0.00",
      "channel_code": null
    }
  ],
  "summary": {
    "level1_count": 12,
    "level2_count": 36,
    "first_order_completed": 18
  }
}
```

`first_order_status` 枚举：`"pending" | "completed" | "expired"`

------

### GET `/commissions`

**成功响应（200）**：

```json
{
  "commissions": [
    {
      "id": 101,
      "order_id": 1001,
      "amount": "11.60",
      "commission_type": "referral",
      "level": 1,
      "channel": "xiaohongshu",
      "status": "pending",
      "created_at": "2025-11-18T20:00:00+08:00",
      "expected_payout_at": "2025-11-30T23:59:59+08:00"
    }
  ],
  "summary": {
    "pending_total": "128.40",
    "approved_total": "86.20",
    "paid_total": "215.00",
    "available_for_withdrawal": "86.20"
  }
}
```

`commission_type` 枚举：`"referral" | "agent"`
`status` 枚举：`"pending" | "approved" | "rejected" | "paid"`

------

### POST `/commissions/payout`

**用途**：运营/财务在小程序后台触发佣金打款或审核动作
**请求体**：

```json
{
  "commission_ids": [101, 102, 103],
  "action": "approve",
  "note": "11 月第一批佣金审核通过"
}
```

`action` 枚举：`"approve" | "reject" | "mark_paid"`

**成功响应（200）**：

```json
{
  "processed": [101, 102, 103],
  "failed": []
}
```

**失败示例（409）**：

```json
{
  "error_code": "payout_in_progress",
  "message": "佣金正在处理，请稍后重试",
  "status": 409
}
```

------

## 九、代理商体系（二期）

### POST `/agents/apply`

**用途**：现有用户提交代理申请，按“大区 → 省 → 市”归档，并可指定上级。

**请求体**：

```json
{
  "region_zone": "华南大区",
  "region_province": "广东省",
  "region_city": "深圳市",
  "level": 1,
  "parent_agent_code": "AGT001",
  "team_target": {
    "monthly_gmv": 100000
  }
}
```

- `region_zone` **必填**；`region_province` 通常必填（申报“大区代理”时可留空，但此时 `region_city` 也必须为空），`region_city` 可按城市/地市/区县精确到三级；用于区域统计与排重。
- `parent_agent_code` 仅二级代理填写；若为空默认直属总部。
- 同一区域组合（`region_zone + region_province + region_city`，city 为空则精确到省）仅允许一个处于 `active/pending/frozen` 状态的代理；若被占用返回 `409` + `region_occupied`。
- 同一用户可以在不同地区拥有多条代理记录，系统会生成唯一 `region_key` 并在 `GET /agents/profile` 的 `assignments` 字段中返回所有持有区域。
- 每次签约默认有效期 365 天（可由运营在后台重置 `active_until`），接口返回 `is_active` + `active_until` 用于前端倒计时。
- 城市级代理未传 `parent_agent_code` 时，系统会自动查找所属省级（`region_city` 为空的记录）并建立上下级；省级代理更换后会自动重绑该省的所有城市代理。

**成功响应（201）**：

```json
{
  "agent_code": "AGT210",
  "status": "active",
  "region_zone": "华南大区",
  "region_province": "广东省",
  "region_city": "深圳市",
  "level": 1,
  "parent_agent_id": 8,
  "active_until": "2026-11-25T10:00:00+08:00",
  "is_active": true
}
```

`status` 枚举：`"pending" | "active" | "rejected" | "frozen"`

------

### GET `/agents/me`

**成功响应（200）**：

```json
{
  "is_agent": true,
  "agent_code": "AGT105",
  "is_active": true,
  "active_until": "2026-06-01T10:00:00+08:00",
  "level": 1,
  "parent_agent_id": 42,
  "region_zone": "东北大区",
  "region_province": "黑龙江省",
  "region_city": "哈尔滨市",
  "region_label": "东北大区 / 黑龙江省 / 哈尔滨市",
  "status": "active",
  "joined_at": "2025-06-01T10:00:00+08:00",
  "total_downline_agents": 3,
  "team_sales_amount": "12800.00",
  "team_order_count": 86,
  "pending_commission_total": "1680.00",
  "monthly_growth_rate": "18.5%",
  "targets": {
    "month": "2025-11",
    "sales_target": "20000.00",
    "sales_progress": 0.64,
    "new_client_target": 20,
    "new_client_progress": 0.55
  },
  "recent_highlights": [
    {
      "order_id": 1201,
      "order_amount": "680.00",
      "commission_estimate": "68.00",
      "created_at": "2025-11-21T16:30:00+08:00"
    }
  ],
  "assignments": [
    {
      "agent_code": "AGT105",
      "level": 1,
      "region_zone": "东北大区",
      "region_province": "黑龙江省",
      "region_city": "哈尔滨市",
      "status": "active",
      "is_active": true,
      "active_until": "2026-06-01T10:00:00+08:00",
      "joined_at": "2025-06-01T10:00:00+08:00"
    }
  ]
}
```

`status` 枚举：`"active" | "frozen" | "terminated"`

------

### GET `/agents/downlines`

**成功响应（200）**：

```json
{
  "downlines": [
    {
      "agent_user_id": 201,
      "agent_code": "AGT201",
      "registered_at": "2025-11-10T10:00:00+08:00",
      "level": 2,
      "status": "active",
      "region_zone": "东北大区",
      "region_province": "辽宁省",
      "region_city": "沈阳市",
      "region_label": "东北大区 / 辽宁省 / 沈阳市",
      "sales_amount": "5600.00",
      "team_sales_amount": "8200.00",
      "active_clients": 12,
      "last_active_at": "2025-11-21T19:00:00+08:00",
      "channel_code": "wechat-group"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  },
  "summary": {
    "level1_count": 2,
    "level2_count": 1,
    "team_sales_amount": "21000.00"
  }
}
```

`status` 枚举：`"active" | "frozen" | "terminated"`

------

### GET `/agents/commissions`

**成功响应（200）**：

```json
{
  "commissions": [
    {
      "id": 201,
      "order_id": 1005,
      "amount": "128.00",
      "commission_type": "agent",
      "status": "pending",
      "created_at": "2025-11-18T20:00:00+08:00",
      "settlement_batch": "2025-11-W3",
      "note": "待发放"
    }
  ],
  "summary": {
    "pending_total": "256.00",
    "approved_total": "512.00",
    "paid_total": "1,024.00"
  }
}
```

------

### GET `/agents/team-stats`

**查询参数**：

| 字段 | 说明 |
| --- | --- |
| `agent_code` | 可选，当用户持有多条代理记录时用于指定要查看的区域，缺省时按等级/入驻时间倒序取第一条 |

**用途**：代理商查看直属 + 间接团队规模、近期入驻情况与佣金汇总。

**成功响应（200）**：

```json
{
  "agent_code": "AGT210",
  "direct_agents": 2,
  "indirect_agents": 5,
  "team_total_agents": 7,
  "pending_commission": "1680.00",
  "paid_commission": "820.00",
  "recent_team_members": [
    {
      "user_id": 201,
      "nickname": "广州城市合伙人",
      "level": 2,
      "depth": 1,
      "joined_at": "2025-11-20T10:00:00+08:00"
    },
    {
      "user_id": 302,
      "nickname": "深圳旗舰店",
      "level": 2,
      "depth": 2,
      "joined_at": "2025-11-18T09:30:00+08:00"
    }
  ]
}
```

`depth` 表示与当前代理的层级距离：1=直属城市代理，2=城市代理的直属队员，以此类推。

------

## 十、错误响应规范（全局统一）

所有错误返回 JSON，HTTP 状态码 + 结构化错误：

```json
{
  "error_code": "invalid_card",
  "message": "卡号无法使用",
  "status": 400
}
```

### 标准错误码表

| error_code             | HTTP 状态 | message                        | 触发场景                 |
| ---------------------- | --------- | ------------------------------ | ------------------------ |
| `invalid_token`        | 401       | "Token 无效或已过期"           | JWT 失效                 |
| `missing_param`        | 400       | "缺少参数: {field}"            | 请求体缺失必填字段       |
| `invalid_card`         | 400       | "卡号无法使用"                 | 卡不存在或未绑定当前用户 |
| `gift_card_not_found`  | 404       | "购物卡不存在"                 | card_number 无效         |
| `not_card_owner`       | 403       | "无权操作此购物卡"             | 非购卡人重置密码         |
| `card_already_bound`   | 409       | "该购物卡已被其他账号绑定"     | 兑换已绑定账户           |
| `already_redeemed`     | 409       | "购物卡已被兑换"               | 卡状态非 active          |
| `card_expired`         | 410       | "购物卡已过期"                 | 超过有效期               |
| `card_locked`          | 423       | "购物卡已锁定，请联系客服"     | 后台主动锁定             |
| `insufficient_card_balance` | 409  | "购物卡余额不足"               | 抵扣金额超出余额         |
| `share_token_active`   | 409       | "当前赠礼链接仍在有效期内"     | 生成分享包时重复创建     |
| `share_token_invalid`  | 410       | "分享链接已失效，请联系购卡人重新生成" | 受赠人使用过期/失效链接 |
| `invalid_verification_code` | 400  | "验证码错误或已失效"          | 二次验证验证码错误       |
| `points_not_enough`    | 409       | "可用积分不足"                 | 预占/抵扣积分超出可用额度 |
| `points_action_invalid`| 400       | "积分操作类型不支持"          | `action` 非 reserve/confirm/release |
| `points_reservation_not_found` | 404 | "未找到积分预占记录"        | confirm/release 时预占不存在 |
| `poster_not_found`     | 404       | "未找到可用的海报模板"       | `template_code` 无效或已下线 |
| `order_not_found`      | 404       | "订单不存在"                   | 订单ID无效               |
| `not_authorized_agent` | 403       | "您不是代理商，无权访问此接口" | 非代理商调用 `/agents/*` |
| `region_occupied`      | 409       | "该区域已有代理，请选择其他区域" | 重复申请相同区域的代理 |
| `upload_failed`        | 422       | "图片上传失败"                 | 付款截图上传异常         |
| `payout_in_progress`   | 409       | "佣金正在处理，请稍后重试"     | 佣金批次锁定             |
| `out_of_stock`         | 409       | "商品库存不足"                 | 下单或加购时库存不足     |

------

## 十一、三期扩展预留路径（冻结占位，当前不实现）

> 以下路径已预留，未来直接启用，**不得用于其他功能**：
>
> - `POST /auth/phone-login` ← 手机号验证码登录
> - `GET /members/benefits` ← 会员权益查询
> - `POST /agents/apply` ← 代理商申请入口

------

## 十二、冻结承诺

本契约 V2.3 中以下内容 **永久不可变更**：

- 所有 **URL 路径**（如 `/v1/orders`）
- 所有 **请求/响应字段名**（如 `invite_code`, `agent_code`, `variation_id`）
- 所有 **枚举值**（如 `commission_type`: `"referral"` / `"agent"`）
- 所有 **错误码**（`error_code`）

新功能只能通过 **新增接口** 实现。

------

**文档版本**：V2.3（最终冻结基线）
**最后更新**：2025年11月22日
**作者**：超级工程师（AI 助理）
**状态**：✅ 可作为开发、测试、验收唯一标准

------

请保存此文档为：
📄 **`08_API_CONTRACT_V2.3.md`**

确认后，我将基于 **《数据模型 V2.1》+《API 契约 V2.3》** 输出全部代码。

