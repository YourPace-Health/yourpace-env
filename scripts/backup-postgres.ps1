# YourPace - Postgres backup/restore.
#
# Local docker-compose database (default):
#   .\scripts\backup-postgres.ps1
#   .\scripts\backup-postgres.ps1 -Restore backups\youpace-20260101-120000.sql
#
# Any remote database (Render, Neon, Supabase ...): pass -Url or set $env:DATABASE_URL.
# Needs only Docker; pg_dump/psql run in a postgres:15 container.
#   .\scripts\backup-postgres.ps1 -Url "postgres://user:pass@host:5432/db"
#   .\scripts\backup-postgres.ps1 -Url "postgres://..." -Restore backups\file.sql
#
# Moving between hosts: back up the old one, then restore with the NEW url.
param(
    [string]$Restore,
    [string]$Url = $env:DATABASE_URL,
    [string]$Container = "youpace_db",
    [string]$User = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "root" }),
    [string]$Database = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "youPace_DB" }),
    [string]$Image = "postgres:15-alpine",
    [int]$Keep = 14
)

$ErrorActionPreference = "Stop"
$backupDir = Join-Path (Split-Path -Parent $PSScriptRoot) "backups"
$target = if ($Url) { "remote database" } else { "local container $Container" }

if ($Restore) {
    if (-not (Test-Path $Restore)) { throw "Backup file not found: $Restore" }
    Write-Host "Restoring $Restore into the $target (existing objects are dropped)..." -ForegroundColor Yellow
    if ($Url) {
        Get-Content $Restore -Raw | docker run --rm -i $Image psql $Url -v ON_ERROR_STOP=1
    } else {
        Get-Content $Restore -Raw | docker exec -i $Container psql -U $User -d $Database -v ON_ERROR_STOP=1
    }
    if ($LASTEXITCODE -ne 0) { throw "Restore failed" }
    Write-Host "Restore complete." -ForegroundColor Green
    return
}

New-Item -ItemType Directory -Force $backupDir | Out-Null
$file = Join-Path $backupDir ("youpace-{0}.sql" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

# --clean --if-exists makes the dump restorable over an existing database
if ($Url) {
    docker run --rm $Image pg_dump $Url --clean --if-exists --no-owner --no-privileges | Out-File -Encoding utf8 $file
} else {
    docker exec $Container pg_dump -U $User -d $Database --clean --if-exists --no-owner | Out-File -Encoding utf8 $file
}
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $file) -or (Get-Item $file).Length -eq 0) {
    Remove-Item $file -ErrorAction SilentlyContinue
    throw "pg_dump failed or produced an empty file"
}
Write-Host ("Backup of the {0} written to {1} ({2} bytes)" -f $target, $file, (Get-Item $file).Length) -ForegroundColor Green

# Keep only the newest $Keep backups
Get-ChildItem $backupDir -Filter "youpace-*.sql" | Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep | Remove-Item
