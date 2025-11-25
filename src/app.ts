import React, { PropsWithChildren, useEffect } from 'react';
import Taro from '@tarojs/taro';

import { getToken } from './utils/storage';

function App({ children }: PropsWithChildren) {
  Taro.useLaunch(() => {
    console.log('App launched');
  });

  Taro.useDidShow(() => {
    // App 显示时的逻辑
  });

  return React.createElement(React.Fragment, null, children);
}

export default App;