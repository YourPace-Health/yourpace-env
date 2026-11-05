# YourPace - Postgres backup/restore for the docker-compose stack.
#   Backup : .\scripts\backup-postgres.ps1
#   Restore: .\scripts\backup-postgres.ps1 -Restore backups\youpace-20260101-120000.sql
param(
    [string]$Restore,
    [string]$Container = "youpace_db",
    [string]$User = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "root" }),
    [string]$Database = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "youPace_DB" }),
    [int]$Keep = 14
)

$ErrorActionPreference = "Stop"
$backupDir = Join-Path (Split-Path -Parent $PSScriptRoot) "backups"

if ($Restore) {
    if (-not (Test-Path $Restore)) { throw "Backup file not found: $Restore" }
    Write-Host "Restoring $Restore into $Database (existing objects are dropped)..." -ForegroundColor Yellow
    Get-Content $Restore -Raw | docker exec -i $Container psql -U $User -d $Database -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "Restore failed" }
    Write-Host "Restore complete." -ForegroundColor Green
    return
}

New-Item -ItemType Directory -Force $backupDir | Out-Null
$file = Join-Path $backupDir ("youpace-{0}.sql" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

# --clean --if-exists makes the dump restorable over an existing database
docker exec $Container pg_dump -U $User -d $Database --clean --if-exists --no-owner | Out-File -Encoding utf8 $file
if ($LASTEXITCODE -ne 0) { Remove-Item $file -ErrorAction SilentlyContinue; throw "pg_dump failed" }
Write-Host "Backup written to $file" -ForegroundColor Green

# Keep only the newest $Keep backups
Get-ChildItem $backupDir -Filter "youpace-*.sql" | Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep | Remove-Item
