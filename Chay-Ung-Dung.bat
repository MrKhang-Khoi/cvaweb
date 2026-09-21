@echo off
chcp 65001 >nul
title KHỞI CHẠY TIỆN TÍCH GIÁO VIÊN (PWA SERVER)
cd /d "%~dp0"

echo =====================================================================
echo   KHÔNG GIAN TIỆN ÍCH GIÁO VIÊN - CỔNG WEBSITE SƯ PHẠM THÔNG MINH
echo =====================================================================
echo.
echo [1/3] Đang kiểm tra môi trường máy chủ cục bộ...

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [2/3] Phát hiện Python. Đang khởi động máy chủ Web tại http://localhost:8080 ...
    echo [3/3] Đang tự động mở trình duyệt...
    start "" "http://localhost:8080/index.html"
    python -m http.server 8080
    goto end
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    echo [2/3] Phát hiện Python Launcher. Đang khởi động máy chủ Web tại http://localhost:8080 ...
    echo [3/3] Đang tự động mở trình duyệt...
    start "" "http://localhost:8080/index.html"
    py -m http.server 8080
    goto end
)

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [2/3] Phát hiện Node.js. Đang khởi động máy chủ Web qua npx serve ...
    echo [3/3] Đang tự động mở trình duyệt...
    start "" "http://localhost:8080/index.html"
    npx -y serve -l 8080
    goto end
)

echo [2/3] Không phát hiện máy chủ cục bộ. Đang mở trực tiếp tệp index.html...
echo [3/3] Mọi tính năng 18 website, Sổ tay mật khẩu và Thời khóa biểu đều hoạt động bình thường!
start "" "%~dp0index.html"

:end
pause
