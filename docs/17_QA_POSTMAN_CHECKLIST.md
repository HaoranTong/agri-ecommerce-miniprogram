# 手动联调 Checklist（Postman）

> 按顺序执行，若某一步失败，请截图 + 返回体发我，我负责分析和修复。

## A. 公共准备
1. 打开 `MyShop Dev` 环境，确保变量 `base_url`、`test_user_openid`、`admin_key` 已配置。
2. 选择 `MyShop API Test Suite` 集合，确认 Gift Cards / Points 目录都可见。

## B. 礼品卡流程
1. **Auth / Login (WeChat Code)**
   - Body 使用 `{"code": "test"}` 或指定 openid。
   - 成功后确认 `auth_token` 环境变量被写入。
2. **Gift Cards / Purchase Gift Card**
   - Body：`{"template_id": {{gift_card_template_id}}, "delivery_mode": "digital_share"}`。
   - 记录返回的 `card_number`、`card_pin`（自动写入环境变量）。
3. **Gift Cards / Share Gift Card**
   - 使用上一步 `card_number`。
   - 成功后 `gift_card_share_token` 被写入。
4. **Gift Cards / Get Gift Card Share Detail**
   - 校验返回的卡信息与环境变量一致。
5. **（可选）切换领取账号**：把 `auth_token` 改为第二个用户登录结果。
6. **Gift Cards / Claim Shared Gift Card**
   - 期待 `status=bound`。
7. **Gift Cards / Redeem Gift Card**
   - 期待 `status=redeemed`。
8. **Gift Cards / List My Gift Cards**
   - 确认卡列表中最新卡片状态为 `redeemed`。

## C. 积分流程
1. **Auth / Login (WeChat Code)**（若需要重新登录）
2. **Points / Grant Points**
   - Headers：添加 `X-MyShop-Admin-Key: {{admin_key}}`。
   - Body：`{"points": {{points_seed_amount}}, "reason": "{{points_seed_reason}}", "target_openid": "{{points_seed_target_openid}}"}`。
   - 记录 `new_balance, granted`。
3. **Points / Get Points Balance**
   - 确认为步骤 2 结果。
4. **Points / Spend Points**
   - 若返回 200：记录 `new_balance`。
   - 若 400 且 `code=insufficient_points`：降低 `points_spend_amount` 后重试。
5. **Points / List Points Ledger**
   - 最新记录应能看到步骤 2/4 的变更，`delta` 正负对应发放/扣减。

## D. 代理（Agent）流程
> 需要两位测试用户：用户 A 先申请成为代理；用户 B 带上 A 的 agent_code 作为上级。

1. **Auth / Login**（用户 A）
2. **Agents / Apply**
   - Body 示例：`{"region_zone":"华南大区","region_province":"广东省","region_city":"深圳市","level":1}`。
   - 默认测试环境使用 `{{agent_region_zone}}/{{agent_region_province}}/{{agent_region_city}}` 变量；若为空需先在环境中填写。
   - 记录返回的 `agent_code`，写入环境变量 `agent_code_primary`（脚本会自动落库，手动校验即可）。
   - 确认响应包含 `active_until`（默认 +365 天）与 `is_active=true`，证明合同期生效。
3. **Agents / Profile**
   - 确认 `status=active`、`region_zone/province/city` 与提交一致，`is_active=true`、`active_until` 为未来日期。
4. **Agents / Team Stats**
   - 若还未有队员，`direct_agents=0`、`team_total_agents=0`；稍后 B/C 申请后再次调用应看到数量随下级增加。
5. **切换至用户 B 登录**
6. **Agents / Apply (Duplicate Region)**
   - 不修改 `agent_region_*` 变量，直接复用 A 的区域；期望返回 `409` 且 `code=region_occupied`，证明同一区域无法重复入驻。
7. **Agents / Apply**（Body 中 `parent_agent_code` = `{{agent_code_primary}}`，其余区域字段填写 B 实际负责的不同地区）
8. **Agents / Profile / Team Stats**（用户 B）
   - 确认 `parent_agent_id` 有值；`region_*` 字段落库；`Team Stats` 中 `direct_agents` 应为 0。
9. **切换回用户 A** 再调 `Team Stats`，确认 `direct_agents` 数量增加、`team_total_agents = direct + indirect`，`recent_team_members` 列表出现用户 B/C，且 `depth` 字段标识上下级层级。

> 省级代理验证：可再用用户 C 申请广东省内另一城市（填写 `region_city=广州市`），随后用用户 D 申请 `region_city` 为空的广东省代理。完成后，用户 D 的 `Team Stats` 应自动统计 A/B/C 三位城市代理，`direct_agents=0`、`team_total_agents=3`，证明系统自动重绑省内城市代理。

> 若需要测试佣金统计，可在 `wp_myshop_commissions` 表插入 `commission_type='agent'`、`agent_id=用户A ID` 的 pending/paid 记录再调用 `Team Stats`。

## E. 推广/邀请（Referral）流程
1. **Auth / Login**（邀请人）
2. **Referral / Get Referral Summary**
   - 记录 `referral_code`，用于造数或前端展示。
3. **Referral / Get Referral Code**
   - 断言与 Summary 中一致。
4. **造数据（手工）**：在 `wp_myshop_referrals` 中插入若干行，填充 `inviter_id`、`invitee_id`、`level`、`first_order_status`；必要时也在 `wp_myshop_commissions` 中插入 `commission_type='referral'` 的金额。
5. **Referral / List Referral Members**
   - 查看分页与 level 筛选（可在请求 Query 添加 `level=1`）是否生效；字段 `first_order_status`、`joined_at` 与表一致。
6. **Referral / Get Referral Summary**（再次调用）
   - 验证 `total_invitees`、`commission_totals` 等统计与数据库吻合。

## F. 结果反馈
- 每个步骤完成后若与预期不符，直接截图 + Postman Response 发给我。
- 如需复测，先在环境变量清空 `card_number`/`card_pin` 等，再从 Auth 开始。
- 测试完成后记录总流程耗时、发现问题列表，我来进行修复或规划。


