# Verificacion rapida de Business Central y ngrok

Write-Host "=== Verificacion de Estado ===" -ForegroundColor Cyan
Write-Host ""

# Docker
Write-Host "Docker:" -ForegroundColor Yellow
docker --version
Write-Host ""

# Business Central
Write-Host "Business Central:" -ForegroundColor Yellow
docker ps --filter "name=bc"
Write-Host ""

# Test API
Write-Host "Probando API local..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:7048/BC/api/v2.0/companies" -UseBasicParsing -TimeoutSec 5
    Write-Host "API OK: Status $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "API NO RESPONDE" -ForegroundColor Red
}
Write-Host ""

# ngrok
Write-Host "ngrok:" -ForegroundColor Yellow
$ngrokProcess = Get-Process ngrok -ErrorAction SilentlyContinue
if ($ngrokProcess) {
    Write-Host "ngrok esta corriendo (PID: $($ngrokProcess.Id))" -ForegroundColor Green
    Write-Host "Dashboard: http://localhost:4040" -ForegroundColor Cyan

    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
        $publicUrl = $ngrokApi.tunnels[0].public_url
        Write-Host "URL Publica: $publicUrl" -ForegroundColor Green
        Write-Host "Usar en Railway: $publicUrl/BC/api/v2.0" -ForegroundColor Yellow
    } catch {
        Write-Host "No se pudo obtener URL de ngrok" -ForegroundColor Yellow
    }
} else {
    Write-Host "ngrok NO esta corriendo" -ForegroundColor Red
    Write-Host "Ejecuta: ngrok http 7048" -ForegroundColor Yellow
}
