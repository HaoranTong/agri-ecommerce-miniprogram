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

## 积分中心二期规划（行业实践对齐）

> 目标：在现有 Summary/Ledger 基础上，引入任务、兑换、规则说明与抵扣闭环，保证“赚积分 → 看积分 → 花积分”三段式体验顺滑，并覆盖常见的积分合规提示。

### 页面与能力矩阵

| 页面 | 框架 | 关键接口 | 必备交互 | 容错与提示 |
| --- | --- | --- | --- | --- |
| Summary 汇总 | `pages/points/summary` | `GET /points/balance` + `GET /points/rules` | 显示可用/冻结/待入账/将过期、近 30 天趋势、模块入口（流水/任务/兑换/规则） | 接口失败时展示占位 + 重试按钮；提醒“该功能需要登录”并跳转登录 |
| Ledger 流水 | `pages/points/ledger` | `GET /points/ledger` | 类型+状态+日期筛选、无限滚动、跳转订单详情、显示到期日 | 若 `from/to` 无数据展示“无匹配记录”，后台 4xx 展示错误 toast |
| Missions 任务 | `pages/points/missions` | `GET /points/missions` + `POST /points/missions/{id}/claim` | 进度条、锁定任务解锁条件、领取后刷新余额/任务状态 | 领取失败区分 `mission_locked`、`mission_already_claimed`、`insufficient_progress` 提示 |
| Redeem 兑换 | `pages/points/redeem` | `GET /points/redeem/options` + `POST /points/redeem` | 兑换前校验可用积分、展示券/礼品卡 meta、兑换结果二次确认（包含券码复制、跳转礼品卡详情） | 库存不足、积分不足分别提示，失败时保留按钮状态以便重试 |
| Rules 规则 | `pages/points/rules` | `GET /points/rules` | 分类展示（基础规则/活动规则）、最后更新时间、锚点跳转 | 规则为空时展示“由运营配置，请稍后再来” |
| Order Checkout 联动 | `pages/order/*` | `POST /orders` (传 `points_to_use`) | 下单前告知可抵扣比例、切换开关输入积分、失焦自动校验 | 校验失败回滚输入，对齐后端错误码 `insufficient_points`、`points_disabled` |

### Services 与状态管理

- `src/services/api.ts` 中的 `pointsService` 需保持幂等与错误码透传，新增：
  - `refreshBalanceAfter(action: Promise<any>)` 帮助任务领取/兑换后统一刷新 `GET /points/balance`。
  - `getRedeemHistory`（预留）便于后续“兑换记录”页面复用。
- `src/store/points.ts`（待新增）：
  - `balance`, `ledger`, `missions`, `redeemOptions` 的缓存与时间戳；
  - actions：`fetchBalance`, `fetchLedger`, `claimMissionAndRefresh`, `redeemAndRefresh`。
- 统一的错误码 → 文案映射表写在 `src/utils/error-messages.ts`，避免各页面重复判断。

### 交互与视觉要点

1. **骨架屏**：Summary/Missions/Redeem 首屏加载需有骨架或占位，避免白屏；失败时提供“下拉刷新”提示。
2. **实时反馈**：领取任务、兑换成功后，通过 `Taro.eventCenter` 或 store 发布“pointsUpdated”，驱动 Summary 页同步刷新。
3. **解锁逻辑**：`locked` 状态任务应展示 `unlock_hint`（来自接口 `meta.unlock_hint`），并在点击时提示“完成 XX 前无法领取”。
4. **兑换安全**：兑换礼品卡需二次确认弹窗（防误触），并在结果页提供“复制卡号/券码”与“去礼品卡列表”两个 CTA。
5. **到期提醒**：Ledger 列表中对即将过期记录（`expire_at` 小于 30 天）添加黄色徽标，同时 Summary 的提醒卡片点击后携带筛选条件进入 Ledger。

### 技术迭代步骤

1. **服务层补强**：完成 `pointsService` 额外方法、错误码映射与 store；补上 `POST /points/redeem`、`POST /orders` 抵扣的前端校验。
2. **页面增强**：逐页实现上表“必备交互”，优先 Missions/Redeem（用户可感知差距最大）。
3. **联动闭环**：在订单确认页引入“积分抵扣”交互，并在订单成功页展示消耗明细。
4. **监控与埋点**：在关键操作（领取、兑换、下单抵扣）上报埋点，帮助运营观察转化率。
5. **文档同步**：每个阶段完成后更新 `docs/API_CONTRACT_V2.3.md` 与 `docs/POINTS_CENTER_STATUS.md`，并在 `POINTS_TEST_NOTES.md` 增加验证脚本。

### 验收依据

- 任意用户在 Summary → Missions → Redeem → Order 流程中，积分余额、流水、任务状态保持一致且实时更新。
- 常见失败场景（积分不足、任务未解锁、库存告罄、接口 5xx）均有明确提示，不留空白页。
- 真机体验中，所有积分相关页面加载时间 < 2s（在 Wi-Fi 下），并支持下拉刷新恢复。

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
