# 小程序前端开发计划（Gift Card & Points）

## 目标
- 与已交付的礼品卡、积分接口完全对齐。
- 先完成 Gift Card / Points 两大模块的页面、状态管理和服务层，确保能承接下一阶段（分销、代理）的开发。

## 模块拆分
### 1. Gift Card 模块
- 页面
  - `pages/giftcard/index`：卡列表（我拥有 / 我分享）
  - `pages/giftcard/detail`：卡详情（余额、有效期、分享状态）
  - `pages/giftcard/share`：选择分享渠道、生成分享口令
  - `pages/giftcard/claim`：输入口令领取或扫码领取
  - `pages/giftcard/redeem`：输入卡号/密码核销
- 组件
  - `components/GiftCardTile`：卡片展示（背景、余额、状态）
  - `components/ShareTokenPanel`：显示分享二维码/口令
  - `components/RedeemForm`：卡号 + PIN 输入框，支持粘贴
- 状态管理
  - 使用 `src/services/giftCard.ts` 封装 API 调用（对应 `/gift-cards/*` 接口）
  - `src/store/giftCard.ts`（可选）缓存最近的卡列表、分享 token
- 交互关键点
  - 分享成功后更新本地 token，跳转到分享详情页
  - 领取成功后提示“绑定成功”，更新卡列表缓存
  - 兑换成功后刷新卡列表并弹出结果模态框
- 测试 checklist（手动）
  1. 使用购卡用户登录 → 购买并分享 → 切换另一个账号领取 → 再兑换
  2. 分享链接过期提示、卡已被领取提示覆盖
  3. 错误码映射：`card_not_claimed`、`card_invalid_pin` 等

### 2. Points 模块
- 页面
  - `pages/points/summary`：可用积分、待入账、累计赚取/消费
  - `pages/points/ledger`：积分流水列表，支持筛选（全部/待入账/已入账）
  - `pages/points/spend`（如需）：“兑换积分”操作入口
- 组件
  - `components/PointsBalanceCard`
  - `components/PointsLedgerItem`
- Services
  - `src/services/points.ts`：封装 `/points/balance`、`/points/ledger`、`/points/spend`
- 状态管理
  - `src/store/points.ts`：缓存 balance/ledger，提供刷新动作
- UI 交互
  - 页面进入时显示骨架屏，接口成功后渲染数据
  - 消耗积分前确认余额，失败提示“积分不足”
- 测试 checklist
  1. 用 `/points/grant` 造数 → 前端显示正确可用积分
  2. 流水时间排序、分页加载
  3. Spend 失败的错误提示

## 共性需求
- `services/api.ts` 增加 Gift Card / Points 方法，响应 Promise 类型写在 `src/types/index.ts`。
- 错误处理统一走 `utils/toast.ts`，根据后端错误码输出中文提示。
- TabBar/入口：在小程序首页增加“礼品卡”“积分”入口。

## 开发顺序建议
1. 完成 `services/points.ts`、`services/giftCard.ts` 与类型定义。
2. Gift Card 页面（列表 → 分享 → 领取 → 兑换）
3. Points Summary/Ledger 页面
4. 统一状态管理 / 缓存策略
5. 真机联调 + 测试 checklist

## 验收标准
- 所有接口请求与 `docs/postman/myshop-api-test-suite.postman_collection.json` 保持一致。
- UI 字段与 `功能规格 V1.0`、`MINIPROGRAM_SPEC V2.0` 一致。
- `GIFT_CARD_TEST_NOTES.md`、`POINTS_TEST_NOTES.md` 中的流程在小程序端可完整执行。
