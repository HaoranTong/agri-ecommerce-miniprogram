#!/bin/bash

# 将 trial 分支合并到 master 并推送（触发生产环境部署）
# 用法: ./scripts/deploy-prod.sh

set -e  # 遇到错误立即退出

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 检查是否在 Git 仓库中
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    echo "当前目录: $(pwd)"
    exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)

echo "⚠️  ========================================="
echo "⚠️  警告: 即将部署到生产环境！"
echo "⚠️  ========================================="
echo ""
echo "当前分支: $CURRENT_BRANCH"
echo ""
read -p "确认要部署到生产环境吗？(yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ 取消部署"
    exit 0
fi

echo ""
echo "🚀 开始部署到生产环境"
echo "-----------------------------------"

# 确保 trial 分支是最新的
echo "🔄 更新 trial 分支..."
git checkout trial
git pull gitee trial
git pull origin trial
echo "✅ trial 分支已更新"

# 切换到 master 分支
echo ""
echo "🔄 切换到 master 分支..."
git checkout master

# 更新 master 分支
echo "🔄 更新 master 分支..."
git pull gitee master
git pull origin master
echo "✅ master 分支已更新"

# 合并 trial 到 master
echo ""
echo "🔀 合并 trial 到 master..."
git merge trial --no-edit

# 推送 master 分支（触发 Webhook 部署）
echo ""
echo "📤 推送 master 分支（触发生产环境部署）..."
git push gitee master
git push origin master

echo ""
echo "-----------------------------------"
echo "✅ 生产环境部署已触发！"
echo "🌐 宝塔 Webhook 正在自动部署到生产环境..."
echo ""

# 切回 dev 分支
echo "🔄 切换回 dev 分支..."
git checkout dev

echo "✅ 完成！当前分支: $(git branch --show-current)"
echo ""
echo "⚠️  请检查生产环境部署状态！"
