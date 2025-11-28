import { PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';
import TestUserSelector from './components/TestUserSelector';
import './components/TestUserSelector/index.scss';
import './app.scss';

function App({ children }: PropsWithChildren) {
  Taro.useLaunch(() => {
    console.log('App launched');
  });

  Taro.useDidShow(() => {
    // App 显示时的逻辑
  });

  return (
    <>
      {children}
      {/* 测试用户选择器 */}
      <TestUserSelector />
    </>
  );
}

export default App;