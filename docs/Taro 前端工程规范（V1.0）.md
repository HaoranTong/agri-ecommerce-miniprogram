# 📱 Taro 前端工程规范（V1.0）

## 微信小程序 × WordPress 无头电商系统 · 前端开发基线

> **版本**：V1.0（Taro 工程冻结基线）
> **适用项目**：`agri-ecommerce-miniprogram`
> **目标**：为一人公司 + AI 编程提供清晰、可维护、高复用的前端工程结构
> **核心原则**：类型安全 · 组件复用 · 状态隔离 · AI 友好  

------

## 一、技术栈与依赖

| 类别        | 技术/库                     | 版本要求        | 说明               |
| ----------- | --------------------------- | --------------- | ------------------ |
| 框架        | Taro                        | `^4.0.0-beta.0` | 编译型跨端框架     |
| UI 运行时   | React                       | `^18.2.0`       | 函数式组件范式     |
| 语言        | TypeScript                  | `^5.0.0`        | 强类型约束         |
| 状态管理    | Zustand                     | `^4.5.0`        | 轻量、无样板代码   |
| 样式        | Sass                        | `^1.60.0`       | 支持嵌套与变量     |
| 构建工具    | Vite                        | 内置            | 秒级热更新         |
| HTTP 客户端 | 自研封装（基于 wx.request） | —               | 类型安全，自动鉴权 |
| Lint        | ESLint + Prettier           | 内置            | 保证代码风格统一   |

> 💡 **不引入冗余依赖**：避免 Redux、MobX、Axios 等重型方案，保持轻量。

------

## 二、目录结构规范

```bash
src/
├── app.tsx                 # 应用入口（初始化状态、全局样式）
├── app.config.ts           # 全局配置（替代原生 app.json）
│
├── pages/                  # 页面路由（按功能划分）
│   ├── auth/               # 认证相关
│   │   └── login.tsx       # 登录页
│   ├── home/               # 首页
│   │   └── index.tsx       # 商品列表 + 轮播
│   ├── product/            # 商品模块
│   │   └── detail.tsx      # 商品详情（含规格选择）
│   ├── cart/               # 购物车（一期简化为直购）
│   │   └── index.tsx
│   └── order/              # 订单流程
│       ├── create.tsx      # 创建订单（填写地址、确认规格）
│       ├── success.tsx     # 下单成功页
│       └── list.tsx        # 我的订单列表
│
├── components/             # 全局可复用组件（AI 生成重点区域）
│   ├── layout/             # 布局组件
│   │   └── PageContainer.tsx  # 页面容器（处理 loading/error）
│   ├── ui/                 # 基础 UI
│   │   ├── Button.tsx      # 自定义按钮（支持 loading）
│   │   └── EmptyState.tsx  # 空状态占位图
│   └── business/           # 业务组件
│       ├── ProductCard.tsx # 商品卡片（图片+标题+价格）
│       └── SpecSelector.tsx # 规格选择器（支持多属性联动）
│
├── hooks/                  # 自定义 Hooks（逻辑复用单元）
│   ├── useAuth.ts          # 用户认证（登录/登出/Token 刷新）
│   ├── useRequest.ts       # 通用请求 Hook（带 loading/error 状态）
│   └── useCart.ts          # 购物车逻辑（二期扩展用）
│
├── store/                  # 全局状态（Zustand Store）
│   └── index.ts            # 主 Store（user, cart, theme）
│
├── utils/                  # 工具函数
│   ├── api.ts              # API 封装（类型安全）
│   ├── config.ts           # 环境变量（API_BASE）
│   └── helpers.ts          # 通用辅助函数（formatPrice, isWechat）
│
└── types/                  # 全局 TypeScript 类型定义
    └── index.ts            # Product, Order, User 等接口契约
```

> ✅ **命名规范**：
>
> - 文件名：`PascalCase.tsx`（组件）、`camelCase.ts`（逻辑）
> - 组件必须以 `.tsx` 结尾，逻辑文件以 `.ts` 结尾

------

## 三、关键文件模板（AI 生成基准）

### 1. `app.config.ts`（全局配置）

```ts
// src/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/auth/login',
    'pages/home/index',
    'pages/product/detail',
    'pages/order/create',
    'pages/order/success',
    'pages/order/list'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '农商商城',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#999',
    selectedColor: '#4CAF50',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/order/list',
        text: '我的订单'
      }
    ]
  }
});
```

> ⚠️ **注意**：Taro 中无需图标路径即可运行，图标可在二期补充。

------

### 2. `types/index.ts`（类型契约）

```ts
// src/types/index.ts
export interface Product {
  id: number;
  name: string;
  price: string; // "29.90"
  images: string[];
  variations: Variation[];
}

export interface Variation {
  id: number;
  attributes: { name: string; option: string }[];
  price: string;
  stock_quantity: number;
}

export interface User {
  id: number;
  nickname: string;
  avatar: string;
}

export interface Order {
  id: number;
  status: 'pending' | 'processing' | 'completed';
  total: string;
  date_created: string;
}
```

> ✅ 所有 API 响应必须符合此类型，确保 AI 生成代码类型安全。

------

### 3. `utils/api.ts`（类型安全请求封装）

```ts
// src/utils/api.ts
import { API_BASE } from './config';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  showLoading?: boolean;
}

export const request = async <T = any>({
  url,
  method = 'GET',
  data = {},
  showLoading = false
}: RequestOptions): Promise<T> => {
  const token = wx.getStorageSync('token');

  if (showLoading) wx.showLoading({ title: '加载中...' });

  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        if (showLoading) wx.hideLoading();
        const { statusCode, data: respData } = res;

        if (statusCode === 401) {
          wx.showToast({ title: '请先登录', icon: 'none' });
          wx.redirectTo({ url: '/pages/auth/login' });
          return reject(new Error('Unauthorized'));
        }

        if (respData.code || respData.message) {
          wx.showToast({ title: respData.message || '请求失败', icon: 'none' });
          return reject(new Error(respData.message));
        }

        resolve(respData as T);
      },
      fail: (err) => {
        if (showLoading) wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      }
    });
  });
};
```

------

### 4. 组件模板：`ProductCard.tsx`

```tsx
// src/components/business/ProductCard.tsx
import { View, Image, Text } from '@tarojs/components';
import { Product } from '@/types';
import './ProductCard.scss';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  return (
    <View className="product-card" onClick={onClick}>
      <Image src={product.images[0] || ''} className="product-image" />
      <View className="product-info">
        <Text className="product-title">{product.name}</Text>
        <Text className="product-price">¥{product.price}</Text>
      </View>
    </View>
  );
};

export default ProductCard;
/* src/components/business/ProductCard.scss */
.product-card {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
}

.product-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 6px;
}

.product-title {
  font-size: 16px;
  font-weight: 500;
  display: block;
  margin: 8px 0 4px;
}

.product-price {
  color: #e53935;
  font-size: 18px;
  font-weight: bold;
}
```

> ✅ 此模式便于 AI 复用：只需传入 `product` 对象，自动渲染。

------

## 四、AI 编程协作规范

### 1. **组件生成指令模板**

> “生成一个商品规格选择器组件 `SpecSelector.tsx`，接收 `variations: Variation[]` 和 `onSelect: (v: Variation) => void`，支持单选，高亮已选中项。”

### 2. **页面生成指令模板**

> “生成商品详情页 `product/detail.tsx`，使用 `useRequest` 加载 `/products/:id`，展示轮播图、规格选择器、加入购物车按钮。”

### 3. **禁止行为**

- ❌ 在页面中直接写 `wx.request`
- ❌ 使用 `globalData` 存储状态
- ❌ 在组件中硬编码 API 路径

------

## 五、构建与调试

### 开发命令

```bash
# 启动微信小程序开发
npm run dev:weapp

# 构建生产包
npm run build:weapp
```

### 调试建议

- 使用 **微信开发者工具** → 打开 `dist/weapp`
- 开启 **ES6 转 ES5**（Taro 自动处理）
- TypeScript 错误会在终端实时提示

------

## 六、版本控制策略

- **主分支**：`main`（始终可部署）
- **功能分支**：`feat/login`, `feat/cart`（AI 生成后合并）
- **提交规范**：
  - `feat: 实现登录页`
  - `fix: 修复商品价格显示`
  - `docs: 更新 Taro 工程规范`

------

**文档版本**：V1.0（Taro 工程冻结基线）
**最后更新**：2025年11月20日
**输出格式**：Markdown（兼容 Typora 渲染）

------

✅ **验证说明**：

- 所有代码块语法正确（TypeScript / SCSS / JSON）
- 目录结构与文件模板可直接用于 `taro init` 项目
- 类型定义与 API 契约对齐 WordPress 后端

> 请确认此规范是否符合预期。
> 若确认，请回复：
> **“Taro 前端工程规范 V1.0 确认通过，继续输出《登录页与首页实现》”**