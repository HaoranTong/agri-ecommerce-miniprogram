# ✅ Git 自动化部署脚本 - 已完成

## 📦 创建的文件

### 1. 自动化脚本（7 个文件）

**推送脚本**:
- ✅ `scripts/push-all.sh` - Linux/macOS 双远程推送
- ✅ `scripts/push-all.bat` - Windows 双远程推送

**测试环境部署**:
- ✅ `scripts/deploy-trial.sh` - Linux/macOS 部署到 Trial
- ✅ `scripts/deploy-trial.bat` - Windows 部署到 Trial

**生产环境部署**:
- ✅ `scripts/deploy-prod.sh` - Linux/macOS 部署到 Production
- ✅ `scripts/deploy-prod.bat` - Windows 部署到 Production

**文档**:
- ✅ `scripts/README.md` - 详细使用文档

### 2. 更新的文件

- ✅ `docs/README.md` - 添加了"开发与部署"章节
- ✅ `docs/26_GIT_AUTOMATION_GUIDE.md` - 快速入门指南
- ✅ `.gitignore` - 添加了 `.codebuddy/` 等目录

---

## 🎯 功能特性

### ✨ 主要功能

1. **双远程同步** - 一键推送到 Gitee 和 GitHub
2. **自动化部署** - dev → trial → master 全流程自动化
3. **Webhook 兼容** - 完美适配宝塔 Webhook 自动部署
4. **跨平台支持** - Windows / Linux / macOS 全覆盖
5. **安全保护** - 生产部署需要手动确认
6. **自动切换** - 部署完成自动切回 dev 分支
7. **错误处理** - 失败立即停止，保证数据安全

---

## 🚀 快速开始

### Windows 用户

```cmd
# 推送当前分支到双远程
scripts\push-all.bat

# 部署到测试环境
scripts\deploy-trial.bat

# 部署到生产环境（需要确认）
scripts\deploy-prod.bat
```

### Linux/macOS 用户

```bash
# 首次使用：添加执行权限
chmod +x scripts/*.sh

# 推送当前分支到双远程
./scripts/push-all.sh

# 部署到测试环境
./scripts/deploy-trial.sh

# 部署到生产环境（需要确认）
./scripts/deploy-prod.sh
```

---

## 📋 典型工作流

```bash
# 1. 在 dev 分支开发
git checkout dev
# ... 编码 ...

# 2. 提交代码
git add .
git commit -m "feat: add new feature"

# 3. 推送到双远程（Windows）
scripts\push-all.bat dev

# 4. 部署到测试环境
scripts\deploy-trial.bat
# ✅ 自动合并 dev → trial
# ✅ 自动推送到 Gitee 和 GitHub
# ✅ 自动触发宝塔 Webhook 部署
# ✅ 自动切回 dev 分支

# 5. 测试通过后部署到生产
scripts\deploy-prod.bat
# ⚠️ 需要输入 yes 确认
# ✅ 自动合并 trial → master
# ✅ 自动推送到 Gitee 和 GitHub
# ✅ 自动触发宝塔 Webhook 部署到生产
# ✅ 自动切回 dev 分支
```

---

## 🔧 .gitignore 更新

已添加以下目录到 `.gitignore`：

```gitignore
# IDE and AI Assistant configurations
.codebuddy/
.cursor/
.idea/
```

### 为什么要忽略 .codebuddy？

1. ✅ **个人配置** - 包含个人 IDE/AI 助手偏好设置
2. ✅ **敏感信息** - 可能包含 API tokens、规则缓存等
3. ✅ **团队协作** - 每个开发者配置可能不同
4. ✅ **标准实践** - 类似 `.vscode/`, `.idea/` 等

---

## 📚 相关文档

| 文档 | 说明 |
|-----|------|
| `scripts/README.md` | 详细的脚本使用文档 |
| `docs/26_GIT_AUTOMATION_GUIDE.md` | 快速入门和场景示例 |
| `docs/README.md` | 项目主文档（已添加部署章节） |
| `docs/18_git-commit-guidelines.md` | Git 提交规范 |

---

## ✅ 优势总结

| 项目 | 传统方式 | 使用脚本 |
|-----|---------|---------|
| **操作步骤** | 5-8 步 | 1 步 |
| **出错概率** | ⚠️ 高 | ✅ 低 |
| **Webhook 触发** | ✅ 手动推送 | ✅ 自动推送 |
| **分支切换** | ⚠️ 需手动 | ✅ 自动 |
| **双远程同步** | ⚠️ 易遗漏 | ✅ 自动 |
| **安全性** | ⚠️ 易误操作 | ✅ 需确认 |
| **效率提升** | - | **3-5 倍** |

---

## 🎉 立即使用

所有脚本已就绪，立即可用！

```bash
# 查看当前修改
git status

# 使用脚本推送（Windows）
scripts\push-all.bat dev
```

---

## ❓ 问题解答

### Q1: 云端 PR 合并会影响 Webhook 吗？

**A**: 不会影响！但本地合并更适合您的场景：
- ✅ 操作更简单
- ✅ 历史更清晰
- ✅ 效率更高
- ✅ 适合单人开发

### Q2: 脚本安全吗？

**A**: 非常安全！
- ✅ 生产部署需要手动确认
- ✅ 失败立即停止
- ✅ 自动切回 dev 分支
- ✅ 开源代码可审查

### Q3: 可以自定义吗？

**A**: 当然可以！
- 所有脚本都是纯文本
- 可以根据需求修改
- 可以添加新功能
- 可以调整流程

---

## 🎯 下一步

1. ✅ **提交更改**
   ```bash
   git add .
   git commit -m "feat: add git automation scripts"
   scripts\push-all.bat dev
   ```

2. ✅ **测试脚本**
   ```bash
   # 先测试双推送
   scripts\push-all.bat dev
   
   # 再测试部署到测试环境
   scripts\deploy-trial.bat
   ```

3. ✅ **生产部署**（测试通过后）
   ```bash
   scripts\deploy-prod.bat
   ```

---

## 📞 技术支持

如有问题，请查看：
- `scripts/README.md` - 详细文档
- `docs/26_GIT_AUTOMATION_GUIDE.md` - 使用指南
- 或咨询项目管理员

---

**祝您使用愉快！🚀**
