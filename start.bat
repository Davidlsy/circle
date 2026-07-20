@echo off
echo ============================================
echo   Circle 粉丝社群 - 前端启动脚本
echo ============================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo [信息] 首次运行，正在安装依赖...
    call npm install
    echo.
)

echo [信息] 启动开发服务器...
echo [信息] 前端地址: http://localhost:5173
echo [信息] 后端地址: http://localhost:8000/docs
echo [信息] 按 Ctrl+C 停止
echo.

call npm run dev