# 积分中心对照检查（2025-11-27）

> 目标：对照《08_API_CONTRACT_V2.3.md》第七章与现有前端实现，快速定位功能缺口并安排后续补齐顺序。

| 模块 | 代码入口 | 覆盖接口 | 当前状态 | 待处理事项 |
| --- | --- | --- | --- | --- |
| 汇总看板 | `src/pages/points/summary.tsx` | `GET /points/balance`、`GET /points/rules` | 已显示可用/待入账/冻结/累计使用等字段，并在 30 天内过期时给出提醒；提供到流水/任务/兑换/规则的入口。 | 1) 缺少展示 `recent_earnings` 的趋势或图表；2) 未与 `POST /orders` 的抵扣流程直接联动（仅文案提示）。 |
| 积分流水 | `src/pages/points/ledger.tsx` | `GET /points/ledger` | 已实现类型(`earn/spend/expire/refund`)与状态(`pending/confirmed`)筛选，支持分页加载、跳转订单。 | 1) 尚未接入查询参数 `from/to`（日期筛选）；2) 缺少针对 `expire_at` 的到期提醒标记；3) 未区分运营手动调整、任务奖励等渠道展示。 |
| 任务中心 | `src/pages/points/missions.tsx` | `GET /points/missions`、`POST /points/missions/{mission_id}/claim` | 列出任务标题/描述/奖励、进度条与状态标签，可直接领取奖励。 | 1) 未对锁定任务（`locked`）给出解锁条件提示；2) 缺少“每日任务/新手任务”分组；3) 领取成功后未在页面内提示当前可用积分变化（需与 `GET /points/balance` 刷新）。 |
| 积分兑换 | `src/pages/points/redeem.tsx` | `GET /points/redeem/options`、`POST /points/redeem` | 支持加载兑换项并触发后端兑换，能处理券码、礼品卡号返回。 | 1) 未校验用户可用积分，导致前端可点击但后端报错；2) `option.meta` 未展示（例如券面值、适用范围）；3) 缺少使用说明与历史兑换记录入口。 |
| 积分规则 | `src/pages/points/rules.tsx` | `GET /points/rules` | 简单列出规则标题/描述与状态。 | 1) 缺少排序/分组（例如“基础规则”“活动规则”）；2) 没有更新时间或版本号，无法与运营稿对齐。 |
| 服务封装 | `src/services/api.ts` `pointsService` | 见右列 | 新增 `getBalance/getLedger/spend/getRules/getMissions/claimMission/getRedeemOptions/redeem`，并补全类型声明。 | 1) `pointsService.spend` 尚未被任何页面调用（需在下单抵扣或兑换流程中接入）；2) 缺少对失败 code 的细粒度兜底展示。 |

## 建议的后续拆解

1. **体验补强**：为任务、兑换页面补充上下文信息（解锁条件、库存提示、兑换须知），并在成功后刷新汇总数据。
2. **筛选与联动**：在流水页增加日期筛选、渠道过滤，并让汇总页的“即将过期”跳转携带筛选条件。
3. **积分抵扣闭环**：落地 `pointsService.spend` 或在订单创建接口前置校验，确保积分兑换、订单抵扣使用统一的余额刷新方案。
4. **文档同步**：将本表纳入《08_API_CONTRACT_V2.3.md》附录或在 `docs/FRONTEND_DEV_PLAN.md` 中引用，保持研发与运营协作基线一致。

