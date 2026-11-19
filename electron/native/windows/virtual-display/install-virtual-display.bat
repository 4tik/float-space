@echo off
title Float-Space - Virtual Extended Display Setup
echo ========================================================
echo   Float-Space - Virtual Extended Display Setup
echo ========================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-virtual-display.ps1" -Action status
echo.
echo Options:
echo   1. Enable Virtual Display (if driver installed)
echo   2. Disable Virtual Display
echo   3. Open Windows Display Settings
echo   4. Exit
echo.
set /p choice="Choose an option (1-4): "
if "%choice%"=="1" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-virtual-display.ps1" -Action enable
if "%choice%"=="2" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-virtual-display.ps1" -Action disable
if "%choice%"=="3" start ms-settings:display
pause
