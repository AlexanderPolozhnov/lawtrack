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

# Clear and start log
"=== LAWTRACK CRM VALIDATION: $(Get-Date) ===" | Set-Content -Path $SummaryLog -Encoding utf8

# --- 1. BACKEND ---
Log-Summary "`n[1/2] === BACKEND (Java 21 / Spring Boot) ===" "Cyan"
if (Test-Path backend) {
    Set-Location backend
    Write-Host "Running Maven compilation and tests..." -ForegroundColor Gray
    $output = ./mvnw.cmd clean test "-Dsurefire.failIfNoSpecifiedTests=false" --no-transfer-progress -q 2>&1
    $output | ForEach-Object { $_.ToString() } | Set-Content -Path $BackendLog -Encoding utf8

    if ($LASTEXITCODE -ne 0) {
        Log-Summary "Backend tests FAILED. Check log: $BackendLog" "Red"
        Get-Content $BackendLog -Tail 20 | Write-Host -ForegroundColor Yellow
        $Failed = $true
    } else {
        Log-Summary "Backend: SUCCESS" "Green"
    }
    Set-Location $ProjectRoot
} else {
    Log-Summary "Backend: backend/ directory is missing (skipped)" "Yellow"
}

# --- 2. FRONTEND ---
Log-Summary "`n[2/2] === FRONTEND (Next.js 16 / TypeScript) ===" "Cyan"
if (Test-Path frontend) {
    Set-Location frontend
    $env:FORCE_COLOR = "0"

    try {
        Write-Host "Installing dependencies..." -ForegroundColor Gray
        pnpm install --frozen-lockfile --ignore-scripts --silent 2>&1 | Out-Null

        Write-Host "Running Next.js production build..." -ForegroundColor Gray
        $fOutput = cmd /c "pnpm run build" 2>&1
        $fOutput | ForEach-Object { $_.ToString() } | Set-Content -Path $FrontendLog -Encoding utf8

        if ($LASTEXITCODE -ne 0) {
            Log-Summary "Frontend build FAILED. Check log: $FrontendLog" "Red"
            Get-Content $FrontendLog -Tail 20 | Write-Host -ForegroundColor Yellow
            $Failed = $true
        } else {
            Log-Summary "Frontend: SUCCESS" "Green"
        }
    } catch {
        Log-Summary "Critical frontend error: $_" "Red"
        $Failed = $true
    } finally {
        $env:FORCE_COLOR = ""
    }
    Set-Location $ProjectRoot
} else {
    Log-Summary "Frontend: frontend/ directory is missing (skipped)" "Yellow"
}

# --- SUMMARY ---
Log-Summary "`n========================================" "Cyan"
if ($Failed) {
    Log-Summary "VALIDATION FAILED." "Red"
    exit 1
} else {
    Log-Summary "ALL CHECKS PASSED. Ready to push!" "Green"
    exit 0
}
