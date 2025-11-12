# Script para verificar el estado completo de Business Central + ngrok

Write-Host "=== 🔍 Verificación de Estado: Business Central + ngrok ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Docker
Write-Host "1️⃣  Docker Desktop:" -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✅ Docker instalado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker no encontrado o no está corriendo" -ForegroundColor Red
    Write-Host "   👉 Abre Docker Desktop y espera a que inicie" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Verificar contenedor BC
Write-Host "2️⃣  Business Central Container:" -ForegroundColor Yellow
$bcContainer = docker ps --filter "name=bc" --format "{{.Status}}"
if ($bcContainer) {
    if ($bcContainer -like "*Up*") {
        Write-Host "   ✅ Business Central está corriendo: $bcContainer" -ForegroundColor Green

        # Verificar si está healthy
        if ($bcContainer -like "*healthy*") {
            Write-Host "   ✅ Estado: HEALTHY" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Estado: Iniciando (espera 5-10 minutos)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Business Central no está corriendo" -ForegroundColor Red
        Write-Host "   👉 Ejecuta: docker start bc" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Contenedor 'bc' no encontrado" -ForegroundColor Red
    Write-Host "   👉 Ejecuta el script: start-bc-with-ports.ps1" -ForegroundColor Yellow
}

Write-Host ""

# 3. Verificar puerto 7048
Write-Host "3️⃣  API de Business Central (puerto 7048):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:7048/BC/api/v2.0/companies" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API respondiendo correctamente" -ForegroundColor Green
        Write-Host "   📊 Endpoint: http://localhost:7048/BC/api/v2.0/companies" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ API no responde en http://localhost:7048" -ForegroundColor Red
    Write-Host "   👉 Verifica que BC esté completamente iniciado" -ForegroundColor Yellow
    Write-Host "   👉 Ejecuta: docker logs bc | Select-String 'Ready'" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verificar ngrok instalado
Write-Host "4️⃣  ngrok:" -ForegroundColor Yellow
if (Test-Path "C:\ngrok\ngrok.exe") {
    Write-Host "   ✅ ngrok instalado en C:\ngrok\ngrok.exe" -ForegroundColor Green

    # Verificar si ngrok está corriendo
    $ngrokProcess = Get-Process ngrok -ErrorAction SilentlyContinue
    if ($ngrokProcess) {
        Write-Host "   ✅ ngrok está corriendo (PID: $($ngrokProcess.Id))" -ForegroundColor Green
        Write-Host "   📊 Dashboard: http://localhost:4040" -ForegroundColor Cyan

        # Intentar obtener la URL pública
        try {
            $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get
            $publicUrl = $ngrokApi.tunnels[0].public_url
            Write-Host "   🌐 URL Pública: $publicUrl" -ForegroundColor Green
            Write-Host "   👉 Usa esta URL en Railway: $publicUrl/BC/api/v2.0" -ForegroundColor Yellow
        } catch {
            Write-Host "   ⚠️  No se pudo obtener la URL pública (ngrok puede estar iniciando)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ ngrok no está corriendo" -ForegroundColor Red
        Write-Host "   👉 Ejecuta en otra ventana: ngrok http 7048" -ForegroundColor Yellow
        Write-Host "   O ejecuta: C:\ngrok\ngrok.exe http 7048" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ❌ ngrok no está instalado" -ForegroundColor Red
    Write-Host "   👉 Ejecuta: scripts\setup-ngrok.ps1" -ForegroundColor Yellow
}

Write-Host ""

# 5. Resumen de configuración
Write-Host "5️⃣  Variables de Entorno (.env):" -ForegroundColor Yellow
$envFile = "C:\Users\User\Desktop\DashCore\DashCore_backend\.env"
if (Test-Path $envFile) {
    $bcAuthType = Select-String -Path $envFile -Pattern "^BC_AUTH_TYPE=" | ForEach-Object { $_.Line }
    $bcApiUrl = Select-String -Path $envFile -Pattern "^BC_API_URL=" | ForEach-Object { $_.Line }
    $bcCompany = Select-String -Path $envFile -Pattern "^BC_COMPANY_ID=" | ForEach-Object { $_.Line }

    if ($bcAuthType) { Write-Host "   ✅ $bcAuthType" -ForegroundColor Green } else { Write-Host "   ⚠️  BC_AUTH_TYPE no configurado" -ForegroundColor Yellow }
    if ($bcApiUrl) { Write-Host "   ✅ $bcApiUrl" -ForegroundColor Green } else { Write-Host "   ⚠️  BC_API_URL no configurado" -ForegroundColor Yellow }
    if ($bcCompany) { Write-Host "   ✅ $bcCompany" -ForegroundColor Green } else { Write-Host "   ⚠️  BC_COMPANY_ID no configurado" -ForegroundColor Yellow }
} else {
    Write-Host "   ❌ Archivo .env no encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 📋 Resumen ===" -ForegroundColor Cyan
Write-Host ""

# Verificar estado general
$dockerOk = (docker --version) -ne $null
$bcOk = $bcContainer -like "*Up*"
$apiOk = $false
try {
    $apiTest = Invoke-WebRequest -Uri "http://localhost:7048/BC/api/v2.0/companies" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $apiOk = $true
} catch {}
$ngrokInstalled = Test-Path "C:\ngrok\ngrok.exe"
$ngrokRunning = (Get-Process ngrok -ErrorAction SilentlyContinue) -ne $null

if ($dockerOk -and $bcOk -and $apiOk -and $ngrokInstalled -and $ngrokRunning) {
    Write-Host "✅ TODO FUNCIONANDO CORRECTAMENTE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Ve a http://localhost:4040 y copia la URL de ngrok" -ForegroundColor White
    Write-Host "2. Actualiza BC_API_URL en Railway con esa URL + /BC/api/v2.0" -ForegroundColor White
    Write-Host "3. Prueba en https://www.dashcore.app" -ForegroundColor White
} else {
    Write-Host "⚠️  CONFIGURACIÓN INCOMPLETA" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Revisa los mensajes arriba para ver qué falta." -ForegroundColor White
    Write-Host "Consulta: GUIA_BUSINESS_CENTRAL_NGROK.md para mas detalles" -ForegroundColor Cyan
}

Write-Host ""
