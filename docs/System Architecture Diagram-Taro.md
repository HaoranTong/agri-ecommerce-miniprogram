

------

# 🏗️ 系统架构图（System Architecture Diagram）

## 微信小程序 × WordPress 无头电商系统（一期 + 二期基线）

> **版本**：V1.1（Taro 前端架构冻结基线）
> **适用阶段**：一期（MVP 人工收款） + 二期（虚拟购物卡 / 分销 / 代理商）
> **目标**：清晰展示组件边界、数据流向、技术选型与扩展点  

```mermaid
graph LR
    subgraph "前端层（Taro React）"
        A[Taro 小程序] -->|HTTPS / REST API| B[WordPress 站点]
    end

    subgraph "后端服务层"
        B --> C[WooCommerce 8.x]
        B --> D[自定义插件: myshop-core]
        D --> E[(MySQL 数据库)]
        D --> F[本地文件存储]
    end

    subgraph "人工运营环节（一期特有）"
        G[运营人员] -->|登录 wp-admin| B
        G -->|审核订单| H[WooCommerce 订单列表]
        G -->|查看付款截图| F
    end

    subgraph "用户交互流程"
        A -->|微信授权登录| D
        A -->|浏览商品| C
        A -->|下单（manual 支付）| D
        A -->|上传付款截图| D --> F
        A -->|查看订单状态| D
        A -->|兑换购物卡| D
        A -->|查看分销/代理收益| D
    end

    classDef wp fill:#4CAF50,stroke:#388E3C,color:white;
    classDef plugin fill:#2196F3,stroke:#0D47A1,color:white;
    classDef db fill:#FF9800,stroke:#E65100,color:white;
    classDef user fill:#9C27B0,stroke:#4A148C,color:white;

    class B wp;
    class D plugin;
    class E db;
    class A,G user;
```

## 二、架构说明

### 1. **前端层（Frontend）**

- **载体**：Taro 4 + React 18 + TypeScript（编译为微信小程序）
- **职责**：
  - 用户交互（登录、浏览、下单、上传）
  - 调用 `/wp-json/myshop/v1/...` 接口
  - 本地状态管理（使用 Zustand 管理 Token、购物车、用户信息）
  - 组件复用（`<ProductCard />`, `<SpecSelector />`, `<Countdown />`）
- **限制**：
  - 不直接访问数据库
  - 所有业务逻辑由后端 API 驱动
- **优势**：
  - **AI 友好**：React 函数式组件 + TypeScript 类型系统，便于 AI 自动生成高内聚代码
  - **长期可维护**：强类型约束减少运行时错误，组件隔离避免全局污染
  - **未来扩展**：一套代码可编译为 H5（用于推广页）、App（若需）

> ⚠️ **关键变更**：从原生小程序升级为 Taro 框架，以支持一人公司 + AI 编程的长期演进需求。

------

### 2. **后端服务层（Backend）**

#### a) **WordPress 核心（v6.5+）**

- 提供用户体系（`wp_users`）、角色权限、REST API 基础框架
- 启用固定链接（Permalinks）以支持干净 URL

#### b) **WooCommerce（v8.x）**

- **核心作用**：
  - 商品管理（变体商品）
  - 订单生命周期（状态流转）
  - 地址、库存、价格计算
- **集成方式**：
  - 自定义插件通过 WooCommerce Hooks 和 Functions 操作订单/商品
  - **绝不修改 WooCommerce 核心文件**

#### c) **自定义插件：`myshop-core`**

- **位置**：`/wp-content/plugins/myshop-core/`

- **核心模块**：

  | 模块                      | 功能                                                         |
  | ------------------------- | ------------------------------------------------------------ |
  | `Auth`                    | JWT 登录、Token 验证                                         |
  | `API Routes`              | 实现所有 `/myshop/v1/...` 接口                               |
  | `Data Model`              | 操作 `usermeta` + 自定义表（`gift_cards`, `commissions` 等） |
  | `WooCommerce Bridge`      | 创建订单、处理购物卡抵扣、上传附件                           |
  | `Agent & Referral Engine` | 处理邀请关系、佣金计算                                       |

- **安全机制**：

  - 所有写操作验证当前用户身份
  - 敏感接口（如重置 PIN）二次校验
  - 输入参数严格过滤（`sanitize_text_field`, `absint` 等）

#### d) **MySQL 数据库**

- 使用 WordPress 默认数据库
- 新增表前缀：`wp_myshop_*`（如 `wp_myshop_gift_cards`）
- 所有业务字段通过 `usermeta` / `postmeta` 扩展，避免修改原生表结构

#### e) **文件存储**

- 付款截图、购物卡 PDF 等存储于 WordPress 默认上传目录（`/wp-content/uploads/`）
- 通过 `wp_handle_upload()` 安全处理上传

------

### 3. **人工运营环节（一期特有）**

- **角色**：运营人员（WordPress 管理员）
- **操作路径**：
  1. 登录 `https://yourdomain.com/wp-admin`
  2. 进入 **WooCommerce > 订单**
  3. 查看状态为 “待确认” 的订单
  4. 点击订单，查看用户上传的付款截图
  5. 手动将订单状态改为 “已完成”
- **自动化触发**：
  - 订单状态变为 “已完成” 时，自动触发佣金计算（通过 `woocommerce_order_status_completed` 钩子）

------

### 4. **关键数据流向示例：用户下单流程**

```mermaid
sequenceDiagram
    participant User as 小程序用户
    participant API as myshop-core 插件
    participant WC as WooCommerce
    participant DB as MySQL

    User->>API: POST /orders (含地址、variation_id)
    API->>WC: wc_create_order()
    WC->>DB: 写入 wp_posts (shop_order)
    API->>DB: 写入自定义 meta（如是否用购物卡）
    API->>User: 返回 order_id + 收款码
    User->>API: POST /upload-payment-proof
    API->>DB: 保存附件到订单备注
    API->>WC: 添加订单备注（含图片链接）
```

------

### 5. **扩展性设计（面向三期）**

| 三期功能 | 当前预留点                                                   |
| -------- | ------------------------------------------------------------ |
| 微信支付 | 预留 `/payments/wechatpay/notify` 路径；订单支持 `payment_method=wechatpay` |
| 会员等级 | `usermeta.membership_level` 字段已存在                       |
| 自动结算 | `commissions.status` 支持 `paid`，未来可对接打款系统         |
| 多级分销 | `referrals.path` 字段支持任意层级查询                        |

------

## 三、技术栈清单

| 层级     | 技术/工具              | 版本要求 | 说明               |
| -------- | ---------------------- | -------- | ------------------ |
| 前端     | Taro + React           | ≥ 4.0    | 编译为微信小程序   |
|          | TypeScript             | ≥ 5.0    | 强类型约束         |
|          | Zustand                | ≥ 4.0    | 轻量状态管理       |
| 后端     | WordPress              | ≥ 6.5    | 免费开源版         |
| 电商引擎 | WooCommerce            | ≥ 8.0    | 免费插件           |
| 数据库   | MySQL                  | ≥ 5.7    | 或 MariaDB ≥ 10.3  |
| 认证     | JWT (firebase/php-jwt) | 最新版   | 通过 Composer 引入 |
| 开发     | PHP                    | ≥ 7.4    | 推荐 8.0+          |
| 部署     | Nginx/Apache           | -        | 标准 LAMP/LEMP     |

> 💡 **零付费依赖**：全部基于免费 WordPress 生态实现

------

## 四、安全边界

- 🔒 **外部不可访问**：`wp-config.php`、`wp-admin`（除运营人员）
- 🔒 **API 认证**：所有写操作需有效 JWT Token
- 🔒 **文件上传**：仅允许 `.jpg`, `.png`，重命名防覆盖
- 🔒 **SQL 操作**：全部使用 `$wpdb->prepare()` 防注入
- 🔒 **购物卡 PIN**：bcrypt 加密存储，永不明文返回

------

**文档版本**：V1.1（Taro 前端架构冻结基线）
**最后更新**：2025年11月20日
**输出格式**：Markdown + Mermaid（可直接渲染于 Typora / VS Code / GitLab）

------

> 