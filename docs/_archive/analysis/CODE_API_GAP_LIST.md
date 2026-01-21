# 前端实现与 API 契约差异清单（2025-11-27）

> 扫描范围：points、orders、user、gift card 相关页面及 `services/api.ts`。以下列出与《08_API_CONTRACT_V2.3.md》不一致的字段/交互，供后续排期修复。

## 订单模块

| 页面/文件 | 契约源 | 发现的问题 | 影响 | 建议处理 |
| --- | --- | --- | --- | --- |
| `src/pages/order/create.tsx` | 订单章节 · POST `/orders`（lines 395-430） + 积分章节（lines 974-976） | 提交订单时完全忽略 `points_to_use` 字段，也未在 UI 中展示“可用积分/本单最大抵扣”提示。 | 用户无法在下单阶段使用积分抵扣，导致文档中“reserve points”逻辑无法触发。 | 在确认页增加积分输入框：先调用 `GET /points/balance` 显示 `available`，并在 `createOrder` payload 中附带 `points_to_use`。 |
| `src/pages/order/order-confirm.tsx` | POST `/orders` 成功响应字段 `message`、`payment_qr_url`、`customer_service_qr` | 页面仅展示商品/收货信息，未显示后端返回的付款说明 `message`，也没有提供直接查看收款码/客服码的入口。 | 用户需重新跳到支付页才能看到二维码，体验割裂。 | 在确认卡片中显示 `message`，并给出“查看收款二维码”按钮跳转或弹窗预览。 |
| `src/pages/order/list.tsx` | GET `/orders` 响应示例（lines 432-470） | 代码期望 `items[].product_name / variation_name` 字段，但契约内为 `name`。此外按钮文案“去支付”未真正跳转支付页。 | 字段缺失会导致商品名称渲染为空；CTA 不生效。 | 在 service 层做字段兼容（`name` → `product_name`），并在卡片按钮中根据状态跳转 `order/payment`. |
| `src/pages/order/payment.tsx` | POST `/orders/{id}/upload-payment-proof`（lines 471-520） | 上传成功后完全忽略响应 `payment_proof_status`、`preview_url`；若解析 JSON 失败只在控制台打印。 | 无法在 UI 中给出“凭证已提交”即时反馈；调试困难。 | 成功后基于响应更新本地状态并展示缩略图；解析失败时提示用户重试或联系客服。 |
| `src/pages/order/payment-success.tsx` | 同上 | 仅依据 `order.status` 渲染文案，无法显示“凭证审核中”等状态，也没有展示后端 `message`。 | 用户不知道审核进度。 | 增加 `has_payment_proof`、`payment_proof_status` 的提示，并复用 `message` 字段。 |

## 礼品卡模块

| 页面/文件 | 契约源 | 发现的问题 | 影响 | 建议处理 |
| --- | --- | --- | --- | --- |
| `src/pages/giftcard/mine.tsx` | GET `/gift-cards`（lines 666-694） | 页面直接读取 `template_name`、`can_reset_pin`，而契约明确列表仅返回原始字段且未实现 reset-pin 接口。 | 对应字段永远为 `undefined`，按钮条件判断失效，重置密码功能点击后必然 404。 | 取消对未提供字段的依赖；若需模板名称需额外请求模板接口或在后端扩展字段。移除“重置密码”入口。 |
| `src/services/api.ts` → `giftCardService.resetPin` | 同上 | 前端仍暴露 `resetPin` 方法，但后端未提供路由。 | 一旦调用将返回 404。 | 删除该方法或在调用前加显式 `throw new Error('API not available')`。 |

## 积分/用户模块补充

| 页面/文件 | 契约源 | 发现的问题 | 影响 | 建议处理 |
| --- | --- | --- | --- | --- |
| `src/pages/user/profile.tsx` | 用户信息接口（docs line 180+） | `points_balance` 仅在部分环境返回，当前页面默认 `0`，但未提供兜底提示或骨架，且未联动新版积分中心入口文案。 | 当字段缺失时用户看到“0 积分”误以为余额清零。 | 若接口缺少字段，应显示 `--` 并提示“稍后刷新”；或在 `userService.getProfile` 中补充兼容逻辑。 |
| `src/services/api.ts` → `pointsService.spend` | 积分章节 | 已实现 `spend` 方法但没有任何页面调用，无法触发文档所述“积分抵扣”流程。 | 文档和实现背离，积分只能兑换无法抵扣订单。 | 结合订单创建页尽快落地抵扣交互；若暂不启用，应在文档中注明。 |

> 后续：以上差异将作为“记录需调整的字段”基线，并同步到 `docs/08_API_CONTRACT_V2.3.md` 或对应模块的实现计划中。若扫描其他页面发现新的字段差异，可继续在本文件附加表格。
