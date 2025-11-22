import { createRecursiveComponentConfig } from '@tarojs/runtime';

// Taro generates a virtual recursive component named `comp` for sharing templates
// across deeply nested component trees in WeChat Mini Programs. Explicitly
// declaring it here silences build-time warnings about a missing custom
// component entry while keeping Taro's runtime behaviour intact.
Component(createRecursiveComponentConfig());
