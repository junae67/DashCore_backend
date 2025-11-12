# Script para aumentar memoria de Docker Desktop modificando configuracion directa

Write-Host "=== Aumentando Memoria de Docker Desktop ===" -ForegroundColor Green
Write-Host ""

# Detener Docker Desktop
Write-Host "1. Deteniendo Docker Desktop..." -ForegroundColor Yellow
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.backend" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.proxy" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# Ubicacion del archivo de configuracion de Docker Desktop
$dockerConfigPath = "$env:APPDATA\Docker\settings.json"

Write-Host "2. Modificando configuracion en: $dockerConfigPath" -ForegroundColor Yellow

if (Test-Path $dockerConfigPath) {
    # Leer configuracion actual
    $config = Get-Content $dockerConfigPath -Raw | ConvertFrom-Json

    # Aumentar memoria a 6GB (6442450944 bytes)
    $config | Add-Member -MemberType NoteProperty -Name "memoryMiB" -Value 6144 -Force
    $config | Add-Member -MemberType NoteProperty -Name "cpus" -Value 4 -Force

    # Guardar configuracion
    $config | ConvertTo-Json -Depth 10 | Set-Content $dockerConfigPath

    Write-Host "OK - Configuracion actualizada:" -ForegroundColor Green
    Write-Host "   Memoria: 6 GB (6144 MB)" -ForegroundColor White
    Write-Host "   CPUs: 4 cores" -ForegroundColor White
} else {
    Write-Host "ERROR - No se encontro el archivo de configuracion" -ForegroundColor Red
    Write-Host "Ubicacion esperada: $dockerConfigPath" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "3. Reiniciando Docker Desktop..." -ForegroundColor Yellow
Start-Process -FilePath "C:\Program Files\Docker\Docker\Docker Desktop.exe"

Write-Host ""
Write-Host "OK - Docker Desktop esta reiniciando" -ForegroundColor Green
Write-Host ""
Write-Host "Espera 30-60 segundos a que Docker inicie completamente" -ForegroundColor Cyan
Write-Host "(El icono de Docker en la bandeja debe estar verde)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Luego ejecuta:" -ForegroundColor Yellow
Write-Host "  .\start-all.ps1" -ForegroundColor White
