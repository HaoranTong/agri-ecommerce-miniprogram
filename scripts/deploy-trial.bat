@echo off
REM 将 dev 分支合并到 trial 并推送（触发 Trial 环境部署） - Windows 版本
REM 用法: scripts\deploy-trial.bat [commit-message]

setlocal enabledelayedexpansion

REM 获取脚本所在目录的父目录（项目根目录）
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

REM 切换到项目根目录
cd /d "%PROJECT_ROOT%"

REM 检查是否在 Git 仓库中
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 当前目录不是 Git 仓库
    echo 当前目录: %CD%
    exit /b 1
)

set "COMMIT_MSG=%~1"
if "!COMMIT_MSG!"=="" set "COMMIT_MSG=chore: deploy to trial"

for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i

echo 🚀 开始部署到 Trial 环境
echo -----------------------------------
echo 当前分支: !CURRENT_BRANCH!
echo 提交信息: !COMMIT_MSG!
echo.

REM 确保在 dev 分支
if not "!CURRENT_BRANCH!"=="dev" (
    echo ⚠️  当前不在 dev 分支，切换到 dev...
    git checkout dev
)

REM 检查是否有未提交的更改
git diff-index --quiet HEAD --
if errorlevel 1 (
    echo ⚠️  检测到未提交的更改，正在提交...
    git add .
    git commit -m "!COMMIT_MSG!"
    echo ✅ 更改已提交
) else (
    echo ℹ️  没有未提交的更改
)

REM 推送 dev 分支
echo.
echo 📤 推送 dev 分支...
git push gitee dev
git push origin dev
echo ✅ dev 分支推送完成

REM 切换到 trial 分支
echo.
echo 🔄 切换到 trial 分支...
git checkout trial

REM 合并 dev 到 trial
echo 🔀 合并 dev 到 trial...
git merge dev --no-edit

REM 推送 trial 分支（触发 Webhook 部署）
echo.
echo 📤 推送 trial 分支（触发自动部署）...
git push gitee trial
git push origin trial

echo.
echo -----------------------------------
echo ✅ Trial 环境部署已触发！
echo 🌐 宝塔 Webhook 正在自动部署...
echo.

REM 切回 dev 分支
echo 🔄 切换回 dev 分支...
git checkout dev

for /f "tokens=*" %%i in ('git branch --show-current') do set FINAL_BRANCH=%%i
echo ✅ 完成！当前分支: !FINAL_BRANCH!
