@echo off
title Sach Dien Tu (38 Trang)
cd /d "%~dp0"
echo ====================================================
echo  DANG MO CUON SACH DIEN TU...
echo ====================================================
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Khoi chay may chu cuc bo voi Node.js...
    node server.js
) else (
    echo Mo truc tiep tren trinh duyet...
    start "" "%~dp0index.html"
)
pause
