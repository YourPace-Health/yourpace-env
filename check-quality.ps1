# YourPace - Code Quality Check Script (PowerShell)
$ErrorActionPreference = "Continue"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       YourPace - Code Quality Check Tool           " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Backend Quality Check
Write-Host "[1/3] Checking Backend (Go Vet & Static Analysis)..." -ForegroundColor Yellow
Push-Location "$rootDir\backend"
go vet ./...
if ($LASTEXITCODE -eq 0) {
    Write-Host "  -> Backend Go Vet: PASSED [OK]" -ForegroundColor Green
} else {
    Write-Host "  -> Backend Go Vet: FAILED [X]" -ForegroundColor Red
}
Pop-Location
Write-Host ""

# 2. Frontend Quality Check
Write-Host "[2/3] Checking Frontend (ESLint & Production Build)..." -ForegroundColor Yellow
Push-Location "$rootDir\frontend"
npm.cmd run lint
if ($LASTEXITCODE -eq 0) {
    Write-Host "  -> Frontend ESLint: PASSED [OK]" -ForegroundColor Green
} else {
    Write-Host "  -> Frontend ESLint: FAILED [X]" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking Frontend Build..." -ForegroundColor Yellow
npm.cmd run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "  -> Frontend Build: PASSED [OK]" -ForegroundColor Green
} else {
    Write-Host "  -> Frontend Build: FAILED [X]" -ForegroundColor Red
}
Pop-Location
Write-Host ""

# 3. Done
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Quality check completed!" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
