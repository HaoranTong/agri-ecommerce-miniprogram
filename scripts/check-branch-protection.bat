@echo off
REM ⚠️ 严格的分支保护脚本
REM 确保只能在 dev 分支修改代码，trial 和 master 分支只能接收合并

setlocal enabledelayedexpansion

REM 获取当前分支
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i

if "!CURRENT_BRANCH!"=="" (
    echo ❌ 错误: 无法获取当前分支
    exit /b 1
)

REM 检查是否在保护分支上
if "!CURRENT_BRANCH!"=="trial" goto :protected_branch
if "!CURRENT_BRANCH!"=="master" goto :protected_branch

echo ✅ 当前在 !CURRENT_BRANCH! 分支，可以继续操作
exit /b 0

:protected_branch
echo ❌ 错误: 禁止在 !CURRENT_BRANCH! 分支直接修改代码！
echo.
echo 📋 分支管理规范：
echo   ✅ dev 分支    - 唯一可以修改代码的分支
echo   ⛔ trial 分支  - 只能通过合并 dev 接收更新
echo   ⛔ master 分支 - 只能通过合并 trial 接收更新
echo.
echo 🔄 正确的工作流：
echo   1. git checkout dev
echo   2. 修改代码并提交
echo   3. 使用 scripts\deploy-trial.bat 部署到测试环境
echo   4. 使用 scripts\deploy-prod.bat 部署到生产环境
echo.
exit /b 1
