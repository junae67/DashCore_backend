# Script para reiniciar Business Central con puertos expuestos correctamente

Write-Host "=== Configurando Business Central con puertos expuestos ===" -ForegroundColor Green

# Detener y eliminar contenedor existente
Write-Host "`nDeteniendo contenedor actual..." -ForegroundColor Yellow
docker stop bc
docker rm bc

# Crear nuevo contenedor con puertos correctamente mapeados
Write-Host "`nCreando nuevo contenedor con puertos expuestos..." -ForegroundColor Yellow
docker run `
  -e accept_eula=Y `
  -e accept_outdated=Y `
  -e username=admin `
  -e password=P@ssw0rd `
  -e enableApiServices=Y `
  -p 80:80 `
  -p 443:443 `
  -p 7045:7045 `
  -p 7046:7046 `
  -p 7047:7047 `
  -p 7048:7048 `
  -p 7049:7049 `
  -p 8080:8080 `
  --name bc `
  --restart unless-stopped `
  -d `
  mcr.microsoft.com/businesscentral:ltsc2025

Write-Host "`n✅ Business Central reiniciado" -ForegroundColor Green
Write-Host "`nEsperando a que Business Central inicie..." -ForegroundColor Yellow
Write-Host "Esto puede tomar 5-10 minutos. Puedes ver los logs con:" -ForegroundColor Cyan
Write-Host "  docker logs -f bc" -ForegroundColor White

Write-Host "`nPuertos expuestos:" -ForegroundColor Green
Write-Host "  - Puerto 80: Web Client" -ForegroundColor White
Write-Host "  - Puerto 7048: API v2.0 (el que usaremos con ngrok)" -ForegroundColor White
