[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$backupFile = Join-Path $PSScriptRoot "docs/CONTEXT_BACKUP.md"
$archiveFile = Join-Path $PSScriptRoot "docs/CONTEXT_BACKUP_ARCHIVE.md"
$maxBlocks = 5 # Сколько последних блоков ## Update оставлять для агента

if (Test-Path $backupFile) {
    # Читаем файл в UTF-8
    $content = [System.IO.File]::ReadAllText($backupFile, [System.Text.Encoding]::UTF8)
    
    # Разделяем файл по блокам обновлений
    $blocks = [System.Text.RegularExpressions.Regex]::Split($content, "(?m)(?=^## Update)")
    
    # Если блоков больше, чем максимум (плюс блок с шапкой файла)
    if ($blocks.Count -gt ($maxBlocks + 1)) {
        # Забираем старые блоки для архива (начиная со второго, заканчивая до $maxBlocks)
        $oldBlocks = $blocks[1..($blocks.Count - $maxBlocks - 1)] -join ""
        
        # Оставляем заголовок файла ($blocks[0]) и последние $maxBlocks блоков
        $newBlocks = $blocks[0] + ($blocks[($blocks.Count - $maxBlocks)..($blocks.Count - 1)] -join "")
        
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        if (!(Test-Path $archiveFile)) {
            [System.IO.File]::WriteAllText($archiveFile, "# Archived Updates (CONTEXT_BACKUP_ARCHIVE)`r`n`r`n", $utf8NoBom)
        }
        [System.IO.File]::AppendAllText($archiveFile, $oldBlocks, $utf8NoBom)
        [System.IO.File]::WriteAllText($backupFile, $newBlocks, $utf8NoBom)
        
        Write-Host "Ротация успешна. Оставлено $maxBlocks последних блоков. Старые ушли в архив." -ForegroundColor Green
    } else {
        Write-Host "Ротация не требуется. Количество блоков не превышает $maxBlocks." -ForegroundColor Yellow
    }
} else {
    Write-Host "Файл бэкапа не найден по пути: $backupFile" -ForegroundColor Red
}
