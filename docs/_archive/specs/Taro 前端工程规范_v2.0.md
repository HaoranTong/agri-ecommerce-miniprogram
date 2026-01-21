# 📱 Taro 前端工程规范（V2.0）

## 微信小程序 × WordPress 无头电商系统 · 前端开发基线

> **版本**：V2.0（与 API 契约 V2.3、功能规格 V1.0 对齐）
> **适用项目**：`agri-ecommerce-miniprogram`
> **目标**：统一前端工程结构，支持购物卡分享、积分中心、代理商仪表盘等二期需求
> **核心原则**：类型安全 · 模块清晰 · 无冗余依赖 · 与文档双向验证  

------

## 一、技术栈与核心依赖

| 类别        | 技术/库                  | 版本要求   | 说明                                                         |
| ----------- | ------------------------ | ---------- | ------------------------------------------------------------ |
| 框架        | @tarojs/taro             | `4.1.x`    | 官方稳定版；使用 `config/index.ts` 管理平台差异               |
| UI 运行时   | React + @tarojs/react    | `18.x`     | 全量使用函数组件 + Hooks                                     |
| 语言        | TypeScript               | `^5.4.0`   | `strictNullChecks=true`，提供 `@/*` 路径别名                 |
| 样式        | Sass + CSS Modules       | `^1.75.0`  | `.module.scss` 或同名 `index.scss`，禁止全局样式污染         |
| HTTP 客户端 | `src/services/api.ts`    | —          | 基于 `Taro.request` 封装，自动注入 Token、错误处理           |
| 状态管理    | React Hooks/Context      | —          | 一期不引入 Redux/Zustand，必要时按域拆分自定义 Hook          |
| 质量工具    | ESLint + Stylelint + Husky | 已配置 | 提交前自动执行 `lint-staged`，保持代码/样式风格一致         |

> 💡 **依赖增减必须更新本规范**，并在 `package.json` 同步锁定版本，避免 AI 自动升级。 

------

## 二、目录结构规范

```bash
src/
├── app.ts                 # 小程序入口组件，注册生命周期
├── app.config.ts          # 页面/窗口/分包配置
├── app.scss               # 全局基础样式（仅重置 + 变量引入）
│
├── pages/                 # 页面目录（文件夹 = 路由）
│   ├── index/             # 首页商品列表 + 营销位
│   ├── auth/              # 登录/授权
│   ├── product/           # 商品详情、SKU 切换
│   ├── order/             # 下单、付款指引、订单详情、上传凭证
│   ├── address/           # 地址列表/编辑/选择
│   ├── giftcard/          # 购物卡：mine/redeem/share/claim/reset-pin
│   ├── referral/          # 邀请裂变与佣金
│   ├── points/            # 积分中心（summary/ledger）
│   └── agent/             # 代理商仪表盘、下级管理
│
├── components/            # 复用组件（函数式 + CSS Modules）
│   ├── PaymentModal/      # 支付指引弹窗
│   ├── ProductCard/       # 商品卡片（已存在）
│   └── ...                # 后续新增组件放入独立目录
│
├── services/              # 网络层
│   ├── api.ts             # 底层 request 封装（Taro.request）
│   └── endpoints.ts       # 各业务域 service（待拆分：orders, giftCard, points, agent）
│
├── utils/                 # 工具库
│   ├── constants.ts       # API_BASE、渠道枚举
│   ├── storage.ts         # Token/缓存读写封装
│   └── error-map.ts       # 错误码 -> 文案映射（需与 API 契约同步）
│
├── styles/                # 全局样式变量/混入
│   └── variables.scss
│
├── types/                 # TypeScript 接口
│   └── index.ts           # Product, Order, GiftCard, Points, Agent 等
│
└── mock/                  # 本地开发 mock 数据（调试用，可选）
```

> ✅ **命名规范**：
>
> - 页面文件统一为 `index.tsx` / `index.config.ts` / `index.module.scss`
> - 组件目录下使用 `index.tsx` + `index.scss`，导出默认组件
> - 工具、服务、Hook 使用 `camelCase.ts`
> - 引入路径使用 `@/` 别名，禁止 `../../` 级联

------

## 三、基础配置与模板

### 1. `app.config.ts`（路由总表）

```ts
// src/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/product/detail',
    'pages/order/create',
    'pages/order/confirm',
    'pages/order/detail',
    'pages/order/list',
    'pages/address/list',
    'pages/address/edit',
    'pages/address/select',
    'pages/giftcard/mine',
    'pages/giftcard/redeem',
    'pages/giftcard/share',      // 二期新增：虚拟卡赠礼
    'pages/giftcard/claim',      // 二期新增：受赠人领取
    'pages/points/summary',      // 二期新增：积分中心
    'pages/points/ledger',       // 二期新增：积分流水
    'pages/referral/index',
    'pages/agent/dashboard',
    'pages/agent/downlines',     // 二期新增：下级代理
    'pages/agent/commissions',   // 二期新增：代理佣金
    'pages/auth/login'
  ],
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '常香米坊',
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
        text: '商城',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/order/list',
        text: '订单',
        iconPath: 'assets/icons/order.png',
        selectedIconPath: 'assets/icons/order-active.png'
      }
    ]
  }
});
```

> 每次新增页面需同步改动：`app.config.ts` → `docs/10_MINIPROGRAM_SPEC_v2.0.md` → `docs/08_API_CONTRACT_V2.3.md`。

### 2. `app.ts`（入口组件）

```ts
// src/app.ts
import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { getToken } from '@/utils/storage';
import { userService } from '@/services/api';

const App: React.FC = ({ children }) => {
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    userService
      .getProfile()
      .catch(() => Taro.showToast({ title: '登录状态已过期', icon: 'none' }));
  }, []);

  return children as React.ReactElement;
};

export default App;
```

> 入口仅做全局初始化，不放业务逻辑。跨页面状态使用 Context/Hook 独立封装。

### 3. 页面局部配置

- 每个页面可按需创建 `index.config.ts`，设置标题、下拉刷新、分包配置。
- 页面样式固定使用 `index.module.scss` 或 `index.scss`（配合 CSS Modules）。
- 所有页面导出默认组件，命名与目录保持一致，便于路由匹配。

------

## 四、网络服务层规范

### 1. 基础请求封装

```ts
// src/services/api.ts（节选）
const resolveUrl = (endpoint: string) =>
  endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

const handleUnauthorized = () => {
  clearToken();
  Taro.showToast({ title: '登录已失效，请重新登录', icon: 'none' });
  Taro.navigateTo({ url: '/pages/auth/login' });
};

export const request = async <T = any>({ url, method = 'GET', data, header, showLoading = false }: RequestOptions): Promise<T> => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(header || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  if (showLoading) Taro.showLoading({ title: '加载中...', mask: true });

  try {
    const { statusCode, data: payload } = await Taro.request<any>({ url: resolveUrl(url), method, data, header: headers });

    if (statusCode === 401) {
      handleUnauthorized();
      throw new Error('unauthorized');
    }

    if (statusCode >= 400) {
      throw new Error(payload?.message || '请求失败');
    }

    if (payload?.error_code) {
      throw new Error(payload.error_code);
    }

    return payload as T;
  } finally {
    if (showLoading) Taro.hideLoading();
  }
};
```

- 所有调用需结合 `try/catch`，并使用 `resolveErrorMessage(error.message)` 转换错误码 → 文案。
- 上传类接口统一调用 `Taro.uploadFile`，token 从 `getToken()` 注入。

### 2. 服务拆分约定

- `services/api.ts` 只导出 request + 具体领域 service，如 `orderService`、`giftCardService`、`pointsService`。
- Gift Card/Points/Agent 模块新增方法时，务必：
  1. 更新 `API_ENDPOINTS` 常量；
  2. 在对应 service 内封装方法；
  3. 在页面调用层引入，而非直接拼接 URL。
- Mock 数据仅限开发环境使用，命中 mock 时需打印 warn，避免线上遗留。

### 3. 错误映射

- `src/utils/error-map.ts` 维护 `error_code -> message` 映射，尊重 `docs/06_06_DATA_DICTIONARY_v1.2.md`。
- 新增错误码流程：API 契约 → 数据字典 → error-map → 页面调用。
- 统一导出 `resolveErrorMessage(code: string): string`，页面兜底提示为「系统繁忙，请稍后再试」。

------

## 五、类型契约与数据模型

- `src/types/index.ts` 必须同步 API 契约字段，新增字段时追加注释说明来源接口。
- 常用接口：`UserProfile`、`GiftCard`、`PointLedgerItem`、`AgentDashboard` 等，缺失类型需先定义再调用。
- 所有 service 返回值必须显式声明返回类型，禁止使用 `any`。

```ts
export interface GiftCardShareToken {
  token: string;
  expires_at: string;
  template_name: string;
}

export interface PointsSummary {
  total_points: number;
  expiring_within_7_days: number;
  leaderboard?: Array<{ nickname: string; points: number }>;
}
```

------

## 六、页面与组件模式

- 页面目录统一结构：`index.tsx` + `index.module.scss` + 可选 `hooks.ts` / `service.ts`。
- 复杂页面（如 `giftcard/share`）建议拆分自定义 Hook：

```ts
// pages/giftcard/share/index.tsx（示意）
const GiftCardSharePage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleShare = async (cardId: number) => {
    setLoading(true);
    try {
      const { token } = await giftCardService.createShareToken({ card_id: cardId });
      await Taro.showShareImageMenu({ path: `/pages/giftcard/claim?token=${token}` });
      Taro.showToast({ title: '分享口令已生成' });
    } catch (error) {
      const message = resolveErrorMessage(error instanceof Error ? error.message : 'UNKNOWN');
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return <ShareView loading={loading} onShare={handleShare} />;
};
```

- 组件层使用 props 驱动，不直接访问请求层；复用组件放入 `src/components/*`。
- 页面内临时函数使用 `useCallback`，列表渲染使用 `key` 保证稳定性。

------

## 七、样式与设计系统

- 样式统一使用 CSS Modules：`import styles from './index.module.scss';`；类名使用小驼峰。
- 公共变量（色值、字号、间距）集中在 `styles/variables.scss`，通过 `@import` 引入。
- 避免使用 `rpx`，统一使用 `px`；需要响应式时使用 Flex/Grid。
- 图片、图标放置在 `src/assets` 下，SVG 优先转 React 组件。

```scss
// pages/points/ledger/index.module.scss
.ledgerList {
  padding: 16px;
  background: #ffffff;
}

.ledgerItem {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
```

------

## 八、协作与代码质量

- 提交前自动执行 `lint-staged`，禁止忽略错误直接提交。
- Commit Message 遵循 Conventional Commits：`feat: giftcard share page`、`fix: points ledger pagination`。
- 引入新依赖须更新本文档 + `README`（若新增）+ `package.json` 注释。
- 所有合并请求需附带：受影响页面、测试方式、是否改动接口。

------

## 九、构建与调试

```bash
npm run dev:weapp      # 启动开发模式（监听编译）
npm run build:weapp    # 生成发布包
```

- 调试统一使用「微信开发者工具」指向 `dist/weapp`。
- 遇到 API 401/403，先检查 `getToken` 与请求头是否落地。
- 发布前执行 `npm ci && npm run build:weapp` 验证可重复构建。

------

**文档版本**：V2.0（同步 API 契约 V2.3）
**最后更新**：2025年11月22日
**输出格式**：Markdown（兼容 Typora 渲染）

------

✅ **现状校验**：

- 目录结构与 `src/` 当前代码一致，缺失目录（points、giftcard/share 等）需按本文补齐。
- `services/api.ts` 已具备基础封装，待补充积分、代理相关方法时参考此规范。
- 错误码、类型定义须与 `docs/06_06_DATA_DICTIONARY_v1.2.md`、`docs/08_API_CONTRACT_V2.3.md` 保持一致。
