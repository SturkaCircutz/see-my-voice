param(
  [int]$Port = 4173,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
$server = Join-Path $ProjectRoot "web\server.py"

if (-not (Test-Path $python)) {
  throw "Python virtualenv not found: $python"
}

if (-not (Test-Path $server)) {
  throw "Web server not found: $server"
}

$healthUrl = "http://127.0.0.1:$Port/api/health"
$appUrl = "http://127.0.0.1:$Port/"
$demoUrl = "http://127.0.0.1:$Port/?demoClip=1"

try {
  $health = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
  if ($health.StatusCode -eq 200) {
    Write-Host "Server already running: $appUrl"
    Write-Host "Demo URL: $demoUrl"
    exit 0
  }
} catch {
  # No running service on the requested port; start one below.
}

$env:PORT = [string]$Port
$env:SEE_MY_VOICE_DIR = $ProjectRoot

Start-Process `
  -WindowStyle Hidden `
  -FilePath $python `
  -ArgumentList "web\server.py" `
  -WorkingDirectory $ProjectRoot

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $health = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
    if ($health.StatusCode -eq 200) {
      Write-Host "Server started: $appUrl"
      Write-Host "Demo URL: $demoUrl"
      exit 0
    }
  } catch {
    # Keep waiting.
  }
}

throw "Server did not become ready on $healthUrl"
