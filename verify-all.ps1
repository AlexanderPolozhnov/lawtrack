$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$Failed = $false
$ProjectRoot = Get-Location
$LogDir = "$ProjectRoot/docs/logs/validation"

if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$BackendLog = "$LogDir/backend_last_run.log"
$FrontendLog = "$LogDir/frontend_last_run.log"
$SummaryLog = "$LogDir/validation_summary.txt"

function Log-Summary($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
    $Text | Add-Content -Path $SummaryLog
}

# Очистка и старт лога
"=== ВАЛИДАЦИЯ LAWTRACK CRM: $(Get-Date) ===" | Set-Content -Path $SummaryLog -Encoding utf8

# --- 1. БЭКЕНД ---
Log-Summary "`n[1/2] === БЭКЕНД (Java 21 / Spring Boot 4) ===" "Cyan"
if (Test-Path backend) {
    Set-Location backend
    Write-Host "Запуск компиляции и тестов Maven..." -ForegroundColor Gray
    $output = ./mvnw.cmd clean test "-Dsurefire.failIfNoSpecifiedTests=false" --no-transfer-progress -q 2>&1
    $output | ForEach-Object { $_.ToString() } | Set-Content -Path $BackendLog -Encoding utf8

    if ($LASTEXITCODE -ne 0) {
        Log-Summary "Тесты бэкенда ЗАВЕРШИЛИСЬ С ОШИБКОЙ. Проверьте лог: $BackendLog" "Red"
        Get-Content $BackendLog -Tail 20 | Write-Host -ForegroundColor Yellow
        $Failed = $true
    } else {
        Log-Summary "Бэкенд: УСПЕШНО" "Green"
    }
    Set-Location $ProjectRoot
} else {
    Log-Summary "Бэкенд: папка backend/ отсутствует (пропускается)" "Yellow"
}

# --- 2. ФРОНТЕНД ---
Log-Summary "`n[2/2] === ФРОНТЕНД (Next.js 16 / TypeScript) ===" "Cyan"
if (Test-Path frontend) {
    Set-Location frontend
    $env:FORCE_COLOR = "0"

    try {
        Write-Host "Установка зависимостей..." -ForegroundColor Gray
        pnpm install --frozen-lockfile --ignore-scripts --silent 2>&1 | Out-Null

        Write-Host "Запуск production-сборки Next.js..." -ForegroundColor Gray
        $fOutput = cmd /c "pnpm run build" 2>&1
        $fOutput | ForEach-Object { $_.ToString() } | Set-Content -Path $FrontendLog -Encoding utf8

        if ($LASTEXITCODE -ne 0) {
            Log-Summary "Сборка фронтенда ЗАВЕРШИЛАСЬ С ОШИБКОЙ. Проверьте лог: $FrontendLog" "Red"
            Get-Content $FrontendLog -Tail 20 | Write-Host -ForegroundColor Yellow
            $Failed = $true
        } else {
            Log-Summary "Фронтенд: УСПЕШНО" "Green"
        }
    } catch {
        Log-Summary "Критическая ошибка фронтенда: $_" "Red"
        $Failed = $true
    } finally {
        $env:FORCE_COLOR = ""
    }
    Set-Location $ProjectRoot
} else {
    Log-Summary "Фронтенд: папка frontend/ отсутствует (пропускается)" "Yellow"
}

# --- ИТОГ ---
Log-Summary "`n========================================" "Cyan"
if ($Failed) {
    Log-Summary "ВАЛИДАЦИЯ ПРОВАЛЕНА." "Red"
    exit 1
} else {
    Log-Summary "ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ. Готово к пушу!" "Green"
    exit 0
}
