import { PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';
import './app.scss';

function App({ children }: PropsWithChildren) {
  Taro.useLaunch(() => {
    console.log('App launched');
  });

  Taro.useDidShow(() => {
    // App 显示时的逻辑
  });

  return <>{children}</>;
}

export default App;