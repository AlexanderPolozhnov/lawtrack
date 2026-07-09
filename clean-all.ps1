# clean-all.ps1
# Скрипт очистки проекта перед архивацией (удаляет временные папки сборки и зависимости)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = Get-Location
Write-Host "=== ОЧИСТКА ПРОЕКТА LAWTRACK CRM ===" -ForegroundColor Cyan

# 1. Удаление target в backend
$backendTarget = "$ProjectRoot/backend/target"
if (Test-Path $backendTarget) {
    Write-Host "Удаление $backendTarget..." -ForegroundColor Gray
    Remove-Item -Path $backendTarget -Recurse -Force
    Write-Host "✅ Папка backend/target удалена" -ForegroundColor Green
}

# 2. Удаление .next во frontend
$frontendNext = "$ProjectRoot/frontend/.next"
if (Test-Path $frontendNext) {
    Write-Host "Удаление $frontendNext..." -ForegroundColor Gray
    Remove-Item -Path $frontendNext -Recurse -Force
    Write-Host "✅ Папка frontend/.next удалена" -ForegroundColor Green
}

# 3. Удаление node_modules во frontend
$frontendModules = "$ProjectRoot/frontend/node_modules"
if (Test-Path $frontendModules) {
    Write-Host "Удаление $frontendModules (может занять время)..." -ForegroundColor Gray
    Remove-Item -Path $frontendModules -Recurse -Force
    Write-Host "✅ Папка frontend/node_modules удалена" -ForegroundColor Green
}

# 4. Удаление кэша TS
$tsCache = "$ProjectRoot/frontend/tsconfig.tsbuildinfo"
if (Test-Path $tsCache) {
    Remove-Item -Path $tsCache -Force
    Write-Host "✅ Файл tsconfig.tsbuildinfo удален" -ForegroundColor Green
}

# 5. Удаление кэша сборки Next.js (если есть)
$nextCache = "$ProjectRoot/frontend/.turbo"
if (Test-Path $nextCache) {
    Remove-Item -Path $nextCache -Recurse -Force
    Write-Host "✅ Папка frontend/.turbo удалена" -ForegroundColor Green
}

Write-Host "`n🎉 Проект успешно очищен!" -ForegroundColor Cyan
