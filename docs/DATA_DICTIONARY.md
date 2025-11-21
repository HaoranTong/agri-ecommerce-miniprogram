当然！以下是经过严格校验与修正后的 **最终版数据字典（Rev.1）**，确保与 WordPress/WooCommerce 原生机制、一期业务逻辑及安全实践完全对齐。

------

# 🗃️ 数据字典（V1.0 Rev.1 - 冻结基线）

## `MyShop 无头电商系统 · agri-ecommerce`

> **最后修订**：2025年11月18日
> **修订说明**：修正用户 openid 存储方式、移除冗余余额字段、明确派生值计算逻辑
> **适用范围**：一期开发（人工审核 + 分销裂变基础版）

------

## 一、数据库概览

| 表名                       | 类型             | 说明                                                |
| -------------------------- | ---------------- | --------------------------------------------------- |
| `wp_users`                 | WordPress 原生   | 用户主表                                            |
| `wp_usermeta`              | WordPress 原生   | 用户扩展字段（关键自定义元数据存放处）              |
| `wp_posts` / `wp_postmeta` | WooCommerce 原生 | 商品（product）、订单（shop_order）以 post 形式存储 |
| `wp_myshop_gift_cards`     | 自定义表         | 虚拟购物卡主表                                      |
| `wp_myshop_commissions`    | 自定义表         | 佣金记录表                                          |

> ✅ 所有自定义表使用前缀 `wp_myshop_`，避免插件冲突

------

## 二、用户系统字段定义

### 1. `wp_users`（仅使用以下字段）

| 字段              | 类型                | 说明                                                  |
| ----------------- | ------------------- | ----------------------------------------------------- |
| `ID`              | bigint(20) unsigned | 用户唯一 ID（即 `user_id`）                           |
| `user_login`      | varchar(60)         | **自动生成**（如 `agri_user_123`），**不包含 openid** |
| `user_email`      | varchar(100)        | 可为空（小程序用户通常无邮箱）                        |
| `user_registered` | datetime            | 注册时间                                              |

> ⚠️ **严禁**将微信 openid/unionid 写入 `user_login` 或 `user_email`

------

### 2. `wp_usermeta`（自定义 meta_key 列表）

| meta_key           | 数据类型 | 示例值               | 说明                           | 是否通过 API 返回            |
| ------------------ | -------- | -------------------- | ------------------------------ | ---------------------------- |
| `_wechat_openid`   | string   | `oAbcDefGhIjKlMn...` | 微信 openid（小程序唯一标识）  | ❌ 否（敏感）                 |
| `_wechat_unionid`  | string   | `uXyz123...`         | 微信 unionid（跨应用识别）     | ❌ 否                         |
| `my_referral_code` | string   | `REF20251118A1`      | 本人推广码（6位大写字母+数字） | ✅ 是                         |
| `referrer_id`      | integer  | `123`                | 推荐人 user_id（整数）         | ✅ 是（用于展示“您的推荐人”） |

> ✅ 推广关系建立时机：用户首次登录且 URL 含 `?ref=CODE` 时写入 `referrer_id`

------

## 三、订单系统字段（WooCommerce）

### 1. 订单状态（`wp_posts.post_status`）

| 状态           | 说明                       |
| -------------- | -------------------------- |
| `wc-pending`   | 待付款（默认）             |
| `wc-completed` | 已完成（运营后台手动设置） |
| `wc-cancelled` | 已取消                     |

### 2. 自定义订单元字段（`wp_postmeta`）

| meta_key                | 数据类型 | 示例值                                                    | 说明                           |
| ----------------------- | -------- | --------------------------------------------------------- | ------------------------------ |
| `_payment_proof_url`    | string   | `/wp-content/uploads/myshop-payment-proofs/order_123.jpg` | 付款截图相对路径               |
| `_buyer_variation_id`   | integer  | `789`                                                     | 商品变体 ID（来自小程序请求）  |
| `_commission_processed` | boolean  | `0` / `1`                                                 | 佣金是否已生成（防止重复计算） |

> ✅ 所有订单通过 `wc_create_order()` 创建，确保兼容性

------

## 四、自定义表结构

### 1. `wp_myshop_gift_cards`（购物卡）

| 字段          | 类型          | 允许空 | 默认       | 说明                             |
| ------------- | ------------- | ------ | ---------- | -------------------------------- |
| `id`          | bigint(20)    | NO     |            | 主键                             |
| `card_number` | varchar(20)   | NO     |            | 卡号（唯一，如 `GC20251118001`） |
| `pin`         | char(6)       | NO     |            | 6位数字 PIN（明文存储）          |
| `amount`      | decimal(10,2) | NO     |            | 面额                             |
| `balance`     | decimal(10,2) | NO     |            | 当前可用余额                     |
| `user_id`     | bigint(20)    | YES    | NULL       | 绑定用户 ID（未兑换时为 NULL）   |
| `status`      | varchar(20)   | NO     | `'issued'` | `issued` / `redeemed` / `used`   |
| `created_at`  | datetime      | NO     |            | 创建时间                         |
| `redeemed_at` | datetime      | YES    | NULL       | 兑换时间                         |

> 🔒 **唯一索引**：`UNIQUE KEY card_number (card_number)`

------

### 2. `wp_myshop_commissions`（佣金记录）

| 字段          | 类型          | 允许空 | 默认        | 说明                            |
| ------------- | ------------- | ------ | ----------- | ------------------------------- |
| `id`          | bigint(20)    | NO     |             | 主键                            |
| `order_id`    | bigint(20)    | NO     |             | 关联订单 ID（wp_posts.ID）      |
| `referrer_id` | bigint(20)    | NO     |             | 推广人 user_id                  |
| `downline_id` | bigint(20)    | NO     |             | 下级用户 user_id                |
| `amount`      | decimal(10,2) | NO     |             | 佣金金额（精确到分）            |
| `rate`        | decimal(5,2)  | NO     |             | 佣金比例（如 `10.00` 表示 10%） |
| `status`      | varchar(20)   | NO     | `'pending'` | `pending` / `paid`              |
| `created_at`  | datetime      | NO     |             | 创建时间                        |

> 🔍 **查询索引建议**：`(referrer_id, status)` 用于快速获取待结算佣金

------

## 五、API 响应中的派生字段说明

以下字段 **不在数据库直接存储**，由后端动态计算：

| API 路径            | 字段                | 计算逻辑                                                     |
| ------------------- | ------------------- | ------------------------------------------------------------ |
| `GET /user/profile` | `gift_card_balance` | `SELECT COALESCE(SUM(balance), 0) FROM wp_myshop_gift_cards WHERE user_id = {current_user_id} AND status IN ('redeemed', 'used')` |
| `GET /user/profile` | `has_downlines`     | `SELECT COUNT(*) > 0 FROM wp_usermeta WHERE meta_key = 'referrer_id' AND meta_value = {current_user_id}` |

> ✅ 这些字段可安全暴露给前端，但需注意性能（一期数据量小，无需缓存）

------

## 六、关键约束与最佳实践

1. **openid 安全**  
   - 仅存于 `wp_usermeta._wechat_openid`
   - **绝不**出现在 API 响应、日志、前端代码中
2. **余额一致性**  
   - 用户总余额 = 所有已绑定卡的 `balance` 之和
   - 消费时需事务更新 `wp_myshop_gift_cards.balance`
3. **推广关系不可变**  
   - `referrer_id` 一旦写入，**不得修改**
   - 避免分销链路断裂
4. **佣金防重**  
   - 订单标记为 `completed` 时，检查 `_commission_processed`
   - 若为 `0`，则生成佣金并置为 `1`

------

**文档状态**：✅ **冻结基线（V1.0 Rev.1）**
**适用阶段**：一期开发与上线
**输出格式**：Markdown（可直接保存为 `DATA_DICTIONARY.md`）

------

这份数据字典现已 **与实际实现模型严格一致**，可作为开发、测试、DBA 的唯一权威参考。如有任何字段在代码中偏离此定义，请视为 **Bug**。

祝你项目顺利、零数据事故！🌱