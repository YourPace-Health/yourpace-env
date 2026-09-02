@echo off
chcp 65001 >nul
echo ====================================================
echo        YourPace - SonarQube Scanner (Docker)
echo ====================================================
echo.
echo Connecting to SonarQube container at http://localhost:9005...
echo.

if "%SONAR_TOKEN%"=="" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        if "%%a"=="SONAR_TOKEN" set SONAR_TOKEN=%%b
    )
)

if "%SONAR_TOKEN%"=="" (
    echo [ERROR] SONAR_TOKEN is not set. Please define SONAR_TOKEN in .env or environment variable.
    pause
    exit /b 1
)

docker run --rm ^
  -v "%cd%:/usr/src" ^
  -e SONAR_HOST_URL="http://host.docker.internal:9005" ^
  -e SONAR_TOKEN="%SONAR_TOKEN%" ^
  sonarsource/sonar-scanner-cli

echo.
echo ====================================================
echo Scan finished! Open Dashboard at: http://localhost:9005
echo ====================================================
pause
