好的！以下是你要的第二份配套文档：

------

# 🧱 WordPress 插件开发规范

## `myshop-core` 插件（V1.1 - 冻结基线）

> **适用项目**：微信小程序 × WordPress 无头电商系统（一期 + 二期：购物卡 / 积分 / 分销 / 代理商）  
> **目标**：确保插件结构清晰、安全、可扩展，与 WooCommerce 深度集成同时保持可维护性  
> **原则**：零核心修改、纯插件扩展、遵循 WordPress 编码标准、API 契约 V2.3 / 数据模型 V2.1 对齐

> 说明：接口路径/字段/错误码以 `docs/08_API_CONTRACT_V2.3.md` 与 `docs/06_DATA_DICTIONARY_v1.2.md` 为唯一来源；本文仅描述插件结构与实现规范，不作为接口定义依据。

------

## 一、插件基本信息

| 项目     | 值                                 |
| -------- | ---------------------------------- |
| 插件名称 | MyShop Core                        |
| 插件目录 | `/wp-content/plugins/myshop-core/` |
| 主文件   | `myshop-core.php`                  |
| 版本     | 1.1.0                              |
| 兼容 WP  | ≥ 6.5                              |
| 兼容 PHP | ≥ 7.4（推荐 8.0+）                 |
| 依赖插件 | WooCommerce ≥ 8.0                  |

### 主文件头部注释（必须包含）

```php
<?php
/**
 * Plugin Name: MyShop Core
 * Description: 微信小程序无头电商后端核心插件，提供 JWT 认证、自定义 API、虚拟购物卡、积分、分销、代理商等功能。
 * Version: 1.0.0
 * Author: Your Team
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * WC requires at least: 8.0
 * WC tested up to: 9.3
 */
```

> ⚠️ **禁止**在主文件中写业务逻辑，仅用于加载和初始化。所有 API 业务逻辑必须封装在类中，禁止使用全局过程式函数。

------

## 二、目录结构规范

```bash
myshop-core/
├── myshop-core.php                 # 插件主入口
├── includes/                       # 核心类库
│   ├── class-myshop-loader.php     # 自动加载器，负责初始化插件、加载控制器、注册 REST API 路由
│   ├── class-myshop-auth.php       # JWT 认证
│   ├── class-myshop-commission-service.php  # 佣金与归因服务
│   └── class-myshop-wechat.php     # 微信服务封装
│
├── api/                            # API 控制器（按功能分）
│   ├── auth-controller.php
│   ├── user-controller.php
│   ├── cart-controller.php
│   ├── order-controller.php
│   ├── gift-card-controller.php
│   ├── points-controller.php
│   ├── referral-controller.php
│   ├── commission-controller.php
│   ├── agent-controller.php
│   ├── analytics-controller.php
│   ├── promo-controller.php
│   └── payment-controller.php
│
├── db/                             # 数据库操作（CRUD）
│   ├── class-myshop-db.php         # 数据库安装/升级
│   
├── admin/                          # 后台管理（一期可空）
│   ├── config-page.php
│   ├── points-manager.php
│   ├── commission-manager.php
│   ├── order-manager.php
│   ├── return-manager.php
│   ├── test-users-manager.php
│   ├── gift-card-template-manager.php
│   ├── gift-card-manager.php
│   ├── gift-card-share-style-manager.php
│   ├── cleanup-test-users.php
│   └── slider-shortcode.php
│
├── assets/                         # 前端资源（模板、图片等）
├── docs/                           # 插件内部文档
└── tests/                          # 插件回归测试脚本
```

> ✅ 所有 PHP 文件使用 **小写 + 连字符命名**（WordPress 推荐风格）。api/ 目录中的每个控制器文件必须定义一个类（如 Order_Controller），并通过类的静态或实例方法处理请求，禁止直接编写顶层函数。

------

## 三、编码规范

### 1. **命名约定**

| 类型 | 规则                                   | 示例                            |
| ---- | -------------------------------------- | ------------------------------- |
| 类名 | `class-myshop-{name}.php` + PascalCase | `MyShop_Auth`                   |
| 方法 | snake_case（WordPress 风格）           | `create_order_from_variation()` |
| 函数 | `myshop_{action}`                      | `myshop_generate_agent_code()`  |
| Hook | `myshop/{action}`                      | `myshop/order_created`          |

### 2. **安全实践**

- **所有用户输入必须过滤**：

  ```php
  $variation_id = absint( $_POST['variation_id'] ?? 0 );
  $phone = sanitize_text_field( $_POST['phone'] ?? '' );
  ```

- **数据库操作必须预处理**：

  ```php
  global $wpdb;
  $card = $wpdb->get_row(
      $wpdb->prepare(
          "SELECT * FROM {$wpdb->prefix}myshop_gift_cards WHERE card_number = %s",
          $card_number
      )
  );
  ```

- **权限检查**：

  ```php
  if ( ! MyShop_Auth::is_current_user( $user_id ) ) {
      return new WP_Error( 'forbidden', '无权访问', [ 'status' => 403 ] );
  }
  ```

### 3. **WooCommerce 集成原则**

- **绝不直接操作 `wp_posts` 表**

- 使用官方函数：

  - 创建订单：`wc_create_order()`
  - 设置地址：`$order->set_address()`
  - 添加商品：`$order->add_product()`
  - 更新状态：`$order->update_status('completed')`

- 监听钩子实现自动化：

  ```php
  add_action( 'woocommerce_order_status_completed', 'myshop_handle_commission_on_complete' );
  ```
  
  > 所有回调函数若涉及复杂业务逻辑，应委托给对应服务类或控制器类方法，避免在顶层函数中堆积代码。

------

## 四、关键模块实现说明

### 1. **JWT 认证（`class-myshop-auth.php`）**

- 使用自研 JWT（HS256 + HMAC）实现

- Token 有效期：7 天

- 用户登录后返回：

  ```json
  { "token": "...", "user_id": 42, "openid": "oAbcDEF123..." }
  ```

- 中间件验证：

  ```php
    public static function validate_token( $token ) {
      // 解析 token 并校验签名与 exp
      // 校验通过后返回 WP_User
    }
  ```

### 2. **API 路由注册（`class-myshop-loader.php`）**

```markdown
## 4. 路由注册位置

所有 REST API 路由注册在 `includes/class-myshop-loader.php` 中完成。

- `MyShop_Loader::register_routes()` 方法负责注册所有接口  
- 使用 `add_action('rest_api_init', ...)` 触发  
- 控制器通过 `require_once` 在 `init()` 中提前加载
```

- 使用 WordPress REST API 注册：

- 正确实现：在 class-myshop-loader.php 中注册

### 3. **支付模块（`payment-controller.php`）**

**目标**：统一支付入口，支持 `wechat` 与 `offline`，后续可扩展更多支付方式。

**必须配置的常量（wp-config.php）：**

- `MYSHOP_WECHAT_APP_ID`
- `MYSHOP_WECHAT_MCH_ID`
- `MYSHOP_WECHAT_SERIAL_NO`（商户证书序列号）
- `MYSHOP_WECHAT_PRIVATE_KEY`（支持文件路径或私钥内容）
- `MYSHOP_WECHAT_API_V3_KEY`（32 字节）
- `MYSHOP_WECHAT_PLATFORM_SERIAL`（平台证书序列号）
- `MYSHOP_WECHAT_PLATFORM_CERT`（支持文件路径或证书内容，旧方式）
- `MYSHOP_WECHAT_PLATFORM_PUBLIC_KEY`（支持文件路径或公钥内容，新方式）
- `MYSHOP_MINIAPP_APP_ID`（小程序 AppID，支持与支付 AppID 复用）
- `MYSHOP_MINIAPP_APP_SECRET`（小程序 AppSecret，用于 code2session）
- `MYSHOP_ALLOW_TEST_LOGIN`（允许测试登录，默认 false）

**关键说明：**

- 回调验签使用平台公钥/平台证书公钥，需匹配 `Wechatpay-Serial`。
- 回调体需用 API v3 Key 解密（AES-256-GCM）。

  

  ```php
  register_rest_route( 'myshop/v1', '/auth/login', [
      'methods'  => 'POST',
      'callback' => [ 'Auth_Controller', 'login' ],
      'permission_callback' => '__return_true'
  ]);
  ```

- 所有需认证接口设置：

  ```php
  'permission_callback' => [ 'MyShop_Auth', 'check_permission' ]
  ```

### 3. **数据库表设计与升级（同步《数据模型 V2.1》）**

> 所有表使用 `utf8mb4_unicode_ci`，并通过 `class-myshop-db::install()` 与 `upgrade()` 统一创建/迁移。

#### a) 虚拟购物卡相关

```sql
CREATE TABLE {$wpdb->prefix}myshop_gift_card_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type ENUM('fixed_amount','product_bundle') NOT NULL,
  fixed_amount DECIMAL(10,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  product_id BIGINT UNSIGNED NULL,
  variation_ids JSON NULL,
  bundle_items JSON NULL,
  delivery_modes JSON NOT NULL,
  share_template_config JSON NULL,
  print_template_url VARCHAR(255) NULL,
  valid_days INT NOT NULL DEFAULT 365,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE {$wpdb->prefix}myshop_gift_cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_number VARCHAR(32) NOT NULL,
  template_id BIGINT UNSIGNED NOT NULL,
  template_type ENUM('fixed_amount','product_bundle') NOT NULL,
  initial_amount DECIMAL(10,2) NULL,
  balance DECIMAL(10,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  linked_product_id BIGINT UNSIGNED NULL,
  linked_variation_ids JSON NULL,
  bundle_config JSON NULL,
  purchaser_id BIGINT UNSIGNED NOT NULL,
  redeemer_id BIGINT UNSIGNED NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  bind_status ENUM('unbound','bound') NOT NULL DEFAULT 'unbound',
  status ENUM('active','redeemed','locked','expired','cancelled') NOT NULL DEFAULT 'active',
  share_token VARCHAR(64) NULL,
  share_channel VARCHAR(32) NULL,
  share_token_expires_at DATETIME NULL,
  print_package_url VARCHAR(255) NULL,
  pin_code_hash VARCHAR(255) NULL,
  pin_revealed_at DATETIME NULL,
  pin_reveal_limit TINYINT UNSIGNED NOT NULL DEFAULT 1,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_card_number (card_number),
  KEY idx_template (template_id),
  KEY idx_purchaser (purchaser_id),
  KEY idx_redeemer (redeemer_id),
  KEY idx_status (status),
  KEY idx_share_token (share_token)
) ENGINE=InnoDB;

CREATE TABLE {$wpdb->prefix}myshop_gift_card_redemptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_id BIGINT UNSIGNED NOT NULL,
  template_id BIGINT UNSIGNED NOT NULL,
  redeemer_id BIGINT UNSIGNED NOT NULL,
  redeem_type ENUM('deduct','exchange') NOT NULL,
  channel VARCHAR(32) NOT NULL DEFAULT 'miniprogram',
  operator_id BIGINT UNSIGNED NULL,
  used_amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  target_order_id BIGINT UNSIGNED NULL,
  redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_card (card_id),
  KEY idx_redeemer (redeemer_id)
) ENGINE=InnoDB;

CREATE TABLE {$wpdb->prefix}myshop_gift_card_share_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_id BIGINT UNSIGNED NOT NULL,
  operator_id BIGINT UNSIGNED NOT NULL,
  delivery_mode ENUM('digital_share','printable') NOT NULL,
  channel VARCHAR(32) NOT NULL,
  share_token VARCHAR(64) NULL,
  print_package_url VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_card (card_id),
  KEY idx_operator (operator_id)
) ENGINE=InnoDB;
```

#### b) 积分与分销

```sql
CREATE TABLE {$wpdb->prefix}myshop_point_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('earn','spend','adjust','expire') NOT NULL,
  delta INT NOT NULL,
  balance_after INT NOT NULL,
  reference_order_id BIGINT UNSIGNED NULL,
  reservation_id VARCHAR(64) NULL,
  status ENUM('pending','confirmed','released') NOT NULL DEFAULT 'confirmed',
  channel VARCHAR(32) NOT NULL DEFAULT 'order',
  operator_id BIGINT UNSIGNED NULL,
  expire_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  KEY idx_reservation (reservation_id)
) ENGINE=InnoDB;

CREATE TABLE {$wpdb->prefix}myshop_commissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  earner_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  commission_type ENUM('referral','agent') NOT NULL,
  referrer_id BIGINT UNSIGNED NULL,
  agent_id BIGINT UNSIGNED NULL,
  settlement_batch VARCHAR(50) NULL,
  status ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
  expected_payout_at DATETIME NULL,
  paid_at DATETIME NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order (order_id),
  KEY idx_earner (earner_id),
  KEY idx_status (status)
) ENGINE=InnoDB;
```

#### c) 代理商扩展

```sql
CREATE TABLE {$wpdb->prefix}myshop_agents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_user_id BIGINT UNSIGNED NOT NULL,
  parent_agent_id BIGINT UNSIGNED NULL,
  agent_code VARCHAR(20) NOT NULL,
  level TINYINT NOT NULL DEFAULT 1,
  region VARCHAR(50) NULL,
  status ENUM('active','frozen','terminated') NOT NULL DEFAULT 'active',
  joined_at DATETIME NOT NULL,
  invite_qr VARCHAR(255) NULL,
  team_target JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_agent_user (agent_user_id),
  UNIQUE KEY uniq_agent_code (agent_code),
  KEY idx_parent (parent_agent_id)
) ENGINE=InnoDB;

CREATE TABLE {$wpdb->prefix}myshop_agent_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(50) NOT NULL,
  reason VARCHAR(255) NULL,
  operator_id BIGINT UNSIGNED NOT NULL,
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agent (agent_user_id)
) ENGINE=InnoDB;
```

> 💡 结构变更流程：新增/修改字段只允许 `ADD COLUMN`；所有升级脚本需幂等执行并写入 `myshop_db_version`。

------

## 五、错误处理与日志

### 1. **统一错误格式**

- 所有控制器返回 `WP_REST_Response` 或 `WP_Error`。
- **错误码/HTTP 状态唯一出处**：`docs/08_API_CONTRACT_V2.3.md`。本规范不得新增或改写错误码定义。

### 2. **关键操作日志与审计**

- 订单付款审核：写入 WooCommerce 订单备注，并同步更新 `_payment_proof_status`。 
- 购物卡分享 / 打印：统一写入 `wp_myshop_gift_card_share_logs`，便于审计。 
- 购物卡核销：写入 `wp_myshop_gift_card_redemptions`，同时在订单备注添加记录。 
- 代理商冻结/升级：写入 `wp_myshop_agent_audit_logs`，并在后台 UI 显示。 
- 推荐使用 `error_log()` 仅在 DEBUG 模式下输出；生产环境依赖数据库审计。

------

## 六、插件激活与升级

### `class-myshop-db.php`

```php
public static function install() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'myshop_gift_cards';
    if ( $wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name ) {
        // 创建表
    }
    update_option( 'myshop_db_version', MYSHOP_VERSION );
}

public static function upgrade() {
    $installed_ver = get_option( 'myshop_db_version' );
    if ( version_compare( $installed_ver, '1.0.0', '<' ) ) {
        // 升级逻辑
    }
}
```

> 在 `register_activation_hook` 中调用 `install()`

------

## 七、测试建议

| 测试类型 | 工具              | 说明                       |
| -------- | ----------------- | -------------------------- |
| 单元测试 | PHPUnit + WP_Mock | 测试工具函数、DB 操作      |
| API 测试 | Postman           | 使用契约 V2.3 作为测试用例 |
| 集成测试 | 手动 + 小程序真机 | 验证完整下单流程           |

------

## 八、禁止事项（红线）

- ❌ 修改 WordPress 或 WooCommerce 核心文件
- ❌ 直接 `echo` 输出（必须通过 REST API 返回 JSON）
- ❌ 使用 `$_SESSION`（无状态 JWT）
- ❌ 硬编码域名或路径（使用 `home_url()` / `plugin_dir_url()`）
- ❌ 明文存储 PIN 或密码
- ❌ 在任何文件中使用全局过程式函数处理 API 请求逻辑（如 function handle_order()）。所有业务逻辑必须封装在类的方法中。

------

**文档版本**：V1.1（插件开发冻结基线）  
**最后更新**：2025年11月22日  
**输出格式**：Markdown（`docs/09_PLUGIN_SPEC_v1.1.md`）

-------

✅ 推荐配套文档：
1. `docs/01_功能规格及技术架构说明书_v1.0.md`
2. `docs/08_API_CONTRACT_V2.3.md`
3. `docs/05_DATA_MODEL_v2.1.md` / `docs/06_DATA_DICTIONARY_v1.2.md`

如插件实现与本规范不一致，请立即登记差异并回归修复。持续精进，保障交付质量！



