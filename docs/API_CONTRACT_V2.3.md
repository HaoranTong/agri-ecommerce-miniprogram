

- ✅ 与《数据模型定义 V2.1》字段一一对应  
- ✅ 覆盖一期（MVP）、二期（购物卡 + 分销 + 代理商）全部功能  
- ✅ 预留三期关键扩展路径（不实现但占位）  
- ✅ 所有接口路径、字段名、错误码 **永久冻结，不可变更**  
- ✅ 补全此前遗漏：商品列表、付款截图上传、代理商全套接口

------

# 📡 微信小程序 × WordPress 无头电商系统

## **完整 API 接口契约（V2.3 - 最终冻结基线标准）**

> **文档状态**：✅ 冻结（Final Frozen Baseline）
> **适用项目阶段**：一期（MVP） + 二期（虚拟购物卡 / 社交裂变 / 代理商）
> **Base URL**：`https://yourdomain.com/wp-json/myshop/v1`
> **认证方式**：Bearer JWT Token（通过 `Authorization: Bearer <token>` 传递）
> **编码**：UTF-8
> **时间格式**：ISO 8601（如 `"2025-11-18T21:30:00+08:00"`）
> **冻结规则**：  
>
> - 所有 **URL 路径**、**请求/响应字段名**、**核心语义** 一经发布不得修改  
> - 新功能只能通过 **新增接口** 实现

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
      "description": "产自黑龙江五常核心产区，一年一季新米，真空锁鲜",  // ← 新增
      "is_gift_card": false,
      "image_url": "https://yourdomain.com/wp-content/uploads/2025/11/rice.jpg",
      "variations": [
        {
          "variation_id": 205,
          "attributes": {
            "规格": "5kg",
            "等级": "特级"
          },
          "price": "58.00",
          "stock_status": "instock",
          "image_url": "https://.../5kg.jpg"  // ← 变体独立图
        }
      ]
    },
    {
      "id": 102,
      "name": "200元通用购物卡",
      "type": "variable",
      "is_gift_card": true,
      "image_url": "https://yourdomain.com/wp-content/uploads/2025/11/giftcard.jpg",
      "variations": [
        {
          "variation_id": 206,
          "attributes": {},
          "price": "200.00",
          "stock_status": "instock"
        }
      ]
    }
  ]
}
```

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

**成功响应（200）**：

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx",
  "user_id": 42,
  "is_new": false,
  "phone": "13800138000",
  "wechat_nickname": "🌾五常米农",
  "invite_code": "U42ABC"
}
```

------

### GET `/me`

**用途**：获取当前用户完整资料
**成功响应（200）**：

```json
{
  "user_id": 42,
  "phone": "13800138000",
  "wechat_nickname": "🌾五常米农",
  "wechat_avatar": "https://yourdomain.com/avatar.jpg",
  "invite_code": "U42ABC",
  "referrer_id": 105,
  "total_points": 280,
  "membership_level": "silver",
  "is_agent": false,
  "agent_code": null,
  "has_cart": true
}
```

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
{
  "items": [
    {
      "product_id": 101,
      "variation_id": 205,
      "quantity": 2,
      "product_name": "五常稻花香大米",
      "variation_name": "特级 / 5kg / 新米",
      "price": "58.00",
      "line_subtotal": "116.00",
      "line_total": "96.00",
      "image_url": "https://.../product.jpg",
      "applied_promotions": [],
      "gift_card_credits": [
        {
          "card_number": "GC20251118001",
          "amount": "20.00"
        }
      ]
    }
  ],
  "total_quantity": 2,
  "subtotal": "116.00",
  "discount_total": "0.00",
  "gift_card_total": "20.00",
  "payable_total": "96.00",
  "currency": "CNY",
  "updated_at": "2025-11-22T10:20:00+08:00"
}
```

`gift_card_credits` 仅在小程序端填写抵扣金额时返回，保持与虚拟购物卡余额联动。

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

## 五、订单

### POST `/orders`

**请求体**：

```json
{
  "variation_id": 205,
  "quantity": 2,
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
  "order_number": "#1001",
  "status": "pending_confirmation",
  "total": "116.00",
  "payment_qr_url": "https://.../qr.jpg",
  "customer_service_qr": "https://.../cs.jpg"
}
```

------

### GET `/orders`

**用途**：获取当前用户订单列表（含付款凭证状态、审核备注）
**成功响应（200）**：

```json
{
  "orders": [
    {
      "order_id": 1001,
      "order_number": "#1001",
      "status": "pending_confirmation",
      "total": "116.00",
      "payment_proof_status": "submitted",
      "latest_remark": "客服已收到截图，排队审核",
      "created_at": "2025-11-20T12:30:00+08:00",
      "items": [
        {
          "product_id": 101,
          "variation_id": 205,
          "name": "五常稻花香大米 5kg",
          "quantity": 2,
          "price": "58.00"
        }
      ]
    }
  ]
}
```

`payment_proof_status` 枚举：`"missing" | "submitted" | "approved" | "rejected"`

------

### POST `/orders/upload-payment-proof`

**用途**：上传付款截图（multipart/form-data）
**字段**：

- `order_id`: integer (required)
- `proof_image`: file (required, image/jpeg 或 image/png)

**成功响应（200）**：

```json
{
  "order_id": 1001,
  "payment_proof_status": "submitted",
  "preview_url": "https://yourdomain.com/uploads/orders/1001-proof.jpg"
}
```

**失败示例（422）**：

```json
{
  "error_code": "upload_failed",
  "message": "图片大小超出 5MB 限制",
  "status": 422
}
```

------

## 六、虚拟购物卡（二期）

### POST `/gift-cards/redeem`

**请求体**：

```json
{ "card_number": "GC20251118001", "pin_code": "123456" }
```

**成功响应（200）**：

```json
{
  "card_id": 3001,
  "card_number": "GC20251118001",
  "status": "active",
  "bind_status": "bound",
  "available_balance": "200.00",
  "currency": "CNY",
  "redeemed_by": 42,
  "redeemed_at": "2025-11-22T09:00:00+08:00",
  "expires_at": "2026-11-18T23:59:59+08:00",
  "template_type": "fixed_amount",
  "redeemable_items": [],
  "message": "兑换成功，已绑定至当前账号"
}
```

`template_type` 枚举：`"fixed_amount" | "product_bundle"`
- 当 `template_type = "fixed_amount"` 时，`available_balance` 表示储值余额，可在结算页多次抵扣。
- 当 `template_type = "product_bundle"` 时，响应将包含 `redeemable_items`（如下所示），小程序需调用订单创建接口生成“0 元订单”完成领取：

```json
{
  "card_id": 3002,
  "card_number": "GC20251118002",
  "status": "active",
  "bind_status": "bound",
  "available_balance": "0.00",
  "currency": "CNY",
  "redeemed_by": 42,
  "redeemed_at": "2025-11-22T09:05:00+08:00",
  "expires_at": "2026-05-01T23:59:59+08:00",
  "template_type": "product_bundle",
  "redeemable_items": [
    {
      "product_id": 301,
      "product_name": "有机稻花香礼盒 A",
      "variation_id": 9001,
      "variation_name": "礼盒 A / 标准装",
      "quantity": 1
    }
  ],
  "message": "兑换成功，已解锁礼盒兑换资格"
}
```

**失败示例（409）**：

```json
{
  "error_code": "card_already_bound",
  "message": "该购物卡已被其他账号绑定",
  "status": 409
}
```

------

### POST `/gift-cards/{card_id}/reset-pin`

**请求体**：

```json
{ "new_pin": "654321" }
```

**成功响应（200）**：

```json
{
  "card_id": 3001,
  "card_number": "GC20251118001",
  "status": "active",
  "message": "密码已更新"
}
```

------

### POST `/gift-cards/{card_id}/reveal-pin`

**用途**：购卡人二次验证后重新查看 PIN（超出一次查看限制时使用）
**请求体**：

```json
{
  "verify_channel": "sms",
  "verify_code": "932184"
}
```

`verify_channel` 枚举：`"sms" | "email" | "wechat"`

**成功响应（200）**：

```json
{
  "card_id": 3001,
  "card_number": "GC20251118001",
  "pin_code": "123456",
  "pin_revealed_at": "2025-11-22T15:20:00+08:00",
  "remaining_reveal_times": 0
}
```

**失败示例（423）**：

```json
{
  "error_code": "pin_reveal_limit_reached",
  "message": "PIN 已超过查看次数，请联系客服",
  "status": 423
}
```

------

### POST `/gift-cards/{card_id}/share`

**用途**：购卡人生成新的赠礼资产包（分享链接 / 小程序码 / 打印稿）
**请求体**：

```json
{
  "channel": "wechat",
  "delivery_mode": "digital_share"
}
```

`channel` 枚举：`"wechat" | "dingding" | "email" | "custom"`
`delivery_mode` 枚举：`"digital_share" | "printable"`

**成功响应（201）**：

```json
{
  "share_token": "SHR-20251122-XYZ",
  "share_url": "https://yourdomain.com/gift-card/share/SHR-20251122-XYZ",
  "mini_program_qr": "https://yourdomain.com/qrcode/SHR-20251122-XYZ.png",
  "print_template_url": "https://yourdomain.com/gift-card/print/GC20251118001.pdf",
  "delivery_mode": "digital_share",
  "expires_at": "2025-12-22T23:59:59+08:00"
}
```

**失败示例（409）**：

```json
{
  "error_code": "share_token_active",
  "message": "当前赠礼链接仍在有效期内，请勿重复生成",
  "status": 409
}
```

------

### POST `/gift-cards/claim`

**用途**：受赠人通过分享链接或实体卡输入卡号 + PIN 完成绑定
**请求体**：

```json
{
  "card_number": "GC20251118001",
  "pin_code": "123456",
  "share_token": "SHR-20251122-XYZ"
}
```

`share_token` 可为空（用户直接输入卡号 + PIN 的场景）。

**成功响应（200）**：

```json
{
  "card_id": 3001,
  "bind_status": "bound",
  "status": "active",
  "template_type": "fixed_amount",
  "available_balance": "200.00",
  "currency": "CNY",
  "redeemed_by": 512,
  "redeemed_at": "2025-11-22T19:00:00+08:00"
}
```

**失败示例（410）**：

```json
{
  "error_code": "share_token_invalid",
  "message": "分享链接已失效，请联系购卡人重新生成",
  "status": 410
}
```

------

### GET `/gift-cards/mine`

**成功响应（200）**：

```json
{
  "cards": [
    {
      "card_number": "GC20251118001",
      "template_type": "fixed_amount",
      "initial_amount": "200.00",
      "balance": "180.00",
      "currency": "CNY",
      "expires_at": "2026-11-18T23:59:59+08:00",
      "status": "active",
      "template_name": "200元通用卡",
      "can_reset_pin": true,
      "locked": false,
      "last_used_at": "2025-11-22T10:05:00+08:00",
      "delivery_modes": ["digital_share", "printable"],
      "share_payload": {
        "share_token": "SHR-20251122-ABCD",
        "share_url": "https://yourdomain.com/gift-card/share/SHR-20251122-ABCD",
        "mini_program_qr": "https://yourdomain.com/qrcode/SHR-20251122-ABCD.png",
        "expires_at": "2025-12-22T23:59:59+08:00",
        "allow_reissue": true
      },
      "print_template_url": "https://yourdomain.com/gift-card/print/GC20251118001.pdf",
      "pin_revealed_at": "2025-11-22T10:03:00+08:00",
      "pin_reveal_limit": 1,
      "transactions": [
        {
          "order_id": 1001,
          "used_amount": "20.00",
          "balance_after": "180.00",
          "used_at": "2025-11-22T10:05:00+08:00"
        }
      ]
    },
    {
      "card_number": "GC20251118002",
      "template_type": "product_bundle",
      "bundle_config": {
        "items": [
          {
            "product_id": 301,
            "product_name": "有机稻花香礼盒 A",
            "variation_id": 9001,
            "variation_name": "礼盒 A / 标准装",
            "quantity": 1
          },
          {
            "product_id": 302,
            "product_name": "礼赠组合套装",
            "variation_id": null,
            "quantity": 1
          }
        ]
      },
      "currency": "CNY",
      "expires_at": "2026-05-01T23:59:59+08:00",
      "status": "active",
      "template_name": "稻香礼盒兑换卡",
      "can_reset_pin": false,
      "locked": false,
      "last_used_at": null,
      "redeem_status": "not_redeemed",
      "delivery_modes": ["digital_share"],
      "share_payload": {
        "share_token": "SHR-20251122-EFGH",
        "share_url": "https://yourdomain.com/gift-card/share/SHR-20251122-EFGH",
        "mini_program_qr": "https://yourdomain.com/qrcode/SHR-20251122-EFGH.png",
        "expires_at": "2025-12-22T23:59:59+08:00",
        "allow_reissue": false
      },
      "print_template_url": null,
      "pin_revealed_at": "2025-11-22T10:04:00+08:00",
      "pin_reveal_limit": 1
    }
  ]
}
```

`status` 枚举：`"active" | "locked" | "expired"`
`bundle_config.items[].variation_id` 允许为 `null`，用于单规格商品或礼品组合。
`delivery_modes` 枚举：`"digital_share" | "printable"`

------

## 七、积分中心（二期）

### GET `/points/summary`

**用途**：获取当前用户积分概览及即将过期提醒
**成功响应（200）**：

```json
{
  "total": 280,
  "available": 260,
  "pending": 20,
  "frozen": 0,
  "expiring_soon": {
    "points": 80,
    "expire_at": "2025-12-31"
  },
  "recent_earnings": [
    {
      "order_id": 1005,
      "points": 40,
      "created_at": "2025-11-21T12:00:00+08:00"
    }
  ]
}
```

------

### GET `/points/ledger`

**用途**：按时间倒序分页返回积分流水
**查询参数**：`?page=1&page_size=20&month=2025-11`

**成功响应（200）**：

```json
{
  "entries": [
    {
      "id": 9001,
      "type": "earn",
      "delta": 60,
      "balance_after": 260,
      "reference_order_id": 1005,
      "description": "订单完成赠送积分",
      "created_at": "2025-11-21T12:00:00+08:00",
      "expire_at": "2026-11-21"
    },
    {
      "id": 9002,
      "type": "spend",
      "delta": -40,
      "balance_after": 200,
      "reference_order_id": 1004,
      "description": "订单抵扣积分",
      "created_at": "2025-11-20T09:30:00+08:00",
      "expire_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}
```

`type` 枚举：`"earn" | "spend" | "adjust" | "expire"`

------

### POST `/points/redeem`

**用途**：下单时预占 / 确认 / 释放积分
**请求体**：

```json
{
  "order_id": 1006,
  "points": 120,
  "action": "reserve"
}
```

`action` 枚举：
- `reserve`：预占积分，写入 `status=pending`
- `confirm`：支付完成，固化积分抵扣
- `release`：订单取消/超时，释放积分

**成功响应（200）**：

```json
{
  "order_id": 1006,
  "points_reserved": 120,
  "currency_equivalent": "12.00",
  "status": "pending"
}
```

**失败示例（409）**：

```json
{
  "error_code": "points_not_enough",
  "message": "可用积分不足，当前可用 80",
  "status": 409
}
```

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

### GET `/agents/me`

**成功响应（200）**：

```json
{
  "is_agent": true,
  "agent_code": "AGT105",
  "level": 1,
  "parent_agent_id": 42,
  "region": "黑龙江-哈尔滨",
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
      "region": "辽宁-沈阳",
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

## 十、错误响应规范（全局统一）

所有错误返回 JSON，HTTP 状态码 + 结构化错误：

```json
{
  "error_code": "invalid_card",
  "message": "卡号或密码错误",
  "status": 400
}
```

### 标准错误码表

| error_code             | HTTP 状态 | message                        | 触发场景                 |
| ---------------------- | --------- | ------------------------------ | ------------------------ |
| `invalid_token`        | 401       | "Token 无效或已过期"           | JWT 失效                 |
| `missing_param`        | 400       | "缺少参数: {field}"            | 请求体缺失必填字段       |
| `invalid_card`         | 400       | "卡号或密码错误"               | 卡不存在或 PIN 错        |
| `gift_card_not_found`  | 404       | "购物卡不存在"                 | card_number 无效         |
| `not_card_owner`       | 403       | "无权操作此购物卡"             | 非购卡人重置密码         |
| `card_already_bound`   | 409       | "该购物卡已被其他账号绑定"     | 兑换已绑定账户           |
| `already_redeemed`     | 409       | "购物卡已被兑换"               | 卡状态非 active          |
| `card_expired`         | 410       | "购物卡已过期"                 | 超过有效期               |
| `card_locked`          | 423       | "购物卡已锁定，请联系客服"     | 连续输错 PIN 或后台锁定  |
| `insufficient_card_balance` | 409  | "购物卡余额不足"               | 抵扣金额超出余额         |
| `share_token_active`   | 409       | "当前赠礼链接仍在有效期内"     | 生成分享包时重复创建     |
| `share_token_invalid`  | 410       | "分享链接已失效，请联系购卡人重新生成" | 受赠人使用过期/失效链接 |
| `pin_reveal_limit_reached` | 423  | "PIN 已超过查看次数"          | 购卡人尝试重复查看 PIN   |
| `verification_required` | 401      | "需要先通过二次验证"           | 再次查看 PIN 前未完成验证 |
| `invalid_verification_code` | 400  | "验证码错误或已失效"          | 二次验证验证码错误       |
| `points_not_enough`    | 409       | "可用积分不足"                 | 预占/抵扣积分超出可用额度 |
| `points_action_invalid`| 400       | "积分操作类型不支持"          | `action` 非 reserve/confirm/release |
| `points_reservation_not_found` | 404 | "未找到积分预占记录"        | confirm/release 时预占不存在 |
| `poster_not_found`     | 404       | "未找到可用的海报模板"       | `template_code` 无效或已下线 |
| `order_not_found`      | 404       | "订单不存在"                   | 订单ID无效               |
| `not_authorized_agent` | 403       | "您不是代理商，无权访问此接口" | 非代理商调用 `/agents/*` |
| `upload_failed`        | 422       | "图片上传失败"                 | 付款截图上传异常         |
| `payout_in_progress`   | 409       | "佣金正在处理，请稍后重试"     | 佣金批次锁定             |
| `out_of_stock`         | 409       | "商品库存不足"                 | 下单或加购时库存不足     |

------

## 十一、三期扩展预留路径（冻结占位，当前不实现）

> 以下路径已预留，未来直接启用，**不得用于其他功能**：
>
> - `POST /payments/wechatpay/notify` ← 微信支付回调
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
📄 **`API_CONTRACT_V2.3.md`**

确认后，我将基于 **《数据模型 V2.1》+《API 契约 V2.3》** 输出全部代码。