# 积分功能联调与测试备忘录

## 最新进展
- 2025-11-23：新增 `/points/grant` 发放接口，Postman 集合内已包含 Balance / Ledger / Grant / Spend 全流程脚本和断言。

## 推荐测试顺序（Postman）
1. **Auth / Login (WeChat Code)**：获取 `auth_token`。
2. **Points / Grant Points**：
   - Headers 加 `X-MyShop-Admin-Key: {{admin_key}}`。
   - Body 默认使用 `{{points_seed_amount}}`、`{{points_seed_reason}}`、`{{points_seed_target_openid}}`。
   - 成功后环境变量会写入 `points_available`、`points_balance_after_grant`、`points_last_granted`。
3. **Points / Get Points Balance**：确认 `available` 数值，断言自动同步到 `points_available`。
4. **Points / Spend Points**：
   - 使用 `{{points_spend_amount}}`、`{{points_spend_reason}}`。
   - 成功时写入 `points_balance_after_spend`；若余额不足，断言 `code` 为 `insufficient_points` 并提示调整 seed/amount。
5. **Points / List Points Ledger**：验证最新记录的 `delta` 与本次 grant/spend 对应。

## 常见变量说明
- `admin_key`：调用 `/points/grant` 时必须匹配服务器端 `MYSHOP_INTERNAL_ADMIN_KEY`，默认 `myshop-dev-admin-key`。
- `points_seed_amount` / `points_seed_reason`：一次发放的积分数量与渠道。可按需调整。
- `points_spend_amount` / `points_spend_reason`：扣减测试使用的积分参数。
- `points_available`：最近一次 Balance/Grant/Spend 后的可用积分；供断言或其他请求引用。

## 数据与运维提示
- 表结构：`wp_myshop_point_ledger`，正值代表 earn，负值代表 spend。字段 `status` 必须是 `confirmed` 才会计入余额。
- `/points/grant` 会自动写入 `type=earn`、`status=confirmed` 记录，并支持 `target_user_id` 或 `target_openid`。
- 如需手工造数据，可执行：
  ```sql
  INSERT INTO wp_myshop_point_ledger
    (user_id,type,delta,balance_after,status,channel,created_at,updated_at)
  VALUES
    (USER_ID,'earn',200,200,'confirmed','manual_seed',NOW(),NOW());
  ```
  其中 `USER_ID` 为 WordPress 用户 ID，可通过 `SELECT ID, user_login FROM wp_users;` 查找。

## 错误码参考
- `invalid_points`：`points<=0` 或参数缺失。
- `insufficient_points`：`/points/spend` 时余额不足。
- `points_grant_failed` / `points_spend_failed`：数据库写入失败，检查 MySQL 错误或字段约束。
- `forbidden`：调用 `/points/grant` 时缺少管理员权限或 `X-MyShop-Admin-Key` 错误。

## 回归建议
- 每次上线前至少跑一遍“Grant → Balance → Spend → Ledger”流程，并记录 `points_available` 的初始/最终值。
- 扩展用例（可选）：
  - 设定 `points_spend_amount` 大于当前余额，用例应命中 `insufficient_points`。
  - 多笔 Grant 后再 Spend，核对 `balance_after` 是否按顺序递减。
  - 修改 `points_seed_target_openid` 以验证切换用户时的行为。

## 下一步规划
- 若未来开放前台积分获取入口（下单返积分、签到等），更新本文及 Postman 断言。
- 将积分用例纳入自动化 CI，或在小程序前端接入前先完成 UI 流程的冒烟测试。
