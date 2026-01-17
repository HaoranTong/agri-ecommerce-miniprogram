# Git Commit 提示词模板

> 基于已完成的工作任务总结

## 常用 Commit 类型

```
feat:     新功能开发
fix:      Bug修复
refactor: 代码重构
style:    格式调整（不影响功能）
docs:     文档更新
test:     测试相关
chore:    构建/工具/辅助功能
```

---

## 功能开发类

```bash
# 新增邀请统计页面
git commit -m "feat: 新增邀请统计页面 (pages/referral/index)"

# 新增代理申请功能
git commit -m "feat(agent): 新增代理申请功能 (pages/agent/apply.tsx)"

# 新增API方法
git commit -m "feat(api): 新增8个API方法 (invitationService, analyticsService, promoService, agentApplicationService)"

# 优化购物卡购买流程
git commit -m "feat(giftcard): 优化购物卡购买流程 (templates.tsx)"

# 支付页面功能
git commit -m "feat(payment): 支付页面支持优惠券和购物卡 (pages/order/payment.tsx)"
```

---

## 代码优化类

```bash
# 清理代码
git commit -m "refactor: 清理注释代码和未使用导入"

# 类型定义
git commit -m "refactor(types): 补充TypeScript类型定义 (src/types/index.ts)"

# API服务重构
git commit -m "refactor(api): 重构API服务层"

# 错误处理
git commit -m "refactor(services): 统一错误处理封装"
```

---

## 测试相关

```bash
# Jest配置
git commit -m "test: 配置Jest单元测试环境 (jest.config.js, jest.setup.js)"

# 工具函数测试
git commit -m "test: 添加logger工具函数测试 (src/utils/logger.test.ts)"
git commit -m "test: 添加errorHandler工具测试 (src/utils/errorHandler.test.ts)"

# Postman集合
git commit -m "test: 完善Postman API测试集合 (docs/postman/)"
```

---

## 组件开发

```bash
# 新增骨架屏
git commit -m "feat(component): 新增骨架屏组件 (components/Skeleton/)"

# 新增空状态
git commit -m "feat(component): 新增空状态组件 (components/EmptyState/)"

# 新增储值卡弹窗
git commit -m "feat(component): 新增储值卡弹窗 (components/StoredValueModal/)"
```

---

## Bug修复

```bash
# 环境变量问题
git commit -m "fix(logger): 修复环境变量动态检查问题"

# 测试问题
git commit -m "fix(tests): 修复Jest测试中console.log mock问题"

# API路径
git commit -m "fix(api): 修正错误的接口路径 (referral → referrals)"
```

---

## 文档和样式

```bash
# 文档更新
git commit -m "docs: 更新功能实现状态分析报告"
git commit -m "docs: 更新开发工作计划文档"
git commit -m "docs: 新增测试执行指南"
git commit -m "docs: 新增API接口契约 (08_API_CONTRACT_V2.3.md)"

# 统一称呼
git commit -m "style: 统一购物卡称呼为'购物卡' (giftcard → shopping-card)"
git commit -m "style: 更新页面文案和路径"

# 配置更新
git commit -m "chore: 更新ESLint配置"
git commit -m "chore: 添加husky git hooks"
```

---

## 完整 Commit Message 示例

```
feat(api): 新增邀请统计和渠道追踪API服务

- 新增 invitationService.getSummary() 获取邀请统计
- 新增 invitationService.track() 记录渠道参数
- 新增 analyticsService.getChannelAnalytics() 获取渠道KPI
- 新增 promoService.getPoster() 获取海报素材

影响文件:
- src/services/api.ts
- src/utils/constants.ts
- src/types/index.ts
- src/pages/referral/index.tsx

closes #42
```

---

## 快速参考表

| 修改类型 | 示例 | 说明 |
|---------|------|------|
| 新增页面 | `feat: 新增代理申请页面` | 新增完整页面 |
| 新增功能 | `feat(giftcard): 新增分享功能` | 在现有模块增加功能 |
| API相关 | `feat(api): 新增XxxService` | 新增API服务 |
| 修复Bug | `fix: 修复登录失败问题` | 修复已知问题 |
| 代码优化 | `refactor: 重构订单模块` | 提升代码质量 |
| UI调整 | `style: 优化按钮样式` | 视觉调整 |
| 文档更新 | `docs: 更新API文档` | 文档补充 |
| 测试相关 | `test: 新增订单测试用例` | 测试覆盖 |

---

## 提交命令

项目已配置 commitlint，使用以下命令提交：

```bash
# 功能开发
git add . && git commit -m "feat: 新增邀请统计功能"

# Bug修复
git add . && git commit -m "fix: 修复API接口路径错误"

# 文档更新
git add . && git commit -m "docs: 更新API接口文档"

# 代码重构
git add . && git commit -m "refactor: 优化错误处理逻辑"

# 提交所有修改（包括删除）
git add -A && git commit -m "chore: 代码清理和优化"
```


