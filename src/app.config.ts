// src/app.config.ts
export default {
  pages: [
    'pages/auth/login',
    'pages/index/index'
  ],
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '常香米坊',
    backgroundColor: '#f8f8f8',
    backgroundTextStyle: 'light',
    enablePullDownRefresh: true,
  },
  // ❌ 删除 tabBar，先让 app.json 能生成
  networkTimeout: {
    request: 6000,
    connectSocket: 6000,
    uploadFile: 6000,
    downloadFile: 6000,
  },
};