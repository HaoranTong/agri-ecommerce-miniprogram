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
    navigationBarTitleText: '常香米坊',
    backgroundColor: '#f8f8f8',
    backgroundTextStyle: 'light',
    enablePullDownRefresh: true
  },
  tabBar: {
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
    ],
    color: '#999999',
    selectedColor: '#2f7a3d',
    backgroundColor: '#ffffff',
    borderStyle: 'black'
  },
  networkTimeout: {
    request: 60000,
    connectSocket: 60000,
    uploadFile: 60000,
    downloadFile: 60000
  },
  // 启用组件按需注入，提升小程序启动性能
  lazyCodeLoading: 'requiredComponents'
});