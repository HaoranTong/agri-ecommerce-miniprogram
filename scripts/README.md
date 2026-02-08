# 🚀 自动化部署脚本说明

本目录包含用于简化 Git 操作和自动化部署的脚本。

## 📁 脚本列表

| 脚本 | 用途 | 平台 |
|-----|------|------|
| `push-all.sh` / `push-all.bat` | 同时推送到 Gitee 和 GitHub | Linux/macOS / Windows |
| `deploy-trial.sh` / `deploy-trial.bat` | 部署到测试环境（dev → trial） | Linux/macOS / Windows |
| `deploy-prod.sh` / `deploy-prod.bat` | 部署到生产环境（trial → master） | Linux/macOS / Windows |
| `check-branch-protection.sh` / `.bat` | 分支保护检查 | Linux/macOS / Windows |

---

## 🔧 使用方法

### 📍 可以在任何目录下执行！

**✅ 脚本会自动定位到项目根目录**，无论您在哪个目录下运行，都能正常工作。

**示例**：
```bash
# 在项目根目录
e:\projects\agri-ecommerce-miniprogram> scripts\push-all.bat

# 在 src 目录
e:\projects\agri-ecommerce-miniprogram\src> ..\scripts\push-all.bat

# 在任意子目录
e:\projects\agri-ecommerce-miniprogram\src\pages> ..\..\scripts\push-all.bat

# 甚至在完全不同的目录（使用绝对路径）
c:\Users\username> e:\projects\agri-ecommerce-miniprogram\scripts\push-all.bat
```

---

### 1. push-all - 双远程推送

**功能**: 一次性推送指定分支到 Gitee 和 GitHub

**Linux/macOS**:
```bash
# 推送当前分支
./scripts/push-all.sh

# 推送指定分支
./scripts/push-all.sh dev
./scripts/push-all.sh trial
./scripts/push-all.sh master
```

**Windows**:
```cmd
# 推送当前分支
scripts\push-all.bat

# 推送指定分支
scripts\push-all.bat dev
scripts\push-all.bat trial
scripts\push-all.bat master
```

---

### 2. deploy-trial - 部署到测试环境

**功能**: 
- 将 `dev` 分支合并到 `trial` 分支
- 推送到 Gitee（触发宝塔 Webhook）
- 推送到 GitHub（备份）
- 自动切回 `dev` 分支

**工作流**:
```
dev → trial → 宝塔 Webhook → Trial 站点自动部署
```

**Linux/macOS**:
```bash
# 使用默认提交信息
./scripts/deploy-trial.sh

# 使用自定义提交信息
./scripts/deploy-trial.sh "feat: add new feature"
```

**Windows**:
```cmd
# 使用默认提交信息
scripts\deploy-trial.bat

# 使用自定义提交信息
scripts\deploy-trial.bat "feat: add new feature"
```

---

### 3. deploy-prod - 部署到生产环境

**功能**: 
- 将 `trial` 分支合并到 `master` 分支
- 推送到 Gitee（触发宝塔 Webhook）
- 推送到 GitHub（备份）
- 自动切回 `dev` 分支
- **包含确认提示，防止误操作**

**工作流**:
```
trial → master → 宝塔 Webhook → Production 站点自动部署
```

**Linux/macOS**:
```bash
./scripts/deploy-prod.sh
# 会提示确认: 确认要部署到生产环境吗？(yes/no):
```

**Windows**:
```cmd
scripts\deploy-prod.bat
REM 会提示确认: 确认要部署到生产环境吗？(yes/no):
```

---

## ⚙️ 首次使用配置

### Linux/macOS 用户

给脚本添加执行权限：
```bash
chmod +x scripts/*.sh
```

### Windows 用户

直接运行 `.bat` 文件即可，无需额外配置。

---

### 4. check-branch-protection - 分支保护检查

**功能**: 
- 检测当前是否在保护分支（trial/master）
- 防止在只读分支上直接修改代码
- 强制执行单向合并规范

**分支规范**:
```
✅ dev 分支    - 唯一可以修改代码的分支
⛔ trial 分支  - 只能通过 deploy-trial 脚本合并 dev
⛔ master 分支 - 只能通过 deploy-prod 脚本合并 trial

合并方向: dev → trial → master (单向，不可逆)
```

**Linux/macOS**:
```bash
./scripts/check-branch-protection.sh
```

**Windows**:
```cmd
scripts\check-branch-protection.bat
```

**集成到 Git Hooks**（推荐）:
```bash
# 创建 .git/hooks/pre-commit
#!/bin/bash
./scripts/check-branch-protection.sh || exit 1
chmod +x .git/hooks/pre-commit

# 这样在 trial 或 master 分支尝试提交时会自动阻止
```

---

## 🎯 典型开发流程

### 日常开发流程

```bash
# 1. 在 dev 分支开发
git checkout dev
# ... 编码 ...
git add .
git commit -m "feat: add new feature"

# 2. 推送到双远程
./scripts/push-all.sh dev

# 3. 部署到测试环境
./scripts/deploy-trial.sh

# 4. 测试通过后，部署到生产环境
./scripts/deploy-prod.sh
```

### 快速修复流程（Hotfix）

```bash
# 1. 从 master 创建 hotfix 分支
git checkout master
git checkout -b hotfix/urgent-fix

# 2. 修复问题并提交
git add .
git commit -m "fix: urgent bug fix"

# 3. 推送 hotfix 分支
./scripts/push-all.sh hotfix/urgent-fix

# 4. 合并到 master（手动）
git checkout master
git merge hotfix/urgent-fix

# 5. 推送并触发生产部署
./scripts/push-all.sh master

# 6. 同步到 trial 和 dev（手动）
git checkout trial
git merge master
./scripts/push-all.sh trial

git checkout dev
git merge master
./scripts/push-all.sh dev
```

---

## 🔒 安全提示

1. **生产部署确认**: `deploy-prod` 脚本包含确认提示，必须输入 `yes` 才会执行
2. **测试先行**: 始终先部署到 trial 环境测试，通过后再部署生产
3. **代码审查**: 在合并到 master 之前，确保代码已经过充分测试
4. **备份**: 所有代码同时推送到 Gitee 和 GitHub，确保双重备份

---

## 🛠️ 宝塔 Webhook 配置

确保宝塔已正确配置 Webhook：

### Trial 环境
- **仓库**: Gitee
- **分支**: `trial`
- **触发事件**: Push
- **脚本**: 
  ```bash
  git pull origin trial
  npm install
  npm run build:weapp
  # 重启服务（根据实际情况）
  ```

### Production 环境
- **仓库**: Gitee
- **分支**: `master`
- **触发事件**: Push
- **脚本**: 
  ```bash
  git pull origin master
  npm install
  npm run build:weapp
  # 重启服务（根据实际情况）
  ```

---

## ❓ 常见问题

### Q: 脚本提示权限错误？
A: Linux/macOS 用户运行 `chmod +x scripts/*.sh`

### Q: 推送失败？
A: 检查 Git 远程仓库配置 `git remote -v`

### Q: Webhook 没有触发？
A: 
1. 检查宝塔 Webhook 配置
2. 检查 Secret Token 是否正确
3. 查看宝塔日志

### Q: 想撤销部署？
A: 
```bash
# 回滚到上一个版本
git checkout master
git reset --hard HEAD~1
git push -f gitee master
git push -f origin master
```

---

## 📝 注意事项

1. 所有脚本都会自动切回 `dev` 分支，无需手动切换
2. 脚本会自动处理未提交的更改（deploy-trial.sh）
3. 推送失败会立即停止，不会继续后续操作
4. 生产部署前会检查 trial 分支的最新状态

---

## 🔗 相关文档

- Git 提交规范: `docs/18_git-commit-guidelines.md`
- 测试指南: `docs/15_测试执行指南.md`
- 前端规范: `docs/10_MINIPROGRAM_SPEC_v2.0.md`
