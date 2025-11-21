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
    'pages/referral/index',
    'pages/agent/dashboard',
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
    ],
    color: '#999999',
    selectedColor: '#2f7a3d',
    backgroundColor: '#ffffff',
    borderStyle: 'black'
  },
  networkTimeout: {
    request: 6000,
    connectSocket: 6000,
    uploadFile: 6000,
    downloadFile: 6000
  }
});