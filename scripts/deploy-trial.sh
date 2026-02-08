#!/bin/bash

# 将 dev 分支合并到 trial 并推送（触发 Trial 环境部署）
# 用法: ./scripts/deploy-trial.sh [commit-message]

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

COMMIT_MSG=${1:-"chore: deploy to trial"}
CURRENT_BRANCH=$(git branch --show-current)

echo "🚀 开始部署到 Trial 环境"
echo "-----------------------------------"
echo "当前分支: $CURRENT_BRANCH"
echo "提交信息: $COMMIT_MSG"
echo ""

# 确保在 dev 分支
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "⚠️  当前不在 dev 分支，切换到 dev..."
    git checkout dev
fi

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  检测到未提交的更改，正在提交..."
    git add .
    git commit -m "$COMMIT_MSG"
    echo "✅ 更改已提交"
else
    echo "ℹ️  没有未提交的更改"
fi

# 推送 dev 分支
echo ""
echo "📤 推送 dev 分支..."
git push gitee dev
git push origin dev
echo "✅ dev 分支推送完成"

# 切换到 trial 分支
echo ""
echo "🔄 切换到 trial 分支..."
git checkout trial

# 合并 dev 到 trial
echo "🔀 合并 dev 到 trial..."
git merge dev --no-edit

# 推送 trial 分支（触发 Webhook 部署）
echo ""
echo "📤 推送 trial 分支（触发自动部署）..."
git push gitee trial
git push origin trial

echo ""
echo "-----------------------------------"
echo "✅ Trial 环境部署已触发！"
echo "🌐 宝塔 Webhook 正在自动部署..."
echo ""

# 切回 dev 分支
echo "🔄 切换回 dev 分支..."
git checkout dev

echo "✅ 完成！当前分支: $(git branch --show-current)"
