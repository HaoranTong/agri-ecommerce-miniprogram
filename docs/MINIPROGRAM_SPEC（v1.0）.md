好的！以下是你要的第三份配套文档：

------

# 📱 微信小程序工程结构规范

## `myshop-miniprogram` 工程（V1.0 - 冻结基线）

> **适用项目**：微信小程序 × WordPress 无头电商系统（一期 + 二期）
> **目标**：统一代码组织、提升可维护性、支持多人协作、便于后续迭代
> **原则**：轻量、清晰、与 API 契约 V2.3 严格对齐

------

## 一、基础信息

| 项目       | 说明                                                   |
| ---------- | ------------------------------------------------------ |
| 开发框架   | 微信原生小程序（不强制使用 Taro/uni-app）              |
| 最低基础库 | 2.24.0（支持 async/await）                             |
| 语言       | JavaScript（ES6+）或 TypeScript（推荐）                |
| 状态管理   | 全局 `globalData` + 页面局部状态（一期无需复杂状态库） |
| 网络请求   | 封装 `wx.request`，统一处理 Token、错误拦截            |

------

## 二、目录结构规范

```bash
myshop-miniprogram/
├── app.js                # 小程序入口
├── app.json              # 全局配置
├── app.wxss              # 全局样式
├── project.config.json   # 项目配置
│
├── pages/                # 页面目录（按功能划分）
│   ├── auth/             # 认证相关
│   │   ├── login.js
│   │   ├── login.json
│   │   └── login.wxml
│   │
│   ├── home/             # 首页
│   ├── product/          # 商品详情
│   ├── cart/             # 购物车
│   ├── order/            # 订单流程
│   │   ├── create.js     # 下单页
│   │   ├── upload-proof.js  # 上传付款截图
│   │   └── list.js       # 订单列表
│   │
│   ├── giftcard/         # 虚拟购物卡
│   │   ├── redeem.js     # 兑换卡
│   │   ├── mine.js       # 我的卡包
│   │   └── reset-pin.js  # 重置密码
│   │
│   ├── referral/         # 分销裂变
│   │   ├── downlines.js  # 我的下级
│   │   └── commissions.js # 佣金明细
│   │
│   └── agent/            # 代理商专区（二期）
│       ├── dashboard.js
│       ├── downlines.js
│       └── commissions.js
│
├── components/           # 自定义组件
│   ├── product-card/     # 商品卡片
│   ├── order-item/       # 订单项
│   └── empty-state/      # 空状态提示
│
├── utils/                # 工具模块
│   ├── api.js            # 核心：API 请求封装
│   ├── auth.js           # Token 管理
│   ├── storage.js        # 本地缓存封装
│   └── helpers.js        # 通用函数（如 formatPrice）
│
├── assets/               # 静态资源
│   ├── icons/            # SVG / PNG 图标
│   └── images/           # 启动图、占位图等
│
└── config/               # 配置文件
    └── env.js            # 环境变量（API 地址等）
```

> ✅ 所有页面和组件均采用 **独立目录**，包含 `.js`、`.wxml`、`.wxss`、`.json` 四件套

------

## 三、核心模块实现规范

### 1. **全局状态管理（`app.js`）**

```js
// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    hasCart: false
  },

  onLaunch() {
    // 从 storage 恢复 token
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
  }
});
```

> ⚠️ 仅存储 **跨页面共享的轻量数据**，避免滥用

------

### 2. **API 请求封装（`utils/api.js`）**

```js
// utils/api.js
import { getToken, clearToken } from './auth';

const BASE_URL = 'https://yourdomain.com/wp-json/myshop/v1';

export const request = async (options) => {
  const token = getToken();
  const header = { ...options.header };
  
  if (token) {
    header.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header
    });

    const { statusCode, data } = res;

    // 处理业务错误
    if (data.error_code) {
      wx.showToast({ title: data.message || '请求失败', icon: 'none' });
      throw new Error(data.error_code);
    }

    return data;
  } catch (err) {
    // 处理 401 Token 失效
    if (err.statusCode === 401) {
      clearToken();
      wx.navigateTo({ url: '/pages/auth/login' });
    }
    throw err;
  }
};
```

> ✅ 统一错误提示、自动跳转登录、自动携带 Token

------

### 3. **认证流程（`pages/auth/login.js`）**

```js
// 登录逻辑
const login = async () => {
  wx.login({
    success: async (res) => {
      try {
        const data = await request({
          url: '/auth/login',
          method: 'POST',
          data: { code: res.code }
        });
        
        // 保存 token 和用户信息
        wx.setStorageSync('token', data.token);
        getApp().globalData.userInfo = data;
        
        // 跳回原页面或首页
        wx.navigateBack({ delta: 1 }) || wx.switchTab({ url: '/pages/home/index' });
      } catch (err) {
        console.error('Login failed:', err);
      }
    }
  });
};
```

------

### 4. **页面生命周期与数据加载**

- **首次进入**：在 `onLoad` 中加载必要数据

- **返回页面**：在 `onShow` 中检查是否需刷新（如购物车状态）

- **示例（订单创建页）**：

  ```js
  Page({
    data: { product: null, address: null },
    
    onLoad(options) {
      this.loadProduct(options.variation_id);
    },
    
    onShow() {
      // 检查是否已登录
      if (!getApp().globalData.token) {
        wx.navigateTo({ url: '/pages/auth/login' });
      }
    }
  });
  ```

------

## 四、关键交互规范

### 1. **上传付款截图（`pages/order/upload-proof.js`）**

- 使用 `wx.chooseImage` + `wx.uploadFile`
- 显示上传进度
- 成功后跳转至订单详情

```js
const uploadProof = (orderId) => {
  wx.chooseImage({
    count: 1,
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0];
      wx.uploadFile({
        url: BASE_URL + '/orders/upload-payment-proof',
        filePath: tempFilePath,
        name: 'proof_image',
        formData: { order_id: orderId },
        header: { Authorization: `Bearer ${getToken()}` },
        success: (uploadRes) => {
          wx.showToast({ title: '提交成功' });
          wx.navigateTo({ url: `/pages/order/detail?id=${orderId}` });
        }
      });
    }
  });
};
```

------

### 2. **购物卡兑换流程**

- 输入卡号 + PIN
- 调用 `/gift-cards/redeem`
- 成功后更新“我的卡包”缓存

------

## 五、样式与 UI 规范

### 1. **全局样式（`app.wxss`）**

- 定义颜色变量：

  ```css
  :root {
    --primary-color: #4CAF50;
    --text-color: #333;
    --border-color: #eee;
  }
  ```

- 统一按钮、输入框样式

### 2. **组件化**

- 所有重复 UI（如商品卡片、订单项）必须封装为自定义组件
- 组件通过 `properties` 接收数据，通过 `triggerEvent` 通知父级

------

## 六、安全与性能

### 1. **安全**

- 不在前端存储敏感信息（如 PIN）
- 所有 API 调用走 HTTPS
- 用户输入做长度/格式校验

### 2. **性能**

- 图片使用 CDN 并指定宽高
- 列表使用 `scroll-view` + 分页加载（未来扩展）
- 避免在 `setData` 中传递大对象

------

## 七、环境配置（`config/env.js`）

```js
// config/env.js
const ENV = {
  dev: {
    API_BASE: 'https://dev.yourdomain.com/wp-json/myshop/v1'
  },
  prod: {
    API_BASE: 'https://yourdomain.com/wp-json/myshop/v1'
  }
};

export const getEnv = () => {
  // 根据 process.env.NODE_ENV 或 wx.getAccountInfoSync() 判断
  return ENV.prod; // 一期直接用 prod
};
```

> 一期可简化，直接写死生产地址

------

## 八、禁止事项（红线）

- ❌ 在页面中直接写 `wx.request`（必须走 `utils/api.js`）
- ❌ 使用 `var`（统一用 `const` / `let`）
- ❌ 页面逻辑超过 300 行（应拆分为组件或工具函数）
- ❌ 硬编码 API 路径（应使用常量或配置）

------

**文档版本**：V1.0（小程序工程冻结基线）
**最后更新**：2025年11月18日
**输出格式**：Markdown（可直接保存为 `MINIPROGRAM_SPEC.md`）

------

✅ 下一步建议：
请确认此工程结构是否符合你的开发习惯。确认后，我将输出下一份文档：

> **《Postman Collection + 测试用例》**

你可以回复：  

> “确认，继续输出 Postman 测试集合。”