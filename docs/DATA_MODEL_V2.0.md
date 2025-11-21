当然可以。以下是完整、独立、可直接保存为标准技术文档的 **《完整数据模型定义 V2.0》**，涵盖用户体系、商品订单、虚拟购物卡、分销代理、扩展配置等全部核心模块，结构清晰、语义明确、面向未来，且完全兼容免费版 WordPress + WooCommerce。

------

# 🗂️ 微信小程序 × WordPress 无头电商系统

## **完整数据模型定义（V2.0 - 企业级基线标准）**

> **文档状态**：冻结基线（Baseline Frozen）
> **适用阶段**：一期（MVP） + 二期（虚拟购物卡 + 社交裂变） + 三期（私域自动化）
> **核心原则**：
>
> - ✅ 所有业务扩展字段通过 WordPress Meta 机制实现（`usermeta` / `postmeta`）
> - ✅ 自定义表仅用于需高效查询、事务控制或多对多关系场景
> - ✅ 字段命名全局唯一、不可变更、语义清晰
> - ✅ 100% 兼容免费版 WordPress 6.x + WooCommerce 8.x
> - ✅ 支持未来扩展：多级分销、代理商体系、会员等级、卡类型泛化

------

## 一、用户体系（User）

### 1. 主账户信息（WordPress 原生）

- **存储表**：`wp_users`
- **说明**：此表由 WordPress 内核管理，**禁止任何结构修改**
- **关键字段（仅读取，不用于业务逻辑写入）**：

| 字段              | 类型         | 说明                                       |
| ----------------- | ------------ | ------------------------------------------ |
| `ID`              | bigint       | 用户唯一ID（主键）                         |
| `user_login`      | varchar(60)  | 登录名（一期设为手机号）                   |
| `user_pass`       | varchar(255) | 密码哈希（一期微信登录不使用，三期可启用） |
| `user_email`      | varchar(100) | 邮箱（可为空）                             |
| `user_registered` | datetime     | 注册时间                                   |

> 💡 **密码策略说明**：  
>
> - 一期用户通过微信授权登录，**无需密码**，`user_pass` 由系统随机填充  
> - 三期若支持手机号/邮箱登录，则启用密码功能，符合 WordPress 标准流程

------

### 2. 用户扩展属性（业务字段）

- **存储表**：`wp_usermeta`
- **结构**：每行 = `(user_id, meta_key, meta_value)`
- **约定**：以下 `meta_key` 为**全局保留字**，不得用于其他用途

| meta_key           | 数据类型    | 分期 | 必填 | 说明                                | 示例值                                                 |
| ------------------ | ----------- | ---- | ---- | ----------------------------------- | ------------------------------------------------------ |
| `phone`            | string      | 一期 | ✅    | 手机号（同时作为 `user_login`）     | `"13800138000"`                                        |
| `wechat_openid`    | string      | 一期 | ✅    | 微信 openid（一对一绑定）           | `"oAbcDEF123..."`                                      |
| `wechat_nickname`  | string      | 一期 | ❌    | 微信昵称                            | `"🌾五常米农"`                                          |
| `wechat_avatar`    | string      | 一期 | ❌    | 头像 URL（绝对路径）                | `"https://shop.com/avatar.jpg"`                        |
| `invite_code`      | string      | 二期 | ❌    | 6位大写字母/数字，全局唯一          | `"U42ABC"`                                             |
| `referrer_id`      | integer     | 二期 | ❌    | 直接邀请人 user_id（一级分销）      | `42`                                                   |
| `total_points`     | integer     | 二期 | ❌    | 积分余额（≥0）                      | `280`                                                  |
| `cart_items`       | JSON string | 一期 | ❌    | 购物车内容（见下文结构）            | `[{"product_id":101,"variation_id":205,"quantity":2}]` |
| `membership_level` | string      | 三期 | ❌    | 会员等级（如 `"bronze"`, `"gold"`） | `"silver"`                                             |
| `is_agent`         | string      | 三期 | ❌    | 是否为代理商（`"1"` / `"0"`）       | `"1"`                                                  |
| `agent_code`       | string      | 三期 | ❌    | 代理商编码（如 `"AGT001"`）         | `"AGT105"`                                             |
| `agent_parent_id`  | integer     | 三期 | ❌    | 上级代理商 user_id                  | `201`                                                  |

#### 📦 `cart_items` 结构规范（JSON）

```json
[
  {
    "product_id": 101,        // int, 变体商品ID（variable product）
    "variation_id": 205,      // int, 具体SKU变体ID
    "quantity": 2             // int ≥1
  }
]
```

> ⚠️ 一期仅支持登录后加购；游客购物车暂不支持

------

## 二、商品与订单体系（WooCommerce 原生 + 扩展）

### 1. 商品（Product）

- **存储表**：`wp_posts`（`post_type = 'product'`） + `wp_postmeta`
- **商品类型**：全部使用 **Variable Product（变体商品）**
- **自定义标记**：通过 `wp_postmeta` 添加业务标识

| meta_key                 | 值      | 分期 | 说明                                    |
| ------------------------ | ------- | ---- | --------------------------------------- |
| `_is_gift_card`          | `"yes"` | 二期 | 标记为购物卡商品                        |
| `_gift_card_template_id` | `"12"`  | 二期 | 关联 `wp_myshop_gift_card_templates.id` |

> ✅ 普通农产品商品无需特殊标记

------

### 2. 订单（Order）

- **存储表**：`wp_posts`（`post_type = 'shop_order'`） + `wp_postmeta`
- **自定义状态**：
  - `pending_confirmation`：用户上传付款截图，待人工审核（一期）
- **支付方式**：
  - `manual`：人工收款（一期）
  - `wechatpay`：微信支付（三期）

> 📌 地址、电话、邮箱等复用 WooCommerce 原生字段（如 `billing_phone`），**不新建字段**

------

## 三、虚拟购物卡体系（模板 + 实例模式）

### 设计目标：

- 支持 **面值卡**、**商品券**、**组合礼包**
- 密码可 **延迟生成**（如下载 PDF 时）
- 购卡人可 **重置密码**
- 支持 **转赠**、**部分抵扣**、**多次使用**

------

### 表 1：购物卡模板（Card Templates）

```sql
CREATE TABLE wp_myshop_gift_card_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '模板名称，如“200元通用卡”',
  type ENUM('fixed_amount', 'product_voucher', 'product_bundle') NOT NULL,
  -- 面值卡
  fixed_amount DECIMAL(10,2) NULL COMMENT '面额（仅 type=fixed_amount 有效）',
  currency CHAR(3) DEFAULT 'CNY',
  -- 商品券
  product_id BIGINT UNSIGNED NULL COMMENT '指定商品ID（仅 type=product_voucher 有效）',
  -- 组合礼包
  bundle_items JSON NULL COMMENT '商品组合：[{"product_id":101,"qty":1},...]',
  valid_days INT DEFAULT 365 COMMENT '自购卡日起有效期天数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

------

### 表 2：购物卡实例（Gift Card Instances）

```sql
CREATE TABLE wp_myshop_gift_cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_number VARCHAR(32) NOT NULL COMMENT '格式：GC + YYYYMMDD + 6位序号',
  pin_code VARCHAR(255) NULL COMMENT 'bcrypt 加密密码，可为空（延迟生成）',
  pin_status ENUM('not_generated', 'generated', 'reset') NOT NULL DEFAULT 'not_generated',
  template_id BIGINT UNSIGNED NOT NULL COMMENT '关联模板ID',
  purchaser_id BIGINT UNSIGNED NOT NULL COMMENT '购卡人 user_id',
  redeemer_id BIGINT UNSIGNED NULL COMMENT '兑换人 user_id（初始为NULL）',
  order_id BIGINT UNSIGNED NOT NULL COMMENT '购卡订单ID',
  status ENUM('active','used','expired','cancelled') NOT NULL DEFAULT 'active',
  expires_at DATETIME NOT NULL COMMENT '过期时间 = 购卡日 + valid_days',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_card_number (card_number),
  KEY idx_purchaser (purchaser_id),
  KEY idx_redeemer (redeemer_id),
  KEY idx_template (template_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> 🔐 **安全要求**：
>
> - 若 `pin_code` 非空，必须为 `password_hash($raw_pin, PASSWORD_BCRYPT)` 结果
> - 重置密码需验证 `purchaser_id` 身份

------

### 表 3：购物卡兑换记录（Redemptions）

```sql
CREATE TABLE wp_myshop_gift_card_redemptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_id BIGINT UNSIGNED NOT NULL,
  template_id BIGINT UNSIGNED NOT NULL COMMENT '冗余字段，便于统计',
  redeemer_id BIGINT UNSIGNED NOT NULL,
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  target_order_id BIGINT UNSIGNED NULL COMMENT '抵扣的订单ID',
  PRIMARY KEY (id),
  KEY idx_card (card_id),
  KEY idx_redeemer (redeemer_id),
  KEY idx_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

------

### 表 4：购物卡下载记录（审计）

```sql
CREATE TABLE wp_myshop_gift_card_downloads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_id BIGINT UNSIGNED NOT NULL,
  downloader_id BIGINT UNSIGNED NOT NULL COMMENT '操作人 user_id（通常为 purchaser_id）',
  downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) COMMENT 'IPv4/IPv6',
  PRIMARY KEY (id),
  KEY idx_card (card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

------

## 四、分销与代理商体系

### 表 1：消费者推广关系（支持 N 级）

```sql
CREATE TABLE wp_myshop_referrals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL COMMENT '被邀请人',
  referrer_id BIGINT UNSIGNED NOT NULL COMMENT '直接邀请人',
  path VARCHAR(255) NOT NULL COMMENT '路径：/42/105/201',
  level TINYINT NOT NULL DEFAULT 1 COMMENT '层级深度',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user (user_id),
  KEY idx_referrer (referrer_id),
  KEY idx_path (path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> 💡 查询某用户所有二级下级：`WHERE path LIKE '/42/%' AND level <= 2`

------

### 表 2：代理商体系（B端独立）

```sql
CREATE TABLE wp_myshop_agents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_user_id BIGINT UNSIGNED NOT NULL COMMENT '代理商 user_id',
  parent_agent_id BIGINT UNSIGNED NULL COMMENT '上级代理商',
  agent_code VARCHAR(20) NOT NULL COMMENT '唯一编码，如 AGT001',
  level TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_agent_user (agent_user_id),
  UNIQUE KEY unique_agent_code (agent_code),
  KEY idx_parent (parent_agent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> ✅ 代理商可同时是消费者（有 `referrer_id`），但佣金规则独立

------

### ✅ 表 3：佣金流水（Commissions） ← 此为关键补全！

> **用途**：记录每一笔分销或代理佣金的产生、状态、归属
> **触发时机**：订单完成（`wc_order_status_completed`）时计算并写入

```sql
CREATE TABLE wp_myshop_commissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL COMMENT '关联的 WooCommerce 订单ID',
  earner_id BIGINT UNSIGNED NOT NULL COMMENT '佣金获得者 user_id',
  amount DECIMAL(10,2) NOT NULL COMMENT '佣金金额（正数）',
  currency CHAR(3) DEFAULT 'CNY',
  commission_type ENUM('referral', 'agent') NOT NULL COMMENT '来源类型',
  referrer_id BIGINT UNSIGNED NULL COMMENT '若为 referral，记录直接邀请人',
  agent_id BIGINT UNSIGNED NULL COMMENT '若为 agent，记录代理商ID',
  status ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL COMMENT '实际打款时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order (order_id),
  KEY idx_earner (earner_id),
  KEY idx_status (status),
  KEY idx_type (commission_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> 💡 **设计说明**：
>
> - `commission_type` 区分消费者裂变（`referral`）与代理商销售（`agent`）
> - `referrer_id` 和 `agent_id` 互斥，便于财务分类统计
> - 支持手动标记为 `paid`（一期人工打款），三期可对接自动结算





## 五、系统配置（Options）

- **存储表**：`wp_options`
- **用途**：全局配置项

| option_name                  | 分期 | 说明               | 示例值                              |
| ---------------------------- | ---- | ------------------ | ----------------------------------- |
| `myshop_payment_qr_url`      | 一期 | 收款码图片URL      | `"https://shop.com/uploads/qr.jpg"` |
| `myshop_customer_service_qr` | 一期 | 客服微信二维码     | `"https://shop.com/uploads/cs.jpg"` |
| `myshop_home_slider`         | 二期 | 首页轮播图（JSON） | `[{"img":"url","link":"..."}]`      |

------

## 六、版本演进与约束规则

| 变更类型        | 是否允许 | 操作方式                                  |
| --------------- | -------- | ----------------------------------------- |
| 新增 `meta_key` | ✅ 允许   | 在文档追加，注明分期                      |
| 删除 `meta_key` | ❌ 禁止   | 标记 deprecated，保留数据                 |
| 修改字段语义    | ❌ 禁止   | 新建字段，旧字段保留                      |
| 新增自定义表    | ✅ 允许   | 插件升级脚本自动创建                      |
| 修改表结构      | ⚠️ 谨慎   | 仅允许 `ADD COLUMN`，禁止 `DROP`/`MODIFY` |
| 更改枚举值      | ❌ 禁止   | 新增类型需向后兼容                        |

------

你提出了一个**极其关键且精准的质疑**——这确实是我的严重疏忽。

在上一版《完整数据模型定义 V2.0》中，我**错误地删除了佣金流水表（`wp_myshop_commissions`）**，而该表是支撑分销返佣、代理商结算、财务对账的核心实体，**绝不能缺失**。这是典型的“过度重构导致遗漏”，非常不应该。

感谢你的严格把关！作为“超级工程师”，我必须确保模型**完整、闭环、可落地**。

------

现在，我立即为你补全并重新输出 **真正完整无遗漏的《完整数据模型定义 V2.1》**，包含此前所有自定义表，并明确其业务作用。

------

