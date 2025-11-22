

------

# 📱 微信小程序工程结构规范

## `myshop-miniprogram` 工程（V2.0 - 基于 Taro 4 + React + API 契约 V2.3）

> **适用项目**：微信小程序 × WordPress 无头电商系统（一期 + 二期：购物卡 / 积分 / 分销 / 代理商）
> **目标**：统一代码组织、提升可维护性、支持多人协作、便于后续迭代
> **原则**：轻量、清晰、类型安全、与 API 契约 V2.3 严格对齐（含中国地址模型、商品 description、订单号、积分与购物卡字段等）

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
│   │   │   ├── reset-pin.tsx
│   │   │   ├── share.tsx          # 数字赠礼 / 打印包生成
│   │   │   └── claim.tsx          # 受赠人领取
│   │   │
│   │   ├── referral/         # 分销裂变
│   │   │   ├── downlines.tsx
│   │   │   └── commissions.tsx
│   │   │
│   │   ├── points/           # 积分中心
│   │   │   ├── summary.tsx
│   │   │   └── ledger.tsx
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
│   │   ├── api.ts            # 核心：API 请求封装（带泛型响应）
│   │   └── endpoints.ts      # 各业务域请求封装（giftCardService、pointsService 等）
│   │
│   ├── utils/                # 工具模块
│   │   ├── constants.ts      # 常量定义（如 API 路径、枚举）
│   │   ├── storage.ts        # 本地缓存封装（Taro.setStorageSync）
│   │   ├── helpers.ts        # 通用函数（如 formatPrice）
│   │   └── error-map.ts      # error_code 与前端文案映射
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
        shipping_address: selectedAddress, // 符合 V2.3 地址结构
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

### 3. **虚拟购物卡赠礼（`src/pages/giftcard/share.tsx`）**

- 入口位于 `giftcard/mine.tsx`，在卡片操作区提供「赠礼/打印礼包」按钮
- 分享前必须调用 `giftCardService.createShareToken` 生成一次性口令，再触发微信分享或生成二维码
- 成功生成后需展示包含模板名称、面值、口令有效期的确认弹窗，并可复制分享口令

```ts
// src/pages/giftcard/share.tsx
const handleShare = async (cardId: number) => {
  const token = await giftCardService.createShareToken({ card_id: cardId });
  await Taro.showShareImageMenu({
    path: `/pages/giftcard/claim?token=${token}`,
  });
  Taro.showToast({ title: '已生成分享口令' });
};
```

> 分享日志需写入 `giftcard/share_logs`，撤销接口 `giftCardService.revokeShare` 成功后刷新列表

------

### 4. **虚拟购物卡领取（`src/pages/giftcard/claim.tsx`）**

- 受赠人需输入分享口令与手机号，前端做基础格式校验后再调用接口
- 成功领取后调用 `giftCardService.claimSharedCard`，并在结果页提示设置 PIN
- 失败时需结合 `error-map.ts` 映射错误码（如 `GIFT_CARD_TOKEN_EXPIRED`）展示友好提示

```ts
const handleClaim = async () => {
  try {
    await giftCardService.claimSharedCard({ token: form.token, phone: form.phone });
    Taro.redirectTo({ url: '/pages/giftcard/mine' });
  } catch (error) {
    const message = resolveErrorMessage(errorCodeOf(error));
    Taro.showToast({ title: message, icon: 'none' });
  }
};
```

------

### 5. **积分中心（`src/pages/points/summary.tsx` & `ledger.tsx`）**

- `summary.tsx` 初次进入需并发请求 `pointsService.getSummary` 和 `pointsService.getLeaderboard`
- `ledger.tsx` 必须实现分页加载（`page=1,size=20`），并在前端对 `credit`/`debit` 分类渲染
- 「积分兑换」需先在本地验证可兑换额度，再调用 `pointsService.redeemReward`，成功后刷新概览

```ts
// src/pages/points/ledger.tsx
const { list, loadMore, loading } = usePointsLedger();

const handleRedeem = async (ruleId: number) => {
  await pointsService.redeemReward({ rule_id: ruleId });
  await pointsService.prefetchSummary();
  Taro.showToast({ title: '兑换成功' });
};
```

> 需增加预占提示：连续兑换失败 ≥3 次时提示联系客服，避免误触发风控

------

### 6. **代理商仪表盘（`src/pages/agent/dashboard.tsx`）**

- `useDidShow` 中并发请求 `agentService.getDashboard` 与 `agentService.getSalesTrend({ period: '30d' })`
- 页面包含 KPI 卡片、趋势图（`echarts-for-weapp`）、待办事项（审核状态、下级提醒）
- 对无权限用户跳转 `referral/downlines.tsx` 并弹窗提示「请先申请代理商」

```ts
const hydrateDashboard = async () => {
  const [dashboard, trend] = await Promise.all([
    agentService.getDashboard(),
    agentService.getSalesTrend({ period: '30d' }),
  ]);
  setSummary(dashboard);
  setTrend(trend);
};
```

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

- 不在前端存储敏感信息（如 PIN），PIN 重置仅通过 `giftCardService.resetPin`
- 所有 API 调用走 HTTPS，并附带 `Authorization` 头（除公开接口外）
- 用户输入做长度/格式校验（使用 Zod 或自定义 validator）
- 分享口令必须在领取或撤销后立即失效，前端收到成功响应需主动刷新
- **不得使用英文地址字段（如 first_name/state）作为用户输入界面**

### 2. **性能**

- 图片使用 CDN 并指定宽高
- 列表使用 `ScrollView` + 虚拟滚动（未来扩展）
- 避免在渲染函数中创建新对象/函数（useCallback/useMemo）
- 积分流水、代理商趋势等长列表需实现骨架屏或 Loading 态，防止白屏

------

## 七、错误映射与提示（`src/utils/error-map.ts`）

- `error-map.ts` 必须维护与 `docs/API_CONTRACT_V2.3.md` 一致的错误码映射
- 页面捕获接口异常后调用 `resolveErrorMessage(error_code)`，默认兜底为「系统繁忙，请稍后再试」
- 分享、积分、代理模块新增错误码需同步：`GIFT_CARD_TOKEN_EXPIRED`、`POINTS_REDEEM_QUOTA_EXCEEDED`、`AGENT_NOT_APPROVED`

```ts
export const ERROR_MAP: Record<string, string> = {
  GIFT_CARD_TOKEN_EXPIRED: '分享口令已失效，请重新索取',
  POINTS_REDEEM_QUOTA_EXCEEDED: '当日积分兑换额度已达上限',
  AGENT_NOT_APPROVED: '代理商申请审核中，请耐心等待',
};
```

> 所有新增错误码必须同步更新到 `docs/DATA_DICTIONARY.md` 与 `src/services/endpoints.ts`

------

## 八、环境配置（`src/utils/constants.ts`）

```ts
// src/utils/constants.ts
export const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'https://dev.yourdomain.com/wp-json/myshop/v1'
    : 'https://yourdomain.com/wp-json/myshop/v1';
```

> 通过 Taro 的 `process.env.NODE_ENV` 区分环境，无需额外 env 文件

------

## 九、禁止事项（红线）

- ❌ 在页面中直接调用 `Taro.request`（必须走 `services/api.ts`）
- ❌ 使用 `any` 类型（必须定义或复用接口）
- ❌ 组件逻辑超过 300 行（应拆分为子组件或自定义 Hook）
- ❌ 硬编码 API 路径（应集中定义在 `constants.ts` 或 `services/endpoints.ts`）
- ❌ 忽略 `shipping_address` 的完整性校验（前端需确保五要素齐全）
- ❌ 商品详情页不展示 `description` 字段
- ❌ 使用全局 CSS（必须用 CSS Modules）

------

**文档版本**：V2.0（基于 Taro 4 + React + TypeScript，与 API 契约 V2.3 对齐）
**最后更新**：2025年11月22日
**输出格式**：Markdown（可直接保存为 `MINIPROGRAM_SPEC.md`）

------

✅ 文档已完全对齐当前 Taro 4 项目结构与代码风格。

