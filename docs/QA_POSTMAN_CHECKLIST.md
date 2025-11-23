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

## D. 结果反馈
- 每个步骤完成后若与预期不符，直接截图 + Postman Response 发给我。
- 如需复测，先在环境变量清空 `card_number`/`card_pin` 等，再从 Auth 开始。
- 测试完成后记录总流程耗时、发现问题列表，我来进行修复或规划。
