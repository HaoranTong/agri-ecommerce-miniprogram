// src/app.ts
import React, { PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';

function App({ children }: PropsWithChildren) {
  Taro.useLaunch(() => {
    console.log('App launched');
  });

  return React.createElement(React.Fragment, null, children);
}

export default App;