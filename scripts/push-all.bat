@echo off
REM 推送指定分支到 Gitee 和 GitHub (Windows 版本)
REM 用法: scripts\push-all.bat <branch-name>
REM 示例: scripts\push-all.bat dev

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

REM 获取分支名称（如果未提供，使用当前分支）
if "%~1"=="" (
    for /f "tokens=*" %%i in ('git branch --show-current') do set BRANCH=%%i
) else (
    set BRANCH=%~1
)

if "!BRANCH!"=="" (
    echo ❌ 错误: 无法确定分支名称
    echo 用法: scripts\push-all.bat ^<branch-name^>
    exit /b 1
)

echo 🚀 开始推送分支: !BRANCH!
echo -----------------------------------

REM 推送到 Gitee
echo 📤 推送到 Gitee...
git push gitee !BRANCH!
if errorlevel 1 (
    echo ❌ Gitee 推送失败
    exit /b 1
)
echo ✅ Gitee 推送成功
echo.

REM 推送到 GitHub
echo 📤 推送到 GitHub...
git push origin !BRANCH!
if errorlevel 1 (
    echo ❌ GitHub 推送失败
    exit /b 1
)
echo ✅ GitHub 推送成功
echo.

echo -----------------------------------
echo ✅ 成功推送 !BRANCH! 到 Gitee 和 GitHub
