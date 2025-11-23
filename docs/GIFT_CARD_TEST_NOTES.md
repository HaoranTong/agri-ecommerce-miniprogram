# 礼品卡开发与测试备忘录

## 更新时间
- 2025-11-23 近期完成购卡→分享→领取→兑换全流程联调

## 接口验证流程
1. 使用 `Auth / Login (WeChat Code)` 登录并写入 `auth_token`。
2. 通过 `Gift Cards / List Gift Card Templates` 确认模板，并设置 `gift_card_template_id` 环境变量。
3. 依次执行 `Purchase → Share → Get Share Detail → Claim → Redeem → List My Gift Cards`，Postman 集合已内置断言并自动更新 `card_number`、`card_pin`、`gift_card_share_token` 等环境变量。
4. 非购卡人必须先执行 `Claim Shared Gift Card` 成功领取后方可兑换；购卡人可直接兑换。
5. 如需复测，先清空旧环境变量或重新购卡。

## Postman 集合说明
- 集合文件：`docs/postman/myshop-api-test-suite.postman_collection.json`
- 环境文件：`docs/postman/MyShop_Dev.postman_environment.json`
- Gift Cards 目录下的关键请求自动写入以下变量：
  - `card_number` / `card_pin`：购卡成功后保存，供分享与兑换使用。
  - `gift_card_share_token`：分享成功后更新。
  - `gift_card_last_redeem_status`、`gift_card_last_known_status`：用于记录兑换与列表查看的最新状态。
- 断言覆盖：状态码、字段存在性、卡号一致性、领取与兑换状态。

## 数据库注意事项
- 礼品卡数据表：`wp_myshop_gift_cards`，兑换后会写入 `wp_myshop_gift_card_redemptions`。
- 兑换逻辑会在缺失旧字段时自动补齐 `card_code`、`user_id`，适配早期表结构。
- 若需重置测试卡，可使用 WP-CLI 删除特定 `card_number` 记录，并同步清理关联 redemption 数据。

## 常见问题排查
- 500 错误：通常由 `global $wpdb` 遗漏或数据库写入失败导致，已在兑换接口修复。
- 400 `card_already_redeemed`：领取人与兑换人不一致时提示，确认当前登录用户与 `redeemer_id` 一致。
- 400 `card_not_claimed`：礼品卡未领取且当前用户不是购卡人时提示，需先领取。
- 429 文档提示：来源于访问 WordPress 官方帮助页面，与接口无直接关系。

## 后续建议
- 为异常场景补充更多断言（密码错误、过期等）。
- 将 Postman 流程迁移至 CI，或转写为自动化测试脚本以便回归。
- 每次调整数据库结构后，更新此文档与 Postman 变量说明。
