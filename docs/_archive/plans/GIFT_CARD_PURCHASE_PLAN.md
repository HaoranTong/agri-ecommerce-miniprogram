# 礼品卡购卡流程整体设计

> 目标：为礼品卡模板提供符合 C 端体验的购卡流程，并根据模板类型（储值卡 fixed_amount / 固定组合 product_bundle / 任意组合 custom_bundle）走不同路径，同时在成功后将卡片统一沉淀到“我的礼品卡”中，并指导用户如何查看、分享与使用。

---

## 1. 模板数据扩展

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `purchase_flow` | `stored_value | bundle | custom` | 新增枚举，用于前端决定跳转逻辑：储值卡、固定组合、任意组合 |
| `amount_options` | `json` | 储值卡可选金额列表（如 `[100, 200, 500]`），为空则允许输入自定义金额 |
| `min_amount` / `max_amount` | `decimal` | 储值卡自定义金额上下限 |
| `bundle_items` | `json` | 固定组合包含的 SKU 及数量，已存在字段，需明确结构并在前端展示 |
| `allowed_product_ids` | `json` | 任意组合可选商品 ID 列表，空表示不限 |
| `allowed_variation_ids` | `json` | 任意组合允许的变体 ID，优先级高于 `allowed_product_ids` |
| `max_items` / `max_total` | `int/decimal` | 任意组合可选数量 / 金额上限，可选字段 |
| `success_copywriting` | `text` | 成功提示文案，必带“去礼品卡中心查看”说明；若为空由前端使用默认模板 |

> **后台改动**：`gift_card_templates` 表新增字段；后台配置页增加对应输入项并做校验。

---

## 2. 前端页面 & 流程

### 2.1 模板列表（`pages/giftcard/templates`）
- 根据模板的 `purchase_flow` 决定 CTA 行为：
  - `stored_value`：弹出金额选择 → 调起支付 → 成功提示。
  - `bundle`：`navigateTo('/pages/giftcard/bundle-detail?id=...')`。
  - `custom`：`navigateTo('/pages/giftcard/custom-builder?id=...')`。
- 强化列表卡片信息：权益说明 / 使用步骤简述 / 查看方式提示。

### 2.2 储值卡弹窗（新组件 `StoredValuePurchaseModal`）
- 输入金额或选择预设金额，展示有效期、交付方式等。
- 点击“去支付”后：
  1. 创建一笔“礼品卡储值订单”（调用新接口 `POST /gift-cards/stored-value-orders` 或复用 `orderService.createOrder` + `giftcard_mode=stored_value`）。
  2. 调起支付/上传凭证，与现有订单支付体验保持一致（可跳转至 `pages/order/order-confirm`）。
  3. 支付成功后调用 `/gift-cards/purchase` 生成卡号 + PIN，并落库到“我的礼品卡”。
- 成功弹窗文案：`卡号：xxx，PIN：yyy，可在“我的礼品卡”查看与分享`。

### 2.3 固定组合详情页（`pages/giftcard/bundle-detail`）
- 展示组合的 SKU 列表（封面图、名称、数量、单价）及总价。
- CTA：“赠送此组合” → 跳转下单页 `pages/giftcard/bundle-checkout`。
- 下单页表单字段：
  - 赠言（可选）、送达方式提示。
  - 省略收货地址；使用“收件人昵称/手机号”字段帮助受赠人识别。
  - 走 `orderService.createOrder`，参数需增加 `giftcard_mode='bundle'` 与 `giftcard_template_id`。
- 支付成功后：
  - 后端监听订单状态=已支付 → 生成礼品卡并推送到 `gift_cards` 表。
  - 前端成功页提示“礼品卡已生成，去礼品卡中心查看”。

### 2.4 任意组合构建页（`pages/giftcard/custom-builder`）
- 进入页面时根据模板配置过滤商品列表（可复用商品接口 + 前端筛选）。
- 用户可多选商品/SKU，并设置数量，展示“已选商品清单 + 金额统计 + 上限校验”。
- 点击“生成礼品卡订单”进入 `pages/giftcard/custom-checkout`：
  - 表单同上，无收货地址。
  - 提交时附带所选商品数组 `selected_items`，后端据此冻结权益。
- 支付 / 成功逻辑与固定组合一致。

### 2.5 礼品卡中心（`pages/giftcard/mine` / `share`）
- 新增入口提示：若用户刚完成购卡，携带 `?new=1` 时展示成功 banner 或 toast，引导“立即分享”。
- Share 页保持可预选卡号的能力。

---

## 3. 后端接口改造

1. **订单创建**
   - `POST /orders` 支持额外字段：
     ```json
     {
       "giftcard_mode": "bundle|custom|stored_value",
       "giftcard_template_id": 12,
       "giftcard_payload": {
         "selected_items": [ {"variation_id": 123, "quantity": 2} ],
         "message": "祝你生日快乐"
       }
     }
     ```
   - 当 `giftcard_mode` 存在时：
     - 忽略/不要求 `shipping_address`。
     - 订单完成后不触发发货，而是写入礼品卡记录。

2. **支付回调 / 管理端确认**
   - 在订单状态从 `processing` 进入 `completed`（或支付凭证审核通过）时：
     - 根据 `giftcard_template_id` 生成礼品卡，模板类型决定权益生成逻辑：
       - `stored_value`：金额来自订单总额或模板固定值；调用现有 `purchase_card` 核心函数。
       - `bundle`：写入 `bundle_items`，并在礼品卡记录中保存订单快照供兑换时参考。
       - `custom`：写入用户自选的 SKU 明细，可作为后续兑换订单的数据源。
   - 生成后通过 REST 返回 `card_number` 等信息给前端（例如支付成功页轮询或主动刷新）。

3. **新接口**
   - `GET /gift-cards/templates/:id`：已存在，需补充 `purchase_flow` 等新字段。
   - （可选）`POST /gift-cards/purchase/stored-value`：如果希望与订单系统解耦，可提供直接生成储值卡并返回支付信息的接口。
   - `POST /gift-cards/orders/:orderId/issue`：管理员可手动补发礼品卡。

---

## 4. 任务排期建议

1. **阶段一：储值卡闭环**
   - 完成模板数据字段、储值卡弹窗、下单/支付/发卡逻辑。
   - 目标是最快验证“真实支付→礼品卡到账”链路。

2. **阶段二：固定组合**
   - 新增组合详情/下单页，后端根据订单生成礼品卡，并在礼品卡中心展示“组合内容”。

3. **阶段三：任意组合**
   - 搭建自选商品 UI，处理 SKU 限制、金额上限、校验等；完成下单与发卡。

4. **阶段四：联调与体验优化**
   - 补充所有成功页、礼品卡中心的“使用说明”文案，处理异常状态（库存不足、金额超限等）。

---

## 5. 风险与待确认事项

- 支付流程：目前订单支付依赖线下转账 + 上传凭证，储值卡如果需要实时到账，是否要接入微信/支付宝支付？若暂不接入，仍可沿用“上传凭证→管理员审核→发卡”的流程，但需在 UI 中提示“卡片将在审核通过后到账”。
- 兑换逻辑：固定/任意组合生成的礼品卡，后续“领取/兑换”时需要把权益落到订单系统，后端需设计 `gift_card_redemptions` 的 bundle/custom 处理方式（例如生成虚拟订单或兑换记录）。
- 模板权限：是否有部分模板仅内部可见？如果需要，需要在模板表加 `visibility` 字段并在前端判断。

---

以上设计已和当前用户需求对齐，可据此进入实现阶段。
