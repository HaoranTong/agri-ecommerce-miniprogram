好的！以下是你要的第二份配套文档：

------

# 🧱 WordPress 插件开发规范

## `myshop-core` 插件（V1.0 - 冻结基线）

> **适用项目**：微信小程序 × WordPress 无头电商系统（一期 + 二期）
> **目标**：确保代码结构清晰、安全可靠、可维护、可测试，且与 WooCommerce 深度集成而不破坏其生态
> **原则**：零核心修改、纯插件扩展、符合 WordPress 编码标准

------

## 一、插件基本信息

| 项目     | 值                                 |
| -------- | ---------------------------------- |
| 插件名称 | MyShop Core                        |
| 插件目录 | `/wp-content/plugins/myshop-core/` |
| 主文件   | `myshop-core.php`                  |
| 版本     | 1.0.0                              |
| 兼容 WP  | ≥ 6.5                              |
| 兼容 PHP | ≥ 7.4（推荐 8.0+）                 |
| 依赖插件 | WooCommerce ≥ 8.0                  |

### 主文件头部注释（必须包含）

```php
<?php
/**
 * Plugin Name: MyShop Core
 * Description: 微信小程序无头电商后端核心插件，提供 JWT 认证、自定义 API、分销、代理商、虚拟购物卡等功能。
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
├── uninstall.php                   # 插件卸载逻辑（可选）
├── composer.json                   # 依赖管理（如 firebase/php-jwt）
├── vendor/                         # Composer 依赖（gitignore）
│
├── includes/                       # 核心类库
│   ├── class-myshop-loader.php     # 自动加载器，负责初始化插件、加载控制器、注册 REST API 路由
│   ├── class-myshop-auth.php       # JWT 认证
│   └── class-myshop-wc-bridge.php  # WooCommerce 集成桥接
│
├── api/                            # API 控制器（按功能分）
│   ├── auth-controller.php
│   ├── user-controller.php
│   ├── cart-controller.php
│   ├── order-controller.php
│   ├── gift-card-controller.php
│   ├── referral-controller.php
│   └── agent-controller.php
│
├── db/                             # 数据库操作（CRUD）
│   ├── gift-cards.php
│   ├── class-myshop-db.php         # 数据库安装/升级
│   ├── commissions.php
│   └── agents.php
│   
├── admin/                          # 后台管理（一期可空）
│   └── class-myshop-admin.php
│
└── utils/                          # 工具函数
    ├── helpers.php                 # 常用函数（如 generate_invite_code）
    └── security.php                # 安全过滤函数
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

- 使用 `firebase/php-jwt`（通过 Composer 引入）

- Token 有效期：7 天

- 用户登录后返回：

  ```json
  { "token": "...", "user_id": 42, "invite_code": "U42ABC" }
  ```

- 中间件验证：

  ```php
  public static function validate_token( $token ) {
      try {
          $decoded = JWT::decode($token, new Key(MYSHOP_JWT_SECRET, 'HS256'));
          return get_user_by('id', $decoded->user_id);
      } catch (Exception $e) {
          return false;
      }
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

### 3. **数据库表设计（与数据模型 V2.1 对齐）**

#### a) 虚拟购物卡表

```sql
CREATE TABLE wp_myshop_gift_cards (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    card_number VARCHAR(32) NOT NULL UNIQUE,
    pin_hash VARCHAR(255) NOT NULL, -- bcrypt 加密
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    purchaser_id BIGINT UNSIGNED NOT NULL, -- 购卡人 user_id
    template_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active','redeemed','expired') DEFAULT 'active',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX purchaser_id (purchaser_id)
);
```

#### b) 佣金表

```sql
CREATE TABLE wp_myshop_commissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL, -- 收益人
    amount DECIMAL(10,2) NOT NULL,
    commission_type ENUM('referral','agent') NOT NULL,
    status ENUM('pending','paid') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX user_id (user_id),
    INDEX order_id (order_id)
);
```

> 💡 所有表前缀为 `wp_myshop_`，避免冲突

------

## 五、错误处理与日志

### 1. **统一错误格式**

所有 API 错误返回 `WP_Error`，自动转为 JSON：

```php
return new WP_Error(
    'invalid_card',
    '卡号或密码错误',
    [ 'status' => 400 ]
);
```

### 2. **关键操作日志（一期简化）**

- 订单创建：记录到 WooCommerce 订单备注
- 购物卡兑换：记录到 `wp_comments` 或自定义日志表
- 不启用文件日志（避免权限问题）

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

**文档版本**：V1.0（插件开发冻结基线）
**最后更新**：2025年11月18日
**输出格式**：Markdown（可直接保存为 `PLUGIN_SPEC.md`）

------

✅ 下一步建议：
请确认此规范是否符合你的技术栈和团队习惯。确认后，我将输出下一份文档：

> **《微信小程序工程结构规范》**

你可以回复：  

> “确认，继续输出微信小程序工程结构规范。”

