#!/bin/bash

# ⚠️ 严格的分支保护脚本
# 确保只能在 dev 分支修改代码，trial 和 master 分支只能接收合并

set -e

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)

# 定义保护分支
PROTECTED_BRANCHES=("trial" "master")

# 检查是否在保护分支上
for branch in "${PROTECTED_BRANCHES[@]}"; do
    if [ "$CURRENT_BRANCH" = "$branch" ]; then
        echo "❌ 错误: 禁止在 $CURRENT_BRANCH 分支直接修改代码！"
        echo ""
        echo "📋 分支管理规范："
        echo "  ✅ dev 分支    - 唯一可以修改代码的分支"
        echo "  ⛔ trial 分支  - 只能通过合并 dev 接收更新"
        echo "  ⛔ master 分支 - 只能通过合并 trial 接收更新"
        echo ""
        echo "🔄 正确的工作流："
        echo "  1. git checkout dev"
        echo "  2. 修改代码并提交"
        echo "  3. 使用 scripts/deploy-trial.sh 部署到测试环境"
        echo "  4. 使用 scripts/deploy-prod.sh 部署到生产环境"
        echo ""
        exit 1
    fi
done

echo "✅ 当前在 $CURRENT_BRANCH 分支，可以继续操作"
exit 0
