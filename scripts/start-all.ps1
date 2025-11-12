# Script para iniciar Business Central + ngrok automaticamente

Write-Host "=== Iniciando Business Central + ngrok ===" -ForegroundColor Green
Write-Host ""

# 1. Verificar Docker
Write-Host "[1/5] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "OK - Docker esta instalado" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Docker no esta instalado o no esta corriendo" -ForegroundColor Red
    Write-Host "Abre Docker Desktop y espera a que inicie" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Iniciar Business Central si no esta corriendo
Write-Host "[2/5] Iniciando Business Central..." -ForegroundColor Yellow
$bcStatus = docker ps --filter "name=bc" --format "{{.Status}}"

if ($bcStatus -like "*Up*") {
    Write-Host "Business Central ya esta corriendo" -ForegroundColor Green
} else {
    Write-Host "Iniciando contenedor..." -ForegroundColor Cyan
    docker start bc
    if ($?) {
        Write-Host "OK - Business Central iniciado" -ForegroundColor Green
        Write-Host "Esperando a que inicie completamente (esto toma 5-10 minutos)..." -ForegroundColor Yellow
    } else {
        Write-Host "ERROR - No se pudo iniciar Business Central" -ForegroundColor Red
        Write-Host "Es posible que el contenedor no exista" -ForegroundColor Yellow
        Write-Host "Ejecuta: .\start-bc-with-ports.ps1" -ForegroundColor Cyan
        exit 1
    }
}

Write-Host ""

# 3. Esperar a que BC API responda (max 2 minutos)
Write-Host "[3/5] Esperando a que BC API este lista..." -ForegroundColor Yellow
$maxAttempts = 24  # 24 intentos x 5 segundos = 2 minutos
$attempt = 0
$apiReady = $false

while ($attempt -lt $maxAttempts -and -not $apiReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:7048/BC/api/v2.0/companies" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $apiReady = $true
            Write-Host "OK - BC API esta respondiendo" -ForegroundColor Green
        }
    } catch {
        $attempt++
        Write-Host "Intento $attempt/$maxAttempts - Esperando..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

if (-not $apiReady) {
    Write-Host "ADVERTENCIA - BC API aun no responde" -ForegroundColor Yellow
    Write-Host "Puede que necesite mas tiempo para iniciar" -ForegroundColor Yellow
    Write-Host "Puedes continuar y esperar, o cancelar (Ctrl+C)" -ForegroundColor Cyan
    Write-Host ""
}

# 4. Detener ngrok previo si existe
Write-Host "[4/5] Preparando ngrok..." -ForegroundColor Yellow
$ngrokProcess = Get-Process ngrok -ErrorAction SilentlyContinue
if ($ngrokProcess) {
    Write-Host "Deteniendo ngrok previo..." -ForegroundColor Cyan
    Stop-Process -Name ngrok -Force
    Start-Sleep -Seconds 2
}

# 5. Iniciar ngrok
Write-Host "[5/5] Iniciando ngrok..." -ForegroundColor Yellow
if (Test-Path "C:\ngrok\ngrok.exe") {
    Start-Process -FilePath "C:\ngrok\ngrok.exe" -ArgumentList "http","7048" -WindowStyle Normal
    Start-Sleep -Seconds 3

    # Obtener URL publica
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        $publicUrl = $ngrokApi.tunnels[0].public_url
        Write-Host "OK - ngrok esta corriendo" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "URL PUBLICA DE NGROK:" -ForegroundColor Green
        Write-Host "$publicUrl" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "IMPORTANTE:" -ForegroundColor Yellow
        Write-Host "1. Copia esta URL: $publicUrl/BC/api/v2.0" -ForegroundColor White
        Write-Host "2. Ve a Railway: https://railway.app" -ForegroundColor White
        Write-Host "3. Actualiza la variable BC_API_URL con esa URL" -ForegroundColor White
        Write-Host ""
        Write-Host "Dashboard de ngrok: http://localhost:4040" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "NO CIERRES LA VENTANA DE NGROK" -ForegroundColor Red
    } catch {
        Write-Host "ADVERTENCIA - No se pudo obtener URL de ngrok" -ForegroundColor Yellow
        Write-Host "Ve a http://localhost:4040 para verla" -ForegroundColor Cyan
    }
} else {
    Write-Host "ERROR - ngrok no esta instalado en C:\ngrok\ngrok.exe" -ForegroundColor Red
    Write-Host "Ejecuta: .\setup-ngrok.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== TODO LISTO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "1. Actualiza BC_API_URL en Railway con la URL de ngrok" -ForegroundColor White
Write-Host "2. Espera el deploy automatico (~2 minutos)" -ForegroundColor White
Write-Host "3. Prueba en https://www.dashcore.app" -ForegroundColor White
Write-Host ""
