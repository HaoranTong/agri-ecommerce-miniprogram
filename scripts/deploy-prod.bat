@echo off
REM 将 trial 分支合并到 master 并推送（触发生产环境部署） - Windows 版本
REM 用法: scripts\deploy-prod.bat

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

for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i

echo ⚠️  =========================================
echo ⚠️  警告: 即将部署到生产环境！
echo ⚠️  =========================================
echo.
echo 当前分支: !CURRENT_BRANCH!
echo.

set /p CONFIRM="确认要部署到生产环境吗？(yes/no): "

if not "!CONFIRM!"=="yes" (
    echo ❌ 取消部署
    exit /b 0
)

echo.
echo 🚀 开始部署到生产环境
echo -----------------------------------

REM 确保 trial 分支是最新的
echo 🔄 更新 trial 分支...
git checkout trial
git pull gitee trial
git pull origin trial
echo ✅ trial 分支已更新

REM 切换到 master 分支
echo.
echo 🔄 切换到 master 分支...
git checkout master

REM 更新 master 分支
echo 🔄 更新 master 分支...
git pull gitee master
git pull origin master
echo ✅ master 分支已更新

REM 合并 trial 到 master
echo.
echo 🔀 合并 trial 到 master...
git merge trial --no-edit

REM 推送 master 分支（触发 Webhook 部署）
echo.
echo 📤 推送 master 分支（触发生产环境部署）...
git push gitee master
git push origin master

echo.
echo -----------------------------------
echo ✅ 生产环境部署已触发！
echo 🌐 宝塔 Webhook 正在自动部署到生产环境...
echo.

REM 切回 dev 分支
echo 🔄 切换回 dev 分支...
git checkout dev

for /f "tokens=*" %%i in ('git branch --show-current') do set FINAL_BRANCH=%%i
echo ✅ 完成！当前分支: !FINAL_BRANCH!
echo.
echo ⚠️  请检查生产环境部署状态！
