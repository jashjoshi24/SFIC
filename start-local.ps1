param([string]$WhisperModel = 'small')
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$logRoot = Join-Path $projectRoot '.local-logs'
New-Item -ItemType Directory -Force $logRoot | Out-Null
$nodePath = (Get-Command node).Source
$pythonPath = Join-Path $projectRoot 'whisper-service\.venv\Scripts\python.exe'
if (!(Test-Path -LiteralPath $pythonPath)) { throw 'Install whisper-service/requirements.txt in whisper-service/.venv first.' }
$env:WHISPER_MODEL = $WhisperModel
if ($WhisperModel -eq 'small') {
    $snapshotRoot = Join-Path $env:USERPROFILE '.cache\huggingface\hub\models--Systran--faster-whisper-small\snapshots'
    if (Test-Path -LiteralPath $snapshotRoot) {
        $snapshot = Get-ChildItem -LiteralPath $snapshotRoot -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'model.bin') } | Select-Object -First 1
        if ($snapshot) { $env:WHISPER_MODEL = $snapshot.FullName }
    }
}
$env:WHISPER_DEVICE = 'cpu'
$env:WHISPER_COMPUTE_TYPE = 'int8'
$env:WHISPER_MODEL_DIR = Join-Path $projectRoot 'whisper-service\model-cache'
$env:PORT = '5000'
$env:FRONTEND_URL = 'http://localhost:5173'
$env:WHISPER_SERVICE_URL = 'http://127.0.0.1:8000'
$processes = @{}
$pidFile = Join-Path $logRoot 'processes.json'
if (Test-Path -LiteralPath $pidFile) {
    $saved = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
    foreach ($entry in $saved.PSObject.Properties) { $processes[$entry.Name] = $entry.Value }
}
$services = @(
    @{ Name='backend'; Port=5000; File=$nodePath; Arguments='server.js'; Directory=(Join-Path $projectRoot 'backend') },
    @{ Name='frontend'; Port=5173; File=$nodePath; Arguments='node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort'; Directory=$projectRoot },
    @{ Name='whisper'; Port=8000; File=$pythonPath; Arguments='-m uvicorn main:app --host 127.0.0.1 --port 8000'; Directory=(Join-Path $projectRoot 'whisper-service') }
)
foreach ($service in $services) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try { $client.Connect('127.0.0.1', $service.Port); $listening = $true } catch { $listening = $false } finally { $client.Dispose() }
    if ($listening) { Write-Host "$($service.Name) already listening on port $($service.Port)."; continue }
    if ($processes.ContainsKey($service.Name)) {
        $existing = Get-Process -Id $processes[$service.Name] -ErrorAction SilentlyContinue
        if ($existing -and $existing.Path -eq $service.File) { Write-Host "$($service.Name) is starting; see .local-logs."; continue }
    }
    $process = Start-Process -FilePath $service.File -ArgumentList $service.Arguments -WorkingDirectory $service.Directory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot "$($service.Name).out.log") -RedirectStandardError (Join-Path $logRoot "$($service.Name).err.log") -PassThru
    $processes[$service.Name] = $process.Id
    $processes | ConvertTo-Json | Set-Content -LiteralPath $pidFile
    Write-Host "Started $($service.Name) (PID $($process.Id))."
}
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'API: http://localhost:5000'
Write-Host 'Speech health: http://localhost:8000/health (first launch downloads the model)'
