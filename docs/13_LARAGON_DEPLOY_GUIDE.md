非常感谢你提供详细的 **Laragon 配置信息**！现在我将根据你的实际开发环境（Windows + Laragon）重新输出一份 **本地开发部署手册**，专为 `E:\laragon\www\agri-ecommerce` 项目定制。

------

# 🛠️ Laravel 开发环境部署手册（基于 Laragon）

## `MyShop 无头电商系统` · V1.0（本地开发版）

> **适用场景**：Windows 本地开发 → 使用 Laragon 搭建 WordPress + WooCommerce + MyShop Core 插件环境
> **目标**：快速搭建、一键启动、与生产环境结构一致，支持调试和 API 测试
> **前提**：已安装 Laragon 2.4.62，PHP 8.3.26，MySQL 8.4.3

------

## 一、Laragon 环境概览

| 组件       | 版本             | 端口   | 备注                 |
| ---------- | ---------------- | ------ | -------------------- |
| Apache     | 2.4.62           | 80/443 | 已启用 SSL           |
| MySQL      | 8.4.3            | 3306   | 数据库服务           |
| PHP        | 8.3.26           | -      | 已配置 `php.ini`     |
| Mailpit    | 1.22.3           | 1025   | 用于邮件调试（可选） |
| 文件根目录 | `E:\laragon\www` | -      | 所有项目存放于此     |

> ✅ 你已设置自动创建虚拟主机：`{name}.test`，如 `agri-ecommerce.test`

------

## 二、本地项目目录结构

```bash
E:\laragon\www\agri-ecommerce/
├── wp-content/
│   ├── plugins/
│   │   └── myshop-core/             # 你的插件代码
│   └── uploads/
│       └── myshop-payment-proofs/   # 用户上传的付款截图
├── wp-config.php                    # 数据库配置
└── .htaccess                        # Apache 重写规则
```

> 💡 项目名：`agri-ecommerce`，对应域名：`agri-ecommerce.test`

------

## 三、部署步骤（Windows + Laragon）

### 步骤 1：创建项目目录

```bash
# 在命令行或资源管理器中创建
mkdir E:\laragon\www\agri-ecommerce
```

------

### 步骤 2：下载并解压 WordPress

```bash
# 下载最新版 WordPress
https://wordpress.org/latest.zip

# 解压到项目目录
E:\laragon\www\agri-ecommerce\
```

> ✅ 自动创建 `wp-config-sample.php` 和 `index.php`

------

### 步骤 3：配置数据库

#### 1. 启动 MySQL 服务

- 打开 Laragon → 点击 MySQL 图标 → 启动

#### 2. 创建数据库

- 打开 **phpMyAdmin**（Laragon 菜单 → phpMyAdmin）
- 新建数据库：
  - 名称：`agri_ecommerce_wp`
  - 字符集：`utf8mb4`
  - 排序规则：`utf8mb4_unicode_ci`

#### 3. 创建用户（可选）

- 用户名：`myshop_user`
- 密码：`StrongPassword123!`
- 权限：全部权限

> ⚠️ 一期使用默认 root 用户即可，无需单独创建

------

### 步骤 4：配置 `wp-config.php`

```php
// E:\laragon\www\agri-ecommerce/wp-config.php
<?php
define('DB_NAME', 'agri_ecommerce_wp');
define('DB_USER', 'root'); // 或 myshop_user
define('DB_PASSWORD', ''); // 如果用 root，密码为空
define('DB_HOST', 'localhost');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

// 安全密钥（建议从 https://api.wordpress.org/secret-key/1.1/salt/ 生成）
define('AUTH_KEY',         'your-auth-key-here');
define('SECURE_AUTH_KEY',  'your-secure-auth-key-here');
define('LOGGED_IN_KEY',    'your-logged-in-key-here');
define('NONCE_KEY',        'your-nonce-key-here');
define('AUTH_SALT',        'your-auth-salt-here');
define('SECURE_AUTH_SALT', 'your-secure-auth-salt-here');
define('LOGGED_IN_SALT',   'your-logged-in-salt-here');
define('NONCE_SALT',       'your-nonce-salt-here');
```

> ✅ 保存后，访问 `http://agri-ecommerce.test` 即可进入 WordPress 安装向导

------

### 步骤 5：初始化 WordPress

1. 访问 `http://agri-ecommerce.test`
2. 选择语言 → “中文（简体）”
3. 填写数据库信息：
   - 数据库名：`agri_ecommerce_wp`
   - 用户名：`root`
   - 密码：留空
   - 主机：`localhost`
4. 完成安装，创建管理员账号

------

### 步骤 6：安装必要插件

#### 1. 安装 WooCommerce

- 登录后台 → 插件 → 添加新插件 → 搜索 “WooCommerce” → 安装并激活
- 按向导完成商店设置（商品、支付方式等）

#### 2. 安装 MyShop Core 插件

- 将 `myshop-core` 文件夹复制到：

  ```
  E:\laragon\www\agri-ecommerce\wp-content\plugins\myshop-core
  ```

- 回到后台 → 插件 → 找到 “MyShop Core” → 激活

> ✅ 插件会自动注册 REST API 路由和 JWT 认证逻辑

------

### 步骤 7：配置 HTTPS（推荐）

Laragon 默认启用 SSL，端口为 `443`，因此：

- 访问 `https://agri-ecommerce.test` 即可使用 HTTPS
- 证书由 Laragon 自动生成，浏览器会提示“不安全”，但不影响开发

> 💡 生产环境需使用 Let’s Encrypt 证书

------

### 步骤 8：配置微信小程序接口地址

在 `myshop-core` 插件中，确保 API 基础路径正确：

```php
// class-myshop-api.php
const API_BASE = 'https://agri-ecommerce.test/wp-json/myshop/v1';
```

> ✅ 本地测试时，小程序请求应指向 `https://agri-ecommerce.test/wp-json/myshop/v1`

------

## 四、关键目录权限设置（Windows）

由于是本地开发，无需特殊权限控制，但建议：

```bash
# 保证以下目录可写
E:\laragon\www\agri-ecommerce\wp-content\uploads
E:\laragon\www\agri-ecommerce\wp-content\plugins\myshop-core\logs
```

> ✅ Windows 默认权限足够，无需额外操作

------

## 五、常见问题排查

| 问题                           | 解决方案                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| 无法访问 `agri-ecommerce.test` | 检查 Laragon 是否启动了 Apache；确认防火墙未阻止端口 80/443  |
| WordPress 安装失败             | 检查 `wp-config.php` 中数据库名是否正确；确认 MySQL 正在运行 |
| 插件无法激活                   | 检查文件夹是否完整；确认 PHP 版本兼容（8.3.26 支持）         |
| API 返回 500 错误              | 查看 `E:\laragon\data\logs\php_errors.log` 获取详细错误      |
| 上传截图失败                   | 检查 `uploads` 目录是否可写；确认磁盘空间充足                |

------

## 六、开发调试建议

### 1. **查看 PHP 错误日志**

- 路径：`E:\laragon\data\logs\php_errors.log`

- 设置：在 `php.ini` 中开启：

  ```ini
  display_errors = On
  log_errors = On
  error_log = "E:/laragon/data/logs/php_errors.log"
  ```

### 2. **使用 Postman 测试 API**

- Base URL：`https://agri-ecommerce.test/wp-json/myshop/v1`

- Headers：`Authorization: Bearer <token>`

- 示例请求：

  ```json
  POST /auth/login
  {
    "code": "wx_login_code_from_miniprogram"
  }
  ```

### 3. **调试微信小程序**

- 小程序开发者工具 → 项目设置 → 服务器域名 → 添加：
  - `https://agri-ecommerce.test`
  - `https://agri-ecommerce.test/wp-json/myshop/v1`

------

## 七、本地开发 vs 生产环境对比

| 项目       | 本地（Laragon）       | 生产（云服务器） |
| ---------- | --------------------- | ---------------- |
| Web 服务器 | Apache                | Nginx            |
| PHP        | 8.3.26                | 8.0+             |
| 数据库     | MySQL 8.4.3           | MySQL 8.0        |
| 域名       | `agri-ecommerce.test` | `yourdomain.com` |
| SSL        | 自签名                | Let's Encrypt    |
| 存储       | 本地文件系统          | 本地 + 对象存储  |

> ✅ 本地开发结构与生产一致，仅域名和证书不同

------

## 八、归档建议

将以下文件放入项目根目录：

```bash
agri-ecommerce/
├── README.md                 # 本手册
├── laragon-deploy-guide.md   # 本地部署说明
├── myshop-core/              # 插件源码
└── wp-content/
    └── plugins/
        └── myshop-core/
```

------

**文档版本**：V1.0（Laragon 本地开发版）
**最后更新**：2025年11月18日
**输出格式**：Markdown（可直接保存为 `13_LARAGON_DEPLOY_GUIDE.md`）

------

✅ 下一步建议：
本手册已完全适配你的 **Laragon 开发环境**。
你可以将其作为团队内部标准文档，供其他成员快速上手。

请回复：  

> “确认，本地部署手册完成。”  

我将为你生成 **完整文档包清单** 并提供归档建议。

