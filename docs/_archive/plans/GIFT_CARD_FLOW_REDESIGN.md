# 礼品卡流程重构方案（2025-11-28）

## 目标
- 购卡流程与送礼流程彻底解耦：购卡=下单获得资产，送礼=从资产中挑卡生成分享。
- 取消 PIN/卡号输入，受赠人通过二维码/链接进入礼品卡详情，完成收货信息即可兑换。
- 分享产物（二维码/PDF）不在后台落盘，平台只保存必要的元数据，可随时失效或重新生成。
- 购卡人可查看和管理分享状态：未分享、已分享待兑换、已兑换；可撤销分享、重新生成二维码。

## 最新进度（2025-11-29）
- 前端下单页会在礼品卡模式下携带 `giftcard_mode`、`giftcard_template_id` 与上下文 payload，后端保存订单快照。
- `Order_Controller::create` 支持礼品卡订单无需真实收货地址，并将标记/快照写入 `_myshop_*` meta。
- `Gift_Card_Controller::boot` 监听订单状态从“处理中/已完成”触发自动建卡，卡片落库后写回订单备注及 `purchase_order_id`。
- `/gift-cards` 接口新增 `purchase_order_id` 字段，礼品卡列表可以反查原订单；卡包页读取到的数量即为真实资产。

## 状态与字段
| 字段 | 说明 | 备注 |
| --- | --- | --- |
| `status` | `active`、`redeemed`、`expired`、`locked` | 已有 |
| `share_state` *(新逻辑)* | `none`、`shared`、`consumed` | 由 `share_token`、`share_token_expires_at` 推导，无需新增列 |
| `share_token` | 分享二维码关联 token | 每次分享刷新；为空即无分享 |
| `share_token_expires_at` | 分享有效期 | 默认 7 天，可配置 |
| `share_meta` *(新增 JSON 列)* | 记录祝福语、模板、最近生成 PDF 的文件名等 | 仅元数据 |
| `shared_at` *(新增 DATETIME)* | 最近一次分享生成时间 | 便于列表展示与可视化 |
| `shared_count` *(新增 INT)* | 累计分享次数 | 统计/风控 |
| `pin_code_hash` | 迁移后置空 | 购卡仍生成列但保持 NULL |

> 数据库更新：`ALTER TABLE wp_myshop_gift_cards ADD COLUMN share_meta LONGTEXT NULL, ADD COLUMN shared_at DATETIME NULL, ADD COLUMN shared_count INT UNSIGNED NOT NULL DEFAULT 0;` 后续版本号从 1.5.0→1.6.0。

## API 调整
1. **GET `/gift-cards`**：返回新增字段 `share_state`、`share_snapshot`（最近分享的祝福语、二维码模板等）。
2. **POST `/gift-cards/purchase`**：
   - 不再生成/返回 PIN，响应字段改为 `{card_number, template, expires_at}`。
   - `pin_code_hash` 写 NULL。
3. **POST `/gift-cards/share`**：
   - 请求：`{card_number, message?, theme?, channel?, format: 'qr' | 'pdf' | 'both'}`。
   - 行为：校验卡状态→生成新 token → 更新 `shared_at`、`shared_count`、`share_meta`（含 message 及所选模板键）→记录 share log。
   - 响应：`{card_number, share_token, share_url, qr_payload, card_snapshot, pdf_available: boolean}`。
     - `qr_payload` 为 `myshop://giftcard?token=XXX`，由前端渲染二维码。
     - `card_snapshot` 包含卡号、金额、有效期、祝福语等，用于覆盖默认 SVG 模板。
4. **POST `/gift-cards/share/{card_number}/revoke`**：清空 token，标记 share 失效。
5. **GET `/gift-cards/share/{token}`**：返回卡信息 + `share_state`，供受赠人落地页展示。
6. **POST `/gift-cards/share/{token}/redeem`**：
   - 要求登录。
   - 绑定 `redeemer_id`（若空）并创建“礼品卡兑换订单草稿”数据，返回 `order_draft_id` 供前端跳转到填地址/确认界面。
7. **POST `/gift-cards/{card_number}/redeem`**：保留给购卡人自用，不需要 PIN，只能本人调用。
8. **GET `/gift-cards/{card_number}/share-history`**（可选）：返回 share log。

## 前端调整
1. **礼品卡首页（`pages/giftcard/mine`）**
   - 动作改为：「兑换商品」「赠送礼品卡」「卡包管理」（替换旧的“我要自用”）。
   - 卡片展示新增状态 pill（未分享、已分享、已兑换、已过期），显示最近分享时间。
   - “卡包管理”跳转到独立管理页，集中呈现卡片状态与操作。
   - `领取礼品卡` 入口更名为「礼品卡分享记录」或直接下线（受赠人从二维码进入，不再手动输入）。
2. **卡包管理页（`pages/giftcard/manage`，新增）**
   - 展示礼品卡详细信息：卡号、余额、有效期、分享状态、最近操作记录。
   - 操作：查看卡对应的订单详情、重新分享/撤销分享、发起“修改卡号或持有人信息”申请（由客服处理或跳转到表单）、查看分享/兑换日志。
   - 交互：移动端只允许单击选择，底部统一使用“确认”或“去操作”按钮，避免双击。
2. **分享页（`pages/giftcard/share`）**
   - 选择卡 → 填写祝福语 → 生成二维码预览。
   - 生成后展示：二维码（内含 token）、卡号、祝福语、自定义背景（默认使用 `src/assets/icons/gift-card-share-template.svg`）。
   - 提供按钮：`保存到相册`（导出图片）、`生成 PDF`、`重新生成二维码`、`撤销分享`。
3. **受赠人落地页（重写 `pages/giftcard/claim`）**
   - 根据 URL `token` 自动调用 `get_share_detail`，显示卡片摘要。
   - 显示「填写收货信息」按钮→跳转订单确认页（复用现有下单组件，giftcard 模式）。
   - 兑换完成后提示「已领取」，跳转到订单列表或礼品卡中心。
4. **兑换页（`pages/giftcard/redeem`）**
   - 改为「选择礼品卡自用」：列出现有卡→点击卡→跳转订单详情/兑换流程。
   - 移除卡号/PIN 输入。
5. **兑换页（`pages/giftcard/redeem`）**
    - 改为纯“卡片选择 + 确认”流程，点击“兑换商品”按钮后弹出卡片选择器。
    - 选择卡片后，调用后端生成兑换订单草稿并跳转到订单确认页，不再输入卡号/PIN。
6. **服务层 (`giftCardService`)**
   - 更新类型：`GiftCard` 新增 `share_state`, `share_snapshot`, `share_history`。
   - 新增方法：`revokeShare(cardNumber)`, `regenerateShare(cardNumber, payload)`, `redeemToken(token, payload)` 等。

## 购卡体验整合到常规下单
- 点击“任意组合商品卡”等购卡入口后，直接跳转到首页/商品详情，让用户沿用普通购物流程挑选商品。
- 在订单确认页新增「购买礼品卡」选择框：
   - 勾选后提示：“您正在购买礼品卡，付款后到『礼品卡中心』查看，不会立即发货。”
   - 勾选时默认不要求填写收货信息；若用户仍填写地址则允许提交，同时二次弹窗确认“该订单视作礼品卡，将不会发货”。
   - 未勾选则继续普通发货逻辑。
- 提交订单时将 `is_gift_card_order`（或等价字段）写入订单，后端据此在支付成功后生成礼品卡资产。
- 这样确保购卡体验=普通购物体验+单个勾选项，用户无需在多个页面间跳转。

## 二进制输出策略
- **二维码**：前端使用 `qrcode-generator` 或小程序自带能力渲染 `qr_payload`，并把卡号/祝福语覆盖到默认模板中，供用户保存/分享。
- **PDF**：短期内由前端调用云函数或本地浏览器打印（H5）实现；后端只返回模板 URL + 参数。

## 依赖与迁移
1. 数据库升级到 1.6.0，新增列并清理旧 `pin_code_hash`。
2. 旧卡若已有 PIN：将 PIN hash 清空，同时把 `pin_reveal_limit/count` 重置为 0。
3. `giftCardService.purchase` 的响应需要兼容老版本前端，建议加 `card_pin` 字段但设为 `null`。
4. 分享 token URL 统一规则：`myshop://giftcard?token=XXXX`（小程序内路由 `/pages/giftcard/claim?token=XXXX`）。

## 切换步骤
1. 发布后端（含 DB 升级），确认 API 返回符合新结构。
2. 升级小程序，礼品卡相关页面跟随更新。
3. 站内文案/运营文档同步更新礼品卡用法。

