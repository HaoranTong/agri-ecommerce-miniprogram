import { defineConfig } from '@tarojs/cli';
import path from 'path';

import devConfig from './dev';
import prodConfig from './prod';

const baseConfig = {
  projectName: 'agri-ecommerce-miniprogram',
  date: '2025-11-21',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  plugins: ['@tarojs/plugin-framework-react'],
  compiler: {
    type: 'vite'
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src')
  },
  sass: {
    resource: [],
    // 默认注入常用变量，避免在每个样式文件中重复引入
    data: '@use "src/styles/variables" as *;\n'
  },
  copy: {
    patterns: [],
    options: {}
  },
  cache: {
    enable: true
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true
      },
      autoprefixer: {
        enable: true
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true
      }
    }
  }
};

export default defineConfig(async (merge, { command }) => {
  const envConfig = command === 'build' ? prodConfig : devConfig;
  return merge({}, baseConfig, envConfig);
});