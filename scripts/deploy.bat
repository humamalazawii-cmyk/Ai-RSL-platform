@echo off
REM ====================================================
REM RSL-AI One-Click Deploy Script (Windows)
REM Usage: scripts\deploy.bat
REM ====================================================

setlocal enabledelayedexpansion
chcp 65001 > nul

echo.
echo ╔════════════════════════════════════════╗
echo ║  RSL-AI Auto Deploy to Google Cloud    ║
echo ╚════════════════════════════════════════╝
echo.

REM Check git
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git is not installed!
    pause
    exit /b 1
)

REM Check for changes
git status --porcelain > temp_status.txt
for %%I in (temp_status.txt) do set SIZE=%%~zI
del temp_status.txt

if %SIZE% EQU 0 (
    echo [INFO] No changes to deploy.
    echo.
    choice /C YN /M "Deploy anyway (force rebuild)?"
    if errorlevel 2 exit /b 0
)

REM Get commit message
set /p MESSAGE="Enter commit message (or press Enter for 'Update'): "
if "%MESSAGE%"=="" set MESSAGE=Update

echo.
echo [1/3] Adding changes...
git add .

echo [2/3] Committing...
git commit -m "%MESSAGE%"

echo [3/3] Pushing to GitHub (auto-deploys to Google Cloud)...
git push

if errorlevel 1 (
    echo.
    echo [ERROR] Push failed! Check your GitHub credentials.
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════╗
echo ║  ✓ Deployment triggered!               ║
echo ║                                        ║
echo ║  Your code is now building.            ║
echo ║  Check progress at:                    ║
echo ║  https://console.cloud.google.com/     ║
echo ║  cloud-build/builds                    ║
echo ║                                        ║
echo ║  Live site will update in ~5 minutes   ║
echo ╚════════════════════════════════════════╝
echo.
pause
