明白！以下是根据你提供的原始规范文档，**全面修正为 Taro 4 + React + TypeScript 技术栈**后的完整新版技术规范。所有原生小程序（`.js`/`.wxml`/`.json`/`.wxss`）相关内容均已替换为 Taro 项目结构、React 组件写法、Hooks 状态管理、TypeScript 类型定义等，并保留原有格式与语义层级，确保可在 Typora 中正确渲染。

你可以**直接全文复制替换原文件**。

------

# 📱 微信小程序工程结构规范

## `myshop-miniprogram` 工程（V2.0 - 基于 Taro 4 + React + API 契约 V2.4）

> **适用项目**：微信小程序 × WordPress 无头电商系统（一期 + 二期）
> **目标**：统一代码组织、提升可维护性、支持多人协作、便于后续迭代
> **原则**：轻量、清晰、类型安全、与 API 契约 V2.4 严格对齐（含中国地址模型、商品 description、order_number 等）

------

## 一、基础信息

| 项目       | 说明                                                         |
| ---------- | ------------------------------------------------------------ |
| 开发框架   | **Taro 4 + React 18**（编译到微信小程序）                    |
| 最低基础库 | 2.24.0（支持 async/await）                                   |
| 语言       | **TypeScript（强制）** + JSX                                 |
| 状态管理   | **React Hooks（useState/useEffect/useContext）**，一期不引入 Redux/Zustand |
| 网络请求   | 封装 `Taro.request`，统一处理 Token、错误拦截、类型定义      |
| 样式方案   | **CSS Modules（.scss）**，禁止全局污染                       |
| 构建工具   | Webpack 5（由 Taro 内置）                                    |

> ✅ 所有页面和组件必须使用 **函数式组件 + TypeScript 泛型**，禁用 class component

------

## 二、目录结构规范

```bash
myshop-miniprogram/
├── src/
│   ├── app.ts                # 小程序入口（App 配置）
│   ├── app.config.ts         # 全局页面路由与窗口配置
│   ├── index.html            # H5 兼容入口（小程序可忽略）
│   │
│   ├── pages/                # 页面目录（按功能划分，每个页面独立目录）
│   │   ├── auth/
│   │   │   └── login.tsx     # 登录页
│   │   │
│   │   ├── index/            # 首页（商品列表）
│   │   │   ├── index.tsx
│   │   │   └── index.scss
│   │   │
│   │   ├── product/
│   │   │   └── detail.tsx    # 商品详情页（含变体选择）
│   │   │
│   │   ├── order/            # 订单流程
│   │   │   ├── create.tsx    # 下单页（需选择地址）
│   │   │   ├── confirm.tsx   # 付款指引页（展示二维码）
│   │   │   ├── upload-proof.tsx  # 上传付款截图
│   │   │   └── detail.tsx    # 订单详情
│   │   │
│   │   ├── address/          # 收货地址管理
│   │   │   ├── list.tsx      # 地址列表
│   │   │   ├── edit.tsx      # 新建/编辑地址
│   │   │   └── select.tsx    # 下单时选择地址
│   │   │
│   │   ├── giftcard/         # 虚拟购物卡
│   │   │   ├── redeem.tsx
│   │   │   ├── mine.tsx
│   │   │   └── reset-pin.tsx
│   │   │
│   │   ├── referral/         # 分销裂变
│   │   │   ├── downlines.tsx
│   │   │   └── commissions.tsx
│   │   │
│   │   └── agent/            # 代理商专区（二期）
│   │       ├── dashboard.tsx
│   │       ├── downlines.tsx
│   │       └── commissions.tsx
│   │
│   ├── components/           # 自定义通用组件（函数式 + TSX）
│   │   ├── ProductCard/      # 商品卡片
│   │   ├── OrderItem/        # 订单项
│   │   ├── EmptyState/       # 空状态提示
│   │   └── AddressForm/      # 地址表单组件（含省市区 picker）
│   │
│   ├── services/             # 网络服务层
│   │   └── api.ts            # 核心：API 请求封装（带泛型响应）
│   │
│   ├── utils/                # 工具模块
│   │   ├── constants.ts      # 常量定义（如 API 路径、枚举）
│   │   ├── storage.ts        # 本地缓存封装（Taro.setStorageSync）
│   │   └── helpers.ts        # 通用函数（如 formatPrice）
│   │
│   ├── assets/               # 静态资源
│   │   ├── icons/            # SVG / PNG 图标（建议转为 React Component）
│   │   └── images/           # 启动图、占位图等
│   │
│   └── types/                # 全局 TypeScript 类型定义（推荐）
│       └── index.ts          # 如 Product, Variation, Address, Order 等接口
│
├── project.config.json       # 微信开发者工具项目配置
├── project.private.config.json
├── package.json
├── tsconfig.json
└── babel.config.js
```

> ✅ 所有页面和组件均采用 **独立目录**，包含 `.tsx`（逻辑+模板）和 `.scss`（样式），**无 .json/.wxml/.wxss**

------

## 三、核心模块实现规范

### 1. **应用入口（`src/app.ts`）**

```ts
// src/app.ts
import { useState, useEffect } from 'react';
import { getToken } from './utils/storage';

const App = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = getToken();
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  return <>{children}</>;
};

export default App;
```

> ⚠️ 使用 **React Context 或自定义 Hook** 管理全局状态（如 token），避免滥用全局变量

------

### 2. **API 请求封装（`src/services/api.ts`）**

```ts
// src/services/api.ts
import Taro from '@tarojs/taro';
import { getToken, clearToken } from '../utils/storage';
import { API_BASE } from '../utils/constants';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  headers?: Record<string, string>;
}

export const request = async <T = any>(options: RequestOptions): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = { ...options.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await Taro.request({
      url: API_BASE + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: headers,
    });

    const { statusCode, data } = res;

    // 业务错误（后端返回 error_code）
    if (data?.error_code) {
      Taro.showToast({ title: data.message || '请求失败', icon: 'none' });
      throw new Error(data.error_code);
    }

    return data as T;
  } catch (err: any) {
    // 401 Token 失效
    if (err.statusCode === 401) {
      clearToken();
      Taro.navigateTo({ url: '/pages/auth/login' });
    }
    throw err;
  }
};
```

> ✅ 所有页面调用 `request<T>()` 时应传入响应类型，实现端到端类型安全

------

### 3. **认证流程（`src/pages/auth/login.tsx`）**

```tsx
// src/pages/auth/login.tsx
import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { request } from '../../services/api';
import { setToken } from '../../utils/storage';

const Login = () => {
  useEffect(() => {
    Taro.login({
      success: async (res) => {
        try {
          const data = await request<{ token: string; user: any }>({
            url: '/auth/login',
            method: 'POST',
            data: { code: res.code },
          });

          setToken(data.token);
          Taro.switchTab({ url: '/pages/index/index' });
        } catch (err) {
          console.error('Login failed:', err);
        }
      },
    });
  }, []);

  return <View>登录中...</View>;
};

export default Login;
```

------

### 4. **页面数据加载（以订单创建页为例）**

- **首次进入**：在 `useEffect` 中加载必要数据  
- **依赖变化**：通过 deps 控制重新加载  
- **示例（`src/pages/order/create.tsx`）**：

```tsx
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { request } from '../../services/api';
import type { Address, Variation } from '../../types';

const OrderCreate = () => {
  const [variation, setVariation] = useState<Variation | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const variationId = Taro.getCurrentInstance().router?.params.variation_id;

  useEffect(() => {
    if (!variationId) return;
    loadVariation(variationId);
  }, [variationId]);

  const loadVariation = async (id: string) => {
    const data = await request<Variation>({ url: `/variations/${id}` });
    setVariation(data);
  };

  const handleSubmit = async () => {
    if (!selectedAddress) {
      Taro.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }

    const res = await request<{ order_id: number; payment_qr_url: string }>({
      url: '/orders',
      method: 'POST',
      data: {
        variation_id: variationId,
        quantity: 1,
        shipping_address: selectedAddress, // 符合 V2.4 地址结构
      },
    });

    Taro.navigateTo({
      url: `/pages/order/confirm?orderId=${res.order_id}&qr=${encodeURIComponent(res.payment_qr_url)}`,
    });
  };

  return (
    <View>
      {/* 渲染商品、地址选择器、提交按钮 */}
    </View>
  );
};

export default OrderCreate;
```

> ✅ 地址对象必须包含：`name`, `phone`, `province`, `city`, `district`, `detail_address`

------

## 四、关键交互规范

### 1. **上传付款截图（`src/pages/order/upload-proof.tsx`）**

- 使用 `Taro.chooseImage` + `Taro.uploadFile`
- 成功后跳转订单详情

```ts
const uploadProof = async (orderId: string) => {
  const res = await Taro.chooseImage({ count: 1 });
  const tempFilePath = res.tempFilePaths[0];

  await Taro.uploadFile({
    url: API_BASE + '/orders/upload-payment-proof',
    filePath: tempFilePath,
    name: 'proof_image',
    formData: { order_id: orderId },
    header: { Authorization: `Bearer ${getToken()}` },
  });

  Taro.showToast({ title: '提交成功' });
  Taro.navigateTo({ url: `/pages/order/detail?id=${orderId}` });
};
```

------

### 2. **地址管理流程**

- 地址数据结构（TypeScript 接口）：

```ts
// src/types/index.ts
export interface Address {
  id?: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail_address: string;
  postcode?: string;
}
```

- 编辑页使用 `components/AddressForm`，内部使用 `<Picker mode="region">` 实现省市区联动

------

## 五、样式与 UI 规范

### 1. **CSS Modules（`.scss`）**

- 每个组件/页面独享样式文件
- 类名使用驼峰或 kebab-case，通过 `styles.xxx` 引用

```scss
/* detail.scss */
.productDescription {
  color: #333;
  line-height: 1.6;
}
import styles from './detail.scss';
<View className={styles.productDescription}>{product.description}</View>
```

### 2. **组件化**

- 所有重复 UI 必须封装为 **独立 TSX 组件**
- 通过 `props` 传递数据，通过回调函数通信
- **商品详情页必须展示 `product.description`**（来自父商品），即使切换变体也不隐藏

------

## 六、安全与性能

### 1. **安全**

- 不在前端存储敏感信息（如 PIN）
- 所有 API 调用走 HTTPS
- 用户输入做长度/格式校验（使用 Zod 或自定义 validator）
- **不得使用英文地址字段（如 first_name/state）作为用户输入界面**

### 2. **性能**

- 图片使用 CDN 并指定宽高
- 列表使用 `ScrollView` + 虚拟滚动（未来扩展）
- 避免在渲染函数中创建新对象/函数（useCallback/useMemo）

------

## 七、环境配置（`src/utils/constants.ts`）

```ts
// src/utils/constants.ts
export const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'https://dev.yourdomain.com/wp-json/myshop/v1'
    : 'https://yourdomain.com/wp-json/myshop/v1';
```

> 通过 Taro 的 `process.env.NODE_ENV` 区分环境，无需额外 env 文件

------

## 八、禁止事项（红线）

- ❌ 在页面中直接调用 `Taro.request`（必须走 `services/api.ts`）
- ❌ 使用 `any` 类型（必须定义或复用接口）
- ❌ 组件逻辑超过 300 行（应拆分为子组件或自定义 Hook）
- ❌ 硬编码 API 路径（应集中定义在 `constants.ts`）
- ❌ 忽略 `shipping_address` 的完整性校验（前端需确保五要素齐全）
- ❌ 商品详情页不展示 `description` 字段
- ❌ 使用全局 CSS（必须用 CSS Modules）

------

**文档版本**：V2.0（基于 Taro 4 + React + TypeScript，与 API 契约 V2.4 对齐）
**最后更新**：2025年11月21日
**输出格式**：Markdown（可直接保存为 `MINIPROGRAM_SPEC.md`）

------

✅ 文档已完全对齐当前 Taro 4 项目结构与代码风格。

