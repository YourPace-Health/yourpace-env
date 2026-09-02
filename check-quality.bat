@echo off
chcp 65001 >nul
echo ====================================================
echo        YourPace - Code Quality Check Tool
echo ====================================================
echo.

:: 1. Backend Quality Check
echo [1/3] Checking Backend (Go Static Analysis & Vet)...
cd /d "%~dp0backend"
go vet ./...
if %ERRORLEVEL% equ 0 (
    echo   -> Backend Go Vet: PASSED [OK]
) else (
    echo   -> Backend Go Vet: FAILED [X]
)
echo.

:: 2. Frontend Quality Check
echo [2/3] Checking Frontend (ESLint & Production Build)...
cd /d "%~dp0frontend"
call npm.cmd run lint
if %ERRORLEVEL% equ 0 (
    echo   -> Frontend ESLint: PASSED [OK]
) else (
    echo   -> Frontend ESLint: FAILED [X]
)

echo.
echo Checking Frontend Build...
call npm.cmd run build
if %ERRORLEVEL% equ 0 (
    echo   -> Frontend Build: PASSED [OK]
) else (
    echo   -> Frontend Build: FAILED [X]
)
echo.

:: 3. Summary
echo ====================================================
echo Quality check completed!
echo ====================================================
pause
