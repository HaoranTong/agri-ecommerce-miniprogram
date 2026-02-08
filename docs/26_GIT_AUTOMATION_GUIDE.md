# 🚀 Git 自动化部署快速入门

## 📋 目录结构

```
agri-ecommerce-miniprogram/
├── scripts/
│   ├── README.md              # 详细文档
│   ├── push-all.sh           # Linux/macOS 双推送脚本
│   ├── push-all.bat          # Windows 双推送脚本
│   ├── deploy-trial.sh       # Linux/macOS 测试环境部署
│   ├── deploy-trial.bat      # Windows 测试环境部署
│   ├── deploy-prod.sh        # Linux/macOS 生产环境部署
│   └── deploy-prod.bat       # Windows 生产环境部署
└── docs/
    └── README.md             # 项目主文档（已更新）
```

---

## 🎯 功能说明

### ✅ 特性：可在任何目录下执行

**脚本会自动定位到项目根目录**，无论您当前在哪个目录，都可以直接调用脚本！

```bash
# 在项目根目录
e:\projects\agri-ecommerce-miniprogram> scripts\push-all.bat

# 在任意子目录
e:\projects\agri-ecommerce-miniprogram\src\pages> ..\..\scripts\push-all.bat

# 使用绝对路径（任意位置）
c:\> e:\projects\agri-ecommerce-miniprogram\scripts\push-all.bat
```

---

### 1️⃣ push-all - 双远程推送

**问题**: 每次都要执行两次 `git push` 很麻烦
```bash
git push gitee dev
git push origin dev
```

**解决**: 一条命令搞定
```bash
# Windows
scripts\push-all.bat dev

# Linux/macOS
./scripts/push-all.sh dev
```

---

### 2️⃣ deploy-trial - 测试环境部署

**问题**: 手动合并分支容易出错
```bash
git checkout trial
git merge dev
git push gitee trial
git push origin trial
git checkout dev
```

**解决**: 全自动化
```bash
# Windows
scripts\deploy-trial.bat

# Linux/macOS
./scripts/deploy-trial.sh
```

**效果**: 
- ✅ 自动提交未提交的更改
- ✅ 自动合并 dev → trial
- ✅ 自动推送到两个远程
- ✅ 自动触发宝塔 Webhook 部署
- ✅ 自动切回 dev 分支

---

### 3️⃣ deploy-prod - 生产环境部署

**问题**: 生产部署需要多步操作且容易误操作

**解决**: 带确认的自动化部署
```bash
# Windows
scripts\deploy-prod.bat

# Linux/macOS
./scripts/deploy-prod.sh
```

**效果**:
- ⚠️ 要求手动确认（输入 yes）
- ✅ 自动更新 trial 和 master 分支
- ✅ 自动合并 trial → master
- ✅ 自动推送到两个远程
- ✅ 自动触发宝塔 Webhook 部署到生产
- ✅ 自动切回 dev 分支

---

## 🔧 首次配置

### Windows 用户
无需额外配置，直接使用 `.bat` 文件即可！

### Linux/macOS 用户
给脚本添加执行权限：
```bash
chmod +x scripts/*.sh
```

---

## 📖 使用示例

### 场景 1: 日常功能开发

```bash
# 1. 在 dev 分支开发新功能
git checkout dev
# ... 编码和测试 ...

# 2. 提交代码
git add .
git commit -m "feat: 添加购物车数量限制"

# 3. 推送到 Gitee 和 GitHub（Windows）
scripts\push-all.bat dev

# 或者 Linux/macOS
./scripts/push-all.sh dev

# 4. 部署到测试环境验证（Windows）
scripts\deploy-trial.bat

# 或者 Linux/macOS
./scripts/deploy-trial.sh

# 5. 测试通过后部署到生产（Windows）
scripts\deploy-prod.bat
# 会提示: 确认要部署到生产环境吗？(yes/no): yes

# 或者 Linux/macOS
./scripts/deploy-prod.sh
```

---

### 场景 2: 紧急修复（Hotfix）

```bash
# 1. 从 master 创建 hotfix 分支
git checkout master
git checkout -b hotfix/cart-calculation-bug

# 2. 修复问题
# ... 修改代码 ...
git add .
git commit -m "fix: 修复购物车计算错误"

# 3. 推送 hotfix 分支（Windows）
scripts\push-all.bat hotfix/cart-calculation-bug

# 4. 手动合并到 master
git checkout master
git merge hotfix/cart-calculation-bug

# 5. 推送并触发生产部署（Windows）
scripts\push-all.bat master
# 宝塔会自动拉取并部署

# 6. 同步到其他分支
git checkout trial
git merge master
scripts\push-all.bat trial

git checkout dev
git merge master
scripts\push-all.bat dev
```

---

## 🌐 宝塔 Webhook 配置

### Trial 环境 Webhook

**URL**: `https://your-trial-site.com/webhook/deploy`

**触发条件**:
- 仓库: Gitee
- 分支: `trial`
- 事件: Push

**执行脚本**:
```bash
#!/bin/bash
cd /www/wwwroot/trial-site
git pull origin trial
npm install
npm run build:weapp
# pm2 restart trial-app  # 如果需要重启服务
```

---

### Production 环境 Webhook

**URL**: `https://your-prod-site.com/webhook/deploy`

**触发条件**:
- 仓库: Gitee
- 分支: `master`
- 事件: Push

**执行脚本**:
```bash
#!/bin/bash
cd /www/wwwroot/prod-site
git pull origin master
npm install
npm run build:weapp
# pm2 restart prod-app  # 如果需要重启服务
```

---

## ✅ 优势对比

| 操作 | 传统方式 | 使用脚本 |
|-----|---------|---------|
| 推送到双远程 | 2 条命令 | 1 条命令 |
| 部署到测试环境 | 5+ 条命令 | 1 条命令 |
| 部署到生产环境 | 8+ 条命令 | 1 条命令 |
| 忘记切换分支 | ❌ 常见错误 | ✅ 自动处理 |
| 误操作生产环境 | ❌ 危险 | ✅ 需要确认 |
| Webhook 触发 | ✅ 正常 | ✅ 正常 |
| 代码同步 | ⚠️ 需手动 | ✅ 自动 |

---

## ❓ 常见问题

### Q1: 为什么云端 PR 合并不适合我？
**A**: 因为您使用宝塔 Webhook 监听 `push` 事件。本地合并后推送可以：
- ✅ 立即触发 Webhook 部署
- ✅ 保持线性提交历史
- ✅ 操作更简单高效
- ✅ 适合单人开发场景

### Q2: 脚本如何保证 Webhook 触发？
**A**: 脚本执行 `git push gitee <branch>`，Gitee 检测到新提交后发送 Push 事件到宝塔，宝塔执行配置的部署脚本。

### Q3: 如果推送失败怎么办？
**A**: 脚本会立即停止并显示错误信息，不会继续后续操作，保证数据安全。

### Q4: 可以自定义脚本吗？
**A**: 当然可以！所有脚本都是开源的，可以根据需求修改。

### Q5: .codebuddy 目录要提交吗？
**A**: 不需要！已经添加到 `.gitignore` 中，这是 IDE/AI 助手的配置目录。

---

## 🔗 相关文档

- **详细脚本说明**: `scripts/README.md`
- **Git 提交规范**: `docs/18_git-commit-guidelines.md`
- **测试指南**: `docs/15_测试执行指南.md`
- **项目主文档**: `docs/README.md`

---

## 📝 注意事项

1. ✅ 所有脚本都会自动切回 `dev` 分支
2. ✅ 生产部署需要手动输入 `yes` 确认
3. ✅ 脚本会检查错误并立即停止
4. ✅ Webhook 配置正确才能自动部署
5. ⚠️ 确保 Git 配置了 Gitee 和 GitHub 远程仓库

---

## 🎉 开始使用

现在就试试吧！

```bash
# Windows
scripts\push-all.bat

# Linux/macOS
./scripts/push-all.sh
```

享受自动化带来的便利！🚀
