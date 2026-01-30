本数据字典与 `docs/01_功能规格及技术架构说明书_v1.0.md`、`docs/08_API_CONTRACT_V2.3.md` 对齐，覆盖一期（MVP）与二期（虚拟购物卡 / 积分 / 分销 / 代理商）全部字段。所有字段命名、类型与取值范围以本文件为唯一出处，供研发、测试与 DBA 统一使用。

------

# 🗃️ 数据字典（V1.2 - 冻结基线）

## `MyShop 无头电商系统 · agri-ecommerce`

> **最后修订**：2025年11月22日  
> **修订说明**：同步积分体系、虚拟购物卡新字段、代理商扩展信息及分享审计；与 `docs/08_API_CONTRACT_V2.3.md` 对齐所有返回字段与错误码；更新安全约束。  
> **适用范围**：一期（MVP）+ 二期（营销加速：购物卡 / 积分 / 分销 / 代理商）

------

## 一、数据库概览

| 表名                               | 类型             | 说明                                                         |
| ---------------------------------- | ---------------- | ------------------------------------------------------------ |
| `wp_users`                         | WordPress 原生   | 用户主表                                                     |
| `wp_usermeta`                      | WordPress 原生   | 用户扩展字段（自定义 Meta）                                  |
| `wp_posts` / `wp_postmeta`         | WooCommerce 原生 | 商品（`product`）、订单（`shop_order`）                      |
| `wp_options`                       | WordPress 原生   | 全局配置项                                                   |
| `wp_myshop_gift_card_templates`    | 自定义表         | 虚拟购物卡模板                                               |
| `wp_myshop_gift_cards`             | 自定义表         | 虚拟购物卡实例（储值卡 / 商品兑换卡）                         |
| `wp_myshop_gift_card_redemptions`  | 自定义表         | 购物卡核销 / 兑换流水                                         |
| `wp_myshop_gift_card_share_logs`   | 自定义表         | 购物卡分享包 / 打印包生成审计                                |
| `wp_myshop_point_ledger`           | 自定义表         | 积分流水                                                     |
| `wp_myshop_referrals`              | 自定义表         | 消费者邀请关系树（支持二级裂变）                             |
| `wp_myshop_commissions`            | 自定义表         | 分销/代理佣金流水                                            |
| `wp_myshop_commission_policies`    | 自定义表         | 佣金策略配置（分级比例 / 生效区间）                           |
| `wp_myshop_invitation_logs`        | 自定义表         | 渠道归因访问日志（scene 参数落地）                            |
| `wp_myshop_agents`                 | 自定义表         | 代理商资料及业绩指标                                         |
| `wp_myshop_agent_audit_logs`       | 自定义表         | 代理商后台操作审计                                            |
| `wp_myshop_marketing_assets`       | 自定义表         | 营销素材 / 海报模板                                           |

> ✅ 所有自定义表统一前缀 `wp_myshop_`，字符集 `utf8mb4`，引擎 `InnoDB`。

------

## 二、用户系统字段定义

### 1. `wp_users`（读取字段）

| 字段              | 类型                | 说明                                                         |
| ----------------- | ------------------- | ------------------------------------------------------------ |
| `ID`              | bigint(20) unsigned | 用户唯一标识（主键），在业务中作为 `user_id` 使用           |
| `user_login`      | varchar(60)         | 登录名。微信登录用户设置为手机号或系统生成的账号。          |
| `user_pass`       | varchar(255)        | 密码哈希（一期不使用，三期短信登录可启用）                   |
| `user_email`      | varchar(100)        | 邮箱（可为空）                                               |
| `user_registered` | datetime            | 注册时间                                                     |

> ⚠️ 微信 `openid/unionid` 不写入 `user_login`，仅保存于 `wp_usermeta`。

### 2. `wp_usermeta`（保留 meta_key 列表）

| meta_key            | 类型         | 典型值                        | 说明                                                         | API 是否返回 |
| ------------------- | ------------ | ----------------------------- | ------------------------------------------------------------ | ------------ |
| `phone`             | varchar      | `13800138000`                 | 手机号，同时作为登录名（必填）                               | ✅            |
| `wechat_openid`     | varchar      | `oAbcDefGhIjKlMn...`          | 小程序 openid（敏感，服务端存储）                            | ❌            |
| `wechat_unionid`    | varchar      | `uXYZ123...`                  | unionid（如开放平台应用打通）                                | ❌            |
| `_wechat_phone`     | varchar      | `13800138000`                 | 微信绑定手机号（getPhoneNumber）                              | ✅            |
| `billing_phone`     | varchar      | `13800138000`                 | WooCommerce 订单手机号（同步自微信手机号）                    | ✅            |
| `_wechat_avatar`    | varchar      | `https://.../avatar.jpg`      | 微信头像 URL                                                  | ✅            |
| `_wechat_gender`    | tinyint      | `0/1/2`                       | 微信性别（0=未知/1=男/2=女）                                  | ✅            |
| `invite_code`       | char(6)      | `U42ABC`                      | 用户专属邀请码（大写字母+数字）                              | ✅            |
| `referrer_id`       | bigint       | `105`                         | 直接邀请人 user_id（首次登录时写入）                          | ✅            |
| `total_points`      | int          | `280`                         | 当前可用积分余额                                             | ✅            |
| `membership_level`  | varchar      | `silver`                      | 会员等级（预留字段）                                         | ✅            |
| `cart_items`        | longtext     | JSON 数组                    | 登录态购物车缓存 `{product_id, variation_id, quantity}`       | ✅（需过滤敏感字段） |
| `is_agent`          | char(1)      | `1` / `0`                    | 是否为代理商身份                                             | ✅            |
| `agent_code`        | varchar      | `AGT105`                      | 代理商编码                                                    | ✅            |
| `agent_parent_id`   | bigint       | `42`                          | 上级代理 user_id                                              | ✅            |

> 📌 所有 meta_key “只增不改不删”，新增字段需在此表登记。

------

## 三、订单系统字段（WooCommerce）

### 1. 订单状态（`wp_posts.post_status`）

| 状态                  | 说明                                       |
| --------------------- | ------------------------------------------ |
| `wc-pending`          | 待支付                                     |
| `wc-processing`       | 支付成功/待发货                            |
| `wc-on-hold`          | 已发货/运输中                              |
| `wc-completed`        | 已签收                                     |
| `wc-return-requested` | 申请退货                                   |
| `wc-refunded`         | 已退款                                     |
| `wc-cancelled`        | 已取消                                     |

### 2. 自定义订单 Meta（`wp_postmeta`）

| meta_key                     | 类型     | 示例值                                                  | 说明                                                         |
| ---------------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `_buyer_variation_id`        | bigint   | `205`                                                   | 下单选择的 SKU 变体 ID                                       |
| `_points_used`               | int      | `100`                                                   | 订单使用的积分数量                                           |
| `_points_discount_amount`    | decimal  | `2.00`                                                  | 积分抵扣金额                                                 |
| `_commission_processed`      | tinyint  | `0` / `1`                                               | 佣金是否已生成                                               |
| `_gift_card_generated`       | tinyint  | `0` / `1`                                               | 是否已生成虚拟购物卡                                         |
| `_myshop_return_requested_at`| datetime | `2025-11-20 12:30:00`                                   | 退货申请时间                                                 |
| `_myshop_return_status`      | varchar  | `requested/approved/rejected/refunded`                 | 退货处理状态                                                 |
| `_myshop_return_reason`      | text     | `包装破损`                                              | 退货原因                                                     |
| `_myshop_return_contact`     | varchar  | `微信号/手机号`                                         | 联系方式                                                     |
| `_myshop_return_images`      | longtext | `[...]`                                                 | 退货图片 URL 列表（JSON）                                    |
| `_myshop_return_prev_status` | varchar  | `processing`                                            | 退货前订单状态                                               |

> ✅ 所有订单创建、更新操作通过 WooCommerce API/Hook 完成，禁止直接 SQL 操作。

### 3. 订单接口响应字段（非落库）

> 📌 仅用于 API 响应展示，不直接写入 `wp_postmeta`。

| 字段名 | 类型 | 示例值 | 说明 |
| --- | --- | --- | --- |
| `points_reward` | int | `116` | 本次订单预计可获得积分（支付页提示用） |
| `points_usage.points_used` | int | `100` | 本次订单使用积分数量 |
| `points_usage.discount_amount` | decimal(10,2) | `2.00` | 积分抵扣金额 |

------

## 四、自定义表字段（按业务域）

### 1. 虚拟购物卡（Templates / Instances / Redemptions / Share Logs）

#### `wp_myshop_gift_card_templates`

| 字段                | 类型                | 允许空 | 说明                                                         |
| ------------------- | ------------------- | ------ | ------------------------------------------------------------ |
| `id`                | bigint unsigned     | NO     | 主键                                                         |
| `name`              | varchar(100)        | NO     | 模板名称，如“200元通用卡”                                   |
| `type`              | enum                | NO     | `fixed_amount` / `product_bundle`                            |
| `fixed_amount`      | decimal(10,2)       | YES    | 面额（储值卡必填）                                           |
| `currency`          | char(3)             | NO     | 默认 `CNY`                                                   |
| `product_id`        | bigint unsigned     | YES    | 商品兑换卡：主商品 ID                                        |
| `variation_ids`     | json                | YES    | 允许兑换的变体 ID 数组                                       |
| `bundle_items`      | json                | YES    | 组合礼包明细 `[{product_id, quantity}]`                      |
| `delivery_modes`    | json                | NO     | 允许发放形态 `[]`（如 `digital_share`、`printable`）         |
| `share_template_config` | json            | YES    | 海报/文案模板配置（变量占位符）                              |
| `print_template_url`| varchar(255)        | YES    | 默认打印模板 PDF/PNG                                         |
| `valid_days`        | int                 | NO     | 自购卡起有效天数                                             |
| `created_at` / `updated_at` | datetime   | NO     | 创建/更新时间                                                 |

#### `wp_myshop_gift_cards`

| 字段                   | 类型                | 允许空 | 说明                                                         |
| ---------------------- | ------------------- | ------ | ------------------------------------------------------------ |
| `id`                   | bigint unsigned     | NO     | 主键                                                         |
| `card_number`          | varchar(32)         | NO     | 卡号（唯一，`GC+日期+序号`）                                 |
| `template_id`          | bigint unsigned     | NO     | 关联模板 ID                                                  |
| `template_type`        | enum                | NO     | `fixed_amount` / `product_bundle`（冗余，便于查询）          |
| `initial_amount`       | decimal(10,2)       | YES    | 初始金额（储值卡）                                           |
| `balance`              | decimal(10,2)       | YES    | 当前余额（储值卡）                                           |
| `currency`             | char(3)             | NO     | `CNY`                                                        |
| `linked_product_id`    | bigint unsigned     | YES    | 商品兑换卡关联商品                                           |
| `linked_variation_ids` | json                | YES    | 可兑换变体 ID 列表                                           |
| `bundle_config`        | json                | YES    | 冗余礼包配置                                                 |
| `purchaser_id`         | bigint unsigned     | NO     | 购卡人 user_id                                                |
| `redeemer_id`          | bigint unsigned     | YES    | 受赠人 user_id                                                |
| `order_id`             | bigint unsigned     | NO     | 购卡订单 ID                                                  |
| `bind_status`          | enum                | NO     | `unbound` / `bound`                                          |
| `status`               | enum                | NO     | `active` / `redeemed` / `locked` / `expired` / `cancelled`   |
| `share_token`          | varchar(64)         | YES    | 当前分享令牌                                                 |
| `share_channel`        | varchar(32)         | YES    | 最近一次分享渠道（wechat/dingding/email/custom）            |
| `share_token_expires_at` | datetime          | YES    | 分享令牌有效期                                               |
| `print_package_url`    | varchar(255)        | YES    | 最新打印包下载地址                                           |
| `pin_code_hash`        | varchar(255)        | YES    | PIN 的 bcrypt 哈希                                           |
| `pin_revealed_at`      | datetime            | YES    | 最近一次 PIN 展示时间                                        |
| `pin_reveal_limit`     | tinyint unsigned    | NO     | 剩余可查看次数（默认 1）                                     |
| `expires_at`           | datetime            | NO     | 过期时间                                                     |
| `created_at` / `updated_at` | datetime       | NO     | 创建/更新时间                                                 |

> 🔐 PIN 仅以哈希存储；再次查看需通过 `POST /gift-cards/{id}/reveal-pin` 二次验证。

#### `wp_myshop_gift_card_redemptions`

| 字段              | 类型                | 允许空 | 说明                                                         |
| ----------------- | ------------------- | ------ | ------------------------------------------------------------ |
| `id`              | bigint unsigned     | NO     | 主键                                                         |
| `card_id`         | bigint unsigned     | NO     | 购物卡 ID                                                     |
| `template_id`     | bigint unsigned     | NO     | 冗余模板 ID                                                   |
| `redeemer_id`     | bigint unsigned     | NO     | 核销人 user_id                                                |
| `redeem_type`     | enum                | NO     | `deduct`（储值抵扣） / `exchange`（商品兑换）                |
| `channel`         | varchar(32)         | NO     | `miniprogram` / `backend` / `api` 等                         |
| `operator_id`     | bigint unsigned     | YES    | 若为后台人工操作，记录操作人                                  |
| `used_amount`     | decimal(10,2)       | NO     | 本次抵扣金额                                                  |
| `balance_after`   | decimal(10,2)       | NO     | 抵扣后余额                                                    |
| `target_order_id` | bigint unsigned     | YES    | 关联订单（储值抵扣订单或 0 元兑换订单）                      |
| `redeemed_at`     | datetime            | NO     | 核销时间                                                     |

#### `wp_myshop_gift_card_share_logs`

| 字段            | 类型                | 允许空 | 说明                                                         |
| --------------- | ------------------- | ------ | ------------------------------------------------------------ |
| `id`            | bigint unsigned     | NO     | 主键                                                         |
| `card_id`       | bigint unsigned     | NO     | 购物卡 ID                                                     |
| `operator_id`   | bigint unsigned     | NO     | 生成分享包的用户（通常为购卡人）                              |
| `delivery_mode` | enum                | NO     | `digital_share` / `printable`                                |
| `channel`       | varchar(32)         | NO     | 触发渠道（wechat/dingding/email/custom）                     |
| `share_token`   | varchar(64)         | YES    | 新生成的分享令牌                                             |
| `print_package_url` | varchar(255)    | YES    | 新生成的打印包地址                                           |
| `created_at`    | datetime            | NO     | 创建时间                                                     |
| `ip_address`    | varchar(45)         | YES    | 操作者 IP                                                    |

### 2. 积分体系（`wp_myshop_point_ledger`）

| 字段                | 类型                | 允许空 | 说明                                                         |
| ------------------- | ------------------- | ------ | ------------------------------------------------------------ |
| `id`                | bigint unsigned     | NO     | 主键                                                         |
| `user_id`           | bigint unsigned     | NO     | 用户 ID                                                       |
| `type`              | enum                | NO     | `earn` / `spend` / `adjust` / `expire`                       |
| `delta`             | int                 | NO     | 积分增减（负数表示扣减）                                     |
| `balance_after`     | int                 | NO     | 变更后积分余额                                               |
| `reference_order_id`| bigint unsigned     | YES    | 关联订单 ID                                                   |
| `reservation_id`    | varchar(64)         | YES    | 业务标识（任务/兑换/活动等）                                  |
| `status`            | enum                | NO     | `pending` / `confirmed` / `released`                         |
| `channel`           | varchar(32)         | NO     | `order_complete` / `order_discount` / `order_refund` / `daily_signin` / `mission_reward` / `redeem` / `points_expire` 等 |
| `operator_id`       | bigint unsigned     | YES    | 后台操作人                                                   |
| `expire_at`         | datetime            | YES    | 积分到期时间（earn 类型）                                    |
| `created_at` / `updated_at` | datetime   | NO     | 创建/更新时间                                                 |

### 3. 分销 + 渠道归因体系

#### `wp_myshop_referrals`

| 字段        | 类型                | 说明                                |
| ----------- | ------------------- | ----------------------------------- |
| `id`        | bigint unsigned     | 主键                                |
| `user_id`   | bigint unsigned     | 被邀请人 user_id                    |
| `referrer_id`| bigint unsigned    | 直接邀请人 user_id                  |
| `path`      | varchar(255)        | 树路径（如 `/42/105`）               |
| `level`     | tinyint             | 深度（一级=1，二级=2）               |
| `channel_code` | varchar(50)      | 渠道来源（可为空）                   |
| `created_at`| datetime            | 创建时间                             |

#### `wp_myshop_invitation_logs`

| 字段             | 类型                | 说明                                                         |
| ---------------- | ------------------- | ------------------------------------------------------------ |
| `id`             | bigint unsigned     | 主键                                                         |
| `invitee_openid` | varchar(64)         | 被邀请者 openid                                              |
| `inviter_id`     | bigint unsigned     | 邀请人 user_id                                                |
| `channel`        | varchar(32)         | 渠道，如 `xiaohongshu`                                       |
| `scene`          | varchar(100)        | scene 参数                                                    |
| `landing_page`   | varchar(150)        | 落地页路径                                                   |
| `visited_at`     | datetime            | 访问时间                                                     |
| `first_order_id` | bigint unsigned     | 首单 ID（如已转化）                                          |

### 4. 佣金与代理体系

#### `wp_myshop_commission_policies`

| 字段             | 类型                | 说明                                           |
| ---------------- | ------------------- | ---------------------------------------------- |
| `id`             | bigint unsigned     | 主键                                           |
| `level`          | tinyint             | 层级（1=一级，2=二级）                         |
| `rate`           | decimal(5,2)        | 佣金比例（百分比）                             |
| `channel`        | varchar(32)         | 渠道（可选）                                   |
| `effective_from` | datetime            | 生效时间                                       |
| `effective_to`   | datetime            | 失效时间（NULL 表示长期有效）                 |
| `created_at`     | datetime            | 创建时间                                       |

#### `wp_myshop_commissions`

| 字段                | 类型                | 说明                                                         |
| ------------------- | ------------------- | ------------------------------------------------------------ |
| `id`                | bigint unsigned     | 主键                                                         |
| `order_id`          | bigint unsigned     | 订单 ID                                                      |
| `earner_id`         | bigint unsigned     | 获佣人 user_id                                                |
| `amount`            | decimal(10,2)       | 佣金金额                                                      |
| `currency`          | char(3)             | 货币（默认 `CNY`）                                           |
| `commission_type`   | enum                | `referral` / `agent`                                        |
| `referrer_id`       | bigint unsigned     | 若 `commission_type=referral`，记录邀请人                    |
| `agent_id`          | bigint unsigned     | 若 `commission_type=agent`，记录代理商                      |
| `settlement_batch`  | varchar(50)         | 结算批次号（如 `2025-11-W3`）                                |
| `status`            | enum                | `pending` / `approved` / `rejected` / `paid`                 |
| `expected_payout_at`| datetime            | 预计打款时间                                                 |
| `paid_at`           | datetime            | 实际打款时间                                                 |
| `note`              | varchar(255)        | 备注                                                         |
| `created_at` / `updated_at` | datetime   | 创建/更新时间                                                 |

#### `wp_myshop_agents`

| 字段            | 类型                | 说明                                                         |
| --------------- | ------------------- | ------------------------------------------------------------ |
| `id`            | bigint unsigned     | 主键                                                         |
| `agent_user_id` | bigint unsigned     | 代理商 user_id，可重复（同一用户多区域）                      |
| `parent_agent_id` | bigint unsigned    | 上级代理 ID（可为空）                                        |
| `agent_code`    | varchar(20)         | 唯一编码                                                      |
| `level`         | tinyint             | 代理等级                                                      |
| `region_zone`   | varchar(50)         | 大区（如“华南”）                                              |
| `region_province` | varchar(50)       | 省份（如“广东省”）                                            |
| `region_city`   | varchar(50)         | 城市/地市（如“深圳市”）                                       |
| `region`        | varchar(50)         | 展示用区域标签                                                |
| `region_key`    | varchar(191)        | 归一化区域键 `zone#province#city`，用于唯一约束               |
| `active_until`  | datetime            | 合同到期时间                                                  |
| `is_active`     | tinyint(1)          | 是否在有效期内                                                |
| `status`        | enum                | `active` / `frozen` / `terminated`                            |
| `joined_at`     | datetime            | 入驻时间                                                     |
| `invite_qr`     | varchar(255)        | 招商海报/二维码地址                                          |
| `team_target`   | json / longtext     | 团队目标（销售额、新客数等）                                 |
| `created_at` / `updated_at` | datetime | 创建/更新时间                                                 |

#### `wp_myshop_agent_audit_logs`

| 字段          | 类型                | 说明                                         |
| ------------- | ------------------- | -------------------------------------------- |
| `id`          | bigint unsigned     | 主键                                         |
| `agent_user_id` | bigint unsigned   | 被操作的代理 user_id                          |
| `action`      | varchar(50)         | 操作类型（`freeze`、`upgrade_level` 等）      |
| `reason`      | varchar(255)        | 原因                                         |
| `operator_id` | bigint unsigned     | 后台操作人 ID                                 |
| `payload`     | json                | 操作前后快照                                  |
| `created_at`  | datetime            | 操作时间                                     |

### 5. 营销素材与渠道看板

#### `wp_myshop_marketing_assets`

| 字段          | 类型                | 说明                                                         |
| ------------- | ------------------- | ------------------------------------------------------------ |
| `id`          | bigint unsigned     | 主键                                                         |
| `type`        | varchar(30)         | `poster` / `banner` / `video` / `doc` 等                      |
| `title`       | varchar(150)        | 素材标题                                                     |
| `content_url` | varchar(255)        | 媒体地址                                                     |
| `config_json` | json                | 配置（变量占位符、样式、适用渠道）                            |
| `status`      | enum                | `draft` / `published` / `archived`                             |
| `created_at`  | datetime            | 创建时间                                                     |

------

## 五、API 派生字段与缓存建议

| API 路径                | 字段                     | 计算逻辑 / 来源                                               |
| ----------------------- | ------------------------ | ------------------------------------------------------------- |
| `GET /points/summary`   | `expiring_soon`          | 最近 30 天内 `expire_at` 介于今日~+30 天的积分和                |
| `GET /points/summary`   | `expiring_window_days`   | 固定为 30（用于前端文案说明）                                  |
| `GET /cart`             | `gift_card_credits`      | 若请求携带卡号抵扣，则查询可用购物卡并生成行级抵扣明细         |
| `GET /agents/me`        | `team_sales_amount`      | 基于数据仓库/缓存视图聚合，建议每日离线更新                   |
| `GET /analytics/channel`| `gmv`                    | 运营看板聚合结果，建议使用报表库或物化视图                    |

> 📌 业务推荐：积分与佣金概览可使用 Redis / MySQL 物化视图做每日增量缓存，前端实时展示时命中缓存减少主库压力。

------

## 六、安全与一致性约束

1. **敏感字段脱敏**：`wechat_openid`、`wechat_unionid`、`share_token`、`pin_code_hash`；日志禁止明文输出 PIN。  
2. **字段不可逆删除**：所有 meta_key、自定义表字段遵循“只增不删”，废弃字段通过状态位或文档标记 `deprecated`。  
3. **积分过期任务**：每日定时任务扫描 `expire_at < now` 的积分并写入 `type='expire'` 记录。  
4. **购物卡核销事务**：储值抵扣需与订单扣减在同一事务内提交；失败时回滚 `balance` 与核销流水。  
5. **代理操作留痕**：后台所有代理操作写入 `wp_myshop_agent_audit_logs`，配合操作人、IP 排查风险。  
6. **分享链接有效期**：`share_token_expires_at` 过期自动失效；重新生成需关闭旧链接，防止被盗用。

------

**文档状态**：✅ 冻结（V1.2）  
**下一次回顾**：当开启微信支付或会员等级体系时，需新增相应表/字段并更新此文档。  
**维护者**：超级工程师（AI 助理）  

如在数据库或代码中发现与本数据字典不一致的字段，请视为缺陷并立即同步修正。愿数据清晰、运营顺畅！🌱

