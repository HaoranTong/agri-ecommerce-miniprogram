# ✅ Git 分支管理规范 - 确认无误

## 🎯 您的规范（完全正确）

### 核心原则

```
dev → trial → master
(开发) → (测试) → (生产)
```

**✅ 单向合并，不可逆转**

---

## 📋 详细规则

| 分支 | 职责 | 可以做的 | 禁止做的 |
|-----|------|---------|---------|
| **dev** | 开发分支 | ✅ **修改代码**<br>✅ 提交代码<br>✅ 推送代码 | ❌ 接收来自 trial/master 的合并 |
| **trial** | 测试分支 | ✅ **仅接收 dev 的合并**<br>✅ 触发测试环境部署 | ❌ **直接修改代码**<br>❌ 合并其他分支<br>❌ 反向合并到 dev |
| **master** | 生产分支 | ✅ **仅接收 trial 的合并**<br>✅ 触发生产环境部署 | ❌ **直接修改代码**<br>❌ 合并 dev<br>❌ 反向合并 |

---

## ✅ 为什么这个规范是正确的？

### 1. **符合行业标准 (Git Flow)**

这是基于 Git Flow 的简化版本，被全球无数项目验证：
- Vincent Driessen 在 2010 年提出
- 已成为分支管理的黄金标准
- 大型开源项目广泛采用

### 2. **保证代码质量**

```
dev (开发) → trial (测试) → master (生产)
  ↓           ↓              ↓
 编码      → 验证       → 上线
```

- ✅ 所有代码都经过完整测试
- ✅ 生产环境只接收已验证的代码
- ✅ 降低线上故障率

### 3. **历史清晰可追溯**

```
dev:    A → B → C → D → E
           ↓       ↓
trial:     A   →   D
               ↓
master:        A
```

- ✅ 单向流动，历史线性
- ✅ 易于定位问题
- ✅ 便于回滚

### 4. **团队协作友好**

- ✅ 规则明确，不易出错
- ✅ 即使单人开发也保持好习惯
- ✅ 方便未来团队扩展

---

## 🚫 为什么禁止反向合并？

### ❌ 错误示例：从 trial 合并回 dev

```bash
git checkout dev
git merge trial  # 🚫 禁止！
```

**问题**：
1. **破坏源头纯净性**：dev 是代码源头，不应该受下游影响
2. **测试环境污染**：trial 可能有临时修改或配置
3. **历史混乱**：无法区分哪些是开发，哪些是测试
4. **合并冲突增多**：双向合并会产生大量冲突

### ❌ 错误示例：直接在 trial/master 修改

```bash
git checkout trial
# 修改代码...
git commit  # 🚫 禁止！
```

**问题**：
1. **绕过测试流程**：未经 dev 验证的代码
2. **其他分支不同步**：dev 不知道这个改动
3. **无法追溯**：不清楚为什么改
4. **回滚困难**：不知道回到哪个版本

---

## ✅ 正确的紧急修复流程

### 场景：生产环境发现严重 Bug

```bash
# ✅ 正确做法：回到 dev 修复

# 1. 切到 dev 分支
git checkout dev

# 2. 修复 Bug
# ... 修改代码 ...
git add .
git commit -m "fix(urgent): critical production bug"

# 3. 推送
scripts\push-all.bat dev

# 4. 快速部署到测试验证
scripts\deploy-trial.bat

# 5. 验证通过后立即上线
scripts\deploy-prod.bat
```

**为什么这样做？**
- ✅ 保持分支规范
- ✅ 所有分支同步更新
- ✅ 历史清晰可追溯
- ✅ 可以快速回滚

---

## 🛡️ 技术保障措施

### 1. 自动化脚本

已创建的脚本严格遵循规范：

- ✅ `deploy-trial` - 自动合并 dev → trial
- ✅ `deploy-prod` - 自动合并 trial → master
- ✅ `check-branch-protection` - 检查分支保护

### 2. 分支保护脚本

```bash
# Windows
scripts\check-branch-protection.bat

# Linux/macOS
./scripts/check-branch-protection.sh
```

**功能**：
- 检测当前分支
- 如果在 trial/master，阻止操作并提示
- 引导使用正确的流程

### 3. Git Hooks 集成（推荐）

```bash
# .git/hooks/pre-commit
#!/bin/bash
./scripts/check-branch-protection.sh || exit 1
```

**效果**：
- 自动阻止在保护分支提交
- 强制执行规范
- 减少人为错误

---

## 📊 与其他策略对比

| 策略 | dev → trial → master | GitHub Flow | Trunk-Based |
|-----|---------------------|-------------|-------------|
| **分支数量** | 3 个固定分支 | 临时特性分支 | 1 个主分支 |
| **合并方向** | ✅ 单向严格 | 双向 PR | 直接提交 |
| **测试保证** | ✅ 强制测试环境 | CI/CD | CI/CD |
| **适用场景** | 单人/小团队 | 中大型团队 | 持续集成团队 |
| **学习曲线** | ✅ 简单直观 | 中等 | 需要成熟 CI |
| **回滚容易度** | ✅ 非常容易 | 中等 | 依赖 CI |

**您的规范最适合**：
- ✅ 单人开发
- ✅ 小型团队
- ✅ 需要明确测试阶段
- ✅ 宝塔 Webhook 自动部署

---

## 🎯 核心要点总结

### ✅ 必须遵守

1. **dev 是唯一可以修改代码的分支**
2. **trial 只能接收 dev 的合并**
3. **master 只能接收 trial 的合并**
4. **合并方向：dev → trial → master（单向）**
5. **使用脚本部署，避免手动操作**

### ❌ 绝对禁止

1. **在 trial 或 master 直接修改代码**
2. **反向合并（trial → dev 或 master → trial）**
3. **跨级合并（dev → master）**
4. **手动合并（容易出错）**

---

## 📝 相关文档

- `docs/27_BRANCH_MANAGEMENT_RULES.md` - 完整规范文档
- `scripts/README.md` - 脚本使用说明
- `docs/26_GIT_AUTOMATION_GUIDE.md` - 自动化部署指南

---

## 💬 最终确认

**您的规范：**
> "master只能合并trial，从dev到trial到master，这个合并过程是单向的，不能反过来。而且只能在dev分支修改代码，其他两个分支只能合并，不能修改代码"

**确认结果：**
✅ **完全正确！**
✅ **符合行业最佳实践！**
✅ **适合您的项目场景！**
✅ **已提供技术保障措施！**

**请放心使用这个规范！** 🎉
