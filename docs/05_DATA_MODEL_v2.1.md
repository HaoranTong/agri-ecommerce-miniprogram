

------

# 🗂️ 微信小程序 × WordPress 无头电商系统

## **完整数据模型定义（V2.1 - 企业级基线标准）**

> **文档状态**：冻结基线（Baseline Frozen）
> **适用阶段**：一期（MVP） + 二期（虚拟购物卡 / 积分 / 分销 / 代理商） + 三期（私域自动化）
> **核心原则**：
>
> - ✅ 所有业务扩展字段通过 WordPress Meta 机制实现（`usermeta` / `postmeta`）
> - ✅ 自定义表仅用于需高效查询、事务控制或多对多关系场景
> - ✅ 字段命名全局唯一、不可变更、语义清晰
> - ✅ 100% 兼容免费版 WordPress 6.x + WooCommerce 8.x
- ✅ 支持未来扩展：多级分销、代理商体系、积分有效期、卡类型泛化

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
| `is_agent`         | string      | 二期 | ❌    | 是否为代理商（`"1"` / `"0"`）       | `"1"`                                                  |
| `agent_code`       | string      | 二期 | ❌    | 代理商编码（如 `"AGT001"`）         | `"AGT105"`                                             |
| `agent_parent_id`  | integer     | 二期 | ❌    | 上级代理商 user_id                  | `201`                                                  |

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
  type ENUM('fixed_amount', 'product_bundle') NOT NULL COMMENT '储值卡或商品兑换卡',
  fixed_amount DECIMAL(10,2) NULL COMMENT '面额（type=fixed_amount 时必填）',
  currency CHAR(3) DEFAULT 'CNY',
  product_id BIGINT UNSIGNED NULL COMMENT '兑换商品ID（商品卡可选）',
  variation_ids JSON NULL COMMENT '可兑换的变体ID数组',
  bundle_items JSON NULL COMMENT '组合礼包：[{"product_id":101,"quantity":1}]',
  delivery_modes JSON NOT NULL COMMENT '允许的发放形态，如 ["digital_share","printable"]',
  share_template_config JSON NULL COMMENT '数字分享海报/文案模板配置',
  print_template_url VARCHAR(255) NULL COMMENT '默认打印模板 PDF 地址',
  valid_days INT DEFAULT 365 COMMENT '自购卡日起有效期天数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

------

### 表 2：购物卡实例（Gift Card Instances）

```sql
CREATE TABLE wp_myshop_gift_cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_number VARCHAR(32) NOT NULL COMMENT '格式：GC + YYYYMMDD + 序号',
  template_id BIGINT UNSIGNED NOT NULL,
  template_type ENUM('fixed_amount','product_bundle') NOT NULL,
  initial_amount DECIMAL(10,2) DEFAULT 0 COMMENT '初始额度（储值卡使用）',
  balance DECIMAL(10,2) DEFAULT 0 COMMENT '当前余额（储值卡使用）',
  currency CHAR(3) DEFAULT 'CNY',
  linked_product_id BIGINT UNSIGNED NULL COMMENT '商品兑换卡：主商品ID',
  linked_variation_ids JSON NULL COMMENT '商品兑换卡：变体ID列表',
  bundle_config JSON NULL COMMENT '礼包配置，冗余模板数据',
  purchaser_id BIGINT UNSIGNED NOT NULL COMMENT '购卡人 user_id',
  redeemer_id BIGINT UNSIGNED NULL COMMENT '受赠人 user_id',
  order_id BIGINT UNSIGNED NOT NULL COMMENT '购卡订单ID',
  bind_status ENUM('unbound','bound') NOT NULL DEFAULT 'unbound',
  status ENUM('active','redeemed','locked','expired','cancelled') NOT NULL DEFAULT 'active',
  share_token VARCHAR(64) NULL COMMENT '当前分享令牌',
  share_channel VARCHAR(32) NULL COMMENT '最近一次分享渠道',
  share_token_expires_at DATETIME NULL COMMENT '分享令牌过期时间',
  print_package_url VARCHAR(255) NULL COMMENT '打印包下载地址',
  pin_code_hash VARCHAR(255) NULL COMMENT 'bcrypt 密码哈希',
  pin_revealed_at DATETIME NULL COMMENT 'PIN 最近一次展示时间',
  pin_reveal_limit TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '剩余可查看次数',
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_card_number (card_number),
  KEY idx_template (template_id),
  KEY idx_purchaser (purchaser_id),
  KEY idx_redeemer (redeemer_id),
  KEY idx_status (status),
  KEY idx_share_token (share_token)
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
  template_id BIGINT UNSIGNED NOT NULL,
  redeemer_id BIGINT UNSIGNED NOT NULL,
  redeem_type ENUM('deduct','exchange') NOT NULL COMMENT '抵扣储值或兑换商品',
  channel VARCHAR(32) NOT NULL DEFAULT 'miniprogram',
  operator_id BIGINT UNSIGNED NULL COMMENT '人工核销时记录操作人',
  used_amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  target_order_id BIGINT UNSIGNED NULL COMMENT '抵扣/兑换的订单ID',
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_card (card_id),
  KEY idx_redeemer (redeemer_id),
  KEY idx_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

------

### 表 4：购物卡分享 / 打印审计（Share Logs）

```sql
CREATE TABLE wp_myshop_gift_card_share_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_id BIGINT UNSIGNED NOT NULL,
  operator_id BIGINT UNSIGNED NOT NULL COMMENT '生成分享包的用户（通常为购卡人）',
  delivery_mode ENUM('digital_share','printable') NOT NULL,
  channel VARCHAR(32) NOT NULL COMMENT 'wechat / dingding / email / custom',
  share_token VARCHAR(64) NULL COMMENT '生成的新令牌',
  print_package_url VARCHAR(255) NULL COMMENT '生成的打印包地址',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  PRIMARY KEY (id),
  KEY idx_card (card_id),
  KEY idx_operator (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

------

## 四、积分体系

### 表 1：积分流水（Point Ledger）

```sql
CREATE TABLE wp_myshop_point_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('earn','spend','adjust','expire') NOT NULL,
  delta INT NOT NULL COMMENT '积分增减，负数为抵扣',
  balance_after INT NOT NULL COMMENT '变化后的可用积分',
  reference_order_id BIGINT UNSIGNED NULL COMMENT '关联订单ID（如有）',
  reservation_id VARCHAR(64) NULL COMMENT '预占标识，用于 reserve/confirm 流程',
  status ENUM('pending','confirmed','released') NOT NULL DEFAULT 'confirmed',
  channel VARCHAR(32) NOT NULL DEFAULT 'order',
  operator_id BIGINT UNSIGNED NULL COMMENT '人工操作时记录后台操作人',
  expire_at DATETIME NULL COMMENT '积分过期时间（earn 类型）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_type (type),
  KEY idx_status (status),
  KEY idx_reservation (reservation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> ✅ `status=pending` 用于订单预占积分，支付成功后更新为 `confirmed`，超时释放改为 `released`。

------

## 五、分销与代理商体系

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
  agent_user_id BIGINT UNSIGNED NOT NULL COMMENT '代理商 user_id，可重复出现（多区域持有）',
  parent_agent_id BIGINT UNSIGNED NULL COMMENT '上级代理商',
  agent_code VARCHAR(20) NOT NULL COMMENT '唯一编码，如 AGT001',
  level TINYINT NOT NULL DEFAULT 1,
  region_zone VARCHAR(50) NULL COMMENT '大区，如 华南',
  region_province VARCHAR(50) NULL COMMENT '省份，如 广东省',
  region_city VARCHAR(50) NULL COMMENT '城市/地市，如 深圳市',
  region VARCHAR(50) NULL COMMENT '冗余的展示用文案',
  region_key VARCHAR(191) NOT NULL COMMENT '归一化后的区域唯一键 zone#province#city',
  active_until DATETIME NULL COMMENT '合同到期时间',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在合同期内',
  status ENUM('active','frozen','terminated') NOT NULL DEFAULT 'active',
  joined_at DATETIME NOT NULL,
  invite_qr VARCHAR(255) NULL COMMENT '面向客户的招生二维码',
  team_target LONGTEXT NULL COMMENT '团队目标配置，如销售额/新客目标',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_agent_code (agent_code),
  KEY idx_agent_user (agent_user_id),
  KEY idx_parent (parent_agent_id),
  KEY idx_region_zone (region_zone),
  KEY idx_region_province (region_province),
  KEY idx_region_key (region_key),
  KEY idx_region_combo (region_zone, region_province, region_city),
  KEY idx_active_until (active_until)
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
  settlement_batch VARCHAR(50) NULL COMMENT '财务批次号，如 2025-11-W3',
  status ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
  expected_payout_at DATETIME NULL,
  paid_at DATETIME NULL COMMENT '实际打款时间',
  note VARCHAR(255) NULL COMMENT '运营备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
> - 状态流转：`pending → approved → paid` 或 `pending → rejected`
> - 支持手动标记为 `paid`（一期人工打款），后续可接入自动结算

------

### 表 4：代理商操作审计（Agent Audit Logs）

```sql
CREATE TABLE wp_myshop_agent_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(50) NOT NULL COMMENT '如 freeze / upgrade_level / reset_invite_code',
  reason VARCHAR(255) NULL,
  operator_id BIGINT UNSIGNED NOT NULL COMMENT '后台操作人',
  payload JSON NULL COMMENT '操作前后数据快照',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agent (agent_user_id),
  KEY idx_operator (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```





## 六、系统配置（Options）

- **存储表**：`wp_options`
- **用途**：全局配置项

| option_name                  | 分期 | 说明               | 示例值                              |
| ---------------------------- | ---- | ------------------ | ----------------------------------- |
| `myshop_payment_qr_url`      | 一期 | 收款码图片URL      | `"https://shop.com/uploads/qr.jpg"` |
| `myshop_customer_service_qr` | 一期 | 客服微信二维码     | `"https://shop.com/uploads/cs.jpg"` |
| `myshop_home_slider`         | 二期 | 首页轮播图（JSON） | `[{"img":"url","link":"..."}]`      |

------

## 七、版本演进与约束规则

| 变更类型        | 是否允许 | 操作方式                                  |
| --------------- | -------- | ----------------------------------------- |
| 新增 `meta_key` | ✅ 允许   | 在文档追加，注明分期                      |
| 删除 `meta_key` | ❌ 禁止   | 标记 deprecated，保留数据                 |
| 修改字段语义    | ❌ 禁止   | 新建字段，旧字段保留                      |
| 新增自定义表    | ✅ 允许   | 插件升级脚本自动创建                      |
| 修改表结构      | ⚠️ 谨慎   | 仅允许 `ADD COLUMN`，禁止 `DROP`/`MODIFY` |
| 更改枚举值      | ❌ 禁止   | 新增类型需向后兼容                        |

------



------



