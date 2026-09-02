# YourPace - SonarQube Scanner (PowerShell)
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       YourPace - SonarQube Scanner (Docker)        " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connecting to SonarQube container at http://localhost:9005..." -ForegroundColor Yellow

$projectDir = (Get-Location).Path
$sonarToken = $env:SONAR_TOKEN

if (-not $sonarToken -and (Test-Path "$projectDir\.env")) {
    $envContent = Get-Content "$projectDir\.env"
    foreach ($line in $envContent) {
        if ($line -match "^SONAR_TOKEN=(.+)$") {
            $sonarToken = $matches[1].Trim()
            break
        }
    }
}

if (-not $sonarToken) {
    Write-Host "[ERROR] SONAR_TOKEN not found in environment or .env file." -ForegroundColor Red
    exit 1
}

docker run --rm `
  -v "${projectDir}:/usr/src" `
  -e SONAR_HOST_URL="http://host.docker.internal:9005" `
  -e SONAR_TOKEN="${sonarToken}" `
  sonarsource/sonar-scanner-cli

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Scan finished! Open Dashboard at: http://localhost:9005" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
