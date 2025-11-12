# Script para instalar y configurar ngrok en Windows
# Ejecutar como Administrador

Write-Host "=== Instalando ngrok ===" -ForegroundColor Green

# Crear carpeta temporal
$tempDir = "$env:TEMP\ngrok_setup"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Descargar ngrok
Write-Host "Descargando ngrok..." -ForegroundColor Yellow
$ngrokUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
$zipFile = "$tempDir\ngrok.zip"
Invoke-WebRequest -Uri $ngrokUrl -OutFile $zipFile

# Extraer
Write-Host "Extrayendo ngrok..." -ForegroundColor Yellow
Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force

# Mover a C:\ngrok
$ngrokDir = "C:\ngrok"
New-Item -ItemType Directory -Force -Path $ngrokDir | Out-Null
Move-Item -Path "$tempDir\ngrok.exe" -Destination "$ngrokDir\ngrok.exe" -Force

# Agregar al PATH si no está
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$ngrokDir*") {
    Write-Host "Agregando ngrok al PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable(
        "Path",
        "$currentPath;$ngrokDir",
        "Machine"
    )
}

Write-Host "✅ ngrok instalado en C:\ngrok\ngrok.exe" -ForegroundColor Green

# Configurar authtoken
Write-Host "`nConfigurando authtoken..." -ForegroundColor Yellow
$authtoken = "356wzydeAvrtAbJGsYhMJzLWM4s_6xfrsVEENBguirxxFSFQ5"
& "C:\ngrok\ngrok.exe" config add-authtoken $authtoken

Write-Host "✅ Authtoken configurado" -ForegroundColor Green

# Limpiar archivos temporales
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "`n=== Instalación completada ===" -ForegroundColor Green
Write-Host "Para usar ngrok, ejecuta:" -ForegroundColor Cyan
Write-Host "  C:\ngrok\ngrok.exe http 7048" -ForegroundColor White
Write-Host "`nO reinicia PowerShell y ejecuta:" -ForegroundColor Cyan
Write-Host "  ngrok http 7048" -ForegroundColor White
