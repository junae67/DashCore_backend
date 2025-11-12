# Script para iniciar ngrok y exponer Business Central

Write-Host "=== Iniciando ngrok para Business Central ===" -ForegroundColor Green

# Verificar que Business Central esté corriendo
$bcStatus = docker ps --filter "name=bc" --format "{{.Status}}"
if ($bcStatus -notlike "*Up*") {
    Write-Host "❌ ERROR: Business Central no está corriendo" -ForegroundColor Red
    Write-Host "Ejecuta primero: docker start bc" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Business Central está corriendo" -ForegroundColor Green

# Matar cualquier proceso de ngrok existente
Write-Host "`nDeteniendo procesos de ngrok existentes..." -ForegroundColor Yellow
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

# Esperar un poco
Start-Sleep -Seconds 2

# Iniciar ngrok en segundo plano
Write-Host "`nIniciando ngrok en el puerto 7048..." -ForegroundColor Yellow
Write-Host "Business Central API será accesible públicamente" -ForegroundColor Cyan

# Iniciar ngrok
Start-Process -FilePath "C:\ngrok\ngrok.exe" -ArgumentList "http","7048","--log=stdout" -WindowStyle Normal

Write-Host "`n✅ ngrok iniciado" -ForegroundColor Green
Write-Host "`nAhora:" -ForegroundColor Cyan
Write-Host "1. Ve a http://localhost:4040 para ver la URL pública de ngrok" -ForegroundColor White
Write-Host "2. Copia la URL que se ve así: https://xxxx-xxx-xxx-xxx.ngrok-free.app" -ForegroundColor White
Write-Host "3. Actualiza BC_API_URL en Railway con esa URL + /BC/api/v2.0" -ForegroundColor White
Write-Host "`nEjemplo:" -ForegroundColor Yellow
Write-Host "  BC_API_URL=https://1234-56-78-910.ngrok-free.app/BC/api/v2.0" -ForegroundColor White

Write-Host "`n⚠️  IMPORTANTE: Deja esta ventana de ngrok abierta mientras trabajes" -ForegroundColor Red
