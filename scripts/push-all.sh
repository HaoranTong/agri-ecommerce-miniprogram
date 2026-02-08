#!/bin/bash

# 推送指定分支到 Gitee 和 GitHub
# 用法: ./scripts/push-all.sh <branch-name>
# 示例: ./scripts/push-all.sh dev

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

# 获取分支名称（如果未提供，使用当前分支）
BRANCH=${1:-$(git branch --show-current)}

if [ -z "$BRANCH" ]; then
    echo "❌ 错误: 无法确定分支名称"
    echo "用法: ./scripts/push-all.sh <branch-name>"
    exit 1
fi

echo "🚀 开始推送分支: $BRANCH"
echo "-----------------------------------"

# 推送到 Gitee
echo "📤 推送到 Gitee..."
if git push gitee "$BRANCH"; then
    echo "✅ Gitee 推送成功"
else
    echo "❌ Gitee 推送失败"
    exit 1
fi

echo ""

# 推送到 GitHub
echo "📤 推送到 GitHub..."
if git push origin "$BRANCH"; then
    echo "✅ GitHub 推送成功"
else
    echo "❌ GitHub 推送失败"
    exit 1
fi

echo ""
echo "-----------------------------------"
echo "✅ 成功推送 $BRANCH 到 Gitee 和 GitHub"
