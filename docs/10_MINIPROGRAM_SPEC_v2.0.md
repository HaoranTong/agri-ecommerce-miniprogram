

------

# 📱 微信小程序工程结构规范

## `myshop-miniprogram` 工程（V2.0.4 - 2026-02-05 更新）

> **适用项目**：微信小程序 × WordPress 无头电商系统（一期 + 二期：购物卡 / 积分 / 分销 / 代理商）
> **目标**：统一代码组织、提升可维护性、支持多人协作、便于后续迭代
> **原则**：轻量、清晰、类型安全、与 API 契约 V2.3.4 严格对齐（含中国地址模型、商品 description、订单号、积分与购物卡字段等）
>
> **V2.0.1 变更记录**（2026-01-21）：
> 1. 登录流程优化为两步式UI（先登录获取profile，再显示手机号授权界面）
> 2. 支持getUserProfile真实数据上传到后端（avatar、gender）
> 3. 支付流程增强：create接口返回order_id，前端正确查询订单状态
>
> **V2.0.2 变更记录**（2026-01-30）：
> 1. 登录接口返回 `is_new_user/has_profile/has_phone/has_realname`，前端仅在首次登录弹出头像昵称授权
> 2. 仅在手机号未绑定时展示手机号授权，避免重复弹窗
> 3. 生成分享二维码前强制校验真实姓名 + 手机号（跳转资料完善）
>
> **V2.0.3 变更记录**（2026-02-05）：
> 1. 购物卡分享路径统一为 `/pages/shopping-card/claim?token=...`，分享按钮启用 `openType=share` + `enableShareAppMessage`
> 2. 领取页“有效期”文案明确为“购物卡有效期”，补充说明文案并优化排版与安全区间距
> 3. 购物卡管理“查看订单”统一跳转订单详情页（需后端支持兑换人访问）
>
> **V2.0.4 变更记录**（2026-02-05）：
> 1. 移除错误码示例与映射片段，统一引用 API 契约与数据字典作为唯一来源

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

## 二、开发环境与版本基线

> 说明：版本以 `package.json` 为准，未显式锁定的工具使用稳定版并保持团队一致。

| 类别 | 版本/要求 | 说明 |
| --- | --- | --- |
| Taro | 4.1.8 | `@tarojs/*` 依赖统一版本 |
| React | 18.x | `react` / `react-dom` |
| TypeScript | ^5.3.3 | 强类型约束 |
| Sass | ^1.75.0 | 样式预处理 |
| ESLint | ^8.57.0 | 前端代码规范 |
| Stylelint | ^16.4.0 | 样式规范 |
| Jest | ^30.2.0 | 测试工具（当前 `npm test` 仅运行 lint） |

### 常用命令

```bash
# 安装依赖
npm install

# 小程序开发模式
npm run dev:weapp

# 小程序构建
npm run build:weapp

# 代码检查
npm run lint

# 当前 test 为 lint 聚合
npm run test
```

### 联调与依赖

- 后端本地环境参见 `docs/13_LARAGON_DEPLOY_GUIDE.md`。
- API 契约与错误码统一来源：`docs/08_API_CONTRACT_V2.3.md`。
- API 基础地址与常量建议统一放在 `src/utils/constants.ts`。

------

## 三、目录结构规范

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
│   │   │   ├── detail.tsx    # 商品详情页（含变体选择）
│   │   │   └── redeem.tsx    # 积分兑换商品页
│   │   │
│   │   ├── order/            # 订单流程
│   │   │   ├── create.tsx    # 下单页（需选择地址）
│   │   │   ├── order-confirm.tsx  # 订单确认
│   │   │   ├── payment.tsx   # 支付页
│   │   │   ├── payment-success.tsx # 支付成功
│   │   │   ├── list.tsx      # 订单列表
│   │   │   └── detail.tsx    # 订单详情
│   │   │
│   │   ├── address/          # 收货地址管理
│   │   │   ├── list.tsx      # 地址列表
│   │   │   ├── edit.tsx      # 新建/编辑地址
│   │   │   └── select.tsx    # 下单时选择地址
│   │   │
│   │   ├── shopping-card/    # 购物卡（虚拟礼品卡）
│   │   │   ├── templates.tsx
│   │   │   ├── bundle-detail.tsx
│   │   │   ├── bundle-checkout.tsx
│   │   │   ├── custom-builder.tsx
│   │   │   ├── custom-checkout.tsx
│   │   │   ├── mine.tsx
│   │   │   ├── redeem.tsx
│   │   │   ├── share.tsx          # 数字赠礼 / 打印包生成
│   │   │   ├── share-list.tsx
│   │   │   ├── share-confirm.tsx
│   │   │   ├── share-setup.tsx
│   │   │   ├── share-result.tsx
│   │   │   ├── claim.tsx          # 受赠人领取
│   │   │   ├── detail.tsx
│   │   │   └── manage.tsx
│   │   │
│   │   ├── referral/         # 分销裂变
│   │   │   └── index.tsx
│   │   │
│   │   ├── points/           # 积分中心
│   │   │   ├── summary.tsx
│   │   │   └── ledger.tsx
│   │   │
│   │   ├── agent/            # 代理商专区
│   │   │   ├── dashboard.tsx
│   │   │   └── apply.tsx
│   │   │
│   │   ├── commission/       # 佣金明细
│   │   │   └── list.tsx
│   │   │
│   │   ├── user/             # 用户中心
│   │   │   ├── profile.tsx
│   │   │   └── edit-profile.tsx
│   │   │
│   │   └── cart/             # 购物车
│   │       └── index.tsx
│   │
│   ├── components/           # 自定义通用组件（函数式 + TSX）
│   │   ├── ProductCard/      # 商品卡片
│   │   ├── OrderItem/        # 订单项
│   │   ├── EmptyState/       # 空状态提示
│   │   └── AddressForm/      # 地址表单组件（含省市区 picker）
│   │
│   ├── services/             # 网络服务层
│   │   └── api.ts            # 核心：API 请求封装（含业务 service）
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

## 四、命名规范与路径约定（补充）

- 页面目录统一使用 `index.tsx` / `index.config.ts` / `index.module.scss`（或 `index.scss` 配合 CSS Modules）。
- 组件目录使用 `index.tsx` + `index.scss`，导出默认组件。
- 工具、服务、Hook 使用 `camelCase.ts` 命名。
- 引入路径使用 `@/` 别名，避免 `../../` 级联。

------

## 五、核心模块实现规范

### 0. **全局配置（`src/app.config.ts`）**

```ts
// src/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/product/detail',
    'pages/product/redeem',
    'pages/order/create',
    'pages/order/order-confirm',
    'pages/order/payment',
    'pages/order/payment-success',
    'pages/order/detail',
    'pages/order/list',
    'pages/address/list',
    'pages/address/edit',
    'pages/address/select',
    'pages/shopping-card/templates',
    'pages/shopping-card/bundle-detail',
    'pages/shopping-card/bundle-checkout',
    'pages/shopping-card/custom-builder',
    'pages/shopping-card/custom-checkout',
    'pages/shopping-card/mine',
    'pages/shopping-card/redeem',
    'pages/shopping-card/share',
    'pages/shopping-card/share-list',
    'pages/shopping-card/share-confirm',
    'pages/shopping-card/share-setup',
    'pages/shopping-card/share-result',
    'pages/shopping-card/claim',
    'pages/shopping-card/detail',
    'pages/shopping-card/manage',
    'pages/referral/index',
    'pages/agent/dashboard',
    'pages/agent/apply',
    'pages/commission/list',
    'pages/auth/login',
    'pages/user/profile',
    'pages/user/edit-profile',
    'pages/points/summary',
    'pages/points/ledger',
    'pages/points/missions',
    'pages/points/redeem',
    'pages/points/rules',
    'pages/cart/index'
  ],
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '安家大米',
    backgroundColor: '#f8f8f8',
    backgroundTextStyle: 'light',
    enablePullDownRefresh: true
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#2f7a3d',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/cart/index',
        text: '购物车',
        iconPath: 'assets/icons/order.png',
        selectedIconPath: 'assets/icons/order-active.png'
      },
      {
        pagePath: 'pages/user/profile',
        text: '我的',
        iconPath: 'assets/icons/user.png',
        selectedIconPath: 'assets/icons/user-active.png'
      }
    ]
  }
});
```

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
>
> ✅ 新增错误码时需同步维护 `src/utils/error-map.ts` 并在调用处使用 `resolveErrorMessage`。

------

### 3. **认证流程（`src/pages/auth/login.tsx`）**

**V2.0.1 更新**：采用两步式授权流程，提升用户体验

**步骤1：微信登录**
- 用户点击"微信登录"按钮
- 自动调用 `getUserProfile` 获取头像昵称（需用户授权）
- 调用 `wx.login` 获取 `code`，提交登录接口（见 API 契约）
- 如果获取到真实用户信息（非 `is_demote` 数据），自动调用用户资料更新接口（见 API 契约）上传头像昵称
- 登录成功后显示手机号授权界面

**步骤2：手机号授权**
- 显示两个按钮："授权手机号" 和 "暂不授权"
- 点击"授权手机号"：使用 `open-type="getPhoneNumber"` 获取 `phone_code`，调用手机号绑定接口（见 API 契约）
- 点击"暂不授权"：跳过手机号绑定，直接进入小程序

```tsx
const [showPhoneAuth, setShowPhoneAuth] = useState(false);

const handleWechatLogin = async () => {
  let userProfile = null;
  try {
    const profileRes = await Taro.getUserProfile({ desc: '用于完善用户资料' });
    userProfile = profileRes.userInfo;
    Taro.setStorageSync('USER_PROFILE', userProfile);
  } catch (error) {
    console.log('用户取消授权或获取失败');
  }

  const { code } = await Taro.login();
  await authService.login(code);

  // 上传真实用户资料到后端
  if (userProfile && !userProfile.is_demote) {
    await authService.updateProfile({
      nickname: userProfile.nickName,
      avatar: userProfile.avatarUrl,
      gender: userProfile.gender
    });
  }

  setShowPhoneAuth(true); // 显示手机号授权界面
};

const handlePhoneAuth = async (e) => {
  const { code: phoneCode } = e.detail;
  const loginRes = await Taro.login(); // 获取新的登录code
  await authService.bindPhone(loginRes.code, phoneCode);
  navigateToHome();
};

const handleSkipPhoneAuth = () => {
  navigateToHome(); // 跳过手机号授权
};
```

> ⚠️ **注意**：开发者工具中 `getUserProfile` 返回的是降级数据（`is_demote: true`），真实数据只能在真机或体验版中获取。

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
    const data = await request<Variation>({ url: API_ENDPOINTS.variationDetail(id) });
    setVariation(data);
  };

  const handleSubmit = async () => {
    if (!selectedAddress) {
      Taro.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }

    const res = await request<{ order_id: number }>({
      url: API_ENDPOINTS.orders,
      method: 'POST',
      data: {
        variation_id: variationId,
        quantity: 1,
        shipping_address: selectedAddress, // 符合 V2.3 地址结构
      },
    });

    Taro.navigateTo({
      url: `/pages/order/order-confirm?orderId=${res.order_id}`,
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
>
> ✅ **购物车结算**：批量创建订单后，前端直接跳转支付页（优先第一笔订单），不再回订单列表。

------

## 六、关键交互规范

### 1. **商品详情与库存交互（`src/pages/product/detail.tsx`）**

- 变体 `in_stock=false` 时，规格选项置灰并显示“缺货”标识。
- 点击“加入购物车 / 立即购买”前，需校验库存并提示“该规格已售罄”。

### 2. **支付流程（`src/pages/order/payment.tsx`）**

- 支付页仅保留 **微信支付**；不再展示扫码/线下支付与凭证上传入口。
- 支持优惠券与购物卡抵扣，最终应付金额基于订单金额实时计算。
- 若订单详情返回 `points_reward`，支付页提示「本次购买可得积分：X」。

------

### 3. **退货申请（`src/pages/order/detail.tsx`）**

- 当订单状态满足可退货条件且 `return_status` 允许申请时显示“申请退货”按钮（状态值见 API 契约）。
- 图片先调用退货图片上传接口（见 API 契约），返回 URL 列表。
- 提交时调用退货申请接口（见 API 契约），携带 `reason`、`contact` 与 `images`。
- 已提交后展示 `return_status`（状态值见 API 契约），并隐藏重复提交入口。

------

### 3. **地址管理流程**

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

### 4. **虚拟购物卡赠礼（`src/pages/shopping-card/share.tsx`）**

- 入口位于 `shopping-card/mine.tsx`，“更多操作”或卡片按钮进入分享页
- 分享页需先拉取后台模板列表（图案 + 默认祝福语），用户只能选择模板，不可上传自定义素材
- 祝福语字段可沿用默认、编辑或清空；预览使用同一模板生成电子二维码和 PDF
- 点击生成后调用 `giftCardService.createShareToken({ card_number, template, message })`，返回 `share_token`、二维码地址、PDF 下载地址
- 展示成功弹窗：包含模板预览、有效期、复制二维码/PDF 链接、可直接触发微信分享

> 分享日志写入 `wp_myshop_gift_card_share_logs`（字段以 `docs/06_DATA_DICTIONARY_v1.2.md` 为准）；撤销接口 `giftCardService.revokeShare` 成功后刷新列表

------

### 5. **虚拟购物卡领取（`src/pages/shopping-card/claim.tsx`）**

- 分享二维码 / PDF 均跳转到同一领取入口
- 若未登录，先走微信登录；登录后展示确认提示页（说明领取后卡片将自动进入“购物卡中心”，并提示如何查找/使用）
- 用户点击“确认领取”后调用 `giftCardService.claimSharedCard({ token })`，成功即绑定当前账号，并 `redirectTo('/pages/shopping-card/mine?highlight=new')`
- 失败时需结合 `error-map.ts` 映射错误码（以 API 契约为准）展示友好提示
- 失败时需结合 `error-map.ts` 映射错误码（以 API 契约为准）展示友好提示

```ts
const handleConfirm = async () => {
  try {
    await giftCardService.claimSharedCard({ token });
    Taro.redirectTo({ url: '/pages/shopping-card/mine?highlight=new' });
  } catch (error) {
    Taro.showToast({ title: resolveErrorMessage(errorCodeOf(error)), icon: 'none' });
  }
};
```

------

### 6. **积分中心（`src/pages/points/summary.tsx` & `ledger.tsx`）**

- `summary.tsx` 初次进入需并发请求 `pointsService.getSummary()`、`pointsService.getBalance()` 与 `pointsService.getSettings()`。
- `ledger.tsx` 使用 `pointsService.getLedger({ page, per_page })` 实现分页加载。
- 积分兑换流程：先拉取 `pointsService.getRedeemOptions()`，确认后调用 `pointsService.redeem(optionId)` 并刷新余额。
- 任务中心：`pointsService.getMissions()` + `pointsService.claimMission(missionId)`。
- 每日签到：`pointsService.signin()`（每日仅一次）。

```ts
// src/pages/points/ledger.tsx
const { items, total } = await pointsService.getLedger({ page: 1, per_page: 20 });
```

------

### 7. **代理商仪表盘（`src/pages/agent/dashboard.tsx`）**

- `useDidShow` 中并发请求 `agentService.getProfile()`、`agentService.listDownlines()`、`agentService.listCommissions()`。
- 页面集中展示代理信息、下级代理列表与佣金记录。
- 无代理权限时跳转 `pages/agent/apply` 并提示「请先申请代理商」。

```ts
const hydrateDashboard = async () => {
  const [profile, downlines, commissions] = await Promise.all([
    agentService.getProfile(),
    agentService.listDownlines(),
    agentService.listCommissions()
  ]);
  setProfile(profile);
  setDownlines(downlines);
  setCommissions(commissions);
};
```

------

## 七、样式与 UI 规范

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

## 八、安全与性能

### 1. **安全**

- 不在前端存储敏感信息（如 share_token），所有分享链接只保存在后端
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

## 九、错误映射与提示（`src/utils/error-map.ts`）

- `error-map.ts` 必须维护与 `docs/08_API_CONTRACT_V2.3.md` 一致的错误码映射
- 页面捕获接口异常后调用 `resolveErrorMessage(error_code)`，默认兜底为「系统繁忙，请稍后再试」
- 分享、积分、代理模块新增错误码需同步更新契约与数据字典，并在 `error-map.ts` 中维护映射

> 具体映射仅维护在 `src/utils/error-map.ts`，本文不重复列举。
> 所有新增错误码必须同步更新到 `docs/08_API_CONTRACT_V2.3.md` 与 `docs/06_DATA_DICTIONARY_v1.2.md`，并维护 `src/utils/error-map.ts`。

------

## 十、环境配置（`src/utils/constants.ts`）

```ts
// src/utils/constants.ts
export const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'https://dev.yourdomain.com/wp-json/myshop/v1'
    : 'https://yourdomain.com/wp-json/myshop/v1';
```

> 通过 Taro 的 `process.env.NODE_ENV` 区分环境，无需额外 env 文件

------

## 十一、禁止事项（红线）

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



