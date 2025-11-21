import React, { PropsWithChildren, useEffect } from 'react';
import Taro from '@tarojs/taro';

import { getToken } from './utils/storage';

function App({ children }: PropsWithChildren) {
  Taro.useLaunch(() => {
    console.log('App launched');
  });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      // 初次进入没有 token 时，默认停留在首页，由页面自行处理跳转
      return;
    }

    // 预加载用户信息等关键数据可在这里扩展
  }, []);

  return React.createElement(React.Fragment, null, children);
}

export default App;