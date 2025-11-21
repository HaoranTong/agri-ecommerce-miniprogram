

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

**用途**：获取小程序启动所需公共配置
**成功响应（200）**：

```json
{
  "payment_qr_url": "https://yourdomain.com/uploads/qr.jpg",
  "customer_service_qr": "https://yourdomain.com/uploads/cs.jpg",
  "home_slider": [
    {
      "img": "https://yourdomain.com/uploads/slide1.jpg",
      "link": "/pages/product?id=101"
    }
  ]
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
          "stock_status": "instock"
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

## 三、购物车

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
      "image_url": "https://.../product.jpg"
    }
  ],
  "total_quantity": 2,
  "subtotal": "116.00"
}
```

### POST `/cart`

**请求体**：

```json
{ "product_id": 101, "variation_id": 205, "quantity": 1 }
```

**响应**：同 GET `/cart`

### DELETE `/cart`

**用途**：清空购物车
**响应**：204 No Content

------

## 四、订单

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

### POST `/orders/upload-payment-proof`

**用途**：上传付款截图（multipart/form-data）
**字段**：

- `order_id`: integer (required)
- `proof_image`: file (required, image/jpeg or image/png)

**成功响应（200）**：

```json
{ "success": true, "message": "付款凭证已提交，请等待审核" }
```

------

## 五、虚拟购物卡（二期）

### POST `/gift-cards/redeem`

**请求体**：

```json
{ "card_number": "GC20251118001", "pin_code": "123456" }
```

**成功响应（200）**：

```json
{
  "success": true,
  "message": "兑换成功！卡内余额 ¥200.00",
  "balance": "200.00",
  "expires_at": "2026-11-18T23:59:59+08:00",
  "template_type": "fixed_amount"
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
{ "success": true, "message": "密码已更新" }
```

------

### GET `/gift-cards/mine`

**成功响应（200）**：

```json
{
  "cards": [
    {
      "card_number": "GC20251118001",
      "balance": "200.00",
      "expires_at": "2026-11-18T23:59:59+08:00",
      "status": "active",
      "template_name": "200元通用卡",
      "can_reset_pin": true
    }
  ]
}
```

------

## 六、消费者分销（二级裂变）

### GET `/referrals/my-downlines`

**成功响应（200）**：

```json
{
  "downlines": [
    {
      "user_id": 201,
      "phone": "139****1234",
      "registered_at": "2025-11-10T10:00:00+08:00",
      "level": 1
    },
    {
      "user_id": 202,
      "phone": "137****5678",
      "registered_at": "2025-11-15T14:30:00+08:00",
      "level": 2
    }
  ]
}
```

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
      "status": "pending",
      "created_at": "2025-11-18T20:00:00+08:00"
    }
  ]
}
```

------

## 七、代理商体系（二期）

### GET `/agents/me`

**成功响应（200）**：

```json
{
  "is_agent": true,
  "agent_code": "AGT105",
  "level": 1,
  "parent_agent_id": 42,
  "total_downline_agents": 3,
  "total_sales_amount": "12800.00"
}
```

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
      "sales_amount": "5600.00"
    }
  ]
}
```

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
      "created_at": "2025-11-18T20:00:00+08:00"
    }
  ]
}
```

------

## 八、错误响应规范（全局统一）

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
| `not_card_owner`       | 403       | "无权操作此购物卡"             | 非购卡人重置密码         |
| `already_redeemed`     | 409       | "购物卡已被兑换"               | 卡状态非 active          |
| `order_not_found`      | 404       | "订单不存在"                   | 订单ID无效               |
| `not_authorized_agent` | 403       | "您不是代理商，无权访问此接口" | 非代理商调用 `/agents/*` |
| `upload_failed`        | 400       | "图片上传失败"                 | 付款截图上传异常         |
| `out_of_stock`         | 400       | "商品库存不足"                 | 下单时库存不足           |

------

## 九、三期扩展预留路径（冻结占位，当前不实现）

> 以下路径已预留，未来直接启用，**不得用于其他功能**：
>
> - `POST /payments/wechatpay/notify` ← 微信支付回调
> - `POST /auth/phone-login` ← 手机号验证码登录
> - `GET /members/benefits` ← 会员权益查询
> - `POST /agents/apply` ← 代理商申请入口

------

## 十、冻结承诺

本契约 V2.3 中以下内容 **永久不可变更**：

- 所有 **URL 路径**（如 `/v1/orders`）
- 所有 **请求/响应字段名**（如 `invite_code`, `agent_code`, `variation_id`）
- 所有 **枚举值**（如 `commission_type`: `"referral"` / `"agent"`）
- 所有 **错误码**（`error_code`）

新功能只能通过 **新增接口** 实现。

------

**文档版本**：V2.3（最终冻结基线）
**最后更新**：2025年11月18日
**作者**：超级工程师（AI 助理）
**状态**：✅ 可作为开发、测试、验收唯一标准

------

请保存此文档为：
📄 **`API_CONTRACT_V2.3.md`**

确认后，我将基于 **《数据模型 V2.1》+《API 契约 V2.3》** 输出全部代码。